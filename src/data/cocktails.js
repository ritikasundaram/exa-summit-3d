import { DRINKS } from './drinks.js';

// The nearest-neighbour bar: every cocktail sits in a small, hand-built "embedding"
// space, a mood typed at the kiosk is mapped into the same space, and the closest
// drink by cosine similarity wins. It is a concept stand-in for real embeddings (no
// model or API runs in the browser), tuned so that the matches feel right.
export const DIMS = ['fresh', 'sweet', 'bitter', 'sour', 'boozy', 'cozy', 'smoky', 'spicy', 'bubbly', 'creamy', 'awake', 'tropical', 'herbal', 'classy', 'playful', 'calm'];

/** How each dimension reads to a guest. */
export const DIM_LABEL = {
  fresh: 'refreshing',
  sweet: 'sweet',
  bitter: 'bittersweet',
  sour: 'zesty',
  boozy: 'spirit-forward',
  cozy: 'cozy',
  smoky: 'smoky',
  spicy: 'spicy',
  bubbly: 'celebratory',
  creamy: 'indulgent',
  awake: 'wide awake',
  tropical: 'tropical',
  herbal: 'botanical',
  classy: 'classic',
  playful: 'playful',
  calm: 'mellow',
};

// Where the eight signature drinks from the bar menu sit.
const SIGNATURE_VECTORS = {
  'Exa-ited!': { bubbly: 1, playful: 0.9, fresh: 0.6, sweet: 0.5, sour: 0.3 },
  'Exa-ctly Right': { boozy: 1, classy: 0.9, cozy: 0.6, bitter: 0.4, sweet: 0.3, calm: 0.5 },
  'Deep Research': { awake: 1, boozy: 0.6, sweet: 0.4, bitter: 0.4, classy: 0.5, creamy: 0.3 },
  'Neural Negroni': { bitter: 1, boozy: 0.8, classy: 0.9, herbal: 0.4 },
  'The G.O.A.T.': { bubbly: 0.9, tropical: 0.6, playful: 0.7, sweet: 0.5, fresh: 0.5, bitter: 0.3 },
  'Websets on the Beach': { tropical: 0.9, sweet: 0.8, playful: 0.8, fresh: 0.5, sour: 0.3 },
  'Latency Lemonade': { fresh: 0.9, sour: 0.8, sweet: 0.4, playful: 0.6, calm: 0.4, herbal: 0.2 },
  'Zero-Shot Spritz': { bubbly: 0.8, bitter: 0.5, fresh: 0.6, classy: 0.4, playful: 0.3 },
};

