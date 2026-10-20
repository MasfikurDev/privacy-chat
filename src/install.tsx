import { useEffect, useState } from 'preact/hooks';
import './install.css';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pc.install.dismissed';
const WEEK = 7 * 24 * 60 * 60 * 1000;

// Chrome fires beforeinstallprompt once, early. Capture it at module load.
let deferred: InstallPromptEvent | null = null;
let installedFlag = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e as InstallPromptEvent;
  notify();
});
window.addEventListener('appinstalled', () => {
  deferred = null;
  installedFlag = true;
  notify();
});

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

function recentlyDismissed(): boolean {
  try {
    return Date.now() - Number(localStorage.getItem(DISMISS_KEY) ?? 0) < WEEK;
  } catch {
    return false;
  }
}

export function InstallBanner() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(deferred);
  const [installed, setInstalled] = useState(installedFlag || isStandalone());
  const [hidden, setHidden] = useState(recentlyDismissed());
  const [inChat, setInChat] = useState(location.hash.length > 1);

  useEffect(() => {
    const sync = () => {
      setPromptEvent(deferred);
      setInstalled(installedFlag || isStandalone());
    };
    const onHash = () => setInChat(location.hash.length > 1);
    listeners.add(sync);
    window.addEventListener('hashchange', onHash);
    sync();
    return () => {
      listeners.delete(sync);
      window.removeEventListener('hashchange', onHash);
    };
  }, []);

  const visible = !installed && !hidden && !inChat && (promptEvent !== null || isIos());

  useEffect(() => {
    if (visible) document.body.classList.add('has-install');
    else document.body.classList.remove('has-install');
    return () => {
      document.body.classList.remove('has-install');
    };
  }, [visible]);

  if (installed || hidden || inChat) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* storage may be unavailable */
    }
  };

  const install = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    deferred = null;
    setPromptEvent(null);
  };

  if (promptEvent) {
    return (
      <aside class='install' aria-label='Install app'>
        <div class='grow'>
          <strong>Install Privacy Chat</strong>
          <span>Opens like a normal app from your home screen or desktop.</span>
        </div>
        <md-filled-button onClick={install}>Install</md-filled-button>
        <md-text-button onClick={dismiss}>Not now</md-text-button>
      </aside>
    );
  }

  if (isIos()) {
    return (
      <aside class='install' aria-label='Install app'>
        <div class='grow'>
          <strong>Install Privacy Chat</strong>
          <span>Tap the Share button, then choose Add to Home Screen.</span>
        </div>
        <md-text-button onClick={dismiss}>Got it</md-text-button>
      </aside>
    );
  }

  return null;
}
