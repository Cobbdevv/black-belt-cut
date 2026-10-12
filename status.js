/* Black Belt Cut — Status tab: stat ranks F- to S+, the weekly quest arc, monthly benchmarks, rank trials, technique list. */
'use strict';

const stats = () => RK.statState(S.data, today());
function rankBadge(i) {
  if (i == null) return '<span class="rank r-none" aria-label="Unranked">?</span>';
  return '<span class="rank r-' + RK.tierOf(i) + '">' + RK.rankName(i) + '</span>';
}
// Quests are created once per week and only after the synced log has loaded, so a stale copy never overwrites the real one.
function questReady() { return !!(S.data.profile && S.data.profile.startDate) && (S.ui.mode !== 'cloud' || !!S.ui.cloudReady); }
function currentQuest() {
  if (!questReady()) return null;
  const ws = BB.weekStart(today());
  if (!S.data.quests[ws]) { S.data.quests[ws] = RK.makeQuest(S.data, ws, today()); save('quests'); }
  return S.data.quests[ws];
}
function questCounts(q) {
  if (q.type === 'trial') return { done: RK.TEST_KEYS.filter((k) => typeof q.progress[k] === 'number').length, total: 4 };
  return { done: q.objectives.filter((o) => RK.objectiveDone(q, o)).length, total: q.objectives.length };
}
function daysLeftText() { const left = 6 - BB.dow(today()); return left ? plural(left, 'day') + ' left' : 'Last day'; }
function questWeek() { return RK.weekNo(S.data.profile.startDate, BB.weekStart(today())) + 1; }
function weekLabel() { const n = questWeek(); return 'Week ' + n + (n <= RK.ARC_WEEKS ? ' of ' + RK.ARC_WEEKS : ''); }
const focusCode = (q) => (q.focus === 'gate' ? 'ALL' : RK.STAT_INFO[q.focus].code);
const fmtTest = (k, v) => (k === 'dur' ? RK.fmtTime(v) : String(v));
const testUnit = (k) => (k === 'dur' ? '' : ' ' + RK.TESTS[k].unit);

function questTeaser() {
  const q = currentQuest();
  if (!q) return '';
  const c = questCounts(q);
  return '<button type="button" class="sys sys-teaser" data-act="go" data-v="status"><span class="sys-head"><span>' + (q.cleared ? 'Quest clear' : weekLabel() + ' · quest') + '</span>' +
    '<span>' + (q.cleared ? 'Counted as a session' : daysLeftText()) + '</span></span><b>' + esc(q.title) + '</b>' +
    '<span class="small">' + c.done + ' of ' + c.total + ' objectives done. ' + (q.cleared ? '' : 'Counts as one of your 3 sessions.') + '</span></button>';
}

// ---------- Status tab ----------
function viewStatus() {
  const st = stats(), q = currentQuest();
  return '<h1 class="section-title">Status</h1>' + statusWindow(st) + benchCard() + (q ? questCard(q) : '') + progressCard() + techniqueCard(st) + trialHistory();
}
function statSub(k, s) {
  const t = RK.TESTS[k];
  if (t) {
    if (s.source === 'estimate') return 'Your estimate. The rank trial confirms it.';
    return 'Best: ' + s.value + ' ' + t.unit + (s.next ? ' · ' + s.next.rank + ' at ' + s.next.need : ' · top rank');
  }
  if (k === 'tec') return s.source === 'estimate' ? 'Your estimate. Tick your techniques below to confirm it.' : s.value + ' of 20 techniques mastered';
  if (k === 'wil') return s.source === 'measuring' ? 'Ranks after 7 days of logs (day ' + s.days + ')' : Math.round(s.eat * 100) + '% good eating days, ' + Math.round(s.train * 100) + '% of workouts, last 28 days';
  return s.index >= 20 ? 'Fully awakened' : plural(s.clears, 'quest') + ' cleared · next step in ' + s.toNext;
}
function statusWindow(st) {
  const rows = RK.STAT_KEYS.map((k) => {
    const s = st[k], info = RK.STAT_INFO[k];
    const bar = s.next && RK.TESTS[k] ? '<span class="sys-bar" aria-hidden="true"><i style="width:' + Math.round(Math.max(0, Math.min(1, s.progress)) * 100) + '%"></i></span>' : '';
    return '<div class="sys-row"><span class="sys-code">' + info.code + '</span><span class="sys-name">' + info.name + '<small>' + esc(statSub(k, s)) + '</small>' + bar + '</span>' + rankBadge(s.index) + '</div>';
  }).join('');
  return '<div class="sys"><div class="sys-head"><span>Status</span><span>Overall ' + RK.rankName(st.overall) + '</span></div>' + rows +
    '<p class="sys-note">C is average for your age, A is athletic, S is elite. Trial ranks keep your best result. Willpower is the one that can drop.</p>' +
    '<button class="btn sys-btn" type="button" data-act="trial">Take a rank trial</button></div>';
}

