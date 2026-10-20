export interface Contact {
  id: string;
  name: string; // the name they announce
  nickname: string; // the name you gave them
  pub?: JsonWebKey;
  addedAt: number;
}

const K = {
  contacts: 'pc.contacts',
  blocked: 'pc.blocked',
  name: 'pc.name',
  online: 'pc.online',
  relay: 'pc.relayonly'
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage may be unavailable */
  }
}

export function cleanName(input: string): string {
  return Array.from(input)
    .filter((c) => c.charCodeAt(0) >= 32)
    .join('')
    .split(' ')
    .filter(Boolean)
    .join(' ')
    .slice(0, 32);
}

export const getName = (): string => read<string>(K.name, '');
export const setName = (n: string): void => write(K.name, cleanName(n));

export const getContacts = (): Contact[] => read<Contact[]>(K.contacts, []);
export function upsertContact(c: Contact): void {
  write(K.contacts, [...getContacts().filter((x) => x.id !== c.id), c]);
}
export function removeContact(id: string): void {
  write(K.contacts, getContacts().filter((c) => c.id !== id));
}

export const getBlocked = (): string[] => read<string[]>(K.blocked, []);
export function setBlocked(id: string, blocked: boolean): void {
  const rest = getBlocked().filter((x) => x !== id);
  write(K.blocked, blocked ? [...rest, id] : rest);
}

export const getOnline = (): boolean => read<boolean>(K.online, true);
export const setOnline = (v: boolean): void => write(K.online, v);
export const getRelayOnly = (): boolean => read<boolean>(K.relay, false);
export const setRelayOnly = (v: boolean): void => write(K.relay, v);
