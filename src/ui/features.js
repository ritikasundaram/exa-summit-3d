import { h, logoSVG, escapeHTML } from './dom.js';
import { openModal, closeModal, toast } from './hud.js';
import { state, save, addToBag, visit, leaderboard } from '../state.js';
import { actions } from '../actions.js';
import { AGENDA, ROOMS, SPEAKERS, PLACES } from '../data/agenda.js';
import { DRINKS } from '../data/drinks.js';
import { EVENT } from '../config.js';
import { beep, chime, buzz, shutter, pop } from '../audio.js';
import { drawLogo, LOGO_W, LOGO_H, HOODIE_PATHS } from '../world/logo.js';

const EXA = EVENT.exaLatencyMs;

function check(id, label) {
  if (visit(id)) toast(`✓ Checklist: <b>${label}</b>`, 'good');
}

// ================================================================== SVG art
const LOGO_PTS = `<g>${[
  [[0, 0], [608, 0], [608, 57], [0, 57]],
  [[0, 711], [608, 711], [608, 768], [0, 768]],
  [[0, 0], [68, 0], [68, 768], [0, 768]],
  [[68, 354], [245, 354], [245, 412], [68, 412]],
  [[68, 57], [97, 57], [608, 711], [518, 711], [68, 126]],
  [[68, 711], [97, 711], [608, 57], [518, 57], [68, 642]],
].map((p) => `<polygon points="${p.map((q) => q.join(',')).join(' ')}"/>`).join('')}</g>`;

const ART = {
  hourglass: `<svg viewBox="-80 -40 768 848"><defs><linearGradient id="gl" x1="0" x2="1"><stop offset="0" stop-color="#dfe7ff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity=".5"/></linearGradient></defs>
    <polygon points="120,80 500,80 330,360" fill="url(#gl)" stroke="#c6d0f5" stroke-width="6"/>
    <polygon points="330,410 120,690 520,690" fill="url(#gl)" stroke="#c6d0f5" stroke-width="6"/>
    <polygon points="230,230 420,230 330,360" fill="#2141EA"/>
    <polygon points="170,690 470,690 330,560" fill="#2141EA"/>
    <line x1="330" y1="360" x2="330" y2="600" stroke="#2141EA" stroke-width="5"/>
    <g fill="#ffffff" stroke="#c9cfdf" stroke-width="5">${LOGO_PTS}</g></svg>`,
  goat: `<svg viewBox="0 0 400 300"><g fill="#2141EA">
    <rect x="70" y="140" width="220" height="90" rx="40"/>
    <rect x="95" y="215" width="22" height="55" rx="6"/><rect x="140" y="215" width="22" height="55" rx="6"/>
    <rect x="215" y="215" width="22" height="55" rx="6"/><rect x="255" y="215" width="22" height="55" rx="6"/>
    <path d="M270 160 L300 90 L340 95 L350 130 L320 175 Z"/>
    <rect x="300" y="70" width="70" height="48" rx="20"/>
    <rect x="110" y="95" width="70" height="80" rx="10"/>
    <path d="M60 150 L40 125 L70 140Z"/></g>
    <path d="M318 74 Q300 30 270 40" stroke="#0D1330" stroke-width="9" fill="none" stroke-linecap="round"/>
    <path d="M336 72 Q330 28 300 30" stroke="#0D1330" stroke-width="9" fill="none" stroke-linecap="round"/>
    <path d="M362 115 L372 150 L352 120Z" fill="#fff"/>
    <circle cx="345" cy="88" r="5" fill="#fff"/>
    <ellipse cx="145" cy="98" rx="30" ry="9" fill="#0D1330"/>
    <rect x="128" y="20" width="10" height="85" rx="4" fill="#0D1330" transform="rotate(-10 133 60)"/>
    <rect x="145" y="12" width="10" height="90" rx="4" fill="#fff" stroke="#0D1330" stroke-width="3"/>
    <rect x="162" y="24" width="10" height="80" rx="4" fill="#8ea0ff" transform="rotate(12 167 60)"/></svg>`,
  hoodie: (() => {
    const P = HOODIE_PATHS;
    return `<svg viewBox="30 0 340 410"><defs>
      <linearGradient id="hb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d4ff5"/><stop offset="1" stop-color="#1834c9"/></linearGradient>
      <linearGradient id="hs" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1630b8"/><stop offset=".6" stop-color="#2442e6"/><stop offset="1" stop-color="#1630b8"/></linearGradient>
      <pattern id="rb" width="6" height="10" patternUnits="userSpaceOnUse"><rect width="6" height="10" fill="#1b36cf"/><rect width="2" height="10" fill="#132a9f"/></pattern>
      <radialGradient id="sh" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".22"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>
      <ellipse cx="200" cy="392" rx="150" ry="14" fill="url(#sh)"/>
      <path d="${P.hood}" fill="#1630b8"/>
      <path d="${P.sleeveL}" fill="url(#hs)"/><path d="${P.sleeveR}" fill="url(#hs)"/>
      <path d="${P.cuffL}" fill="url(#rb)"/><path d="${P.cuffR}" fill="url(#rb)"/>
      <path d="${P.body}" fill="url(#hb)"/>
      <path d="${P.foldL}" stroke="#0f2287" stroke-opacity=".25" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="${P.foldR}" stroke="#0f2287" stroke-opacity=".25" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="${P.band}" fill="url(#rb)"/>
      <path d="${P.pocket}" fill="#2140de" stroke="#142a9e" stroke-width="2" stroke-dasharray="4 3"/>
      <path d="${P.pocketL}" stroke="#0d1f80" stroke-width="5" fill="none"/><path d="${P.pocketR}" stroke="#0d1f80" stroke-width="5" fill="none"/>
      <path d="${P.neck}" fill="#0b1863"/>
      <path d="${P.rim}" stroke="url(#rb)" stroke-width="14" fill="none" stroke-linecap="round"/>
      <path d="${P.stringL}" stroke="#f4f4f4" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="${P.stringR}" stroke="#f4f4f4" stroke-width="4" fill="none" stroke-linecap="round"/>
      <rect x="176" y="190" width="7" height="14" rx="2" fill="#c9ced8"/><rect x="218" y="194" width="7" height="14" rx="2" fill="#c9ced8"/>
      <g transform="translate(186 150) scale(0.046)" fill="#fff">${LOGO_PTS}</g></svg>`;
  })(),
  cookie: `<svg viewBox="-60 -60 728 888"><g fill="#DCAE6C" stroke="#C99550" stroke-width="40" stroke-linejoin="round">${LOGO_PTS}</g>
    <g fill="none" stroke="#2141EA" stroke-width="16" stroke-linejoin="round" transform="translate(20 20) scale(0.935)">${LOGO_PTS}</g>
    <g fill="#fff" opacity=".9"><circle cx="30" cy="200" r="7"/><circle cx="300" cy="28" r="7"/><circle cx="34" cy="560" r="7"/><circle cx="460" cy="740" r="7"/></g></svg>`,
};