function questCard(q) {
  const head = '<div class="sys-head"><span>' + (q.type === 'trial' ? weekLabel() + ' · rank trial' : weekLabel() + ' · ' + focusCode(q)) + '</span><span>' + (q.cleared ? 'Clear' : daysLeftText()) + '</span></div>';
  let body = '';
  if (q.type === 'trial') {
    body = trialForm(q.progress, 'quest');
  } else {
    body = q.objectives.map((o) => objectiveRow(q, o)).join('');
    const any = q.objectives.some((o) => (Number(q.progress[o.id]) || 0) > 0);
    const trained = S.data.sessions.some((s) => s.date === today() && s.kind === 'quest');
    if (!q.cleared && any && !trained) body += '<button class="linkish sys-link" type="button" data-act="quest-attempt">Stopping for today? Count this attempt as a workout</button>';
  }
  return '<div class="sys sys-quest' + (q.cleared ? ' is-clear' : '') + '">' + head + '<h2 class="sys-title">' + esc(q.title) + '</h2><p class="sys-text">' + esc(q.text) + '</p>' + body +
    (q.cleared ? '<p class="sys-stamp">Quest clear</p>' : '') + '</div>';
}
function guideLinks(ids) {
  const links = (ids || []).filter((g) => guideMove(g)).map((g) => howBtn(g, guideMove(g).name));
  return links.length ? '<div class="obj-how"><span class="small">How to:</span>' + links.join('') + '</div>' : '';
}
function objectiveRow(q, o) {
  const v = Number(q.progress[o.id]) || 0, done = v >= o.target;
  let ctl = '';
  if (o.unit === 'check') {
    ctl = '<button class="btn sys-btn small-btn" type="button" data-act="obj-check" data-o="' + o.id + '" aria-pressed="' + done + '">' + (done ? 'Done' : 'Mark done') + '</button>';
  } else if (o.timer) {
    const t = S.ui.qt && S.ui.qt.oid === o.id ? S.ui.qt : null;
    ctl = t ? '<div class="sys-timer"><span id="qt-label">' + qtLabel(t) + '</span><b id="qt-clock">' + clock(qtLeft(t)) + '</b>' +
      '<span class="row" style="gap:8px"><button class="btn ghost small-btn" type="button" data-act="qt-pause">' + (t.paused ? 'Resume' : 'Pause') + '</button><button class="btn line small-btn" type="button" data-act="qt-stop">Stop</button></span></div>'
      : (done ? '' : '<button class="btn sys-btn small-btn" type="button" data-act="qt-start" data-o="' + o.id + '">Start round timer</button>');
    ctl += '<span class="row" style="gap:6px"><button class="step" type="button" data-act="obj-add" data-o="' + o.id + '" data-n="-1" aria-label="One fewer">&minus;</button><button class="step" type="button" data-act="obj-add" data-o="' + o.id + '" data-n="1" aria-label="One more">+</button></span>';
  } else {
    ctl = '<span class="row" style="gap:6px"><button class="step" type="button" data-act="obj-add" data-o="' + o.id + '" data-n="-' + o.step[0] + '" aria-label="Minus ' + o.step[0] + '">&minus;</button>' +
      o.step.map((n) => '<button class="btn ghost small-btn" type="button" data-act="obj-add" data-o="' + o.id + '" data-n="' + n + '">+' + n + '</button>').join('') + '</span>';
  }
  const shown = o.unit === 's' || /^s,/.test(o.unit) ? RK.fmtTime(Math.min(v, o.target)) + ' / ' + RK.fmtTime(o.target) : Math.min(v, o.target) + ' / ' + o.target + (o.unit === 'check' ? '' : ' ' + o.unit);
  return '<div class="obj' + (done ? ' done' : '') + '"><div class="obj-text">' + esc(o.text) + '</div><div class="obj-count">' + (o.unit === 'check' ? (done ? 'Done' : 'Not yet') : shown) + '</div>' + ctl + guideLinks(o.guides) + '</div>';
}
ACTIONS['obj-add'] = (el) => {
  const q = currentQuest(); if (!q || q.cleared) return;
  const o = q.objectives.find((x) => x.id === el.dataset.o); if (!o) return;
  q.progress[o.id] = Math.max(0, Math.min(o.target, (Number(q.progress[o.id]) || 0) + Number(el.dataset.n)));
  afterQuestProgress(q);
};
ACTIONS['obj-check'] = (el) => {
  const q = currentQuest(); if (!q || q.cleared) return;
  q.progress[el.dataset.o] = q.progress[el.dataset.o] ? 0 : 1;
  afterQuestProgress(q);
};
ACTIONS['quest-attempt'] = () => {
  const q = currentQuest(); if (!q) return;
  logQuestSession(q);
  toast('Counted as a workout. Finish the quest before Sunday to clear it.');
  render();
};
function logQuestSession(q) {
  if (S.data.sessions.some((s) => s.date === today() && s.kind === 'quest')) return;
  S.data.sessions = S.data.sessions.concat({ date: today(), kind: 'quest', focus: q.focus || 'trial', ex: {} });
  save('sessions');
}
function afterQuestProgress(q) {
  save('quests');
  if (!q.cleared && RK.questDone(q)) {
    const before = stats();
    q.cleared = true; q.clearedAt = today();
    save('quests');
    logQuestSession(q);
    if (S.ui.qt) S.ui.qt = null;
    render();
    announce(before, stats(), 'Quest clear', q.title + ' is done. It counts as one of this week\'s sessions.');
    return;
  }
  render();
}