// Off-menu drinks the bartender will make if the kiosk sends you over.
const OFF_MENU = [
  { name: 'Semantic Sour', short: 'Whiskey sour · lemon · egg-white foam', long: 'Sharp, silky and exactly as tart as you meant it.', color: '#E8B24A', v: { sour: 1, boozy: 0.6, sweet: 0.4, classy: 0.5, creamy: 0.3 } },
  { name: 'Top-K Margarita', short: 'Tequila · lime · orange liqueur · salt rim', long: 'The top result for "it has been a week". Bright, salty, no notes.', color: '#B7D84B', v: { sour: 0.9, fresh: 0.7, boozy: 0.6, playful: 0.7, tropical: 0.3 } },
  { name: 'Spicy Reranker', short: 'Mezcal · jalapeño · lime · agave', long: 'Pushes the heat to the top of the list. Smoke first, then a kick.', color: '#E4572E', v: { spicy: 1, smoky: 0.7, sour: 0.6, boozy: 0.7, playful: 0.5 } },
  { name: 'Smoke Test', short: 'Mezcal · smoked rosemary · agave · bitters', long: 'Slow, brooding and a little mysterious. Passes every time.', color: '#6B5B4B', v: { smoky: 1, boozy: 0.8, herbal: 0.4, classy: 0.5, calm: 0.4, bitter: 0.3 } },
  { name: 'Hot Path Toddy', short: 'Whiskey · honey · lemon · clove, served hot', long: 'A warm mug for foggy Embarcadero evenings. Shortest route to feeling better.', color: '#D9902F', v: { cozy: 1, calm: 0.8, sweet: 0.5, boozy: 0.5, sour: 0.3, spicy: 0.3 } },
  { name: 'Cache Hit Mojito', short: 'White rum · mint · lime · soda', long: 'Instantly refreshing, every single time.', color: '#7ED6A5', v: { fresh: 1, herbal: 0.8, sour: 0.5, sweet: 0.4, tropical: 0.4, bubbly: 0.3 } },
  { name: 'Crawler Colada', short: 'Rum · pineapple · coconut cream', long: 'Crawled every beach on the web and came back with this.', color: '#F6E3A1', v: { tropical: 1, creamy: 0.9, sweet: 0.9, playful: 0.7 } },
  { name: 'Dry Run Martini', short: 'Gin · a whisper of dry vermouth · lemon twist', long: 'Ice cold, crystal clear, nothing to hide behind.', color: '#DCE7EA', v: { boozy: 1, classy: 1, herbal: 0.4, calm: 0.3, bitter: 0.2 } },
  { name: 'Index 75', short: 'Gin · lemon · sparkling wine', long: 'A French 75 for when something just shipped.', color: '#F3DE8A', v: { bubbly: 1, classy: 0.8, sour: 0.5, fresh: 0.5, boozy: 0.3 } },
  { name: 'Ship It', short: 'A cold glass of champagne', long: 'No garnish, no explanation. You earned it.', color: '#F2D98B', v: { bubbly: 1, classy: 0.6, playful: 0.5, fresh: 0.3 } },
  { name: 'Parallel Paloma', short: 'Tequila · grapefruit · lime · soda', long: 'Bittersweet and fizzy, best ordered two at a time.', color: '#FF9E8A', v: { fresh: 0.8, sour: 0.6, bubbly: 0.5, bitter: 0.4, playful: 0.5, boozy: 0.4 } },
  { name: 'Dark Mode & Stormy', short: 'Dark rum · ginger beer · lime', long: 'Ginger heat over dark rum. Easy on the eyes after sunset.', color: '#7A4A2A', v: { spicy: 0.7, fresh: 0.5, boozy: 0.5, bubbly: 0.4, tropical: 0.3, cozy: 0.3 } },
  { name: 'Patch Notes Penicillin', short: 'Scotch · honey · ginger · lemon · smoky float', long: 'Fixes most things. Known issues: you will want another.', color: '#D8A84A', v: { smoky: 0.7, cozy: 0.6, spicy: 0.5, sour: 0.5, boozy: 0.7, calm: 0.3 } },
  { name: 'Uptime Irish Coffee', short: 'Hot coffee · Irish whiskey · soft cream', long: 'The Bay classic. Warm hands, open eyes.', color: '#5A3A22', v: { awake: 0.9, cozy: 0.9, creamy: 0.8, boozy: 0.5, sweet: 0.4 } },
  { name: 'Long Context', short: 'Vodka · coffee liqueur · cream', long: 'A White Russian that remembers everything you said earlier.', color: '#CBB49A', v: { creamy: 1, sweet: 0.7, cozy: 0.6, calm: 0.6, boozy: 0.5, awake: 0.3 } },
  { name: 'Grounded Gimlet', short: 'Gin · cucumber · basil · lime', long: 'Green, clean and well cited. A garden in a coupe.', color: '#A9D39A', v: { herbal: 1, fresh: 0.9, sour: 0.6, calm: 0.5, classy: 0.5 } },
  { name: 'Nearest Neighbour', short: 'Gin · honey · lemon · lavender', long: 'A Bee’s Knees that sits right next to whatever you were looking for.', color: '#C9B6E8', v: { calm: 0.9, herbal: 0.7, sweet: 0.6, sour: 0.5, classy: 0.4 } },
  { name: 'Golden Gate Manhattan', short: 'Rye · sweet vermouth · bitters · cherry', long: 'Stirred, never rushed. Wears a suit.', color: '#9B2D20', v: { classy: 1, boozy: 0.9, bitter: 0.5, cozy: 0.5, sweet: 0.3 } },
  { name: 'Multi-Hop Mai Tai', short: 'Two rums · orgeat · lime · curaçao', long: 'Takes a few hops to get there. Worth every one.', color: '#E8853A', v: { tropical: 0.9, boozy: 0.7, sweet: 0.6, sour: 0.5, playful: 0.6 } },
  { name: 'Bloody Query', short: 'Vodka · tomato · horseradish · celery · hot sauce', long: 'Savoury, spicy and restorative. Answers the morning after.', color: '#B5311F', v: { spicy: 0.8, herbal: 0.6, awake: 0.5, boozy: 0.4, fresh: 0.2 } },
  { name: 'Warm Start', short: 'Mulled red wine · orange · cinnamon · star anise', long: 'Already warmed up when you get here.', color: '#7A1F3D', v: { cozy: 1, spicy: 0.6, sweet: 0.6, calm: 0.6 } },
  { name: 'Shared Context Sangria', short: 'Red wine · citrus · stone fruit · brandy', long: 'Made by the pitcher. Better with the whole table.', color: '#A6243F', v: { playful: 0.8, sweet: 0.7, fresh: 0.6, tropical: 0.3, bubbly: 0.2 } },
  // zero-proof
  { name: 'Cold Start', short: 'Zero-proof · cold brew · tonic · orange peel', long: 'From zero to awake with no warm-up.', color: '#4A2C1A', na: true, v: { awake: 1, bitter: 0.5, fresh: 0.6, bubbly: 0.5 } },
  { name: 'No-Op Mojito', short: 'Zero-proof · mint · lime · soda', long: 'All of the mint and lime, none of the side effects.', color: '#8FDDB0', na: true, v: { fresh: 1, herbal: 0.8, sour: 0.5, sweet: 0.4, bubbly: 0.3 } },
  { name: 'Golden Hour', short: 'Zero-proof · turmeric · ginger · honey · lemon, served warm', long: 'A warm, gently spiced mug for winding down by the water.', color: '#E7A52C', na: true, v: { cozy: 0.9, calm: 0.8, spicy: 0.5, sour: 0.3, sweet: 0.3 } },
  { name: 'Safe Search', short: 'Zero-proof · pomegranate · ginger ale · cherry', long: 'Sweet, fizzy and suitable for all audiences.', color: '#E8436B', na: true, v: { sweet: 0.9, playful: 0.9, bubbly: 0.7 } },
  { name: 'Sandbox Colada', short: 'Zero-proof · pineapple · coconut · lime', long: 'A beach holiday that stays safely contained.', color: '#F4E7B2', na: true, v: { tropical: 1, creamy: 0.8, sweet: 0.8, playful: 0.6 } },
  { name: 'Garden Variety', short: 'Zero-proof botanical spirit · cucumber · elderflower · tonic', long: 'Crisp, grown-up and quietly floral.', color: '#B9E0B0', na: true, v: { herbal: 1, fresh: 0.8, classy: 0.5, calm: 0.5, bitter: 0.3 } },
];

