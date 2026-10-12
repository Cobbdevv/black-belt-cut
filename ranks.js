/* Black Belt Cut — stat ranks (F- to S+), rank trials, technique list, weekly quests. Pure logic, no DOM. */
(function (root) {
  'use strict';
  const BB = root.BB;

  const RANKS = ['F-', 'F', 'F+', 'E-', 'E', 'E+', 'D-', 'D', 'D+', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+', 'S-', 'S', 'S+'];
  const rankName = (i) => RANKS[Math.max(0, Math.min(20, i))];
  const rankIdx = (name) => Math.max(0, RANKS.indexOf(name));
  const tierOf = (i) => rankName(i)[0];

  // Thresholds: the minimum result for each of the 21 ranks. C is roughly average for an 18-25-year-old man, A is athletic, S is elite.
  const TESTS = {
    str: { code: 'STR', name: 'Strength', test: 'Max push-ups', unit: 'push-ups',
      how: 'One set, no rest at the top. Chest to a fist\'s height from the floor, arms fully straight at the top. Stop when your form breaks.',
      th: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 21, 24, 27, 30, 34, 38, 42, 48, 55, 62, 72] },
    dur: { code: 'DUR', name: 'Durability', test: 'Max plank hold', unit: 's',
      how: 'Forearm plank, body in one straight line. Stop the clock when your hips sag or rise. A strong brace is what absorbs hits.',
      th: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 115, 130, 145, 160, 180, 200, 225, 255, 290, 360] },
    spd: { code: 'SPD', name: 'Speed', test: 'Kicks in 30 seconds', unit: 'kicks',
      how: 'Roundhouse kicks to at least waist height, alternating legs, each one retracted back to stance. Count out loud or film it.',
      th: [0, 6, 10, 14, 17, 20, 22, 24, 26, 28, 30, 33, 36, 39, 42, 45, 48, 52, 56, 60, 66] },
    end: { code: 'END', name: 'Endurance', test: 'Burpees in 3 minutes', unit: 'burpees',
      how: 'Squat, hands down, back to a plank, back up, stand tall. Step back instead of jumping if your knees or wrists need it, but use the same style every trial.',
      th: [0, 5, 10, 14, 18, 21, 24, 27, 30, 34, 38, 42, 46, 50, 54, 58, 62, 66, 70, 75, 82] },
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
  ].map((t, i) => ({ i, name: t[0], std: t[1], jump: i >= 16 }));

  function indexFor(th, v) { let i = 0; for (let k = 0; k < th.length; k++) if (v >= th[k]) i = k; return i; }
  function bestTests(r) {
    const best = {};
    ((r && r.tests) || []).forEach((t) => TEST_KEYS.forEach((k) => {
      if (typeof t[k] === 'number' && (best[k] == null || t[k] > best[k])) best[k] = t[k];
    }));
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
        { id: 'rounds', text: n + ' rounds: 2 min shadowboxing, then ' + b + ' burpees. 30 s rest between rounds.', target: n, unit: 'rounds', timer: { work: 120, rest: 30, rounds: n } },
        { id: 'squats', text: sq + ' squats for time, straight after the last round', target: sq, unit: 'squats', step: [5, 10] }] };
    },
    str(st) {
      const v = Math.max(8, st.str.value), push = Math.max(30, 5 * v), sq = Math.round((push * 1.5) / 5) * 5;
      return { title: 'Hundred Hands', text: 'Finish inside 40 minutes. Split the sets however you need.', objectives: [
        { id: 'push', text: push + ' push-ups, any variation from your level', target: push, unit: 'push-ups', step: [1, 5] },
        { id: 'rows', text: push + ' doorframe rows', target: push, unit: 'rows', step: [1, 5] },
        { id: 'squats', text: sq + ' squats', target: sq, unit: 'squats', step: [5, 10] }] };
    },
    dur(st) {
      const v = Math.max(30, st.dur.value);
      const plank = Math.round(Math.max(180, 5 * v) / 10) * 10, wall = Math.round(Math.max(120, 3 * v) / 10) * 10, side = Math.round(Math.max(60, 1.5 * v) / 10) * 10;
      return { title: 'Iron Body', text: 'Total time under tension. Rest whenever you need; only the holds count.', objectives: [
        { id: 'plank', text: fmtTime(plank) + ' of plank in total', target: plank, unit: 's', step: [10, 30] },
        { id: 'wall', text: fmtTime(wall) + ' of wall sit in total', target: wall, unit: 's', step: [10, 30] },
        { id: 'side', text: fmtTime(side) + ' of side plank on each side', target: side * 2, unit: 's, both sides', step: [10, 30] }] };
    },
    spd(st) {
      const need = Math.ceil(Math.max(16, st.spd.value) * 0.8);
      return { title: 'Lightning Drills', text: 'Every round at full speed. A round under the target gets repeated.', objectives: [
        { id: 'kicks', text: '10 rounds: 30 s of max-speed kicks, at least ' + need + ' per round. 30 s rest.', target: 10, unit: 'rounds', timer: { work: 30, rest: 30, rounds: 10 } },
        { id: 'punch', text: '10 rounds: 10 s of all-out punches, 20 s rest', target: 10, unit: 'rounds', timer: { work: 10, rest: 20, rounds: 10 } }] };
    },
    tec(st, data) {
      const t = nextTechnique(data);
      return { title: 'Form Mastery', text: 'Technique: ' + t.name + '. Standard: ' + t.std, technique: t.i, objectives: [
        { id: 'drill', text: '5 rounds of 3 min drilling it: 3 rounds slow, 2 at full speed. 1 min rest.', target: 5, unit: 'rounds', timer: { work: 180, rest: 60, rounds: 5 } },
        { id: 'reps', text: '100 clean reps in total, both sides', target: 100, unit: 'reps', step: [5, 10] },
        { id: 'film', text: 'Film 3 reps and check them against the standard', target: 1, unit: 'check' }] };
    },
  };
  const FOCUS_ORDER = ['end', 'str', 'dur', 'spd', 'tec'];
  function weekNo(startDate, ws) { return Math.floor(BB.daysBetween(BB.weekStart(startDate), ws) / 7); }
  // Week 1 and every 4th week after is a Rank Trial. Other weeks target your lowest stat, never the same one twice in a row.
  function makeQuest(data, ws, today) {
    const n = weekNo(data.profile.startDate, ws);
    if (n % 4 === 0) {
      return { type: 'trial', title: n === 0 ? 'Awakening Trial' : 'Rank Trial', text: 'Max effort on all four tests. Rest 3–5 minutes between them.',
        focus: null, objectives: TEST_KEYS.map((k) => ({ id: k, text: TESTS[k].test, test: k })), progress: {}, cleared: false };
    }
    const st = statState(data, today);
    const prev = (data.quests || {})[BB.addDays(ws, -7)];
    const pool = FOCUS_ORDER.filter((k) => !prev || prev.focus !== k);
    pool.sort((a, b) => st[a].index - st[b].index || FOCUS_ORDER.indexOf(a) - FOCUS_ORDER.indexOf(b));
    const focus = pool[0];
    return Object.assign({ type: 'challenge', focus, progress: {}, cleared: false }, TEMPLATES[focus](st, data));
  }
  function objectiveDone(q, o) { return (Number(q.progress[o.id]) || 0) >= o.target; }
  function questDone(q) {
    if (q.type === 'trial') return TEST_KEYS.every((k) => typeof q.progress[k] === 'number');
    return q.objectives.every((o) => objectiveDone(q, o));
  }

  const RK = {
    RANKS, rankName, rankIdx, tierOf, TESTS, TEST_KEYS, STAT_KEYS, STAT_INFO, DEFAULT_ESTIMATES, POT_BASE, TECHNIQUES,
    indexFor, bestTests, willpower, questClears, statState, nextTechnique, weekNo, makeQuest, objectiveDone, questDone, fmtTime,
  };
  root.RK = RK;
  if (typeof module !== 'undefined' && module.exports) module.exports = RK;
})(typeof globalThis !== 'undefined' ? globalThis : this);
