// Run: node test-sync.js — drives the login + sync wiring in app.js against an in-memory stand-in for Firebase.
const fs = require('fs'), vm = require('vm'), assert = require('assert');

function el(id) {
  return { id, innerHTML: '', textContent: '', hidden: false, style: {}, dataset: {}, get firstChild() { return this.innerHTML ? {} : null; },
    setAttribute() {}, removeAttribute() {}, classList: { toggle() {} }, querySelector() { return null; }, querySelectorAll() { return []; }, blur() {}, focus() {} };
}
const els = {};
const ctx = {
  document: { getElementById: (id) => (els[id] = els[id] || el(id)), querySelectorAll: () => [], addEventListener: () => {}, activeElement: null, hidden: false },
  console, Math, Date, JSON, Number, String, Object, Array, Promise, isFinite, navigator: {}, location: { protocol: 'file:' },
  localStorage: (() => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; })(),
  setTimeout: (fn, ms) => { const t = setTimeout(fn, Math.min(ms || 0, 5)); if (t.unref) t.unref(); return t; }, clearTimeout, setInterval: () => 0, scrollTo: () => {},
};
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
const load = (f) => vm.runInContext(fs.readFileSync(__dirname + '/' + f, 'utf8'), ctx, { filename: f });
const run = (code) => vm.runInContext(code, ctx);

// In-memory "server": path -> body, with listeners.
const server = new Map(), listeners = new Map();
function fakeStore(uid) {
  return {
    doc(path) {
      const key = uid + '/' + path;
      return {
        set: async (body) => { server.set(key, JSON.parse(JSON.stringify(body))); (listeners.get(key) || []).forEach((f) => f()); },
        onSnapshot: (next) => {
          const fire = () => next({ exists: server.has(key), data: () => server.get(key) });
          listeners.set(key, (listeners.get(key) || []).concat(fire));
          Promise.resolve().then(fire);
          return () => listeners.set(key, (listeners.get(key) || []).filter((f) => f !== fire));
        },
      };
    },
  };
}
let authCb = null;
for (const f of ['logic.js', 'ranks.js']) load(f);
run(`window.FIREBASE_CONFIG = { apiKey: 'test', projectId: 'test' };`);
for (const f of ['app.js', 'sync.js']) load(f);
ctx.__fakeStore = fakeStore;
ctx.__setAuth = (cb) => { authCb = cb; };
run(`fbLoad = async () => {}; onAuth = (cb) => __setAuth(cb); firestoreStore = (uid) => __fakeStore(uid);`);
for (const f of ['train.js', 'status.js', 'views.js']) load(f);
const view = () => els.view.innerHTML;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ok = (n) => console.log('ok -', n);

(async () => {
  await wait(10);
  assert.strictEqual(run('S.ui.mode'), 'cloud');
  authCb(null); await wait(10);
  assert.match(view(), /Sign in/); assert.match(view(), /Create account/); ok('signed out: login screen');

  authCb({ uid: 'u1', email: 'fighter@example.com' }); await wait(20);
  assert.match(view(), /Tie on your belt/); ok('first sign-in: onboarding');
  const f = { querySelector: (s) => ({ '#ob-w': { value: '102' }, '#ob-why': { value: 'stay in my corner' } }[s] || null), querySelectorAll: () => [] };
  run('FORMS.onboard')(f); await wait(30);
  assert.strictEqual(server.get('u1/log/profile').startWeight, 102);
  assert.strictEqual(Object.values(server.get('u1/log/weights').entries)[0], 102);
  assert.ok(server.get('u1/log/quests').weeks, 'quest saved after the log loaded'); ok('onboarding writes profile, weight and quest to the server');

  // Another device logs a weigh-in and a habit.
  const w = server.get('u1/log/weights'); w.entries['2026-01-01'] = 101.5;
  await fakeStore('u1').doc('log/weights').set(w); await wait(10);
  assert.strictEqual(run(`S.data.weights['2026-01-01']`), 101.5); ok('changes from another device arrive live');

  run(`ACTIONS.habit({ dataset: { day: today(), key: 'protein' } })`); await wait(30);
  assert.strictEqual(server.get('u1/log/habits').days[run('today()')].protein, 1); ok('a habit tick syncs up');

  authCb(null); await wait(10);
  assert.match(view(), /Sign in/); assert.strictEqual(run('S.data.profile'), null); ok('sign-out clears the screen');

  authCb({ uid: 'u2', email: 'other@example.com' }); await wait(20);
  assert.match(view(), /Tie on your belt/); ok('a different account starts clean');

  authCb({ uid: 'u1', email: 'fighter@example.com' }); await wait(20);
  assert.strictEqual(run('S.data.profile.startWeight'), 102); assert.match(view(), /Morning weigh-in/); ok('signing back in restores the log');
  console.log('all sync tests passed');
})().catch((e) => { console.error(e); process.exit(1); });