const toArray = (v) => {
  const a = DIMS.map((d) => v[d] || 0);
  const len = Math.hypot(...a) || 1;
  return a.map((x) => x / len);
};

/** Every drink the kiosk can recommend, each with a unit-length embedding `e`. */
export const COCKTAILS = [
  ...DRINKS.map((d) => ({ ...d, signature: true, e: toArray(SIGNATURE_VECTORS[d.name] || {}) })),
  ...OFF_MENU.map(({ v, ...d }) => ({ ...d, e: toArray(v) })),
];

// ---------------------------------------------------------------- mood → embedding
// Phrases are checked against the whole sentence first, then single words by prefix
// ("celebrat" matches celebrate, celebrating, celebration).
const MOODS = [
  // celebration and good news
  [['celebrat', 'party', 'partying', 'won', 'win', 'winning', 'promot', 'shipped', 'launch', 'raised', 'funding', 'birthday', 'congrat', 'victory', 'cheers', 'toast', 'milestone', 'closed a deal', 'closed the deal', 'big news', 'good news', 'just shipped', 'new job', 'engaged'], { bubbly: 1, playful: 0.5, classy: 0.3, fresh: 0.2 }],
  [['happy', 'joy', 'great', 'amazing', 'excited', 'thrilled', 'ecstatic', 'elated', 'delighted', 'fantastic', 'wonderful', 'awesome', 'buzzing', 'good mood', 'on top of the world'], { bubbly: 0.7, playful: 0.7, fresh: 0.4, sweet: 0.3 }],
  [['playful', 'fun', 'silly', 'goofy', 'cheeky', 'giddy', 'danc', 'karaoke', 'friends', 'social', 'chatty', 'mingl', 'network', 'outgoing', 'loud', 'festive'], { playful: 1, bubbly: 0.4, sweet: 0.3, fresh: 0.3 }],
  // energy
  [['tired', 'exhaust', 'sleepy', 'drained', 'jetlag', 'jet lag', 'yawn', 'zombie', 'wiped', 'knackered', 'no sleep', 'need energy', 'pick me up', 'wake me up', 'second wind', 'flagging'], { awake: 1, sweet: 0.2 }],
  [['awake', 'energ', 'focus', 'alert', 'deadline', 'crunch', 'all-nighter', 'all nighter', 'caffein', 'coffee', 'espresso', 'wired', 'productive', 'late night', 'long night', 'debug', 'coding', 'hack'], { awake: 1, bitter: 0.2 }],
  // winding down
  [['stress', 'anxious', 'anxiety', 'overwhelm', 'frazzl', 'tense', 'burnt', 'burned out', 'burnout', 'rough day', 'long day', 'hard day', 'tough day', 'bad day', 'long week', 'frustrat', 'fried', 'worn out'], { calm: 1, cozy: 0.6, herbal: 0.3, boozy: 0.2 }],
  [['relax', 'chill', 'calm', 'mellow', 'unwind', 'wind down', 'peace', 'zen', 'quiet', 'easygoing', 'slow', 'serene', 'content', 'laid back', 'laid-back', 'gentle', 'soft'], { calm: 1, herbal: 0.5, fresh: 0.3 }],
  [['cozy', 'cosy', 'cold', 'chilly', 'freezing', 'rain', 'fog', 'winter', 'blanket', 'fireplace', 'comfort', 'homesick', 'hug', 'snug', 'warm', 'sweater', 'under the weather', 'sniffl'], { cozy: 1, calm: 0.4, spicy: 0.2 }],
  [['sad', 'feeling blue', 'feeling down', 'lonely', 'heartbr', 'melanch', 'gloomy', 'homesick', 'bummed', 'low', 'miss'], { cozy: 0.7, sweet: 0.6, creamy: 0.6, calm: 0.4 }],
  [['nervous', 'shy', 'awkward', 'introvert', 'intimidat', 'out of place'], { calm: 0.7, fresh: 0.4, playful: 0.3, sweet: 0.2 }],
  // bold
  [['adventur', 'bold', 'brave', 'daring', 'wild', 'reckless', 'curious', 'experiment', 'surprise', 'weird', 'funky', 'unusual', 'something new', 'something different', 'spontaneous'], { spicy: 0.7, smoky: 0.6, tropical: 0.3, playful: 0.4, boozy: 0.3 }],
  [['spicy', 'fiery', 'feisty', 'kick', 'jalape', 'chili', 'chilli', 'heat', 'fired up', 'on fire', 'sassy'], { spicy: 1, sour: 0.3, playful: 0.3 }],
  [['smoky', 'smoke', 'campfire', 'bonfire', 'mysterious', 'brooding', 'noir', 'mystery', 'dark', 'intense', 'leather', 'cigar', 'moody'], { smoky: 1, boozy: 0.5, bitter: 0.2 }],
  [['strong', 'stiff', 'boozy', 'double', 'need a drink', 'numb', 'serious drink', 'knock me out', 'spirit'], { boozy: 1, classy: 0.3 }],
  [['confident', 'boss', 'power', 'unstoppable', 'crushing', 'invincible', 'in charge', 'ambitious'], { classy: 0.8, boozy: 0.7, bubbly: 0.3 }],
  // refined
  [['sophisticat', 'classy', 'elegant', 'fancy', 'refined', 'suit', 'james bond', 'grown-up', 'grown up', 'mature', 'business', 'investor', 'board', 'formal', 'tux', 'posh', 'chic'], { classy: 1, boozy: 0.6, bitter: 0.2 }],
  [['nostalg', 'classic', 'old school', 'old-school', 'old fashioned', 'timeless', 'tradition', 'retro', 'vintage'], { classy: 0.8, cozy: 0.4, boozy: 0.5 }],
  [['romantic', 'date', 'love', 'crush', 'anniversary', 'flirt', 'smitten'], { bubbly: 0.6, classy: 0.6, sweet: 0.4, sour: 0.2 }],
  [['thoughtful', 'pensive', 'contemplat', 'philosoph', 'reflective', 'introspect', 'creative', 'inspired', 'dreamy', 'deep in thought'], { smoky: 0.5, classy: 0.5, calm: 0.5, herbal: 0.4, bitter: 0.3 }],
  // flavour words
  [['bitter', 'grumpy', 'cynical', 'salty', 'sarcastic', 'jaded', 'cranky', 'irritat', 'annoyed', 'dry'], { bitter: 1, classy: 0.4, boozy: 0.4 }],
  [['sour', 'tart', 'sharp', 'zest', 'citrus', 'lemon', 'lime', 'tangy', 'snarky', 'punchy'], { sour: 1, fresh: 0.5 }],
  [['sweet', 'dessert', 'candy', 'treat', 'sugar', 'fruity', 'sweet tooth'], { sweet: 1, playful: 0.3 }],
  [['indulg', 'decadent', 'cream', 'rich', 'velvet', 'luxur', 'spoil', 'pamper'], { creamy: 1, sweet: 0.6, cozy: 0.3 }],
  [['fresh', 'refresh', 'thirst', 'crisp', 'clean', 'cool', 'summer', 'sunny', 'sunshine', 'hot day', 'sweaty', 'heat wave', 'workout', 'gym', 'after a run', 'parched', 'light', 'bright'], { fresh: 1, sour: 0.3, herbal: 0.3 }],
  [['beach', 'vacation', 'holiday', 'island', 'tropic', 'hawaii', 'escape', 'paradise', 'ocean', 'surf', 'sunset', 'pool', 'getaway', 'out of office', 'ooo', 'pineapple', 'coconut'], { tropical: 1, sweet: 0.5, playful: 0.5 }],
  [['garden', 'herb', 'green', 'nature', 'botanical', 'spring', 'floral', 'flower', 'lavender', 'healthy', 'detox', 'yoga', 'mindful', 'earthy', 'outdoors'], { herbal: 1, fresh: 0.6, calm: 0.4 }],
  [['hungover', 'hangover', 'brunch', 'morning after', 'rough night', 'savoury', 'savory'], { spicy: 0.7, herbal: 0.5, awake: 0.5, fresh: 0.2 }],
  [['bubbl', 'fizz', 'sparkl', 'champagne', 'prosecco'], { bubbly: 1, fresh: 0.3 }],
  // house easter eggs
  [['goat', 'greatest'], { bubbly: 0.9, tropical: 0.6, playful: 0.7, sweet: 0.5, fresh: 0.5, bitter: 0.3 }],
  [['research', 'curious about everything', 'rabbit hole', 'down a rabbit hole'], { awake: 1, classy: 0.4, bitter: 0.4, boozy: 0.4 }],
];

