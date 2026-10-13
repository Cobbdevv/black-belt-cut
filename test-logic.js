const BB = require('./logic.js');
const assert = require('assert');
let n = 0;
function t(name, fn) { fn(); n++; console.log('ok -', name); }

t('dates', () => {
  assert.strictEqual(BB.addDays('2026-10-31', 1), '2026-11-01');
  assert.strictEqual(BB.addDays('2026-03-01', -1), '2026-02-28');
  assert.strictEqual(BB.dow('2026-10-12'), 0); // Monday
  assert.strictEqual(BB.weekStart('2026-10-18'), '2026-10-12'); // Sunday -> Monday
  assert.strictEqual(BB.daysBetween('2026-10-12', '2026-10-26'), 14);
});

t('trend is 7-day mean', () => {
  const s = BB.trendSeries({ '2026-10-01': 100, '2026-10-02': 102, '2026-10-09': 98 });
  assert.deepStrictEqual(s.map((p) => p.trend), [100, 101, 98]); // 10-09 window excludes 10-01/10-02
});

t('slope and projection', () => {
  const e = {};
  for (let i = 0; i <= 28; i++) e[BB.addDays('2026-09-14', i)] = 100 - i * (0.5 / 7);
  const s = BB.trendSeries(e);
  const slope = BB.slopePerWeek(s, '2026-10-12');
  assert.ok(Math.abs(slope + 0.5) < 0.02, 'slope ' + slope);
  const p = BB.projectGoalDate(97, 75, -0.5, '2026-10-12');
  assert.strictEqual(p, BB.addDays('2026-10-12', 308));
  assert.strictEqual(BB.projectGoalDate(97, 75, 0.1, '2026-10-12'), null);
});

t('stall detection', () => {
  const flat = {};
  for (let i = 0; i <= 20; i++) flat[BB.addDays('2026-09-22', i)] = 95;
  assert.strictEqual(BB.isStalled(BB.trendSeries(flat), '2026-10-12'), true);
  const down = {};
  for (let i = 0; i <= 20; i++) down[BB.addDays('2026-09-22', i)] = 95 - i * 0.1;
  assert.strictEqual(BB.isStalled(BB.trendSeries(down), '2026-10-12'), false);
});

t('belts', () => {
  assert.strictEqual(BB.beltState(102.4, 104).belt.key, 'white');
  assert.strictEqual(BB.beltState(102.4, 104).stripes, 1);
  assert.strictEqual(BB.beltState(99.9, 104).belt.key, 'yellow');
  assert.strictEqual(BB.beltState(100, 104).belt.key, 'white');
  assert.strictEqual(BB.beltState(97.5, 104).stripes, 2);
  assert.strictEqual(BB.beltState(75.4, 104).belt.key, 'red');
  assert.strictEqual(BB.beltState(75, 104).belt.key, 'black');
  assert.strictEqual(BB.beltState(72.2, 104).stripes, 2);
  assert.strictEqual(BB.beltState(101, 104).next.toGo, 1.1);
  assert.strictEqual(BB.beltState(76, 104).next.toGo, 1);
});

t('habit streak never-miss-twice', () => {
  const act = BB.activeHabits([]);
  const good = { plate: 1, protein: 1, drinks: 1 };
  const days = { '2026-10-05': good, '2026-10-06': good, '2026-10-08': good, '2026-10-09': good, '2026-10-11': good };
  // 10-07 single miss (kept), 10-10 single miss (kept), today 10-12 not yet good
  assert.strictEqual(BB.habitStreak(days, act, '2026-10-12', '2026-10-05'), 5);
  const broken = { '2026-10-05': good, '2026-10-08': good };
  assert.strictEqual(BB.habitStreak(broken, act, '2026-10-12', '2026-10-05'), 0);
  assert.strictEqual(BB.isGoodDay({ plate: 1, protein: 1 }, act), false);
});

