/* Black Belt Cut — Train tab: workout plan, live session, rest timer, round timer. */
'use strict';

const DRAFT_KEY = 'bbc-workout-v1';
let DRAFT = null;
try { DRAFT = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch (e) { DRAFT = null; }
function saveDraft() {
  try { if (DRAFT) localStorage.setItem(DRAFT_KEY, JSON.stringify(DRAFT)); else localStorage.removeItem(DRAFT_KEY); } catch (e) { /* draft lives in memory only */ }
}
function workoutDraft() {
  if (DRAFT && DRAFT.date !== today()) { DRAFT = null; saveDraft(); }
  return DRAFT;
}
function clock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0');
}
const unit = (def) => (def.unit === 's' ? 's' : 'reps');
const perSide = (def) => (def.side ? ' per ' + def.side : '');

// ---------- Sound, vibration, screen awake ----------
let AC = null;
function audioOn() {
  try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) { AC = null; }
}
function beep(freq, ms, times) {
  try { if (navigator.vibrate) navigator.vibrate(200); } catch (e) { /* not supported */ }
  if (!AC) return;
  try {
    for (let i = 0; i < (times || 1); i++) {
      const o = AC.createOscillator(), g = AC.createGain();
      const t0 = AC.currentTime + i * (ms / 1000 + 0.1);
      o.type = 'square'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.15, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + ms / 1000);
      o.connect(g); g.connect(AC.destination);
      o.start(t0); o.stop(t0 + ms / 1000 + 0.02);
    }
  } catch (e) { /* audio blocked */ }
}
let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && !wakeLock && navigator.wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch (e) { wakeLock = null; }
}

// ---------- Plan (no workout running) ----------
function buildEx(pat, lvl, nSets) {
  const t = BB.targetsFor(S.data.sessions, pat, lvl, nSets);
  return { lvl, reps: t.targets.slice(), done: t.targets.map(() => false), last: t.last ? t.last.reps : null };
}
function levelButtons(pat, lvl, easy, hard) {
  const n = BB.LADDERS[pat].levels.length;
  return '<div class="lvl-btns"><button class="btn line small-btn" type="button" data-act="level" data-pat="' + pat + '" data-d="-1"' + (lvl <= 1 ? ' disabled' : '') + '>' + easy + '</button>' +
    '<button class="btn line small-btn" type="button" data-act="level" data-pat="' + pat + '" data-d="1"' + (lvl >= n ? ' disabled' : '') + '>' + hard + '</button></div>';
}
function exHead(pat, lvl) {
  const def = BB.levelDef(pat, lvl);
  return '<div class="ex-head"><div><div class="ex-name">' + def.name + '</div><div class="ex-cue">' + def.cue + '</div></div>' +
    '<span class="lvl">' + BB.LADDERS[pat].label + ' ' + lvl + '/' + BB.LADDERS[pat].levels.length + '</span></div>';
}
function viewTrain() {
  const d = workoutDraft();
  return d ? viewSession(d) : viewPlan();
}
function viewPlan() {
  const p = S.data.profile, levels = Object.assign({}, BB.DEFAULT_LEVELS, p.levels);
  const fin = BB.FINISHERS[BB.nextFinisher(S.data.sessions)];
  const rows = BB.ORDER.map((pat) => {
    const lvl = levels[pat], def = BB.levelDef(pat, lvl);
    const t = BB.targetsFor(S.data.sessions, pat, lvl, 3);
    return '<div class="card ex">' + exHead(pat, lvl) +
      '<p class="small">Next target: <b>' + t.targets.join(' · ') + '</b> ' + unit(def) + perSide(def) + '. Range ' + def.min + '–' + def.max + '.</p>' +
      levelButtons(pat, lvl, 'Easier', 'Harder') + '</div>';
  }).join('');
  return '<div class="card-head"><h1 class="section-title">Next workout</h1><span class="small muted">about 40 min</span></div>' +
    '<p class="small">Full body: 3 sets of each move with 60 seconds of rest, then ' + BB.roundsTarget(S.data.sessions) + ' ' + fin.name.toLowerCase() + '. ' +
    'Beat last time by one rep. Hit the top of the range on every set and you move up a level automatically.</p>' +
    '<div class="row"><button class="btn grow" data-act="start" data-kind="full" type="button">Start workout</button>' +
    '<button class="btn ghost grow" data-act="start" data-kind="short" type="button">Short · 12 min</button></div>' + rows +
    '<div class="card"><div class="ex-name">' + fin.name + '</div><p class="ex-cue">' + fin.cue + '</p>' +
    '<p class="small">2-minute rounds with 1 minute of rest. Boxing and kick rounds take turns, and you add a round every 6 workouts.</p></div>' +
    '<p class="small muted">No equipment needed. If you buy one thing, make it a doorway pull-up bar. It upgrades every pull exercise.</p>';
}
ACTIONS.start = (el) => {
  const kind = el.dataset.kind === 'short' ? 'short' : 'full';
  const levels = Object.assign({}, BB.DEFAULT_LEVELS, S.data.profile.levels);
  const nSets = kind === 'full' ? 3 : 2;
  const ex = {};
  (kind === 'full' ? BB.ORDER : ['squat', 'push', 'pull']).forEach((pat) => { ex[pat] = buildEx(pat, levels[pat], nSets); });
  DRAFT = {
    date: today(), kind, nSets, started: Date.now(), finisher: BB.nextFinisher(S.data.sessions),
    roundsTarget: kind === 'full' ? BB.roundsTarget(S.data.sessions) : 1, roundsDone: 0, warmup: false, ex, round: { phase: 'idle' },
  };
  saveDraft();
  audioOn();
  keepAwake(true);
  closeSheet();
  go('train');
};
ACTIONS.level = (el) => {
  const p = S.data.profile, pat = el.dataset.pat, n = BB.LADDERS[pat].levels.length;
  p.levels = Object.assign({}, BB.DEFAULT_LEVELS, p.levels);
  p.levels[pat] = Math.max(1, Math.min(n, p.levels[pat] + Number(el.dataset.d)));
  save('profile');
  if (DRAFT && DRAFT.ex[pat]) { DRAFT.ex[pat] = buildEx(pat, p.levels[pat], DRAFT.nSets); saveDraft(); }
  render();
};

