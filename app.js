/* Black Belt Cut — state, storage, shell, Today tab, craving timer, weekly check-in. */
'use strict';

const ACTIONS = {};
const FORMS = {};
const TICKS = [];
function freshData() { return { profile: null, weights: {}, habits: {}, sessions: [], urges: {}, checkins: {}, ranks: {}, quests: {} }; }
const S = {
  data: freshData(),
  ui: { tab: 'today', habitDay: 'today', loaded: false, readOnly: false, mode: 'pending', auth: null, email: '', chartRange: '90', showTable: false, editWeight: false, urge: null, checkin: null, pendingRender: false },
};
const today = () => BB.ymd(new Date());
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtKg = (w) => (w == null ? '–' : (Math.round(w * 10) / 10).toFixed(1));
const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many || one + 's');
const parseKg = (v) => { const n = Number(String(v || '').replace(',', '.').trim()); return isFinite(n) && n > 0 ? Math.round(n * 10) / 10 : null; };
const ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const ICON_FLAME = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22c4 0 7-2.8 7-7 0-4.5-4-7.5-5-12-2.5 2-4 4.5-4 7-1-1-1.6-2-2-3.5C6.5 8.5 5 11 5 15c0 4.2 3 7 7 7z"/></svg>';

// ---------- Storage: Firebase when signed in (sync.js), this browser otherwise ----------
const DEVICE_KEY = 'bbc-log-v1';
let localKey = DEVICE_KEY;
const DOCS = {
  profile: { to: (v) => v || {}, from: (b) => b },
  weights: { to: (v) => ({ entries: v }), from: (b) => b.entries || {} },
  habits: { to: (v) => ({ days: v }), from: (b) => b.days || {} },
  sessions: { to: (v) => ({ list: v }), from: (b) => b.list || [] },
  urges: { to: (v) => ({ days: v }), from: (b) => b.days || {} },
  checkins: { to: (v) => ({ weeks: v }), from: (b) => b.weeks || {} },
  ranks: { to: (v) => v || {}, from: (b) => b },
  quests: { to: (v) => ({ weeks: v }), from: (b) => b.weeks || {} },
};
const store = { db: null, timers: {}, writing: {}, dirty: {}, seen: {}, exists: {}, unsubs: [] };

