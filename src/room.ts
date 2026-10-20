import * as nostr from 'trystero/nostr';
import * as torrent from 'trystero/torrent';
import { joinRoom as joinMqtt } from 'trystero/mqtt';
import { instrumentRtc, rtcSummary } from './rtcdebug';
import { APP_ID, MAX_FILE_BYTES, MAX_MESSAGE_LENGTH, NOSTR_RELAYS, buildRtcConfig } from './config';

type Join = typeof nostr.joinRoom;
type Room = ReturnType<Join>;
type FileMeta = { name: string; size: number; hash: string };

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** 128-bit random secret. Lives only in the URL fragment, never sent to a server. */
export function createSecret(): string {
  return b64url(crypto.getRandomValues(new Uint8Array(16)));
}

async function derive(secret: string, label: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(`${label}:${secret}`));
  return b64url(new Uint8Array(hash));
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// Characters that are unsafe in file names: / \ : * ? " < > | and control characters.
const BAD_NAME_CHARS = new Set([47, 92, 58, 42, 63, 34, 60, 62, 124]);
function safeName(name: string): string {
  const cleaned = Array.from(name, (c) => {
    const code = c.charCodeAt(0);
    return code < 32 || BAD_NAME_CHARS.has(code) ? '_' : c;
  })
    .join('')
    .replace(/^[.]+/, '')
    .slice(0, 100);
  return cleaned || 'file';
}

export interface ReceivedFile {
  name: string;
  size: number;
  url: string;
  verified: boolean;
}

export interface Handlers {
  onPeerCount: (count: number) => void;
  onMessage: (text: string) => void;
  onDebug: (line: string) => void;
  onRemoteStream: (stream: MediaStream | null) => void;
  onFile: (file: ReceivedFile) => void;
}

export interface Session {
  send: (text: string) => void;
  startCall: (video: boolean) => Promise<MediaStream>;
  endCall: () => void;
  sendFile: (file: File, onProgress: (fraction: number) => void) => Promise<void>;
  leave: () => void;
}

interface Route {
  room: Room;
  chat: (t: string) => void;
  ctl: (t: string) => void;
  file: (data: ArrayBuffer, meta: FileMeta, onProgress: (fraction: number) => void) => Promise<unknown>;
}

const strategies: { name: string; join: Join; extra: object }[] = [
  { name: 'nostr', join: nostr.joinRoom, extra: { relayUrls: NOSTR_RELAYS, relayRedundancy: 5 } },
  { name: 'torrent', join: torrent.joinRoom as unknown as Join, extra: {} },
  { name: 'mqtt', join: joinMqtt as unknown as Join, extra: {} }
];

function openCount(name: string, fn: () => unknown): string {
  try {
    const sockets = Object.values(fn() as Record<string, WebSocket>);
    return `${name} ${sockets.filter((w) => w.readyState === 1).length}/${sockets.length}`;
  } catch {
    return `${name} ?`;
  }
}

/**
 * Joins a private 1-to-1 room over three independent signaling networks at
 * once (Nostr, BitTorrent trackers, MQTT), so one dead network can't block
 * connecting. The room id and signaling password derive from the secret.
 */
