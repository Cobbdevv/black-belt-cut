/* Black Belt Cut — Progress tab (weight chart, belts, levels), Guide tab (plan, food, settings), boot. */
'use strict';

// ---------- Progress ----------
function viewProgress() {
  const p = S.data.profile, t = today();
  const series = BB.trendSeries(S.data.weights);
  const tr = BB.latestTrend(series);
  const slope = BB.slopePerWeek(series, t);
  const proj = BB.projectGoalDate(tr, p.goal, slope, t);
  const change = tr != null ? tr - p.startWeight : 0;
  const act = BB.activeHabits(p.levers);
  const goodDays = Object.keys(S.data.habits).filter((d) => BB.isGoodDay(S.data.habits[d], act)).length;
  const urges = urgeCounts('0000');
  const stats = [
    ['Since day one', (change <= 0 ? '−' : '+') + fmtKg(Math.abs(change)) + ' kg', 'started ' + BB.niceDate(p.startDate)],
    ['Pace', slope == null ? '–' : (slope <= 0 ? '−' : '+') + Math.abs(slope).toFixed(1) + ' kg/wk', slope == null ? 'needs 10+ days of weigh-ins' : 'last 4 weeks · aim −0.5'],
    ['Goal date', proj ? BB.parseYmd(proj).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '–', proj ? 'for ' + p.goal + ' kg at this pace' : 'shows once you are losing steadily'],
    ['Workouts', String(S.data.sessions.length), plural(BB.weekStreak(S.data.sessions, t, p.startDate), 'week') + ' streak'],
    ['Good eating days', String(goodDays), plural(BB.habitStreak(S.data.habits, act, t, p.startDate), 'day') + ' streak'],
    ['Cravings beaten', String(urges.beaten), plural(urges.snack, 'planned snack')],
  ];
  const tiles = stats.map((s) => '<div class="stat"><span class="label">' + s[0] + '</span><span class="value">' + s[1] + '</span><span class="sub">' + s[2] + '</span></div>').join('');
  const levels = Object.assign({}, BB.DEFAULT_LEVELS, p.levels);
  const levelRows = BB.ORDER.map((pat) => '<div class="rung" style="grid-template-columns:54px 1fr auto"><span class="lvl">' + BB.LADDERS[pat].label + '</span><span>' +
    BB.levelDef(pat, levels[pat]).name + '</span><span class="small">' + levels[pat] + ' of ' + BB.LADDERS[pat].levels.length + '</span></div>').join('');
  const checkins = Object.keys(S.data.checkins).sort().reverse();
  const ciRows = checkins.map((k) => {
    const c = S.data.checkins[k];
    return '<tr><td>' + BB.niceDate(c.date || k) + '</td><td>' + (c.rating ? RATINGS[c.rating - 1] : '–') + '</td><td>' + (c.waist ? fmtKg(c.waist) + ' cm' : '–') + '</td></tr>';
  }).join('');
  return '<h1 class="section-title">Progress</h1><div class="stats">' + tiles + '</div>' + chartCard(series, p) +
    '<div class="card"><div class="card-head"><h2>Belts</h2><span class="small muted">by 7-day average</span></div><div class="ladder">' + beltLadder(tr) + '</div>' +
    '<p class="small muted">Each kilo below the top of your belt adds a stripe. Below 75 kg, each kilo adds a gold stripe.</p></div>' +
    '<div class="card"><div class="card-head"><h2>Strength levels</h2><button class="linkish" type="button" data-act="go" data-v="train">Change</button></div><div class="ladder">' + levelRows + '</div>' +
    '<p class="small muted">Losing weight while these go up means you are keeping your muscle.</p></div>' +
    '<div class="card"><div class="card-head"><h2>Check-ins</h2><button class="linkish" type="button" data-act="checkin">New check-in</button></div>' +
    (ciRows ? '<div class="table-wrap"><table><thead><tr><th>Week of</th><th>Felt</th><th>Waist</th></tr></thead><tbody>' + ciRows + '</tbody></table></div>'
      : '<p class="small">Your first weekly check-in shows up here, with your waist size if you log it.</p>') + '</div>';
}
function beltLadder(tr) {
  const idx = tr == null ? 0 : BB.beltIndex(tr);
  return BB.BELTS.map((b, i) => '<div class="rung' + (i === idx ? ' now' : i < idx ? ' past' : '') + '"><span class="sw" style="background:' + b.color + '"></span>' +
    '<span>' + b.name + ' belt' + (i === idx ? ' · you' : '') + '</span><span class="small">' + (i === 0 ? '100 kg and up' : i === 6 ? '75 kg or less' : 'under ' + b.under + ' kg') + '</span></div>').join('');
}

