/* Black Belt Cut — Train tab: workout plan, a step-by-step session with a how-to before every move, rest, warm-up and round timers. */
'use strict';

const DRAFT_KEY = 'bbc-workout-v1';
let DRAFT = null;
try { DRAFT = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch (e) { DRAFT = null; }
function saveDraft() {
  try { if (DRAFT) localStorage.setItem(DRAFT_KEY, JSON.stringify(DRAFT)); else localStorage.removeItem(DRAFT_KEY); } catch (e) { /* draft lives in memory only */ }
}
function workoutDraft() {
  if (DRAFT && DRAFT.date !== today()) { DRAFT = null; saveDraft(); }
  // A short workout started before short workouts had a warm-up keeps its place and counts the warm-up as done.
  if (DRAFT && DRAFT.kind === 'short' && !DRAFT.v) { DRAFT.step = (DRAFT.step || 0) + 1; DRAFT.warmup = true; DRAFT.v = 2; saveDraft(); }
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

// ---------- How-to guides: the moving figure, its key positions, and the steps ----------
const guideMove = (id) => (typeof MOVES !== 'undefined' && id ? MOVES.get(id) : null);
const pct = (v) => (v * 100).toFixed(2) + '%';
function stillTime(m) { const k = m.keys.filter((x) => x.f); return (k[1] || k[0] || m.keys[0]).t; }
function tempoBar(m) {
  if (!m.tempo) return '';
  return '<div class="fg-tempo" aria-hidden="true">' + m.tempo.map((s) => '<span style="left:' + pct(s[0] / m.dur) + ';width:' + pct((s[1] - s[0]) / m.dur) + '">' + esc(s[2]) + '</span>').join('') + '<i class="fg-play"></i></div>';
}
// size: none = full stage with tempo bar, 'mini' = small and moving, 'thumb' = small and still.
function guideStage(id, size) {
  const m = guideMove(id);
  if (!m) return '';
  const still = size === 'thumb' || FG.reducedMotion();
  const ratio = Math.max(1.2, Math.min(2, (m.view[2] - m.view[0]) / (m.view[3] - m.view[1])));
  return '<div class="fg-stage' + (size ? ' fg-' + size : '') + '"' + (still ? '' : ' data-fg="' + id + '"') + (size ? '' : ' style="aspect-ratio:' + ratio.toFixed(2) + '"') + '>' +
    FG.svg(m, still ? stillTime(m) : 0, { cues: !still }) + (size ? '' : tempoBar(m)) + '</div>';
}
function guideFrames(m) {
  if (!m) return '';
  const keys = m.keys.filter((k) => k.f);
  const wrong = m.wrong ? '<figure class="fg-wrong">' + FG.svg({ name: m.wrong.text, view: m.view, props: m.props, keys: [{ t: 0, p: m.wrong.p }], dur: 1 }, 0, { cues: false, cross: true }) +
    '<figcaption><b>Not</b>' + esc(m.wrong.text) + '</figcaption></figure>' : '';
  return '<div class="fg-frames">' + keys.map((k, i) => '<figure>' + FG.svg(m, k.t, { cues: false, label: k.f }) + '<figcaption><b>' + (i + 1) + '</b>' + esc(k.f) + '</figcaption></figure>').join('') + wrong + '</div>';
}
function guideSteps(m) {
  if (!m) return '';
  return '<ol class="fg-steps">' + m.steps.map((s) => '<li>' + esc(s) + '</li>').join('') + '</ol>' + (m.avoid ? '<p class="small"><b>Avoid:</b> ' + esc(m.avoid) + '</p>' : '');
}
function guideBody(id) { const m = guideMove(id); return m ? guideStage(id) + guideFrames(m) + guideSteps(m) : ''; }
function howBtn(id, label) {
  return guideMove(id) ? '<button class="linkish how" type="button" data-act="guide" data-g="' + id + '">' + esc(label || 'How to do it') + '</button>' : '';
}
ACTIONS.guide = (el) => {
  const m = guideMove(el.dataset.g);
  if (!m) return;
  openSheet('<div class="eyebrow">How to</div><h2>' + esc(m.name) + '</h2>' + guideBody(m.id) + '<button class="btn block" data-act="close" type="button">Got it</button>');
};
TICKS.push(() => { if (typeof FG !== 'undefined') FG.play(); });

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
    return '<div class="card ex plan-ex"><button type="button" class="plan-thumb" data-act="guide" data-g="' + def.guide + '" aria-label="How to do ' + esc(def.name) + '">' + guideStage(def.guide, 'thumb') + '</button>' +
      '<div class="plan-body">' + exHead(pat, lvl) +
      '<p class="small">Next target: <b>' + t.targets.join(' · ') + '</b> ' + unit(def) + perSide(def) + '. Range ' + def.min + '–' + def.max + '.</p>' +
      howBtn(def.guide) + levelButtons(pat, lvl, 'Easier', 'Harder') + '</div></div>';
  }).join('');
  return '<div class="card-head"><h1 class="section-title">Next workout</h1><span class="small muted">about 40 min</span></div>' +
    '<p class="small">Full body: a 3-minute warm-up, 3 sets of each move with 60 seconds of rest, then ' + BB.roundsTarget(S.data.sessions) + ' ' + fin.name.toLowerCase() + '. ' +
    'It takes you through one move at a time and shows how to do each one before you start it. Beat last time by one rep. Hit the top of the range on every set and you move up a level automatically.</p>' +
    '<div class="row"><button class="btn grow" data-act="start" data-kind="full" type="button">Start workout</button>' +
    '<button class="btn ghost grow" data-act="start" data-kind="short" type="button">Short · 15 min</button></div>' + rows +
    '<div class="card ex plan-ex"><button type="button" class="plan-thumb" data-act="guide" data-g="' + fin.guide + '" aria-label="How to do ' + esc(fin.name) + '">' + guideStage(fin.guide, 'thumb') + '</button>' +
    '<div class="plan-body"><div class="ex-name">' + fin.name + '</div><p class="ex-cue">' + fin.cue + '</p>' +
    '<p class="small">2-minute rounds with 1 minute of rest. Boxing and kick rounds take turns, and you add a round every 6 workouts.</p>' + howBtn(fin.guide) + '</div></div>' +
    stretchCard() +
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
    step: 0, seen: {}, warm: null, v: 2,
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

