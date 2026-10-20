export function hue(id: string): number {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

export function Avatar({ id, label }: { id: string; label: string }) {
  const initial = Array.from(label.trim())[0]?.toUpperCase() ?? '?';
  return (
    <span class='avatar' style={{ background: `hsl(${hue(id)} 45% 36%)` }} aria-hidden='true'>
      {initial}
    </span>
  );
}