const NA_PHRASES = ['sober', 'driving', 'designated', 'no alcohol', 'non-alcoholic', 'non alcoholic', 'nonalcoholic', 'alcohol-free', 'alcohol free', 'mocktail', 'zero proof', 'zero-proof', 'pregnant', 'dry january', 'not drinking', "don't drink", 'dont drink', 'without alcohol', 'teetotal', 'virgin', 'no booze', 'booze-free'];
const NEGATORS = new Set(['not', 'no', 'never', 'without', "don't", 'dont', "isn't", 'isnt', 'nothing', 'less', 'hate', "can't", 'cant', 'avoid']);
const FILLER = new Set(['too', 'very', 'so', 'that', 'really', 'feeling', 'feel', 'a', 'an', 'the', 'much', 'any', 'anything', 'at', 'all', 'in', 'mood', 'for', 'to', 'be', 'want', 'like']);

const WORDS = [];
const PHRASES = [];
for (const [keys, w] of MOODS) for (const k of keys) (k.includes(' ') ? PHRASES : WORDS).push([k, w]);
WORDS.sort((a, b) => b[0].length - a[0].length);

/** Map free text to { vector, na, signals } in the cocktail space. */
export function embedMood(text) {
  let s = ` ${String(text).toLowerCase().replace(/[^a-z0-9'\- ]+/g, ' ').replace(/\s+/g, ' ').trim()} `;
  const acc = Object.fromEntries(DIMS.map((d) => [d, 0]));
  const na = NA_PHRASES.some((p) => s.includes(p));
  for (const p of NA_PHRASES) s = s.split(p).join(' ');
  let hits = 0;
  const add = (w, sign) => {
    hits++;
    for (const [d, x] of Object.entries(w)) acc[d] += x * sign;
  };
  for (const [p, w] of PHRASES) {
    if (s.includes(` ${p} `) || s.includes(` ${p}`)) {
      add(w, 1);
      s = s.split(p).join(' ');
    }
  }
  let negate = 0;
  for (const tok of s.trim().split(' ')) {
    if (!tok) continue;
    if (NEGATORS.has(tok)) {
      negate = 3; // "nothing too sweet", "not very strong"
      continue;
    }
    const m = WORDS.find(([k]) => (k.length >= 4 ? tok.startsWith(k) : tok === k));
    if (m) {
      add(m[1], negate > 0 ? -0.9 : 1);
      negate = 0;
    } else if (!FILLER.has(tok)) negate = Math.max(0, negate - 1);
  }
  const vector = DIMS.map((d) => acc[d]);
  const len = Math.hypot(...vector);
  const signals = DIMS.map((d, i) => [d, vector[i]])
    .filter(([, x]) => x > 0.35)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([d]) => d);
  return { vector: len ? vector.map((x) => x / len) : vector, na, known: hits > 0 && len > 0, signals };
}