// ---------- Live session: warm-up, then each move (how-to first, then sets), then rounds ----------
const STEP_NAMES = { warmup: 'Warm-up', finisher: 'Rounds' };
function sessionSteps(d) { return ['warmup'].concat(Object.keys(d.ex), ['finisher']); }
const stepName = (k) => STEP_NAMES[k] || BB.LADDERS[k].label;
function stepDone(d, k) {
  if (k === 'warmup') return !!d.warmup;
  if (k === 'finisher') return d.roundsDone >= d.roundsTarget;
  return d.ex[k].done.every(Boolean);
}
function curStep(d) { return Math.max(0, Math.min(sessionSteps(d).length - 1, d.step || 0)); }
function stepBar(d) {
  const cur = curStep(d);
  return '<nav class="stepbar" aria-label="Workout steps">' + sessionSteps(d).map((k, i) => '<button type="button" class="sb' + (i === cur ? ' on' : '') + (stepDone(d, k) ? ' done' : '') +
    '" data-act="step" data-i="' + i + '"' + (i === cur ? ' aria-current="step"' : '') + '><i>' + (stepDone(d, k) ? ICON_CHECK : i + 1) + '</i>' + stepName(k) + '</button>').join('') + '</nav>';
}
function viewSession(d) {
  const steps = sessionSteps(d), i = curStep(d), k = steps[i];
  const mins = Math.max(0, Math.floor((Date.now() - d.started) / 60000));
  const body = k === 'warmup' ? warmupStep(d, i) : k === 'finisher' ? finisherStep(d) : d.seen && d.seen[k] ? exWork(d, k, i) : exIntro(d, k, i);
  const doneSets = Object.values(d.ex).reduce((a, e) => a + e.done.filter(Boolean).length, 0);
  return '<div class="session"><div class="card-head"><h1 class="section-title">' + (d.kind === 'full' ? 'Workout' : 'Short workout') + '</h1><span class="small muted" id="elapsed">' + mins + ' min</span></div>' +
    stepBar(d) + body +
    '<div class="session-end"><button class="btn' + (k === 'finisher' ? '' : ' line') + ' block" data-act="finish" type="button"' + (doneSets ? '' : ' disabled') + '>Finish workout</button>' +
    '<button class="btn line block" data-act="discard" type="button">' + (S.ui.confirmDiscard ? 'Tap again to discard this workout' : 'Discard workout') + '</button></div></div>';
}
function lastLine(e, def) {
  return e.last ? 'Last time: ' + e.last.join(' · ') + ' ' + unit(def) + '. Beat it by one.' : 'First time at this level. Start at ' + def.min + ' ' + unit(def) + perSide(def) + '.';
}
function exIntro(d, pat, i) {
  const e = d.ex[pat], def = BB.levelDef(pat, e.lvl), m = guideMove(def.guide);
  const pats = Object.keys(d.ex), next = sessionSteps(d)[i + 1];
  return '<div class="card intro"><div class="eyebrow">Exercise ' + (pats.indexOf(pat) + 1) + ' of ' + pats.length + ' · ' + BB.LADDERS[pat].label + ' level ' + e.lvl + ' of ' + BB.LADDERS[pat].levels.length + '</div>' +
    '<h2 class="ex-title">' + esc(def.name) + '</h2>' +
    '<div class="intro-grid"><div class="intro-show">' + guideStage(def.guide) + guideFrames(m) + '</div><div class="intro-text">' + guideSteps(m) +
    '<div class="intro-plan"><span class="eyebrow">Today</span><b>' + plural(e.reps.length, 'set') + ' of ' + e.reps.join(' · ') + ' ' + unit(def) + perSide(def) + '</b>' +
    '<span class="small">60 seconds of rest between sets. ' + lastLine(e, def) + '</span></div>' +
    '<button class="btn block" type="button" data-act="ex-go" data-pat="' + pat + '">Start ' + plural(e.reps.length, 'set') + '</button>' +
    levelButtons(pat, e.lvl, 'Easier version', 'Harder version') +
    '<button class="linkish" type="button" data-act="step" data-i="' + (i + 1) + '">Skip to ' + stepName(next).toLowerCase() + '</button></div></div></div>';
}
function exWork(d, pat, i) {
  const e = d.ex[pat], def = BB.levelDef(pat, e.lvl), next = sessionSteps(d)[i + 1];
  const sets = e.reps.map((r, k) => '<div class="set' + (e.done[k] ? ' done' : '') + '"><span class="n">Set ' + (k + 1) + '</span>' +
    '<button class="step" type="button" data-act="rep" data-pat="' + pat + '" data-i="' + k + '" data-d="-1" aria-label="Fewer">&minus;</button>' +
    '<span class="val">' + r + ' <small>' + unit(def) + '</small></span>' +
    '<button class="step" type="button" data-act="rep" data-pat="' + pat + '" data-i="' + k + '" data-d="1" aria-label="More">+</button>' +
    '<button class="ok" type="button" data-act="set" data-pat="' + pat + '" data-i="' + k + '" aria-pressed="' + e.done[k] + '" aria-label="Set ' + (k + 1) + ' done">' + ICON_CHECK + '</button></div>').join('');
  return '<div class="card ex work"><div class="work-head"><button type="button" class="work-thumb" data-act="guide" data-g="' + def.guide + '" aria-label="How to do ' + esc(def.name) + '">' + guideStage(def.guide, 'mini') + '</button>' +
    '<div><div class="ex-name">' + def.name + '</div><div class="ex-cue">' + def.cue + '</div>' + howBtn(def.guide, 'Watch the how-to') + '</div></div>' +
    '<p class="last">' + lastLine(e, def) + ' Top of range: ' + def.max + perSide(def) + '.</p>' +
    '<div class="sets">' + sets + '</div>' + levelButtons(pat, e.lvl, 'Too hard', 'Too easy') +
    '<button class="btn line block" type="button" data-act="step" data-i="' + (i + 1) + '">Next: ' + stepName(next) + '</button></div>';
}
ACTIONS.step = (el) => {
  if (!DRAFT) return;
  DRAFT.step = Math.max(0, Math.min(sessionSteps(DRAFT).length - 1, Number(el.dataset.i)));
  saveDraft();
  render();
  window.scrollTo(0, 0);
};
ACTIONS['ex-go'] = (el) => {
  if (!DRAFT) return;
  DRAFT.seen = Object.assign({}, DRAFT.seen, { [el.dataset.pat]: true });
  audioOn();
  saveDraft();
  render();
  window.scrollTo(0, 0);
};
ACTIONS.rep = (el) => {
  if (!DRAFT) return;
  const pat = el.dataset.pat, e = DRAFT.ex[pat], i = Number(el.dataset.i), def = BB.levelDef(pat, e.lvl);
  const step = def.unit === 's' ? 5 : 1;
  e.reps[i] = Math.max(0, Math.min(def.unit === 's' ? 300 : 100, e.reps[i] + step * Number(el.dataset.d)));
  saveDraft();
  render();
};
// Ticking the last set moves straight on to the next move's how-to, while the rest timer runs.
ACTIONS.set = (el) => {
  if (!DRAFT) return;
  const pat = el.dataset.pat, e = DRAFT.ex[pat], i = Number(el.dataset.i);
  e.done[i] = !e.done[i];
  if (e.done[i]) { audioOn(); S.ui.rest = { end: Date.now() + 60000 }; }
  const steps = sessionSteps(DRAFT), at = steps.indexOf(pat);
  const moved = e.done[i] && e.done.every(Boolean) && at === curStep(DRAFT) && at + 1 < steps.length;
  if (moved) DRAFT.step = at + 1;
  saveDraft();
  render();
  showRest();
  if (moved) { window.scrollTo(0, 0); toast(BB.LADDERS[pat].label + ' done. Next: ' + stepName(steps[at + 1]) + '.'); }
};