// ---------- Weight chart: weigh-ins as dots, 7-day average as the line, 1-year pace as a dashed guide ----------
let CHART = null;
function paceAt(p, d) {
  const f = Math.max(0, Math.min(1, BB.daysBetween(p.startDate, d) / 364));
  return p.startWeight + (p.goal - p.startWeight) * f;
}
function chartCard(series, p) {
  if (series.length < 2) {
    CHART = null;
    return '<div class="card"><h2>Weight</h2><p class="small">Your chart starts after your second weigh-in. Weigh in each morning: the dots are your weigh-ins and the line is your 7-day average.</p></div>';
  }
  const t = today(), range = S.ui.chartRange;
  let xMin = range === 'all' ? series[0].date : BB.addDays(t, -Number(range) + 1);
  if (xMin < series[0].date) xMin = series[0].date;
  let pts = series.filter((x) => x.date >= xMin);
  if (pts.length < 2) { pts = series.slice(-2); xMin = pts[0].date; }
  const span = Math.max(7, BB.daysBetween(xMin, t));
  const W = 340, H = 210, L = 34, R = 44, T = 12, B = 26;
  const paceFrom = xMin > p.startDate ? xMin : p.startDate;
  const vals = pts.map((x) => x.kg).concat(pts.map((x) => x.trend), [paceAt(p, paceFrom), paceAt(p, t)]);
  let yMin = Math.floor(Math.min.apply(null, vals) - 0.5), yMax = Math.ceil(Math.max.apply(null, vals) + 0.5);
  if (yMax - yMin < 4) { const mid = (yMax + yMin) / 2; yMin = Math.floor(mid - 2); yMax = Math.ceil(mid + 2); }
  const ySpan = yMax - yMin;
  const step = ySpan <= 6 ? 1 : ySpan <= 12 ? 2 : ySpan <= 30 ? 5 : 10;
  const sx = (d) => L + (BB.daysBetween(xMin, d) / span) * (W - L - R);
  const sy = (v) => T + ((yMax - v) / ySpan) * (H - T - B);
  let grid = '';
  for (let v = Math.ceil(yMin / step) * step; v <= yMax; v += step) {
    grid += '<line class="cg" x1="' + L + '" x2="' + (W - R) + '" y1="' + sy(v).toFixed(1) + '" y2="' + sy(v).toFixed(1) + '"/>' +
      '<text x="' + (L - 6) + '" y="' + (sy(v) + 4).toFixed(1) + '" text-anchor="end">' + v + '</text>';
  }
  const short = (d) => BB.parseYmd(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const xl = '<text x="' + L + '" y="' + (H - 6) + '">' + short(xMin) + '</text><text x="' + (W - R) + '" y="' + (H - 6) + '" text-anchor="end">' + short(t) + '</text>';
  const pace = p.startDate <= t ? '<line class="cp" x1="' + sx(paceFrom).toFixed(1) + '" y1="' + sy(paceAt(p, paceFrom)).toFixed(1) + '" x2="' + sx(t).toFixed(1) + '" y2="' + sy(paceAt(p, t)).toFixed(1) + '"/>' : '';
  const dots = pts.map((x) => '<circle class="cd" cx="' + sx(x.date).toFixed(1) + '" cy="' + sy(x.kg).toFixed(1) + '" r="4"/>').join('');
  const line = '<path class="ct" d="' + pts.map((x, i) => (i ? 'L' : 'M') + sx(x.date).toFixed(1) + ' ' + sy(x.trend).toFixed(1)).join(' ') + '"/>';
  const end = pts[pts.length - 1];
  const endMark = '<circle class="ce" cx="' + sx(end.date).toFixed(1) + '" cy="' + sy(end.trend).toFixed(1) + '" r="5"/>' +
    '<text class="cl" x="' + (sx(end.date) + 9).toFixed(1) + '" y="' + (sy(end.trend) + 4).toFixed(1) + '">' + fmtKg(end.trend) + '</text>';
  CHART = { W, H, pts: pts.map((x) => ({ date: x.date, kg: x.kg, trend: x.trend, x: sx(x.date), y: sy(x.trend) })) };
  const svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Weight chart: 7-day average ' + fmtKg(end.trend) + ' kg on ' + short(end.date) + '">' +
    grid + xl + pace + dots + line + '<line id="wcross" class="cx" x1="0" x2="0" y1="' + T + '" y2="' + (H - B) + '" style="display:none"/>' + endMark + '</svg>';
  const chips = [['30', '30 days'], ['90', '90 days'], ['all', 'All']].map((c) => '<button type="button" class="chip' + (range === c[0] ? ' on' : '') + '" data-act="range" data-v="' + c[0] + '">' + c[1] + '</button>').join('');
  const rows = S.ui.showTable ? series.slice().reverse().map((x) => '<tr><td>' + BB.niceDate(x.date) + '</td><td>' + fmtKg(x.kg) + '</td><td>' + fmtKg(x.trend) + '</td>' +
    '<td><button class="linkish" type="button" data-act="del-weight" data-v="' + x.date + '">' + (S.ui.confirmDel === x.date ? 'Confirm' : 'Delete') + '</button></td></tr>').join('') : '';
  return '<div class="card"><div class="card-head"><h2>Weight</h2><span class="small muted">kg</span></div><div class="chips">' + chips + '</div>' +
    '<div class="chart-wrap"><div class="chart" id="wchart">' + svg + '</div><div class="tip" id="wtip" hidden></div></div>' +
    '<div class="key"><span><i style="color:var(--accent)"></i>7-day average</span><span><i style="border-top:0;width:8px;height:8px;border-radius:50%;background:var(--muted)"></i>Weigh-ins</span>' +
    '<span><i style="color:var(--ink-2);border-top-style:dashed"></i>Pace for ' + p.goal + ' kg in a year</span></div>' +
    '<button class="linkish" type="button" data-act="toggle-table" style="align-self:flex-start">' + (S.ui.showTable ? 'Hide weigh-ins' : 'Show all weigh-ins') + '</button>' +
    (S.ui.showTable ? '<div class="table-wrap"><table><thead><tr><th>Date</th><th>Weigh-in</th><th>7-day avg</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '') + '</div>';
}
ACTIONS.range = (el) => { S.ui.chartRange = el.dataset.v; render(); };
ACTIONS['toggle-table'] = () => { S.ui.showTable = !S.ui.showTable; render(); };
ACTIONS['del-weight'] = (el) => {
  const d = el.dataset.v;
  if (S.ui.confirmDel !== d) { S.ui.confirmDel = d; render(); return; }
  delete S.data.weights[d];
  S.ui.confirmDel = null;
  save('weights');
  render();
};
function chartHover(ev) {
  const box = document.getElementById('wchart'), tip = document.getElementById('wtip'), cross = document.getElementById('wcross');
  if (!box || !tip || !cross || !CHART) return;
  const r = box.querySelector('svg').getBoundingClientRect();
  if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) { tip.hidden = true; cross.style.display = 'none'; return; }
  const vx = ((ev.clientX - r.left) / r.width) * CHART.W;
  let best = CHART.pts[0];
  CHART.pts.forEach((q) => { if (Math.abs(q.x - vx) < Math.abs(best.x - vx)) best = q; });
  cross.setAttribute('x1', best.x.toFixed(1));
  cross.setAttribute('x2', best.x.toFixed(1));
  cross.style.display = '';
  tip.innerHTML = '<b>' + fmtKg(best.trend) + ' kg</b> 7-day avg<br>' + fmtKg(best.kg) + ' kg weigh-in<br><span style="opacity:.75">' + BB.niceDate(best.date) + '</span>';
  tip.style.left = Math.max(64, Math.min(r.width - 64, (best.x / CHART.W) * r.width)) + 'px';
  tip.style.top = Math.max(56, (best.y / CHART.H) * r.height - 10) + 'px';
  tip.hidden = false;
}
document.addEventListener('pointermove', chartHover);
document.addEventListener('pointerdown', chartHover);

// ---------- Guide ----------
function viewGuide() {
  const p = S.data.profile;
  const days = p.trainDays || [0, 2, 4];
  return '<h1 class="section-title">Your plan</h1>' +
    '<div class="stats">' +
    '<div class="stat"><span class="label">Calories</span><span class="value">~2,500</span><span class="sub">a day. No counting: the plate rules land you here</span></div>' +
    '<div class="stat"><span class="label">Protein</span><span class="value">~150 g</span><span class="sub">a day, about 6 palm-sized portions</span></div>' +
    '<div class="stat"><span class="label">Pace</span><span class="value">0.5 kg</span><span class="sub">a week, about 25 kg in a year</span></div>' +
    '<div class="stat"><span class="label">Training</span><span class="value">3 × 40 min</span><span class="sub">a week, bodyweight, at home</span></div></div>' +
    '<div class="card guide"><h2>Build your plate with your hands</h2><p class="small">Your mom cooks, you portion. Your hand grows with you, so it is always the right size.</p>' +
    '<div class="hands"><div class="hand"><b>1–2 palms protein</b><span>Meat, chicken, fish, eggs, beans, lentils. Eat it first.</span></div>' +
    '<div class="hand"><b>1–2 cupped hands carbs</b><span>Rice, bread, pasta, potatoes. Take the smaller amount at dinner.</span></div>' +
    '<div class="hand"><b>1–2 fists veg or fruit</b><span>Anything cooked counts: soup, stew, stir-fry, veg in sauce.</span></div>' +
    '<div class="hand"><b>1 thumb fats</b><span>Oil, butter, cheese, nuts. Most of it is already in the cooking.</span></div></div>' +
    '<p class="small"><b>One plate, no seconds.</b> If you are still hungry 20 minutes after a meal, have a protein snack.</p></div>' +
    '<div class="card guide"><h2>No salad needed</h2><ul class="small"><li>Soups and stews with vegetables in them</li><li>Stir-fried or roasted vegetables</li>' +
    '<li>Frozen mixed veg in rice or pasta</li><li>Fruit: apples, bananas, oranges, berries, grapes</li><li>Vegetables blended into sauces</li></ul></div>' +
    '<div class="card guide"><h2>Easy protein</h2><ul class="small"><li>Eggs, any style</li><li>Greek yogurt, skyr or cottage cheese</li><li>Milk</li>' +
    '<li>Canned tuna or sardines</li><li>Chicken, beef, fish from dinner</li><li>Beans, lentils, chickpeas</li></ul></div>' +
    '<div class="card guide"><h2>Ask your mom for three things</h2><ul class="small"><li>A bit more meat, eggs or beans in the dishes</li>' +
    '<li>A bit less oil when it is easy</li><li>Leftovers put away after dinner, out of sight</li></ul>' +
    '<p class="small">Telling the people you live with about the goal is one of the strongest things you can do. It is easier to stick to a plan they know about.</p></div>' +
    '<div class="card guide"><h2>What to expect</h2><ul class="small"><li><b>Weeks 1–2:</b> 1–3 kg drops fast. That is mostly water, and the speed will not last.</li>' +
    '<li><b>After that:</b> about 0.5 kg a week. Some weeks show nothing. Watch the 7-day average, not the daily number.</li>' +
    '<li><b>Every few months:</b> a 2-week stall is common. Your weekly check-in spots it and gives you one thing to change.</li>' +
    '<li><b>Strength:</b> at 18 with a fighting background, your levels should keep climbing while the weight drops.</li></ul></div>' +
    '<form class="card" data-form="settings"><h2>Settings</h2>' +
    '<div class="field"><label for="st-why">Your why</label><textarea class="input" id="st-why">' + esc(p.why || '') + '</textarea></div>' +
    '<div class="field"><label>Goal weight</label><div class="chips" data-group="goal">' + [75, 72, 70].map((g) => '<button type="button" class="chip' + (p.goal === g ? ' on' : '') + '" data-act="pick" data-v="' + g + '">' + g + ' kg</button>').join('') + '</div></div>' +
    '<div class="field"><label>Training days</label><div class="chips" data-group="days" data-multi="1">' + BB.DAY_NAMES.map((d, i) => '<button type="button" class="chip' + (days.includes(i) ? ' on' : '') + '" data-act="pick" data-v="' + i + '">' + d + '</button>').join('') + '</div></div>' +
    '<div class="field"><label for="st-start">Starting weight (kg)</label><input class="input" id="st-start" inputmode="decimal" autocomplete="off" value="' + esc(p.startWeight) + '"></div>' +
    '<button class="btn" type="submit">Save settings</button></form>' +
    '<div class="card"><h2>Account and backup</h2>' +
    '<p class="small">' + (S.ui.auth === 'signed-in' ? 'Signed in as <b>' + esc(S.ui.email) + '</b>. Your log syncs to every device you sign in on, and keeps working offline.'
      : 'Sync is off, so your log is saved in this browser only.') + '</p>' +
    '<div class="row"><button class="btn line grow" type="button" data-act="export">Download backup</button>' +
    '<label class="btn line grow" for="imp">Restore a backup</label><input id="imp" type="file" accept="application/json,.json" hidden></div>' +
    (S.ui.importData ? '<p class="banner">Restore the backup from ' + esc(S.ui.importData.date) + '? It replaces everything in your log. ' +
      '<button class="linkish" type="button" data-act="import-yes">Restore</button> · <button class="linkish" type="button" data-act="import-no">Cancel</button></p>' : '') +
    (S.ui.auth === 'signed-in' ? '<button class="btn line" type="button" data-act="sign-out">' + (S.ui.confirmSignOut ? 'Tap again to sign out' : 'Sign out') + '</button>' : '') + '</div>' +
    '<div class="card quiet"><p class="small muted">Set three phone alarms for your training days so you never have to remember.</p>' +
    '<button class="btn line" type="button" data-act="reset">' + (S.ui.confirmReset ? 'Tap again to erase everything' : 'Start over') + '</button></div>';
}
FORMS.settings = (f) => {
  const p = S.data.profile;
  const goalBtn = f.querySelector('[data-group="goal"] .chip.on');
  const days = Array.from(f.querySelectorAll('[data-group="days"] .chip.on')).map((b) => Number(b.dataset.v));
  const start = parseKg(f.querySelector('#st-start').value);
  if (!start || start < 40 || start > 250) { toast('Enter your starting weight in kg, like 101.5'); return; }
  Object.assign(p, { why: f.querySelector('#st-why').value.trim(), goal: goalBtn ? Number(goalBtn.dataset.v) : p.goal, trainDays: days.length ? days : p.trainDays, startWeight: start });
  save('profile');
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  render();
  toast('Settings saved.');
};
ACTIONS.reset = () => {
  if (!S.ui.confirmReset) {
    S.ui.confirmReset = true; render();
    setTimeout(() => { if (S.ui.confirmReset) { S.ui.confirmReset = false; if (S.ui.tab === 'guide') render(); } }, 4000);
    return;
  }
  S.ui.confirmReset = false;
  S.data.profile = { onboarded: false, height: 175, age: 18, goal: 75, levels: Object.assign({}, BB.DEFAULT_LEVELS), levers: [] };
  S.data.weights = {}; S.data.habits = {}; S.data.sessions = []; S.data.urges = {}; S.data.checkins = {}; S.data.ranks = {}; S.data.quests = {};
  Object.keys(DOCS).forEach(save);
  DRAFT = null; saveDraft();
  S.ui.tab = 'today';
  render();
  window.scrollTo(0, 0);
};

// ---------- Backup ----------
ACTIONS.export = () => {
  const blob = new Blob([JSON.stringify({ app: 'black-belt-cut', version: 2, exportedAt: new Date().toISOString(), data: S.data }, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'black-belt-cut-' + today() + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  toast('Backup downloaded.');
};
document.addEventListener('change', (ev) => {
  const input = ev.target;
  if (input.id !== 'imp' || !input.files || !input.files[0]) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const obj = JSON.parse(reader.result);
      if (!obj || obj.app !== 'black-belt-cut' || !obj.data || !obj.data.profile) throw new Error('not a backup');
      S.ui.importData = { data: obj.data, date: String(obj.exportedAt || '').slice(0, 10) || 'an unknown date' };
      render();
    } catch (e) { toast('That file isn\'t a Black Belt Cut backup.'); }
  };
  reader.readAsText(input.files[0]);
  input.value = '';
});
ACTIONS['import-yes'] = () => {
  const d = S.ui.importData;
  if (!d) return;
  S.data = Object.assign(freshData(), d.data);
  S.ui.importData = null;
  Object.keys(DOCS).forEach(save);
  render();
  toast('Backup restored.');
};
ACTIONS['import-no'] = () => { S.ui.importData = null; render(); };

// ---------- Boot ----------
document.addEventListener('visibilitychange', () => { if (!document.hidden && S.ui.loaded && document.getElementById('sheet').hidden) scheduleRender(); });
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => { /* offline install not available here */ });
// A link like .../#status opens straight on that tab.
const startTab = String(location.hash || '').slice(1);
if (['today', 'train', 'status', 'progress', 'guide'].includes(startTab)) S.ui.tab = startTab;
initStore();
