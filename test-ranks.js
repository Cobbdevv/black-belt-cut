// Run: node test-ranks.js  (pure logic tests for ranks.js)
globalThis.BB = require('./logic.js');
const RK = require('./ranks.js');
const assert = require('assert');
const ok = (n) => console.log('ok -', n);

assert.strictEqual(RK.RANKS.length, 21);
for (const k of RK.TEST_KEYS) {
  const th = RK.TESTS[k].th;
  assert.strictEqual(th.length, 21, k);
  for (let i = 1; i < th.length; i++) assert.ok(th[i] > th[i - 1], k + ' thresholds rise at ' + i);
}
assert.strictEqual(RK.TECHNIQUES.length, 20);
ok('scale, thresholds and technique list are well formed');

const full75 = (r) => RK.pressKg(r, 'full', 75);
assert.strictEqual(RK.indexFor(RK.TESTS.str.th, 0), 0);
assert.strictEqual(RK.rankName(RK.indexFor(RK.TESTS.str.th, full75(18))), 'C-');
assert.strictEqual(RK.rankName(RK.indexFor(RK.TESTS.str.th, full75(20))), 'C-');
assert.strictEqual(RK.rankName(RK.indexFor(RK.TESTS.str.th, full75(21))), 'C');
assert.strictEqual(RK.rankName(RK.indexFor(RK.TESTS.str.th, 500)), 'S+');
ok('results map to ranks');

// Strength is kg pressed: push-ups times the share of body weight each one lifts, turned into a one-rep max
const PUSH_TH = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 21, 24, 27, 30, 34, 38, 42, 48, 55, 62, 72];
for (let r = 0; r <= 80; r++) assert.strictEqual(RK.indexFor(RK.TESTS.str.th, full75(r)), RK.indexFor(PUSH_TH, r), 'at 75 kg, ' + r + ' push-ups rank as before');
const strRank = (r, style, bw) => RK.rankName(RK.indexFor(RK.TESTS.str.th, RK.pressKg(r, style, bw)));
assert.strictEqual(RK.pressKg(11, 'knee', 104.3), 69.8); assert.strictEqual(strRank(11, 'knee', 104.3), 'D-');
assert.strictEqual(RK.pressKg(15, 'knee', 104), 76.4); assert.strictEqual(strRank(15, 'knee', 104), 'D+');
assert.strictEqual(strRank(15, 'full', 70), 'D-'); assert.strictEqual(strRank(30, 'full', 70), 'C+');
assert.strictEqual(strRank(30, 'full', 75), 'B'); // the raw count would have ranked 30 push-ups B at any weight
assert.ok(RK.pressKg(15, 'knee', 95) < RK.pressKg(15, 'knee', 104)); // the same reps at a lighter weight press less
assert.ok(RK.repsFor(76.4, 'knee', 95) > 15); // so losing weight alone never raises strength
assert.strictEqual(RK.pressKg(0, 'knee', 104), 0);
ok('strength: push-ups become kg pressed at your weight, and a 75 kg body ranks exactly as before');

const today = '2026-10-26';
const base = () => ({ profile: { startDate: '2026-10-12', levers: [] }, habits: {}, sessions: [], quests: {}, ranks: {} });
let d = base();
let st = RK.statState(d, today);
assert.strictEqual(RK.rankName(st.str.index), 'C-'); assert.strictEqual(st.str.source, 'estimate');
assert.strictEqual(RK.rankName(st.end.index), 'D-'); assert.strictEqual(RK.rankName(st.pot.index), 'A');
assert.strictEqual(st.wil.source, 'auto'); // 14 days in
ok('estimates are the starting ranks');

d.ranks.tests = [{ date: '2026-10-13', str: 15, dur: 95 }, { date: '2026-10-20', str: 12, end: 27 }];
st = RK.statState(d, today);
assert.strictEqual(st.str.value, full75(15)); assert.strictEqual(RK.rankName(st.str.index), 'D'); // best result counts; older results were full push-ups, ranked as at 75 kg
assert.strictEqual(st.str.reps, 15);
assert.strictEqual(RK.rankName(st.dur.index), 'C-'); assert.strictEqual(RK.rankName(st.end.index), 'D');
assert.strictEqual(st.str.next.need, full75(16)); assert.ok(st.str.progress > 0 && st.str.progress < 1);
ok('trial results replace estimates and keep the best');