// ---------- Warm-up: four moves, timed back to back ----------
function warmLeft(w) { return w.paused ? w.left : w.end - Date.now(); }
function warmupStep(d, i) {
  const next = sessionSteps(d)[i + 1];
  if (d.warmup && !d.warm) {
    return '<div class="card intro"><div class="eyebrow">Warm-up</div><h2 class="ex-title">Warm-up done</h2><p class="small">Next up: ' + stepName(next) + '.</p>' +
      '<button class="btn block" type="button" data-act="step" data-i="' + (i + 1) + '">Next: ' + stepName(next) + '</button></div>';
  }
  const w = d.warm;
  if (!w) {
    return '<div class="card intro"><div class="eyebrow">Step 1 · 3 minutes</div><h2 class="ex-title">Warm-up</h2>' +
      '<p class="small">Four moves back to back. The timer runs each one and moves you on, so you only have to follow the figure.</p>' +
      '<div class="warm-grid">' + BB.WARMUP.map((x, j) => {
        const m = guideMove(x.guide);
        return '<div class="warm-item">' + guideStage(x.guide, 'mini') + '<b>' + (j + 1) + '. ' + esc(m ? m.name : x.guide) + '</b><span class="small muted">' + x.secs + ' s' + (x.cue ? ' · ' + esc(x.cue) : '') + '</span></div>';
      }).join('') + '</div>' +
      '<div class="row"><button class="btn grow" type="button" data-act="warm-start">Start warm-up</button><button class="btn line grow" type="button" data-act="warm-skip">Skip</button></div></div>';
  }
  const x = BB.WARMUP[w.i], m = guideMove(x.guide);
  return '<div class="card intro"><div class="eyebrow">Warm-up · move ' + (w.i + 1) + ' of ' + BB.WARMUP.length + '</div><h2 class="ex-title">' + esc(m ? m.name : x.guide) + '</h2>' +
    guideStage(x.guide) + '<div class="timer" id="warm-clock">' + clock(warmLeft(w)) + '</div>' +
    (m ? '<p class="small" style="text-align:center">' + esc(m.steps[1]) + (x.cue ? ' (' + esc(x.cue) + ')' : '') + '</p>' : '') +
    '<div class="row"><button class="btn ghost grow" type="button" data-act="warm-pause">' + (w.paused ? 'Resume' : 'Pause') + '</button>' +
    '<button class="btn line grow" type="button" data-act="warm-next">' + (w.i + 1 < BB.WARMUP.length ? 'Next move' : 'Finish warm-up') + '</button></div></div>';
}
function warmGo(d, idx) {
  if (idx >= BB.WARMUP.length) {
    d.warm = null; d.warmup = true;
    const steps = sessionSteps(d), at = steps.indexOf('warmup');
    if (curStep(d) === at) d.step = at + 1;
    beep(880, 200, 3);
    toast('Warm-up done. Next: ' + stepName(steps[at + 1]) + '.');
  } else {
    d.warm = { i: idx, end: Date.now() + BB.WARMUP[idx].secs * 1000 };
    beep(660, 200, 1);
  }
  saveDraft();
}
ACTIONS['warm-start'] = () => { if (!DRAFT) return; audioOn(); keepAwake(true); warmGo(DRAFT, 0); render(); };
ACTIONS['warm-next'] = () => { if (!DRAFT || !DRAFT.warm) return; warmGo(DRAFT, DRAFT.warm.i + 1); render(); window.scrollTo(0, 0); };
ACTIONS['warm-skip'] = () => {
  if (!DRAFT) return;
  DRAFT.warm = null; DRAFT.warmup = true; DRAFT.step = curStep(DRAFT) + 1;
  saveDraft(); render(); window.scrollTo(0, 0);
};
ACTIONS['warm-pause'] = () => {
  const w = DRAFT && DRAFT.warm;
  if (!w) return;
  if (w.paused) { w.end = Date.now() + w.left; w.paused = false; } else { w.left = Math.max(0, w.end - Date.now()); w.paused = true; }
  saveDraft(); render();
};
TICKS.push(() => {
  const d = DRAFT, w = d && d.warm;
  if (!w || w.paused) return;
  const left = w.end - Date.now();
  if (left > 0) { const c = document.getElementById('warm-clock'); if (c) c.textContent = clock(left); return; }
  warmGo(d, w.i + 1);
  if (S.ui.tab === 'train') scheduleRender();
});

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
function finisherStep(d) {
  const f = BB.FINISHERS[d.finisher], m = guideMove(f.guide);
  return '<div class="card intro"><div class="eyebrow">Last step · ' + plural(d.roundsTarget, 'round') + '</div><h2 class="ex-title">' + f.name + '</h2>' +
    '<div class="intro-grid"><div class="intro-show">' + guideStage(f.guide) + '</div><div class="intro-text">' + guideSteps(m) + '</div></div></div>' + finisherCard(d);
}
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

