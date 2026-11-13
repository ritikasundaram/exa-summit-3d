// Persistent player state (localStorage, per-browser).
const KEY = 'exa-summit-state-v1';

const defaults = () => ({
  name: '',
  role: 'Builder',
  bag: {}, // id -> count
  visited: {}, // checklist id -> true
  reactionRuns: [], // { name, best }
  wonHoodie: false,
  goatsPetted: 0,
  photos: 0,
});

let data = defaults();
try {
  const raw = localStorage.getItem(KEY);
  if (raw) data = { ...defaults(), ...JSON.parse(raw) };
} catch {}

const listeners = new Set();
export const state = data;
export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {}
  listeners.forEach((fn) => fn(data));
}
export function onState(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function addToBag(id, n = 1) {
  data.bag[id] = (data.bag[id] || 0) + n;
  save();
}
export function visit(id) {
  if (!data.visited[id]) {
    data.visited[id] = true;
    save();
    return true;
  }
  return false;
}
export function resetState() {
  Object.assign(data, defaults());
  save();
}

export const CHECKLIST = [
  { id: 'badge', label: 'Pick up your badge', where: 'Reception' },
  { id: 'swag', label: 'Grab swag', where: 'The Lounge' },
  { id: 'cookies', label: 'Eat an Exa cookie', where: 'The Library café' },
  { id: 'demo', label: 'Watch a live product demo', where: 'Highlights Café demo desks' },
  { id: 'reaction', label: 'Are you exa-ordinary?', where: 'Kilden · Finstua' },
  { id: 'mcp', label: 'Ask the Summit MCP', where: 'Kilden · Finstua' },
  { id: 'stage', label: 'Catch the keynote', where: 'The Gallery' },
  { id: 'goats', label: 'Pet a goat', where: 'Bay Terrace' },
  { id: 'photo', label: 'Take a goat photo', where: 'Bay Terrace' },
  { id: 'drinks', label: 'Order at the Exa-ited! bar', where: 'Bay Terrace' },
];

export const BAG_ITEMS = {
  hourglass: { label: 'Exa hourglass', icon: '⌛' },
  goatpen: { label: 'GOAT pen holder', icon: '🐐' },
  hoodie: { label: 'Exa hoodie', icon: '🧥' },
  cookie: { label: 'Exa cookie', icon: '🍪' },
  drink: { label: 'Drink', icon: '🍸' },
  photo: { label: 'Goat photo', icon: '📸' },
  badge: { label: 'Badge', icon: '🪪' },
};

const SEED_BOARD = [
  { name: 'Neural Nadia', best: 193 },
  { name: 'Embedding Emma', best: 207 },
  { name: 'Latency Larry', best: 221 },
  { name: 'Crawler Kai', best: 238 },
  { name: 'Goat #3', best: 286 },
];

export function leaderboard() {
  // older saves stored an average under `avg`
  const mine = data.reactionRuns.map((r) => ({ name: r.name, best: r.best ?? r.avg, you: true }));
  return [...SEED_BOARD, ...mine].sort((a, b) => a.best - b.best);
}