// ---------- Live session ----------
function viewSession(d) {
  const mins = Math.max(0, Math.floor((Date.now() - d.started) / 60000));
  const out = ['<div class="card-head"><h1 class="section-title">' + (d.kind === 'full' ? 'Workout' : 'Short workout') + '</h1><span class="small muted" id="elapsed">' + mins + ' min</span></div>'];
  if (d.kind === 'full') {
    out.push('<div class="card"><div class="ex-head"><div><div class="ex-name">Warm-up · 3 minutes</div>' +
      '<div class="ex-cue">Arm circles, leg swings, 20 jumping jacks or marching on the spot, then one easy round of shadowboxing.</div></div>' +
      '<div class="set' + (d.warmup ? ' done' : '') + '" style="display:block"><button class="ok" type="button" data-act="warmup" aria-pressed="' + d.warmup + '" aria-label="Warm-up done">' + ICON_CHECK + '</button></div></div></div>');
  }
  Object.keys(d.ex).forEach((pat) => out.push(exCard(d, pat)));
  out.push(finisherCard(d));
  const doneSets = Object.values(d.ex).reduce((a, e) => a + e.done.filter(Boolean).length, 0);
  out.push('<button class="btn block" data-act="finish" type="button"' + (doneSets ? '' : ' disabled') + '>Finish workout</button>');
  out.push('<button class="btn line block" data-act="discard" type="button">' + (S.ui.confirmDiscard ? 'Tap again to discard this workout' : 'Discard workout') + '</button>');
  return out.join('');
}
function exCard(d, pat) {
  const e = d.ex[pat], def = BB.levelDef(pat, e.lvl);
  const sets = e.reps.map((r, i) => '<div class="set' + (e.done[i] ? ' done' : '') + '"><span class="n">Set ' + (i + 1) + '</span>' +
    '<button class="step" type="button" data-act="rep" data-pat="' + pat + '" data-i="' + i + '" data-d="-1" aria-label="Fewer">&minus;</button>' +
    '<span class="val">' + r + ' <small>' + unit(def) + '</small></span>' +
    '<button class="step" type="button" data-act="rep" data-pat="' + pat + '" data-i="' + i + '" data-d="1" aria-label="More">+</button>' +
    '<button class="ok" type="button" data-act="set" data-pat="' + pat + '" data-i="' + i + '" aria-pressed="' + e.done[i] + '" aria-label="Set ' + (i + 1) + ' done">' + ICON_CHECK + '</button></div>').join('');
  const last = e.last ? 'Last time: ' + e.last.join(' · ') + ' ' + unit(def) + '. Beat it by one.' : 'First time at this level. Start at ' + def.min + ' ' + unit(def) + perSide(def) + '.';
  return '<div class="card ex">' + exHead(pat, e.lvl) + '<p class="last">' + last + ' Top of range: ' + def.max + perSide(def) + '.</p>' +
    '<div class="sets">' + sets + '</div>' + levelButtons(pat, e.lvl, 'Too hard', 'Too easy') + '</div>';
}
ACTIONS.rep = (el) => {
  if (!DRAFT) return;
  const pat = el.dataset.pat, e = DRAFT.ex[pat], i = Number(el.dataset.i), def = BB.levelDef(pat, e.lvl);
  const step = def.unit === 's' ? 5 : 1;
  e.reps[i] = Math.max(0, Math.min(def.unit === 's' ? 300 : 100, e.reps[i] + step * Number(el.dataset.d)));
  saveDraft();
  render();
};
ACTIONS.set = (el) => {
  if (!DRAFT) return;
  const e = DRAFT.ex[el.dataset.pat], i = Number(el.dataset.i);
  e.done[i] = !e.done[i];
  if (e.done[i]) { audioOn(); S.ui.rest = { end: Date.now() + 60000 }; }
  saveDraft();
  render();
  showRest();
};
ACTIONS.warmup = () => { if (DRAFT) { DRAFT.warmup = !DRAFT.warmup; saveDraft(); render(); } };

