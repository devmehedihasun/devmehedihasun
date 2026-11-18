// The five panels. Each takes the shaped `data` object and returns an SVG string.

import { T, langOf, esc, stars, wrap, truncate, panel, kicker, avatar, svg, textWidth } from './theme.mjs';
import { LOGOS, LANG_LOGO, ORBIT, STACK, logoMark } from './logos.mjs';

const rad = (deg) => (deg * Math.PI) / 180;

/* ------------------------------------------------------------------ *
 * 1. ORBITS — the sun, the language planets, the recent-push comets
 * ------------------------------------------------------------------ */
export function orbits(d) {
  const W = T.W, H = 400;
  const cx = W / 2, cy = 205;
  // The bodies in orbit are a fixed set (ORBIT); a language among them shows
  // its real share, the rest are named on their own.
  const share = Object.fromEntries(d.languages.map((l) => [l.name, l.pct]));
  const bodies = ORBIT.map(({ slug, lang }) => {
    const logo = LOGOS[slug];
    const pct = lang ? share[lang] : undefined;
    return {
      slug,
      c: logo.c,
      ink: logo.ink,
      label: pct ? `${logo.label} ${pct}%` : logo.label,
    };
  });

  // One ellipse per body, innermost first.
  const orbitRx = (i, n) => 206 + (i * (420 - 206)) / Math.max(1, n - 1 || 1);
  const squash = 0.34;
  const angles = [208, 58, 150, 330, 18, 252];

  // A full ellipse written as two half arcs, starting at `deg` — the motion
  // path a body travels, so each one begins at its own point in the orbit.
  const orbitPath = (rx, ry, deg) => {
    const a = rad(deg);
    const x0 = cx + rx * Math.cos(a), y0 = cy + ry * Math.sin(a);
    const x1 = cx - rx * Math.cos(a), y1 = cy - ry * Math.sin(a);
    const n = (v) => v.toFixed(1);
    return `M${n(x0)} ${n(y0)}A${n(rx)} ${n(ry)} 0 1 1 ${n(x1)} ${n(y1)}A${n(rx)} ${n(ry)} 0 1 1 ${n(x0)} ${n(y0)}`;
  };

  let rings = '';
  let planets = '';
  bodies.forEach((b, i) => {
    const rx = orbitRx(i, bodies.length);
    const ry = rx * squash;
    // The dashes drift round the ring; 9 is the dash period, so the loop is seamless.
    rings += `
  <ellipse cx="${cx}" cy="${cy}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="none" stroke="#273049" stroke-width="1" stroke-dasharray="3 6" opacity="0.85">
    <animate attributeName="stroke-dashoffset" values="0;-9" dur="${(5 + i * 1.5).toFixed(1)}s" repeatCount="indefinite"/>
  </ellipse>`;
    // Outer orbits take longer to come round, the way real ones do.
    const period = (26 + i * 13).toFixed(0);
    planets += `
  <g>
    <animateMotion dur="${period}s" repeatCount="indefinite" calcMode="linear" rotate="0" path="${orbitPath(rx, ry, angles[i % angles.length])}"/>
    <circle cx="0" cy="0" r="16" fill="${b.c}"/>
    <circle cx="0" cy="-4" r="16" fill="#ffffff" opacity="0.10"/>
    ${logoMark(b.slug, 0, 0, 18, b.ink)}
    <text x="0" y="33" text-anchor="middle" font-family="${T.mono}" font-size="11" fill="${T.muted}" stroke="${T.bg}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${esc(b.label)}</text>
  </g>`;
  });

  // Comets: the repositories, newest push first. Each lane cycles through its
  // share of them — one flies in, is named, fades, and the next takes over —
  // so the whole list shows itself a few at a time instead of three fixed names.
  const lanes = [
    { x1: -10, y1: 78, x2: 148, y2: 104, tx: 158, ty: 104, anchor: 'start' },
    { x1: 712, y1: 40, x2: 576, y2: 74, tx: 566, ty: 74, anchor: 'end' },
    { x1: -10, y1: 352, x2: 164, y2: 322, tx: 174, ty: 322, anchor: 'start' },
  ];
  const feed = d.comets.slice(0, 9).map((c) => (typeof c === 'string' ? { name: c } : c));
  const perLane = Math.max(1, Math.ceil(feed.length / lanes.length));
  const FLIGHT = 7;                       // seconds one comet is on screen
  const cycle = (perLane * FLIGHT).toFixed(0);

  const comets = lanes.map((L, li) => {
    const mine = feed.filter((_, i) => i % lanes.length === li);
    if (!mine.length) return '';
    // Travel direction of this lane, as a unit vector, so a streak slides along
    // its own tail instead of drifting sideways.
    const len = Math.hypot(L.x2 - L.x1, L.y2 - L.y1) || 1;
    const ux = (L.x2 - L.x1) / len, uy = (L.y2 - L.y1) / len;
    const at = (k) => `${(ux * k).toFixed(1)},${(uy * k).toFixed(1)}`;

    return mine.map((repo, j) => {
      const n = perLane;
      const t0 = j / n, t1 = (j + 1) / n;
      // One pass through this lane's slot, padded with hidden time either side
      // so the whole lane loops once every `cycle` seconds.
      const keys = [];
      if (t0 > 0) keys.push([0, -40, 0], [t0, -40, 0]);
      else keys.push([0, -40, 0]);
      keys.push([t0 + 0.5 / n, 0, 1], [t0 + 0.85 / n, 20, 0.85]);
      if (t1 < 1) keys.push([t1, 34, 0], [1, 34, 0]);
      else keys.push([1, 34, 0]);
      const keyTimes = keys.map((k) => k[0].toFixed(4)).join(';');
      const shift = keys.map((k) => at(k[1])).join(';');
      const fade = keys.map((k) => k[2]).join(';');
      const meta = [repo.lang, repo.updated].filter(Boolean).join(' \u00b7 ');

      return `
  <g opacity="0">
    <animateTransform attributeName="transform" type="translate" values="${shift}" keyTimes="${keyTimes}" dur="${cycle}s" calcMode="linear" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="${fade}" keyTimes="${keyTimes}" dur="${cycle}s" calcMode="linear" repeatCount="indefinite"/>
    <line x1="${L.x1}" y1="${L.y1}" x2="${L.x2}" y2="${L.y2}" stroke="url(#tail)" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="${L.x2}" cy="${L.y2}" r="3.4" fill="#ffffff"/>
    <text x="${L.tx}" y="${L.ty}" text-anchor="${L.anchor}" font-family="${T.mono}" font-size="11.5" fill="${T.text}" stroke="${T.bg}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${esc(truncate(repo.name, 11.5, 230, 'mono'))}</text>
    <text x="${L.tx}" y="${L.ty + 15}" text-anchor="${L.anchor}" font-family="${T.mono}" font-size="10" fill="${T.faint}" stroke="${T.bg}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${esc(truncate(meta, 10, 230, 'mono'))}</text>
  </g>`;
    }).join('');
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
    ${stars(d.login + 'orbits', W, H, 120, true)}
    ${rings}
    <circle cx="${cx}" cy="${cy}" r="132" fill="url(#glow)">
      <animate attributeName="opacity" values="0.8;1;0.8" dur="7s" repeatCount="indefinite"/>
    </circle>
    <circle cx="${cx}" cy="${cy}" r="42" fill="none" stroke="${T.gold}" stroke-width="1.2" stroke-dasharray="2 9" opacity="0.5">
      <animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="360 ${cx} ${cy}" dur="26s" repeatCount="indefinite"/>
    </circle>
    ${comets}
    ${avatar('sun', cx, cy, 31, d.avatarDataUri, d.initials)}
    ${planets}
    <text x="24" y="30" font-family="${T.mono}" font-weight="700" font-size="11.5" letter-spacing="2.2" fill="${T.muted}">SOLAR SYSTEM &#183; @${esc(d.login.toUpperCase())}</text>
    <text x="24" y="${H - 22}" font-family="${T.mono}" font-size="10.5" fill="${T.faint}">${esc(d.footerMark)}</text>
    <text x="${W - 24}" y="${H - 22}" text-anchor="end" font-family="${T.mono}" font-size="10.5" fill="${T.faint}">planets = the stack &#183; moons = repos &#183; comets = recent pushes</text>
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
      const slug = LANG_LOGO[l.name];
      const fill = Math.max(6, (barW * l.pct) / 100);
      const mark = slug
        ? logoMark(slug, 49.5, y - 1.5, 12.5, ink)
        : `<text x="49.5" y="${y + 2.5}" text-anchor="middle" font-family="${T.mono}" font-weight="700" font-size="${chip.length > 3 ? 7 : 8.5}" fill="${ink}">${esc(chip)}</text>`;
      return `
    <g>
      <rect x="40" y="${y - 11}" width="19" height="19" rx="5" fill="${c}"/>
      ${mark}
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

/* ------------------------------------------------------------------ *
 * 6. STACK — the tools the work is built with, as brand marks
 * ------------------------------------------------------------------ */
export function stack(d) {
  const W = T.W, perRow = 7, r = 25;
  const rows = [];
  for (let i = 0; i < STACK.length; i += perRow) rows.push(STACK.slice(i, i + perRow));
  const rowH = 88, top = 92;
  const H = top + (rows.length - 1) * rowH + 60;
  const gap = (W - 80) / perRow;

  const chips = rows.map((row, ri) => row.map((slug, ci) => {
    const logo = LOGOS[slug];
    // Rows are centred, so a short last row sits under the middle of the strip.
    const x = 40 + gap * (ci + 0.5) + ((perRow - row.length) * gap) / 2;
    const y = top + ri * rowH;
    const n = ri * perRow + ci;
    // Each mark bobs on its own slow cycle, so the strip breathes with the orbits.
    const dur = (4.6 + (n % 4) * 0.8).toFixed(1);
    const begin = ((n % 7) * 0.6).toFixed(1);
    return `
    <g>
      <animateTransform attributeName="transform" type="translate" values="0,0;0,-5;0,0" keyTimes="0;0.5;1" dur="${dur}s" begin="${begin}s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1;0.4 0 0.2 1"/>
      <circle cx="${x.toFixed(1)}" cy="${y}" r="${r}" fill="${logo.c}"/>
      <circle cx="${x.toFixed(1)}" cy="${y - 5}" r="${r}" fill="#ffffff" opacity="0.10"/>
      ${logoMark(slug, x, y, 26, logo.ink)}
      <text x="${x.toFixed(1)}" y="${y + 44}" text-anchor="middle" font-family="${T.mono}" font-size="10.5" fill="${T.muted}">${esc(logo.label)}</text>
    </g>`;
  }).join('')).join('');

  const body = `
  <defs><clipPath id="sframe"><rect width="${W}" height="${H}" rx="${T.radius}"/></clipPath></defs>
  <g clip-path="url(#sframe)">
    ${panel(W, H)}
    ${stars(d.login + 'stack', W, H, 60, true)}
    ${kicker('Stack', 40, 44)}
    ${chips}
  </g>`;
  return svg(W, H, body);
}
