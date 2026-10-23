import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

export function hue(id: string): number {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

export function Avatar({ id, label, size }: { id: string; label: string; size?: 'lg' }) {
  const initial = Array.from(label.trim())[0]?.toUpperCase() ?? '?';
  return (
    <span
      class={size === 'lg' ? 'avatar avatar-lg' : 'avatar'}
      style={{ background: `hsl(${hue(id)} 45% 36%)` }}
      aria-hidden='true'
    >
      {initial}
    </span>
  );
}

interface ModalProps {
  open: boolean;
  onCancel: () => void;
  children: ComponentChildren;
}

/**
 * Material dialog: traps focus, blocks the page behind it and reports Escape
 * or scrim clicks through `onCancel`. The app owns the open state, so the
 * dialog is only closed once the caller stops asking for it.
 */
export function Modal({ open, onCancel, children }: ModalProps) {
  const ref = useRef<HTMLElement & { open: boolean }>(null);
  const cancelRef = useRef(onCancel);
  cancelRef.current = onCancel;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handleCancel = (event: Event) => {
      event.preventDefault();
      cancelRef.current();
    };
    el.addEventListener('cancel', handleCancel);
    return () => el.removeEventListener('cancel', handleCancel);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.open = true;
    else if (!open && el.open) el.open = false;
  }, [open]);

  return (
    <md-dialog ref={ref} class='modal'>
      {children}
    </md-dialog>
  );
}

/**
 * Material Web buttons render their own `<button>` inside a shadow root, so
 * they cannot submit an outer `<form>`. This submits the closest form.
 */
export function submitForm(event: Event) {
  const host = event.currentTarget as HTMLElement | null;
  host?.closest('form')?.requestSubmit();
}

/** Plays a soft repeating two-tone ring and vibrates while `active` is true. */
export function useRingtone(active: boolean) {
  useEffect(() => {
    if (!active) return;
    let ctx: AudioContext | null = null;
    try {
      ctx = new AudioContext();
    } catch {
      ctx = null;
    }
    const ring = () => {
      navigator.vibrate?.([400, 200, 400]);
      if (!ctx) return;
      const now = ctx.currentTime;
      [0, 0.45].forEach((offset, i) => {
        const osc = ctx!.createOscillator();
        const gain = ctx!.createGain();
        osc.frequency.value = i === 0 ? 880 : 660;
        gain.gain.setValueAtTime(0, now + offset);
        gain.gain.linearRampToValueAtTime(0.12, now + offset + 0.03);
        gain.gain.linearRampToValueAtTime(0, now + offset + 0.35);
        osc.connect(gain).connect(ctx!.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.4);
      });
    };
    ring();
    const t = setInterval(ring, 2500);
    return () => {
      clearInterval(t);
      navigator.vibrate?.(0);
      void ctx?.close();
    };
  }, [active]);
}
export type IconName =
  | 'mic'
  | 'mic-off'
  | 'video'
  | 'video-off'
  | 'phone-off'
  | 'phone'
  | 'send'
  | 'paperclip'
  | 'dots'
  | 'check'
  | 'download'
  | 'alert'
  | 'down'
  | 'back'
  | 'home'
  | 'users'
  | 'user'
  | 'help';

const ICON_PATHS: Record<IconName, string> = {
  mic: 'M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8',
  'mic-off': 'M1 1l22 22M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.68-1.33M19 10v2a7 7 0 0 1-.11 1.23M12 19v4M8 23h8',
  video: 'M23 7l-7 5 7 5V7zM1 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H1a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z'.replace('a2 2 0 0 1-2 0', 'a2 2 0 0 1-2-2'),
  'video-off': 'M1 1l22 22M23 7l-7 5 7 5V7zM1 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H1a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z'.replace('a2 2 0 0 1-2 0', 'a2 2 0 0 1-2-2'),
  'phone-off': 'M1 1l22 22M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67M3.38 6.62A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91',
  phone: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z',
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  paperclip: 'M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48',
  dots: 'M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM12 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM12 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  check: 'M20 6L9 17l-5-5',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  alert: 'M10.29 3.86L1.82 18a2 2 0 0 1 1.71 3h16.94a2 2 0 0 1 1.71-3L13.71 3.86a2 2 0 0 1-3.42 0zM12 9v4M12 17h.01',
  down: 'M6 9l6 6 6-6',
  back: 'M19 12H5M12 19l-7-7 7-7',
  home: 'M3 10.5L12 3l9 7.5M5.5 9v11h13V9M9 20v-6h6v6',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  help: 'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
};

export function Icon({
  name,
  size = 20,
  label,
  slot
}: {
  name: IconName;
  size?: number;
  label?: string;
  slot?: string;
}) {
  const props = label ? { role: 'img' as const, 'aria-label': label } : { 'aria-hidden': 'true' as const };
  return (
    <svg
      viewBox='0 0 24 24'
      width={size}
      height={size}
      fill='none'
      stroke='currentColor'
      strokeWidth={1.8}
      strokeLinecap='round'
      strokeLinejoin='round'
      focusable='false'
      slot={slot}
      {...props}
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

function makeIcon(name: IconName) {
  return function NamedIcon({ size = 20, label, slot }: { size?: number; label?: string; slot?: string }) {
    return <Icon name={name} size={size} label={label} slot={slot} />;
  };
}

export const MicIcon = makeIcon('mic');
export const MicOffIcon = makeIcon('mic-off');
export const VideoIcon = makeIcon('video');
export const VideoOffIcon = makeIcon('video-off');
export const PhoneOffIcon = makeIcon('phone-off');
export const PhoneIcon = makeIcon('phone');
export const SendIcon = makeIcon('send');
export const PaperclipIcon = makeIcon('paperclip');
export const DotsIcon = makeIcon('dots');
export const CheckIcon = makeIcon('check');
export const DownloadIcon = makeIcon('download');
export const AlertIcon = makeIcon('alert');
export const DownIcon = makeIcon('down');
export const BackIcon = makeIcon('back');
