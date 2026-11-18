// The five panels. Each takes the shaped `data` object and returns an SVG string.

import { T, langOf, esc, stars, wrap, truncate, panel, kicker, avatar, svg, textWidth } from './theme.mjs';

const rad = (deg) => (deg * Math.PI) / 180;

/* ------------------------------------------------------------------ *
 * 1. ORBITS — the sun, the language planets, the recent-push comets
 * ------------------------------------------------------------------ */
export function orbits(d) {
  const W = T.W, H = 400;
  const cx = W / 2, cy = 205;
  const langs = d.languages.slice(0, 6);

  // One ellipse per language, innermost = most used.
  const orbitRx = (i, n) => 96 + (i * (402 - 96)) / Math.max(1, n - 1 || 1);
  const squash = 0.34;
  const angles = [208, 58, 150, 330, 18, 252];

  let rings = '';
  let planets = '';
  langs.forEach((l, i) => {
    const rx = orbitRx(i, langs.length);
    const ry = rx * squash;
    rings += `<ellipse cx="${cx}" cy="${cy}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="none" stroke="#273049" stroke-width="1" stroke-dasharray="3 6" opacity="0.85"/>`;
    const a = rad(angles[i % angles.length]);
    const px = cx + rx * Math.cos(a);
    const py = cy + ry * Math.sin(a);
    const { c, ink, chip } = langOf(l.name);
    const label = `${l.name} ${l.pct}%`;
    planets += `
  <g>
    <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="15" fill="${c}"/>
    <circle cx="${px.toFixed(1)}" cy="${(py - 4).toFixed(1)}" r="15" fill="#ffffff" opacity="0.10"/>
    <text x="${px.toFixed(1)}" y="${(py + 4).toFixed(1)}" text-anchor="middle" font-family="${T.mono}" font-weight="700" font-size="${chip.length > 3 ? 8 : 9.5}" fill="${ink}">${esc(chip)}</text>
    <text x="${px.toFixed(1)}" y="${(py + 32).toFixed(1)}" text-anchor="middle" font-family="${T.mono}" font-size="11" fill="${T.muted}">${esc(label)}</text>
  </g>`;
  });

  // Comets: recently pushed repos, drawn as a streak with a head and a label.
  const lanes = [
    { x1: -10, y1: 78, x2: 148, y2: 104, tx: 158, ty: 108, anchor: 'start' },
    { x1: 712, y1: 40, x2: 576, y2: 74, tx: 566, ty: 78, anchor: 'end' },
    { x1: -10, y1: 352, x2: 164, y2: 322, tx: 174, ty: 326, anchor: 'start' },
  ];
  const comets = d.comets.slice(0, 3).map((name, i) => {
    const L = lanes[i];
    return `
  <g>
    <line x1="${L.x1}" y1="${L.y1}" x2="${L.x2}" y2="${L.y2}" stroke="url(#tail)" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="${L.x2}" cy="${L.y2}" r="3.4" fill="#ffffff"/>
    <text x="${L.tx}" y="${L.ty}" text-anchor="${L.anchor}" font-family="${T.mono}" font-size="11" fill="${T.muted}">${esc(truncate(name, 11, 150, 'mono'))}</text>
  </g>`;
  }).join('');

  const body = `
  <defs>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${T.gold}" stop-opacity="0.55"/>
      <stop offset="42%" stop-color="#d79b2a" stop-opacity="0.17"/>
      <stop offset="100%" stop-color="${T.gold}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="tail" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.75"/>
    </linearGradient>
    <clipPath id="frame"><rect width="${W}" height="${H}" rx="${T.radius}"/></clipPath>
  </defs>
  <g clip-path="url(#frame)">
    <rect width="${W}" height="${H}" fill="${T.bg}"/>
    ${stars(d.login + 'orbits', W, H, 120)}
    ${rings}
    <circle cx="${cx}" cy="${cy}" r="132" fill="url(#glow)"/>
    ${comets}
    ${planets}
    ${avatar('sun', cx, cy, 31, d.avatarDataUri, d.initials)}
    <text x="24" y="30" font-family="${T.mono}" font-weight="700" font-size="11.5" letter-spacing="2.2" fill="${T.muted}">SOLAR SYSTEM &#183; @${esc(d.login.toUpperCase())}</text>
    <text x="24" y="${H - 22}" font-family="${T.mono}" font-size="10.5" fill="${T.faint}">${esc(d.footerMark)}</text>
    <text x="${W - 24}" y="${H - 22}" text-anchor="end" font-family="${T.mono}" font-size="10.5" fill="${T.faint}">planets = languages &#183; moons = repos &#183; comets = recent pushes</text>
  </g>`;
  return svg(W, H, body);
}

/* ------------------------------------------------------------------ *
 * 2. ABOUT — the sun card: name, stack, location and counts
 * ------------------------------------------------------------------ */
export function about(d) {
  const W = T.W, H = 200;
  const bioLines = wrap(d.bio, 15.5, 560, 2);
  const meta = [
    d.location,
    `${d.followers} followers`,
    `${d.repoCount} repositories`,
    `★ ${d.stars} stars`,
  ].filter(Boolean).join('  ·  ');

  const body = `
  <defs><clipPath id="aframe"><rect width="${W}" height="${H}" rx="${T.radius}"/></clipPath></defs>
  <g clip-path="url(#aframe)">
    ${panel(W, H)}
    ${stars(d.login + 'about', W, H, 42)}
    ${kicker('The Sun', 40, 44)}
    <text x="40" y="84" font-family="${T.sans}" font-weight="700" font-size="30" fill="${T.text}">${esc(d.name)}</text>
    ${bioLines.map((l, i) => `<text x="40" y="${116 + i * 24}" font-family="${T.sans}" font-size="15.5" fill="#c3cdde">${esc(l)}</text>`).join('')}
    <text x="40" y="${H - 34}" font-family="${T.mono}" font-size="11.5" fill="${T.muted}">${esc(meta)}</text>
    ${avatar('aav', W - 110, H / 2, 52, d.avatarDataUri, d.initials)}
  </g>`;
  return svg(W, H, body);
}

