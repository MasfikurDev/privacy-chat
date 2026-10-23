import { useEffect, useRef, useState } from 'preact/hooks';
import { Chat } from './Chat';
import { formatId, importBackup, loadIdentity, normalizeId, resetIdentity, type Identity } from './identity';
import { dial, listenInbox, type Peer } from './inbox';
import { Chats, Contacts, Help, Profile, type Pending } from './pages';
import { RequestDialog } from './RequestDialog';
import { Icon, type IconName } from './ui';
import { createSecret } from './room';
import {
  cleanName,
  getBlocked,
  getContacts,
  getName,
  getOnline,
  getRelayOnly,
  removeContact,
  setBlocked,
  setName,
  setOnline,
  setRelayOnly,
  upsertContact,
  type Contact
} from './store';

type Screen = 'chats' | 'contacts' | 'profile' | 'help';

const TABS: [Screen, string, IconName][] = [
  ['chats', 'Chats', 'message'],
  ['contacts', 'Contacts', 'users'],
  ['profile', 'Settings', 'user'],
];

const SCREEN_TITLES: Record<Screen, string> = {
  chats: 'Chats',
  contacts: 'Contacts',
  profile: 'Settings',
  help: 'Help'
};

function ScreenAnnouncer({ screen }: { screen: Screen }) {
  const [announced, setAnnounced] = useState('');
  const previous = useRef<Screen | null>(null);
  useEffect(() => {
    if (previous.current === null) {
      previous.current = screen;
      return;
    }
    if (screen !== previous.current) {
      previous.current = screen;
      setAnnounced(SCREEN_TITLES[screen]);
    }
  }, [screen]);
  return (
    <div
      aria-live='polite'
      role='status'
      class='visually-hidden'
    >
      {announced}
    </div>
  );
}

