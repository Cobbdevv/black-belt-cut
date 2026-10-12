/* Black Belt Cut — Status tab: stat ranks F- to S+, weekly quests, rank trials, technique list. */
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

function questTeaser() {
  const q = currentQuest();
  if (!q) return '';
  const c = questCounts(q);
  return '<button type="button" class="sys sys-teaser" data-act="go" data-v="status"><span class="sys-head"><span>' + (q.cleared ? 'Quest clear' : 'Weekly quest') + '</span>' +
    '<span>' + (q.cleared ? 'Counted as a session' : daysLeftText()) + '</span></span><b>' + esc(q.title) + '</b>' +
    '<span class="small">' + c.done + ' of ' + c.total + ' objectives done. ' + (q.cleared ? '' : 'Counts as one of your 3 sessions.') + '</span></button>';
}

// ---------- Status tab ----------
function viewStatus() {
  const st = stats(), q = currentQuest();
  return '<h1 class="section-title">Status</h1>' + statusWindow(st) + (q ? questCard(q) : '') + techniqueCard(st) + trialHistory();
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
  const head = '<div class="sys-head"><span>' + (q.type === 'trial' ? 'Rank trial' : 'Weekly quest · ' + RK.STAT_INFO[q.focus].code) + '</span><span>' + (q.cleared ? 'Clear' : daysLeftText()) + '</span></div>';
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
  return '<div class="obj' + (done ? ' done' : '') + '"><div class="obj-text">' + esc(o.text) + '</div><div class="obj-count">' + (o.unit === 'check' ? (done ? 'Done' : 'Not yet') : shown) + '</div>' + ctl + '</div>';
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

// ---------- Rank trials ----------
function parseResult(v) {
  const s = String(v || '').trim();
  if (!s) return null;
  if (s.includes(':')) { const [m, sec] = s.split(':').map(Number); return isFinite(m) && isFinite(sec) ? m * 60 + sec : null; }
  const n = Number(s.replace(',', '.'));
  return isFinite(n) && n >= 0 ? Math.round(n) : null;
}
function trialForm(prefill, where) {
  return '<form data-form="trial" data-where="' + where + '" class="trial">' + RK.TEST_KEYS.map((k) => {
    const t = RK.TESTS[k], v = prefill && typeof prefill[k] === 'number' ? prefill[k] : '';
    return '<div class="field"><label for="tr-' + k + '">' + RK.STAT_INFO[k].code + ' · ' + t.test + (t.unit === 's' ? ' (seconds, or m:ss)' : '') + '</label>' +
      '<p class="small">' + t.how + '</p><input class="input" id="tr-' + k + '" inputmode="numeric" autocomplete="off" value="' + v + '" placeholder="' + (t.unit === 's' ? 'e.g. 1:25' : 'e.g. 20') + '"></div>';
  }).join('') + '<p class="small">Warm up first. Rest 3–5 minutes between tests. Leave a box empty to skip that test.</p>' +
    '<button class="btn block sys-btn" type="submit">Save results</button></form>';
}
ACTIONS.trial = () => openSheet('<div class="eyebrow">Rank trial</div><h2>Test your stats</h2>' + trialForm(null, 'sheet') + '<button class="btn line block" type="button" data-act="close">Cancel</button>');
FORMS.trial = (f) => {
  const res = { date: today() };
  for (const k of RK.TEST_KEYS) {
    const raw = f.querySelector('#tr-' + k).value, v = parseResult(raw);
    if (raw.trim() && v == null) { toast('Check the ' + RK.TESTS[k].test.toLowerCase() + ' box: numbers only.'); return; }
    if (v != null) res[k] = v;
  }
  if (Object.keys(res).length === 1) { toast('Enter at least one result.'); return; }
  const before = stats();
  S.data.ranks = Object.assign({}, S.data.ranks, { tests: ((S.data.ranks || {}).tests || []).concat(res) });
  save('ranks');
  closeSheet();
  const q = currentQuest();
  if (q && q.type === 'trial' && !q.cleared) {
    RK.TEST_KEYS.forEach((k) => { if (res[k] != null) q.progress[k] = res[k]; });
    if (RK.questDone(q)) { q.cleared = true; q.clearedAt = today(); logQuestSession(q); }
    save('quests');
  }
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  render();
  announce(before, stats(), 'Trial results', 'Your ranks now come from what you measured.');
};
function trialHistory() {
  const tests = ((S.data.ranks || {}).tests || []).slice().reverse();
  if (!tests.length) return '';
  const cell = (t, k) => (typeof t[k] === 'number' ? (k === 'dur' ? RK.fmtTime(t[k]) : t[k]) : '–');
  return '<div class="card"><h2>Trial history</h2><div class="table-wrap"><table><thead><tr><th>Date</th><th>STR</th><th>DUR</th><th>SPD</th><th>END</th></tr></thead><tbody>' +
    tests.map((t) => '<tr><td>' + BB.niceDate(t.date) + '</td>' + RK.TEST_KEYS.map((k) => '<td>' + cell(t, k) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div></div>';
}

// ---------- Techniques ----------
function techniqueCard(st) {
  const tech = (S.data.ranks || {}).tech || {}, mastered = tech.mastered || [];
  const list = S.ui.showTech ? RK.TECHNIQUES : RK.TECHNIQUES.filter((t) => !mastered.includes(t.i)).slice(0, 3);
  const rows = list.map((t) => {
    const on = mastered.includes(t.i);
    return '<button type="button" class="habit' + (on ? ' done' : '') + '" data-act="tech" data-i="' + t.i + '" aria-pressed="' + on + '"><span class="tick">' + ICON_CHECK + '</span>' +
      '<span class="habit-text"><b>' + (t.i + 1) + '. ' + esc(t.name) + '</b><span>' + esc(t.std) + (t.jump ? ' Wait until you are under 90 kg and pain-free for jumping and spinning kicks.' : '') + '</span></span></button>';
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
