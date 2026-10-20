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
  labelId: string;
  descId?: string;
  onCancel: () => void;
  children: ComponentChildren;
}

/** Native modal dialog: traps focus, closes on Escape (via onCancel), and blocks the page behind it. */
export function Modal({ open, labelId, descId, onCancel, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      class='modal'
      aria-labelledby={labelId}
      aria-describedby={descId}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      {open && children}
    </dialog>
  );
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