// ---------- Stretching: a guided daily routine, logged by day ----------
const stretchMins = (d) => ((S.data.stretch || {})[d]) || 0;
function stretchCard() {
  const t = today(), ws = BB.weekStart(t);
  let n = 0, dots = '';
  for (let i = 0; i < 7; i++) {
    const d = BB.addDays(ws, i), on = stretchMins(d) > 0;
    if (on) n++;
    dots += '<div class="day' + (d === t ? ' today' : '') + '"><span class="dot' + (on ? ' full' : '') + '">' + (on ? ICON_CHECK.replace('stroke-width="3"', 'stroke-width="3" width="16" height="16"') : '') + '</span>' + BB.DAY_NAMES[i] + '</div>';
  }
  const done = stretchMins(t) > 0;
  return '<div class="card"><div class="card-head"><h2>Stretch</h2><span class="small muted">' + n + ' of 7 days this week</span></div>' +
    '<p class="small">' + (done ? 'Done today. Flexibility comes from stretching most days, not from one long session.' : BB.STRETCH_MINS + ' minutes for your hips and kicks, after a 3-minute warm-up that it skips if you just trained. Every day you can.') + '</p>' +
    '<div class="week">' + dots + '</div>' +
    '<div class="row"><button class="btn grow' + (done ? ' line' : '') + '" type="button" data-act="stretch-start">' + (done ? 'Stretch again' : 'Start stretching') + '</button>' +
    (done ? '' : '<button class="btn ghost grow" type="button" data-act="stretch-log">Did it without the timer</button>') + '</div></div>';
}
function stretchLeft(st) { return st.paused ? st.left : st.end - Date.now(); }
// Warm tissue stretches further and more safely, so the routine opens with the 3-minute warm-up,
// unless a workout ended in the last 45 minutes and you are already warm.
const WARM_FOR_MS = 45 * 60000;
function justTrained() { const now = Date.now(); return S.data.sessions.some((s) => s.endedAt && now - s.endedAt < WARM_FOR_MS); }
function stretchPlan(warm) { return (warm ? [] : BB.WARMUP.map((x) => Object.assign({ warm: true }, x))).concat(BB.stretchSteps()); }
function stretchSheet() {
  const st = S.ui.st, plan = st.plan;
  if (st.done) {
    return '<div class="eyebrow">Stretching</div><h2>' + (st.mins ? 'Done' : 'Stopped') + '</h2>' +
      '<p>' + (st.mins ? plural(st.mins, 'minute') + ' logged for today. Do it again tomorrow: stretching most days is what changes your range.' : 'Less than 30 seconds of stretching, so nothing was logged.') + '</p>' +
      '<button class="btn block" data-act="close" type="button">Done</button>';
  }
  const s = plan[st.i], m = guideMove(s.guide);
  const nWarm = plan.filter((x) => x.warm).length, nStretch = plan.length - nWarm;
  const head = s.warm ? 'Warm-up · ' + (st.i + 1) + ' of ' + nWarm : 'Stretch · ' + (st.i - nWarm + 1) + ' of ' + nStretch;
  const say = !m ? '' : s.warm ? m.steps[1] + (s.cue ? ' (' + s.cue + ')' : '') : m.steps[2];
  const warmNote = !s.warm && st.i === nWarm && st.warm ? '<p class="small muted" style="text-align:center">You just trained, so you are warm. Straight into the stretches.</p>' : '';
  return '<div class="eyebrow">' + head + '</div><h2>' + esc(m ? m.name : s.guide) + (s.side ? ' · ' + s.side : '') + '</h2>' + warmNote +
    guideStage(s.guide) + '<div class="timer" id="st-clock">' + clock(stretchLeft(st)) + '</div>' +
    (say ? '<p class="small" style="text-align:center">' + esc(say) + '</p>' : '') +
    '<div class="row"><button class="btn ghost grow" type="button" data-act="stretch-pause">' + (st.paused ? 'Resume' : 'Pause') + '</button>' +
    '<button class="btn line grow" type="button" data-act="stretch-next">' + (st.i + 1 < plan.length ? 'Next' : 'Finish') + '</button></div>' +
    (s.warm ? '<button class="linkish" type="button" data-act="stretch-skip-warm" style="align-self:center">Skip the warm-up, I am already warm</button>'
      : '<button class="linkish" type="button" data-act="stretch-end" style="align-self:center">Stop here and log it</button>');
}
// Time actually spent stretching so far: the warm-up, skipped seconds and pauses don't count.
function stretchSpent(st) {
  const s = st.plan[st.i];
  if (st.end == null || s.warm) return st.spent || 0;
  const ms = s.secs * 1000;
  return (st.spent || 0) + Math.max(0, Math.min(ms, ms - stretchLeft(st)));
}
function stretchGo(i) {
  const st = S.ui.st, plan = st.plan;
  st.spent = stretchSpent(st);
  if (i >= plan.length) { st.end = null; stretchFinish(); return; }
  const otherSide = i > 0 && plan[i - 1].guide === plan[i].guide;
  st.i = i; st.end = Date.now() + plan[i].secs * 1000; st.paused = false;
  beep(otherSide ? 520 : 660, 200, otherSide ? 2 : 1);
  openSheet(stretchSheet());
}
function stretchFinish() {
  const st = S.ui.st;
  if (!st || st.done) return;
  const ms = stretchSpent(st);
  const mins = ms < 30000 ? 0 : Math.max(1, Math.round(ms / 60000));
  if (mins) {
    S.data.stretch = Object.assign({}, S.data.stretch, { [today()]: stretchMins(today()) + mins });
    save('stretch');
  }
  st.done = true; st.mins = mins;
  if (mins) beep(880, 200, 3);
  keepAwake(false);
  openSheet(stretchSheet());
  render();
}
// Closing the routine early keeps the time already spent: a stray tap outside the sheet shouldn't throw away minutes of work.
function stretchKeep() {
  const st = S.ui.st;
  if (!st || st.done) return;
  const ms = stretchSpent(st);
  if (ms < 60000) return;
  const mins = Math.round(ms / 60000);
  S.data.stretch = Object.assign({}, S.data.stretch, { [today()]: stretchMins(today()) + mins });
  save('stretch');
  toast('Logged ' + plural(mins, 'minute') + ' of stretching.');
  scheduleRender();
}
ACTIONS['stretch-start'] = () => {
  audioOn(); keepAwake(true);
  const warm = justTrained();
  S.ui.st = { i: 0, plan: stretchPlan(warm), warm };
  stretchGo(0);
};
ACTIONS['stretch-skip-warm'] = () => {
  const st = S.ui.st;
  if (!st || st.done) return;
  stretchGo(st.plan.findIndex((x) => !x.warm));
};
// From the post-workout sheet: save the effort and note, then stretch while still warm.
ACTIONS['stretch-now'] = (el) => {
  const f = el.closest('form');
  if (f) FORMS['session-note'](f);
  ACTIONS['stretch-start']();
};
ACTIONS['stretch-next'] = () => { if (S.ui.st && !S.ui.st.done) stretchGo(S.ui.st.i + 1); };
ACTIONS['stretch-pause'] = () => {
  const st = S.ui.st;
  if (!st || st.done) return;
  if (st.paused) { st.end = Date.now() + st.left; st.paused = false; } else { st.left = Math.max(0, st.end - Date.now()); st.paused = true; }
  openSheet(stretchSheet());
};
ACTIONS['stretch-end'] = () => stretchFinish();
ACTIONS['stretch-log'] = () => {
  S.data.stretch = Object.assign({}, S.data.stretch, { [today()]: stretchMins(today()) + BB.STRETCH_MINS });
  save('stretch');
  render();
  toast('Stretching logged for today.');
};
TICKS.push(() => {
  const st = S.ui.st;
  if (!st || st.done || st.paused) return;
  const left = st.end - Date.now();
  if (left > 0) { const c = document.getElementById('st-clock'); if (c) c.textContent = clock(left); return; }
  stretchGo(st.i + 1);
});

