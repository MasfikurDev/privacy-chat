import { idFromPub, sign, verify, type Identity } from './identity';
import { createSecret } from './room';
import { joinMesh, randomChallenge, type Mesh } from './signaling';
import { cleanName, getName } from './store';

export interface Peer {
  id: string;
  name: string;
  pub: JsonWebKey;
}

export interface IncomingRequest {
  peer: Peer;
  /** Returns the private-room secret to join, or null if the request already expired. */
  accept: () => string | null;
  decline: () => void;
}

export interface DialResult {
  secret: string;
  peer: Peer;
}

type Raw = Record<string, unknown>;
const isStr = (v: unknown): v is string => typeof v === 'string';
const isKey = (v: unknown): v is JsonWebKey => !!v && typeof v === 'object';

function parse(text: string): Raw | null {
  try {
    const v: unknown = JSON.parse(text);
    return v && typeof v === 'object' && !Array.isArray(v) && isStr((v as Raw).t) ? (v as Raw) : null;
  } catch {
    return null;
  }
}

/**
 * Listens on this device's inbox room. A caller must prove it holds the key
 * behind its ID (challenge-response) before the request is shown. On accept,
 * a fresh private-room secret is sent back over the connection.
 */
export async function listenInbox(
  me: Identity,
  relayOnly: boolean,
  onRequest: (r: IncomingRequest) => void
): Promise<() => void> {
  const sessions = new Map<string, { peer: Peer; chL: string; done: boolean }>();
  let mesh: Mesh | null = null;
  mesh = await joinMesh(`inbox:${me.id}`, relayOnly, {
    onPeer: () => undefined,
    onGone: (p) => void sessions.delete(p),
    onText: async (text, from) => {
      try {
        const m = parse(text);
        if (!m) return;
        if (m.t === 'hello') {
          const { id, ch, name, pub } = m;
          if (!isStr(id) || !isStr(ch) || !isStr(name) || !isKey(pub)) return;
          if (ch.length > 64 || id === me.id) return;
          if (sessions.size >= 8 && !sessions.has(from)) return;
          if ((await idFromPub(pub)) !== id) return;
          const chL = randomChallenge();
          sessions.set(from, { peer: { id, name: cleanName(name), pub }, chL, done: false });
          const sig = await sign(me, `pc-auth|reply|${ch}|${id}|${me.id}`);
          mesh?.send(from, JSON.stringify({ t: 'reply', id: me.id, name: getName(), pub: me.pub, ch: chL, sig }));
        } else if (m.t === 'auth') {
          const s = sessions.get(from);
          if (!s || s.done || !isStr(m.sig)) return;
          if (!(await verify(s.peer.pub, `pc-auth|auth|${s.chL}|${me.id}|${s.peer.id}`, m.sig))) return;
          s.done = true;
          let answered = false;
          const answer = (msg: object): boolean => {
            if (answered) return false;
            answered = true;
            mesh?.send(from, JSON.stringify(msg));
            return true;
          };
          const timer = setTimeout(() => answer({ t: 'decline' }), 120000);
          onRequest({
            peer: s.peer,
            accept: () => {
              const secret = createSecret();
              if (!answer({ t: 'accept', secret })) return null;
              clearTimeout(timer);
              return secret;
            },
            decline: () => {
              clearTimeout(timer);
              answer({ t: 'decline' });
            }
          });
        }
      } catch {
        /* ignore malformed or hostile messages */
      }
    }
  });
  return () => {
    mesh?.leave();
  };
}

/** Dials an ID: finds its inbox, mutually proves identities, waits for accept. */
export function dial(
  me: Identity,
  targetId: string,
  relayOnly: boolean,
  onStatus: (status: string) => void
): { promise: Promise<DialResult>; cancel: () => void } {
  let finish: (err?: Error, result?: DialResult) => void = () => undefined;

  const promise = new Promise<DialResult>((resolve, reject) => {
    let mesh: Mesh | null = null;
    let done = false;
    let verifiedFrom: string | null = null;
    let found: Peer | null = null;
    const timers: number[] = [];
    const clearTimers = () => {
      timers.forEach((t) => clearTimeout(t));
      timers.length = 0;
    };
    finish = (err, result) => {
      if (done) return;
      done = true;
      clearTimers();
      mesh?.leave();
      if (result) resolve(result);
      else reject(err ?? new Error('Cancelled'));
    };

    const chD = randomChallenge();
    onStatus('Looking for them…');
    timers.push(window.setTimeout(() => finish(new Error('They do not seem to be online right now.')), 45000));

    joinMesh(`inbox:${targetId}`, relayOnly, {
      onPeer: (p) => mesh?.send(p, JSON.stringify({ t: 'hello', id: me.id, name: getName(), pub: me.pub, ch: chD })),
      onGone: () => undefined,
      onText: async (text, from) => {
        try {
          const m = parse(text);
          if (!m) return;
          if (m.t === 'reply') {
            const { id, ch, name, pub, sig } = m;
            if (!isStr(id) || id !== targetId || !isStr(ch) || !isStr(name) || !isKey(pub) || !isStr(sig)) return;
            if (ch.length > 64) return;
            if ((await idFromPub(pub)) !== targetId) return;
            if (!(await verify(pub, `pc-auth|reply|${chD}|${me.id}|${targetId}`, sig))) return;
            if (verifiedFrom) return;
            verifiedFrom = from;
            found = { id: targetId, name: cleanName(name), pub };
            clearTimers();
            onStatus('Waiting for them to accept…');
            timers.push(window.setTimeout(() => finish(new Error('They did not respond.')), 90000));
            const authSig = await sign(me, `pc-auth|auth|${ch}|${targetId}|${me.id}`);
            mesh?.send(from, JSON.stringify({ t: 'auth', sig: authSig }));
          } else if (from === verifiedFrom && m.t === 'accept') {
            const secret = m.secret;
            if (isStr(secret) && secret.length >= 16 && secret.length <= 64 && found) {
              finish(undefined, { secret, peer: found });
            }
          } else if (from === verifiedFrom && m.t === 'decline') {
            finish(new Error('They declined.'));
          }
        } catch {
          /* ignore malformed messages */
        }
      }
    }).then(
      (joined) => {
        if (done) joined.leave();
        else mesh = joined;
      },
      (e) => finish(e instanceof Error ? e : new Error(String(e)))
    );
  });

  return { promise, cancel: () => finish(new Error('Cancelled')) };
}
