import * as nostr from 'trystero/nostr';
import { APP_ID, buildRtcConfig, SIGNALING_STRATEGIES } from './config';

type Join = typeof nostr.joinRoom;

const enc = new TextEncoder();

export function b64url(bytes: Uint8Array): string {
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).split('+').join('-').split('/').join('_').split('=').join('');
}

export function fromB64url(text: string): Uint8Array {
  const std = text.split('-').join('+').split('_').join('/');
  return Uint8Array.from(atob(std + '='.repeat((4 - (std.length % 4)) % 4)), (c) => c.charCodeAt(0));
}

export async function sha256(text: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(text)));
}

export function randomChallenge(): string {
  return b64url(crypto.getRandomValues(new Uint8Array(16)));
}

export interface Mesh {
  send: (peer: string, text: string) => void;
  leave: () => void;
}

export interface MeshHandlers {
  onPeer: (peer: string) => void;
  onGone: (peer: string) => void;
  onText: (text: string, peer: string) => void;
}

/**
 * Joins one rendezvous room on every signaling network at once and exposes a
 * single text channel. Used for the per-ID inbox rooms.
 */
export async function joinMesh(seed: string, relayOnly: boolean, h: MeshHandlers): Promise<Mesh> {
  const [roomId, password] = await Promise.all([
    sha256(`room:${seed}`).then(b64url),
    sha256(`password:${seed}`).then(b64url)
  ]);
  const senders = new Map<string, Map<string, (t: string) => void>>();

  const rooms = SIGNALING_STRATEGIES.map((s) => {
    const config = { appId: APP_ID, password, rtcConfig: buildRtcConfig(relayOnly), ...s.extra };
    const room = s.join(config as Parameters<Join>[0], roomId);
    const [sendMsg, onMsg] = room.makeAction<string>('inbox');
    room.onPeerJoin((id) => {
      const m = senders.get(id) ?? new Map<string, (t: string) => void>();
      m.set(s.name, (t: string) => void sendMsg(t, id));
      senders.set(id, m);
      if (m.size === 1) h.onPeer(id);
    });
    room.onPeerLeave((id) => {
      const m = senders.get(id);
      m?.delete(s.name);
      if (m && m.size === 0) {
        senders.delete(id);
        h.onGone(id);
      }
    });
    onMsg((data, id) => {
      if (typeof data === 'string' && data.length < 8192) h.onText(data, id);
    });
    return room;
  });

  return {
    send: (peer, text) => senders.get(peer)?.values().next().value?.(text),
    leave: () => rooms.forEach((r) => void r.leave())
  };
}
