// Canvas artwork for every printed / screen surface in the venue.
import { drawLogo, drawWordmark, LOGO_ASPECT, HOODIE_PATHS } from './logo.js';
import { FONT, MONO, blueGradient, networkPattern, eventLockup, wrapText } from './tex.js';
import { EVENT } from '../config.js';
import { AGENDA } from '../data/agenda.js';

const BLUE = '#2141EA';
const INK = '#0D1330';

function centerText(ctx, text, x, y, size, weight = 700, color = '#fff', font = FONT) {
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawHoodie(ctx, cx, cy, s) {
  // s = rendered height; artboard is 400x420 centered at (200, 220)
  const k = s / 400;
  ctx.save();
  ctx.translate(cx - 200 * k, cy - 220 * k);
  ctx.scale(k, k);
  const P = HOODIE_PATHS;
  const fill = (d, c) => {
    ctx.fillStyle = c;
    ctx.fill(new Path2D(d));
  };
  const stroke = (d, c, w) => {
    ctx.strokeStyle = c;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.stroke(new Path2D(d));
  };
  fill(P.hood, '#cfd8ff');
  fill(P.sleeveL, '#e8edff');
  fill(P.sleeveR, '#e8edff');
  fill(P.cuffL, '#c3cdfb');
  fill(P.cuffR, '#c3cdfb');
  fill(P.body, '#ffffff');
  fill(P.band, '#d5ddff');
  fill(P.pocket, '#eef1ff');
  stroke(P.pocketL, '#b4c0f5', 5);
  stroke(P.pocketR, '#b4c0f5', 5);
  fill(P.neck, '#9fb0ff');
  stroke(P.rim, '#c3cdfb', 14);
  stroke(P.stringL, '#9fb0ff', 4);
  stroke(P.stringR, '#9fb0ff', 4);
  ctx.restore();
  drawLogo(ctx, cx - s * 0.035, cy - s * 0.18, s * 0.09, '#2141EA');
}

export const G = {
  welcomeBanner(ctx, w, h) {
    blueGradient(ctx, w, h);
    networkPattern(ctx, w, h, 'rgba(255,255,255,0.10)', 40);
    drawLogo(ctx, h * 0.18, h * 0.18, h * 0.64, '#fff');
    ctx.fillStyle = '#fff';
    ctx.font = `500 ${h * 0.2}px ${FONT}`;
    ctx.fillText('Welcome to', h * 0.85, h * 0.4);
    ctx.font = `800 ${h * 0.36}px ${FONT}`;
    ctx.fillText(`${EVENT.name} ${EVENT.year}`, h * 0.85, h * 0.78);
  },

  floorLogo(ctx, w, h) {
    ctx.fillStyle = BLUE;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = w * 0.02;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w * 0.44, 0, Math.PI * 2);
    ctx.stroke();
    const lh = h * 0.44;
    drawLogo(ctx, w / 2 - (lh * LOGO_ASPECT) / 2, h / 2 - lh / 2 - h * 0.04, lh, '#fff');
    centerText(ctx, `${EVENT.name.toUpperCase()} ${EVENT.year}`, w / 2, h * 0.8, h * 0.055, 700);
  },

  cubeFace(i) {
    return (ctx, w, h) => {
      const blue = i % 2 === 0;
      ctx.fillStyle = blue ? BLUE : '#fff';
      ctx.fillRect(0, 0, w, h);
      const fg = blue ? '#fff' : BLUE;
      const kind = i % 4;
      if (kind === 0) drawLogo(ctx, w / 2 - (h * 0.6 * LOGO_ASPECT) / 2, h * 0.2, h * 0.6, fg);
      else if (kind === 1) {
        centerText(ctx, "the world's", w / 2, h * 0.34, h * 0.12, 800, fg);
        centerText(ctx, 'data for', w / 2, h * 0.5, h * 0.12, 800, fg);
        centerText(ctx, 'AI agents', w / 2, h * 0.66, h * 0.12, 800, fg);
      } else if (kind === 2) {
        centerText(ctx, '100B', w / 2, h * 0.42, h * 0.26, 800, fg);
        centerText(ctx, 'documents', w / 2, h * 0.64, h * 0.1, 600, fg);
        centerText(ctx, 'indexed', w / 2, h * 0.77, h * 0.1, 600, fg);
      } else {
        centerText(ctx, '2T', w / 2, h * 0.42, h * 0.3, 800, fg);
        centerText(ctx, 'URLs tracked', w / 2, h * 0.68, h * 0.1, 600, fg);
      }
    };
  },

  rollup(i) {
    return (ctx, w, h) => {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = BLUE;
      ctx.fillRect(0, h * 0.62, w, h * 0.38);
      networkPattern(ctx, w, h * 0.6, 'rgba(33,65,234,0.18)', 25);
      drawWordmark(ctx, w * 0.12, h * 0.07, w * 0.16, BLUE);
      ctx.fillStyle = INK;
      ctx.font = `800 ${w * 0.13}px ${FONT}`;
      const lines = i ? ['Imagine a', 'world with', 'perfect search.'] : ["The world's", 'data for', 'AI agents.'];
      lines.forEach((l, k) => ctx.fillText(l, w * 0.1, h * 0.3 + k * w * 0.15));
      ctx.fillStyle = '#fff';
      ctx.font = `600 ${w * 0.07}px ${FONT}`;
      ctx.fillText(i ? 'Search · Agent · Websets' : `${EVENT.name} ${EVENT.year}`, w * 0.1, h * 0.72);
      ctx.font = `500 ${w * 0.055}px ${FONT}`;
      ctx.fillText('exa.ai', w * 0.1, h * 0.92);
      drawLogo(ctx, w * 0.62, h * 0.75, w * 0.32, 'rgba(255,255,255,0.25)');
    };
  },

  swagWall(ctx, w, h) {
    blueGradient(ctx, w, h);
    networkPattern(ctx, w, h, 'rgba(255,255,255,0.08)', 60);
    centerText(ctx, 'THE SWAG BAR', w / 2, h * 0.2, h * 0.13, 800);
    centerText(ctx, 'One of each. Okay, two hourglasses.', w / 2, h * 0.33, h * 0.055, 500, 'rgba(255,255,255,0.85)');
    // three item callouts
    const items = [
      ['The Exa hourglass', 'Every grain is one search'],
      ['The GOAT pen holder', 'Greatest of all tools'],
      ['The Exa hoodie', 'Earned, not given'],
    ];
    items.forEach(([a, b], i) => {
      const cx = w * (0.2 + i * 0.3);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 3;
      roundRect(ctx, cx - w * 0.13, h * 0.45, w * 0.26, h * 0.42, 18);
      ctx.stroke();
      if (i === 0) drawLogo(ctx, cx - h * 0.09, h * 0.5, h * 0.22, '#fff');
      if (i === 1) centerText(ctx, '🐐', cx, h * 0.61, h * 0.17, 400);
      if (i === 2) drawHoodie(ctx, cx, h * 0.62, h * 0.28);
      centerText(ctx, a, cx, h * 0.78, h * 0.045, 700);
      centerText(ctx, b, cx, h * 0.83, h * 0.034, 500, 'rgba(255,255,255,0.8)');
    });
  },

  cafeWall(ctx, w, h) {
    ctx.fillStyle = '#f7f6f2';
    ctx.fillRect(0, 0, w, h);
    // header band (like the bar topper in the Shack15 deck)
    const bh = h * 0.2;
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, w, bh);
    for (let x = 0; x < w; x += 14) for (let y = 0; y < bh; y += 14) {
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(x, y, 3, 3);
    }
    centerText(ctx, 'The Highlights Café', w / 2, bh * 0.45, bh * 0.42, 600, '#9fb0ff');
    centerText(ctx, 'Only the most relevant excerpts. Also coffee.', w / 2, bh * 0.82, bh * 0.14, 500, 'rgba(255,255,255,0.7)');
    // three arches
    for (let i = 0; i < 3; i++) {
      const cx = w * (0.2 + i * 0.3);
      const aw = w * 0.18;
      const top = h * 0.36;
      const bot = h * 0.95;
      ctx.fillStyle = '#e6e3dc';
      ctx.beginPath();
      ctx.moveTo(cx - aw / 2 - 12, bot);
      ctx.lineTo(cx - aw / 2 - 12, top + aw / 2);
      ctx.arc(cx, top + aw / 2, aw / 2 + 12, Math.PI, 0);
      ctx.lineTo(cx + aw / 2 + 12, bot);
      ctx.fill();
      const g = ctx.createLinearGradient(0, top, 0, bot);
      g.addColorStop(0, '#2b4cff');
      g.addColorStop(1, '#14278f');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(cx - aw / 2, bot);
      ctx.lineTo(cx - aw / 2, top + aw / 2);
      ctx.arc(cx, top + aw / 2, aw / 2, Math.PI, 0);
      ctx.lineTo(cx + aw / 2, bot);
      ctx.fill();
      ctx.save();
      ctx.clip();
      networkPattern(ctx, w, h, 'rgba(255,255,255,0.18)', 90);
      ctx.restore();
      drawLogo(ctx, cx - h * 0.07, h * 0.55, h * 0.18, 'rgba(255,255,255,0.9)');
    }
  },

  barFront(kind) {
    return (ctx, w, h) => {
      ctx.fillStyle = BLUE;
      ctx.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 12) for (let y = 0; y < h; y += 12) {
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(x, y, 3, 3);
      }
      if (kind === 'word') {
        ctx.font = `600 ${h * 0.4}px ${FONT}`;
        const tw = h * 0.36 * LOGO_ASPECT + h * 0.1 + ctx.measureText('exa').width;
        drawWordmark(ctx, w / 2 - tw / 2, h * 0.31, h * 0.38, '#fff');
      } else {
        drawLogo(ctx, w / 2 - h * 0.2, h * 0.24, h * 0.52, '#fff');
      }
    };
  },

  tentCard(title, sub) {
    return (ctx, w, h) => {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = BLUE;
      ctx.fillRect(0, 0, w, h * 0.08);
      drawLogo(ctx, w * 0.06, h * 0.2, h * 0.3, BLUE);
      ctx.fillStyle = INK;
      ctx.font = `800 ${h * 0.2}px ${FONT}`;
      ctx.fillText(title, w * 0.06 + h * 0.3, h * 0.42);
      ctx.font = `500 ${h * 0.12}px ${FONT}`;
      ctx.fillStyle = '#4a5070';
      wrapText(ctx, sub, w * 0.06, h * 0.7, w * 0.9, h * 0.15);
    };
  },

  kioskScreen(board) {
    return (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#0b1340');
      g.addColorStop(1, '#13248a');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      networkPattern(ctx, w, h, 'rgba(120,150,255,0.12)', 40);
      centerText(ctx, 'ARE YOU', w / 2, h * 0.12, h * 0.07, 700, '#9fb0ff');
      centerText(ctx, 'EXA-ORDINARY?', w / 2, h * 0.23, h * 0.12, 900);
      centerText(ctx, `Beat Exa's ${EVENT.exaLatencyMs}ms search latency · best of 3 tries`, w / 2, h * 0.33, h * 0.04, 500, 'rgba(255,255,255,0.8)');
      // leaderboard
      const x0 = w * 0.12;
      const x1 = w * 0.88;
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      roundRect(ctx, x0, h * 0.4, x1 - x0, h * 0.48, 16);
      ctx.fill();
      ctx.font = `700 ${h * 0.04}px ${FONT}`;
      ctx.fillStyle = '#9fb0ff';
      ctx.fillText("TODAY'S FASTEST HUMANS", x0 + 24, h * 0.47);
      board.slice(0, 5).forEach((r, i) => {
        const y = h * 0.55 + i * h * 0.065;
        ctx.font = `600 ${h * 0.042}px ${FONT}`;
        ctx.fillStyle = r.you ? '#ffffff' : 'rgba(255,255,255,0.85)';
        ctx.fillText(`${i + 1}. ${r.name}${r.you ? ' (you)' : ''}`, x0 + 24, y);
        ctx.textAlign = 'right';
        ctx.fillStyle = r.best < EVENT.exaLatencyMs ? '#7CFFB2' : '#fff';
        ctx.font = `700 ${h * 0.042}px ${MONO}`;
        ctx.fillText(`${Math.round(r.best)}ms`, x1 - 24, y);
        ctx.textAlign = 'left';
      });
      ctx.fillStyle = '#fff';
      roundRect(ctx, w * 0.3, h * 0.905, w * 0.4, h * 0.07, h * 0.035);
      ctx.fill();
      centerText(ctx, 'Beat 200ms → win an Exa hoodie', w / 2, h * 0.94, h * 0.035, 700, BLUE);
    };
  },

  marquee(ctx, w, h) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    let fs = h * 0.5;
    ctx.font = `900 ${fs}px ${FONT}`;
    while (ctx.measureText('ARE YOU EXA-ORDINARY?').width > w * 0.92) {
      fs *= 0.95;
      ctx.font = `900 ${fs}px ${FONT}`;
    }
    ctx.fillStyle = BLUE;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ARE YOU EXA-ORDINARY?', w / 2, h * 0.54);
  },

  prizeSign(ctx, w, h) {
    ctx.fillStyle = BLUE;
    ctx.fillRect(0, 0, w, h);
    centerText(ctx, 'THE PRIZE', w / 2, h * 0.3, h * 0.2, 800);
    centerText(ctx, 'Best of 3 < 200ms', w / 2, h * 0.58, h * 0.14, 600);
    centerText(ctx, 'wins the Exa hoodie', w / 2, h * 0.78, h * 0.12, 500, 'rgba(255,255,255,0.85)');
  },

  agendaBoard(ctx, w, h) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = BLUE;
    ctx.fillRect(0, 0, w, h * 0.16);
    drawLogo(ctx, w * 0.03, h * 0.035, h * 0.09, '#fff');
    ctx.fillStyle = '#fff';
    ctx.font = `800 ${h * 0.07}px ${FONT}`;
    ctx.fillText('Today at the Summit', w * 0.03 + h * 0.1, h * 0.105);
    ctx.font = `500 ${h * 0.03}px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText('Ask the Summit MCP for anything on this wall →', w * 0.97, h * 0.1);
    ctx.textAlign = 'left';
    const colW = w / 2;
    const half = Math.ceil(AGENDA.length / 2);
    const rowH = (h * 0.76) / half;
    AGENDA.forEach((s, i) => {
      const col = i < half ? 0 : 1;
      const row = i < half ? i : i - half;
      const x = col * colW + w * 0.03;
      const y = h * 0.2 + row * rowH;
      ctx.fillStyle = BLUE;
      ctx.font = `700 ${h * 0.026}px ${MONO}`;
      ctx.fillText(s.time, x, y + h * 0.03);
      ctx.fillStyle = INK;
      ctx.font = `700 ${h * 0.026}px ${FONT}`;
      let t = s.title;
      while (ctx.measureText(t).width > colW * 0.78 && t.length > 10) t = t.slice(0, -2);
      if (t !== s.title) t = t.trim() + '…';
      ctx.fillText(t, x + w * 0.065, y + h * 0.03);
      ctx.fillStyle = '#5b6280';
      ctx.font = `500 ${h * 0.02}px ${FONT}`;
      let meta = s.speaker;
      while (ctx.measureText(meta).width > colW * 0.78 && meta.length > 10) meta = meta.slice(0, -2);
      ctx.fillText(meta === s.speaker ? meta : meta.trim() + '…', x + w * 0.065, y + h * 0.058);
    });
  },

  mcpPoster(ctx, w, h) {
    blueGradient(ctx, w, h);
    networkPattern(ctx, w, h, 'rgba(255,255,255,0.09)', 80);
    drawWordmark(ctx, w * 0.05, h * 0.05, h * 0.06, '#fff');
    ctx.fillStyle = '#fff';
    ctx.font = `800 ${h * 0.1}px ${FONT}`;
    ctx.fillText('The Summit MCP', w * 0.05, h * 0.25);
    ctx.font = `500 ${h * 0.036}px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    wrapText(ctx, 'Plug the whole conference into your agent. Talks, speakers, rooms and the agenda, searchable by meaning, the same way Exa searches the web.', w * 0.05, h * 0.33, w * 0.55, h * 0.048);
    // code block
    const cx = w * 0.05,
      cy = h * 0.5,
      cw = w * 0.56,
      ch = h * 0.2;
    ctx.fillStyle = '#0b1036';
    roundRect(ctx, cx, cy, cw, ch, 14);
    ctx.fill();
    ctx.font = `600 ${h * 0.03}px ${MONO}`;
    ctx.fillStyle = '#7CFFB2';
    ctx.fillText('$', cx + 24, cy + h * 0.06);
    ctx.fillStyle = '#fff';
    ctx.fillText('claude mcp add exa-summit \\', cx + 54, cy + h * 0.06);
    ctx.fillText('  --transport http', cx + 54, cy + h * 0.105);
    ctx.fillStyle = '#9fb0ff';
    ctx.fillText('  https://summit.exa.ai/mcp', cx + 54, cy + h * 0.15);
    // tools
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${h * 0.032}px ${FONT}`;
    ctx.fillText('Tools your agent gets', w * 0.05, h * 0.79);
    const tools = ['search_sessions', 'find_speaker', 'get_agenda', 'where_is', 'recommend_talks'];
    let tx = w * 0.05;
    ctx.font = `600 ${h * 0.026}px ${MONO}`;
    for (const t of tools) {
      const tw = ctx.measureText(t).width + 30;
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      roundRect(ctx, tx, h * 0.82, tw, h * 0.055, h * 0.027);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText(t, tx + 15, h * 0.857);
      tx += tw + 12;
    }
    // chat mock on the right
    const px = w * 0.66,
      pw = w * 0.3;
    ctx.fillStyle = '#fff';
    roundRect(ctx, px, h * 0.2, pw, h * 0.66, 18);
    ctx.fill();
    ctx.fillStyle = '#eef1ff';
    roundRect(ctx, px + 20, h * 0.25, pw - 40, h * 0.1, 12);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.font = `600 ${h * 0.024}px ${FONT}`;
    wrapText(ctx, 'What should I see after lunch if I care about evals?', px + 34, h * 0.29, pw - 70, h * 0.032);
    ctx.fillStyle = BLUE;
    ctx.font = `600 ${h * 0.02}px ${MONO}`;
    ctx.fillText('→ search_sessions("evals", after 13:00)', px + 24, h * 0.4);
    ctx.fillStyle = '#5b6280';
    ctx.fillText('  3 results · 187ms', px + 24, h * 0.43);
    ['Benchmarking search for agents', 'Sub-page crawls vs. hallucinations', 'One search instead of five'].forEach((t, i) => {
      const y = h * 0.47 + i * h * 0.12;
      ctx.strokeStyle = '#dfe3f5';
      ctx.lineWidth = 2;
      roundRect(ctx, px + 20, y, pw - 40, h * 0.1, 10);
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.font = `700 ${h * 0.024}px ${FONT}`;
      ctx.fillText(t, px + 34, y + h * 0.04);
      ctx.fillStyle = '#5b6280';
      ctx.font = `500 ${h * 0.019}px ${FONT}`;
      ctx.fillText(['13:30 · Revolut · The Gallery', '14:15 · WhyHow.AI · The Sanctuary', '14:15 · CodeRabbit · The Gallery'][i], px + 34, y + h * 0.075);
    });
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${h * 0.03}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('Try it at the kiosk ↓', px + pw / 2, h * 0.93);
    ctx.textAlign = 'left';
  },

  workshopBackdrop(ctx, w, h) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    networkPattern(ctx, w, h, 'rgba(33,65,234,0.14)', 50);
    drawLogo(ctx, w * 0.06, h * 0.2, h * 0.6, BLUE);
    ctx.fillStyle = BLUE;
    ctx.font = `600 ${h * 0.09}px ${FONT}`;
    ctx.fillText('WORKSHOP', w * 0.06 + h * 0.6, h * 0.36);
    ctx.fillStyle = INK;
    ctx.font = `800 ${h * 0.15}px ${FONT}`;
    ctx.fillText('Build agents', w * 0.06 + h * 0.6, h * 0.56);
    ctx.fillText('with Exa', w * 0.06 + h * 0.6, h * 0.74);
  },

  stageBackdrop(ctx, w, h) {
    blueGradient(ctx, w, h);
    networkPattern(ctx, w, h, 'rgba(255,255,255,0.08)', 120);
    // left third: mark + event name (the LED screen covers the middle)
    const zl = w * 0.03;
    const zr = w * 0.3;
    const lh = h * 0.42;
    drawLogo(ctx, (zl + zr) / 2 - (lh * LOGO_ASPECT) / 2, h * 0.1, lh, '#fff');
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    let fs = h * 0.12;
    ctx.font = `800 ${fs}px ${FONT}`;
    while (ctx.measureText(EVENT.name.toUpperCase()).width > zr - zl) {
      fs *= 0.95;
      ctx.font = `800 ${fs}px ${FONT}`;
    }
    ctx.fillText(EVENT.name.toUpperCase(), (zl + zr) / 2, h * 0.68);
    ctx.font = `500 ${fs * 0.7}px ${FONT}`;
    ctx.fillText(EVENT.year, (zl + zr) / 2, h * 0.68 + fs * 0.95);
    // right third: tagline
    ctx.textAlign = 'right';
    ctx.font = `800 ${h * 0.1}px ${FONT}`;
    ctx.fillText("The world's data", w * 0.97, h * 0.4);
    ctx.fillText('for AI agents.', w * 0.97, h * 0.53);
    ctx.font = `500 ${h * 0.045}px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText('Shack15 · San Francisco', w * 0.97, h * 0.66);
    ctx.textAlign = 'left';
  },

  slide(i) {
    return (ctx, w, h) => {
      ctx.fillStyle = i % 2 ? '#fff' : '#0b1340';
      ctx.fillRect(0, 0, w, h);
      const fg = i % 2 ? INK : '#fff';
      const acc = i % 2 ? BLUE : '#9fb0ff';
      if (i === 0) {
        networkPattern(ctx, w, h, 'rgba(120,150,255,0.14)', 50);
        eventLockup(ctx, w / 2, h * 0.42, h * 0.22, '#fff');
        centerText(ctx, 'Opening keynote · The search engine for AIs', w / 2, h * 0.8, h * 0.05, 500, 'rgba(255,255,255,0.8)');
      } else if (i === 1) {
        centerText(ctx, '100 billion', w / 2, h * 0.42, h * 0.22, 900, BLUE);
        centerText(ctx, "documents served in the world's largest independent index", w / 2, h * 0.66, h * 0.05, 500, fg);
        centerText(ctx, '2 trillion URLs tracked · billions crawled every day', w / 2, h * 0.76, h * 0.04, 500, '#5b6280');
      } else if (i === 2) {
        centerText(ctx, 'Agents read the web', w / 2, h * 0.3, h * 0.09, 800, fg);
        centerText(ctx, 'differently than people do.', w / 2, h * 0.43, h * 0.09, 800, acc);
        ['Search the largest index of public web data', 'Token-efficient contents with highlights', 'Structured outputs with grounded citations'].forEach((t, k) => centerText(ctx, '·  ' + t, w / 2, h * (0.62 + k * 0.09), h * 0.05, 500, fg));
      } else {
        centerText(ctx, 'Introducing Exa 3.0', w / 2, h * 0.38, h * 0.12, 900, fg);
        centerText(ctx, 'Exa leads across benchmarks', w / 2, h * 0.56, h * 0.06, 500, acc);
        centerText(ctx, 'Low-latency to deep research in one API', w / 2, h * 0.68, h * 0.045, 500, 'rgba(255,255,255,0.75)');
      }
      drawLogo(ctx, w * 0.03, h * 0.05, h * 0.07, i % 2 ? BLUE : '#fff');
    };
  },

  salonBackdrop(ctx, w, h) {
    ctx.fillStyle = '#eef1ff';
    ctx.fillRect(0, 0, w, h);
    // diagonal blue band
    ctx.fillStyle = BLUE;
    ctx.beginPath();
    ctx.moveTo(w * 0.45, 0);
    ctx.lineTo(w, 0);
    ctx.lineTo(w, h);
    ctx.lineTo(w * 0.3, h);
    ctx.fill();
    networkPattern(ctx, w, h, 'rgba(33,65,234,0.15)', 60);
    ctx.fillStyle = INK;
    ctx.font = `800 ${h * 0.095}px ${FONT}`;
    ctx.fillText('Imagine a world', w * 0.04, h * 0.35);
    ctx.fillStyle = BLUE;
    ctx.fillText('with perfect search.', w * 0.04, h * 0.5);
    ctx.fillStyle = INK;
    ctx.font = `500 ${h * 0.05}px ${FONT}`;
    ctx.fillText('Then come find the goats →', w * 0.04, h * 0.68);
    drawLogo(ctx, w * 0.62, h * 0.15, h * 0.7, '#fff');
  },

  doorSign(ctx, w, h) {
    ctx.fillStyle = BLUE;
    ctx.fillRect(0, 0, w, h);
    centerText(ctx, 'AFTER PARTY · BAY TERRACE  →', w / 2, h * 0.42, h * 0.36, 800);
    centerText(ctx, 'goats · drinks · photos', w / 2, h * 0.8, h * 0.18, 500, 'rgba(255,255,255,0.85)');
  },

  corridorBanner(i) {
    return (ctx, w, h) => {
      const blue = i % 2 === 0;
      ctx.fillStyle = blue ? BLUE : '#fff';
      ctx.fillRect(0, 0, w, h);
      const fg = blue ? '#fff' : BLUE;
      drawLogo(ctx, w * 0.2, h * 0.08, w * 0.6 / LOGO_ASPECT * 0.75, fg);
      const lines = [['EXA', 'SUMMIT', EVENT.year], ['THE', "WORLD'S", 'DATA'], ['FOR AI', 'AGENTS', ''], ['900K+', 'DEVS', 'BUILDING']][i % 4];
      lines.forEach((l, k) => centerText(ctx, l, w / 2, h * (0.52 + k * 0.12), w * 0.17, 800, fg));
    };
  },

  liveCounter(searches, urls, t) {
    return (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#0b1340');
      g.addColorStop(1, '#101c5c');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(120,150,255,0.25)';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, w - 20, h - 20);
      // header
      const on = Math.sin(t * 5) > -0.2;
      ctx.fillStyle = on ? '#ff4d6d' : 'rgba(255,77,109,0.35)';
      ctx.beginPath();
      ctx.arc(w * 0.045, h * 0.13, h * 0.025, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `800 ${h * 0.06}px ${FONT}`;
      ctx.fillText('LIVE ON EXA TODAY', w * 0.065, h * 0.15);
      drawWordmark(ctx, w * 0.86, h * 0.08, h * 0.08, '#fff');
      const col = (x, value, label) => {
        ctx.fillStyle = '#ffffff';
        let fs = h * 0.27;
        ctx.font = `700 ${fs}px ${MONO}`;
        while (ctx.measureText(value).width > w * 0.43) {
          fs *= 0.96;
          ctx.font = `700 ${fs}px ${MONO}`;
        }
        ctx.fillText(value, x, h * 0.58);
        ctx.fillStyle = '#9fb0ff';
        ctx.font = `600 ${h * 0.065}px ${FONT}`;
        ctx.fillText(label, x, h * 0.72);
      };
      col(w * 0.045, searches.toLocaleString('en-US'), 'Searches completed today');
      col(w * 0.53, urls.toLocaleString('en-US'), 'URLs crawled today');
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(20, h * 0.8, w - 40, 2);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = `500 ${h * 0.05}px ${FONT}`;
      ctx.fillText("100 billion documents in the world's largest independent index · 2 trillion URLs tracked · 900,000+ developers", w * 0.045, h * 0.9);
    };
  },

  quoteCard(qt) {
    return (ctx, w, h) => {
      ctx.fillStyle = '#0d1330';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = BLUE;
      ctx.fillRect(0, 0, w * 0.018, h);
      ctx.fillStyle = BLUE;
      ctx.font = `900 ${h * 0.32}px Georgia, serif`;
      ctx.fillText('\u201C', w * 0.06, h * 0.32);
      ctx.fillStyle = '#fff';
      let fs = h * 0.085;
      ctx.font = `600 ${fs}px ${FONT}`;
      // shrink long quotes to fit 5 lines
      const fits = () => {
        const words = qt.q.split(' ');
        let lines = 1;
        let line = '';
        for (const wd of words) {
          const test = line ? line + ' ' + wd : wd;
          if (ctx.measureText(test).width > w * 0.84 && line) {
            lines++;
            line = wd;
          } else line = test;
        }
        return lines * fs * 1.28 < h * 0.56;
      };
      while (!fits() && fs > h * 0.05) {
        fs *= 0.94;
        ctx.font = `600 ${fs}px ${FONT}`;
      }
      wrapText(ctx, qt.q, w * 0.08, h * 0.3, w * 0.84, fs * 1.28);
      ctx.fillStyle = '#fff';
      ctx.font = `800 ${h * 0.065}px ${FONT}`;
      ctx.fillText(qt.who, w * 0.08, h * 0.86);
      ctx.fillStyle = '#9fb0ff';
      ctx.font = `500 ${h * 0.05}px ${FONT}`;
      ctx.fillText(qt.role, w * 0.08, h * 0.93);
      drawLogo(ctx, w * 0.88, h * 0.82, h * 0.1, 'rgba(255,255,255,0.5)');
    };
  },

  deskFront(title, sub, kind) {
    return (ctx, w, h) => {
      ctx.fillStyle = kind === 'coffee' ? '#0d1330' : BLUE;
      ctx.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 12) for (let y = 0; y < h; y += 12) {
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(x, y, 3, 3);
      }
      drawLogo(ctx, w * 0.05, h * 0.26, h * 0.48, '#fff');
      ctx.fillStyle = kind === 'coffee' ? '#9fb0ff' : 'rgba(255,255,255,0.8)';
      ctx.font = `700 ${h * 0.14}px ${FONT}`;
      ctx.fillText(title.toUpperCase(), w * 0.05 + h * 0.5, h * 0.42);
      ctx.fillStyle = '#fff';
      let fs = h * 0.26;
      ctx.font = `800 ${fs}px ${FONT}`;
      while (ctx.measureText(sub).width > w * 0.9 - h * 0.5) {
        fs *= 0.95;
        ctx.font = `800 ${fs}px ${FONT}`;
      }
      ctx.fillText(sub, w * 0.05 + h * 0.5, h * 0.42 + fs * 1.05);
      if (kind !== 'coffee') {
        ctx.fillStyle = '#ff4d6d';
        ctx.beginPath();
        ctx.arc(w * 0.93, h * 0.3, h * 0.05, 0, Math.PI * 2);
        ctx.fill();
      }
    };
  },

  // Product demo monitors on the café demo desks. `step` animates the screen.
  demoScreen(kind, step = 0) {
    return (ctx, w, h) => {
      ctx.fillStyle = '#0b1036';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#141a4a';
      ctx.fillRect(0, 0, w, h * 0.12);
      drawWordmark(ctx, w * 0.03, h * 0.03, h * 0.06, '#fff');
      ctx.fillStyle = '#9fb0ff';
      ctx.font = `600 ${h * 0.045}px ${FONT}`;
      ctx.textAlign = 'right';
      ctx.fillText(kind === 'search' ? 'API Playground · Search' : 'Websets', w * 0.97, h * 0.08);
      ctx.textAlign = 'left';
      if (kind === 'search') {
        const q = 'latest open-weight LLM releases';
        const typed = q.slice(0, Math.min(q.length, step * 8));
        ctx.fillStyle = '#fff';
        roundRect(ctx, w * 0.03, h * 0.17, w * 0.7, h * 0.1, 10);
        ctx.fill();
        ctx.fillStyle = INK;
        ctx.font = `500 ${h * 0.05}px ${FONT}`;
        ctx.fillText(typed + (step % 2 && typed.length < q.length ? '|' : ''), w * 0.05, h * 0.237);
        ctx.fillStyle = BLUE;
        roundRect(ctx, w * 0.75, h * 0.17, w * 0.22, h * 0.1, 10);
        ctx.fill();
        centerText(ctx, 'Highlights ON', w * 0.86, h * 0.22, h * 0.042, 700);
        const rows = [
          ['Open-Weight LLM Models: Live Ranking', 'open-llm-radar.com'],
          ['Open-Source LLM Leaderboard 2026', 'lmmarketcap.com'],
          ['New and trending LLMs', 'llmbenchmark.ai'],
          ['New LLM Models, Tracked Live', 'modelgrep.com'],
        ];
        const shown = Math.max(0, step - 4);
        rows.slice(0, shown).forEach(([t, u], i) => {
          const y = h * 0.33 + i * h * 0.15;
          ctx.fillStyle = 'rgba(255,255,255,0.06)';
          roundRect(ctx, w * 0.03, y, w * 0.94, h * 0.13, 8);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = `700 ${h * 0.045}px ${FONT}`;
          ctx.fillText(t, w * 0.05, y + h * 0.055);
          ctx.fillStyle = '#7CFFB2';
          ctx.font = `500 ${h * 0.035}px ${MONO}`;
          ctx.fillText(u, w * 0.05, y + h * 0.1);
        });
        if (shown >= 4) {
          ctx.fillStyle = '#7CFFB2';
          ctx.font = `800 ${h * 0.05}px ${FONT}`;
          ctx.textAlign = 'right';
          ctx.fillText('↓ 77% tokens', w * 0.97, h * 0.97);
          ctx.textAlign = 'left';
        }
      } else {
        ctx.fillStyle = '#fff';
        ctx.font = `700 ${h * 0.05}px ${FONT}`;
        ctx.fillText('Aerospace companies → enrich: CEO, founded', w * 0.03, h * 0.22);
        const cols = [w * 0.03, w * 0.4, w * 0.76];
        ctx.fillStyle = '#9fb0ff';
        ctx.font = `700 ${h * 0.038}px ${FONT}`;
        ['COMPANY', 'CEO', 'FOUNDED'].forEach((c, i) => ctx.fillText(c, cols[i], h * 0.32));
        const rows = [['GE Aerospace', 'Larry Culp', '1892'], ['RTX', 'Christopher T. Calio', '2020'], ['Boeing', 'Kelly Ortberg', '1916']];
        rows.slice(0, Math.min(3, step)).forEach((r, i) => {
          const y = h * 0.36 + i * h * 0.14;
          ctx.fillStyle = 'rgba(255,255,255,0.06)';
          ctx.fillRect(w * 0.02, y, w * 0.96, h * 0.12);
          ctx.fillStyle = '#fff';
          ctx.font = `600 ${h * 0.045}px ${FONT}`;
          r.forEach((c, k) => ctx.fillText(c, cols[k], y + h * 0.08));
          ctx.fillStyle = '#7CFFB2';
          ctx.fillText('✓', w * 0.93, y + h * 0.08);
        });
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = `500 ${h * 0.04}px ${FONT}`;
        ctx.fillText(step >= 3 ? 'Structured enrichments across 70M+ companies' : 'Verifying criteria…', w * 0.03, h * 0.95);
      }
    };
  },

  // ---------------- Outdoor ----------------
  drinkMenu(drinks) {
    return (ctx, w, h) => {
      ctx.fillStyle = '#0b1340';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 4;
      ctx.strokeRect(14, 14, w - 28, h - 28);
      drawLogo(ctx, w / 2 - h * 0.035, h * 0.04, h * 0.09, '#fff');
      centerText(ctx, 'THE EXA-ITED BAR', w / 2, h * 0.19, h * 0.06, 800);
      centerText(ctx, 'signature cocktails & zero-proof', w / 2, h * 0.245, h * 0.028, 500, '#9fb0ff');
      drinks.forEach((d, i) => {
        const y = h * 0.32 + i * h * 0.083;
        ctx.textAlign = 'left';
        ctx.fillStyle = d.na ? '#7CFFB2' : '#fff';
        ctx.font = `700 ${h * 0.034}px ${FONT}`;
        ctx.fillText(d.name, w * 0.08, y);
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.font = `500 ${h * 0.022}px ${FONT}`;
        ctx.fillText(d.short, w * 0.08, y + h * 0.032);
      });
    };
  },

  barSign(ctx, w, h) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.font = `800 ${h * 0.55}px ${FONT}`;
    ctx.fillStyle = BLUE;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Exa-ited!', w / 2, h * 0.55);
  },

  goatSign(ctx, w, h) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = BLUE;
    ctx.fillRect(0, 0, w, h * 0.12);
    centerText(ctx, 'GOAT PETTING ZOO', w / 2, h * 0.3, h * 0.13, 900, BLUE);
    centerText(ctx, 'Meet the G.O.A.T.s of search', w / 2, h * 0.47, h * 0.07, 600, INK);
    ctx.font = `500 ${h * 0.055}px ${FONT}`;
    ctx.fillStyle = '#4a5070';
    ['Pet gently · No feeding badges', 'Get your goat photo at the booth'].forEach((t, i) => {
      ctx.textAlign = 'center';
      ctx.fillText(t, w / 2, h * (0.66 + i * 0.1));
    });
    ctx.textAlign = 'left';
    centerText(ctx, '🐐', w * 0.1, h * 0.88, h * 0.12, 400);
    centerText(ctx, '🐐', w * 0.9, h * 0.88, h * 0.12, 400);
  },

  photoBackdrop(ctx, w, h) {
    blueGradient(ctx, w, h);
    // repeating step-and-repeat logos
    for (let y = 0; y < h; y += h / 6) {
      for (let x = ((y / (h / 6)) % 2) * (w / 16); x < w; x += w / 8) {
        drawLogo(ctx, x + w * 0.02, y + h * 0.03, h * 0.09, 'rgba(255,255,255,0.18)');
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    roundRect(ctx, w * 0.2, h * 0.08, w * 0.6, h * 0.2, 20);
    ctx.fill();
    centerText(ctx, 'GOAT OF ALL TIME', w / 2, h * 0.15, h * 0.07, 900, BLUE);
    centerText(ctx, `${EVENT.name} ${EVENT.year} · After party`, w / 2, h * 0.23, h * 0.035, 600, INK);
  },

  djFront(ctx, w, h) {
    ctx.fillStyle = '#0b1340';
    ctx.fillRect(0, 0, w, h);
    drawWordmark(ctx, w * 0.3, h * 0.25, h * 0.5, '#fff');
  },

  samplePhoto(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#2b4cff');
    g.addColorStop(1, '#1630b8');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f5efe3';
    // simple goat silhouette
    ctx.beginPath();
    ctx.ellipse(w * 0.55, h * 0.62, w * 0.2, h * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(w * 0.33, h * 0.42, w * 0.07, h * 0.08, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(w * 0.4, h * 0.72, w * 0.03, h * 0.18);
    ctx.fillRect(w * 0.66, h * 0.72, w * 0.03, h * 0.18);
    ctx.fillStyle = '#ffd7a8';
    ctx.beginPath();
    ctx.arc(w * 0.78, h * 0.32, h * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(w * 0.72, h * 0.4, w * 0.12, h * 0.5);
  },
};
