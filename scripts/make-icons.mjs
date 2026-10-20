// Generates the app icons (no dependencies) into public/ before every build.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const TEAL = [15, 107, 99];
const WHITE = [255, 255, 255];

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0;
    rgba.copy(raw, y * stride + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function inRoundRect(u, v, x0, y0, x1, y1, r) {
  if (u < x0 || u > x1 || v < y0 || v > y1) return false;
  const cx = clamp(u, x0 + r, x1 - r);
  const cy = clamp(v, y0 + r, y1 - r);
  return (u - cx) ** 2 + (v - cy) ** 2 <= r * r;
}

function inTriangle(u, v, a, b, c) {
  const s = (p, q, r) => (p[0] - r[0]) * (q[1] - r[1]) - (q[0] - r[0]) * (p[1] - r[1]);
  const p = [u, v];
  const d1 = s(p, a, b);
  const d2 = s(p, b, c);
  const d3 = s(p, c, a);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}

/** Colour at (u, v) in 0..1 space, or null when transparent. */
function sample(u, v, rounded, glyphScale) {
  if (rounded && !inRoundRect(u, v, 0, 0, 1, 1, 0.22)) return null;
  // Scale the glyph around the centre so maskable icons keep it in the safe zone.
  const gu = (u - 0.5) / glyphScale + 0.5;
  const gv = (v - 0.5) / glyphScale + 0.5;
  let color = TEAL;
  const bubble =
    inRoundRect(gu, gv, 0.22, 0.26, 0.78, 0.62, 0.07) ||
    inTriangle(gu, gv, [0.3, 0.6], [0.3, 0.77], [0.43, 0.6]);
  if (bubble) color = WHITE;
  if (bubble) {
    const body = inRoundRect(gu, gv, 0.44, 0.45, 0.56, 0.55, 0.015);
    const dist = Math.hypot(gu - 0.5, gv - 0.45);
    const shackle = gv <= 0.45 && dist <= 0.058 && dist >= 0.036;
    if (body || shackle) color = TEAL;
    if (Math.hypot(gu - 0.5, gv - 0.5) <= 0.012) color = WHITE;
  }
  return color;
}

function render(size, rounded, glyphScale) {
  const N = 4; // 4x4 supersampling for smooth edges
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let j = 0; j < N; j++) {
        for (let i = 0; i < N; i++) {
          const c = sample((x + (i + 0.5) / N) / size, (y + (j + 0.5) / N) / size, rounded, glyphScale);
          if (c) { r += c[0]; g += c[1]; b += c[2]; a += 1; }
        }
      }
      const o = (y * size + x) * 4;
      if (a > 0) {
        out[o] = Math.round(r / a);
        out[o + 1] = Math.round(g / a);
        out[o + 2] = Math.round(b / a);
        out[o + 3] = Math.round((a / (N * N)) * 255);
      }
    }
  }
  return encodePng(size, out);
}

mkdirSync('public', { recursive: true });
writeFileSync('public/icon-192.png', render(192, true, 1));
writeFileSync('public/icon-512.png', render(512, true, 1));
writeFileSync('public/icon-maskable-512.png', render(512, false, 0.8));
writeFileSync('public/apple-touch-icon.png', render(180, false, 0.9));
console.log('icons generated');