// ---------- Finish ----------
const EFFORT = ['Easy', 'Solid', 'Hard', 'All-out'];
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
  const session = { date: d.date, kind: d.kind, finisher: d.finisher, rounds: d.roundsDone, mins: Math.max(1, Math.round((Date.now() - d.started) / 60000)), warmup: !!d.warmup, endedAt: Date.now(), ex };
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
    '<form data-form="session-note" style="display:flex;flex-direction:column;gap:14px"><div class="field"><label>How hard was it?</label><div class="chips" data-group="effort">' +
    EFFORT.map((x, i) => '<button type="button" class="chip" data-act="pick" data-v="' + (i + 1) + '">' + x + '</button>').join('') + '</div></div>' +
    '<div class="field"><label for="sn-note">Note for your log (optional)</label><textarea class="input" id="sn-note" placeholder="Felt strong, left knee a bit sore, slept badly…"></textarea></div>' +
    '<button class="btn block" type="submit">Done</button>' +
    '<button class="btn line block" type="button" data-act="stretch-now">Save and stretch now · ' + BB.STRETCH_MINS + ' min</button>' +
    '<p class="small muted">Right after training is the best time to stretch: you are already warm, so it skips the warm-up.</p></form>');
};
FORMS['session-note'] = (f) => {
  const s = S.data.sessions[S.data.sessions.length - 1];
  const eff = f.querySelector('[data-group="effort"] .chip.on');
  const note = f.querySelector('#sn-note').value.trim().slice(0, 500);
  if (s && (eff || note)) {
    if (eff) s.effort = Number(eff.dataset.v);
    if (note) s.note = note;
    save('sessions');
  }
  closeSheet();
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
