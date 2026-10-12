// Run: node test-guides.js  (figure.js and moves.js: every how-to plays cleanly and every exercise has one)
globalThis.BB = require('./logic.js');
globalThis.RK = require('./ranks.js');
globalThis.FG = require('./figure.js');
const MOVES = require('./moves.js');
const assert = require('assert');
const ok = (n) => console.log('ok -', n);

const ids = MOVES.ids();
assert.ok(ids.length >= 30, 'library size');
for (const id of ids) {
  const m = MOVES.get(id);
  assert.ok(m.name && m.view && m.dur > 0 && m.keys.length, id + ' shape');
  assert.ok(m.steps && m.steps.length >= 3, id + ' steps');
  assert.ok(m.keys.some((k) => k.f), id + ' key frames');
  for (let k = 1; k < m.keys.length; k++) assert.ok(m.keys[k].t > m.keys[k - 1].t && m.keys[k].t < m.dur, id + ' key times');
  (m.tempo || []).forEach((s) => assert.ok(s[0] >= 0 && s[1] <= m.dur && s[1] > s[0] && s[2], id + ' tempo'));
  for (let i = 0; i <= 48; i++) {
    const t = (m.dur * i) / 48;
    const svg = FG.svg(m, t);
    assert.ok(!/NaN|undefined|Infinity/.test(svg), id + ' renders at ' + t.toFixed(2));
  }
}
ok('all ' + ids.length + ' moves render cleanly through their whole loop');

const floorIssues = [], reachIssues = [];
for (const id of ids) {
  const m = MOVES.get(id);
  for (let i = 0; i < 60; i++) {
    const t = (m.dur * i) / 60, J = FG.solve(FG.poseAt(m, t));
    const pts = [J.hip, J.neck].concat(...J.arms.map((l) => [l.mid, l.end, l.tip]), ...J.legs.map((l) => [l.mid, l.end, l.tip]));
    const low = Math.min(...pts.map((q) => q[1]));
    if (low < -1.5 || J.head[1] < 4.5) floorIssues.push(id + ' t=' + t.toFixed(2) + ' low=' + low.toFixed(1) + ' head=' + J.head[1].toFixed(1));
  }
  m.keys.forEach((k) => {
    const J = FG.solve(FG.poseAt(m, k.t));
    J.legs.concat(J.arms).forEach((l, i) => { if (l.reach > 2.5) reachIssues.push(id + ' key ' + k.t + ' limb ' + i + ' short by ' + l.reach.toFixed(1)); });
  });
}
assert.deepStrictEqual(floorIssues, [], 'nothing sinks through the floor');
assert.deepStrictEqual(reachIssues, [], 'planted hands and feet are within reach');
ok('nothing goes through the floor and every planted hand and foot is reachable');

const want = [];
BB.ORDER.forEach((pat) => BB.LADDERS[pat].levels.forEach((l) => want.push(['ladder ' + pat + ' ' + l.name, l.guide])));
Object.keys(BB.FINISHERS).forEach((k) => want.push(['finisher ' + k, BB.FINISHERS[k].guide]));
BB.WARMUP.forEach((w) => want.push(['warm-up', w.guide]));
RK.TEST_KEYS.forEach((k) => want.push(['test ' + k, RK.TESTS[k].guide]));
RK.TECHNIQUES.filter((t) => t.guide).forEach((t) => want.push(['technique ' + t.name, t.guide]));
const d = { profile: { startDate: '2026-10-12', levers: [] }, habits: {}, sessions: [], quests: {}, ranks: {} };
for (let n = 1; n < 16; n++) {
  const ws = BB.addDays('2026-10-12', 7 * n), q = RK.makeQuest(d, ws, ws);
  d.quests[ws] = q;
  q.objectives.forEach((o) => (o.guides || []).forEach((g) => want.push(['quest ' + q.title + ' ' + o.id, g])));
}
const missing = want.filter((w) => !w[1] || !MOVES.get(w[1])).map((w) => w[0] + ' -> ' + w[1]);
assert.deepStrictEqual(missing, []);
ok('every workout level, finisher, warm-up move, test, technique and quest objective has a guide (' + want.length + ' links)');

const m = MOVES.get('pushup');
const top = FG.solve(FG.poseAt(m, 0)), bottom = FG.solve(FG.poseAt(m, 1.1));
assert.ok(top.neck[1] - bottom.neck[1] > 15, 'push-up goes down');
assert.ok(Math.abs(top.legs[0].tip[1]) < 1 && Math.abs(bottom.legs[0].tip[1]) < 1, 'toes stay on the floor');
assert.ok(Math.abs(top.arms[0].end[0] - bottom.arms[0].end[0]) < 0.5, 'hands stay planted');
const sq = MOVES.get('squat'), st = FG.solve(FG.poseAt(sq, 0)), lo = FG.solve(FG.poseAt(sq, 1.2));
assert.ok(lo.hip[1] < 30 && st.hip[1] > 48, 'squat reaches depth');
assert.ok(Math.abs(lo.legs[0].mid[1] - lo.hip[1]) < 4, 'thighs level at the bottom');
ok('push-up and squat geometry: planted contacts, real range of motion');

console.log('all guide tests passed');
