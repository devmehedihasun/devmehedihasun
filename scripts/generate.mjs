#!/usr/bin/env node
// Builds the Solar System README panels as plain SVG files in assets/.
//
//   node scripts/generate.mjs            # live data (needs GITHUB_TOKEN)
//   node scripts/generate.mjs --demo     # fixed sample data, no network
//
// Everything is drawn here. Nothing is fetched from a third-party service at
// view time — the README points at files committed in this repository.

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { orbits, about, moon, planets, orbitLog } from './panels.mjs';

const USER = process.env.GH_USER || 'devmehedihasun';
const TOKEN = process.env.GITHUB_TOKEN || '';
const OUT = new URL('../assets/', import.meta.url);
const DEMO = process.argv.includes('--demo');

// The avatar: where the committed copy lives, the size fetched, and the URL used
// when there is no live user payload to read it from (demo mode).
const AVATAR_FILE = new URL('../assets/avatar.png', import.meta.url);
const AVATAR_PX = 240;
const AVATAR_URL = process.env.AVATAR_URL || 'https://avatars.githubusercontent.com/u/117835267?v=4';

const MOON_CARDS = 2;   // repo cards to render
const COMETS = 9;       // repos that take turns flying through the orbits panel
const WEEKS = 26;       // heatmap width

// Repos excluded from the "moons" (the profile repo itself, forks, archived).
const SKIP = new Set([USER.toLowerCase()]);

/* ----------------------------- fetching ----------------------------- */