t('week streak', () => {
  const ses = (dates) => dates.map((d) => ({ date: d, kind: 'full' }));
  const s = ses(['2026-09-28', '2026-09-30', '2026-10-02', '2026-10-05', '2026-10-07', '2026-10-09']);
  assert.strictEqual(BB.weekStreak(s, '2026-10-12', '2026-09-28'), 2);
  assert.strictEqual(BB.weekStreak(s.concat(ses(['2026-10-12', '2026-10-13', '2026-10-14'])), '2026-10-14', '2026-09-28'), 3);
});

t('progression targets', () => {
  const sessions = [{ date: '2026-10-05', kind: 'full', ex: { push: { lvl: 2, reps: [12, 11, 10] } } }];
  assert.deepStrictEqual(BB.targetsFor(sessions, 'push', 2, 3).targets, [13, 12, 11]);
  assert.deepStrictEqual(BB.targetsFor(sessions, 'push', 3, 3).targets, [5, 5, 5]);
  assert.deepStrictEqual(BB.targetsFor([{ date: 'x', ex: { core: { lvl: 2, reps: [40, 45, 30] } } }], 'core', 2, 3).targets, [45, 45, 35]);
  assert.strictEqual(BB.earnedLevelUp('push', 2, [20, 20, 20], 3), true); // knee push-ups top out at 20
  assert.strictEqual(BB.earnedLevelUp('push', 2, [15, 15, 15], 3), false);
  assert.strictEqual(BB.earnedLevelUp('push', 2, [20, 20], 3), false);
  assert.strictEqual(BB.earnedLevelUp('pull', 5, [12, 12, 12], 3), false); // top of ladder
  assert.strictEqual(BB.stretchSteps().length, 13); // both sides of every one-sided stretch
  assert.strictEqual(BB.STRETCH_MINS, 9);
  assert.strictEqual(BB.earnedLevelUp('pull', 1, [20, 20], 2), true); // backpack rows lead on to doorframe rows
  assert.strictEqual(BB.nextFinisher([{ kind: 'full', finisher: 'boxing' }]), 'kicks');
  assert.strictEqual(BB.roundsTarget(new Array(12).fill({ kind: 'full' })), 5);
});

t('calendar reminders', () => {
  assert.strictEqual(BB.nextWeekday('2026-10-13', [0, 2, 4]), '2026-10-14'); // Tuesday -> Wednesday
  assert.strictEqual(BB.nextWeekday('2026-10-12', [0, 2, 4]), '2026-10-12'); // Monday is a training day
  const ev = { id: 'train', title: 'Black Belt Cut: workout', details: 'Open the app', from: '2026-10-13', days: [4, 0, 2], time: '23:30', mins: 45 };
  const link = BB.gcalLink(ev, 'Europe/Istanbul');
  assert.ok(link.startsWith('https://calendar.google.com/calendar/render?action=TEMPLATE'));
  assert.ok(link.includes('dates=20261014T233000/20261015T001500'), 'end time rolls over midnight');
  assert.ok(link.includes('recur=' + encodeURIComponent('RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR')));
  assert.ok(link.includes('ctz=Europe%2FIstanbul'));
  const ics = BB.icsText([ev, { id: 'stretch', title: 'Stretch, 9 min', details: 'Hips; kicks', from: '2026-10-13', days: null, time: '21:00', mins: 10 }], '20261013T080000Z');
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n') && ics.endsWith('END:VCALENDAR\r\n'));
  assert.strictEqual((ics.match(/BEGIN:VEVENT/g) || []).length, 2);
  assert.ok(ics.includes('DTSTART:20261014T233000') && ics.includes('RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR'));
  assert.ok(ics.includes('DTSTART:20261013T210000') && ics.includes('RRULE:FREQ=DAILY'));
  assert.ok(ics.includes('TRIGGER:-PT10M') && ics.includes('SUMMARY:Stretch\\, 9 min') && ics.includes('Hips\\; kicks'));
  assert.ok(ics.split('\r\n').every((l) => l.length <= 75), 'lines folded');
});

console.log(n + ' groups passed');

