const env = import.meta.env;

// VITE_TURN_URL may list several URLs separated by commas,
// e.g. "turn:host:3478?transport=udp,turn:host:3478?transport=tcp,turns:host:443".
const turnUrls: string[] = String(env.VITE_TURN_URL ?? '')
  .split(',')
  .map((u) => u.trim())
  .filter(Boolean);

/** True when a TURN relay is configured. Without one, peers behind strict NATs or mobile networks can't connect. */
export const HAS_TURN = turnUrls.length > 0;

export function buildRtcConfig(relayOnly: boolean): RTCConfiguration {
  const iceServers: RTCIceServer[] = [
    { urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }
  ];
  if (HAS_TURN) {
    iceServers.push({
      urls: turnUrls,
      username: env.VITE_TURN_USERNAME,
      credential: env.VITE_TURN_CREDENTIAL
    });
  }
  // Forcing relay without a TURN server makes every connection fail, so only honor it when one exists.
  const policy: RTCIceTransportPolicy = relayOnly && HAS_TURN ? 'relay' : 'all';
  return { iceServers, iceTransportPolicy: policy };
}

export const APP_ID = 'privacy-chat-v1';
export const MAX_MESSAGE_LENGTH = 4000;
export const MAX_FILE_BYTES = 50 * 1024 * 1024;

// Healthier, widely used public Nostr relays (the library defaults were mostly offline).
export const NOSTR_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://nostr.mom',
  'wss://relay.nostr.band',
  'wss://nostr.sathoarder.com'
];
