import { useState } from 'preact/hooks';
import { HAS_TURN } from './config';
import { exportBackup, formatId, type Identity } from './identity';
import type { IncomingRequest } from './inbox';
import type { Contact } from './store';
import { Avatar } from './ui';

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
    <section class='card id-card'>
      <p class='eyebrow'>Your ID</p>
      <p class='id-code'>{text}</p>
      <p class='muted'>{name ? `People see you as ${name}.` : 'Set a display name so people know it is you.'}</p>
      <div class='row'>
        <button onClick={copy}>{copied ? 'Copied' : 'Copy ID'}</button>
        {'share' in navigator && (
          <button class='ghost' onClick={share}>
            Share
          </button>
        )}
      </div>
    </section>
  );
}

interface HomeProps {
  identity: Identity;
  name: string;
  online: boolean;
  busy: boolean;
  requests: Pending[];
  onName: (n: string) => void;
  onDial: (raw: string) => void;
  onInvite: () => void;
  onAccept: (p: Pending, save: boolean) => void;
  onDecline: (p: Pending) => void;
  onBlock: (p: Pending) => void;
}

export function Home(p: HomeProps) {
  const [target, setTarget] = useState('');
  const [draftName, setDraftName] = useState('');
  return (
    <>
      <IdCard identity={p.identity} name={p.name} />
      <p class={p.online ? 'status on' : 'status off'}>
        {p.online ? 'Online: people can reach you with your ID' : 'Appearing offline: nobody can reach you by ID'}
      </p>

      {!p.name && (
        <section class='card'>
          <h2>Pick a display name</h2>
          <p class='muted'>This is what people see when you contact them. You can change it any time.</p>
          <form
            class='row'
            onSubmit={(e) => {
              e.preventDefault();
              p.onName(draftName);
            }}
          >
            <input
              class='grow'
              value={draftName}
              onInput={(e) => setDraftName((e.target as HTMLInputElement).value)}
              placeholder='Your name'
              maxLength={32}
              aria-label='Display name'
            />
            <button>Save</button>
          </form>
        </section>
      )}

      {p.requests.length > 0 && (
        <section class='card' aria-live='polite'>
          <h2>Requests</h2>
          <ul class='list'>
            {p.requests.map((r) => (
              <li key={r.key}>
                <Avatar id={r.req.peer.id} label={r.req.peer.name} />
                <div class='grow'>
                  <strong>{r.req.peer.name || 'Unnamed'}</strong>
                  <span class='muted mono'>{formatId(r.req.peer.id)}</span>
                </div>
                <div class='row'>
                  <button onClick={() => p.onAccept(r, true)}>Accept and save</button>
                  <button class='ghost' onClick={() => p.onAccept(r, false)}>
                    Accept once
                  </button>
                  <button class='ghost' onClick={() => p.onDecline(r)}>
                    Decline
                  </button>
                  <button class='danger' onClick={() => p.onBlock(r)}>
                    Block
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section class='card'>
        <h2>Message or call someone</h2>
        <p class='muted'>Enter their ID. They need to have the app open to receive your request.</p>
        <form
          class='row'
          onSubmit={(e) => {
            e.preventDefault();
            p.onDial(target);
          }}
        >
          <input
            class='grow mono'
            value={target}
            onInput={(e) => setTarget((e.target as HTMLInputElement).value)}
            placeholder='XXXX-XXXX-XXXX-XXXX'
            aria-label='Their ID'
            autocapitalize='characters'
            autocomplete='off'
            spellcheck={false}
          />
          <button disabled={p.busy}>Connect</button>
        </form>
      </section>

      <section class='card'>
        <h2>No ID? Share a link</h2>
        <p class='muted'>Create a private room and send the link through any app. It works once you both open it.</p>
        <button class='ghost' onClick={p.onInvite}>
          Create invite link
        </button>
      </section>
    </>
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
  const sorted = [...p.contacts].sort((a, b) => label(a).localeCompare(label(b)));

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
    <>
      <section class='card'>
        <h2>Contacts</h2>
        {sorted.length === 0 && <p class='muted'>No contacts yet. Add one below, or save someone after you chat.</p>}
        <ul class='list'>
          {sorted.map((c) => (
            <li key={c.id}>
              <Avatar id={c.id} label={label(c)} />
              <div class='grow'>
                <strong>{label(c)}</strong>
                <span class='muted mono'>{formatId(c.id)}</span>
              </div>
              <div class='row'>
                <button disabled={p.busy} onClick={() => p.onMessage(c.id)}>
                  Message
                </button>
                <button class='ghost' onClick={() => rename(c)}>
                  Rename
                </button>
                <button class='ghost' onClick={() => p.onRemove(c.id)}>
                  Remove
                </button>
                <button class='danger' onClick={() => p.onBlock(c.id)}>
                  Block
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section class='card'>
        <h2>Add a contact</h2>
        <form class='stack' onSubmit={add}>
          <input
            class='mono'
            value={rawId}
            onInput={(e) => setRawId((e.target as HTMLInputElement).value)}
            placeholder='XXXX-XXXX-XXXX-XXXX'
            aria-label='Contact ID'
            autocapitalize='characters'
            autocomplete='off'
            spellcheck={false}
          />
          <input
            value={nick}
            onInput={(e) => setNick((e.target as HTMLInputElement).value)}
            placeholder='Nickname (optional)'
            maxLength={32}
            aria-label='Nickname'
          />
          <button>Add contact</button>
        </form>
        {error && (
          <p class='error' role='alert'>
            {error}
          </p>
        )}
      </section>

      {p.blocked.length > 0 && (
        <section class='card'>
          <h2>Blocked</h2>
          <ul class='list'>
            {p.blocked.map((id) => (
              <li key={id}>
                <span class='grow mono'>{formatId(id)}</span>
                <button class='ghost' onClick={() => p.onUnblock(id)}>
                  Unblock
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function Toggle(p: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label class='toggle'>
      <span class='grow'>
        <strong>{p.label}</strong>
        <span class='muted'>{p.hint}</span>
      </span>
      <input type='checkbox' checked={p.checked} onChange={(e) => p.onChange((e.target as HTMLInputElement).checked)} />
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
    <>
      <IdCard identity={p.identity} name={p.name} />

      <section class='card'>
        <h2>Display name</h2>
        <form class='row' onSubmit={save}>
          <input
            class='grow'
            value={draft}
            onInput={(e) => setDraft((e.target as HTMLInputElement).value)}
            placeholder='Your name'
            maxLength={32}
            aria-label='Display name'
          />
          <button>{saved ? 'Saved' : 'Save'}</button>
        </form>
      </section>

      <section class='card'>
        <h2>Privacy</h2>
        <Toggle
          label='Appear online'
          hint='Lets people reach you with your ID while the app is open.'
          checked={p.online}
          onChange={p.onOnline}
        />
        <Toggle
          label='Hide my IP (relay only)'
          hint={
            HAS_TURN
              ? 'Routes connections through a TURN relay.'
              : 'Unavailable: no TURN server is configured, so this setting is ignored.'
          }
          checked={p.relayOnly && HAS_TURN}
          onChange={p.onRelayOnly}
        />
      </section>

      <section class='card'>
        <h2>Backup</h2>
        <p class='muted'>
          Your ID lives in this browser. Save a backup file to restore it elsewhere. The file contains your private
          key, so keep it secret.
        </p>
        <div class='row'>
          <button class='ghost' onClick={download}>
            Export backup
          </button>
          <label class='file-btn'>
            Import backup
            <input type='file' accept='application/json,.json' onChange={onFile} />
          </label>
          <button class='danger' onClick={reset}>
            New ID
          </button>
        </div>
      </section>
    </>
  );
}

export function Help() {
  return (
    <section class='card help'>
      <h2>How Privacy Chat works</h2>
      <p>
        Chats, calls and files go straight between the two devices. There is no account and no server holding your
        messages.
      </p>
      <h2>Your ID</h2>
      <p>
        Your ID is made from a key created in this browser. When someone contacts you, they prove they own the key
        behind their ID, and so do you. Nobody can pretend to be an ID they do not hold.
      </p>
      <h2>What to know</h2>
      <ul>
        <li>Both people need the app open. There is no ringing a closed app and no offline messages.</li>
        <li>Your ID belongs to this browser. Clearing site data loses it unless you saved a backup.</li>
        <li>Anyone who learns your ID can send you a request. You choose to accept, decline or block.</li>
        <li>The person you connect with can see your IP address unless relay-only mode is on.</li>
        <li>
          An attacker who controls the public signaling relays and is present from the very first contact could sit in
          the middle. Chats by invite link are not affected by this when the link is shared privately.
        </li>
      </ul>
      <h2>Trouble connecting?</h2>
      <p>Open a chat and expand Debug info at the bottom. It shows signaling and connection details you can share.</p>
    </section>
  );
}
