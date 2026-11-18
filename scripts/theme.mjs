// Visual language for the Solar System README panels.
// Every colour, size and font lives here — edit this file to restyle everything.

export const T = {
  // canvas
  W: 1000,
  bg: '#070b14',
  card: '#0d1526',
  cardEdge: '#1b2439',

  // ink
  gold: '#f5c451',
  text: '#e9eefa',
  muted: '#8b97ad',
  faint: '#5a6680',

  // fonts (resolved on the viewer's machine — no web fonts, no external calls)
  mono: "ui-monospace,'SFMono-Regular','Menlo','Consolas','Liberation Mono',monospace",
  sans: "'Segoe UI',system-ui,-apple-system,'Helvetica Neue',Arial,sans-serif",

  // contribution heatmap ramp, low -> high
  heat: ['#161d2e', '#2a3f8f', '#3b5bdb', '#5c7cfa', '#f5c451'],

  radius: 14,
};

// Colour + short chip label per language. Unknown languages fall back to grey.
export const LANG = {
  JavaScript: { c: '#f0db4f', ink: '#1a1a1a', chip: 'JS' },
  TypeScript: { c: '#3178c6', ink: '#ffffff', chip: 'TS' },
  PHP:        { c: '#787cb5', ink: '#ffffff', chip: 'php' },
  CSS:        { c: '#b07cc6', ink: '#ffffff', chip: 'CSS' },
  SCSS:       { c: '#cd6799', ink: '#ffffff', chip: 'SCSS' },
  HTML:       { c: '#e34c26', ink: '#ffffff', chip: 'HTML' },
  Python:     { c: '#3572a5', ink: '#ffffff', chip: 'PY' },
  Java:       { c: '#b07219', ink: '#ffffff', chip: 'JV' },
  Shell:      { c: '#89e051', ink: '#1a1a1a', chip: 'SH' },
  Vue:        { c: '#41b883', ink: '#ffffff', chip: 'VUE' },
  Dart:       { c: '#00b4ab', ink: '#ffffff', chip: 'DRT' },
  Blade:      { c: '#f7523f', ink: '#ffffff', chip: 'BLD' },
  'C#':       { c: '#178600', ink: '#ffffff', chip: 'C#' },
  'C++':      { c: '#f34b7d', ink: '#ffffff', chip: 'C+' },
  Ruby:       { c: '#701516', ink: '#ffffff', chip: 'RB' },
  Go:         { c: '#00add8', ink: '#ffffff', chip: 'GO' },
};

export const langOf = (name) =>
  LANG[name] || { c: '#6b7a99', ink: '#ffffff', chip: (name || '?').slice(0, 2).toUpperCase() };

// ---------- tiny SVG helpers ----------

export const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Deterministic PRNG so regenerating with unchanged data produces an identical
// file — keeps the daily commit diff empty instead of reshuffling the stars.
export function rng(seed) {
  let s = 0;
  for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;  s >>>= 0;
    return s / 4294967296;
  };
}

// Scattered starfield, clipped to the panel. With `twinkle`, every third star
// breathes on its own cycle — declarative SMIL, so it animates inside an <img>.
export function stars(seed, w, h, count = 90, twinkle = false) {
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < count; i++) {
    const x = +(r() * w).toFixed(1);
    const y = +(r() * h).toFixed(1);
    const rad = +(r() * 1.1 + 0.3).toFixed(2);
    const o = +(r() * 0.5 + 0.12).toFixed(2);
    const dur = +(r() * 3.5 + 2.2).toFixed(1);
    const begin = +(r() * 6).toFixed(1);
    const bright = Math.min(1, o + 0.55).toFixed(2);
    out += twinkle && i % 3 === 0
      ? `<circle cx="${x}" cy="${y}" r="${rad}" fill="#ffffff" opacity="${o}"><animate attributeName="opacity" values="${o};${bright};${o}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/></circle>`
      : `<circle cx="${x}" cy="${y}" r="${rad}" fill="#ffffff" opacity="${o}"/>`;
  }
  return out;
}

// No text measuring in plain Node, so approximate advance widths per font.
const WIDTH = { mono: 0.6, sans: 0.52, sansBold: 0.58 };

export const textWidth = (s, size, kind = 'sans') => String(s).length * size * WIDTH[kind];

// Greedy wrap to a pixel width; returns at most `maxLines`, ellipsising the last.
export function wrap(str, size, maxWidth, maxLines = 2, kind = 'sans') {
  const words = String(str || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (textWidth(next, size, kind) > maxWidth && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    } else {
      line = next;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines) {
    const used = lines.join(' ').split(/\s+/).length;
    if (used < words.length) {
      let last = lines[maxLines - 1];
      while (textWidth(last + '…', size, kind) > maxWidth && last.length > 1) last = last.slice(0, -1);
      lines[maxLines - 1] = last.replace(/[\s,]+$/, '') + '…';
    }
  }
  return lines;
}

export const truncate = (s, size, maxWidth, kind = 'sans') => {
  let out = String(s ?? '');
  if (textWidth(out, size, kind) <= maxWidth) return out;
  while (out.length > 1 && textWidth(out + '…', size, kind) > maxWidth) out = out.slice(0, -1);
  return out.replace(/[\s,]+$/, '') + '…';
};

// Rounded panel background with a hairline edge.
export const panel = (w, h) =>
  `<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="${T.radius}" fill="${T.card}" stroke="${T.cardEdge}"/>`;

// Small gold section label, letter-spaced mono.
export const kicker = (txt, x, y) =>
  `<text x="${x}" y="${y}" font-family="${T.mono}" font-size="11" font-weight="700" letter-spacing="2.4" fill="${T.gold}">${esc(String(txt).toUpperCase())}</text>`;

// Avatar: a clipped circle when we have image bytes, initials on a gold disc otherwise.
export function avatar(id, x, y, r, dataUri, initials) {
  const ring = `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${T.gold}" stroke-width="2.5" opacity="0.95"/>`;
  if (dataUri) {
    return `<clipPath id="${id}"><circle cx="${x}" cy="${y}" r="${r}"/></clipPath>
<image href="${dataUri}" x="${x - r}" y="${y - r}" width="${r * 2}" height="${r * 2}" clip-path="url(#${id})" preserveAspectRatio="xMidYMid slice"/>${ring}`;
  }
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="#16213b"/>
<text x="${x}" y="${y + r * 0.34}" text-anchor="middle" font-family="${T.sans}" font-weight="700" font-size="${r * 0.9}" fill="${T.gold}">${esc(initials)}</text>${ring}`;
}

export const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">${body}</svg>\n`;
