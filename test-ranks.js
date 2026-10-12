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

assert.strictEqual(RK.indexFor(RK.TESTS.str.th, 0), 0);
assert.strictEqual(RK.rankName(RK.indexFor(RK.TESTS.str.th, 18)), 'C-');
assert.strictEqual(RK.rankName(RK.indexFor(RK.TESTS.str.th, 20)), 'C-');
assert.strictEqual(RK.rankName(RK.indexFor(RK.TESTS.str.th, 21)), 'C');
assert.strictEqual(RK.rankName(RK.indexFor(RK.TESTS.str.th, 500)), 'S+');
ok('results map to ranks');

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
assert.strictEqual(st.str.value, 15); assert.strictEqual(RK.rankName(st.str.index), 'D'); // best result counts
assert.strictEqual(RK.rankName(st.dur.index), 'C-'); assert.strictEqual(RK.rankName(st.end.index), 'D');
assert.strictEqual(st.str.next.need, 16); assert.ok(st.str.progress > 0 && st.str.progress < 1);
ok('trial results replace estimates and keep the best');

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
const q0 = RK.makeQuest(d, '2026-10-12', '2026-10-12');
assert.strictEqual(q0.type, 'trial'); assert.strictEqual(q0.title, 'Awakening Trial');
const q1 = RK.makeQuest(d, '2026-10-19', '2026-10-19');
assert.strictEqual(q1.type, 'challenge'); assert.strictEqual(q1.focus, 'end'); // D- is the lowest
d.quests['2026-10-19'] = q1;
const q2 = RK.makeQuest(d, '2026-10-26', '2026-10-26');
assert.notStrictEqual(q2.focus, 'end'); // never twice in a row
assert.strictEqual(RK.makeQuest(d, '2026-11-09', '2026-11-09').type, 'trial'); // week 5
q1.objectives.forEach((o) => { q1.progress[o.id] = o.target; });
assert.ok(RK.questDone(q1));
const tq = RK.makeQuest(d, '2026-10-12', '2026-10-12');
tq.progress = { str: 15, dur: 80, spd: 30 };
assert.ok(!RK.questDone(tq)); tq.progress.end = 25; assert.ok(RK.questDone(tq));
for (const f of ['end', 'str', 'dur', 'spd', 'tec']) {
  const prevFocus = ['end', 'str', 'dur', 'spd', 'tec'].filter((x) => x !== f);
  // force the focus by blocking every other candidate's rank: give f the lowest estimate
  const dd = base();
  dd.ranks.estimates = { str: 'S', dur: 'S', spd: 'S', end: 'S', tec: 'S' };
  dd.ranks.estimates[f] = 'F';
  const q = RK.makeQuest(dd, '2026-10-19', '2026-10-19');
  assert.strictEqual(q.focus, f);
  q.objectives.forEach((o) => { assert.ok(o.target > 0 && o.text.length > 5, f + ' objective'); assert.ok(!/NaN|undefined/.test(o.text), f + ': ' + o.text); });
  void prevFocus;
}
ok('quests: trial on weeks 1 and 5, lowest stat first, no repeats, every template valid');
console.log('all rank tests passed');
