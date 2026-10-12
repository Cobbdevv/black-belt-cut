// Run: node test-app.js — loads every page script against a stub DOM (device-only mode, no Firebase) and drives the main flows.
const fs = require('fs'), vm = require('vm'), assert = require('assert');

function el(id) {
  return {
    id, innerHTML: '', textContent: '', hidden: false, style: {}, dataset: {}, attrs: {},
    get firstChild() { return this.innerHTML ? {} : null; },
    setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute() {},
    classList: { toggle() {}, contains() { return false; } },
    querySelector() { return { getBoundingClientRect: () => ({ left: 0, top: 0, right: 340, bottom: 210, width: 340, height: 210 }) }; },
    querySelectorAll() { return []; }, blur() {}, focus() {},
  };
}
const els = {};
const document = {
  getElementById: (id) => (els[id] = els[id] || el(id)),
  querySelectorAll: () => [], addEventListener: () => {}, activeElement: null, hidden: false,
};
const store = new Map();
const ctx = {
  document, console, Math, Date, JSON, Number, String, Object, Array, Promise, isFinite,
  navigator: {}, location: { protocol: 'file:' },
  localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
  setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, scrollTo: () => {},
};
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ['logic.js', 'ranks.js', 'firebase-config.js', 'app.js', 'sync.js', 'train.js', 'status.js', 'views.js']) {
  vm.runInContext(fs.readFileSync(__dirname + '/' + f, 'utf8'), ctx, { filename: f });
}
const run = (code) => vm.runInContext(code, ctx);
const view = () => els.view.innerHTML, sheet = () => els.sheet.innerHTML;
const form = (fields, chips) => ({
  querySelector: (sel) => {
    if (sel in fields) return { value: fields[sel] };
    const m = sel.match(/data-group="(\w+)"/);
    if (m && chips[m[1]] != null) return { dataset: { v: String([].concat(chips[m[1]])[0]) } };
    return null;
  },
  querySelectorAll: (sel) => { const m = sel.match(/data-group="(\w+)"/); return m && chips[m[1]] ? [].concat(chips[m[1]]).map((v) => ({ dataset: { v: String(v) } })) : []; },
});
const ok = (n) => console.log('ok -', n);
const clean = (html, where) => assert.ok(!/NaN|undefined|\[object/.test(html), 'bad value in ' + where + ': ' + (html.match(/.{40}(NaN|undefined|\[object).{40}/) || [''])[0]);

// 1. No Firebase settings: device-only mode, onboarding first
assert.strictEqual(run('S.ui.mode'), 'local');
assert.match(view(), /Tie on your belt/); ok('device-only mode starts at onboarding');
run('FORMS.onboard')(form({ '#ob-w': '101,6', '#ob-why': 'Fit into my old dobok' }, { goal: 75, days: [0, 2, 4] }));
assert.match(view(), /Sync is off/); assert.match(view(), /Awakening Trial/); ok('Today shows the sync banner and the Awakening Trial');

// 2. Status tab: estimates are the starting ranks
run(`S.ui.tab = 'status'; render();`);
const sv = view(); clean(sv, 'status');
assert.match(sv, /r-C">C-</); assert.match(sv, /r-D">D-</); assert.match(sv, /r-A">A</); assert.match(sv, /Ranks after 7 days/);
ok('status window shows the estimates, potential A, willpower measuring');

// 3. Awakening Trial through the quest form
run('FORMS.trial')(form({ '#tr-str': '15', '#tr-dur': '1:25', '#tr-spd': '31', '#tr-end': '' }, {}));
assert.match(sheet(), /Measured below your estimate/); assert.match(sheet(), /Confirmed/); assert.doesNotMatch(sheet(), /END/);
assert.strictEqual(run('S.data.ranks.tests[0].dur'), 85);
assert.strictEqual(run('currentQuest().cleared'), false);
run('FORMS.trial')(form({ '#tr-str': '', '#tr-dur': '', '#tr-spd': '', '#tr-end': '25' }, {}));
assert.strictEqual(run('currentQuest().cleared'), true);
assert.strictEqual(run(`S.data.sessions.filter((s) => s.kind === 'quest').length`), 1);
ok('trial results set ranks; finishing all four clears the trial and counts as a session');

// 4. A challenge quest with a round timer and counters
run(`S.data.profile.startDate = BB.addDays(today(), -35); delete S.data.quests[BB.weekStart(today())]; S.data.sessions = []; S.ui.tab = 'status'; render();`);
const q = run('currentQuest()');
assert.strictEqual(q.type, 'challenge'); assert.strictEqual(q.focus, 'end'); clean(view(), 'quest');
const timed = q.objectives.find((o) => o.timer);
run(`ACTIONS['qt-start']({ dataset: { o: '${timed.id}' } })`);
assert.match(view(), /Round 1 of/);
run('S.ui.qt.end = Date.now() - 1'); run('TICKS.forEach((f) => f())');
assert.strictEqual(run(`currentQuest().progress['${timed.id}']`), 1); assert.strictEqual(run('S.ui.qt.phase'), 'rest');
ok('quest round timer counts finished rounds');
run(`ACTIONS['qt-stop']()`);
for (const o of q.objectives) run(`ACTIONS['obj-add']({ dataset: { o: '${o.id}', n: '${o.target}' } })`);
assert.strictEqual(run('currentQuest().cleared'), true); assert.match(sheet(), /Quest clear/);
assert.strictEqual(run(`S.data.sessions.filter((s) => s.kind === 'quest').length`), 1);
run(`S.ui.tab = 'today'; render();`); assert.match(view(), /Quest clear/); clean(view(), 'today');
ok('clearing every objective clears the quest and logs a session');

// 5. Techniques
run(`S.ui.tab = 'status'; render();`);
for (const i of [0, 1, 2, 3, 4, 5, 6, 7, 8]) run(`ACTIONS.tech({ dataset: { i: '${i}' } })`);
assert.strictEqual(run('RK.rankName(stats().tec.index)'), 'D+'); // still the estimate until locked
run(`ACTIONS['tech-lock']()`);
assert.strictEqual(run('RK.rankName(stats().tec.index)'), 'C-'); // 9 mastered = index 9
assert.match(sheet(), /TEC/);
ok('technique checklist replaces the estimate once locked');

// 6. Weekly check-in: built-in analysis and copy text
run('ACTIONS.checkin()');
run('FORMS.checkin')(form({ '#ci-waist': '', '#ci-note': 'birthday cake' }, { rating: 4 }));
assert.match(sheet(), /System analysis/); clean(sheet(), 'check-in');
const txt = run('weekText()');
assert.match(txt, /Ranks: STR D, DUR D\+, SPD C, END D-, TEC C-/); assert.match(txt, /birthday cake/);
ok('check-in analysis and Copy my week text');

// 7. Every tab renders cleanly
run('closeSheet()');
for (const tab of ['today', 'train', 'status', 'progress', 'guide']) { run(`S.ui.tab = '${tab}'; render();`); clean(view(), tab); assert.ok(view().length > 400, tab); }
assert.match(view(), /Download backup/); assert.doesNotMatch(view(), /Sign out/);
ok('all five tabs render with no bad values');

console.log('all app tests passed');