function showRest() {
  const bar = document.getElementById('restbar');
  const r = S.ui.rest;
  if (!r || !DRAFT) { bar.hidden = true; bar.innerHTML = ''; return; }
  const left = r.end - Date.now();
  if (left <= 0) { S.ui.rest = null; bar.hidden = true; bar.innerHTML = ''; beep(880, 180, 2); return; }
  if (!bar.firstChild) {
    bar.innerHTML = '<div><span>Rest <b id="rest-clock"></b></span><span class="row" style="gap:8px">' +
      '<button type="button" data-act="rest-add">+30 s</button><button type="button" data-act="rest-skip">Skip</button></span></div>';
  }
  bar.hidden = false;
  document.getElementById('rest-clock').textContent = clock(left);
}
TICKS.push(showRest);
ACTIONS['rest-skip'] = () => { S.ui.rest = null; showRest(); };
ACTIONS['rest-add'] = () => { if (S.ui.rest) S.ui.rest.end += 30000; showRest(); };

// ---------- Rounds: 2:00 work, 1:00 rest ----------
const WORK_MS = 120000, REST_MS = 60000;
function finisherCard(d) {
  const f = BB.FINISHERS[d.finisher], r = d.round || { phase: 'idle' };
  const allDone = d.roundsDone >= d.roundsTarget;
  const label = r.phase === 'work' ? 'Round ' + (d.roundsDone + 1) + ': go' : r.phase === 'rest' ? 'Rest, then round ' + (d.roundsDone + 1) : allDone ? 'All rounds done' : 'Ready';
  const left = r.phase === 'idle' ? WORK_MS : r.paused ? r.left : r.end - Date.now();
  const controls = r.phase === 'idle'
    ? '<button class="btn grow" type="button" data-act="round-start"' + (allDone ? ' disabled' : '') + '>Start round</button>'
    : '<button class="btn ghost grow" type="button" data-act="round-pause">' + (r.paused ? 'Resume' : 'Pause') + '</button><button class="btn line grow" type="button" data-act="round-stop">Stop</button>';
  return '<div class="card"><div class="ex-head"><div><div class="ex-name">' + f.name + '</div><div class="ex-cue">' + f.cue + '</div></div>' +
    '<span class="lvl">' + d.roundsDone + '/' + d.roundsTarget + ' rounds</span></div>' +
    '<p class="eyebrow" style="text-align:center">' + label + '</p><div class="timer' + (r.phase === 'work' ? ' work' : '') + '" id="round-clock">' + clock(left) + '</div>' +
    '<div class="row">' + controls + '</div>' +
    '<button class="linkish" type="button" data-act="round-add" style="align-self:flex-start">Did a round without the timer? Add it</button></div>';
}
ACTIONS['round-start'] = () => { audioOn(); DRAFT.round = { phase: 'work', end: Date.now() + WORK_MS }; beep(660, 250, 1); saveDraft(); render(); };
ACTIONS['round-pause'] = () => {
  const r = DRAFT.round;
  if (r.paused) { r.end = Date.now() + r.left; r.paused = false; } else { r.left = Math.max(0, r.end - Date.now()); r.paused = true; }
  saveDraft(); render();
};
ACTIONS['round-stop'] = () => { DRAFT.round = { phase: 'idle' }; saveDraft(); render(); };
ACTIONS['round-add'] = () => { DRAFT.roundsDone = Math.min(12, DRAFT.roundsDone + 1); saveDraft(); render(); };
TICKS.push(() => {
  const d = DRAFT;
  if (!d) return;
  const el = document.getElementById('elapsed');
  if (el) el.textContent = Math.floor((Date.now() - d.started) / 60000) + ' min';
  const r = d.round;
  if (!r || r.phase === 'idle' || r.paused) return;
  const left = r.end - Date.now();
  if (left > 0) { const c = document.getElementById('round-clock'); if (c) c.textContent = clock(left); return; }
  if (r.phase === 'work') {
    d.roundsDone++;
    if (d.roundsDone >= d.roundsTarget) { d.round = { phase: 'idle' }; beep(880, 200, 3); toast('Rounds done. Finish your workout.'); }
    else { d.round = { phase: 'rest', end: Date.now() + REST_MS }; beep(440, 300, 2); }
  } else { d.round = { phase: 'work', end: Date.now() + WORK_MS }; beep(660, 250, 1); }
  saveDraft();
  if (S.ui.tab === 'train') scheduleRender();
});