// ---------- Round timer for quest objectives ----------
function qtLeft(t) { return t.phase === 'idle' ? t.work * 1000 : t.paused ? t.left : t.end - Date.now(); }
function qtLabel(t) { return t.phase === 'work' ? 'Round ' + (t.round + 1) + ' of ' + t.rounds + ': go' : t.phase === 'rest' ? 'Rest, then round ' + (t.round + 1) : 'Ready'; }
ACTIONS['qt-start'] = (el) => {
  const q = currentQuest(); if (!q) return;
  const o = q.objectives.find((x) => x.id === el.dataset.o); if (!o || !o.timer) return;
  audioOn(); keepAwake(true);
  const done = Number(q.progress[o.id]) || 0;
  S.ui.qt = { oid: o.id, work: o.timer.work, rest: o.timer.rest, rounds: o.timer.rounds, round: done, phase: 'work', end: Date.now() + o.timer.work * 1000 };
  beep(660, 250, 1);
  render();
};
ACTIONS['qt-pause'] = () => {
  const t = S.ui.qt; if (!t) return;
  if (t.paused) { t.end = Date.now() + t.left; t.paused = false; } else { t.left = Math.max(0, t.end - Date.now()); t.paused = true; }
  render();
};
ACTIONS['qt-stop'] = () => { S.ui.qt = null; keepAwake(false); render(); };
TICKS.push(() => {
  const t = S.ui.qt;
  if (!t || t.paused) return;
  const left = t.end - Date.now();
  if (left > 0) {
    const c = document.getElementById('qt-clock'); if (c) c.textContent = clock(left);
    return;
  }
  const q = currentQuest();
  if (t.phase === 'work') {
    t.round++;
    if (q && !q.cleared) { const o = q.objectives.find((x) => x.id === t.oid); if (o) q.progress[o.id] = Math.min(o.target, Math.max(Number(q.progress[o.id]) || 0, t.round)); }
    if (t.round >= t.rounds) { S.ui.qt = null; beep(880, 200, 3); keepAwake(false); if (q) afterQuestProgress(q); return; }
    t.phase = 'rest'; t.end = Date.now() + t.rest * 1000; beep(440, 300, 2);
    if (q) save('quests');
  } else { t.phase = 'work'; t.end = Date.now() + t.work * 1000; beep(660, 250, 1); }
  if (S.ui.tab === 'status') scheduleRender();
});