// ================================================================== Badge (reception)
actions.badge = () => {
  const roles = ['Builder', 'Founder', 'Researcher', 'Engineer', 'PM', 'Investor', 'Goat enthusiast'];
  const preview = h('div.badge-card');
  const input = h('input.text', { placeholder: 'Your name', maxlength: 24, value: state.name || '' });
  let role = state.role || 'Builder';
  const draw = () => {
    preview.innerHTML = `<div class="bc-top">${logoSVG('#fff', 26)}<span>${EVENT.name} ${EVENT.year}</span></div>
      <div class="bc-name">${escapeHTML(input.value || 'Your name')}</div>
      <div class="bc-role">${escapeHTML(role)}</div>
      <div class="bc-foot"><span>Shack15 · SF</span><span class="bc-tag">ATTENDEE</span></div>`;
  };
  input.addEventListener('input', draw);
  const chips = h('div.chips', {}, roles.map((r) => {
    const c = h(`button.chip${r === role ? '.on' : ''}`, { onclick: () => { role = r; chips.querySelectorAll('.chip').forEach((x) => x.classList.toggle('on', x === c)); draw(); } }, r);
    return c;
  }));
  draw();
  const body = h('div.badge', {},
    h('div.badge-left', {},
      h('p', {}, 'Welcome to Shack15! Your name shows up on the reaction-game leaderboard and on your goat photo.'),
      h('label', {}, 'Name'), input,
      h('label', {}, 'I am a…'), chips,
      h('button.btn.primary', { onclick: () => {
        state.name = (input.value || '').trim().slice(0, 24) || 'Guest';
        state.role = role;
        if (!state.bag.badge) state.bag.badge = 1;
        save();
        check('badge', 'Pick up your badge');
        closeModal();
        toast(`Badge printed for <b>${escapeHTML(state.name)}</b>. Head to the Swag Bar on your left →`);
      } }, 'Print my badge'),
    ),
    preview,
  );
  openModal({ title: 'Reception', kicker: 'Badge pickup', body, wide: true });
  setTimeout(() => input.focus(), 50);
};

// ================================================================== Swag
actions.swag = () => {
  const items = [
    { id: 'hourglass', title: 'The Exa hourglass', desc: 'A desk timer framed by the Exa mark: white frame, glass bulbs, Exa-blue sand. Every grain is one search.', art: ART.hourglass },
    { id: 'goatpen', title: 'The GOAT pen holder', desc: 'Greatest Of All Tools. A little blue goat that keeps your pens in its back. Pairs with the petting zoo outside.', art: ART.goat },
    { id: 'hoodie', title: 'The Exa hoodie', desc: 'Exa blue, white mark on the chest. Not for sale: beat Exa’s 200ms (best of 3) at "Are you exa-ordinary?" to earn one.', art: ART.hoodie, locked: true },
  ];
  const body = h('div.swag', {}, items.map((it) => {
    const owned = state.bag[it.id] || 0;
    const locked = it.locked && !state.wonHoodie;
    const btn = h(`button.btn${locked ? '.ghost' : '.primary'}`, {
      disabled: locked || (it.id === 'hoodie' && owned > 0) || owned >= 2,
      onclick: () => {
        addToBag(it.id);
        pop();
        check('swag', 'Grab swag');
        toast(`Added <b>${it.title}</b> to your bag`);
        closeModal();
        actions.swag();
      },
    }, locked ? '🔒 Win it at the reaction game' : owned >= (it.id === 'hoodie' ? 1 : 2) ? 'Limit reached' : owned ? 'Take another' : 'Take one');
    return h('div.swag-card', {}, h('div.swag-art', { html: it.art }), h('h3', {}, it.title), h('p', {}, it.desc), owned ? h('div.owned', {}, `In your bag: ${owned}`) : null, btn);
  }));
  openModal({ title: 'The Swag Bar', kicker: 'The Lounge', body, wide: true });
};

// ================================================================== Café
actions.cafe = () => {
  const menu = [
    ['Exa logo sugar cookies', 'Vanilla sugar cookie cut in the Exa mark, blue royal-icing outline', true],
    ['Latent Latte', 'Double shot, oat milk, a little foam embedding'],
    ['Crawl-ssant', 'Butter croissant that indexes every layer'],
    ['Semantic Sourdough', 'Avocado toast, chili crisp, meaning-first ranking'],
    ['Websets Wrap', 'Grilled veggies, hummus, enriched with feta'],
    ['Neural Matcha', 'Ceremonial matcha, cold, very fast'],
    ['Still & sparkling water', 'Self-serve at the coffee desk, with citrus'],
  ];
  const n = state.bag.cookie || 0;
  const body = h('div.cafe', {},
    h('div.cafe-hero', {},
      h('div.cookie-art', { html: ART.cookie }),
      h('div', {},
        h('h3', {}, 'The Exa cookie'),
        h('p', {}, 'Baked in the shape of the Exa mark: vanilla sugar cookie, Exa-blue icing outline, a few white sprinkles. Displayed on tiered stands at the café island and in jars on the bar.'),
        h('button.btn.primary', { onclick: (e) => {
          addToBag('cookie');
          pop();
          check('cookies', 'Eat an Exa cookie');
          const lines = ['Crunch. Tastes like low latency.', 'Surprisingly well-indexed.', 'Top result for "best cookie".', 'Highly relevant excerpt.'];
          toast(`🍪 ${lines[Math.floor(Math.random() * lines.length)]}`);
          e.target.textContent = `Take another (${(state.bag.cookie || 0)} eaten)`;
        } }, n ? `Take another (${n} eaten)` : 'Take a cookie'),
      ),
    ),
    h('h4', {}, 'Menu'),
    h('ul.menu', {}, menu.map(([a, b, star]) => h('li', {}, h('b', {}, a, star ? h('span.star', {}, ' ★ signature') : null), h('span', {}, b)))),
  );
  openModal({ title: 'The Highlights Café', kicker: 'The Library · Food & drinks', body, wide: true });
};

