const env = import.meta.env;
// VITE_TURN_URL may list several URLs separated by commas,
// e.g. turn:host:3478?transport=udp,turn:host:3478?transport=tcp,turns:host:443.
const turnUrls: string[] = String(env.VITE_TURN_URL ?? '')
  .split(',')
  .map((u) => u.trim())
  .filter(Boolean);

/** True when a TURN relay is configured. Without one, peers behind strict NATs or mobile networks cannot connect. */
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

// Healthier, widely used public Nostr relays. The library default relay list was
// mostly offline or rate-limiting, so we curate our own. Rate-limit bans are
// per-IP and transient, so a relay that was briefly banned is kept if it is
// otherwise healthy; relays that timed out or refused are removed.
export const NOSTR_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://nostr.mom',
  'wss://nostr.sathoarder.com',
  'wss://relay.nostr.wine',
  'wss://nostr.bitcoiner.social',
  'wss://relay.current.site'
];

// WebTorrent tracker list, overriding trystero defaults (which include
// tracker.btorrent.xyz, which refused connections). These are widely operated
// public WebTorrent trackers announced over WebSocket.
export const TORRENT_TRACKERS = [
  'wss://tracker.webtorrent.dev',
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.files.fm:7073/announce',
  'wss://tracker.opentracker.i333.me'
];

// Public MQTT brokers for the mqtt signaling strategy.
export const MQTT_BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://test.mosquitto.org:8081/mqtt'
];

import * as nostr from 'trystero/nostr';
import * as torrent from 'trystero/torrent';
import { joinRoom as joinMqtt } from 'trystero/mqtt';

type Join = typeof nostr.joinRoom;

export const SIGNALING_STRATEGIES: { name: string; join: Join; extra: object }[] = [
  { name: 'nostr', join: nostr.joinRoom, extra: { relayUrls: NOSTR_RELAYS, relayRedundancy: 5 } },
  { name: 'torrent', join: torrent.joinRoom as unknown as Join, extra: { relayUrls: TORRENT_TRACKERS } },
  { name: 'mqtt', join: joinMqtt as unknown as Join, extra: { relayUrls: MQTT_BROKERS } }
];