// ---------- Rank trials: the four tests, with a stopwatch, timers and pasting ----------
function parseResult(v) {
  const s = String(v || '').trim();
  if (!s) return null;
  if (s.includes(':')) { const [m, sec] = s.split(':').map(Number); return isFinite(m) && isFinite(sec) ? m * 60 + sec : null; }
  const n = Number(s.replace(',', '.'));
  return isFinite(n) && n >= 0 ? Math.round(n) : null;
}
const TIMED = { dur: { up: true, label: 'Start stopwatch' }, spd: { secs: 30, label: 'Start 30 s timer' }, end: { secs: 180, label: 'Start 3:00 timer' } };
const COUNT_IN = 3000;
function ttText(t) {
  const el = Date.now() - t.t0;
  if (t.phase === 'count') return String(Math.max(1, Math.ceil((COUNT_IN - el) / 1000)));
  return TIMED[t.k].up ? RK.fmtTime(Math.floor(el / 1000)) : clock(TIMED[t.k].secs * 1000 - el);
}
function timerCtl(k) {
  const T = TIMED[k];
  if (!T) return '';
  const t = S.ui.tt && S.ui.tt.k === k ? S.ui.tt : null;
  if (!t) return '<button class="btn ghost small-btn tt-btn" type="button" data-act="tt-start" data-k="' + k + '">' + T.label + '</button>';
  return '<div class="tt-run"><b class="tt-clock">' + ttText(t) + '</b><span class="small">' + (t.phase === 'count' ? 'Get set' : T.up ? 'Stop when your form breaks' : 'Go!') + '</span>' +
    '<button class="btn line small-btn" type="button" data-act="tt-stop">' + (T.up && t.phase === 'run' ? 'Stop' : 'Cancel') + '</button></div>';
}
function setTrialValue(k, v) {
  S.ui.trialDraft = Object.assign({}, S.ui.trialDraft, { [k]: String(v) });
  document.querySelectorAll('#tr-' + k).forEach((i) => { i.value = String(v); });
}
function trialForm(prefill, where, month) {
  const draft = S.ui.trialDraft || {};
  return '<form data-form="trial" data-where="' + where + '"' + (month ? ' data-m="' + month + '"' : '') + ' class="trial">' + RK.TEST_KEYS.map((k) => {
    const t = RK.TESTS[k];
    const v = draft[k] != null ? draft[k] : prefill && typeof prefill[k] === 'number' ? fmtTest(k, prefill[k]) : '';
    return '<div class="field trial-test"><div class="tt-head"><label for="tr-' + k + '">' + RK.STAT_INFO[k].code + ' · ' + t.test + (t.unit === 's' ? ' (m:ss or seconds)' : '') + '</label>' + howBtn(t.guide, 'How to') + '</div>' +
      '<p class="small">' + t.how + '</p>' + timerCtl(k) +
      '<input class="input" id="tr-' + k + '" inputmode="' + (t.unit === 's' ? 'text' : 'numeric') + '" autocomplete="off" value="' + esc(v) + '" placeholder="' + (t.unit === 's' ? 'e.g. 1:25' : 'e.g. 20') + '"></div>';
  }).join('') +
    '<details class="paste"><summary>Paste your results instead</summary><textarea class="input" id="tr-paste" placeholder="push-ups 18, plank 1:40, kicks 27, burpees 31"></textarea>' +
    '<button class="btn line small-btn" type="button" data-act="tr-paste">Fill in the boxes</button></details>' +
    '<p class="small">Warm up first. Rest 3–5 minutes between tests. Leave a box empty to skip that test.</p>' +
    '<button class="btn block' + (where === 'sheet' ? '' : ' sys-btn') + '" type="submit">Save results</button></form>';
}
document.addEventListener('input', (ev) => {
  const m = /^tr-(str|dur|spd|end)$/.exec((ev.target && ev.target.id) || '');
  if (m) S.ui.trialDraft = Object.assign({}, S.ui.trialDraft, { [m[1]]: ev.target.value });
});
ACTIONS['tr-paste'] = (el) => {
  const box = el.closest('form').querySelector('#tr-paste');
  const got = RK.parseTrialText(box ? box.value : '');
  const keys = RK.TEST_KEYS.filter((k) => got[k] != null);
  if (!keys.length) { toast('No results found. Try: push-ups 18, plank 1:40, kicks 27, burpees 31'); return; }
  keys.forEach((k) => setTrialValue(k, fmtTest(k, got[k])));
  toast('Filled in ' + keys.map((k) => RK.STAT_INFO[k].code).join(', ') + '. Check them, then save.');
};
ACTIONS['tt-start'] = (el) => {
  audioOn(); keepAwake(true);
  S.ui.tt = { k: el.dataset.k, phase: 'count', t0: Date.now() };
  beep(440, 120, 1);
  render();
};
ACTIONS['tt-stop'] = () => {
  const t = S.ui.tt;
  if (!t) return;
  S.ui.tt = null;
  keepAwake(false);
  render();
  if (TIMED[t.k].up && t.phase === 'run') setTrialValue(t.k, RK.fmtTime(Math.floor((Date.now() - t.t0) / 1000)));
};
TICKS.push(() => {
  const t = S.ui.tt;
  if (!t) return;
  const T = TIMED[t.k], el = Date.now() - t.t0;
  if (t.phase === 'count' && el >= COUNT_IN) { t.phase = 'run'; t.t0 = Date.now(); beep(880, 300, 1); scheduleRender(); return; }
  if (t.phase === 'run' && !T.up && el >= T.secs * 1000) {
    S.ui.tt = null; beep(880, 200, 3); keepAwake(false); scheduleRender();
    toast('Time! Enter your count.');
    setTimeout(() => { const i = document.getElementById('tr-' + t.k); if (i) i.focus(); }, 50);
    return;
  }
  document.querySelectorAll('.tt-clock').forEach((c) => { c.textContent = ttText(t); });
});
ACTIONS.trial = () => openSheet('<div class="eyebrow">Rank trial</div><h2>Test your stats</h2>' + trialForm(null, 'sheet') + '<button class="btn line block" type="button" data-act="close">Cancel</button>');
FORMS.trial = (f) => {
  const ds = f.dataset || {}, where = ds.where, month = Number(ds.m) || null;
  const res = { date: today() };
  for (const k of RK.TEST_KEYS) {
    const raw = f.querySelector('#tr-' + k).value, v = parseResult(raw);
    if (raw.trim() && v == null) { toast('Check the ' + RK.TESTS[k].test.toLowerCase() + ' box: numbers only.'); return; }
    if (v != null) res[k] = v;
  }
  if (Object.keys(res).length === 1) { toast('Enter at least one result.'); return; }
  const before = stats();
  const q = currentQuest();
  const forQuest = where !== 'bench' && q && q.type === 'trial' && !q.cleared;
  if (month) res.tag = 'month-' + month; else if (forQuest) res.tag = 'awakening';
  S.data.ranks = Object.assign({}, S.data.ranks, { tests: ((S.data.ranks || {}).tests || []).concat(res) });
  let report = null;
  if (where === 'bench' && month) {
    const bench = Object.assign({}, S.data.ranks.bench);
    const rec = Object.assign({ progress: {} }, bench[month]);
    rec.progress = Object.assign({}, rec.progress);
    RK.TEST_KEYS.forEach((k) => { if (res[k] != null) rec.progress[k] = res[k]; });
    if (!rec.done && RK.TEST_KEYS.every((k) => typeof rec.progress[k] === 'number')) { rec.done = true; rec.doneAt = today(); logTestSession(month); report = month; }
    bench[month] = rec;
    S.data.ranks.bench = bench;
  }
  save('ranks');
  S.ui.trialDraft = null; S.ui.tt = null;
  closeSheet();
  if (forQuest) {
    RK.TEST_KEYS.forEach((k) => { if (res[k] != null) q.progress[k] = res[k]; });
    if (RK.questDone(q)) { q.cleared = true; q.clearedAt = today(); logQuestSession(q); }
    save('quests');
  }
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  render();
  if (report) openSheet(benchReport(report, before));
  else announce(before, stats(), month ? 'Benchmark saved' : 'Trial results', month ? 'Saved. Finish all four tests to see your month ' + month + ' report.' : 'Your ranks now come from what you measured.');
};
function logTestSession(month) {
  if (S.data.sessions.some((s) => s.date === today() && (s.kind === 'test' || s.kind === 'quest'))) return;
  S.data.sessions = S.data.sessions.concat({ date: today(), kind: 'test', focus: 'month-' + month, ex: {} });
  save('sessions');
}
function trialHistory() {
  const tests = ((S.data.ranks || {}).tests || []).slice().reverse();
  if (!tests.length) return '';
  const cell = (t, k) => (typeof t[k] === 'number' ? fmtTest(k, t[k]) : '–');
  return '<div class="card"><h2>Trial history</h2><div class="table-wrap"><table><thead><tr><th>Date</th><th>STR</th><th>DUR</th><th>SPD</th><th>END</th></tr></thead><tbody>' +
    tests.map((t) => '<tr><td>' + BB.niceDate(t.date) + (t.tag ? '<br><span class="muted">' + (t.tag === 'awakening' ? 'Awakening' : 'Month ' + t.tag.slice(6)) + '</span>' : '') + '</td>' +
      RK.TEST_KEYS.map((k) => '<td>' + cell(t, k) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div></div>';
}

// ---------- Monthly benchmark and "how far you've come" ----------
function benchState() { return questReady() ? RK.benchDue(S.data, today()) : null; }
function benchRec(m) { return (((S.data.ranks || {}).bench || {})[m]) || { progress: {} }; }
function benchTeaser() {
  const b = benchState();
  if (!b) return '';
  const done = RK.TEST_KEYS.filter((k) => typeof benchRec(b.month).progress[k] === 'number').length;
  return '<button type="button" class="sys sys-teaser" data-act="go" data-v="status"><span class="sys-head"><span>Month ' + b.month + ' benchmark</span><span>' + (b.overdue ? 'Overdue' : daysLeftText()) + '</span></span>' +
    '<b>How far have you come?</b><span class="small">' + done + ' of 4 tests done. The same four tests as your Awakening, on a rested day.</span></button>';
}
function benchCard() {
  const b = benchState();
  if (!b) return '';
  return '<div class="sys sys-quest"><div class="sys-head"><span>Benchmark · month ' + b.month + '</span><span>' + (b.overdue ? 'Overdue' : daysLeftText()) + '</span></div>' +
    '<h2 class="sys-title">Month ' + b.month + ' benchmark</h2><p class="sys-text">' +
    (b.overdue ? 'The end-of-month test is still open. Take it as soon as you can; the next one replaces it.' : 'End of month ' + b.month + '. Take the same four tests as your Awakening, rested and warmed up, and see how far you have come.') +
    '</p>' + trialForm(benchRec(b.month).progress, 'bench', b.month) + '</div>';
}
function weightAt(date) {
  const s = BB.trendSeries(S.data.weights).filter((x) => !date || x.date <= date);
  return s.length ? s[s.length - 1].trend : null;
}
const signed = (v, k) => (v > 0 ? '+' : v < 0 ? '−' : '±') + (k === 'dur' ? RK.fmtTime(Math.abs(v)) : Math.abs(v));
function benchReport(m, before) {
  const H = RK.benchHistory(S.data), base = H[0], now = H.find((h) => h.month === m);
  const prev = H.filter((h) => h.month > 0 && h.month < m).pop();
  const p = S.data.profile, t = today(), since = BB.addDays(t, -27);
  const rows = RK.TEST_KEYS.map((k) => {
    const a = base && base !== now ? base.values[k] : null, b = now ? now.values[k] : null;
    if (b == null) return '';
    const th = RK.TESTS[k].th, ra = a == null ? null : RK.indexFor(th, a), rb = RK.indexFor(th, b);
    const sub = a == null ? 'No Awakening result to compare' : signed(b - a, k) + ' since the Awakening' + (prev && prev.values[k] != null ? ' · ' + signed(b - prev.values[k], k) + ' since month ' + prev.month : '');
    return '<div class="sys-row"><span class="sys-code">' + RK.STAT_INFO[k].code + '</span><span class="sys-name">' + (a == null ? '' : fmtTest(k, a) + ' → ') + fmtTest(k, b) + testUnit(k) +
      '<small>' + sub + '</small></span><span class="rank-move">' + (ra == null || ra === rb ? '' : rankBadge(ra) + '<i>→</i>') + rankBadge(rb) + '</span></div>';
  }).join('');
  const gains = RK.TEST_KEYS.filter((k) => base && now && base !== now && base.values[k] > 0 && now.values[k] != null).map((k) => ({ k, g: (now.values[k] - base.values[k]) / base.values[k] }));
  gains.sort((x, y) => y.g - x.g);
  const w = weightAt(t), act = BB.activeHabits(p.levers);
  let good = 0;
  for (let d = since; d <= t; d = BB.addDays(d, 1)) if (BB.isGoodDay(S.data.habits[d], act)) good++;
  const facts = [
    w == null ? null : 'Weight: ' + fmtKg(p.startWeight) + ' → ' + fmtKg(w) + ' kg (7-day average), ' + fmtKg(Math.abs(p.startWeight - w)) + ' kg ' + (w <= p.startWeight ? 'down' : 'up') + ' since day one.',
    plural(S.data.sessions.filter((s) => s.date >= since).length, 'session') + ' and ' + plural(good, 'good eating day') + ' in the last 4 weeks.',
    gains.length ? 'Biggest jump: ' + RK.STAT_INFO[gains[0].k].name + ' (' + (gains[0].g >= 0 ? '+' : '') + Math.round(gains[0].g * 100) + '%).' : null,
    gains.length > 1 ? 'Next month, push ' + RK.STAT_INFO[gains[gains.length - 1].k].name.toLowerCase() + '. It moved the least.' : null,
  ].filter(Boolean);
  const after = stats();
  const moved = before ? RK.STAT_KEYS.filter((k) => !RK.TESTS[k] && after[k].index != null && before[k].index !== after[k].index) : [];
  return '<div class="sys sys-msg"><div class="sys-head"><span>System</span><span>Month ' + m + ' report</span></div>' +
    '<h2 class="sys-title">How far you\'ve come</h2>' + rows +
    moved.map((k) => '<div class="sys-row"><span class="sys-code">' + RK.STAT_INFO[k].code + '</span><span class="sys-name">' + RK.STAT_INFO[k].name + '<small>Rank changed</small></span><span class="rank-move">' + rankBadge(after[k].index) + '</span></div>').join('') +
    '<ul class="sys-text report-facts">' + facts.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' +
    '<button class="btn block" type="button" data-act="close">Continue</button>';
}
ACTIONS['bench-report'] = (el) => openSheet(benchReport(Number(el.dataset.m)));
function progressCard() {
  const H = RK.benchHistory(S.data);
  if (H.length < 2) {
    return H.length ? '<div class="card"><div class="card-head"><h2>How far you\'ve come</h2></div><p class="small">Your Awakening results are your starting line. At the end of every 4th week a benchmark retakes the same tests, and this table shows the change.</p></div>' : '';
  }
  const last = H[H.length - 1];
  const head = '<tr><th>Test</th>' + H.map((h) => '<th>' + esc(h.month ? 'M' + h.month : 'Start') + '</th>').join('') + '<th>Change</th></tr>';
  const rows = RK.TEST_KEYS.map((k) => {
    const a = H[0].values[k], b = last.values[k];
    return '<tr><td>' + RK.STAT_INFO[k].code + '</td>' + H.map((h) => '<td>' + (h.values[k] == null ? '–' : fmtTest(k, h.values[k])) + '</td>').join('') +
      '<td>' + (a == null || b == null ? '–' : signed(b - a, k)) + '</td></tr>';
  }).join('');
  const wRow = '<tr><td>KG</td>' + H.map((h, i) => '<td>' + fmtKg(i === 0 ? S.data.profile.startWeight : weightAt(h.date)) + '</td>').join('') + '<td></td></tr>';
  return '<div class="card"><div class="card-head"><h2>How far you\'ve come</h2>' + (last.done && last.month ? '<button class="linkish" type="button" data-act="bench-report" data-m="' + last.month + '">Month ' + last.month + ' report</button>' : '') + '</div>' +
    '<div class="table-wrap"><table><thead>' + head + '</thead><tbody>' + rows + wRow + '</tbody></table></div>' +
    '<p class="small muted">Start is your Awakening. Each month column is that month\'s benchmark.</p></div>';
}

// ---------- Techniques ----------
function techniqueCard(st) {
  const tech = (S.data.ranks || {}).tech || {}, mastered = tech.mastered || [];
  const list = S.ui.showTech ? RK.TECHNIQUES : RK.TECHNIQUES.filter((t) => !mastered.includes(t.i)).slice(0, 3);
  const rows = list.map((t) => {
    const on = mastered.includes(t.i);
    return '<div class="tech-row"><button type="button" class="habit' + (on ? ' done' : '') + '" data-act="tech" data-i="' + t.i + '" aria-pressed="' + on + '"><span class="tick">' + ICON_CHECK + '</span>' +
      '<span class="habit-text"><b>' + (t.i + 1) + '. ' + esc(t.name) + '</b><span>' + esc(t.std) + (t.jump ? ' Wait until you are under 90 kg and pain-free for jumping and spinning kicks.' : '') + '</span></span></button>' +
      (t.guide ? howBtn(t.guide, 'How to') : '') + '</div>';
  }).join('');
  const intro = tech.assessed ? '<p class="small">Mastered means you can do it to the standard on a normal day, not on your best day. Form Mastery quests work through these in order.</p>'
    : '<p class="small">Tick every technique you can already do to the standard. Be strict: if you only kind of can, leave it. Then lock it in to replace your estimate.</p>';
  return '<div class="card"><div class="card-head"><h2>Techniques</h2><span class="small muted">' + mastered.length + ' of 20 · ' + rankBadge(st.tec.index) + '</span></div>' + intro +
    '<div class="habits">' + rows + '</div>' +
    '<button class="linkish" type="button" data-act="tech-all" style="align-self:flex-start">' + (S.ui.showTech ? 'Show only the next ones' : 'Show all 20') + '</button>' +
    (tech.assessed ? '' : '<button class="btn line" type="button" data-act="tech-lock">Lock in my techniques</button>') + '</div>';
}
ACTIONS['tech-all'] = () => { S.ui.showTech = !S.ui.showTech; render(); };
ACTIONS.tech = (el) => {
  const i = Number(el.dataset.i);
  const tech = Object.assign({ mastered: [] }, (S.data.ranks || {}).tech);
  const before = stats();
  tech.mastered = tech.mastered.includes(i) ? tech.mastered.filter((x) => x !== i) : tech.mastered.concat(i);
  S.data.ranks = Object.assign({}, S.data.ranks, { tech });
  save('ranks');
  render();
  if (tech.assessed && tech.mastered.includes(i)) announce(before, stats(), 'Technique mastered', RK.TECHNIQUES[i].name + ' is yours.');
};
ACTIONS['tech-lock'] = () => {
  const before = stats();
  S.data.ranks = Object.assign({}, S.data.ranks, { tech: Object.assign({ mastered: [] }, (S.data.ranks || {}).tech, { assessed: true }) });
  save('ranks');
  render();
  announce(before, stats(), 'Technique assessed', 'Every technique you master from now on raises your rank one step.');
};

// ---------- System messages ----------
function announce(before, after, title, line) {
  // Show every stat whose rank moved, plus estimates the trial just confirmed.
  const changes = RK.STAT_KEYS.filter((k) => after[k].index != null && (before[k].index !== after[k].index || before[k].source !== after[k].source)).map((k) => {
    const from = before[k].index, to = after[k].index, wasEstimate = before[k].source === 'estimate';
    const note = from == null ? 'Ranked' : to > from ? 'Rank up' : to === from ? 'Confirmed' : wasEstimate ? 'Measured below your estimate. Ranks only climb from here.' : 'Rank down';
    return '<div class="sys-row"><span class="sys-code">' + RK.STAT_INFO[k].code + '</span><span class="sys-name">' + (from == null ? 'New rank' : (wasEstimate ? 'Estimate ' : '') + RK.rankName(from) + ' →') +
      '<small>' + note + '</small></span>' + rankBadge(to) + '</div>';
  }).join('');
  openSheet('<div class="sys sys-msg"><div class="sys-head"><span>System</span><span>' + esc(title) + '</span></div><p class="sys-text">' + esc(line) + '</p>' + changes +
    '</div><button class="btn block" type="button" data-act="close">Continue</button>');
}