/** All drinks ranked by cosine similarity to a mood. */
export function matchCocktails(text) {
  const q = embedMood(text);
  const pool = q.na ? COCKTAILS.filter((c) => c.na) : COCKTAILS;
  const ranked = pool
    .map((c) => {
      const parts = c.e.map((x, i) => x * q.vector[i]);
      // unless you asked for zero-proof, the spirited version of a drink edges ahead
      const score = parts.reduce((a, b) => a + b, 0) * (c.na && !q.na ? 0.92 : 1);
      const why = parts
        .map((x, i) => [DIMS[i], x])
        .filter(([, x]) => x > 0.04)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([d]) => d);
      return { drink: c, score, why };
    })
    .sort((a, b) => b.score - a.score || (b.drink.signature ? 1 : 0) - (a.drink.signature ? 1 : 0));
  return { ...q, ranked };
}

/** 2D view of the space for the kiosk map: x = mellow → lively, y = light → strong. Both in −1..1. */
export function project(e) {
  const g = (d) => e[DIMS.indexOf(d)];
  const x = g('playful') + g('bubbly') + g('awake') + g('spicy') + g('tropical') * 0.7 - g('calm') - g('cozy') - g('classy') * 0.6 - g('creamy') * 0.5;
  const y = g('boozy') + g('bitter') + g('smoky') + g('classy') * 0.5 + g('awake') * 0.3 - g('fresh') - g('sweet') * 0.6 - g('bubbly') * 0.5 - g('herbal') * 0.4 - g('sour') * 0.3;
  const clamp = (v) => Math.max(-1, Math.min(1, v / 1.5));
  return [clamp(x), clamp(y)];
}