function readLocal(key) { try { const raw = localStorage.getItem(key || localKey); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }
function writeLocal() { try { localStorage.setItem(localKey, JSON.stringify(S.data)); } catch (e) { /* storage blocked: the synced copy still saves */ } }

function save(key) {
  writeLocal();
  if (!store.db || S.ui.readOnly) return;
  clearTimeout(store.timers[key]);
  store.timers[key] = setTimeout(() => { store.timers[key] = null; flush(key); }, 400);
}
async function flush(key) {
  if (!store.db) return;
  if (store.writing[key]) { store.dirty[key] = true; return; }
  store.writing[key] = true;
  try { await writeDoc(key, false); }
  finally {
    store.writing[key] = false;
    if (store.dirty[key]) { store.dirty[key] = false; flush(key); }
  }
}
async function writeDoc(key, retried) {
  const body = JSON.parse(JSON.stringify(DOCS[key].to(S.data[key])));
  try {
    await store.db.doc('log/' + key).set(body);
    store.exists[key] = true;
  } catch (e) {
    const code = e && e.code;
    if (code === 'unavailable' && !retried) { await new Promise((r) => setTimeout(r, 800 + Math.random() * 1200)); return writeDoc(key, true); }
    if (code === 'invalid_argument') { S.ui.readOnly = true; toast('Sync was refused. Check the Firestore rules (README, step 4).'); scheduleRender(); }
    else if (code === 'quota_exceeded') toast('Storage is full, so your latest change was not saved.');
    else toast('Could not save. Check your connection, then try again.');
  }
}

async function initStore() {
  if (!syncConfigured()) { S.ui.mode = 'local'; loadLocal(DEVICE_KEY); return; }
  render();
  try { await fbLoad(); }
  catch (e) { S.ui.mode = 'local'; S.ui.syncError = true; loadLocal(DEVICE_KEY); return; } // offline on a first visit, or the SDK was blocked
  S.ui.mode = 'cloud';
  onAuth((user) => {
    stopSync();
    S.data = freshData();
    if (!user) { S.ui.auth = 'signed-out'; localKey = DEVICE_KEY; S.ui.loaded = true; render(); return; }
    S.ui.auth = 'signed-in'; S.ui.email = user.email || ''; S.ui.readOnly = false;
    localKey = DEVICE_KEY + ':' + user.uid;
    // First sign-in on a device that was used without sync: the device log comes along.
    const local = readLocal(localKey) || readLocal(DEVICE_KEY);
    if (local) { Object.assign(S.data, local); S.ui.loaded = true; }
    S.ui.tab = 'today';
    render();
    startSync(firestoreStore(user.uid), local);
  });
}
function loadLocal(key) {
  const local = readLocal(key);
  if (local) Object.assign(S.data, local);
  S.ui.loaded = true;
  render();
}
function stopSync() {
  store.unsubs.forEach((u) => { try { u(); } catch (e) { /* already closed */ } });
  Object.values(store.timers).forEach((t) => clearTimeout(t));
  Object.assign(store, { db: null, timers: {}, writing: {}, dirty: {}, seen: {}, exists: {}, unsubs: [] });
  S.ui.cloudReady = false;
  S.ui.loaded = false;
}
function startSync(db, local) {
  store.db = db;
  const keys = Object.keys(DOCS);
  let waiting = keys.length;
  const firstSeen = (key) => {
    if (store.seen[key]) return false;
    store.seen[key] = true;
    if (--waiting === 0) onCloudReady(local);
    return true;
  };
  keys.forEach((key) => {
    store.unsubs.push(db.doc('log/' + key).onSnapshot((snap) => {
      if (snap.exists) store.exists[key] = true;
      // A local edit on its way to the store wins over an older snapshot.
      if (snap.exists && !store.timers[key] && !store.writing[key]) S.data[key] = DOCS[key].from(JSON.parse(JSON.stringify(snap.data())));
      if (!firstSeen(key) && !waiting) { writeLocal(); scheduleRender(); }
    }, (err) => {
      if (err && err.code === 'invalid_argument') S.ui.readOnly = true;
      if (!firstSeen(key)) scheduleRender();
    }));
  });
  // Never leave the page on the loading card if the store is slow to answer.
  setTimeout(() => { if (!S.ui.loaded) { S.ui.loaded = true; render(); } }, 8000);
}
function onCloudReady(local) {
  if (S.ui.cloudReady) return;
  S.ui.cloudReady = true;
  S.ui.loaded = true;
  if (local) Object.keys(DOCS).forEach((key) => { if (!store.exists[key] && local[key] && Object.keys(local[key]).length) save(key); });
  writeLocal();
  render();
}

// ---------- Shell ----------
function isEditing() {
  const a = document.activeElement;
  return !!a && /^(INPUT|TEXTAREA)$/.test(a.tagName) && !!a.closest('#view, #sheet');
}
function scheduleRender() { if (isEditing()) S.ui.pendingRender = true; else render(); }
document.addEventListener('focusout', () => setTimeout(() => {
  if (S.ui.pendingRender && !isEditing()) { S.ui.pendingRender = false; render(); }
}, 0));

function render() {
  renderTop();
  const v = document.getElementById('view');
  if (!S.ui.loaded) return;
  const p = S.data.profile;
  v.classList.toggle('single', S.ui.auth === 'signed-out' || !p || !p.onboarded); // forms stay one centred column on desktop
  if (S.ui.auth === 'signed-out') { v.innerHTML = viewLogin(); setTabs(null); return; }
  if (!p || !p.onboarded) { v.innerHTML = viewOnboarding(); setTabs(null); return; }
  const views = { today: viewToday, train: viewTrain, status: viewStatus, progress: viewProgress, guide: viewGuide };
  v.innerHTML = (views[S.ui.tab] || viewToday)();
  setTabs(S.ui.tab);
}
function setTabs(tab) {
  document.querySelectorAll('.tab').forEach((b) => {
    b.classList.toggle('on', b.dataset.tab === tab);
    if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
}
function go(tab) { S.ui.tab = tab; render(); window.scrollTo(0, 0); }

function beltBar(b) {
  const n = b.index === 6 ? 5 : 4;
  let stripes = '';
  for (let i = 0; i < n; i++) stripes += '<span class="belt-stripe' + (i < b.stripes ? ' on' : '') + '"></span>';
  return '<div class="belt' + (b.index === 6 ? ' is-black' : '') + '" style="--belt-color:' + b.belt.color + '" role="img" aria-label="' + b.belt.name + ' belt, ' + plural(b.stripes, 'stripe') + '"><div class="belt-tip">' + stripes + '</div></div>';
}
function renderTop() {
  const top = document.getElementById('top');
  const p = S.data.profile;
  const tr = BB.latestTrend(BB.trendSeries(S.data.weights));
  const dayNo = p && p.onboarded && p.startDate ? BB.daysBetween(p.startDate, today()) + 1 : 0;
  const brand = '<div class="brand">Black Belt Cut' + (dayNo > 0 ? '<span>Day ' + dayNo + '</span>' : '') + '</div>';
  if (!p || !p.onboarded || tr == null) { top.innerHTML = '<div class="top-row">' + brand + '</div>'; return; }
  const b = BB.beltState(tr, p.startWeight);
  const right = b.next ? b.next.toGo.toFixed(1) + ' kg to ' + b.next.name.toLowerCase() + ' belt'
    : tr <= p.goal ? 'Goal reached' : (tr - p.goal).toFixed(1) + ' kg to your goal';
  top.innerHTML = '<div class="top-row">' + brand + '<div class="top-weight"><b>' + fmtKg(tr) + ' kg</b>7-day average</div></div>' + beltBar(b) +
    '<div class="belt-label"><span><strong>' + b.belt.name + ' belt</strong>' + (b.stripes ? ' · ' + plural(b.stripes, 'stripe') : '') + '</span><span>' + right + '</span></div>';
}

let toastTimer = null;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2800);
}
function openSheet(html) {
  const s = document.getElementById('sheet');
  s.innerHTML = '<div class="sheet" role="dialog" aria-modal="true">' + html + '</div>';
  s.hidden = false;
}
function closeSheet() {
  const s = document.getElementById('sheet');
  s.hidden = true; s.innerHTML = '';
  S.ui.urge = null; S.ui.checkin = null;
  if (S.ui.pendingRender) { S.ui.pendingRender = false; render(); }
}

// ---------- Events ----------
document.addEventListener('click', (ev) => {
  const tab = ev.target.closest('.tab');
  if (tab) { go(tab.dataset.tab); return; }
  if (ev.target.id === 'sheet') { closeSheet(); return; }
  const el = ev.target.closest('[data-act]');
  if (el && ACTIONS[el.dataset.act]) { ev.preventDefault(); ACTIONS[el.dataset.act](el, ev); }
});
document.addEventListener('submit', (ev) => {
  const f = ev.target.closest('[data-form]');
  if (!f) return;
  ev.preventDefault();
  if (FORMS[f.dataset.form]) FORMS[f.dataset.form](f);
});
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && !document.getElementById('sheet').hidden) closeSheet(); });
setInterval(() => TICKS.forEach((f) => f()), 250);