d.ranks.tests.push({ date: '2026-10-25', str: RK.pressKg(11, 'knee', 104.3), strReps: 11, strStyle: 'knee', strBw: 104.3 });
st = RK.statState(d, today);
assert.strictEqual(RK.rankName(st.str.index), 'D'); // 11 knee push-ups at 104.3 kg press less than 15 full ones did at 75
d.ranks.tests = [{ date: '2026-10-25', str: RK.pressKg(11, 'knee', 104.3), strReps: 11, strStyle: 'knee', strBw: 104.3 }];
st = RK.statState(d, today);
assert.strictEqual(RK.rankName(st.str.index), 'D-'); assert.strictEqual(st.str.reps, 11); assert.strictEqual(st.str.from.style, 'knee');
assert.strictEqual(RK.strText(st.str.from), '≈70 kg press (11 knee push-ups at 104.3 kg)');
const nx = st.str.next.reps; // the next rank, in push-ups of the same style at the same weight
assert.ok(RK.pressKg(nx, 'knee', 104.3) >= st.str.next.need && RK.pressKg(nx - 1, 'knee', 104.3) < st.str.next.need, 'next rank at ' + nx);
assert.strictEqual(nx, 12);
ok('strength trials keep their push-ups, style and weight, and show the next rank in push-ups');

d = base();
for (let i = 0; i < 14; i++) d.habits[BB.addDays('2026-10-12', i)] = { plate: 1, protein: 1, drinks: 1 };
d.sessions = ['2026-10-12', '2026-10-14', '2026-10-16', '2026-10-19', '2026-10-21', '2026-10-23'].map((x) => ({ date: x, kind: 'full' }));
assert.strictEqual(RK.rankName(RK.statState(d, today).wil.index), 'S+');
d.habits = {};
assert.strictEqual(RK.rankName(RK.statState(d, today).wil.index), 'D+'); // no good eating days, full training: 0.4 -> index 8
ok('willpower follows the logs');

d = base();
assert.strictEqual(RK.statState(d, '2026-10-15').wil.source, 'measuring');
d.quests = { a: { cleared: true }, b: { cleared: true }, c: { cleared: true }, e: { cleared: true }, f: { cleared: false } };
assert.strictEqual(RK.rankName(RK.statState(d, today).pot.index), 'A+');
ok('willpower waits 7 days; potential grows every 4 clears');

d = base();
const wk = (n) => BB.addDays('2026-10-12', 7 * n);
const q0 = RK.makeQuest(d, wk(0), wk(0));
assert.strictEqual(q0.type, 'trial'); assert.strictEqual(q0.title, 'Awakening Trial'); assert.strictEqual(q0.week, 1);
const arc = [];
for (let n = 1; n < 8; n++) { const q = RK.makeQuest(d, wk(n), wk(n)); d.quests[wk(n)] = q; arc.push(q.focus); assert.strictEqual(q.type, 'challenge'); assert.strictEqual(q.week, n + 1); }
assert.deepStrictEqual(arc, ['dur', 'str', 'tec', 'spd', 'end', 'gate', 'tec']);
ok('weeks 1 to 8: Awakening, then the fixed arc with a Red Gate in week 7');

for (let n = 8; n < 24; n++) { const q = RK.makeQuest(d, wk(n), wk(n)); d.quests[wk(n)] = q; }
for (let n = 8; n < 24; n++) {
  const f = d.quests[wk(n)].focus, c = n % 8;
  if (c === 3 || c === 7) assert.strictEqual(f, 'tec', 'light week before benchmark ' + n);
  else if (c === 6) assert.strictEqual(f, 'gate', 'red gate ' + n);
  else { assert.notStrictEqual(f, d.quests[wk(n - 1)].focus, 'no repeat ' + n); assert.ok(['end', 'str', 'dur', 'spd'].includes(f)); }
}
assert.strictEqual(d.quests[wk(8)].focus, 'end'); // after the arc: lowest stat first (END is D-)
ok('after week 8: lowest stat first, never twice in a row, the same light weeks and Red Gates');