// ================================================================== Reaction game
actions.reaction = () => {
  let phase = 'intro';
  let tries = [];
  let goAt = 0;
  let timer = null;
  const pad = h('div.rx-pad');
  const results = h('div.rx-results');
  const board = h('div.rx-board');
  const after = h('div.rx-after');

  const renderTries = () => {
    results.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const v = tries[i];
      results.append(h(`div.rx-try${v ? (v < EXA ? '.win' : '.lose') : ''}`, {}, h('span', {}, `Try ${i + 1}`), h('b', {}, v ? `${Math.round(v)}ms` : '—')));
    }
  };
  const renderBoard = () => {
    const rows = leaderboard().slice(0, 6);
    board.innerHTML = '';
    board.append(h('h4', {}, "Today's fastest humans"));
    board.append(h('div.rx-row.exa', {}, h('span', { html: `${logoSVG('#2141EA', 13)} Exa search` }), h('b', {}, `${EXA}ms`)));
    rows.forEach((r, i) => board.append(h(`div.rx-row${r.you ? '.you' : ''}`, {}, h('span', {}, `${i + 1}. ${r.name}${r.you ? ' (you)' : ''}`), h('b', {}, `${Math.round(r.best)}ms`))));
  };
  const setPad = (cls, html) => {
    pad.className = 'rx-pad ' + cls;
    pad.innerHTML = html;
  };
  const arm = () => {
    phase = 'wait';
    setPad('wait', `<div class="rx-big">Wait for blue…</div><div class="rx-small">Try ${tries.length + 1} of 3</div>`);
    clearTimeout(timer);
    timer = setTimeout(() => {
      phase = 'go';
      setPad('go', `<div class="rx-big">CLICK!</div>`);
      goAt = performance.now();
    }, 1200 + Math.random() * 2600);
  };
  const finish = () => {
    phase = 'done';
    const best = Math.min(...tries);
    const bestIdx = tries.indexOf(best);
    const won = best < EXA;
    const name = state.name || 'Guest';
    state.reactionRuns = state.reactionRuns.map((r) => ({ name: r.name, best: r.best ?? r.avg }));
    state.reactionRuns.push({ name, best: Math.round(best) });
    state.reactionRuns.sort((a, b) => a.best - b.best);
    state.reactionRuns = state.reactionRuns.slice(0, 5);
    if (won) state.wonHoodie = true;
    save();
    check('reaction', 'Are you exa-ordinary?');
    actions.refreshKiosk?.();
    renderBoard();
    const diff = Math.round(best - EXA);
    results.querySelectorAll('.rx-try')[bestIdx]?.classList.add('best');
    setPad(won ? 'won' : 'result', won
      ? `<div class="rx-small">Your best of 3</div><div class="rx-huge">${Math.round(best)}ms</div><div class="rx-big">You're exa-ordinary! 🎉</div>`
      : `<div class="rx-small">Your best of 3</div><div class="rx-huge">${Math.round(best)}ms</div><div class="rx-big">Exa was ${diff}ms faster</div>`);
    // race bars
    const max = Math.max(best, EXA) * 1.1;
    after.innerHTML = '';
    const race = h('div.race', {},
      h('div.lane', {}, h('span', {}, 'You'), h('div.track', {}, h('i.you', { style: { '--w': `${(best / max) * 100}%`, '--d': `${best * 6}ms` } })), h('b', {}, `${Math.round(best)}ms`)),
      h('div.lane', {}, h('span', { html: `${logoSVG('#2141EA', 12)} Exa` }), h('div.track', {}, h('i.exa', { style: { '--w': `${(EXA / max) * 100}%`, '--d': `${EXA * 6}ms` } })), h('b', {}, `${EXA}ms`)),
      h('div.race-note', {}, 'Replayed at 6× slow motion'),
    );
    after.append(race);
    if (won) {
      chime();
      confetti(pad);
      after.append(h('div.win-box', {},
        h('div', { html: ART.hoodie }),
        h('div', {}, h('b', {}, 'You beat Exa. The hoodie is yours.'), h('p', {}, 'Show this screen at the Swag Bar, or claim it right here.'),
          h('button.btn.primary', { disabled: !!state.bag.hoodie, onclick: (e) => { addToBag('hoodie'); e.target.disabled = true; e.target.textContent = 'Hoodie in your bag 🧥'; toast('🧥 <b>Exa hoodie</b> added to your bag'); } }, state.bag.hoodie ? 'Hoodie in your bag 🧥' : 'Claim my Exa hoodie')),
      ));
    } else {
      buzz();
      const quips = best < 220 ? 'So close. That is genuinely fast for a human.' : best < 270 ? 'Solidly human. Exa is not.' : 'Exa searched the web a few times while you blinked.';
      after.append(h('p.rx-quip', {}, `${quips} Any try under ${EXA}ms wins an Exa hoodie.`));
    }
    after.append(h('button.btn.primary', { onclick: () => { tries = []; renderTries(); after.innerHTML = ''; arm(); } }, 'Play again'));
  };
  const press = () => {
    if (phase === 'intro' || phase === 'between') {
      arm();
    } else if (phase === 'wait') {
      clearTimeout(timer);
      buzz();
      phase = 'between';
      setPad('early', `<div class="rx-big">Too soon!</div><div class="rx-small">That one doesn't count. Click to retry.</div>`);
    } else if (phase === 'go') {
      const rt = performance.now() - goAt;
      tries.push(rt);
      renderTries();
      beep(rt < EXA ? 1320 : 660, 0.08);
      if (tries.length >= 3) finish();
      else {
        phase = 'between';
        setPad(rt < EXA ? 'won-mini' : 'between', `<div class="rx-huge">${Math.round(rt)}ms</div><div class="rx-small">${rt < EXA ? 'Faster than Exa!' : `Exa: ${EXA}ms`} · click for try ${tries.length + 1}</div>`);
      }
    }
  };
  pad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    press();
  });
  const key = (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      if (!e.repeat) press();
    }
  };
  addEventListener('keydown', key);
  setPad('intro', `<div class="rx-big">Click to start</div><div class="rx-small">When the panel turns blue, click (or press Space) as fast as you can. 3 tries, your best one counts.</div>`);
  renderTries();
  renderBoard();
  const body = h('div.rx', {},
    h('div.rx-main', {},
      h('p.rx-lead', { html: `Exa returns search results in about <b>${EXA}ms</b>. Can your reflexes keep up? You get 3 tries; if your <b>best</b> beats ${EXA}ms you win an <b>Exa hoodie</b>.` }),
      pad, results, after,
    ),
    board,
  );
  openModal({ title: 'Are you exa-ordinary?', kicker: 'Kilden · Finstua · Reaction game', body, wide: true, className: 'rx-modal', onClose: () => { clearTimeout(timer); removeEventListener('keydown', key); } });
};

function confetti(el) {
  const colors = ['#2141EA', '#ffffff', '#8ea0ff', '#7CFFB2', '#0D1330'];
  for (let i = 0; i < 80; i++) {
    const c = h('i.confetti', { style: { left: `${Math.random() * 100}%`, background: colors[i % colors.length], animationDelay: `${Math.random() * 0.4}s`, '--x': `${(Math.random() - 0.5) * 200}px`, '--r': `${Math.random() * 720}deg` } });
    el.append(c);
    setTimeout(() => c.remove(), 2200);
  }
}

