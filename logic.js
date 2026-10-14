/* Black Belt Cut — pure logic. No DOM, no storage; app.js and views.js call these. */
(function (root) {
  'use strict';

  // ---------- Dates (local calendar days as "YYYY-MM-DD") ----------
  const pad = (n) => String(n).padStart(2, '0');
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseYmd(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); }
  function addDays(s, n) { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); }
  function daysBetween(a, b) { return Math.round((parseYmd(b) - parseYmd(a)) / 86400000); }
  function dow(s) { return (parseYmd(s).getDay() + 6) % 7; } // 0 = Monday
  function weekStart(s) { return addDays(s, -dow(s)); }
  const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  function niceDate(s) {
    return parseYmd(s).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  // ---------- Belts (by 7-day average weight, kg) ----------
  const BELTS = [
    { key: 'white', name: 'White', color: 'var(--belt-white)', under: Infinity },
    { key: 'yellow', name: 'Yellow', color: 'var(--belt-yellow)', under: 100 },
    { key: 'orange', name: 'Orange', color: 'var(--belt-orange)', under: 95 },
    { key: 'green', name: 'Green', color: 'var(--belt-green)', under: 90 },
    { key: 'blue', name: 'Blue', color: 'var(--belt-blue)', under: 85 },
    { key: 'red', name: 'Red', color: 'var(--belt-red)', under: 80 },
    { key: 'black', name: 'Black', color: 'var(--belt-black)', atOrUnder: 75 },
  ];
  function beltIndex(w) {
    if (w == null) return 0;
    if (w <= 75) return 6;
    for (let i = 5; i >= 1; i--) if (w < BELTS[i].under) return i;
    return 0;
  }
  // Stripes: one per full kg below the top of the current belt (white: below start weight). Black: one gold stripe per kg under 75.
  function beltState(w, startWeight) {
    const i = beltIndex(w);
    let top = i === 0 ? startWeight : i === 6 ? 75 : BELTS[i].under;
    const stripes = w == null || top == null ? 0 : Math.max(0, Math.min(i === 6 ? 5 : 4, Math.floor(top - w + 1e-9)));
    let next = null;
    if (i < 6) {
      const target = i === 5 ? 75 : BELTS[i + 1].under;
      next = { name: BELTS[i + 1].name, threshold: target, toGo: Math.max(0.1, +(w - target + (i === 5 ? 0 : 0.1)).toFixed(1)) };
    }
    return { index: i, belt: BELTS[i], stripes, next };
  }

  // ---------- Weight ----------
  // entries: { "YYYY-MM-DD": kg }. Trend = mean of weigh-ins in the 7 days ending that day.
  function trendSeries(entries) {
    const dates = Object.keys(entries || {}).filter((d) => entries[d] > 0).sort();
    return dates.map((d, idx) => {
      let sum = 0, n = 0;
      for (let j = idx; j >= 0 && daysBetween(dates[j], d) <= 6; j--) { sum += entries[dates[j]]; n++; }
      return { date: d, kg: entries[d], trend: +(sum / n).toFixed(2) };
    });
  }
  function latestTrend(series) { return series.length ? series[series.length - 1].trend : null; }
  // kg per week from a least-squares fit of the weigh-ins over the last `days` days. Null when there is too little data.
  function slopePerWeek(series, today, days) {
    days = days || 28;
    const pts = series.filter((p) => daysBetween(p.date, today) <= days && daysBetween(p.date, today) >= 0);
    if (pts.length < 3) return null;
    const xs = pts.map((p) => daysBetween(pts[0].date, p.date));
    if (xs[xs.length - 1] < 10) return null;
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const my = pts.reduce((a, p) => a + p.kg, 0) / pts.length;
    let num = 0, den = 0;
    xs.forEach((x, k) => { num += (x - mx) * (pts[k].kg - my); den += (x - mx) * (x - mx); });
    return den ? +(num / den * 7).toFixed(2) : null;
  }
  function projectGoalDate(trend, goal, slopeWk, today) {
    if (trend == null || slopeWk == null || slopeWk > -0.05) return null;
    if (trend <= goal) return today;
    const weeks = (trend - goal) / -slopeWk;
    return weeks > 260 ? null : addDays(today, Math.round(weeks * 7));
  }
  // Stalled = at least 14 days of data and the trend dropped less than 0.3 kg over the last 14 days.
  function isStalled(series, today) {
    if (!series.length) return false;
    const now = series[series.length - 1];
    if (daysBetween(now.date, today) > 7) return false;
    const past = series.filter((p) => daysBetween(p.date, now.date) >= 14);
    if (!past.length) return false;
    const ref = past[past.length - 1];
    return ref.trend - now.trend < 0.3;
  }

  // ---------- Habits ----------
  const BASE_HABITS = [
    { key: 'plate', title: 'One plate per meal', hint: 'No seconds. Still hungry after 20 minutes? Have a protein snack.' },
    { key: 'protein', title: 'Protein at every meal', hint: '1–2 palms of meat, fish, eggs, beans or dairy. Eat it first.' },
    { key: 'drinks', title: 'Zero sugary drinks', hint: 'Water, sparkling water, zero-sugar soda, or tea and coffee without sugar.' },
    { key: 'kitchen', title: 'Kitchen closed after dinner', hint: 'Nothing after dinner except water or tea.' },
  ];
  const LEVERS = [
    { key: 'carbs', title: 'One fist less rice or bread at dinner', hint: 'Keep the protein, trim the starch.' },
    { key: 'walk', title: '30-minute walk', hint: 'Any pace. Music or a call makes it easy.' },
    { key: 'slow', title: '20-minute meals', hint: 'Put the fork down between bites. Fullness takes time to arrive.' },
    { key: 'snack', title: 'Snacks are protein or fruit only', hint: 'Eggs, yogurt, milk, tuna, cheese, any fruit.' },
    { key: 'water', title: 'Big glass of water before each meal', hint: 'Takes the edge off before you fill the plate.' },
  ];
  function activeHabits(levers) {
    return BASE_HABITS.concat(LEVERS.filter((l) => (levers || []).includes(l.key)));
  }
  function goodDayNeed(n) { return Math.max(1, Math.ceil(n * 0.75)); }
  function dayDone(rec, active) { return active.filter((h) => rec && rec[h.key]).length; }
  function isGoodDay(rec, active) { return dayDone(rec, active) >= goodDayNeed(active.length); }
  // "Never miss twice": a single missed day doesn't break the run, two in a row do. Today only counts once it's good.
  function habitStreak(days, active, today, startDate) {
    let streak = 0, missRun = 0, d = today;
    if (!isGoodDay(days[today], active)) d = addDays(today, -1);
    while (startDate && d >= startDate) {
      if (isGoodDay(days[d], active)) { streak++; missRun = 0; }
      else if (++missRun >= 2) break;
      d = addDays(d, -1);
    }
    return streak;
  }
  function missedYesterday(days, active, today, startDate) {
    const y = addDays(today, -1);
    return !!startDate && y >= startDate && !isGoodDay(days[y], active);
  }

  // ---------- Sessions ----------
  function sessionsInWeek(sessions, ws) {
    const we = addDays(ws, 6);
    return (sessions || []).filter((s) => s.date >= ws && s.date <= we);
  }
  // Weeks with 3+ sessions in a row, same never-miss-twice rule. The current week counts once it hits the target.
  function weekStreak(sessions, today, startDate, target) {
    target = target || 3;
    let ws = weekStart(today), streak = 0, missRun = 0;
    if (sessionsInWeek(sessions, ws).length < target) ws = addDays(ws, -7);
    const firstWeek = startDate ? weekStart(startDate) : ws;
    while (ws >= firstWeek) {
      if (sessionsInWeek(sessions, ws).length >= target) { streak++; missRun = 0; }
      else if (ws !== firstWeek && ++missRun >= 2) break;
      ws = addDays(ws, -7);
    }
    return streak;
  }

  // ---------- Program ----------
  const ORDER = ['squat', 'push', 'pull', 'hinge', 'core'];
  const LADDERS = {
    squat: { label: 'Squat', levels: [
      { name: 'Chair sit-to-stand', guide: 'chair-squat', cue: 'Sit down slowly to a chair, stand up without using your hands.', min: 8, max: 15 },
      { name: 'Bodyweight squat', guide: 'squat', cue: 'Feet shoulder-width, hips back, go as low as you can control.', min: 10, max: 20 },
      { name: 'Pause squat', guide: 'pause-squat', cue: 'Hold 3 seconds at the bottom of every rep.', min: 8, max: 15 },
      { name: 'Reverse lunge', guide: 'reverse-lunge', cue: 'Step back, lower the back knee toward the floor, push through the front heel.', min: 8, max: 12, side: 'leg' },
      { name: 'Bulgarian split squat', guide: 'split-squat', cue: 'Rear foot on the couch, drop straight down.', min: 8, max: 12, side: 'leg' },
      { name: 'Backpack split squat', guide: 'split-squat-pack', cue: 'Bulgarian split squat wearing a backpack full of books.', min: 8, max: 12, side: 'leg' },
    ] },
    push: { label: 'Push', levels: [
      { name: 'Counter push-up', guide: 'counter-pushup', cue: 'Hands on the kitchen counter, body in one straight line.', min: 8, max: 15 },
      { name: 'Knee push-up', guide: 'knee-pushup', cue: 'Knees down, body straight from knees to head, elbows tucked about 45°.', min: 8, max: 20 },
      { name: 'Push-up', guide: 'pushup', cue: 'From the floor. Elbows about 45° from your body.', min: 5, max: 12 },
      { name: 'Slow push-up', guide: 'slow-pushup', cue: '3 seconds down, 1 second up.', min: 5, max: 12 },
      { name: 'Feet-up push-up', guide: 'decline-pushup', cue: 'Feet on a chair or the couch.', min: 5, max: 12 },
    ] },
    pull: { label: 'Pull', levels: [
      { name: 'Backpack row', guide: 'backpack-row', cue: 'Bent over with a flat back, pull a backpack full of books to your stomach.', min: 10, max: 20 },
      { name: 'Doorframe row', guide: 'door-row', cue: 'Grip both sides of a doorframe, feet close to it, lean back on straight arms, pull your chest to the frame.', min: 10, max: 15 },
      { name: 'Deep doorframe row', guide: 'deep-door-row', cue: 'Same row with your feet closer, so you lean back further.', min: 10, max: 15 },
      { name: 'One-arm doorframe row', guide: 'one-arm-row', cue: 'One hand on the frame, pull without twisting.', min: 8, max: 12, side: 'arm' },
      { name: 'Slow one-arm row', guide: 'slow-one-arm-row', cue: 'One-arm row, 3 seconds on the way back out.', min: 8, max: 12, side: 'arm' },
    ] },
    hinge: { label: 'Hips', levels: [
      { name: 'Glute bridge', guide: 'bridge', cue: 'On your back, feet flat, squeeze your glutes to lift your hips.', min: 12, max: 20 },
      { name: 'Glute bridge, 3 s squeeze', guide: 'bridge-hold', cue: 'Hold the top for 3 seconds every rep.', min: 10, max: 15 },
      { name: 'Hip thrust', guide: 'hip-thrust', cue: 'Shoulders on the couch edge, drive your hips up to a straight line.', min: 10, max: 20 },
      { name: 'Single-leg glute bridge', guide: 'sl-bridge', cue: 'One foot on the floor, the other leg up.', min: 8, max: 15, side: 'leg' },
      { name: 'Single-leg hip thrust', guide: 'sl-hip-thrust', cue: 'Shoulders on the couch, one leg.', min: 8, max: 15, side: 'leg' },
    ] },
    core: { label: 'Core', levels: [
      { name: 'Dead bug', guide: 'dead-bug', cue: 'Lower back pressed down, reach the opposite arm and leg out slowly.', min: 6, max: 12, side: 'side' },
      { name: 'Plank', guide: 'plank', cue: 'On your forearms, squeeze your glutes, keep your hips level.', min: 20, max: 45, unit: 's' },
      { name: 'Side plank', guide: 'side-plank', cue: 'Forearm under your shoulder, hips high.', min: 15, max: 30, unit: 's', side: 'side' },
      { name: 'Hollow hold', guide: 'hollow-hold', cue: 'Lower back pressed down, arms and legs reaching long.', min: 15, max: 30, unit: 's' },
    ] },
  };
  const DEFAULT_LEVELS = { squat: 2, push: 2, pull: 1, hinge: 1, core: 1 };
  const FINISHERS = {
    boxing: { name: 'Boxing rounds', guide: 'boxing', cue: 'Shadowbox: jab, cross, hook, uppercut. Stay light on your feet and breathe out on every punch.' },
    kicks: { name: 'Kick rounds', guide: 'kicks', cue: 'Front kicks, roundhouse kicks and knees at a controlled speed. Switch sides every 30 seconds.' },
  };
  // 3 minutes, played back to back before every workout and stretch. Front and side leg swings, rising in height,
  // are the kick-specific part: they don't build much lasting range, but they open up the range you have before kicking.
  const WARMUP = [
    { guide: 'jumping-jacks', secs: 30, cue: 'or march on the spot' },
    { guide: 'arm-circles', secs: 20 },
    { guide: 'leg-swings', secs: 40, cue: '10 swings per leg, a little higher each time' },
    { guide: 'side-leg-swings', secs: 40, cue: '10 swings per leg, a little higher each time' },
    { guide: 'boxing', secs: 50, cue: 'easy and loose' },
  ];
  // Daily kick-flexibility routine, about 16 minutes. Built from an Oct 2026 evidence review:
  // - Range gains level off at about 10 min of stretching per muscle per week per leg (Ingram 2025, 189 studies), so
  //   the muscles that limit kicks (hamstrings, inner thighs, hip flexors, hip rotators) each get 60-90 s a day.
  // - Contract-relax (pnf) builds range at least as well as plain holds (Konrad 2024), with a press at about half effort
  //   (Sheard & Paine 2010). It switches on after the first 10 stretch days, once the positions are familiar.
  // - Stretch at 5-6 out of 10: harder adds no range, and gentler stretching built more usable range in dancers (Wyon 2013).
  // - Stretching one leg barely helps the other over weeks (Nelson 2012), so the tighter leg gets its own extra half set.
  // - Kick height needs active range too: slow straight-leg raises held at the top turn passive range into usable height.
  // - Leg swings build only half the range of holds, so they live in the warm-up, before kicking.
  // pnf: ease in for 15 s, then rounds of a 5 s press and 20 s of relaxing deeper. even: no extra set for the tighter leg.
  const STRETCH = [
    { guide: 'hamstring-stretch', secs: 90, sides: true, pnf: 'heel down into the towel' },
    { guide: 'side-lunge-stretch', secs: 60, sides: true },
    { guide: 'butterfly', secs: 90, pnf: 'knees up into your hands' },
    { guide: 'straddle-stretch', secs: 60 },
    { guide: 'hip-flexor-stretch', secs: 60, sides: true },
    { guide: 'glute-stretch', secs: 60, sides: true, even: true },
    { guide: 'front-leg-raise', secs: 40, sides: true },
    { guide: 'side-leg-raise', secs: 40, sides: true },
  ];
  const PNF_EASE = 15, PNF_ROUND = 25, PNF_PRESS = 5, PNF_AFTER_DAYS = 10;
  // Where a contract-relax step is at `secs` seconds in: easing in, pressing, or relaxing deeper.
  function pnfPhase(secs) {
    if (secs < PNF_EASE) return 'ease';
    return (secs - PNF_EASE) % PNF_ROUND < PNF_PRESS ? 'press' : 'relax';
  }
  // The tighter leg gets an extra half set (a plain hold) of the one-sided steps, about 1.5x the time, and starts and
  // finishes each pair. Before contract-relax is switched on (pnfOn false), those steps are plain holds too.
  function stretchSteps(tight, pnfOn) {
    // held: a contract-relax step run as a plain hold, so the screen says "hold", not "press".
    const out = [], base = (s) => (pnfOn === false && s.pnf ? Object.assign({}, s, { pnf: null, held: true }) : s);
    STRETCH.forEach((s0) => {
      const s = base(s0);
      if (!s.sides) { out.push(s); return; }
      const first = tight === 'Left' ? 'Left' : 'Right', other = first === 'Left' ? 'Right' : 'Left';
      out.push(Object.assign({ side: first }, s), Object.assign({ side: other }, s));
      if (tight && !s.even) out.push(Object.assign({}, s, { side: tight, extra: true, pnf: null, held: !!(s.pnf || s.held), secs: Math.max(30, Math.round(s.secs / 2 / 5) * 5) }));
    });
    return out;
  }
  const pnfReady = (stretchLog) => Object.keys(stretchLog || {}).filter((d) => stretchLog[d] > 0).length >= PNF_AFTER_DAYS;
  const STRETCH_MINS = Math.round(stretchSteps('Right').reduce((a, s) => a + s.secs, 0) / 60);
  // Flexibility checks: heel height (cm) of a slow straight-leg raise held 2 s, front and side, left and right.
  // The leg that is 5 cm or more lower in total is the tighter one. Until the first check, trust what he told us: the right.
  const FLEX_GAP_CM = 5, FLEX_EVERY_DAYS = 28;
  function tightSide(checks) {
    const last = (checks || [])[(checks || []).length - 1];
    if (!last) return 'Right';
    const l = last.front[0] + last.side[0], r = last.front[1] + last.side[1];
    return Math.abs(l - r) < FLEX_GAP_CM ? null : l < r ? 'Left' : 'Right';
  }
  function flexDue(checks, today) {
    const last = (checks || [])[(checks || []).length - 1];
    return !last || daysBetween(last.date, today) >= FLEX_EVERY_DAYS;
  }
  function levelDef(pattern, level) {
    const lv = LADDERS[pattern].levels;
    return lv[Math.max(1, Math.min(lv.length, level)) - 1];
  }
  function lastAtLevel(sessions, pattern, level) {
    for (let i = (sessions || []).length - 1; i >= 0; i--) {
      const ex = sessions[i].ex && sessions[i].ex[pattern];
      if (ex && ex.lvl === level && ex.reps && ex.reps.length) return { date: sessions[i].date, reps: ex.reps };
    }
    return null;
  }
  // Aim for one more rep (or 5 more seconds) than last time on each set, capped at the top of the range.
  function targetsFor(sessions, pattern, level, nSets) {
    const def = levelDef(pattern, level);
    const last = lastAtLevel(sessions, pattern, level);
    const step = def.unit === 's' ? 5 : 1;
    const out = [];
    for (let k = 0; k < nSets; k++) {
      const prev = last ? last.reps[Math.min(k, last.reps.length - 1)] : null;
      out.push(prev == null ? def.min : Math.min(def.max, Math.max(def.min, prev + step)));
    }
    return { targets: out, last };
  }
  function earnedLevelUp(pattern, level, reps, nSets) {
    const def = levelDef(pattern, level);
    return reps.length >= nSets && reps.every((r) => r >= def.max) && level < LADDERS[pattern].levels.length;
  }
  function roundsTarget(sessions) {
    const full = (sessions || []).filter((s) => s.kind === 'full').length;
    return Math.min(6, 3 + Math.floor(full / 6));
  }
  function nextFinisher(sessions) {
    const full = (sessions || []).filter((s) => s.kind === 'full');
    return full.length && full[full.length - 1].finisher === 'boxing' ? 'kicks' : 'boxing';
  }

  // ---------- Activity ----------
  function lastActiveDate(data) {
    const dates = [];
    Object.keys(data.weights || {}).forEach((d) => dates.push(d));
    Object.keys(data.habits || {}).forEach((d) => { if (Object.values(data.habits[d] || {}).some(Boolean)) dates.push(d); });
    (data.sessions || []).forEach((s) => dates.push(s.date));
    Object.keys(data.urges || {}).forEach((d) => dates.push(d));
    return dates.length ? dates.sort()[dates.length - 1] : null;
  }

  // ---------- Calendar reminders: the phone's calendar does the nagging, so the app needs no server ----------
  const BYDAY = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
  // First date on or after `from` whose weekday is in `days` (0 = Monday).
  function nextWeekday(from, days) {
    for (let i = 0; i < 7; i++) { const d = addDays(from, i); if (days.includes(dow(d))) return d; }
    return from;
  }
  const stamp = (date, time) => date.replace(/-/g, '') + 'T' + time.replace(':', '') + '00';
  function endStamp(date, time, mins) {
    const [h, m] = time.split(':').map(Number), total = h * 60 + m + mins, r = total % 1440;
    return stamp(addDays(date, Math.floor(total / 1440)), pad(Math.floor(r / 60)) + ':' + pad(r % 60));
  }
  // ev: { id, title, details, from: 'YYYY-MM-DD', days: [weekday...] or null for every day, time: 'HH:MM', mins }
  const firstOf = (ev) => (ev.days ? nextWeekday(ev.from, ev.days) : ev.from);
  const ruleOf = (ev) => 'RRULE:FREQ=' + (ev.days ? 'WEEKLY;BYDAY=' + ev.days.slice().sort().map((d) => BYDAY[d]).join(',') : 'DAILY');
  // A Google Calendar "add event" link that repeats on the chosen days.
  function gcalLink(ev, tz) {
    const first = firstOf(ev);
    const q = ['action=TEMPLATE', 'text=' + encodeURIComponent(ev.title), 'dates=' + stamp(first, ev.time) + '/' + endStamp(first, ev.time, ev.mins),
      'recur=' + encodeURIComponent(ruleOf(ev)), 'details=' + encodeURIComponent(ev.details || '')];
    if (tz) q.push('ctz=' + encodeURIComponent(tz));
    return 'https://calendar.google.com/calendar/render?' + q.join('&');
  }
  // The same events as an .ics file with a 10-minute alarm, for Apple, Outlook and other calendar apps.
  function icsText(events, nowUtc) {
    const text = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
    const fold = (line) => { const out = []; while (line.length > 74) { out.push(line.slice(0, 74)); line = ' ' + line.slice(74); } out.push(line); return out.join('\r\n'); };
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Black Belt Cut//Reminders//EN', 'CALSCALE:GREGORIAN'];
    events.forEach((ev) => {
      const first = firstOf(ev);
      lines.push('BEGIN:VEVENT', 'UID:bbc-' + ev.id + '-' + nowUtc + '@black-belt-cut', 'DTSTAMP:' + nowUtc, 'DTSTART:' + stamp(first, ev.time), 'DTEND:' + endStamp(first, ev.time, ev.mins),
        ruleOf(ev), 'SUMMARY:' + text(ev.title), 'DESCRIPTION:' + text(ev.details), 'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + text(ev.title), 'TRIGGER:-PT10M', 'END:VALARM', 'END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    return lines.map(fold).join('\r\n') + '\r\n';
  }

  const BB = {
    ymd, parseYmd, addDays, daysBetween, dow, weekStart, DAY_NAMES, niceDate, nextWeekday, gcalLink, icsText,
    BELTS, beltIndex, beltState,
    trendSeries, latestTrend, slopePerWeek, projectGoalDate, isStalled,
    BASE_HABITS, LEVERS, activeHabits, goodDayNeed, dayDone, isGoodDay, habitStreak, missedYesterday,
    sessionsInWeek, weekStreak,
    ORDER, LADDERS, DEFAULT_LEVELS, FINISHERS, WARMUP, STRETCH, stretchSteps, STRETCH_MINS, pnfPhase, pnfReady, PNF_EASE, PNF_ROUND, PNF_PRESS, PNF_AFTER_DAYS, tightSide, flexDue, FLEX_GAP_CM, FLEX_EVERY_DAYS, levelDef, lastAtLevel, targetsFor, earnedLevelUp, roundsTarget, nextFinisher,
    lastActiveDate,
  };
  root.BB = BB;
  if (typeof module !== 'undefined' && module.exports) module.exports = BB;
})(typeof globalThis !== 'undefined' ? globalThis : this);