const q1 = d.quests[wk(1)];
q1.objectives.forEach((o) => { q1.progress[o.id] = o.target; });
assert.ok(RK.questDone(q1));
const tq = RK.makeQuest(base(), wk(0), wk(0));
tq.progress = { str: 15, dur: 80, spd: 30 };
assert.ok(!RK.questDone(tq)); tq.progress.end = 25; assert.ok(RK.questDone(tq));
for (const f of ['end', 'str', 'dur', 'spd', 'tec', 'gate']) {
  const dd = base();
  dd.ranks.estimates = { str: 'S', dur: 'S', spd: 'S', end: 'S', tec: 'S' };
  if (f !== 'gate' && f !== 'tec') dd.ranks.estimates[f] = 'F';
  const n = { tec: 3, gate: 6 }[f] || 8;
  const q = RK.makeQuest(dd, wk(n), wk(n));
  assert.strictEqual(q.focus, f);
  q.objectives.forEach((o) => {
    assert.ok(o.target > 0 && o.text.length > 5, f + ' objective');
    assert.ok(!/NaN|undefined/.test(o.text), f + ': ' + o.text);
    assert.ok(Array.isArray(o.guides), f + ' objective has guides');
  });
}
ok('every quest template is valid, scaled and links its how-to guides');

d = base();
assert.strictEqual(RK.benchDue(d, wk(2)), null);
assert.deepStrictEqual(RK.benchDue(d, BB.addDays(wk(3), 4)), { month: 1, overdue: false, ws: wk(3) });
assert.strictEqual(RK.benchDue(d, wk(4)).overdue, true); // week 5: last month's is still open
d.ranks.bench = { 1: { progress: { str: 20, dur: 90, spd: 31, end: 27 }, done: true, doneAt: BB.addDays(wk(3), 5) } };
assert.strictEqual(RK.benchDue(d, wk(4)), null);
assert.strictEqual(RK.benchDue(d, wk(7)).month, 2);
d.quests[wk(0)] = Object.assign(RK.makeQuest(d, wk(0), wk(0)), { progress: { str: 15, dur: 85, spd: 29, end: 24 }, cleared: true, clearedAt: '2026-10-13' });
const h = RK.benchHistory(d);
assert.deepStrictEqual(h.map((x) => x.label), ['Awakening', 'Month 1']);
assert.strictEqual(h[0].values.str, full75(15)); assert.strictEqual(h[1].values.str, full75(20)); assert.ok(h[0].done && h[1].done);
assert.strictEqual(h[0].values.strFrom.reps, 15);
d.ranks.bench[1].progress = { str: RK.pressKg(14, 'knee', 101), strReps: 14, strStyle: 'knee', strBw: 101, dur: 90, spd: 31, end: 27 };
assert.strictEqual(RK.benchHistory(d)[1].values.str, RK.pressKg(14, 'knee', 101)); assert.strictEqual(RK.benchHistory(d)[1].values.strFrom.style, 'knee');
ok('benchmarks: due at the end of every 4th week, stay open until done, history starts at the Awakening');

const P = RK.parseTrialText;
assert.deepStrictEqual(P('push-ups 18, plank 1:40, kicks 27, burpees 31'), { str: 18, dur: 100, spd: 27, end: 31 });
assert.deepStrictEqual(P('push-ups 18 plank 1:40 kicks 27 burpees 31'), { str: 18, dur: 100, spd: 27, end: 31 });
assert.deepStrictEqual(P('18 push-ups, 1:40 plank, 27 kicks, 31 burpees'), { str: 18, dur: 100, spd: 27, end: 31 });
assert.deepStrictEqual(P('STR 21\nDUR 95\nSPD 30\nEND 25'), { str: 21, dur: 95, spd: 30, end: 25 });
assert.deepStrictEqual(P('Kicks in 30 seconds: 27\nBurpees in 3 minutes: 31\nPlank: 2 min 5 s'), { spd: 27, end: 31, dur: 125 });
assert.deepStrictEqual(P('plank 1m40s'), { dur: 100 });
assert.deepStrictEqual(P('nothing here'), {});
assert.deepStrictEqual(P('knee push-ups 15, plank 1:10'), { str: 15, strStyle: 'knee', dur: 70 });
assert.deepStrictEqual(P('15 knee push-ups, 70 s plank'), { str: 15, strStyle: 'knee', dur: 70 });
ok('pasted results: names before or after numbers, m:ss, minutes and seconds');
console.log('all rank tests passed');