// ================================================================== Summit MCP
const SYN = {
  gtm: ['gtm', 'sales', 'leads', 'enrichment'],
  sales: ['sales', 'gtm', 'leads'],
  lead: ['leads', 'gtm', 'prospect'],
  leads: ['leads', 'gtm', 'prospect'],
  enrichment: ['enrichment', 'company data', 'people data'],
  coding: ['coding', 'code', 'devin'],
  code: ['code', 'coding', 'code review'],
  finance: ['finance', 'fintech'],
  privacy: ['privacy', 'zero data retention', 'trust'],
  research: ['research', 'papers', 'websets'],
  eval: ['evals', 'evaluation', 'benchmarks', 'metrics', 'quality', 'rag'],
  evals: ['evals', 'evaluation', 'benchmarks', 'metrics', 'quality', 'rag'],
  evaluation: ['evals', 'benchmarks'],
  rag: ['rag', 'retrieval', 'embeddings'],
  retrieval: ['retrieval', 'rag'],
  agent: ['agents', 'mcp', 'tools'],
  agents: ['agents', 'mcp', 'tools'],
  agentic: ['agents'],
  mcp: ['mcp', 'agents', 'tools'],
  goat: ['goats', 'petting', 'zoo'],
  goats: ['goats', 'petting', 'zoo'],
  pet: ['goats', 'petting'],
  drink: ['drinks', 'cocktails', 'bar'],
  drinks: ['drinks', 'cocktails', 'bar'],
  cocktail: ['cocktails', 'drinks'],
  party: ['party', 'drinks', 'music'],
  food: ['food', 'lunch', 'breakfast', 'cookies'],
  eat: ['food', 'lunch', 'cookies'],
  hungry: ['food', 'lunch', 'cookies'],
  cookie: ['cookies', 'food'],
  cookies: ['cookies', 'food'],
  coffee: ['coffee', 'breakfast'],
  lunch: ['lunch', 'food'],
  fast: ['latency', 'speed', 'performance'],
  speed: ['latency', 'speed'],
  latency: ['latency', 'speed', 'performance'],
  hoodie: ['hoodie', 'prize', 'reaction'],
  game: ['game', 'reaction'],
  reaction: ['reaction', 'game'],
  websets: ['websets', 'data', 'enrichment'],
  data: ['data', 'websets'],
  embeddings: ['embeddings', 'neural', 'vector'],
  neural: ['neural', 'embeddings'],
  vector: ['vector', 'embeddings'],
  workshop: ['workshop', 'hands-on', 'build'],
  'hands-on': ['workshop'],
  laptop: ['workshop', 'hands-on'],
  founders: ['founders', 'keynote', 'fireside'],
  keynote: ['keynote'],
  future: ['future', 'vision'],
  demo: ['demos', 'lightning'],
  demos: ['demos', 'lightning'],
  photo: ['photos', 'party'],
  photos: ['photos', 'party'],
  swag: ['swag', 'hoodie'],
  badge: ['badge', 'registration'],
};
const STOP = new Set('a an the is are of for to in on at and or what which when where who whom should i me my do does about with if care into any some there that this get can talk talks session sessions see go find show tell want interested like good best anything something speaking speaks today please'.split(' '));
const TIME_PHRASES = /\b(after lunch|before lunch|afternoon|morning|tonight|this evening|evening|after ?party)\b/g;
const toMin = (t) => {
  const [hh, mm] = t.split(':').map(Number);
  return (hh < 8 ? hh + 12 : hh) * 60 + mm;
};

function searchSessions(q) {
  const ql = q.toLowerCase();
  const words = ql
    .replace(TIME_PHRASES, (m) => (/party/.test(m) ? ' party ' : ' '))
    .replace(/[^a-z0-9\- ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w));
  const terms = new Set();
  for (const w of words) {
    terms.add(w.replace(/s$/, ''));
    terms.add(w);
    (SYN[w] || []).forEach((s) => terms.add(s));
  }
  let filter = null;
  if (/after lunch|afternoon/.test(ql)) filter = { from: toMin('13:00'), label: 'after 13:00' };
  else if (/morning|before lunch/.test(ql)) filter = { to: toMin('12:15'), label: 'before 12:15' };
  else if (/tonight|evening|after party|afterparty/.test(ql)) filter = { from: toMin('17:00'), label: 'from 17:00' };
  const scored = AGENDA.map((s) => {
    let score = 0;
    const hits = new Set();
    for (const t of terms) {
      if (t.length < 3) continue;
      if (s.tags.some((g) => g.startsWith(t))) (score += 3), hits.add(t);
      if (s.title.toLowerCase().includes(t)) (score += 2), hits.add(t);
      if (s.blurb.toLowerCase().includes(t)) (score += 1), hits.add(t);
      if ((s.speaker + ' ' + s.room).toLowerCase().includes(t)) (score += 1), hits.add(t);
    }
    const m = toMin(s.time);
    if (filter && ((filter.from && m < filter.from) || (filter.to && m >= filter.to))) score = 0;
    return { s, score, hits: [...hits] };
  })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || toMin(a.s.time) - toMin(b.s.time));
  return { results: scored.slice(0, 3), total: scored.length, terms: [...terms].filter((t) => t.length > 2).slice(0, 6), filter, words };
}

function highlight(text, hits) {
  let out = escapeHTML(text);
  for (const t of hits) out = out.replace(new RegExp(`(${t.replace(/[^a-z0-9]/gi, '')}\\w*)`, 'ig'), '<mark>$1</mark>');
  return out;
}

// ---------- Summit MCP: route a question to the right tool ----------
const esc = escapeHTML;
const byId = (id) => AGENDA.find((x) => x.id === id);
const endMin = (s) => toMin(s.end);
function sessionCard(sx, hits = []) {
  return h('div.result', {},
    h('div.r-top', {}, h('span.r-time', {}, `${sx.time}–${sx.end}`), h('span.r-track', {}, sx.track)),
    h('div.r-title', { html: highlight(sx.title, hits) }),
    h('div.r-meta', {}, `${sx.room} · ${sx.speaker}`),
    h('div.r-hl', { html: highlight(sx.blurb, hits) }),
    h('div.r-url', {}, `summit.exa.ai/sessions/${sx.id}`),
  );
}
const isGuest = (p) => p.company !== 'Exa';