ACTIONS.close = closeSheet;
ACTIONS.go = (el) => go(el.dataset.v);
ACTIONS.pick = (el) => {
  const group = el.closest('[data-group]');
  if (group && group.dataset.multi) el.classList.toggle('on');
  else if (group) group.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c === el));
  el.setAttribute('aria-pressed', el.classList.contains('on'));
};

// ---------- Onboarding ----------
function viewOnboarding() {
  const p = S.data.profile || {};
  const days = p.trainDays || [0, 2, 4];
  const goal = p.goal || 75;
  return '<form class="view" data-form="onboard" style="padding-top:0">' +
    '<div class="card accent"><div class="eyebrow">Day one</div><h2 class="section-title">Tie on your belt</h2>' +
    '<p class="small">Every kilo you lose earns a stripe. Every 5 kg earns the next belt: white above 100 kg, then yellow, orange, green, blue and red, up to black at 75 kg.</p></div>' +
    '<div class="card"><div class="field"><label for="ob-w">Your weight today (kg)</label>' +
    '<input class="input" id="ob-w" inputmode="decimal" autocomplete="off" value="' + esc(p.startWeight || '') + '" placeholder="e.g. 101.5" required>' +
    '<p class="small muted">Weigh yourself in the morning, after the bathroom and before food. No scale yet? Use your best guess and fix it later.</p></div>' +
    '<div class="field"><label>Goal weight</label><div class="chips" data-group="goal">' +
    [75, 72, 70].map((g) => '<button type="button" class="chip' + (goal === g ? ' on' : '') + '" data-act="pick" data-v="' + g + '">' + g + ' kg</button>').join('') +
    '</div></div></div>' +
    '<div class="card"><div class="field"><label for="ob-why">Why do you want this?</label>' +
    '<textarea class="input" id="ob-why" placeholder="Write it for the version of you who wants to quit.">' + esc(p.why || '') + '</textarea>' +
    '<p class="small muted">It shows at the top of every day.</p></div></div>' +
    '<div class="card"><div class="field"><label>Pick your 3 training days</label><div class="chips" data-group="days" data-multi="1">' +
    BB.DAY_NAMES.map((d, i) => '<button type="button" class="chip' + (days.includes(i) ? ' on' : '') + '" data-act="pick" data-v="' + i + '">' + d + '</button>').join('') +
    '</div><p class="small muted">These are reminders, not rules. Any 3 sessions in a week count.</p></div></div>' +
    '<button class="btn block" type="submit">Start day one</button></form>';
}
FORMS.onboard = (f) => {
  const w = parseKg(f.querySelector('#ob-w').value);
  if (!w || w < 40 || w > 250) { toast('Enter your weight in kg, like 101.5'); return; }
  const goalBtn = f.querySelector('[data-group="goal"] .chip.on');
  const days = Array.from(f.querySelectorAll('[data-group="days"] .chip.on')).map((b) => Number(b.dataset.v));
  const t = today();
  const p = Object.assign({ height: 175, age: 18, levels: Object.assign({}, BB.DEFAULT_LEVELS), levers: [] }, S.data.profile || {});
  Object.assign(p, {
    onboarded: true, startDate: t, startWeight: w, goal: goalBtn ? Number(goalBtn.dataset.v) : 75,
    why: f.querySelector('#ob-why').value.trim(), trainDays: days.length ? days : [0, 2, 4],
    seenBelt: BB.beltIndex(w), seenStripes: 0,
  });
  if (!p.levels) p.levels = Object.assign({}, BB.DEFAULT_LEVELS);
  S.data.profile = p;
  S.data.weights[t] = w;
  save('profile'); save('weights');
  S.ui.tab = 'today';
  render();
  toast(BB.BELTS[BB.beltIndex(w)].name + ' belt tied. Day one starts now.');
};

