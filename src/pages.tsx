import { useState } from 'preact/hooks';
import { HAS_TURN } from './config';
import { exportBackup, formatId, type Identity } from './identity';
import type { IncomingRequest } from './inbox';
import type { Contact } from './store';
import { Avatar, Icon } from './ui';

export interface Pending {
  key: number;
  req: IncomingRequest;
}

const copyText = (text: string) => navigator.clipboard.writeText(text).catch(() => undefined);
const label = (c: Contact) => c.nickname || c.name || 'Unnamed';

function IdCard({ identity, name }: { identity: Identity; name: string }) {
  const [copied, setCopied] = useState(false);
  const text = formatId(identity.id);
  const copy = async () => {
    await copyText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const share = () => {
    void navigator
      .share({ title: 'Privacy Chat', text: `${name || 'Someone'} on Privacy Chat: ${text}` })
      .catch(() => undefined);
  };
  return (
    <section class='card border border-primary/20 bg-primary/5 shadow-sm'>
      <div class='card-body gap-3 p-4 sm:p-6'>
        <p class='text-xs font-semibold uppercase tracking-[0.16em] text-base-content/60'>Your ID</p>
        <p class='id-code break-all font-mono text-xl font-bold tracking-wide sm:text-2xl'>{text}</p>
        <p class='text-sm text-base-content/70'>{name ? `People see you as ${name}.` : 'Set a display name so people know it is you.'}</p>
        <div class='flex flex-wrap gap-2'>
          <button class='btn btn-primary min-h-11 gap-2' type='button' onClick={copy}>
            {copied && <Icon name='check' size={16} />}
            {copied ? 'Copied' : 'Copy ID'}
          </button>
          {'share' in navigator && (
            <button class='btn btn-outline min-h-11' type='button' onClick={share}>Share</button>
          )}
        </div>
      </div>
    </section>
  );
}

interface ChatsProps {
  contacts: Contact[];
  busy: boolean;
  onMessage: (id: string) => void;
  onDial: (raw: string) => void;
  onInvite: () => void;
}

export function Chats(p: ChatsProps) {
  const [query, setQuery] = useState('');
  const [target, setTarget] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const sorted = [...p.contacts]
    .filter((c) => !normalizedQuery || label(c).toLocaleLowerCase().includes(normalizedQuery) || formatId(c.id).toLocaleLowerCase().includes(normalizedQuery))
    .sort((a, b) => label(a).localeCompare(label(b)));

  const start = (e: Event) => {
    e.preventDefault();
    if (!target.trim() || p.busy) return;
    p.onDial(target);
  };

  return (
    <section class='mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-5' aria-label='Chats'>
      <div class='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div class='min-w-0 space-y-1'>
          <p class='text-xs font-semibold uppercase tracking-[0.16em] text-base-content/60'>Private by design</p>
          <h2 class='text-3xl font-bold tracking-tight sm:text-4xl'>Chats</h2>
        </div>
        <button class='btn btn-primary min-h-12 w-full gap-2 sm:w-auto' disabled={p.busy} onClick={() => setShowNewChat((v) => !v)}>
          <Icon name='plus' size={18} />
          New chat
        </button>
      </div>

      <label class='input input-bordered flex min-h-12 w-full items-center gap-3 rounded-2xl'>
        <Icon name='search' size={18} />
        <input
          class='grow bg-transparent outline-none'
          type='search'
          aria-label='Search people'
          placeholder='Search people'
          value={query}
          onInput={(e) => setQuery(e.currentTarget.value)}
        />
      </label>

      {showNewChat && (
        <section class='card border border-base-300 bg-base-100 shadow-sm' aria-label='Start a new chat'>
          <div class='card-body gap-4 p-4 sm:p-6'>
            <div class='space-y-1'>
              <h3 class='card-title text-lg'>Start a private chat</h3>
              <p class='text-sm text-base-content/70'>Enter someone’s Privacy Chat ID. They need the app open to receive your request.</p>
            </div>
            <form class='flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start' onSubmit={start}>
              <input
                class='input input-bordered min-h-12 w-full min-w-0 font-mono sm:flex-1'
                aria-label='Their ID'
                placeholder='XXXX-XXXX-XXXX-XXXX'
                value={target}
                onInput={(e) => setTarget(e.currentTarget.value)}
              />
              <button class='btn btn-primary min-h-12 w-full sm:w-auto' type='submit' disabled={p.busy}>Connect</button>
            </form>
            <div class='flex flex-col gap-2 border-t border-base-300 pt-3 sm:flex-row sm:items-center sm:justify-between'>
              <span class='text-sm text-base-content/70'>Or invite someone with a one-time link.</span>
              <button class='btn btn-ghost min-h-11 self-start gap-2' type='button' onClick={p.onInvite}>
                <Icon name='link' size={16} />
                Create invite
              </button>
            </div>
          </div>
        </section>
      )}

      {p.contacts.length === 0 ? (
        <div class='card border border-dashed border-base-300 bg-base-100 shadow-sm'>
          <div class='card-body items-center gap-4 px-5 py-12 text-center sm:py-16'>
            <div class='grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary'>
              <Icon name='message' size={28} />
            </div>
            <div class='max-w-md space-y-2'>
              <h3 class='text-xl font-semibold'>Your private chats start here</h3>
              <p class='text-sm leading-6 text-base-content/70'>Add someone by their ID or create an invite link. People are not shown as online unless a live connection confirms it.</p>
            </div>
            {!showNewChat && (
              <button class='btn btn-primary min-h-12 gap-2' onClick={() => setShowNewChat(true)}>
                <Icon name='plus' size={18} />
                Start your first chat
              </button>
            )}
          </div>
        </div>
      ) : sorted.length === 0 ? (
        <p class='rounded-xl bg-base-200 px-4 py-3 text-sm text-base-content/70' role='status'>No people match “{query.trim()}”.</p>
      ) : (
        <ul class='divide-y divide-base-300 overflow-hidden rounded-2xl border border-base-300 bg-base-100'>
          {sorted.map((c) => (
            <li key={c.id}>
              <button
                class='group flex min-h-[76px] w-full min-w-0 items-center gap-3 p-3 text-left transition-colors hover:bg-base-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-50 sm:gap-4 sm:p-4'
                type='button'
                disabled={p.busy}
                onClick={() => p.onMessage(c.id)}
                aria-label={`Message ${label(c)}`}
              >
                <span class='shrink-0'><Avatar id={c.id} label={label(c)} /></span>
                <span class='flex min-w-0 flex-1 flex-col gap-1'>
                  <strong class='break-words text-base font-semibold'>{label(c)}</strong>
                  <span class='break-all text-sm text-base-content/60'>{formatId(c.id)}</span>
                </span>
                <span class='shrink-0 text-base-content/50 transition-transform group-hover:translate-x-0.5'>
                  <Icon name='chevron-right' size={18} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <p class='px-1 text-xs leading-5 text-base-content/60'>This list shows saved people, not stored conversation history. Messages are currently kept only for the active session.</p>
    </section>
  );
}

interface ContactsProps {
  contacts: Contact[];
  blocked: string[];
  busy: boolean;
  onMessage: (id: string) => void;
  onAdd: (rawId: string, nickname: string) => string;
  onRename: (id: string, nickname: string) => void;
  onRemove: (id: string) => void;
  onBlock: (id: string) => void;
  onUnblock: (id: string) => void;
}

export function Contacts(p: ContactsProps) {
  const [rawId, setRawId] = useState('');
  const [nick, setNick] = useState('');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const sorted = [...p.contacts]
    .filter((c) => !normalizedQuery || label(c).toLocaleLowerCase().includes(normalizedQuery) || formatId(c.id).toLocaleLowerCase().includes(normalizedQuery))
    .sort((a, b) => label(a).localeCompare(label(b)));

  const add = (e: Event) => {
    e.preventDefault();
    const err = p.onAdd(rawId, nick);
    setError(err);
    if (!err) {
      setRawId('');
      setNick('');
    }
  };
  const rename = (c: Contact) => {
    const next = window.prompt('Nickname for this contact', c.nickname || c.name);
    if (next !== null) p.onRename(c.id, next);
  };

  return (
    <div class='mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-5'>
      <section class='card border border-base-300 bg-base-100 shadow-sm'>
        <div class='card-body min-w-0 gap-4 p-4 sm:p-6'>
          <div class='space-y-1'>
            <h2 class='text-2xl font-bold tracking-tight'>Contacts</h2>
            <p class='text-sm text-base-content/70'>Manage the people you can start a private conversation with.</p>
          </div>
          <label class='input input-bordered flex min-h-12 w-full items-center gap-3 rounded-2xl'>
            <Icon name='search' size={18} />
            <input class='grow bg-transparent outline-none' type='search' aria-label='Search contacts' placeholder='Search contacts' value={query} onInput={(e) => setQuery(e.currentTarget.value)} />
          </label>
          {p.contacts.length === 0 && <p class='rounded-xl bg-base-200 p-4 text-sm text-base-content/70'>No contacts yet. Add one below, or save someone after you chat.</p>}
          {p.contacts.length > 0 && sorted.length === 0 && <p class='text-sm text-base-content/70' role='status'>No contacts match “{query.trim()}”.</p>}
          {sorted.length > 0 && (
            <ul class='divide-y divide-base-300 overflow-hidden rounded-2xl border border-base-300'>
              {sorted.map((c) => (
                <li class='contact-item flex min-w-0 flex-wrap items-center gap-3 p-3 sm:gap-4 sm:p-4' key={c.id}>
                  <span class='shrink-0'><Avatar id={c.id} label={label(c)} /></span>
                  <div class='contact-info flex min-w-0 flex-1 flex-col gap-1'>
                    <strong class='break-words font-semibold'>{label(c)}</strong>
                    <span class='break-all font-mono text-xs text-base-content/60'>{formatId(c.id)}</span>
                  </div>
                  <div class='contact-actions flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center'>
                    <button type='button' class='btn btn-primary contact-primary min-h-11 w-full gap-2 sm:w-auto' disabled={p.busy} onClick={() => p.onMessage(c.id)}>
                      <Icon name='send' size={16} />
                      Message
                    </button>
                    <div class='contact-secondary flex w-full flex-wrap gap-1 sm:w-auto' role='group' aria-label={`More actions for ${label(c)}`}>
                      <button type='button' class='btn btn-ghost btn-sm min-h-11 flex-1 sm:flex-none' onClick={() => rename(c)}>Rename</button>
                      <button type='button' class='btn btn-ghost btn-sm min-h-11 flex-1 sm:flex-none' onClick={() => p.onRemove(c.id)}>Remove</button>
                      <button type='button' class='btn btn-ghost btn-error btn-sm min-h-11 flex-1 sm:flex-none' onClick={() => p.onBlock(c.id)}>Block</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section class='card border border-base-300 bg-base-100 shadow-sm'>
        <div class='card-body gap-4 p-4 sm:p-6'>
          <div class='space-y-1'>
            <h2 class='text-xl font-bold'>Add a contact</h2>
            <p class='text-sm text-base-content/70'>Use their Privacy Chat ID to save them on this device.</p>
          </div>
          <form class='flex min-w-0 flex-col gap-3' onSubmit={add}>
            <input class='input input-bordered min-h-12 w-full font-mono' aria-label='Contact ID' placeholder='XXXX-XXXX-XXXX-XXXX' value={rawId} onInput={(e) => setRawId(e.currentTarget.value)} />
            <input class='input input-bordered min-h-12 w-full' aria-label='Nickname' placeholder='Nickname (optional)' value={nick} maxLength={32} onInput={(e) => setNick(e.currentTarget.value)} />
            <button class='btn btn-primary min-h-12 w-full sm:w-fit' type='submit'>Add contact</button>
          </form>
          {error && <p class='alert alert-error text-sm' role='alert'>{error}</p>}
        </div>
      </section>

      {p.blocked.length > 0 && (
        <section class='card border border-base-300 bg-base-100 shadow-sm'>
          <div class='card-body gap-3 p-4 sm:p-6'>
            <h2 class='text-xl font-bold'>Blocked</h2>
            <ul class='divide-y divide-base-300'>
              {p.blocked.map((id) => (
                <li class='flex min-w-0 items-center justify-between gap-3 py-3' key={id}>
                  <span class='break-all font-mono text-sm'>{formatId(id)}</span>
                  <button class='btn btn-ghost btn-sm min-h-11 shrink-0' type='button' onClick={() => p.onUnblock(id)}>Unblock</button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}

function Toggle(p: { label: string; hint: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <label class='flex min-w-0 items-start justify-between gap-4 border-b border-base-300 py-4 last:border-b-0'>
      <span class='flex min-w-0 flex-col gap-1'>
        <strong class='font-semibold'>{p.label}</strong>
        <span class='text-sm leading-5 text-base-content/70'>{p.hint}</span>
      </span>
      <input
        type='checkbox'
        class='toggle toggle-primary mt-1 shrink-0'
        checked={p.checked}
        disabled={p.disabled}
        aria-label={p.label}
        onChange={(e) => p.onChange(e.currentTarget.checked)}
      />
    </label>
  );
}

interface ProfileProps {
  identity: Identity;
  name: string;
  online: boolean;
  relayOnly: boolean;
  onName: (n: string) => void;
  onOnline: (v: boolean) => void;
  onRelayOnly: (v: boolean) => void;
  onImport: (json: string) => Promise<void>;
  onReset: () => void;
  onHelp: () => void;
}

export function Profile(p: ProfileProps) {
  const [draft, setDraft] = useState(p.name);
  const [saved, setSaved] = useState(false);

  const save = (e: Event) => {
    e.preventDefault();
    p.onName(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([exportBackup()], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'privacy-chat-identity.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  const onFile = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) await p.onImport(await file.text());
  };
  const reset = () => {
    if (window.confirm('Create a brand-new ID? Your current ID stops working and contacts will need your new one.')) {
      p.onReset();
    }
  };

  return (
    <div class='mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-5'>
      <IdCard identity={p.identity} name={p.name} />

      <section class='card border border-base-300 bg-base-100 shadow-sm'>
        <div class='card-body gap-4 p-4 sm:p-6'>
          <div class='space-y-1'>
            <h2 class='text-xl font-bold'>Display name</h2>
            <p class='text-sm text-base-content/70'>Choose the name other people see when you contact them.</p>
          </div>
          <form class='flex min-w-0 flex-col gap-3 sm:flex-row' onSubmit={save}>
            <input
              class='input input-bordered min-h-12 w-full sm:flex-1'
              aria-label='Display name'
              placeholder='Display name'
              value={draft}
              maxLength={32}
              onInput={(e) => setDraft(e.currentTarget.value)}
            />
            <button class='btn btn-primary min-h-12 w-full sm:w-auto' type='submit'>{saved ? 'Saved' : 'Save'}</button>
          </form>
        </div>
      </section>

      <section class='card border border-base-300 bg-base-100 shadow-sm'>
        <div class='card-body gap-1 p-4 sm:p-6'>
          <div class='mb-1 space-y-1'>
            <h2 class='text-xl font-bold'>Privacy</h2>
            <p class='text-sm text-base-content/70'>Control when people can reach you and how connections are routed.</p>
          </div>
          <Toggle
            label='Appear online'
            hint='Lets people reach you with your ID while the app is open.'
            checked={p.online}
            onChange={p.onOnline}
          />
          <Toggle
            label='Hide my IP (relay only)'
            hint={HAS_TURN ? 'Routes connections through a TURN relay.' : 'Unavailable: no TURN server is configured, so this setting is ignored.'}
            checked={p.relayOnly && HAS_TURN}
            disabled={!HAS_TURN}
            onChange={p.onRelayOnly}
          />
        </div>
      </section>

      <section class='card border border-base-300 bg-base-100 shadow-sm'>
        <div class='card-body flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6'>
          <div class='min-w-0 space-y-1'>
            <h2 class='text-xl font-bold'>Help & privacy</h2>
            <p class='text-sm text-base-content/70'>How peer-to-peer connections work, what stays on this device, and what the network can see.</p>
          </div>
          <button class='btn btn-outline min-h-11 shrink-0 gap-2' type='button' onClick={p.onHelp}>
            <Icon name='help' size={18} />
            Open help
          </button>
        </div>
      </section>

      <section class='card border border-base-300 bg-base-100 shadow-sm'>
        <div class='card-body gap-4 p-4 sm:p-6'>
          <div class='space-y-1'>
            <h2 class='text-xl font-bold'>Backup</h2>
            <p class='text-sm leading-6 text-base-content/70'>Your ID lives in this browser. Save a backup file to restore it elsewhere. The file contains your private key, so keep it secret.</p>
          </div>
          <div class='flex flex-col gap-2 sm:flex-row sm:flex-wrap'>
            <button class='btn btn-outline min-h-11 gap-2' type='button' onClick={download}>
              <Icon name='download' size={16} />
              Export backup
            </button>
            <label class='btn btn-outline min-h-11 cursor-pointer'>
              Import backup
              <input class='sr-only' type='file' accept='application/json,.json' onChange={onFile} />
            </label>
            <button class='btn btn-ghost btn-error min-h-11 gap-2' type='button' onClick={reset}>
              <Icon name='alert' size={16} />
              New ID
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export function Help() {
  return (
    <section class='mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-5'>
      <div class='space-y-1'>
        <h2 class='text-2xl font-bold tracking-tight'>How Privacy Chat works</h2>
        <p class='text-sm text-base-content/70'>Important information about private connections and their limits.</p>
      </div>
      <article class='card border border-base-300 bg-base-100 shadow-sm'>
        <div class='card-body gap-3 p-4 sm:p-6'>
          <h3 class='text-lg font-bold'>Peer-to-peer messaging</h3>
          <p class='text-sm leading-6 text-base-content/80'>Chats, calls and files go straight between the two devices. There is no account and no server holding your messages.</p>
        </div>
      </article>
      <article class='card border border-base-300 bg-base-100 shadow-sm'>
        <div class='card-body gap-3 p-4 sm:p-6'>
          <h3 class='text-lg font-bold'>Your ID</h3>
          <p class='text-sm leading-6 text-base-content/80'>Your ID is made from a key created in this browser. When someone contacts you, they prove they own the key behind their ID, and so do you. Nobody can pretend to be an ID they do not hold.</p>
        </div>
      </article>
      <article class='card border border-base-300 bg-base-100 shadow-sm'>
        <div class='card-body gap-3 p-4 sm:p-6'>
          <h3 class='text-lg font-bold'>What to know</h3>
          <ul class='list-disc space-y-2 pl-5 text-sm leading-6 text-base-content/80'>
            <li>Both people need the app open. There is no ringing a closed app and no offline messages.</li>
            <li>Your ID belongs to this browser. Clearing site data loses it unless you saved a backup.</li>
            <li>Anyone who learns your ID can send you a request. You choose to accept, decline or block.</li>
            <li>The person you connect with can see your IP address unless relay-only mode is on.</li>
            <li>An attacker who controls the public signaling relays and is present from the very first contact could sit in the middle. Chats by invite link are not affected by this when the link is shared privately.</li>
          </ul>
        </div>
      </article>
      <article class='card border border-base-300 bg-base-100 shadow-sm'>
        <div class='card-body gap-2 p-4 sm:p-6'>
          <h3 class='text-lg font-bold'>Trouble connecting?</h3>
          <p class='text-sm leading-6 text-base-content/80'>Open a chat and expand Debug info at the bottom. It shows signaling and connection details you can share.</p>
        </div>
      </article>
    </section>
  );
}