function routeQuestion(q) {
  const ql = q.toLowerCase().replace(/[‘’]/g, "'");
  const has = (k) => new RegExp(`(^|[^a-z0-9])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`).test(ql);
  const sr = searchSessions(q);
  const topScore = sr.results[0]?.score || 0;

  // 1. a specific speaker or company
  const named = SPEAKERS.filter((p) => p.keys.some(has));
  if (named.length && !/\b(agenda|schedule)\b/.test(ql)) {
    const sessions = [...new Set(named.flatMap((p) => p.sessions))].map(byId).filter(Boolean);
    const lines = named.map((p) => {
      const talks = p.sessions.map(byId).filter(Boolean).map((x) => `<b>${esc(x.title)}</b> at ${x.time} in ${esc(x.room)}`).join(', and ');
      return `<li><b>${esc(p.name)}</b>${p.company !== 'Exa' ? `, ${esc(p.role)} at ${esc(p.company)}` : ''}: ${talks}</li>`;
    });
    return { tool: 'find_speaker', args: { name: named.map((p) => p.name) }, status: `${named.length} speaker${named.length > 1 ? 's' : ''} found`, cards: sessions.map((x) => sessionCard(x)), answer: `<ul class="ans-list">${lines.join('')}</ul>` };
  }

  // 2. what's on now / next (uses your clock as the event-day clock)
  if (/\b(now|next|right now|currently|at the moment|up next)\b/.test(ql) && !/\bagenda\b/.test(ql)) {
    const d = new Date();
    const now = d.getHours() * 60 + d.getMinutes();
    const clock = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const live = AGENDA.filter((x) => toMin(x.time) <= now && now < endMin(x));
    const nextStart = AGENDA.map((x) => toMin(x.time)).filter((m) => m > now).sort((a, b) => a - b)[0];
    const next = AGENDA.filter((x) => toMin(x.time) === nextStart);
    let answer;
    if (now < toMin('8:30')) answer = `It's ${clock}. Doors open at <b>8:30</b> with badges and Exa cookies; the keynote starts at 9:30.`;
    else if (now >= toMin('21:00')) answer = `It's ${clock}, so the summit has wrapped. The day ran 8:30–21:00, ending with the after party on the Bay Terrace.`;
    else {
      answer = live.length ? `It's ${clock}. <b>Happening now:</b> ${live.map((x) => `${esc(x.title)} (${esc(x.room)}, until ${x.end})`).join('; ')}.` : `It's ${clock}, between sessions.`;
      if (next.length) answer += ` <b>Up next at ${next[0].time}:</b> ${next.map((x) => `${esc(x.title)} in ${esc(x.room)}`).join('; ')}.`;
    }
    return { tool: 'whats_on', args: { at: clock }, status: `${live.length} live · ${next.length} up next`, cards: [...live, ...next].map((x) => sessionCard(x)), answer: answer + ' <span class="ans-note">(Using your clock as the event clock.)</span>' };
  }

  // 3. counts
  if (/how many/.test(ql)) {
    const guests = SPEAKERS.filter(isGuest).length;
    const by = (t) => AGENDA.filter((x) => x.track === t).length;
    return { tool: 'get_agenda', args: { summary: true }, status: `${AGENDA.length} sessions`, answer: `There are <b>${AGENDA.length} sessions</b> from 8:30 to 21:00: ${by('Main stage')} on the main stage, ${by('Workshop')} workshops, ${by('Hallway')} hallway moments and the after party. <b>${guests} guest speakers</b> join the Exa team.` };
  }

  // 4. the speaker lineup
  if ((/\b(speakers?|lineup|line-up|presenters?|panelists?)\b/.test(ql) || /\bwho\b/.test(ql)) && topScore < 3) {
    const guests = SPEAKERS.filter(isGuest);
    const items = guests.map((p) => {
      const x = byId(p.sessions[0]);
      return `<li><b>${esc(p.name)}</b> · ${esc(p.role)}, ${esc(p.company)}<span>${esc(x.title)} · ${x.time}</span></li>`;
    });
    return { tool: 'list_speakers', args: { include: 'all' }, status: `${guests.length} guest speakers + Exa team`, answer: `Here's the lineup: <b>${guests.length} guest speakers</b> plus the Exa founders (opening keynote and closing fireside) and Exa developer relations (MCP workshop).<ul class="ans-list">${items.join('')}</ul><span class="ans-note">Proposed lineup drawn from Exa customer stories.</span>` };
  }

  // 5. the agenda (optionally by track or time of day)
  const GENERIC = new Set(['workshops', 'workshop', 'sessions', 'panels', 'main', 'stage', 'list', 'all', 'happening', 'agenda', 'schedule', 'program', 'programme', 'day', 'full', 'events', 'keynotes']);
  const contentWords = sr.words.filter((w) => !GENERIC.has(w));
  if (/\b(agenda|schedule|program|programme|timetable|itinerary|run of show|what's on|whats on|what is on|all (the )?(talks|sessions))\b/.test(ql) || (/\b(workshops|talks|sessions|panels|keynotes)\b/.test(ql) && contentWords.length === 0)) {
    let list = AGENDA;
    const args = {};
    if (/workshop/.test(ql)) (list = list.filter((x) => x.track === 'Workshop')), (args.track = 'Workshop');
    else if (/main stage|keynotes?|talks on stage/.test(ql)) (list = list.filter((x) => x.track === 'Main stage')), (args.track = 'Main stage');
    else if (/after ?party|tonight|evening/.test(ql)) (list = list.filter((x) => toMin(x.time) >= toMin('17:00'))), (args.from = '17:00');
    if (/morning|before lunch/.test(ql)) (list = list.filter((x) => toMin(x.time) < toMin('12:30'))), (args.before = '12:30');
    else if (/afternoon|after lunch/.test(ql)) (list = list.filter((x) => toMin(x.time) >= toMin('12:30'))), (args.from = '12:30');
    const items = list.map((x) => `<li><b>${x.time}</b> ${esc(x.title)}<span>${esc(x.speaker)} · ${esc(x.room)}</span></li>`);
    const label = args.track ? `${args.track.toLowerCase()} sessions` : 'sessions';
    return { tool: 'get_agenda', args: Object.keys(args).length ? args : { day: 'full' }, status: `${list.length} ${label}`, answer: `${list.length} ${label}${list.length ? `, ${list[0].time}–${list[list.length - 1].end}` : ''}:<ol class="ans-list">${items.join('')}</ol>` };
  }

  // 6. where is X
  const place = PLACES.find((p) => p.keys.some(has));
  if (place && (/\b(where|find|get|location|how do i|go for|grab)\b/.test(ql) || topScore < 3)) {
    return { tool: 'where_is', args: { place: place.name }, status: '1 place found', answer: `<b>${esc(place.name)}</b>: ${esc(place.where)}.` };
  }
  if (/\b(rooms?|venue|map|floor ?plan|layout)\b/.test(ql)) {
    return { tool: 'where_is', args: { place: 'all rooms' }, status: `${ROOMS.length} rooms`, answer: `Shack15, from Reception at the west end to the Bay Terrace outside:<ul class="ans-list">${ROOMS.map((r) => `<li><b>${esc(r.name)}</b><span>${esc(r.note)}</span></li>`).join('')}</ul>` };
  }

  // 7. semantic session search
  const { results, total, filter } = sr;
  let answer;
  if (!results.length) answer = `I couldn't find a session for that. Try "Who are the speakers?", "What is the agenda?", or ask about evals, agents, Websets, coffee, demos or the goats.`;
  else {
    const top = results[0].s;
    if (/where/.test(ql)) answer = `Head to <b>${esc(top.room)}</b>. "${esc(top.title)}" runs ${top.time}–${top.end}.`;
    else if (/who/.test(ql)) answer = `<b>${esc(top.title)}</b> is presented by <b>${esc(top.speaker)}</b>, ${top.time} in ${esc(top.room)}.`;
    else answer = `Best match: <b>${esc(top.title)}</b> at ${top.time} in ${esc(top.room)}.${results.length > 1 ? ` Also worth a look: ${results.slice(1).map((r) => `<b>${esc(r.s.title)}</b> (${r.s.time})`).join(' and ')}.` : ''}`;
  }
  return { tool: 'search_sessions', args: { query: q, ...(filter ? { time: filter.label } : {}), num_results: 3 }, status: `${total} match${total === 1 ? '' : 'es'} · ${AGENDA.length} sessions searched`, cards: results.map(({ s: sx, hits }) => sessionCard(sx, hits)), answer };
}

actions.mcp = (prefill) => {
  const log = h('div.mcp-log');
  const input = h('input.text', { placeholder: 'Ask your agent about the summit…', value: prefill || '' });
  const suggestions = ['Who are the speakers?', 'What is the agenda?', 'What\u2019s happening now?', 'What workshops are there?', 'Who from Cognition is speaking?', 'Where can I get coffee?', 'Where can I pet goats?', 'What should I see after lunch if I care about evals?', 'How many talks are there?'];
  const ask = (q) => {
    q = (q || input.value).trim();
    if (!q) return;
    input.value = '';
    check('mcp', 'Ask the Summit MCP');
    log.append(h('div.msg.user', {}, q));
    const r = routeQuestion(q);
    const ms = 140 + Math.round(Math.random() * 55);
    const call = h('div.msg.tool', { html: `<span class="tool-name">exa-summit · ${r.tool}</span><code>${escapeHTML(JSON.stringify(r.args))}</code><span class="spin"></span>` });
    log.append(call);
    log.scrollTop = log.scrollHeight;
    setTimeout(() => {
      call.querySelector('.spin').outerHTML = `<span class="lat">${escapeHTML(r.status)} · ${ms}ms</span>`;
      if (r.cards?.length) log.append(h('div.results', {}, r.cards));
      log.append(h('div.msg.agent', { html: r.answer }));
      log.scrollTop = log.scrollHeight;
      beep(990, 0.05);
    }, ms);
  };
  input.addEventListener('keydown', (e) => e.key === 'Enter' && ask());
  const body = h('div.mcp', {},
    h('div.mcp-left', {},
      h('p', {}, 'The Summit MCP gives any agent (Claude, Cursor, your own) the conference as a set of tools. It searches sessions, speakers and rooms by meaning, the way Exa searches the web.'),
      h('div.code', { html: `<span class="c-dim">$</span> claude mcp add exa-summit \\<br>&nbsp;&nbsp;--transport http https://summit.exa.ai/mcp` }),
      h('h4', {}, 'Tools'),
      h('ul.tools', { html: `<li><code>search_sessions</code> semantic search over talks</li><li><code>list_speakers</code> the full speaker lineup</li><li><code>find_speaker</code> who, which talk, when, where</li><li><code>get_agenda</code> full day, by track or time</li><li><code>whats_on</code> what is happening now and next</li><li><code>where_is</code> rooms, coffee, demos, swag, goats</li>` }),
      h('div.rooms', {}, ROOMS.map((r) => h('div', {}, h('b', {}, r.name), ' ', r.note))),
    ),
    h('div.mcp-right', {},
      h('div.mcp-chat-head', { html: `${logoSVG('#2141EA', 14)} <b>Agent</b> <span>connected to exa-summit</span>` }),
      log,
      h('div.sugs', {}, suggestions.map((s) => h('button.chip', { onclick: () => ask(s) }, s))),
      h('div.mcp-input', {}, input, h('button.btn.primary', { onclick: () => ask() }, 'Ask')),
    ),
  );
  log.append(h('div.msg.agent', {}, "Hi! I'm connected to the Exa Summit MCP. Ask me who the speakers are, what's on the agenda, what's happening now, or where to find coffee, demos, swag and the goats."));
  openModal({ title: 'The Summit MCP', kicker: 'Concept · search the conference like Exa searches the web', body, wide: true, className: 'mcp-modal' });
  setTimeout(() => input.focus(), 50);
  if (prefill) ask(prefill);
};

// ================================================================== Agenda + Stage
actions.agenda = (track = 'All') => {
  const tracks = ['All', 'Main stage', 'Workshop', 'Hallway', 'After party'];
  const list = h('div.agenda-list');
  const render = (t) => {
    list.innerHTML = '';
    AGENDA.filter((s) => t === 'All' || s.track === t).forEach((s) =>
      list.append(h('div.ag-item', {},
        h('div.ag-time', {}, s.time, h('small', {}, s.end)),
        h('div', {}, h('div.ag-title', {}, s.title), h('div.ag-meta', {}, `${s.room} · ${s.speaker}`), h('div.ag-blurb', {}, s.blurb)),
        h('span.ag-track', {}, s.track),
      )),
    );
  };
  const chips = h('div.chips', {}, tracks.map((t) => {
    const c = h(`button.chip${t === track ? '.on' : ''}`, { onclick: () => { chips.querySelectorAll('.chip').forEach((x) => x.classList.toggle('on', x === c)); render(t); } }, t);
    return c;
  }));
  render(track);
  const body = h('div.agenda', {}, h('div.agenda-top', {}, chips, h('button.btn.ghost.small', { onclick: () => { closeModal(true); actions.mcp(); } }, 'Ask the Summit MCP →')), list, h('p.note', {}, 'Proposed lineup for this concept. Guest speakers come from the customer stories on exa.ai/customers; talks are not confirmed.'));
  openModal({ title: 'Agenda', kicker: `${EVENT.name} ${EVENT.year}`, body, wide: true });
};

actions.stage = () => {
  check('stage', 'Catch the keynote');
  const main = AGENDA.filter((s) => s.track === 'Main stage');
  const body = h('div.stage', {},
    h('div.stage-now', {},
      h('div.live', {}, '● LIVE'),
      h('div.stage-slide', { html: `${logoSVG('#fff', 54)}<div><b>${EVENT.name} ${EVENT.year}</b><span>${main[0].title}</span></div>` }),
      h('p', { html: `<b>${main[0].speaker}</b> on the main stage. The podium and the 13m backdrop carry the Exa mark; the LED wall cycles keynote slides.` }),
    ),
    h('h4', {}, 'Up next on the main stage'),
    h('div.agenda-list', {}, main.slice(1, 5).map((s) => h('div.ag-item', {}, h('div.ag-time', {}, s.time), h('div', {}, h('div.ag-title', {}, s.title), h('div.ag-meta', {}, s.speaker))))),
    h('button.btn.ghost', { onclick: () => { closeModal(true); actions.agenda('Main stage'); } }, 'Full agenda'),
  );
  openModal({ title: 'Main stage', kicker: 'The Gallery', body, wide: true });
};

// ================================================================== Drinks
actions.drinks = () => {
  const body = h('div.drinks', {},
    h('p.lead', {}, 'Signature cocktails and zero-proof drinks at the after party. Every drink comes with grounded citations: the bartender will tell you exactly what’s in it.'),
    h('div.drink-grid', {}, DRINKS.map((d) => {
      const btn = h('button.btn.primary.small', { onclick: () => {
        btn.disabled = true;
        btn.textContent = 'Shaking…';
        beep(300, 0.05, 'triangle', 0.08);
        setTimeout(() => {
          btn.textContent = 'Enjoy! 🍸';
          addToBag('drink');
          check('drinks', 'Order at the Exa-ited! bar');
          toast(`🍸 One <b>${escapeHTML(d.name)}</b>, coming right up`);
          chime();
          setTimeout(() => {
            btn.disabled = false;
            btn.textContent = 'Order another';
          }, 1500);
        }, 900);
      } }, 'Order');
      return h('div.drink', {},
        h('div.glass', { style: { '--c': d.color } }, h('i')),
        h('div', {}, h('h3', {}, d.name, d.na ? h('span.na', {}, 'zero-proof') : null), h('p.short', {}, d.short), h('p', {}, d.long)),
        btn,
      );
    })),
  );
  openModal({ title: 'The Exa-ited! Bar', kicker: 'Bay Terrace · After party', body, wide: true });
};

// ================================================================== Photo booth
actions.photo = () => {
  const stage = h('div.photo-stage', {}, h('div.countdown', {}, 'Get close to the goats…'));
  const actionsRow = h('div.photo-actions');
  const body = h('div.photo', {}, stage, actionsRow);
  openModal({ title: 'Goat photo booth', kicker: 'Bay Terrace · prints in an Exa photo holder', body, wide: true });
  const shoot = () => {
    actionsRow.innerHTML = '';
    let n = 3;
    stage.innerHTML = '';
    const cd = h('div.countdown', {}, String(n));
    stage.append(cd);
    const tick = setInterval(() => {
      n--;
      if (n > 0) {
        cd.textContent = String(n);
        beep(700, 0.05);
        return;
      }
      clearInterval(tick);
      shutter();
      const flash = h('div.flash');
      stage.append(flash);
      const raw = actions.capturePhoto?.();
      setTimeout(() => {
        const out = composePrint(raw);
        stage.innerHTML = '';
        const img = h('img.print', { src: out.toDataURL('image/png'), alt: 'Your goat photo in an Exa photo holder' });
        stage.append(img);
        state.photos++;
        addToBag('photo');
        check('photo', 'Take a goat photo');
        actionsRow.append(
          h('a.btn.primary', { href: img.src, download: `exa-summit-goat-photo-${state.photos}.png` }, 'Download print'),
          h('button.btn.ghost', { onclick: shoot }, 'Take another'),
        );
      }, 250);
    }, 700);
  };
  stage.innerHTML = '';
  stage.append(h('div.photo-intro', {},
    h('div.holder-art', { html: logoSVG('#2141EA', 110, -90) }),
    h('p', {}, 'Step on the mark with the goats. Your print comes out of the booth printer in a blue photo holder shaped like the Exa mark, turned on its side so the photo slides into the open top.'),
    h('button.btn.primary', { onclick: shoot }, '📸 Take my photo'),
  ));
};

/** Compose the printed photo inside the Exa-shaped holder (like the reference render). */
function composePrint(raw) {
  const W = 1000;
  const H = 1100;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  // wall + table
  const wall = g.createLinearGradient(0, 0, W, 0);
  wall.addColorStop(0, '#cfccc6');
  wall.addColorStop(1, '#b9b6b0');
  g.fillStyle = wall;
  g.fillRect(0, 0, W, H * 0.68);
  const desk = g.createLinearGradient(0, H * 0.68, 0, H);
  desk.addColorStop(0, '#c49a6c');
  desk.addColorStop(1, '#9c7448');
  g.fillStyle = desk;
  g.fillRect(0, H * 0.68, W, H * 0.32);
  // holder: the Exa mark turned -90° so the open side faces up (visual box hb wide x hv tall)
  const hb = 640;
  const hv = (LOGO_W / LOGO_H) * hb;
  const hcx = W / 2;
  const hcy = H * 0.84 - hv / 2;
  const holder = (dx, dy, color) => drawLogo(g, hcx + dx - hv / 2, hcy + dy - hb / 2, hb, color, -Math.PI / 2);
  // photo print (behind holder)
  const pw = 600;
  const ph = 450;
  const py = hcy - hv / 2 - ph * 0.7;
  g.save();
  g.translate(W / 2, py + ph / 2);
  g.rotate(-0.025);
  g.shadowColor = 'rgba(0,0,0,0.25)';
  g.shadowBlur = 20;
  g.fillStyle = '#fff';
  g.fillRect(-pw / 2 - 16, -ph / 2 - 16, pw + 32, ph + 32);
  g.shadowBlur = 0;
  if (raw) {
    const sw = raw.width;
    const sh = raw.height;
    const targetAR = pw / ph;
    let cw = sw;
    let chh = sw / targetAR;
    if (chh > sh) {
      chh = sh;
      cw = sh * targetAR;
    }
    g.drawImage(raw, (sw - cw) / 2, (sh - chh) / 2, cw, chh, -pw / 2, -ph / 2, pw, ph);
  } else {
    g.fillStyle = '#2141EA';
    g.fillRect(-pw / 2, -ph / 2, pw, ph);
  }
  g.restore();
  // holder shadow + depth
  g.save();
  g.filter = 'blur(14px)';
  g.globalAlpha = 0.35;
  holder(26, 30, '#000');
  g.restore();
  holder(10, 12, '#14278f');
  holder(0, 0, '#2346f0');
  g.save();
  g.globalAlpha = 0.18;
  g.globalCompositeOperation = 'lighter';
  holder(-3, -3, '#6f86ff');
  g.restore();
  // caption card
  g.fillStyle = 'rgba(255,255,255,0.92)';
  g.fillRect(0, H - 92, W, 92);
  drawLogo(g, 40, H - 70, 48, '#2141EA');
  g.fillStyle = '#0D1330';
  g.font = '700 28px Inter, Arial, sans-serif';
  g.fillText(`${state.name || 'You'} × the G.O.A.T.s`, 100, H - 50);
  g.font = '500 20px Inter, Arial, sans-serif';
  g.fillStyle = '#4a5070';
  g.fillText(`${EVENT.name} ${EVENT.year} after party · Shack15, Ferry Building SF`, 100, H - 22);
  return c;
}

// ================================================================== Café demo desks
const DEMO_RESULTS = [
  { title: 'Open-Weight LLM Models: Live Ranking, Benchmarks & Specs', url: 'open-llm-radar.com', hl: 'Live ranking of open-weight models with parameter counts, release dates and architecture notes.' },
  { title: 'Open-Source LLM Leaderboard 2026', url: 'lmmarketcap.com', hl: 'Leaderboard comparing open models on MMLU, Arena score, price and context length.' },
  { title: 'New and trending LLMs: releases and open-weight momentum', url: 'llmbenchmark.ai', hl: 'Which open-weight models are trending this week, and how many shipped in the last 30 days.' },
  { title: 'New LLM Models: Latest AI Model Releases, Tracked Live', url: 'modelgrep.com', hl: 'Daily feed of new model releases with context window and pricing.' },
  { title: 'Trending Open-Source LLMs This Week', url: 'sciherald.com', hl: 'Weekly roundup of newly released open models and the hardware they need.' },
];
const WEBSET_ROWS = [
  { company_name: 'GE Aerospace', ceo_name: 'Larry Culp', founded_year: 1892 },
  { company_name: 'RTX', ceo_name: 'Christopher T. Calio', founded_year: 2020 },
  { company_name: 'Boeing', ceo_name: 'Kelly Ortberg', founded_year: 1916 },
];

actions.demo = (kind = 'search') => {
  check('demo', 'Watch a live product demo');
  const panel = h('div.demo-panel');
  const tabs = h('div.chips', {}, [['search', 'Search API'], ['websets', 'Websets']].map(([k, label]) => {
    const c = h(`button.chip${k === kind ? '.on' : ''}`, { onclick: () => { tabs.querySelectorAll('.chip').forEach((x) => x.classList.toggle('on', x === c)); render(k); } }, label);
    return c;
  }));
  let timers = [];
  const clear = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));

  const renderSearch = () => {
    let highlights = true;
    const list = h('div.demo-results');
    const tokens = h('div.demo-tokens');
    const toggle = h('button.toggle.on', { onclick: () => { highlights = !highlights; toggle.classList.toggle('on', highlights); toggle.lastChild.textContent = highlights ? 'Highlights ON' : 'Highlights OFF'; run(); } }, h('i'), h('span', {}, 'Highlights ON'));
    const run = () => {
      clear();
      list.innerHTML = '';
      tokens.innerHTML = '';
      DEMO_RESULTS.forEach((r, i) => later(() => {
        list.append(h('div.result', {},
          h('div.r-title', {}, r.title),
          h('div.r-url', {}, r.url),
          h('div.r-hl', {}, highlights ? r.hl : `${r.hl} Full page text follows: navigation, model tables, footnotes, related links and comments…`),
          highlights ? null : h('div.r-more', {}, '+ ~900 more words of page text'),
        ));
        if (i === DEMO_RESULTS.length - 1) tokens.innerHTML = highlights
          ? '<b>≈ 1,150 tokens</b> passed to your model <span class="good">↓ 77% tokens</span>'
          : '<b>≈ 5,000 tokens</b> passed to your model <span>(full page text)</span>';
      }, 120 + i * 110));
    };
    panel.append(
      h('p.lead', {}, 'An Exa engineer runs a query in the API Playground. Toggle highlights to see how much less text your agent has to read.'),
      h('div.demo-query', {}, h('input.text', { value: 'latest open-weight LLM releases', readonly: true }), h('button.btn.primary', { onclick: run }, 'Search'), toggle),
      h('div.demo-split', {},
        h('div', {}, list, tokens),
        h('div.code', { html: `<span class="c-dim">// request (illustrative)</span><br>{<br>&nbsp;&nbsp;"query": "latest open-weight LLM releases",<br>&nbsp;&nbsp;"numResults": 5,<br>&nbsp;&nbsp;"contents": { "highlights": true }<br>}` }),
      ),
    );
    run();
  };

  const renderWebsets = () => {
    const table = h('table.webset', {}, h('thead', {}, h('tr', {}, h('th', {}, 'Company'), h('th', {}, 'CEO'), h('th', {}, 'Founded'), h('th', {}, 'Status'))));
    const tbody = h('tbody');
    table.append(tbody);
    const json = h('div.code');
    const run = () => {
      clear();
      tbody.innerHTML = '';
      json.innerHTML = '<span class="c-dim">// structured output appears when the Webset finishes</span>';
      WEBSET_ROWS.forEach((r, i) => {
        const tr = h('tr', {}, h('td', {}, r.company_name), h('td.dim', {}, '…'), h('td.dim', {}, '…'), h('td.status', {}, 'searching'));
        later(() => tbody.append(tr), 200 + i * 650);
        later(() => (tr.lastChild.textContent = 'verifying ✓'), 450 + i * 650);
        later(() => {
          tr.children[1].textContent = r.ceo_name;
          tr.children[2].textContent = r.founded_year;
          tr.children[1].classList.remove('dim');
          tr.children[2].classList.remove('dim');
          tr.lastChild.textContent = 'enriched ✓';
          tr.lastChild.classList.add('done');
        }, 750 + i * 650);
      });
      later(() => {
        json.innerHTML = `"content": ${escapeHTML(JSON.stringify({ companies: WEBSET_ROWS }, null, 2)).replace(/\n/g, '<br>').replace(/  /g, '&nbsp;&nbsp;')}`;
        beep(990, 0.05);
      }, 750 + WEBSET_ROWS.length * 650);
    };
    panel.append(
      h('p.lead', {}, 'A Webset turns a fuzzy request into a verified, enriched list. Exa extracts enrichments as structured outputs across 70M+ companies.'),
      h('div.chips.criteria', {}, h('span.crit', {}, 'Find: aerospace & defense manufacturers'), h('span.crit', {}, 'Enrich: CEO name'), h('span.crit', {}, 'Enrich: founded year'), h('button.btn.primary.small', { onclick: run }, 'Run Webset')),
      h('div.demo-split', {}, table, json),
    );
    run();
  };

  const render = (k) => {
    clear();
    panel.innerHTML = '';
    (k === 'websets' ? renderWebsets : renderSearch)();
  };
  const body = h('div.demo', {}, h('div.demo-top', {}, h('span.demo-live', {}, '● LIVE DEMO'), tabs), panel);
  openModal({ title: 'Exa product demo', kicker: 'The Highlights Café · demo desk', body, wide: true, onClose: clear });
  render(kind);
};