// ---------- Today ----------
function viewToday() {
  const p = S.data.profile, t = today();
  const act = BB.activeHabits(p.levers);
  const last = BB.lastActiveDate(S.data);
  const gap = last ? BB.daysBetween(last, t) : 0;
  const out = ['<h1 class="section-title">Today<small>' + BB.parseYmd(t).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }) + '</small></h1>'];
  if (S.ui.mode === 'local') {
    out.push('<p class="banner">' + (S.ui.syncError ? 'Couldn\'t reach the sync service, so this visit saves on this device only. Reload when you\'re online.'
      : 'Sync is off, so your log stays on this device. Add your Firebase settings to turn on login and sync (README, step 3).') + '</p>');
  }
  if (S.ui.readOnly) out.push('<p class="banner">Sync was refused, so changes only save on this device. Check the Firestore rules (README, step 4).</p>');
  if (gap >= 3 && p.comebackDismissed !== t) {
    out.push('<div class="card accent"><div class="eyebrow">Welcome back</div><h2>' + gap + ' days away. The plan is still here.</h2>' +
      '<p class="small">No catching up and no penalty. Today, do one thing: the 12-minute short workout, or one meal with the plate rules.</p>' +
      '<div class="row"><button class="btn grow" data-act="start" data-kind="short" type="button">Start short workout</button>' +
      '<button class="btn line grow" data-act="dismiss-comeback" type="button">Just log today</button></div></div>');
  } else if (BB.missedYesterday(S.data.habits, act, t, p.startDate)) {
    out.push('<div class="card quiet" style="padding:0 4px"><p class="small"><b>Yesterday slipped.</b> One off day changes nothing. Never miss twice, so today is the one that counts.</p></div>');
  }
  if (p.why) out.push('<p class="why">' + esc(p.why) + '</p>');
  out.push(workoutCard(), questTeaser(), habitsCard(), weighCard(), cravingCard());
  if (checkinDue()) {
    out.push('<div class="card"><div class="card-head"><h2>Weekly check-in</h2><span class="small muted">2 minutes</span></div>' +
      '<p class="small">Look back at the week, log your waist if you have a tape measure, and adjust one thing if your weight has stalled.</p>' +
      '<button class="btn line" data-act="checkin" type="button">Start check-in</button></div>');
  }
  return out.join('');
}
ACTIONS['dismiss-comeback'] = () => { S.data.profile.comebackDismissed = today(); save('profile'); render(); };

function workoutCard() {
  const p = S.data.profile, t = today();
  const ws = BB.weekStart(t);
  const week = BB.sessionsInWeek(S.data.sessions, ws);
  const doneToday = week.some((s) => s.date === t);
  const remaining = Math.max(0, 3 - week.length);
  const daysLeft = 7 - BB.dow(t);
  const planned = (p.trainDays || []).includes(BB.dow(t));
  let title, sub, primary = true;
  if (doneToday) { title = 'Trained today'; sub = 'Good work. Hit your protein and get to bed on time; that is when the muscle is kept.'; primary = false; }
  else if (remaining === 0) { title = 'Week done: ' + week.length + ' of 3'; sub = 'Anything extra is a bonus. A walk counts too.'; primary = false; }
  else if (planned || remaining >= daysLeft) { title = 'Training day'; sub = plural(remaining, 'session') + ' left this week. The full workout takes about 40 minutes.'; }
  else { title = 'Rest day'; sub = plural(remaining, 'session') + ' left this week and ' + plural(daysLeft, 'day') + ' to fit ' + (remaining === 1 ? 'it' : 'them') + ' in.'; primary = false; }
  let dots = '';
  for (let i = 0; i < 7; i++) {
    const d = BB.addDays(ws, i);
    const ses = week.filter((s) => s.date === d);
    const cls = ses.some((s) => s.kind !== 'short') ? ' full' : ses.length ? ' short' : '';
    dots += '<div class="day' + (d === t ? ' today' : '') + '"><span class="dot' + cls + '">' + (cls ? ICON_CHECK.replace('stroke-width="3"', 'stroke-width="3" width="16" height="16"') : '') + '</span>' + BB.DAY_NAMES[i] + '</div>';
  }
  const streak = BB.weekStreak(S.data.sessions, t, p.startDate);
  const draft = typeof workoutDraft === 'function' ? workoutDraft() : null;
  let buttons = '';
  if (draft) buttons = '<button class="btn grow" data-act="go" data-v="train" type="button">Resume workout</button>';
  else if (!doneToday) buttons = '<button class="btn grow' + (primary ? '' : ' line') + '" data-act="start" data-kind="full" type="button">Start workout</button>' +
    '<button class="btn ghost grow" data-act="start" data-kind="short" type="button">Short · 12 min</button>';
  return '<div class="card"><div class="card-head"><h2>' + title + '</h2><span class="small muted">' + week.length + ' of 3 this week</span></div>' +
    '<p class="small">' + sub + '</p><div class="week">' + dots + '</div>' +
    (buttons ? '<div class="row">' + buttons + '</div>' : '') +
    (streak ? '<p class="small muted">' + plural(streak, 'week') + ' in a row with 3 sessions.</p>' : '') + '</div>';
}