let nextKey = 1;
const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function App() {
  const initial = location.hash.slice(1);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [setupError, setSetupError] = useState('');
  const [screen, setScreen] = useState<Screen>('chats');
  const [chat, setChat] = useState<{ secret: string; peer?: Peer } | null>(initial ? { secret: initial } : null);
  const [name, setNameState] = useState(getName());
  const [contacts, setContacts] = useState<Contact[]>(getContacts());
  const [blocked, setBlockedIds] = useState<string[]>(getBlocked());
  const [online, setOnlineState] = useState(getOnline());
  const [relayOnly, setRelayOnlyState] = useState(getRelayOnly());
  const [notice, setNotice] = useState('');
  const [requests, setRequests] = useState<Pending[]>([]);
  const [dialing, setDialing] = useState<{ id: string; status: string } | null>(null);
  const dialRef = useRef<{ cancel: () => void } | null>(null);
  const chatRef = useRef(chat);
  chatRef.current = chat;
  const screenContentRef = useRef<HTMLDivElement>(null);
  const hasFocusedRef = useRef(false);

  const title = SCREEN_TITLES[screen];

  const refresh = () => {
    setContacts(getContacts());
    setBlockedIds(getBlocked());
  };
  const labelFor = (id: string) => {
    const c = contacts.find((x) => x.id === id);
    return c?.nickname || c?.name || formatId(id);
  };
  const rememberPeer = (peer: Peer) => {
    const existing = getContacts().find((c) => c.id === peer.id);
    if (existing) {
      upsertContact({ ...existing, name: peer.name, pub: peer.pub });
      refresh();
    }
  };
  const saveContact = (peer: Peer) => {
    const existing = getContacts().find((c) => c.id === peer.id);
    upsertContact({
      id: peer.id,
      name: peer.name,
      nickname: existing?.nickname ?? '',
      pub: peer.pub,
      addedAt: existing?.addedAt ?? Date.now()
    });
    refresh();
  };
  const openChat = (secret: string, peer?: Peer) => {
    location.hash = secret;
    setChat({ secret, peer });
  };
  const leaveChat = () => {
    history.replaceState(null, '', location.pathname + location.search);
    setChat(null);
  };

  useEffect(() => {
    loadIdentity()
      .then(setIdentity)
      .catch((e) => setSetupError(errText(e)));
  }, []);

  // Listen for incoming requests while the app is open and online.
  useEffect(() => {
    if (!identity || !online) return;
    let stop: (() => void) | null = null;
    let cancelled = false;
    listenInbox(identity, relayOnly, (req) => {
      if (getBlocked().includes(req.peer.id)) {
        req.decline();
        return;
      }
      const known = getContacts().some((c) => c.id === req.peer.id);
      if (known && !chatRef.current) {
        const secret = req.accept();
        if (secret) {
          rememberPeer(req.peer);
          openChat(secret, req.peer);
        }
        return;
      }
      const item: Pending = { key: nextKey++, req };
      setRequests((r) => [...r, item]);
      setTimeout(() => setRequests((r) => r.filter((x) => x !== item)), 120000);
    })
      .then((s) => {
        if (cancelled) s();
        else stop = s;
      })
      .catch((e) => setNotice(`Could not start listening: ${errText(e)}`));
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [identity, online, relayOnly]);

  // Move focus into the new view on screen change; never on the first render.
  useEffect(() => {
    if (hasFocusedRef.current) {
      screenContentRef.current?.focus();
    } else {
      hasFocusedRef.current = true;
    }
  }, [screen]);

  const startDial = (raw: string) => {
    setNotice('');
    if (!identity || dialing) return;
    const id = normalizeId(raw);
    if (!id) {
      setNotice('That ID does not look right. It has 16 letters and numbers, like K7QM-4TXD-9HWP-2ZRB.');
      return;
    }
    if (id === identity.id) {
      setNotice('That is your own ID.');
      return;
    }
    if (getBlocked().includes(id)) {
      setNotice('You blocked this ID. Unblock it in Contacts first.');
      return;
    }
    setDialing({ id, status: 'Starting�' });
    const d = dial(identity, id, relayOnly, (status) => setDialing({ id, status }));
    dialRef.current = d;
    d.promise
      .then(({ secret, peer }) => {
        setDialing(null);
        rememberPeer(peer);
        openChat(secret, peer);
      })
      .catch((e) => {
        setDialing(null);
        const msg = errText(e);
        if (msg !== 'Cancelled') setNotice(msg);
      });
  };

  const dropRequest = (p: Pending) => setRequests((r) => r.filter((x) => x !== p));
  const acceptRequest = (p: Pending, save: boolean) => {
    const secret = p.req.accept();
    dropRequest(p);
    if (!secret) {
      setNotice('That request expired.');
      return;
    }
    if (save) saveContact(p.req.peer);
    else rememberPeer(p.req.peer);
    openChat(secret, p.req.peer);
  };
  const declineRequest = (p: Pending) => {
    p.req.decline();
    dropRequest(p);
  };
  const blockRequest = (p: Pending) => {
    setBlocked(p.req.peer.id, true);
    refresh();
    declineRequest(p);
  };

  const addContact = (rawId: string, nickname: string): string => {
    const id = normalizeId(rawId);
    if (!id) return 'That ID does not look right. It has 16 letters and numbers.';
    if (identity && id === identity.id) return 'That is your own ID.';
    const existing = getContacts().find((c) => c.id === id);
    upsertContact({
      id,
      name: existing?.name ?? '',
      nickname: cleanName(nickname),
      pub: existing?.pub,
      addedAt: existing?.addedAt ?? Date.now()
    });
    refresh();
    return '';
  };
  const renameContact = (id: string, nickname: string) => {
    const existing = getContacts().find((c) => c.id === id);
    if (existing) {
      upsertContact({ ...existing, nickname: cleanName(nickname) });
      refresh();
    }
  };

  const importIdentity = async (json: string) => {
    try {
      setIdentity(await importBackup(json));
      setNotice('Identity restored from backup.');
    } catch (e) {
      setNotice(errText(e));
    }
  };
  const newIdentity = () => {
    resetIdentity()
      .then(setIdentity)
      .catch((e) => setNotice(errText(e)));
  };

  const requestDialog = (inChat: boolean) => (
    <RequestDialog
      requests={requests}
      inChat={inChat}
      onAccept={acceptRequest}
      onDecline={declineRequest}
      onBlock={blockRequest}
    />
  );

  if (chat) {
    const peer = chat.peer;
    const saved = !!peer && contacts.some((c) => c.id === peer.id);
    return (
      <div class='app app-chat flex h-dvh min-h-0 w-full flex-col gap-0 overflow-hidden p-0'>
        <Chat
          key={chat.secret}
          secret={chat.secret}
          peer={peer}
          relayOnly={relayOnly}
          saved={saved}
          onSave={() => peer && saveContact(peer)}
          onLeave={leaveChat}
        />
        {requestDialog(true)}
      </div>
    );
  }

  if (setupError) {
    return (
      <div class='app mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-5 px-4 pt-[calc(env(safe-area-inset-top)_+_1rem)] pb-[calc(env(safe-area-inset-bottom)_+_7rem)] md:px-8 md:pb-[calc(env(safe-area-inset-bottom)_+_2rem)]'>
        <main class='page'>
          <section class='card'>
            <h2>Could not set up your ID</h2>
            <p class='error' role='alert'>
              {setupError}
            </p>
            <p class='muted'>This app needs a modern browser over HTTPS with storage enabled.</p>
          </section>
        </main>
      </div>
    );
  }

  if (!identity) {
    return (
      <div class='app mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-5 px-4 pt-[calc(env(safe-area-inset-top)_+_1rem)] pb-[calc(env(safe-area-inset-bottom)_+_7rem)] md:px-8 md:pb-[calc(env(safe-area-inset-bottom)_+_2rem)]'>
        <main class='page'>
          <p role='status'>Setting up your private ID�</p>
        </main>
      </div>
    );
  }

  return (
    <div class='app mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-5 px-4 pt-[calc(env(safe-area-inset-top)_+_1rem)] pb-[calc(env(safe-area-inset-bottom)_+_7rem)] md:px-8 md:pb-[calc(env(safe-area-inset-bottom)_+_2rem)]'>
      <header class='top flex flex-col gap-1 px-1'>
        <h1 class='text-2xl font-bold tracking-tight sm:text-3xl'>Privacy Chat</h1>
        <p class='muted'>Peer to peer. No accounts.</p>
      </header>
      <ScreenAnnouncer screen={screen} />

      {dialing && (
        <div class='banner' role='status'>
          <span>
            {dialing.status} ({labelFor(dialing.id)})
          </span>
          <md-text-button onClick={() => dialRef.current?.cancel()}>
            Cancel
          </md-text-button>
        </div>
      )}
      {notice && (
        <div class='banner error' role='alert'>
          <span>{notice}</span>
          <md-text-button onClick={() => setNotice('')}>
            Dismiss
          </md-text-button>
        </div>
      )}

      <main class={`page page-${screen} flex min-w-0 flex-1 flex-col gap-5`}>
        <div class='screen flex min-w-0 flex-col gap-5 outline-offset-4' tabIndex={-1} aria-label={title} ref={screenContentRef}>
          {screen === 'chats' && (
            <Chats
              contacts={contacts.filter((c) => !blocked.includes(c.id))}
              busy={!!dialing}
              onMessage={startDial}
              onDial={startDial}
              onInvite={() => openChat(createSecret())}
            />
          )}
          {screen === 'contacts' && (
            <Contacts
              contacts={contacts}
              blocked={blocked}
              busy={!!dialing}
              onMessage={startDial}
              onAdd={addContact}
              onRename={renameContact}
              onRemove={(id) => {
                removeContact(id);
                refresh();
              }}
              onBlock={(id) => {
                setBlocked(id, true);
                refresh();
              }}
              onUnblock={(id) => {
                setBlocked(id, false);
                refresh();
              }}
            />
          )}
          {screen === 'profile' && (
            <Profile
              identity={identity}
              name={name}
              online={online}
              relayOnly={relayOnly}
              onName={(n) => {
                setName(n);
                setNameState(getName());
              }}
              onOnline={(v) => {
                setOnline(v);
                setOnlineState(v);
              }}
              onRelayOnly={(v) => {
                setRelayOnly(v);
                setRelayOnlyState(v);
              }}
              onImport={importIdentity}
              onReset={newIdentity}
              onHelp={() => setScreen('help')}
            />
          )}
          {screen === 'help' && <Help />}
        </div>
      </main>

      <nav class='fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)_+_0.5rem)] z-40 mx-auto flex w-auto max-w-md translate-x-0 transform-none gap-1 rounded-2xl border border-base-300 bg-base-100/95 p-2 shadow-xl backdrop-blur md:static md:mt-auto md:w-fit md:max-w-none md:shadow-sm' aria-label='Main'>
        {TABS.map(([key, text, icon]) =>
          screen === key ? (
            <button class='btn btn-primary btn-sm min-h-11 flex-1 gap-2 px-2 sm:px-4' key={key} aria-current='page' onClick={() => setScreen(key)}>
              <Icon name={icon} size={18} />
              <span>{text}</span>
            </button>
          ) : (
            <button class='btn btn-ghost btn-sm min-h-11 flex-1 gap-2 px-2 sm:px-4' key={key} onClick={() => setScreen(key)}>
              <Icon name={icon} size={18} />
              <span>{text}</span>
            </button>
          )
        )}
      </nav>
      {requestDialog(false)}
    </div>
  );
}