const headers = {
  'User-Agent': `${USER}-solar-readme`,
  Accept: 'application/vnd.github+json',
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

async function rest(path) {
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status} ${await res.text()}`);
  return res.json();
}

async function graphql(query, variables) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`graphql -> ${res.status} ${await res.text()}`);
  const json = await res.json();
  if (json.errors) throw new Error(`graphql: ${JSON.stringify(json.errors)}`);
  return json.data;
}

// Inline the avatar as base64 so the SVG carries no external reference — a
// remote <image href> is blocked when GitHub renders the file as an <img>.
// assets/avatar.png is the committed copy and the offline fallback.
async function avatarDataUri(url) {
  const sized = url ? `${url}${url.includes('?') ? '&' : '?'}s=${AVATAR_PX}` : null;
  if (sized) {
    try {
      const res = await fetch(sized, { headers: { 'User-Agent': headers['User-Agent'] } });
      if (res.ok) {
        const bytes = Buffer.from(await res.arrayBuffer());
        const type = res.headers.get('content-type') || 'image/png';
        try { await writeFile(AVATAR_FILE, bytes); } catch { /* read-only checkout */ }
        return `data:${type};base64,${bytes.toString('base64')}`;
      }
    } catch { /* fall through to the committed copy */ }
  }
  try {
    return `data:image/png;base64,${(await readFile(AVATAR_FILE)).toString('base64')}`;
  } catch {
    return null;    // falls back to initials on the gold disc
  }
}

/* ------------------------------ shaping ----------------------------- */

// "7 minutes ago" shortened to what fits beside a comet: 7m, 2d, 3w, 5mo, 1y.
function sinceShort(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '';
  const min = ms / 6e4;
  if (min < 60) return `${Math.max(1, Math.round(min))}m ago`;
  const hr = min / 60;
  if (hr < 24) return `${Math.round(hr)}h ago`;
  const day = hr / 24;
  if (day < 7) return `${Math.round(day)}d ago`;
  if (day < 31) return `${Math.round(day / 7)}w ago`;
  if (day < 365) return `${Math.round(day / 30)}mo ago`;
  return `${Math.round(day / 365)}y ago`;
}

function sharePercents(bytes) {
  const total = Object.values(bytes).reduce((a, b) => a + b, 0);
  if (!total) return [];
  return Object.entries(bytes)
    .map(([name, n]) => ({ name, raw: (n / total) * 100 }))
    .sort((a, b) => b.raw - a.raw)
    .slice(0, 6)
    .map((l) => ({ name: l.name, pct: Math.max(1, Math.round(l.raw)) }));
}

function streaks(days) {
  let longest = 0, run = 0;
  for (const d of days) {
    run = d.count > 0 ? run + 1 : 0;
    if (run > longest) longest = run;
  }
  // Current streak counts back from today; an empty today doesn't break it yet.
  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].count > 0) current++;
    else if (i !== days.length - 1) break;
  }
  return { longest, current };
}

// Map raw counts onto the five-step heat ramp, scaled to this user's own busiest day.
function toWeeks(days, weeks) {
  const tail = days.slice(-weeks * 7);
  const peak = Math.max(1, ...tail.map((d) => d.count));
  const level = (n) => (n === 0 ? 0 : Math.min(4, 1 + Math.floor((n / peak) * 3.999)));
  const cols = [];
  for (let i = 0; i < tail.length; i += 7) cols.push(tail.slice(i, i + 7).map((d) => level(d.count)));
  return cols;
}

async function liveData() {
  const user = await rest(`/users/${USER}`);
  const repos = [];
  for (let page = 1; page <= 4; page++) {
    const batch = await rest(`/users/${USER}/repos?per_page=100&page=${page}&sort=pushed`);
    repos.push(...batch);
    if (batch.length < 100) break;
  }
  const own = repos.filter((r) => !r.fork && !r.archived && !r.private);

  // Language bytes across the 30 most recently pushed repos.
  const bytes = {};
  for (const r of own.slice(0, 30)) {
    try {
      const langs = await rest(`/repos/${USER}/${r.name}/languages`);
      for (const [k, v] of Object.entries(langs)) bytes[k] = (bytes[k] || 0) + v;
    } catch { /* a repo we can't read just doesn't contribute */ }
  }

  // The contribution calendar needs GraphQL. The default Actions token is
  // usually enough; if it is refused, the panel still renders (empty grid)
  // rather than failing the whole build. Add a PAT as SOLAR_TOKEN to fix it.
  let calendar = { totalContributions: 0, weeks: [] };
  try {
    const cal = await graphql(
      `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{
         totalContributions weeks{contributionDays{date contributionCount}}}}}}`,
      { login: USER }
    );
    calendar = cal.user.contributionsCollection.contributionCalendar;
  } catch (err) {
    console.warn(`contribution calendar unavailable (${err.message.slice(0, 120)}) — rendering an empty orbit log`);
  }
  const days = calendar.weeks.length
    ? calendar.weeks.flatMap((w) => w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount })))
    : Array.from({ length: WEEKS * 7 }, () => ({ date: '', count: 0 }));
  const { longest, current } = streaks(days);

  const moons = own
    .filter((r) => !SKIP.has(r.name.toLowerCase()))
    .sort((a, b) => b.stargazers_count - a.stargazers_count || new Date(b.pushed_at) - new Date(a.pushed_at))
    .slice(0, MOON_CARDS)
    .map((r) => ({ name: r.name, description: r.description, stars: r.stargazers_count, forks: r.forks_count, url: r.html_url }));

  return {
    login: user.login,
    name: user.name || user.login,
    bio: user.bio || 'Building things on the web.',
    location: user.location || '',
    followers: user.followers,
    repoCount: user.public_repos,
    stars: own.reduce((a, r) => a + r.stargazers_count, 0),
    avatarDataUri: await avatarDataUri(user.avatar_url),
    initials: (user.name || user.login).split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase(),
    languages: sharePercents(bytes),
    comets: own.slice(0, COMETS).map((r) => ({
      name: r.name,
      lang: r.language || '',
      updated: sinceShort(r.pushed_at),
    })),
    moons,
    weeks: toWeeks(days, WEEKS),
    streak: current,
    longest,
    total: calendar.totalContributions,
    footerMark: process.env.FOOTER_MARK || 'devmh.com',
  };
}

/* ---- demo data: the numbers from the reference, for offline previews ---- */
async function demoData() {
  let s = 7;
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  const weeks = Array.from({ length: WEEKS }, (_, w) =>
    Array.from({ length: 7 }, () => {
      const r = rnd();
      if (w > 20 && r > 0.55) return r > 0.93 ? 4 : 3;
      return r > 0.9 ? 2 : r > 0.84 ? 1 : 0;
    })
  );
  return {
    login: 'devmehedihasun',
    name: 'Mehedi Hasan',
    bio: 'WordPress, HTML5, CSS3, Sass, JavaScript, jQuery, PHP, React, Next.js, Laravel, Bootstrap, Tailwind CSS, Theme Development, and Plugin Development',
    location: 'Dhaka, Bangladesh',
    followers: 3,
    repoCount: 34,
    stars: 0,
    avatarDataUri: await avatarDataUri(AVATAR_URL),
    initials: 'MH',
    languages: [
      { name: 'JavaScript', pct: 40 },
      { name: 'PHP', pct: 38 },
      { name: 'CSS', pct: 12 },
      { name: 'TypeScript', pct: 5 },
      { name: 'HTML', pct: 3 },
    ],
    // The public repositories, newest push first — the same list the live run
    // reads from the API, so an offline render matches what the Action publishes.
    comets: [
      ['devmehedihasun', 'JavaScript', '2026-11-18T06:22:38Z'],
      ['adlibbd', 'JavaScript', '2026-11-09T11:19:59Z'],
      ['ppc-birds', 'HTML', '2026-10-27T17:13:32Z'],
      ['bb-concept-', 'HTML', '2026-10-24T15:51:23Z'],
      ['sohoz-kitchen', 'TypeScript', '2026-10-11T16:44:25Z'],
      ['wpmehedi-portfolio', 'HTML', '2026-08-21T04:48:55Z'],
      ['landing-kits', '', '2026-04-01T06:48:25Z'],
      ['devmh-portfolio', 'CSS', '2025-11-09T16:50:21Z'],
      ['Random-Password-js', 'CSS', '2025-07-01T04:16:01Z'],
    ].map(([name, lang, pushed]) => ({ name, lang, updated: sinceShort(pushed) })),
    moons: [
      { name: 'adlibbd', description: 'adlibbd full website frontend', stars: 0, forks: 0, url: 'https://github.com/devmehedihasun/adlibbd' },
      { name: 'ppc-birds', description: 'ppc bird digital marketing website', stars: 0, forks: 0, url: 'https://github.com/devmehedihasun/ppc-birds' },
    ],
    weeks,
    streak: 0,
    longest: 11,
    total: 159,
    footerMark: 'devmh.com',
  };
}

/* ------------------------------- main ------------------------------- */

const data = DEMO ? await demoData() : await liveData();

await mkdir(OUT, { recursive: true });
const write = (file, body) => writeFile(new URL(file, OUT), body, 'utf8');

await Promise.all([
  write('orbits.svg', orbits(data)),
  write('about.svg', about(data)),
  write('planets.svg', planets(data)),
  write('orbit-log.svg', orbitLog(data)),
  ...data.moons.map((r, i) => write(`moon-${i + 1}.svg`, moon(data, r, i + 1))),
]);

const README = new URL('../README.md', import.meta.url);
try {
  const md = await readFile(README, 'utf8');
  const block = data.moons
    .map((r, i) => `<a href="${r.url || `https://github.com/${data.login}/${r.name}`}"><img width="49%" alt="${r.name}" src="./assets/moon-${i + 1}.svg"></a>`)
    .join(' ');
  const next = md.replace(
    /<!-- moons:start -->[\s\S]*?<!-- moons:end -->/,
    `<!-- moons:start -->
${block}
<!-- moons:end -->`
  );
  if (next !== md) await writeFile(README, next, 'utf8');
} catch { /* no README to update */ }

console.log(
  `wrote ${4 + data.moons.length} panels for @${data.login}` +
  `${DEMO ? ' (demo data)' : ''} — languages: ${data.languages.map((l) => `${l.name} ${l.pct}%`).join(', ')}`
);
