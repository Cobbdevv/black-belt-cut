/* Black Belt Cut — stat ranks (F- to S+), rank trials, technique list, weekly quests. Pure logic, no DOM. */
(function (root) {
  'use strict';
  const BB = root.BB;

  const RANKS = ['F-', 'F', 'F+', 'E-', 'E', 'E+', 'D-', 'D', 'D+', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+', 'S-', 'S', 'S+'];
  const rankName = (i) => RANKS[Math.max(0, Math.min(20, i))];
  const rankIdx = (name) => Math.max(0, RANKS.indexOf(name));
  const tierOf = (i) => rankName(i)[0];

  // Strength counts the weight you push, not just the reps, so a heavy body gets credit for the load it lifts and losing weight alone never raises it.
  // A full push-up lifts about 64% of your body weight and a knee push-up about 49%. Your reps at that load give a one-rep max (Epley), and the
  // result is the full push-ups at 75 kg that take the same strength. At 75 kg, full push-ups count as themselves.
  const PUSH_LOAD = { full: 0.64, knee: 0.49 };
  const REF_KG = 75;
  const loadOf = (style, bw) => PUSH_LOAD[style === 'knee' ? 'knee' : 'full'] * (bw || REF_KG);
  function pushEq(reps, style, bw) {
    return reps > 0 ? Math.max(0, Math.round(30 * (loadOf(style, bw) * (1 + reps / 30) / loadOf('full', REF_KG) - 1) * 10) / 10) : 0;
  }
  // The fewest push-ups of one style at one weight that count for at least this many at 75 kg.
  function repsFor(eq, style, bw) {
    let n = Math.max(1, Math.ceil(30 * (loadOf('full', REF_KG) * (1 + eq / 30) / loadOf(style, bw) - 1)));
    while (n > 1 && pushEq(n - 1, style, bw) >= eq) n--;
    while (pushEq(n, style, bw) < eq) n++;
    return n;
  }

  // Thresholds: the minimum result for each of the 21 ranks. Up to A- they are population-based: C is roughly average for an
  // 18-25-year-old man, A is athletic. Above that the scale is his own: S+ is the peak Claude projected for him on 2026-10-16,
  // and the steps shrink on the way up, because every gain gets harder near your peak. Reaching S+ means a new peak: ranks above it come next.
  const PEAKS = { str: 60, dur: 300, spd: 54, end: 70 };
  const TOP_GAPS = [0.24, 0.22, 0.2, 0.18, 0.16];
  function toPeak(pop, peak, step) {
    const out = pop.slice(0, 16), from = pop[15];
    let v = from;
    TOP_GAPS.forEach((g) => { v += g * (peak - from); out.push(Math.round(v / step) * step); });
    return out;
  }
  const PUSH_TH = toPeak([0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 21, 24, 27, 30, 34, 38], PEAKS.str, 1);
  const TESTS = {
    str: { code: 'STR', name: 'Strength', test: 'Max push-ups', unit: 'push-ups at 75 kg', guide: 'pushup',
      how: 'Full push-ups if you can do 5 or more, otherwise on your knees. One set, no rest at the top. Chest to a fist\'s height from the floor, arms fully straight at the top. Stop when your form breaks. Your body weight is counted, so either style is fair.',
      th: PUSH_TH },
    dur: { code: 'DUR', name: 'Durability', test: 'Max plank hold', unit: 's', guide: 'plank',
      how: 'Forearm plank, body in one straight line. Stop the clock when your hips sag or rise. A strong brace is what absorbs hits.',
      th: toPeak([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 115, 130, 145, 160, 180], PEAKS.dur, 5) },
    spd: { code: 'SPD', name: 'Speed', test: 'Kicks in 30 seconds', unit: 'kicks', guide: 'roundhouse',
      how: 'Roundhouse kicks to at least waist height, alternating legs, each one retracted back to stance. Count out loud or film it.',
      th: toPeak([0, 6, 10, 14, 17, 20, 22, 24, 26, 28, 30, 33, 36, 39, 42, 45], PEAKS.spd, 1) },
    end: { code: 'END', name: 'Endurance', test: 'Burpees in 3 minutes', unit: 'burpees', guide: 'burpee',
      how: 'Squat, hands down, back to a plank, back up, stand tall. Step back instead of jumping if your knees or wrists need it, but use the same style every trial.',
      th: toPeak([0, 5, 10, 14, 18, 21, 24, 27, 30, 34, 38, 42, 46, 50, 54, 58], PEAKS.end, 1) },
  };
  const TEST_KEYS = ['str', 'dur', 'spd', 'end'];
  const STAT_KEYS = ['str', 'dur', 'spd', 'end', 'tec', 'wil', 'pot'];
  const STAT_INFO = {
    str: { code: 'STR', name: 'Strength' }, dur: { code: 'DUR', name: 'Durability' }, spd: { code: 'SPD', name: 'Speed' },
    end: { code: 'END', name: 'Endurance' }, tec: { code: 'TEC', name: 'Technique' }, wil: { code: 'WIL', name: 'Willpower' },
    pot: { code: 'POT', name: 'Potential' },
  };
  const DEFAULT_ESTIMATES = { str: 'C-', dur: 'D+', spd: 'C', end: 'D-', tec: 'D+' };
  const POT_BASE = 16; // A: 18 years old, 2.5 years of martial arts, and a lot of room above your current numbers.

  // 20 techniques, easiest first. Each one mastered is one rank step: 0 = F-, 20 = S+.
  const TECH_GUIDES = ['boxing', 'jab', 'cross', 'hook', 'uppercut', 'front-kick', 'roundhouse', 'side-kick', 'teep', 'footwork', 'slip-roll', 'combo',
    'switch-kick', 'axe-kick', 'back-kick', 'high-roundhouse', 'spin-hook', 'jump-front-kick', 'tornado', '540-kick'];
  const TECHNIQUES = [
    ['Stance and guard', '3 minutes of light shadowboxing with your hands at your chin the whole time.'],
    ['Jab', '20 jabs at full extension, snapping straight back to your chin.'],
    ['Cross', '20 crosses: rear heel turns out, hips rotate, chin stays tucked.'],
    ['Lead hook', '20 hooks with the elbow at shoulder height and the lead foot pivoting.'],
    ['Rear uppercut', '20 uppercuts driven up from the knees and hips, with no wind-up.'],
    ['Front kick', 'Knee up, snap out, pull back to the chamber. 10 per leg at waist height without losing balance.'],
    ['Roundhouse kick', 'Standing foot pivots and hips turn over. 10 per leg at waist height, landing back in stance.'],
    ['Side kick', 'Heel leads, with hip, knee and heel in one line. 10 per leg at waist height.'],
    ['Push kick (teep)', 'Ball of the foot, hips forward, straight back to stance. 10 per leg.'],
    ['Footwork', '2 minutes moving forward, back and sideways without crossing your feet or narrowing your stance.'],
    ['Slip and roll', '3 rounds of 1 minute slipping jabs and rolling under hooks, eyes forward the whole time.'],
    ['Jab, cross, hook, low kick', '10 smooth reps with no pause between strikes and hands back to guard after each.'],
    ['Switch kick', 'A quick switch of stance, then a lead-leg roundhouse. 10 per side.'],
    ['Axe kick', 'Leg rises straight and drops heel-first. 10 per leg at chest height.'],
    ['Back kick', 'Turn, look over your shoulder, drive the heel straight back. 10 per leg, landing in stance.'],
    ['Head-height roundhouse', '5 per leg at head height, controlled and balanced.'],
    ['Spinning hook kick', '5 per side at head height, landing back in stance.'],
    ['Jumping front kick', '5 clean reps, landing balanced.'],
    ['Tornado kick', '5 clean 360° roundhouse kicks, landing balanced.'],
    ['540 kick', '3 clean reps, landing on the kicking leg.'],
  ].map((t, i) => ({ i, name: t[0], std: t[1], jump: i >= 16, guide: TECH_GUIDES[i] || null }));

  function indexFor(th, v) { let i = 0; for (let k = 0; k < th.length; k++) if (v >= th[k]) i = k; return i; }
  // One result's strength. New results carry their reps, style and body weight, and the score is worked out again from those, so a better
  // formula never leaves old results behind. Older results were plain push-up counts and count as full push-ups at 75 kg.
  function strOf(r) {
    if (!r || typeof r.str !== 'number') return null;
    if (r.strStyle && r.strReps != null) return { eq: pushEq(r.strReps, r.strStyle, r.strBw), reps: r.strReps, style: r.strStyle, bw: r.strBw || null };
    return { eq: r.str, reps: r.str, style: 'full', bw: null };
  }
  // The four results of one trial, with strength as push-ups at 75 kg and the push-ups actually done alongside.
  function testValues(r) {
    const v = {};
    TEST_KEYS.forEach((k) => { if (r && typeof r[k] === 'number') v[k] = r[k]; });
    const s = strOf(r);
    if (s) { v.str = s.eq; v.strFrom = s; }
    return v;
  }
  const pushText = (s) => s.reps + (s.style === 'knee' ? ' knee' : '') + ' push-ups' + (s.bw ? ' at ' + Math.round(s.bw * 10) / 10 + ' kg' : '');
  const strText = (s) => pushText(s) + (s.bw && !(s.style === 'full' && s.bw === REF_KG) ? ' = ' + s.eq + ' at ' + REF_KG + ' kg' : '');
  function bestTests(r) {
    const best = {};
    ((r && r.tests) || []).forEach((t) => {
      const v = testValues(t);
      TEST_KEYS.forEach((k) => { if (v[k] != null && (best[k] == null || v[k] > best[k])) { best[k] = v[k]; if (k === 'str') best.strFrom = strOf(t); } });
    });
    return best;
  }
  // Willpower: last 28 complete days (fewer early on). 60% good eating days, 40% workouts done vs 3 a week. Ranked after 7 days.
  function willpower(data, today) {
    const p = data.profile;
    if (!p || !p.startDate) return { index: null, days: 0 };
    const span = Math.min(28, BB.daysBetween(p.startDate, today));
    if (span < 7) return { index: null, days: Math.max(0, span) };
    const from = BB.addDays(today, -span), end = BB.addDays(today, -1);
    const act = BB.activeHabits(p.levers);
    let good = 0;
    for (let d = from; d <= end; d = BB.addDays(d, 1)) if (BB.isGoodDay((data.habits || {})[d], act)) good++;
    const sessions = (data.sessions || []).filter((s) => s.date >= from && s.date <= end).length;
    const eat = good / span, train = Math.min(1, sessions / (3 * span / 7));
    const score = 0.6 * eat + 0.4 * train;
    return { index: Math.min(20, Math.floor(score * 20 + 1e-9)), days: span, eat, train, score };
  }
  function questClears(data) { return Object.values(data.quests || {}).filter((q) => q && q.cleared).length; }
  function statState(data, today) {
    const r = data.ranks || {};
    const est = Object.assign({}, DEFAULT_ESTIMATES, r.estimates);
    const best = bestTests(r);
    const out = {};
    TEST_KEYS.forEach((k) => {
      const th = TESTS[k].th;
      if (best[k] != null) {
        const i = indexFor(th, best[k]);
        out[k] = { index: i, source: 'test', value: best[k], next: i < 20 ? { rank: rankName(i + 1), need: th[i + 1] } : null,
          progress: i < 20 ? (best[k] - th[i]) / (th[i + 1] - th[i]) : 1 };
      } else {
        const i = rankIdx(est[k]);
        out[k] = { index: i, source: 'estimate', value: th[i], next: null, progress: 0 };
      }
    });
    // Quests are counted in push-ups: the ones you did on your best trial, or the push-ups your estimate stands for.
    const sf = best.strFrom;
    if (sf) {
      out.str.from = sf; out.str.reps = sf.reps;
      if (out.str.next && sf.bw) out.str.next.reps = repsFor(out.str.next.need, sf.style, sf.bw);
    } else out.str.reps = PUSH_TH[out.str.index];
    const tech = r.tech || {};
    if (tech.assessed) {
      const n = Math.min(20, (tech.mastered || []).length);
      out.tec = { index: n, source: 'checklist', value: n, next: n < 20 ? { rank: rankName(n + 1), need: n + 1 } : null, progress: 0 };
    } else out.tec = { index: rankIdx(est.tec), source: 'estimate', value: null, next: null, progress: 0 };
    const w = willpower(data, today);
    out.wil = w.index == null ? { index: null, source: 'measuring', days: w.days } : { index: w.index, source: 'auto', eat: w.eat, train: w.train, score: w.score };
    const clears = questClears(data);
    const pi = Math.min(20, POT_BASE + Math.floor(clears / 4));
    out.pot = { index: pi, source: 'quests', clears, toNext: pi < 20 ? 4 - (clears % 4) : 0 };
    const core = ['str', 'dur', 'spd', 'end', 'tec'].map((k) => out[k].index).concat(out.wil.index == null ? [] : [out.wil.index]);
    out.overall = Math.floor(core.reduce((a, b) => a + b, 0) / core.length + 1e-9);
    return out;
  }

  // ---------- Weekly quests ----------
  const fmtTime = (s) => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  function nextTechnique(data) {
    const done = ((data.ranks || {}).tech || {}).mastered || [];
    return TECHNIQUES.find((t) => !done.includes(t.i)) || TECHNIQUES[TECHNIQUES.length - 1];
  }
  const TEMPLATES = {
    end(st) {
      const v = Math.max(10, st.end.value), n = Math.min(10, 6 + Math.floor(st.end.index / 4));
      const b = Math.max(3, Math.round(v / 8)), sq = 50 + 5 * st.end.index;
      return { title: 'Fighter\'s Gauntlet', text: 'A long fight, not a sprint. No skipped rounds.', objectives: [
        { id: 'rounds', text: n + ' rounds: 2 min shadowboxing, then ' + b + ' burpees. 30 s rest between rounds.', target: n, unit: 'rounds', timer: { work: 120, rest: 30, rounds: n }, guides: ['boxing', 'burpee'] },
        { id: 'squats', text: sq + ' squats for time, straight after the last round', target: sq, unit: 'squats', step: [5, 10], guides: ['squat'] }] };
    },
    str(st) {
      const v = Math.max(8, st.str.reps), push = Math.max(30, 5 * v), sq = Math.round((push * 1.5) / 5) * 5;
      return { title: 'Hundred Hands', text: 'Finish inside 40 minutes. Split the sets however you need.', objectives: [
        { id: 'push', text: push + ' push-ups, any variation from your level', target: push, unit: 'push-ups', step: [1, 5], guides: ['pushup'] },
        { id: 'rows', text: push + ' doorframe rows', target: push, unit: 'rows', step: [1, 5], guides: ['door-row'] },
        { id: 'squats', text: sq + ' squats', target: sq, unit: 'squats', step: [5, 10], guides: ['squat'] }] };
    },
    dur(st) {
      const v = Math.max(30, st.dur.value);
      const plank = Math.round(Math.max(180, 5 * v) / 10) * 10, wall = Math.round(Math.max(120, 3 * v) / 10) * 10, side = Math.round(Math.max(60, 1.5 * v) / 10) * 10;
      return { title: 'Iron Body', text: 'Total time under tension. Rest whenever you need; only the holds count.', objectives: [
        { id: 'plank', text: fmtTime(plank) + ' of plank in total', target: plank, unit: 's', step: [10, 30], guides: ['plank'] },
        { id: 'wall', text: fmtTime(wall) + ' of wall sit in total', target: wall, unit: 's', step: [10, 30], guides: ['wall-sit'] },
        { id: 'side', text: fmtTime(side) + ' of side plank on each side', target: side * 2, unit: 's, both sides', step: [10, 30], guides: ['side-plank'] }] };
    },
    spd(st) {
      const need = Math.ceil(Math.max(16, st.spd.value) * 0.8);
      return { title: 'Lightning Drills', text: 'Every round at full speed. A round under the target gets repeated.', objectives: [
        { id: 'kicks', text: '10 rounds: 30 s of max-speed kicks, at least ' + need + ' per round. 30 s rest.', target: 10, unit: 'rounds', timer: { work: 30, rest: 30, rounds: 10 }, guides: ['roundhouse'] },
        { id: 'punch', text: '10 rounds: 10 s of all-out punches, 20 s rest', target: 10, unit: 'rounds', timer: { work: 10, rest: 20, rounds: 10 }, guides: ['speed-punches'] }] };
    },
    tec(st, data) {
      const t = nextTechnique(data);
      return { title: 'Form Mastery', text: 'Technique: ' + t.name + '. Standard: ' + t.std, technique: t.i, objectives: [
        { id: 'drill', text: '5 rounds of 3 min drilling it: 3 rounds slow, 2 at full speed. 1 min rest.', target: 5, unit: 'rounds', timer: { work: 180, rest: 60, rounds: 5 }, guides: t.guide ? [t.guide] : [] },
        { id: 'reps', text: '100 clean reps in total, both sides', target: 100, unit: 'reps', step: [5, 10], guides: t.guide ? [t.guide] : [] },
        { id: 'film', text: 'Film 3 reps and check them against the standard', target: 1, unit: 'check', guides: [] }] };
    },
  };
  // The boss week: every stat in one session, scaled from your results.
  TEMPLATES.gate = (st) => {
    const push = Math.max(6, Math.round(st.str.reps * 0.5)), plank = Math.max(30, Math.round(st.dur.value * 0.5 / 5) * 5);
    const kicks = Math.max(10, Math.round(st.spd.value * 0.8)), burp = Math.max(5, Math.round(st.end.value / 5));
    return { title: 'Red Gate', text: 'The boss of the cycle. Every stat gets tested in one session. Rest only between rounds.', objectives: [
      { id: 'circuit', text: '5 rounds: ' + push + ' push-ups, ' + fmtTime(plank) + ' plank, 30 s of kicks (aim for ' + kicks + '), ' + burp + ' burpees. 2 min rest between rounds.', target: 5, unit: 'rounds', step: [1], guides: ['pushup', 'plank', 'roundhouse', 'burpee'] },
      { id: 'squats', text: '100 squats for time, straight after', target: 100, unit: 'squats', step: [5, 10], guides: ['squat'] },
      { id: 'cool', text: '3 rounds of 3 min easy shadowboxing to cool down, 1 min rest', target: 3, unit: 'rounds', timer: { work: 180, rest: 60, rounds: 3 }, guides: ['boxing'] }] };
  };
  const FOCUS_ORDER = ['end', 'str', 'dur', 'spd', 'tec'];
  // The first 8 weeks: Awakening, then a fixed arc. The last week of each 4-week month is light, because the benchmark lands there.
  const ARC = [null, 'dur', 'str', 'tec', 'spd', 'end', 'gate', 'tec'];
  const ARC_WEEKS = ARC.length;
  function weekNo(startDate, ws) { return Math.floor(BB.daysBetween(BB.weekStart(startDate), ws) / 7); }
  // After week 8 the same rhythm repeats: light technique weeks before each benchmark, a Red Gate before every second one,
  // and the other weeks target your lowest stat, never the same one twice in a row.
  function questFocus(data, ws, n, st) {
    if (n < ARC_WEEKS) return ARC[n];
    const c = n % ARC_WEEKS;
    if (c === 3 || c === 7) return 'tec';
    if (c === 6) return 'gate';
    const prev = (data.quests || {})[BB.addDays(ws, -7)];
    const pool = FOCUS_ORDER.filter((k) => k !== 'tec' && (!prev || prev.focus !== k));
    pool.sort((a, b) => st[a].index - st[b].index || FOCUS_ORDER.indexOf(a) - FOCUS_ORDER.indexOf(b));
    return pool[0];
  }
  function makeQuest(data, ws, today) {
    const n = weekNo(data.profile.startDate, ws);
    if (n <= 0) {
      return { type: 'trial', week: 1, title: 'Awakening Trial', text: 'Max effort on all four tests. Rest 3–5 minutes between them. These numbers are your starting point.',
        focus: null, objectives: TEST_KEYS.map((k) => ({ id: k, text: TESTS[k].test, test: k })), progress: {}, cleared: false };
    }
    const st = statState(data, today);
    const focus = questFocus(data, ws, n, st);
    return Object.assign({ type: 'challenge', week: n + 1, focus, progress: {}, cleared: false }, TEMPLATES[focus](st, data));
  }

  // ---------- Monthly benchmark: the four tests again at the end of every 4th week ----------
  const benchMonthOf = (n) => ((n + 1) % 4 === 0 ? (n + 1) / 4 : null);
  const benchWeekStart = (startDate, m) => BB.addDays(BB.weekStart(startDate), (4 * m - 1) * 7);
  // The benchmark due now: this week's, or last month's if it was never finished (until the next one arrives).
  function benchDue(data, today) {
    const p = data.profile;
    if (!p || !p.startDate) return null;
    const n = weekNo(p.startDate, BB.weekStart(today));
    const m = Math.floor((n + 1) / 4);
    if (m < 1) return null;
    const rec = ((data.ranks || {}).bench || {})[m];
    if (rec && rec.done) return null;
    return { month: m, overdue: benchMonthOf(n) !== m, ws: benchWeekStart(p.startDate, m) };
  }
  function awakening(data) {
    const p = data.profile || {}, vals = {};
    const q = p.startDate ? (data.quests || {})[BB.weekStart(p.startDate)] : null;
    if (q && q.type === 'trial') Object.assign(vals, testValues(q.progress));
    const tests = ((data.ranks || {}).tests || []).slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    TEST_KEYS.forEach((k) => {
      if (vals[k] != null) return;
      const t = tests.find((x) => typeof x[k] === 'number');
      if (!t) return;
      const v = testValues(t);
      vals[k] = v[k];
      if (k === 'str') vals.strFrom = v.strFrom;
    });
    return { values: vals, date: (q && q.clearedAt) || (tests[0] && tests[0].date) || null };
  }
  // Awakening first, then every month that has at least one result.
  function benchHistory(data) {
    const out = [], a = awakening(data);
    if (Object.keys(a.values).length) out.push({ month: 0, label: 'Awakening', date: a.date, values: a.values, done: TEST_KEYS.every((k) => a.values[k] != null) });
    const bench = (data.ranks || {}).bench || {};
    Object.keys(bench).map(Number).sort((x, y) => x - y).forEach((m) => {
      const b = bench[m];
      if (b && b.progress && Object.keys(b.progress).length) out.push({ month: m, label: 'Month ' + m, date: b.doneAt || null, values: testValues(b.progress), done: !!b.done });
    });
    return out;
  }

  // ---------- Pasted results: "push-ups 18, plank 1:40, kicks 27, burpees 31" ----------
  const PASTE = /(knee[\s-]*push[\s-]?ups?|push[\s-]?ups?|press[\s-]?ups?|\bstr\b|strength|planks?|\bdur\b|durability|kicks?|roundhouses?|\bspd\b|speed|burpees?|\bend\b|endurance)/gi;
  function pasteKey(w) {
    w = w.toLowerCase();
    return /push|press|str/.test(w) ? 'str' : /plank|dur/.test(w) ? 'dur' : /kick|round|spd|speed/.test(w) ? 'spd' : 'end';
  }
  function parseTime(s, last) {
    const all = (re) => { const out = []; let m; re.lastIndex = 0; while ((m = re.exec(s))) out.push(m); return out; };
    const pick = (list) => (list.length ? list[last ? list.length - 1 : 0] : null);
    let m = pick(all(/(\d{1,2})\s*:\s*(\d{2})/g));
    if (m) return Number(m[1]) * 60 + Number(m[2]);
    m = pick(all(/(\d+(?:[.,]\d+)?)\s*(?:minutes?|mins?|m)(?![a-z])(?:\s*(\d{1,2})\s*(?:seconds?|secs?|s)(?![a-z]))?/gi));
    if (m) return Math.round(Number(m[1].replace(',', '.')) * 60) + (m[2] ? Number(m[2]) : 0);
    m = pick(all(/(\d{1,3})/g));
    return m ? Number(m[1]) : null;
  }
  // Each number belongs to the test named right before it, or right after it when the text puts numbers first.
  function parseTrialText(text) {
    const s = String(text || ''), hits = [];
    let m;
    PASTE.lastIndex = 0;
    while ((m = PASTE.exec(s))) hits.push({ k: pasteKey(m[1]), at: m.index, end: m.index + m[1].length, knee: /^knee/i.test(m[1]) });
    const numberFirst = hits.length > 0 && /\d/.test(s.slice(0, hits[0].at));
    const drop = (x) => x.replace(/\(?\s*(?:in\s+)?(?:30\s*s(?:ec\w*)?|3\s*min\w*)\s*\)?/gi, ' ');
    const out = {};
    hits.forEach((h, i) => {
      if (out[h.k] != null) return;
      const seg = numberFirst ? s.slice(i > 0 ? hits[i - 1].end : 0, h.at) : s.slice(h.end, i + 1 < hits.length ? hits[i + 1].at : s.length);
      let v;
      if (h.k === 'dur') v = parseTime(seg, numberFirst);
      else { const nums = drop(seg).match(/\d{1,3}/g); v = nums ? Number(nums[numberFirst ? nums.length - 1 : 0]) : null; }
      if (v != null && isFinite(v)) { out[h.k] = v; if (h.knee) out.strStyle = 'knee'; }
    });
    return out;
  }
  function objectiveDone(q, o) { return (Number(q.progress[o.id]) || 0) >= o.target; }
  function questDone(q) {
    if (q.type === 'trial') return TEST_KEYS.every((k) => typeof q.progress[k] === 'number');
    return q.objectives.every((o) => objectiveDone(q, o));
  }

  const RK = {
    RANKS, rankName, rankIdx, tierOf, TESTS, TEST_KEYS, STAT_KEYS, STAT_INFO, DEFAULT_ESTIMATES, POT_BASE, TECHNIQUES,
    indexFor, bestTests, willpower, questClears, statState, nextTechnique, weekNo, makeQuest, objectiveDone, questDone, fmtTime,
    ARC_WEEKS, benchMonthOf, benchWeekStart, benchDue, awakening, benchHistory, parseTrialText,
    PUSH_LOAD, REF_KG, PEAKS, PUSH_TH, pushEq, repsFor, strOf, testValues, pushText, strText,
  };
  root.RK = RK;
  if (typeof module !== 'undefined' && module.exports) module.exports = RK;
})(typeof globalThis !== 'undefined' ? globalThis : this);