/* ------------------------------------------------------------------ *
 * 3. MOON — one repository card (rendered at 49% width in the README)
 * ------------------------------------------------------------------ */
export function moon(d, repo, index) {
  const W = 490, H = 168;
  const desc = wrap(repo.description || 'A project in progress.', 13.5, 360, 2);

  const body = `
  <defs><clipPath id="mframe${index}"><rect width="${W}" height="${H}" rx="${T.radius}"/></clipPath></defs>
  <g clip-path="url(#mframe${index})">
    ${panel(W, H)}
    ${stars(d.login + 'moon' + index, W, H, 26)}
    ${kicker(`Moon ${String(index).padStart(2, '0')}`, 28, 44)}
    <g transform="translate(${W - 58} 34)" opacity="0.8">
      <circle cx="0" cy="0" r="9" fill="#9aa7bf"/>
      <ellipse cx="0" cy="0" rx="16" ry="5" fill="none" stroke="#9aa7bf" stroke-width="2" transform="rotate(-20)"/>
    </g>
    <text x="28" y="80" font-family="${T.sans}" font-weight="700" font-size="18" fill="${T.text}">${esc(truncate(repo.name, 18, 400, 'sansBold'))}</text>
    ${desc.map((l, i) => `<text x="28" y="${106 + i * 20}" font-family="${T.sans}" font-size="13.5" fill="${T.muted}">${esc(l)}</text>`).join('')}
    <text x="28" y="${H - 24}" font-family="${T.mono}" font-size="12" fill="${T.faint}">&#9733; ${repo.stars}&#160;&#160;&#160;&#8690; ${repo.forks}</text>
  </g>`;
  return svg(W, H, body);
}

/* ------------------------------------------------------------------ *
 * 4. PLANETS — language share bars
 * ------------------------------------------------------------------ */
export function planets(d) {
  const rows = d.languages.slice(0, 6);
  const W = T.W, top = 76, rowH = 29;
  const H = top + rows.length * rowH + 22;
  const barX = 218, barW = W - barX - 86;

  const body = `
  <defs><clipPath id="pframe"><rect width="${W}" height="${H}" rx="${T.radius}"/></clipPath></defs>
  <g clip-path="url(#pframe)">
    ${panel(W, H)}
    ${stars(d.login + 'planets', W, H, 34)}
    ${kicker('Planets', 40, 44)}
    ${rows.map((l, i) => {
      const y = top + i * rowH;
      const { c, ink, chip } = langOf(l.name);
      const fill = Math.max(6, (barW * l.pct) / 100);
      return `
    <g>
      <rect x="40" y="${y - 11}" width="19" height="19" rx="5" fill="${c}"/>
      <text x="49.5" y="${y + 2.5}" text-anchor="middle" font-family="${T.mono}" font-weight="700" font-size="${chip.length > 3 ? 7 : 8.5}" fill="${ink}">${esc(chip)}</text>
      <text x="70" y="${y + 3}" font-family="${T.sans}" font-weight="700" font-size="14" fill="${T.text}">${esc(l.name)}</text>
      <rect x="${barX}" y="${y - 5}" width="${barW}" height="10" rx="5" fill="#1b2335"/>
      <rect x="${barX}" y="${y - 5}" width="${fill.toFixed(1)}" height="10" rx="5" fill="${c}"/>
      <text x="${W - 40}" y="${y + 3}" text-anchor="end" font-family="${T.mono}" font-size="11.5" fill="${T.muted}">${l.pct}%</text>
    </g>`;
    }).join('')}
  </g>`;
  return svg(W, H, body);
}

/* ------------------------------------------------------------------ *
 * 5. ORBIT LOG — 26-week contribution heatmap plus streak figures
 * ------------------------------------------------------------------ */
export function orbitLog(d) {
  const W = T.W, H = 210;
  const cell = 11, gap = 3.4, x0 = 40, y0 = 76;
  const weeks = d.weeks;

  const grid = weeks.map((week, wi) =>
    week.map((lvl, di) => {
      const x = x0 + wi * (cell + gap);
      const y = y0 + di * (cell + gap);
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${cell}" height="${cell}" rx="2.6" fill="${T.heat[lvl]}"/>`;
    }).join('')
  ).join('');

  const statX = x0 + weeks.length * (cell + gap) + 54;
  const stat = (label, value, y) => `
    <text x="${statX}" y="${y}" font-family="${T.mono}" font-size="10" letter-spacing="1.6" fill="${T.faint}">${esc(label)}</text>
    <text x="${statX}" y="${y + 24}" font-family="${T.sans}" font-weight="700" font-size="21" fill="${T.text}">${esc(value)}</text>`;

  const body = `
  <defs><clipPath id="lframe"><rect width="${W}" height="${H}" rx="${T.radius}"/></clipPath></defs>
  <g clip-path="url(#lframe)">
    ${panel(W, H)}
    ${stars(d.login + 'log', W, H, 38)}
    ${kicker(`Orbit Log · ${weeks.length} Weeks`, 40, 44)}
    ${grid}
    ${stat('DAYS IN ORBIT', `${d.streak} days`, y0 + 4)}
    ${stat('LONGEST ORBIT', `${d.longest} days`, y0 + 48)}
    ${stat('REVOLUTIONS THIS YEAR', `${d.total}`, y0 + 92)}
  </g>`;
  return svg(W, H, body);
}
