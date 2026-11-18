#!/usr/bin/env node
// Bakes the brand glyphs we use into scripts/logos.mjs, so nothing is fetched
// at render time and the panels stay self-contained.
//
//   node scripts/build-logos.mjs              # pull from the pinned CDN copy
//   node scripts/build-logos.mjs ./icons      # or from a local icon folder
//
// Source: Simple Icons (CC0). Each brand mark belongs to its owner and is used
// here only to refer to that technology.

import { readFileSync, writeFileSync } from 'node:fs';

const DIR = process.argv[2] || '';
const CDN = 'https://cdn.jsdelivr.net/npm/simple-icons@13.21.0/icons';

// slug -> [label, disc colour, ink on that disc]
const SET = {
  html5:      ['HTML',       '#e34c26', '#ffffff'],
  css3:       ['CSS',        '#1572b6', '#ffffff'],
  javascript: ['JavaScript', '#f0db4f', '#1a1a1a'],
  typescript: ['TypeScript', '#3178c6', '#ffffff'],
  php:        ['PHP',        '#787cb5', '#ffffff'],
  less:       ['Less',       '#2a4d80', '#ffffff'],
  react:      ['React',      '#61dafb', '#0b2a33'],
  laravel:    ['Laravel',    '#ff2d20', '#ffffff'],
  mongodb:    ['MongoDB',    '#47a248', '#ffffff'],
  vercel:     ['Vercel',     '#f2f3f5', '#0b0e14'],
  wordpress:  ['WordPress',  '#21759b', '#ffffff'],
  framer:     ['Framer',     '#0055ff', '#ffffff'],
};

const source = async (slug) => {
  if (DIR) return readFileSync(`${DIR}/${slug}.svg`, 'utf8');
  const res = await fetch(`${CDN}/${slug}.svg`);
  if (!res.ok) throw new Error(`GET ${slug}.svg -> ${res.status}`);
  return res.text();
};

const rows = [];
for (const [slug, [label, c, ink]] of Object.entries(SET)) {
  const d = (await source(slug)).match(/ d="([^"]+)"/)?.[1];
  if (!d) throw new Error(`no path in ${slug}.svg`);
  rows.push(`  ${slug}: { label: '${label}', c: '${c}', ink: '${ink}', d: '${d}' },`);
}

writeFileSync('scripts/logos.mjs', `// Brand glyphs, baked in at build time from Simple Icons (CC0) so the panels
// stay self-contained — nothing is fetched when someone views the README.
// Each path is drawn on a 24x24 grid; logoMark() scales and centres it.
// Regenerate with: node scripts/build-logos.mjs

export const LOGOS = {
${rows.join('\n')}
};

// Language name (as GitHub reports it) -> glyph above.
export const LANG_LOGO = {
  HTML: 'html5',
  CSS: 'css3',
  SCSS: 'css3',
  JavaScript: 'javascript',
  TypeScript: 'typescript',
  PHP: 'php',
  Less: 'less',
};

// The stack that is not a language in any repo but is what the work is built on.
export const STACK = ['react', 'laravel', 'mongodb', 'vercel', 'wordpress', 'framer'];

// A glyph centred on (x, y), sized to \`size\` in user units.
export function logoMark(slug, x, y, size, fill) {
  const logo = LOGOS[slug];
  if (!logo) return '';
  const k = size / 24;
  return \`<g transform="translate(\${(x - size / 2).toFixed(2)} \${(y - size / 2).toFixed(2)}) scale(\${k.toFixed(4)})"><path d="\${logo.d}" fill="\${fill || logo.ink}"/></g>\`;
}
`);
console.log(`scripts/logos.mjs written with ${rows.length} glyphs`);