export async function openSession(
  secret: string,
  relayOnly: boolean,
  handlers: Handlers
): Promise<Session> {
  const [roomId, password] = await Promise.all([
    derive(secret, 'room'),
    derive(secret, 'password')
  ]);

  const log = handlers.onDebug;
  log('build phase3-1');
  log(`join room ${roomId.slice(0, 8)}, relayOnly=${relayOnly}, me=${nostr.selfId.slice(0, 8)}`);
  log(`RTCPeerConnection: ${typeof RTCPeerConnection}`);
  instrumentRtc(log);

  // peer id -> (strategy name -> route). One remote peer can arrive via several networks.
  const routes = new Map<string, Map<string, Route>>();
  let activePeer: string | null = null;
  let localStream: MediaStream | null = null;
  let callRoute: Route | null = null;
  const report = () => handlers.onPeerCount(routes.size);
  const activeRoute = (): Route | undefined =>
    activePeer ? routes.get(activePeer)?.values().next().value : undefined;

  async function receiveFile(data: ArrayBuffer, meta: unknown): Promise<void> {
    const m = meta as Partial<FileMeta> | null | undefined;
    if (!m || typeof m.name !== 'string' || typeof m.hash !== 'string') return;
    const bytes = new Uint8Array(data as ArrayBufferLike);
    if (bytes.byteLength > MAX_FILE_BYTES) {
      log('rejected an oversized file');
      return;
    }
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
    const verified = toHex(digest) === m.hash;
    const name = safeName(m.name);
    if (!verified) {
      handlers.onFile({ name, size: bytes.byteLength, url: '', verified: false });
      return;
    }
    // Always treated as opaque bytes: never rendered or opened, only offered for download.
    const blob = new Blob([bytes], { type: 'application/octet-stream' });
    handlers.onFile({ name, size: bytes.byteLength, url: URL.createObjectURL(blob), verified: true });
  }

  const rooms = strategies.map((s) => {
    const config = { appId: APP_ID, password, rtcConfig: buildRtcConfig(relayOnly), ...s.extra };
    const room = s.join(config as Parameters<Join>[0], roomId);
    const [sendChat, onChat] = room.makeAction<string>('chat');
    const [sendCtl, onCtl] = room.makeAction<string>('ctl');
    const [sendFile, onFile] = room.makeAction<ArrayBuffer>('file');

    room.onPeerJoin((id) => {
      log(`${s.name}: peer joined ${id.slice(0, 8)}`);
      const r = routes.get(id) ?? new Map<string, Route>();
      r.set(s.name, {
        room,
        chat: (t: string) => void sendChat(t, id),
        ctl: (t: string) => void sendCtl(t, id),
        file: (data, meta, onProgress) => sendFile(data, id, meta, (fraction) => onProgress(fraction))
      });
      routes.set(id, r);
      activePeer ??= id;
      report();
    });
    room.onPeerLeave((id) => {
      log(`${s.name}: peer left ${id.slice(0, 8)}`);
      const r = routes.get(id);
      r?.delete(s.name);
      if (r && r.size === 0) routes.delete(id);
      if (activePeer === id && !routes.has(id)) activePeer = routes.keys().next().value ?? null;
      report();
    });
    onChat((data, id) => {
      if (id !== activePeer) return;
      if (typeof data !== 'string' || data.length === 0) return;
      handlers.onMessage(data.slice(0, MAX_MESSAGE_LENGTH));
    });
    onCtl((msg, id) => {
      if (id === activePeer && msg === 'call-end') handlers.onRemoteStream(null);
    });
    onFile((data, id, meta) => {
      if (id !== activePeer) return;
      void receiveFile(data, meta);
    });
    room.onPeerStream((stream, id) => {
      if (id === activePeer) handlers.onRemoteStream(stream);
    });
    return room;
  });

  const timer = setInterval(() => {
    log(
      `relays open: ${openCount('nostr', nostr.getRelaySockets)}, ${openCount('torrent', torrent.getRelaySockets)} | ${rtcSummary()}`
    );
  }, 3000);

  const endCall = () => {
    if (localStream) {
      if (callRoute && activePeer) void callRoute.room.removeStream(localStream, activePeer);
      localStream.getTracks().forEach((t) => t.stop());
    }
    localStream = null;
    callRoute?.ctl('call-end');
    callRoute = null;
  };

  return {
    send: (text) => activeRoute()?.chat(text.slice(0, MAX_MESSAGE_LENGTH)),
    startCall: async (video) => {
      const route = activeRoute();
      if (!route || !activePeer) throw new Error('Not connected yet');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: video
          ? { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24, max: 30 } }
          : false
      });
      localStream = stream;
      callRoute = route;
      void route.room.addStream(stream, activePeer);
      return stream;
    },
    endCall,
    sendFile: async (file, onProgress) => {
      if (file.size > MAX_FILE_BYTES) throw new Error('File is too large (limit 50 MB)');
      const route = activeRoute();
      if (!route) throw new Error('Not connected yet');
      const buf = await file.arrayBuffer();
      const hash = toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', buf)));
      await route.file(buf, { name: file.name, size: file.size, hash }, onProgress);
    },
    leave: () => {
      endCall();
      clearInterval(timer);
      rooms.forEach((r) => void r.leave());
    }
  };
}