function habitsCard() {
  const p = S.data.profile, t = today();
  const canYesterday = p.startDate < t;
  const which = canYesterday && S.ui.habitDay === 'yesterday' ? 'yesterday' : 'today';
  const day = which === 'yesterday' ? BB.addDays(t, -1) : t;
  const act = BB.activeHabits(p.levers);
  const rec = S.data.habits[day] || {};
  const done = BB.dayDone(rec, act), need = BB.goodDayNeed(act.length);
  const streak = BB.habitStreak(S.data.habits, act, t, p.startDate);
  const rows = act.map((h) => '<button type="button" class="habit' + (rec[h.key] ? ' done' : '') + '" data-act="habit" data-key="' + h.key + '" data-day="' + day + '" aria-pressed="' + !!rec[h.key] + '">' +
    '<span class="tick">' + ICON_CHECK + '</span><span class="habit-text"><b>' + esc(h.title) + '</b><span>' + esc(h.hint) + '</span></span></button>').join('');
  const seg = canYesterday ? '<div class="seg" role="group" aria-label="Day"><button type="button" class="' + (which === 'today' ? 'on' : '') + '" data-act="habit-day" data-v="today">Today</button>' +
    '<button type="button" class="' + (which === 'yesterday' ? 'on' : '') + '" data-act="habit-day" data-v="yesterday">Yesterday</button></div>' : '';
  return '<div class="card"><div class="card-head"><h2>Eating rules</h2>' + seg + '</div><div class="habits">' + rows + '</div>' +
    '<p class="small"><b>' + done + ' of ' + act.length + '</b> done. ' + need + ' makes a good day.' + (streak ? ' Good-day streak: <b>' + streak + '</b>.' : '') + '</p>' +
    '<p class="small muted">One off day keeps your streak. Two in a row resets it.</p></div>';
}
ACTIONS['habit-day'] = (el) => { S.ui.habitDay = el.dataset.v; render(); };
ACTIONS.habit = (el) => {
  const day = el.dataset.day, key = el.dataset.key;
  const rec = Object.assign({}, S.data.habits[day] || {});
  if (rec[key]) delete rec[key]; else rec[key] = 1;
  S.data.habits[day] = rec;
  save('habits');
  const act = BB.activeHabits(S.data.profile.levers);
  if (rec[key] && BB.dayDone(rec, act) === BB.goodDayNeed(act.length)) toast('Good day locked in.');
  render();
};

function weighCard() {
  const t = today(), w = S.data.weights[t];
  const tr = BB.latestTrend(BB.trendSeries(S.data.weights));
  if (w && !S.ui.editWeight) {
    return '<div class="card"><div class="card-head"><h2>Morning weigh-in</h2><button class="linkish" data-act="edit-weight" type="button">Edit</button></div>' +
      '<p><b style="font-size:22px">' + fmtKg(w) + ' kg</b> <span class="small">today · 7-day average ' + fmtKg(tr) + ' kg</span></p>' +
      '<p class="small muted">Daily numbers swing 1–2 kg with water and salt. Only the 7-day average moves your belt.</p></div>';
  }
  return '<form class="card" data-form="weight"><div class="card-head"><h2>Morning weigh-in</h2><span class="small muted">After the bathroom, before food</span></div>' +
    '<div class="row"><input class="input grow" id="w-in" inputmode="decimal" autocomplete="off" placeholder="e.g. 101.4" value="' + (w || '') + '" aria-label="Weight in kg">' +
    '<button class="btn" type="submit">Save</button></div>' +
    '<p class="small muted">Weigh in daily if you can. More weigh-ins make the average steadier.</p></form>';
}
ACTIONS['edit-weight'] = () => { S.ui.editWeight = true; render(); const i = document.getElementById('w-in'); if (i) i.focus(); };
FORMS.weight = (f) => {
  const w = parseKg(f.querySelector('#w-in').value);
  if (!w || w < 40 || w > 250) { toast('Enter your weight in kg, like 101.4'); return; }
  S.data.weights[today()] = w;
  S.ui.editWeight = false;
  save('weights');
  document.activeElement && document.activeElement.blur && document.activeElement.blur();
  render();
  checkPromotion();
};
function checkPromotion() {
  const p = S.data.profile;
  const tr = BB.latestTrend(BB.trendSeries(S.data.weights));
  if (tr == null) return;
  const b = BB.beltState(tr, p.startWeight);
  const mark = b.index * 10 + b.stripes;
  if (b.index > (p.seenBelt || 0)) {
    p.seenBelt = b.index; p.seenStripes = mark; save('profile');
    const lost = Math.max(0, p.startWeight - tr);
    openSheet('<div class="celebrate" style="display:flex;flex-direction:column;gap:14px"><div class="eyebrow">Promotion</div><h2>' + b.belt.name + ' belt</h2>' + beltBar(b) +
      '<p>Your 7-day average is ' + fmtKg(tr) + ' kg: ' + fmtKg(lost) + ' kg down since ' + BB.niceDate(p.startDate) + '.</p>' +
      (b.next ? '<p class="small">Next: ' + b.next.name.toLowerCase() + ' belt at ' + (b.index === 5 ? '75 kg' : 'under ' + b.next.threshold + ' kg') + '.</p>' : '<p class="small">Black belt. Every kilo toward your goal now adds a gold stripe.</p>') +
      '<button class="btn block" data-act="close" type="button">Keep going</button></div>');
  } else if (mark > (p.seenStripes || 0)) {
    p.seenStripes = mark; save('profile');
    if (b.stripes) toast('New stripe on your ' + b.belt.name.toLowerCase() + ' belt.');
  }
}

