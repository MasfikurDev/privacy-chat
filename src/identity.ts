import { b64url, fromB64url, sha256 } from './signaling';

// 32 symbols without look-alikes (no I, O, 0, 1): 5 bits each, 16 symbols = 80 bits.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const STORE = 'pc.identity.v1';
const ECDSA = { name: 'ECDSA', namedCurve: 'P-256' } as const;
const SIGN = { name: 'ECDSA', hash: 'SHA-256' } as const;
const enc = new TextEncoder();

export interface Identity {
  id: string;
  pub: JsonWebKey;
  priv: CryptoKey;
}

interface Stored {
  pub: JsonWebKey;
  priv: JsonWebKey;
}

function canonical(pub: JsonWebKey): JsonWebKey | null {
  const { kty, crv, x, y } = pub;
  if (kty !== 'EC' || crv !== 'P-256' || typeof x !== 'string' || typeof y !== 'string') return null;
  if (x.length > 64 || y.length > 64) return null;
  return { kty, crv, x, y };
}

/** The ID is the first 80 bits of the SHA-256 of the public key, as 16 symbols. */
export async function idFromPub(pub: JsonWebKey): Promise<string | null> {
  const c = canonical(pub);
  if (!c) return null;
  const hash = await sha256(`${c.x}.${c.y}`);
  let value = 0;
  let bits = 0;
  let out = '';
  for (const byte of hash.slice(0, 10)) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
    value &= (1 << bits) - 1;
  }
  return out;
}

export const formatId = (id: string): string => [0, 4, 8, 12].map((i) => id.slice(i, i + 4)).join('-');

export function normalizeId(input: string): string | null {
  const raw = Array.from(input.toUpperCase())
    .filter((c) => c !== '-' && c !== ' ')
    .join('');
  return raw.length === 16 && Array.from(raw).every((c) => ALPHABET.includes(c)) ? raw : null;
}

async function fromStored(s: Stored): Promise<Identity> {
  const pub = canonical(s.pub);
  const id = pub ? await idFromPub(pub) : null;
  if (!pub || !id) throw new Error('This identity is not valid.');
  const priv = await crypto.subtle.importKey('jwk', s.priv, ECDSA, false, ['sign']);
  return { id, pub, priv };
}

export async function loadIdentity(): Promise<Identity> {
  let stored: Stored | null = null;
  try {
    stored = JSON.parse(localStorage.getItem(STORE) ?? 'null') as Stored | null;
  } catch {
    stored = null;
  }
  if (!stored) {
    const pair = await crypto.subtle.generateKey(ECDSA, true, ['sign', 'verify']);
    stored = {
      pub: await crypto.subtle.exportKey('jwk', pair.publicKey),
      priv: await crypto.subtle.exportKey('jwk', pair.privateKey)
    };
    localStorage.setItem(STORE, JSON.stringify(stored));
  }
  return fromStored(stored);
}

/** The backup file contains the private key. Anyone holding it can act as you. */
export const exportBackup = (): string => localStorage.getItem(STORE) ?? '';

export async function importBackup(json: string): Promise<Identity> {
  let parsed: Partial<Stored>;
  try {
    parsed = JSON.parse(json) as Partial<Stored>;
  } catch {
    throw new Error('That file is not a Privacy Chat backup.');
  }
  if (!parsed.pub || !parsed.priv) throw new Error('That file is not a Privacy Chat backup.');
  const identity = await fromStored({ pub: parsed.pub, priv: parsed.priv });
  const proof = await sign(identity, 'backup-check');
  if (!(await verify(identity.pub, 'backup-check', proof))) throw new Error('The backup keys do not match.');
  localStorage.setItem(STORE, JSON.stringify({ pub: parsed.pub, priv: parsed.priv }));
  return identity;
}

export async function resetIdentity(): Promise<Identity> {
  localStorage.removeItem(STORE);
  return loadIdentity();
}

export async function sign(me: Identity, message: string): Promise<string> {
  return b64url(new Uint8Array(await crypto.subtle.sign(SIGN, me.priv, enc.encode(message))));
}

export async function verify(pub: JsonWebKey, message: string, signature: string): Promise<boolean> {
  const c = canonical(pub);
  if (!c) return false;
  try {
    const key = await crypto.subtle.importKey('jwk', c, ECDSA, false, ['verify']);
    return await crypto.subtle.verify(SIGN, key, fromB64url(signature), enc.encode(message));
  } catch {
    return false;
  }
}
