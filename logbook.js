/* Black Belt Cut — the log as plain text to paste into Claude: who you are, where you stand, and everything logged in a date range. Pure, no DOM. */
(function (root) {
  'use strict';
  const BB = root.BB, RK = root.RK;
  const RATINGS = ['Rough', 'Meh', 'OK', 'Good', 'Strong'];
  const EFFORT = ['Easy', 'Solid', 'Hard', 'All-out'];
  const KINDS = { full: 'Full workout', short: 'Short workout', quest: 'Quest session', test: 'Benchmark tests' };
  const kg = (v) => (v == null ? '–' : (Math.round(v * 10) / 10).toFixed(1));
  const day = (d) => BB.parseYmd(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const shortDay = (d) => BB.parseYmd(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const test = (k, v) => (v == null ? '–' : k === 'dur' ? RK.fmtTime(v) : String(v));
  const quote = (s) => '"' + String(s).replace(/\s+/g, ' ').trim() + '"';

  function ranksLine(st) {
    return RK.STAT_KEYS.map((k) => {
      const s = st[k], code = RK.STAT_INFO[k].code;
      if (s.index == null) return code + ' unranked yet';
      const rank = RK.rankName(s.index);
      if (RK.TESTS[k]) return code + ' ' + rank + (s.source === 'test' ? ' (best ' + test(k, s.value) + (k === 'dur' ? '' : ' ' + RK.TESTS[k].unit) + ')' : ' (my estimate)');
      if (k === 'tec') return code + ' ' + rank + (s.source === 'checklist' ? ' (' + s.value + ' of 20 techniques)' : ' (my estimate)');
      return code + ' ' + rank;
    }).join(', ') + '. Overall ' + RK.rankName(st.overall) + '.';
  }
  function sessionLine(s) {
    const parts = [shortDay(s.date), KINDS[s.kind] || s.kind];
    if (s.mins) parts.push(s.mins + ' min');
    if (s.effort) parts.push('effort ' + EFFORT[s.effort - 1]);
    if (s.kind === 'quest' && s.focus) parts.push('focus ' + (RK.STAT_INFO[s.focus] ? RK.STAT_INFO[s.focus].code : s.focus));
    BB.ORDER.forEach((pat) => {
      const e = s.ex && s.ex[pat];
      if (!e) return;
      const def = BB.levelDef(pat, e.lvl);
      parts.push(BB.LADDERS[pat].label + ' L' + e.lvl + ' ' + def.name + ' ' + e.reps.join('/') + (def.unit === 's' ? ' s' : ''));
    });
    if (s.rounds) {
      const name = BB.FINISHERS[s.finisher] ? BB.FINISHERS[s.finisher].name.toLowerCase() : 'rounds';
      parts.push(s.rounds + ' ' + (s.rounds === 1 ? name.replace(/s$/, '') : name));
    }
    if ((s.kind === 'full' || (s.kind === 'short' && s.endedAt)) && s.warmup === false) parts.push('no warm-up');
    if (s.note) parts.push('note: ' + quote(s.note));
    return '- ' + parts.join(' · ');
  }

  // opts: { today: 'YYYY-MM-DD', days: 7 | 30 | null (everything) }
  function text(data, opts) {
    const t = opts.today, p = data.profile || {};
    const start = p.startDate || t;
    let from = opts.days ? BB.addDays(t, -(opts.days - 1)) : start;
    if (from < start) from = start;
    const inRange = (d) => d >= from && d <= t;
    const span = BB.daysBetween(from, t) + 1;
    const out = [];
    const line = (s) => out.push(s == null ? '' : s);

    line('# My Black Belt Cut log: ' + day(from) + ' to ' + day(t) + ' (' + span + (span === 1 ? ' day' : ' days') + ')');
    line();
    line('I use Black Belt Cut, a fat-loss and training app I built for myself. Below is my log for this period. Read it and give me your honest opinion: what is working, what is not, anything that worries you, and the one or two changes that would help me most. Be specific and practical.');
    line();
    line('## About me');
    line('- ' + (p.age || 18) + ', male, ' + (p.height || 175) + ' cm. Started at ' + kg(p.startWeight) + ' kg on ' + day(start) + '. Goal: ' + (p.goal || 75) + ' kg, keeping my muscle.');
    line('- Training: bodyweight only, at home, 3 sessions a week. About 6 months of kickboxing and 2 years of self-taught taekwondo.');
    line('- Food: I eat what my mom cooks. No salads, no calorie counting. I use plate and hand-portion rules plus daily habit checkboxes.');
    const act = BB.activeHabits(p.levers);
    line('- My daily eating rules: ' + act.map((h) => h.title).join('; ') + '. A good day is ' + BB.goodDayNeed(act.length) + ' of ' + act.length + '.');
    if (p.why) line('- Why I am doing this: ' + quote(p.why));
    line();

    const series = BB.trendSeries(data.weights || {});
    const tr = BB.latestTrend(series), slope = BB.slopePerWeek(series, t);
    line('## Where I am now (' + day(t) + ', day ' + (BB.daysBetween(start, t) + 1) + ')');
    if (tr != null) {
      const b = BB.beltState(tr, p.startWeight);
      line('- Weight: 7-day average ' + kg(tr) + ' kg, ' + kg(Math.abs(p.startWeight - tr)) + ' kg ' + (tr <= p.startWeight ? 'down' : 'up') + ' since day one. ' + b.belt.name + ' belt' + (b.stripes ? ', ' + b.stripes + (b.stripes === 1 ? ' stripe' : ' stripes') : '') + '.');
      line('- Pace over the last 4 weeks: ' + (slope == null ? 'not enough weigh-ins yet' : (slope > 0 ? '+' : '') + slope + ' kg a week') + (BB.isStalled(series, t) ? ' (stalled for 2 weeks)' : '') + '.');
    } else line('- Weight: no weigh-ins yet.');
    line('- Ranks: ' + ranksLine(RK.statState(data, t)));
    const levels = Object.assign({}, BB.DEFAULT_LEVELS, p.levels);
    line('- Workout levels: ' + BB.ORDER.map((pat) => BB.LADDERS[pat].label + ' ' + levels[pat] + '/' + BB.LADDERS[pat].levels.length + ' ' + BB.levelDef(pat, levels[pat]).name).join('; ') + '.');
    line();

    const H = RK.benchHistory(data);
    if (H.length) {
      line('## Benchmarks (all time)');
      line('| Test | ' + H.map((h) => h.label + (h.date ? ' (' + shortDay(h.date) + ')' : '')).join(' | ') + ' |');
      line('|' + ' --- |'.repeat(H.length + 1));
      RK.TEST_KEYS.forEach((k) => line('| ' + RK.TESTS[k].test + ' | ' + H.map((h) => test(k, h.values[k])).join(' | ') + ' |'));
      line();
    }

    const quests = Object.keys(data.quests || {}).filter((ws) => ws <= t && BB.addDays(ws, 6) >= from).sort();
    if (quests.length) {
      line('## Weekly quests');
      quests.forEach((ws) => {
        const q = data.quests[ws];
        const n = RK.weekNo(start, ws) + 1;
        const total = q.type === 'trial' ? 4 : q.objectives.length;
        const done = q.type === 'trial' ? RK.TEST_KEYS.filter((k) => typeof q.progress[k] === 'number').length : q.objectives.filter((o) => RK.objectiveDone(q, o)).length;
        line('- Week ' + n + ' (from ' + shortDay(ws) + '): ' + q.title + (q.focus ? ' (' + (RK.STAT_INFO[q.focus] ? RK.STAT_INFO[q.focus].code : 'all stats') + ')' : '') + '. ' +
          (q.cleared ? 'Cleared on ' + shortDay(q.clearedAt || ws) + '.' : done + ' of ' + total + ' objectives done.'));
      });
      line();
    }

    const sessions = (data.sessions || []).filter((s) => inRange(s.date));
    line('## Workouts (' + sessions.length + ' in ' + span + (span === 1 ? ' day' : ' days') + ', target 3 a week)');
    if (sessions.length) sessions.forEach((s) => line(sessionLine(s)));
    else line('- None logged.');
    line();

    const weighIns = series.filter((x) => inRange(x.date));
    line('## Weigh-ins (kg)');
    if (!weighIns.length) line('- None in this period.');
    else if (span <= 45) weighIns.forEach((x) => line('- ' + shortDay(x.date) + ': ' + kg(x.kg) + ' (7-day average ' + kg(x.trend) + ')'));
    else {
      const weeks = {};
      weighIns.forEach((x) => { const w = BB.weekStart(x.date); (weeks[w] = weeks[w] || []).push(x); });
      Object.keys(weeks).sort().forEach((w) => { const xs = weeks[w]; line('- Week of ' + shortDay(w) + ': ' + xs.length + ' weigh-ins, ending at a 7-day average of ' + kg(xs[xs.length - 1].trend)); });
    }
    line();

    line('## Eating rules');
    let good = 0, logged = 0;
    const rows = [];
    for (let d = from; d <= t; d = BB.addDays(d, 1)) {
      const rec = (data.habits || {})[d] || {};
      const n = BB.dayDone(rec, act);
      if (n) logged++;
      const ok = BB.isGoodDay(rec, act);
      if (ok) good++;
      const missed = act.filter((h) => !rec[h.key]).map((h) => h.title);
      rows.push({ d, text: '- ' + shortDay(d) + ': ' + n + ' of ' + act.length + (ok ? ', good day' : '') + (missed.length && n ? ' (missed: ' + missed.join('; ') + ')' : n ? '' : ' (nothing ticked)') });
    }
    line('- ' + good + ' good days out of ' + span + '. Days with anything ticked: ' + logged + '.');
    if (span <= 45) rows.forEach((r) => line(r.text));
    else act.forEach((h) => { let hit = 0; for (let d = from; d <= t; d = BB.addDays(d, 1)) if (((data.habits || {})[d] || {})[h.key]) hit++; line('- ' + h.title + ': ' + hit + ' of ' + span + ' days'); });
    line();

    const stretchDays = Object.keys(data.stretch || {}).filter(inRange).sort();
    line('## Stretching (' + BB.STRETCH_MINS + '-minute routine: hamstrings, hip flexors, glutes, inner thighs, leg raises)');
    if (!stretchDays.length) line('- None logged.');
    else {
      line('- Stretched on ' + stretchDays.length + ' of ' + span + (span === 1 ? ' day' : ' days') + ', ' + stretchDays.reduce((a, d) => a + (data.stretch[d] || 0), 0) + ' minutes in total.');
      if (span <= 45) line('- Days: ' + stretchDays.map((d) => shortDay(d) + ' (' + data.stretch[d] + ' min)').join(', ') + '.');
    }
    line();

    const urgeDays = Object.keys(data.urges || {}).filter(inRange).sort();
    line('## Cravings (I tap the craving button, then wait 10 minutes)');
    if (!urgeDays.length) line('- None logged.');
    else {
      const sum = { beaten: 0, snack: 0, ate: 0 };
      urgeDays.forEach((d) => { const u = data.urges[d]; Object.keys(sum).forEach((k) => { sum[k] += u[k] || 0; }); line('- ' + shortDay(d) + ': beaten ' + (u.beaten || 0) + ', planned snack ' + (u.snack || 0) + ', gave in ' + (u.ate || 0)); });
      line('- Total: beaten ' + sum.beaten + ', planned snack ' + sum.snack + ', gave in ' + sum.ate + '.');
    }
    line();

    const checkins = Object.keys(data.checkins || {}).map((k) => Object.assign({ key: k }, data.checkins[k])).filter((c) => inRange(c.date || c.key)).sort((a, b) => ((a.date || a.key) < (b.date || b.key) ? -1 : 1));
    if (checkins.length) {
      line('## Weekly check-ins');
      checkins.forEach((c) => line('- ' + shortDay(c.date || c.key) + ': felt ' + (c.rating ? RATINGS[c.rating - 1] : 'not given') + (c.waist ? ', waist ' + c.waist + ' cm' : '') + (c.note ? ', what got in the way: ' + quote(c.note) : '')));
      line();
    }

    const noteDays = Object.keys(data.notes || {}).filter(inRange).sort();
    line('## My notes');
    if (!noteDays.length) line('- None.');
    else noteDays.forEach((d) => (data.notes[d] || []).forEach((n) => line('- ' + shortDay(d) + ' ' + n.t + ': ' + quote(n.text))));
    line();
    line('End of log.');
    return out.join('\n');
  }

  const LOGBOOK = { text, fileName: (t) => 'black-belt-cut-log-' + t + '.md' };
  root.LOGBOOK = LOGBOOK;
  if (typeof module !== 'undefined' && module.exports) module.exports = LOGBOOK;
})(typeof globalThis !== 'undefined' ? globalThis : this);