// ---------- Finish ----------
ACTIONS.finish = () => {
  const d = DRAFT, p = S.data.profile;
  if (!d) return;
  const ex = {}, ups = [];
  Object.keys(d.ex).forEach((pat) => {
    const e = d.ex[pat];
    const reps = e.reps.filter((r, i) => e.done[i]);
    if (!reps.length) return;
    ex[pat] = { lvl: e.lvl, reps };
    if (BB.earnedLevelUp(pat, e.lvl, reps, d.nSets)) {
      p.levels = Object.assign({}, BB.DEFAULT_LEVELS, p.levels);
      p.levels[pat] = e.lvl + 1;
      ups.push(BB.LADDERS[pat].label + ': ' + BB.levelDef(pat, e.lvl + 1).name);
    }
  });
  const session = { date: d.date, kind: d.kind, finisher: d.finisher, rounds: d.roundsDone, mins: Math.max(1, Math.round((Date.now() - d.started) / 60000)), ex };
  S.data.sessions = S.data.sessions.concat(session);
  save('sessions');
  if (ups.length) save('profile');
  DRAFT = null; saveDraft();
  S.ui.rest = null; showRest();
  keepAwake(false);
  const week = BB.sessionsInWeek(S.data.sessions, BB.weekStart(today())).length;
  S.ui.tab = 'today';
  render();
  window.scrollTo(0, 0);
  openSheet('<div class="eyebrow">Workout logged</div><h2>' + (week >= 3 ? 'Week done' : week + ' of 3 this week') + '</h2>' +
    '<p>' + plural(Object.keys(ex).length, 'exercise') + ', ' + plural(session.rounds, 'round') + ', ' + session.mins + ' minutes.</p>' +
    (ups.length ? '<div class="card accent"><h2>Level up</h2><ul class="small" style="margin:0;padding-left:20px">' + ups.map((u) => '<li>' + u + '</li>').join('') + '</ul>' +
      '<p class="small">You hit the top of the range on every set, so next time you do the harder version.</p></div>' : '') +
    '<button class="btn block" data-act="close" type="button">Done</button>');
};
ACTIONS.discard = () => {
  if (!S.ui.confirmDiscard) {
    S.ui.confirmDiscard = true; render();
    setTimeout(() => { if (S.ui.confirmDiscard) { S.ui.confirmDiscard = false; if (S.ui.tab === 'train') render(); } }, 4000);
    return;
  }
  S.ui.confirmDiscard = false;
  DRAFT = null; saveDraft();
  S.ui.rest = null; showRest();
  keepAwake(false);
  render();
};
