const env = import.meta.env;

export function buildRtcConfig(relayOnly: boolean): RTCConfiguration {
  const iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.l.google.com:19302' }
  ];
  if (env.VITE_TURN_URL) {
    iceServers.push({
      urls: env.VITE_TURN_URL,
      username: env.VITE_TURN_USERNAME,
      credential: env.VITE_TURN_CREDENTIAL
    });
  }
  return { iceServers, iceTransportPolicy: relayOnly ? 'relay' : 'all' };
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