// ---------- Cravings ----------
function urgeCounts(fromDate) {
  const c = { beaten: 0, snack: 0, ate: 0 };
  Object.keys(S.data.urges).forEach((d) => { if (d >= fromDate) Object.keys(c).forEach((k) => { c[k] += S.data.urges[d][k] || 0; }); });
  return c;
}
function cravingCard() {
  const c = urgeCounts(BB.addDays(today(), -6));
  const total = urgeCounts('0000');
  return '<button class="crave" data-act="urge" type="button">' + ICON_FLAME + '<span><b>Craving something?</b><span>Tap before you eat. Ten minutes decides it.</span></span></button>' +
    (total.beaten ? '<p class="small muted" style="margin-top:-6px">Urges beaten: ' + c.beaten + ' this week, ' + total.beaten + ' in total.</p>' : '');
}
const URGE_MS = 10 * 60 * 1000;
function urgeSheet() {
  const u = S.ui.urge;
  if (u.step === 'ask') {
    return '<div class="eyebrow">Craving check</div><h2>Hungry, or craving?</h2>' +
      '<button class="btn ghost block" style="justify-content:flex-start;text-align:left;min-height:64px" data-act="urge-step" data-v="snack" type="button"><span><b>Actually hungry</b><br><span class="small">It has been 3+ hours since a meal and anything sounds good.</span></span></button>' +
      '<button class="btn ghost block" style="justify-content:flex-start;text-align:left;min-height:64px" data-act="urge-step" data-v="wait" type="button"><span><b>Craving</b><br><span class="small">You want one specific thing, or you are bored, stressed, tired, or it is just there.</span></span></button>';
  }
  if (u.step === 'snack') {
    return '<div class="eyebrow">Real hunger</div><h2>Eat a planned snack</h2><p class="small">Pick one. Protein keeps you full the longest.</p>' +
      '<ul class="small" style="margin:0;padding-left:20px"><li>2–3 boiled eggs</li><li>Greek yogurt or skyr</li><li>A big glass of milk</li><li>A can of tuna</li><li>A piece of fruit and a slice of cheese</li><li>Leftover meat from dinner, a palm-sized piece</li></ul>' +
      '<button class="btn block" data-act="urge-log" data-v="snack" type="button">I had a planned snack</button><button class="btn line block" data-act="close" type="button">Close</button>';
  }
  if (u.step === 'wait') {
    return '<div class="eyebrow">Ride it out</div><h2>Ten minutes</h2><div class="timer work" id="urge-clock">10:00</div>' +
      '<p class="small">Cravings rise and fall like a wave, usually within 10–15 minutes. While you wait, do one of these:</p>' +
      '<ul class="small" style="margin:0;padding-left:20px"><li>Drink a big glass of water</li><li>Shadowbox one 2-minute round</li><li>Brush your teeth</li><li>Leave the kitchen</li><li>Message a friend</li></ul>' +
      '<button class="btn block" data-act="urge-log" data-v="beaten" type="button">The craving is gone</button>' +
      '<button class="btn line block" data-act="urge-step" data-v="decide" type="button">I still want it</button>';
  }
  if (u.step === 'decide') {
    return '<div class="eyebrow">Your call</div><h2>Still want it?</h2><p class="small">A planned snack is a win too. If you eat the thing, log it honestly. One snack never undoes a week.</p>' +
      '<button class="btn block" data-act="urge-step" data-v="snack" type="button">Have a planned snack instead</button>' +
      '<button class="btn line block" data-act="urge-log" data-v="ate" type="button">I ate it</button>';
  }
  const msg = { beaten: ['Urge beaten', 'That is the skill that gets you to black belt. It gets easier every time you do it.'],
    snack: ['Planned snack', 'Exactly how it should go. Hunger handled, plan intact.'],
    ate: ['Logged', 'No damage done. Your next meal is a fresh start: one plate, protein first.'] }[u.outcome];
  return '<div class="eyebrow">Craving check</div><h2>' + msg[0] + '</h2><p>' + msg[1] + '</p><button class="btn block" data-act="close" type="button">Done</button>';
}
ACTIONS.urge = () => { S.ui.urge = { step: 'ask' }; openSheet(urgeSheet()); };
ACTIONS['urge-step'] = (el) => {
  S.ui.urge.step = el.dataset.v;
  if (el.dataset.v === 'wait') S.ui.urge.end = Date.now() + URGE_MS;
  openSheet(urgeSheet());
};
ACTIONS['urge-log'] = (el) => {
  const t = today(), k = el.dataset.v;
  const rec = Object.assign({ beaten: 0, snack: 0, ate: 0 }, S.data.urges[t] || {});
  rec[k] += 1;
  S.data.urges[t] = rec;
  save('urges');
  S.ui.urge = { step: 'done', outcome: k };
  openSheet(urgeSheet());
  render();
};
TICKS.push(() => {
  const u = S.ui.urge;
  if (!u || u.step !== 'wait') return;
  const left = Math.max(0, u.end - Date.now());
  const el = document.getElementById('urge-clock');
  if (el) el.textContent = Math.floor(left / 60000) + ':' + String(Math.floor(left / 1000) % 60).padStart(2, '0');
  if (!left) { u.step = 'decide'; openSheet('<div class="eyebrow">Ten minutes done</div>' + urgeSheet().replace('<div class="eyebrow">Your call</div>', '')); }
});

// ---------- Weekly check-in ----------
function lastCheckinDate() {
  const dates = Object.values(S.data.checkins).map((c) => c.date).sort();
  return dates.length ? dates[dates.length - 1] : null;
}
function checkinDue() {
  const p = S.data.profile, last = lastCheckinDate() || p.startDate;
  return BB.daysBetween(last, today()) >= 7;
}
function weekSummary() {
  const t = today(), from = BB.addDays(t, -6);
  const p = S.data.profile, act = BB.activeHabits(p.levers);
  const series = BB.trendSeries(S.data.weights);
  const tr = BB.latestTrend(series);
  const before = series.filter((x) => x.date < from);
  const tr7 = before.length ? before[before.length - 1].trend : null;
  let good = 0;
  const hits = {};
  for (let d = from; d <= t; d = BB.addDays(d, 1)) {
    if (BB.isGoodDay(S.data.habits[d], act)) good++;
    act.forEach((h) => { if ((S.data.habits[d] || {})[h.key]) hits[h.key] = (hits[h.key] || 0) + 1; });
  }
  return {
    sessions: S.data.sessions.filter((s) => s.date >= from).length,
    good, hits, act, urges: urgeCounts(from), trend: tr, change7: tr != null && tr7 != null ? +(tr - tr7).toFixed(1) : null,
    slope: BB.slopePerWeek(series, t), stalled: BB.isStalled(series, t), belt: tr != null ? BB.beltState(tr, p.startWeight) : null,
  };
}
const RATINGS = ['Rough', 'Meh', 'OK', 'Good', 'Strong'];
function checkinSheet() {
  const c = S.ui.checkin;
  if (c.step === 'form') {
    return '<form data-form="checkin" style="display:flex;flex-direction:column;gap:14px"><div class="eyebrow">Weekly check-in</div><h2>How was the week?</h2>' +
      '<div class="chips" data-group="rating">' + RATINGS.map((r, i) => '<button type="button" class="chip" data-act="pick" data-v="' + (i + 1) + '">' + r + '</button>').join('') + '</div>' +
      '<div class="field"><label for="ci-waist">Waist at the belly button (cm, optional)</label><input class="input" id="ci-waist" inputmode="decimal" autocomplete="off" placeholder="e.g. 104"></div>' +
      '<div class="field"><label for="ci-note">What got in the way? (optional)</label><textarea class="input" id="ci-note" placeholder="Late-night snacking, a party, a busy week…"></textarea></div>' +
      '<button class="btn block" type="submit">See my week</button><button class="btn line block" data-act="close" type="button">Later</button></form>';
  }
  const w = weekSummary();
  const p = S.data.profile;
  const unused = BB.LEVERS.filter((l) => !(p.levers || []).includes(l.key));
  const lines = [
    plural(w.sessions, 'workout') + ' in the last 7 days',
    plural(w.good, 'good eating day') + ' out of 7',
    plural(w.urges.beaten, 'craving') + ' beaten',
    w.change7 == null ? 'Not enough weigh-ins yet to compare weeks' : '7-day average ' + (w.change7 <= 0 ? 'down ' : 'up ') + Math.abs(w.change7).toFixed(1) + ' kg on last week',
  ];
  let adjust = '';
  if (w.stalled && unused.length) {
    adjust = '<div class="card accent"><h2>Your average has stalled for 2 weeks</h2><p class="small">That is normal, and it is the signal to change one thing. Pick one new daily rule. It joins your checklist on Today.</p>' +
      '<div class="habits">' + unused.map((l) => '<button type="button" class="habit" data-act="add-lever" data-key="' + l.key + '"><span class="tick">' + ICON_CHECK + '</span><span class="habit-text"><b>' + esc(l.title) + '</b><span>' + esc(l.hint) + '</span></span></button>').join('') + '</div></div>';
  } else if (w.stalled) {
    adjust = '<div class="card accent"><h2>Your average has stalled for 2 weeks</h2><p class="small">You are already using every rule. Check your portions against the plate in the Guide tab, and make sure you hit 3 sessions every week.</p></div>';
  }
  const coach = '<div class="card"><div class="card-head"><h2>System analysis</h2></div><ul class="small" style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:4px">' +
    weekAdvice(w).map((l) => '<li>' + esc(l) + '</li>').join('') + '</ul>' +
    '<button class="btn line" data-act="copy-week" type="button">Copy my week</button>' +
    '<p class="small muted">Paste it into any AI chat, or send it to a training partner, for a second opinion.</p></div>';
  return '<div class="eyebrow">Weekly check-in</div><h2>Your week</h2><div class="card"><ul class="small" style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:4px">' +
    lines.map((l) => '<li>' + l + '</li>').join('') + '</ul></div>' + adjust + coach + '<button class="btn block" data-act="close" type="button">Done</button>';
}
ACTIONS.checkin = () => { S.ui.checkin = { step: 'form' }; openSheet(checkinSheet()); };
FORMS.checkin = (f) => {
  const r = f.querySelector('[data-group="rating"] .chip.on');
  const waist = parseKg(f.querySelector('#ci-waist').value);
  const t = today(), k = BB.weekStart(t);
  S.data.checkins[k] = Object.assign({}, S.data.checkins[k] || {}, {
    date: t, rating: r ? Number(r.dataset.v) : null, waist: waist && waist > 40 && waist < 250 ? waist : null,
    note: f.querySelector('#ci-note').value.trim().slice(0, 500),
  });
  save('checkins');
  S.ui.checkin = { step: 'result' };
  openSheet(checkinSheet());
  render();
};
ACTIONS['add-lever'] = (el) => {
  const p = S.data.profile;
  p.levers = (p.levers || []).concat(el.dataset.key);
  save('profile');
  toast('Added to your daily rules.');
  openSheet(checkinSheet());
  render();
};
// Built-in feedback: one line per area, plain rules over the week's numbers.
function weekAdvice(w) {
  const out = [];
  const byHits = w.act.slice().sort((a, b) => (w.hits[a.key] || 0) - (w.hits[b.key] || 0));
  const weakest = byHits[0], best = byHits[byHits.length - 1];
  out.push(w.sessions >= 3 ? 'Training: ' + w.sessions + ' sessions. That is the habit that keeps your muscle while the fat goes.'
    : 'Training: ' + w.sessions + ' of 3. Put your next session on tomorrow, even if it is the short version.');
  if (w.good >= 6) out.push('Eating: ' + w.good + ' good days out of 7. Keep the same rules; they are working.');
  else if (weakest) out.push('Eating: your weakest rule was "' + weakest.title + '" (' + (w.hits[weakest.key] || 0) + ' of 7 days). Make it the one you protect this week.');
  if (best && (w.hits[best.key] || 0) >= 6) out.push('Strongest rule: "' + best.title + '". That one is turning automatic.');
  if (w.urges.ate > w.urges.beaten + w.urges.snack) out.push('Cravings won more often than you did. Tap the craving button before you open the fridge, not after.');
  else if (w.urges.beaten) out.push(plural(w.urges.beaten, 'craving') + ' beaten. That is the skill that gets you to black belt.');
  if (w.change7 != null && w.change7 > 0.3 && !w.stalled) out.push('Your average went up ' + w.change7.toFixed(1) + ' kg. One week up is usually salt or water, so judge it after next week.');
  return out;
}
function weekText() {
  const w = weekSummary(), p = S.data.profile, t = today(), ci = S.data.checkins[BB.weekStart(t)] || {};
  const st = RK.statState(S.data, t);
  const ranks = RK.STAT_KEYS.map((k) => RK.STAT_INFO[k].code + ' ' + (st[k].index == null ? 'unranked' : RK.rankName(st[k].index))).join(', ');
  return [
    'My week on Black Belt Cut (' + BB.niceDate(BB.addDays(t, -6)) + ' to ' + BB.niceDate(t) + ')',
    'About me: 18, male, 175 cm. Started at ' + p.startWeight + ' kg on ' + p.startDate + ', goal ' + p.goal + ' kg. Bodyweight training at home 3 times a week, kickboxing and taekwondo background. I eat what my mom cooks, no salads, no calorie counting.',
    'Workouts: ' + w.sessions + ' (target 3). Good eating days: ' + w.good + '/7.',
    'Daily rules: ' + w.act.map((h) => h.title + ' ' + (w.hits[h.key] || 0) + '/7').join('; ') + '.',
    'Cravings: beaten ' + w.urges.beaten + ', planned snack ' + w.urges.snack + ', gave in ' + w.urges.ate + '.',
    '7-day average: ' + (w.trend == null ? 'no data' : w.trend + ' kg') + '. Change vs last week: ' + (w.change7 == null ? 'unknown' : w.change7 + ' kg') +
      '. 4-week pace: ' + (w.slope == null ? 'unknown' : w.slope + ' kg/week') + (w.stalled ? ' (stalled for 2 weeks)' : '') + '.',
    'Ranks: ' + ranks + '.',
    'How the week felt: ' + (ci.rating ? RATINGS[ci.rating - 1] : 'not given') + '. What got in the way: ' + (ci.note || 'not given') + '.',
    'What is the one thing I should change next week?',
  ].join('\n');
}
ACTIONS['copy-week'] = async (el) => {
  const text = weekText();
  try { await navigator.clipboard.writeText(text); toast('Copied. Paste it into any AI chat.'); }
  catch (e) {
    if (!el.nextElementSibling || el.nextElementSibling.tagName !== 'TEXTAREA') el.insertAdjacentHTML('afterend', '<textarea class="input" readonly style="min-height:180px">' + esc(text) + '</textarea>');
    el.nextElementSibling.select();
    toast('Copying is blocked here. Select the text and copy it.');
  }
};
