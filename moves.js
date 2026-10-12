/* Black Belt Cut — how-to moves. Each one is a short looping animation for figure.js plus the steps to read under it. */
(function (root) {
  'use strict';
  const FG = root.FG, B = FG.BODY;
  const LEG = B.thigh + B.shin, ARM = B.upper + B.fore;
  const STAND = B.ankle + LEG - 0.4;
  const FLAT = -18.6;
  const DEG = Math.PI / 180;
  const at = (p, deg, d) => [p[0] + Math.cos(deg * DEG) * d, p[1] + Math.sin(deg * DEG) * d];
  const two = (v) => [v, v];
  const P = (pts) => pts.map((q, i) => (i ? 'L' : 'M') + q[0] + ' ' + (-q[1])).join('');
  const copy = (o) => JSON.parse(JSON.stringify(o));
  const set = (base, over) => Object.assign(copy(base), over);
  function solveFor(fn, goal, lo, hi) {
    let a = lo, b = hi;
    const below = fn(a) < goal;
    for (let k = 0; k < 60; k++) {
      const m = (a + b) / 2;
      if ((fn(m) < goal) === below) a = m; else b = m;
    }
    return (a + b) / 2;
  }

  // ---------- Props (world units, y up) ----------
  const FLOOR = { floor: 1 };
  const chair = (front) => ({ path: P([[front - 22, 26], [front, 26]]) + P([[front - 1, 26], [front - 1, 0]]) + P([[front - 21, 54], [front - 21, 0]]) });
  const box = (x0, x1, h) => ({ path: P([[x0, 0], [x0, h], [x1, h], [x1, 0]]) });
  const couchBehind = (front) => ({ path: P([[front, 2], [front, 24], [front - 34, 24]]) + P([[front - 30, 24], [front - 30, 48], [front - 38, 48], [front - 38, 2]]) });
  const post = (x, top) => ({ path: P([[x, 0], [x, top]]) + P([[x + 5, 0], [x + 5, top]]) });

  // ---------- Body shapes ----------
  // Straight body balanced on the toes at T, rising toward the head at beta degrees.
  function onToes(T, beta) {
    const toe = beta - 78;
    const ankle = at(T, toe + 180, B.foot);
    const hip = at(ankle, beta, LEG - 0.3);
    return { hip, torso: beta, feet: two(ankle), toes: two(toe), neck: at(hip, beta, B.torso) };
  }
  function betaForHeight(T, y) { return solveFor((b) => onToes(T, b).neck[1], y, -45, 60); }
  function betaForReach(T, W, reach) {
    const dist = (b) => { const n = onToes(T, b).neck; return Math.hypot(n[0] - W[0], n[1] - W[1]); };
    let lo = -45, best = Infinity;
    for (let b = -45; b <= 80; b += 0.5) { const d = dist(b); if (d < best) { best = d; lo = b; } }
    return solveFor(dist, reach, lo, 80);
  }
  const plank = (T, beta, hands, palms) => { const s = onToes(T, beta); delete s.neck; return Object.assign(s, { hands, palms }); };
  // Straight body pivoting on flat feet at ankle A, leaning back theta degrees from upright.
  function leanBack(A, theta) {
    const hip = at(A, 90 + theta, LEG - 0.3);
    return { hip, torso: 90 + theta, feet: two(A), toes: two(FLAT), neck: at(hip, 90 + theta, B.torso) };
  }
  function thetaForReach(A, G, reach) {
    const dist = (th) => { const n = leanBack(A, th).neck; return Math.hypot(n[0] - G[0], n[1] - G[1]); };
    let lo = -20, best = Infinity;
    for (let th = -20; th <= 60; th += 0.5) { const d = dist(th); if (d < best) { best = d; lo = th; } }
    return solveFor(dist, reach, lo, 60);
  }
  const ARMS_DOWN = two({ w: [1, -30.5] });
  const HANDS_ON_HIPS = two({ w: [6, -25.5] });
  const ELBOWS_OUT = two([-0.5, 0, 1]);

  const M = {};
  function add(id, move) { move.id = id; M[id] = move; return move; }

  // ---------- Squat ladder ----------
  const sqTop = { hip: [-2, STAND], torso: 90, feet: two([3, B.ankle]), toes: two(FLAT), hands: two({ w: [29, -2] }) };
  const sqBottom = set(sqTop, { hip: [-14, 25.5], torso: 50, hands: two({ w: [29, 2] }) });
  const SQ_STEPS = [
    'Feet shoulder-width apart, toes turned out a little.',
    'Reach your arms forward and push your hips back.',
    'Bend your knees until your thighs are level with the floor. Chest stays up.',
    'Drive through your whole foot to stand tall.',
  ];
  const SQ_CUES = [
    { from: 0.05, to: 1.2, arrow: [-9, -12], at: 'hip', off: [-8, 4], text: 'HIPS BACK', lx: [-30, -6] },
    { from: 1.25, to: 2.2, text: 'THIGHS LEVEL', at: 'knN', off: [-8, 10], anchor: 'middle' },
  ];
  add('squat', {
    name: 'Bodyweight squat', view: [-48, -8, 58, 106], dur: 2.6, props: [FLOOR],
    keys: [{ t: 0, p: sqTop, f: 'Stand tall' }, { t: 1.2, p: sqBottom, f: 'Hips back and down' }, { t: 2.2, p: sqTop }],
    tempo: [[0, 1.2, 'Down'], [1.2, 2.2, 'Up']],
    cues: SQ_CUES, steps: SQ_STEPS, avoid: 'Heels lifting off the floor, or knees falling inward.',
  });
  add('pause-squat', {
    name: 'Pause squat', view: [-48, -8, 58, 106], dur: 5.6, props: [FLOOR],
    keys: [{ t: 0, p: sqTop, f: 'Stand tall' }, { t: 1.2, p: sqBottom, f: 'Hold 3 seconds' }, { t: 4.2, p: sqBottom }, { t: 5.2, p: sqTop }],
    tempo: [[0, 1.2, 'Down'], [1.2, 4.2, 'Hold 3 s'], [4.2, 5.2, 'Up']],
    cues: [SQ_CUES[0], { from: 1.25, to: 4.2, text: 'HOLD · 3 S', at: 'knN', off: [-8, 10], anchor: 'middle' }],
    steps: [SQ_STEPS[0], SQ_STEPS[1], 'Sink until your thighs are level, then hold the bottom for 3 full seconds.', 'Stay tight, then drive up to stand tall.'],
    avoid: 'Bouncing out of the bottom, or relaxing while you hold.',
  });
  const sitDown = { hip: [-15, 31.5], torso: 84, feet: two([7, B.ankle]), toes: two(FLAT), hands: two({ w: [26, -8] }) };
  const sitLean = set(sitDown, { hip: [-13, 32], torso: 50, hands: two({ w: [29, 0] }) });
  const sitUp = set(sitDown, { hip: [4, STAND], torso: 90, hands: two({ w: [28, -4] }) });
  add('chair-squat', {
    name: 'Chair sit-to-stand', view: [-48, -8, 58, 106], dur: 5, props: [FLOOR, chair(-6)],
    keys: [{ t: 0, p: sitDown, f: 'Sit tall' }, { t: 0.8, p: sitLean, f: 'Nose over toes' }, { t: 1.8, p: sitUp, f: 'Stand, no hands' }, { t: 2.4, p: sitUp }, { t: 3.7, p: sitLean }, { t: 4.4, p: sitDown }],
    tempo: [[0, 0.8, 'Lean'], [0.8, 1.8, 'Stand'], [2.4, 4.4, 'Sit slowly']],
    cues: [{ from: 0.85, to: 1.8, arrow: [0, 12], at: 'hip', off: [-12, 0], text: 'PUSH THROUGH HEELS', lx: [-6, 4] }],
    steps: ['Sit tall on the front half of a chair, feet flat.', 'Lean forward until your nose is over your toes.', 'Push through your heels and stand all the way up. No hands.', 'Sit back down slowly, taking about 2 seconds.'],
    avoid: 'Dropping onto the chair or pushing off your knees.',
  });
  const lgStand = { hip: [0, STAND], torso: 90, feet: two([3, B.ankle]), toes: two(FLAT), hands: HANDS_ON_HIPS, elbows: ELBOWS_OUT };
  const lgStep = set(lgStand, { hip: [-4, 47], feet: [[7, B.ankle], [-24, 13]], toes: [FLAT, -10] });
  const lgBottom = set(lgStand, { hip: [-15, 27.5], torso: 88, feet: [[8, B.ankle], [-44, 8]], toes: [FLAT, -46.7] });
  const lgRise = set(lgStand, { hip: [-6, 46], feet: [[8, B.ankle], [-22, 14]], toes: [FLAT, -15] });
  add('reverse-lunge', {
    name: 'Reverse lunge', view: [-62, -8, 40, 106], dur: 3.2, props: [FLOOR],
    keys: [{ t: 0, p: lgStand, f: 'Stand tall' }, { t: 0.5, p: lgStep }, { t: 1.1, p: lgBottom, f: 'Back knee down' }, { t: 1.5, p: lgBottom }, { t: 2.3, p: lgRise }, { t: 2.7, p: lgStand }],
    tempo: [[0, 1.1, 'Step back'], [1.5, 2.7, 'Drive up']],
    cues: [{ from: 1.0, to: 1.6, text: 'FRONT SHIN UPRIGHT', at: 'knN', off: [-2, 12], anchor: 'middle' }],
    steps: ['Stand tall, hands on your hips.', 'Take a long step back and land on the ball of your foot.', 'Lower your back knee until it nearly touches the floor. Your front shin stays upright.', 'Push through your front heel to step back up. Finish your reps, then switch legs.'],
    avoid: 'Leaning far forward, or your front heel lifting.',
  });
  const ssTop = { hip: [-6, 44.5], torso: 82, feet: [[16, B.ankle], [-39, 29]], toes: [FLAT, 196], knees: [null, [0, -1, 0]], hands: HANDS_ON_HIPS, elbows: ELBOWS_OUT };
  const ssBottom = set(ssTop, { hip: [-9, 26.5], torso: 80 });
  const SS = {
    view: [-80, -8, 40, 106], dur: 3, props: [FLOOR, couchBehind(-30)],
    keys: [{ t: 0, p: ssTop, f: 'Back foot on the couch' }, { t: 1.2, p: ssBottom, f: 'Drop straight down' }, { t: 2.4, p: ssTop }],
    tempo: [[0, 1.2, 'Down'], [1.2, 2.4, 'Up']],
    cues: [{ from: 0.1, to: 1.2, arrow: [0, -12], at: 'hip', off: [9, 6], text: 'STRAIGHT DOWN', lx: [3, -4] }],
    avoid: 'Front foot too close to the couch, so your heel lifts.',
  };
  add('split-squat', Object.assign({ name: 'Bulgarian split squat',
    steps: ['Stand a big step in front of the couch.', 'Rest the top of your back foot on the couch.', 'Drop straight down until your front thigh is level with the floor.', 'Push through your front heel to rise. Finish your reps, then switch legs.'] }, copy(SS)));
  add('split-squat-pack', Object.assign({ name: 'Backpack split squat', pack: true,
    steps: ['Put on a backpack full of books and pull the straps tight.', 'Back foot on the couch, front foot a big step forward.', 'Drop straight down until your front thigh is level with the floor.', 'Push through your front heel to rise. Finish your reps, then switch legs.'] }, copy(SS)));

  // ---------- Push ladder ----------
  const PALMS = two(0);
  const PUSH_ELBOWS = two([-0.8, -0.35, 0.9]);
  function pushSet(T, W, topBeta, botBeta) {
    const hands = two([W[0], W[1]]);
    return { top: Object.assign(plank(T, topBeta, hands, PALMS), { elbows: PUSH_ELBOWS }), bottom: Object.assign(plank(T, botBeta, hands, PALMS), { elbows: PUSH_ELBOWS }) };
  }
  const floorT = [-71, 0];
  const floorTopBeta = betaForHeight(floorT, 33.2);
  const floorW = [onToes(floorT, floorTopBeta).neck[0] - 3, 2];
  const PU = pushSet(floorT, floorW, floorTopBeta, betaForHeight(floorT, 12.8));
  const PU_STEPS = [
    'Hands under your shoulders, body straight from head to heels.',
    'Lower until your chest is a fist\'s height from the floor.',
    'Keep your elbows about 45° from your body.',
    'Push the floor away until your arms are straight.',
  ];
  const lineCue = { always: true, line: ['anN', 'neck'], text: 'ONE STRAIGHT LINE', ext: 6 };
  add('pushup', {
    name: 'Push-up', view: [-82, -8, 32, 60], dur: 2.4, props: [FLOOR],
    keys: [{ t: 0, p: PU.top, f: 'Arms straight' }, { t: 1.1, p: PU.bottom, f: 'Chest a fist off the floor' }, { t: 1.9, p: PU.top }],
    tempo: [[0, 1.1, 'Down'], [1.1, 1.9, 'Up']],
    cues: [lineCue, { from: 1.0, to: 1.5, text: 'FIST HEIGHT', at: [30, 24], anchor: 'end' }],
    wrong: { p: set(PU.top, { hip: [onToes(floorT, floorTopBeta).hip[0], onToes(floorT, floorTopBeta).hip[1] - 10], torso: floorTopBeta + 16 }), text: 'Hips sagging' },
    steps: PU_STEPS, avoid: 'Hips sagging, or your head dropping first.',
  });
  add('slow-pushup', {
    name: 'Slow push-up', view: [-82, -8, 32, 60], dur: 4.5, props: [FLOOR],
    keys: [{ t: 0, p: PU.top, f: 'Arms straight' }, { t: 3, p: PU.bottom, f: '3 seconds down' }, { t: 4, p: PU.top }],
    tempo: [[0, 3, 'Down · 3 s'], [3, 4, 'Up · 1 s']],
    cues: [lineCue],
    steps: [PU_STEPS[0], 'Count three slow seconds on the way down.', 'Touch a fist\'s height from the floor, elbows about 45°.', 'Push back up in one second.'],
    avoid: 'Speeding up on the way down.',
  });
  const counterW = [-1, 53.5], counterT = [-60, 0];
  const CU = pushSet(counterT, counterW, betaForReach(counterT, counterW, ARM - 0.8), betaForReach(counterT, counterW, 13));
  add('counter-pushup', {
    name: 'Counter push-up', view: [-72, -8, 46, 92], dur: 2.4, props: [FLOOR, box(0, 60, 51)],
    keys: [{ t: 0, p: CU.top, f: 'Arms straight' }, { t: 1.1, p: CU.bottom, f: 'Chest to the edge' }, { t: 1.9, p: CU.top }],
    tempo: [[0, 1.1, 'Down'], [1.1, 1.9, 'Up']],
    cues: [lineCue],
    steps: ['Hands on the counter edge, a little wider than your shoulders.', 'Walk your feet back until your body is one straight line.', 'Lower your chest to the edge, elbows about 45° from your body.', 'Push the counter away until your arms are straight.'],
    avoid: 'Hips sagging or sticking up.',
  });
  // Straight body from the knees, which rest on the floor at K, shins flat behind.
  function onKnees(K, beta) {
    const hip = at(K, beta, B.thigh - 0.2);
    return { hip, torso: beta, feet: two(at(K, 178, B.shin - 0.2)), toes: two(182), neck: at(hip, beta, B.torso) };
  }
  const KN = [-40, 4.6];
  const knBeta = (y) => solveFor((b) => onKnees(KN, b).neck[1], y, 0, 70);
  const knTopB = knBeta(33.2), knTopNeck = onKnees(KN, knTopB).neck;
  const knHands = two([knTopNeck[0] - 3, 2]);
  const knPose = (b) => { const p = onKnees(KN, b); delete p.neck; return Object.assign(p, { hands: knHands, palms: PALMS, elbows: PUSH_ELBOWS }); };
  const knTop = knPose(knTopB), knBottom = knPose(knBeta(12.8));
  const knPikeHip = at(KN, knTopB + 24, B.thigh - 0.2);
  add('knee-pushup', {
    name: 'Knee push-up', view: [-80, -8, 32, 60], dur: 2.8, props: [FLOOR],
    keys: [{ t: 0, p: knTop, f: 'Knees down, arms straight' }, { t: 1.5, p: knBottom, f: 'Chest a fist off the floor' }, { t: 2.4, p: knTop }],
    tempo: [[0, 1.5, 'Down · 1.5 s'], [1.5, 2.4, 'Up']],
    cues: [
      { always: true, line: ['knN', 'neck'], text: 'STRAIGHT FROM KNEES TO HEAD', ext: 5 },
      { from: 0.3, to: 1.5, text: 'ELBOWS TUCKED ABOUT 45°', at: [-8, 50], anchor: 'middle' },
    ],
    wrong: { p: set(knTop, { hip: knPikeHip, torso: Math.atan2(knTopNeck[1] - knPikeHip[1], knTopNeck[0] - knPikeHip[0]) / DEG }), text: 'Hips piking up' },
    steps: ['Knees on the floor behind you, hands flat under your shoulders, fingers spread.', 'Lean forward until you are one straight line from knees to head.', 'Take 1.5 seconds to lower your chest to a fist\'s height, elbows tucked about 45° from your body.', 'Push back up, stopping just short of snapping your elbows straight.'],
    avoid: 'Elbows flaring out to the sides, or your hips bending so your bum sticks up.',
  });
  const declT = [-66, 26];
  const declTop = betaForHeight(declT, 33.2);
  const declW = [onToes(declT, declTop).neck[0] - 3, 2];
  const DU = pushSet(declT, declW, declTop, betaForHeight(declT, 12.8));
  add('decline-pushup', {
    name: 'Feet-up push-up', view: [-92, -8, 30, 66], dur: 2.4, props: [FLOOR, chair(-56)],
    keys: [{ t: 0, p: DU.top, f: 'Feet on the chair' }, { t: 1.1, p: DU.bottom, f: 'Chest a fist off the floor' }, { t: 1.9, p: DU.top }],
    tempo: [[0, 1.1, 'Down'], [1.1, 1.9, 'Up']],
    cues: [lineCue],
    steps: ['Feet on a chair or the couch, hands on the floor under your shoulders.', 'Body in one straight line from heels to head.', 'Lower until your chest is a fist off the floor.', 'Push back up until your arms are straight.'],
    avoid: 'Hips piking up to make it easier.',
  });

  // ---------- Pull ladder ----------
  const BRW_HIP = [-6, 44], BRW_T = 35, brwNeck = at(BRW_HIP, BRW_T, B.torso);
  const brwBase = { hip: BRW_HIP, torso: BRW_T, head: 8, feet: two([4, B.ankle]), toes: two(FLAT) };
  const brwDown = set(brwBase, { hands: two([brwNeck[0] + 1.5, brwNeck[1] - 30.5]) });
  const brwUp = set(brwBase, { hands: two(at(at(BRW_HIP, BRW_T, 11), BRW_T - 90, 7)) });
  add('backpack-row', {
    name: 'Backpack row', view: [-46, -8, 58, 96], dur: 3.9, props: [FLOOR], held: true,
    keys: [{ t: 0, p: brwDown, f: 'Hinge forward, arms long' }, { t: 1.0, p: brwUp, f: 'Pull to your stomach' }, { t: 1.5, p: brwUp }, { t: 3.5, p: brwDown }],
    tempo: [[0, 1, 'Pull'], [1, 1.5, 'Squeeze'], [1.5, 3.5, 'Lower · 2 s']],
    cues: [{ always: true, line: ['hip', 'neck'], text: 'FLAT BACK', ext: 4 }, { from: 0.15, to: 1.5, text: 'ELBOWS BACK', at: [30, 84], anchor: 'middle' }],
    steps: ['Fill a backpack with books and hold it by the top handle or the straps with both hands.', 'Feet hip-width, knees soft. Push your hips back until your chest leans forward, back flat.', 'Pull the bag to your stomach, elbows going back, and squeeze your shoulder blades together.', 'Take 2 seconds to lower it until your arms are straight. Keep your back flat the whole time.'],
    avoid: 'Rounding your back, or jerking the bag up with your hips.',
  });
  const GRIP = [31, 62];
  function rowSet(A, lean, pulled, hands) {
    const top = leanBack(A, thetaForReach(A, GRIP, lean)), bot = leanBack(A, thetaForReach(A, GRIP, pulled));
    delete top.neck; delete bot.neck;
    return { top: Object.assign(top, { hands }), bottom: Object.assign(bot, { hands }) };
  }
  const ROW_PROPS = [FLOOR, post(32, 106)];
  const ROW = rowSet([27, B.ankle], ARM - 0.6, 19.5, two([GRIP[0], GRIP[1]]));
  const rowCues = [
    { always: true, line: ['anN', 'neck'], text: 'STRAIGHT BODY', ext: 5, side: [-1, 0] },
    { from: 0.1, to: 1.0, arrow: [12, 3], at: 'chest', off: [-14, 0], text: 'PULL', lx: [-16, 6] },
  ];
  add('door-row', {
    name: 'Doorframe row', view: [-44, -8, 58, 106], dur: 2.6, props: ROW_PROPS,
    keys: [{ t: 0, p: ROW.top, f: 'Lean back, arms straight' }, { t: 1.0, p: ROW.bottom, f: 'Chest to the frame' }, { t: 1.3, p: ROW.bottom }, { t: 2.3, p: ROW.top }],
    tempo: [[0, 1, 'Pull'], [1, 1.3, 'Squeeze'], [1.3, 2.3, 'Lower']],
    cues: rowCues,
    steps: ['Stand in a doorway, feet close to the frame.', 'Grip both sides of the frame at chest height.', 'Lean back on straight arms, body in one straight line.', 'Pull your chest to the frame and squeeze your shoulder blades, then lower slowly.'],
    avoid: 'Bending at the hips instead of staying straight.',
  });
  const DROW = rowSet([37, B.ankle], ARM - 0.6, 19.5, two([GRIP[0], GRIP[1]]));
  add('deep-door-row', {
    name: 'Deep doorframe row', view: [-50, -8, 58, 106], dur: 2.6, props: ROW_PROPS,
    keys: [{ t: 0, p: DROW.top, f: 'Feet closer, lean further' }, { t: 1.0, p: DROW.bottom, f: 'Chest to the frame' }, { t: 1.3, p: DROW.bottom }, { t: 2.3, p: DROW.top }],
    tempo: [[0, 1, 'Pull'], [1, 1.3, 'Squeeze'], [1.3, 2.3, 'Lower']],
    cues: rowCues,
    steps: ['Same doorframe grip, with your feet closer to the frame.', 'Lean back further on straight arms. The lower you go, the harder it gets.', 'Keep your body in one straight line.', 'Pull your chest to the frame, then lower slowly.'],
    avoid: 'Letting your hips drop behind you.',
  });
  const ONE = rowSet([28, B.ankle], ARM - 0.6, 19.5, [[GRIP[0], GRIP[1]], { w: [7, -25] }]);
  ONE.top.elbows = ONE.bottom.elbows = [null, [-0.5, 0, 1]];
  const oneArm = (slow) => ({
    name: slow ? 'Slow one-arm row' : 'One-arm doorframe row', view: [-44, -8, 58, 106], dur: slow ? 4.6 : 2.6, props: ROW_PROPS,
    keys: slow
      ? [{ t: 0, p: ONE.top, f: 'One hand on the frame' }, { t: 1.0, p: ONE.bottom, f: 'Pull without twisting' }, { t: 1.3, p: ONE.bottom }, { t: 4.3, p: ONE.top, f: '3 seconds back out' }]
      : [{ t: 0, p: ONE.top, f: 'One hand on the frame' }, { t: 1.0, p: ONE.bottom, f: 'Pull without twisting' }, { t: 1.3, p: ONE.bottom }, { t: 2.3, p: ONE.top }],
    tempo: slow ? [[0, 1, 'Pull'], [1, 1.3, 'Squeeze'], [1.3, 4.3, 'Out · 3 s']] : [[0, 1, 'Pull'], [1, 1.3, 'Squeeze'], [1.3, 2.3, 'Lower']],
    cues: [rowCues[0]],
    steps: ['One hand grips the frame at chest height, the other rests on your hip.', 'Lean back on a straight arm, body in one straight line.', slow ? 'Pull your chest to the frame, then take 3 full seconds to lower back out.' : 'Pull your chest to the frame without twisting your shoulders.', 'Finish your reps, then switch arms.'],
    avoid: 'Twisting your chest toward the frame instead of pulling.',
  });
  add('one-arm-row', oneArm(false));
  add('slow-one-arm-row', oneArm(true));

  // ---------- Hips ladder ----------
  const BR_S = [-18, 6.5];
  const brFeet = two([34, B.ankle]);
  const brArms = two([12, 2.6]);
  const brDown = { hip: [BR_S[0] + B.torso, 6.5], torso: 180, feet: brFeet, toes: two(FLAT), hands: brArms, palms: PALMS };
  const brUp = set(brDown, { hip: at(BR_S, 22, B.torso), torso: 202, head: -22 });
  const BR_STEPS = [
    'Lie on your back, knees bent, feet flat and close to your hips.',
    'Arms on the floor by your sides.',
    'Squeeze your glutes and lift your hips until you are straight from shoulders to knees.',
    'Lower with control.',
  ];
  const brCue = { from: 0.95, to: 1.45, line: ['shN', 'knN'], text: 'SHOULDERS TO KNEES', ext: 4 };
  add('bridge', {
    name: 'Glute bridge', view: [-42, -8, 58, 50], dur: 2.6, props: [FLOOR],
    keys: [{ t: 0, p: brDown, f: 'Feet flat, knees bent' }, { t: 0.9, p: brUp, f: 'Squeeze and lift' }, { t: 1.4, p: brUp }, { t: 2.3, p: brDown }],
    tempo: [[0, 0.9, 'Up'], [0.9, 1.4, 'Squeeze'], [1.4, 2.3, 'Down']],
    cues: [brCue], steps: BR_STEPS, avoid: 'Arching your lower back instead of squeezing your glutes.',
  });
  add('bridge-hold', {
    name: 'Glute bridge, 3 s squeeze', view: [-42, -8, 58, 50], dur: 5, props: [FLOOR],
    keys: [{ t: 0, p: brDown, f: 'Feet flat, knees bent' }, { t: 0.9, p: brUp, f: 'Squeeze 3 seconds' }, { t: 3.9, p: brUp }, { t: 4.8, p: brDown }],
    tempo: [[0, 0.9, 'Up'], [0.9, 3.9, 'Squeeze · 3 s'], [3.9, 4.8, 'Down']],
    cues: [Object.assign({}, brCue, { to: 3.9, text: 'SQUEEZE · 3 S' })],
    steps: [BR_STEPS[0], BR_STEPS[1], 'Lift your hips and squeeze your glutes as hard as you can for 3 full seconds.', 'Lower with control, then go again.'],
    avoid: 'Rushing the squeeze or pushing through your toes.',
  });
  const HT_S = [-17, 29];
  const htFeet = two([36, B.ankle]);
  const htArms = two([HT_S[0] - 25, 25.8]);
  const htDown = { hip: at(HT_S, -35, B.torso), torso: 145, head: -28, feet: htFeet, toes: two(FLAT), hands: htArms, palms: two(180) };
  const htUp = set(htDown, { hip: at(HT_S, 0, B.torso), torso: 180, head: -40 });
  add('hip-thrust', {
    name: 'Hip thrust', view: [-62, -8, 54, 66], dur: 2.6, props: [FLOOR, couchBehind(-16)],
    keys: [{ t: 0, p: htDown, f: 'Shoulders on the couch edge' }, { t: 0.9, p: htUp, f: 'Drive hips up' }, { t: 1.4, p: htUp }, { t: 2.3, p: htDown }],
    tempo: [[0, 0.9, 'Up'], [0.9, 1.4, 'Squeeze'], [1.4, 2.3, 'Down']],
    cues: [{ from: 0.95, to: 1.45, line: ['shN', 'knN'], text: 'FLAT LIKE A TABLE', ext: 4 }],
    steps: ['Sit on the floor with your upper back against the couch edge.', 'Feet flat, knees bent, arms resting on the couch.', 'Drive through your heels until your body is flat like a table from shoulders to knees.', 'Squeeze at the top, then lower with control.'],
    avoid: 'Arching your lower back at the top.',
  });
  const slLeg = (hip, ang) => at(hip, ang, LEG - 2);
  const slbDown = set(brDown, { feet: [slLeg(brDown.hip, 30), brFeet[1]], toes: [30, FLAT] });
  const slbUp = set(brUp, { feet: [slLeg(brUp.hip, 24), brFeet[1]], toes: [24, FLAT] });
  add('sl-bridge', {
    name: 'Single-leg glute bridge', view: [-42, -8, 76, 56], dur: 2.6, props: [FLOOR],
    keys: [{ t: 0, p: slbDown, f: 'One foot down, one leg up' }, { t: 0.9, p: slbUp, f: 'Lift on one leg' }, { t: 1.4, p: slbUp }, { t: 2.3, p: slbDown }],
    tempo: [[0, 0.9, 'Up'], [0.9, 1.4, 'Squeeze'], [1.4, 2.3, 'Down']],
    cues: [brCue],
    steps: ['Lie on your back, one foot flat, the other leg straight and lifted.', 'Arms on the floor by your sides.', 'Push through the flat foot and lift your hips level.', 'Lower with control. Finish your reps, then switch legs.'],
    avoid: 'Hips tilting to one side.',
  });
  const slhDown = set(htDown, { feet: [slLeg(htDown.hip, 26), htFeet[1]], toes: [26, FLAT] });
  const slhUp = set(htUp, { feet: [slLeg(htUp.hip, 6), htFeet[1]], toes: [6, FLAT] });
  add('sl-hip-thrust', {
    name: 'Single-leg hip thrust', view: [-62, -8, 82, 66], dur: 2.6, props: [FLOOR, couchBehind(-16)],
    keys: [{ t: 0, p: slhDown, f: 'One leg up' }, { t: 0.9, p: slhUp, f: 'Drive up on one leg' }, { t: 1.4, p: slhUp }, { t: 2.3, p: slhDown }],
    tempo: [[0, 0.9, 'Up'], [0.9, 1.4, 'Squeeze'], [1.4, 2.3, 'Down']],
    cues: [],
    steps: ['Upper back on the couch edge, one foot flat, the other leg straight.', 'Arms resting on the couch.', 'Drive through the flat foot until your hips are level with your shoulders.', 'Lower with control. Finish your reps, then switch legs.'],
    avoid: 'Twisting your hips as you lift.',
  });

  // ---------- Core ladder ----------
  const DB_S = [-14, 6.5], DB_P = [DB_S[0] + B.torso, 6.5];
  const dbIn = { hip: DB_P, torso: 180, hands: two({ w: [0, 31] }), feet: two([DB_P[0] + 23.5, 30.5]), toes: two(90) };
  const dbOut = (side) => {
    const p = copy(dbIn);
    p.hands[side] = [DB_S[0] - 30, 11];
    p.feet[1 - side] = [DB_P[0] + 45.5, 9];
    p.toes[1 - side] = 40;
    return p;
  };
  add('dead-bug', {
    name: 'Dead bug', view: [-56, -8, 66, 56], dur: 5.6, props: [FLOOR],
    keys: [{ t: 0, p: dbIn, f: 'Arms up, knees up' }, { t: 1.2, p: dbOut(0), f: 'Opposite arm and leg out' }, { t: 1.7, p: dbOut(0) }, { t: 2.8, p: dbIn }, { t: 4.0, p: dbOut(1), f: 'Switch sides' }, { t: 4.5, p: dbOut(1) }],
    tempo: [[0, 1.2, 'Reach'], [1.7, 2.8, 'Back'], [2.8, 4.0, 'Reach'], [4.5, 5.6, 'Back']],
    cues: [{ always: true, text: 'LOWER BACK STAYS DOWN', at: [12, 51], anchor: 'middle' }],
    steps: ['Lie on your back, arms straight up, knees bent above your hips.', 'Press your lower back into the floor and keep it there.', 'Slowly reach one arm back and the opposite leg out, just above the floor.', 'Bring them back and switch sides.'],
    avoid: 'Your lower back lifting off the floor.',
  });
  const PL_T = [-74, 0];
  const plBeta = betaForHeight(PL_T, B.upper + 2.2);
  const plShoulder = onToes(PL_T, plBeta).neck;
  const plArms = two([plShoulder[0] + 14.6, 2.6]);
  const plElbows = two([1, -0.25, 0.1]);
  const plUp = Object.assign(plank(PL_T, plBeta, plArms), { elbows: plElbows });
  const knHip = at(plShoulder, 180 - 10, B.torso);
  const plKnees = { hip: knHip, torso: -10, hands: plArms, elbows: plElbows, feet: two([knHip[0] - 32, 3.8]), toes: two(178), knees: two([1, 0, 0]) };
  add('plank', {
    name: 'Plank', view: [-84, -8, 30, 58], dur: 5.6, props: [FLOOR],
    keys: [{ t: 0, p: plKnees, f: 'Forearms down' }, { t: 0.9, p: plUp, f: 'Lift into one straight line' }, { t: 4.6, p: plUp }, { t: 5.3, p: plKnees }],
    tempo: [[0, 0.9, 'Lift'], [0.9, 4.6, 'Hold'], [4.6, 5.3, 'Rest']],
    cues: [Object.assign({}, lineCue, { always: false, from: 1.0, to: 4.6 }), { from: 1.6, to: 4.6, text: 'SQUEEZE GLUTES', at: 'hip', off: [-10, 14] }],
    wrong: { p: set(plUp, { hip: [plUp.hip[0], plUp.hip[1] - 8], torso: plBeta + 15 }), text: 'Hips sagging' },
    steps: ['Forearms on the floor, elbows under your shoulders.', 'Step your feet back, toes tucked under.', 'Squeeze your glutes and brace like you are about to be punched.', 'Hold one straight line and breathe slowly.'],
    avoid: 'Hips sagging toward the floor or piking up.',
  });
  const SP_A = [-60, 4.2];
  function sidePlank(a) {
    const r = [-Math.sin(a * DEG), Math.cos(a * DEG)];
    const bottomHip = at(SP_A, a, LEG - 0.4);
    const hip = [bottomHip[0] + r[0] * B.hip, bottomHip[1] + r[1] * B.hip];
    return { front: true, hip, torso: a, feet: [[SP_A[0] + r[0] * 4, SP_A[1] + r[1] * 4, 0], [SP_A[0], SP_A[1], 0]], toes: two(-8) };
  }
  const spA = solveFor((a) => { const p = sidePlank(a); const n = at(p.hip, a, B.torso); return n[1] - Math.cos(a * DEG) * B.sh; }, 19.2, 0, 40);
  const spUp = sidePlank(spA);
  const spNeck = at(spUp.hip, spA, B.torso);
  const spBottomSh = [spNeck[0] + Math.sin(spA * DEG) * B.sh, spNeck[1] - Math.cos(spA * DEG) * B.sh];
  const spHands = [{ b: [4, -24, 2] }, [spBottomSh[0] + 10, 2.8, 10]];
  const spElbows = [[0.3, 0, 1], [0, 0, 1]];
  Object.assign(spUp, { hands: spHands, elbows: spElbows });
  const spDownA = solveFor((a) => spNeck[1] - Math.sin(a * DEG) * B.torso - Math.cos(a * DEG) * B.hip, 6.5, spA, 75);
  const spDownHip = [spNeck[0] - Math.cos(spDownA * DEG) * B.torso, spNeck[1] - Math.sin(spDownA * DEG) * B.torso];
  // Hips down: the legs stay straight and the feet slide out to where they land.
  const spDownFeet = spUp.feet.map((f, i) => {
    const r = [-Math.sin(spDownA * DEG), Math.cos(spDownA * DEG)], side = i ? -1 : 1;
    const hp = [spDownHip[0] + r[0] * B.hip * side, spDownHip[1] + r[1] * B.hip * side];
    const ang = Math.atan2(f[1] - hp[1], f[0] - hp[0]);
    return [hp[0] + Math.cos(ang) * (LEG - 0.4), Math.max(f[1], hp[1] + Math.sin(ang) * (LEG - 0.4)), 0];
  });
  const spDown = Object.assign(copy(spUp), { hip: spDownHip, torso: spDownA, feet: spDownFeet });
  add('side-plank', {
    name: 'Side plank', view: [-72, -8, 32, 58], dur: 4.8, props: [FLOOR],
    keys: [{ t: 0, p: spDown, f: 'On your side, forearm down' }, { t: 0.8, p: spUp, f: 'Lift your hips' }, { t: 3.8, p: spUp }, { t: 4.5, p: spDown }],
    tempo: [[0, 0.8, 'Lift'], [0.8, 3.8, 'Hold'], [3.8, 4.5, 'Lower']],
    cues: [{ from: 0.9, to: 3.8, text: 'HIPS HIGH, ONE STRAIGHT LINE', at: [-40, 50], anchor: 'middle' }],
    steps: ['Lie on your side, forearm under your shoulder, feet stacked.', 'Lift your hips until your body is one straight line.', 'Top hand on your hip. Don\'t let your hips drop.', 'Hold, then switch sides.'],
    avoid: 'Hips sagging or rolling forward.',
  });
  const HO_P = [14, 6.5];
  const hoFlat = { hip: HO_P, torso: 180, hands: two([HO_P[0] - B.torso - 30.5, 4]), palms: two(180), feet: two([HO_P[0] + LEG - 0.5, 3.6]), toes: two(-5) };
  const hoSh = at(HO_P, 163, B.torso);
  const hoUp = set(hoFlat, { torso: 163, head: -8, hands: two(at(hoSh, 168, ARM - 0.6)), feet: two(at(HO_P, 14, LEG - 0.5)), toes: two(14) });
  add('hollow-hold', {
    name: 'Hollow hold', view: [-58, -8, 66, 50], dur: 5.6, props: [FLOOR],
    keys: [{ t: 0, p: hoFlat, f: 'Arms overhead' }, { t: 1.0, p: hoUp, f: 'Lift into a banana' }, { t: 4.4, p: hoUp }, { t: 5.2, p: hoFlat }],
    tempo: [[0, 1, 'Lift'], [1, 4.4, 'Hold'], [4.4, 5.2, 'Lower']],
    cues: [{ from: 1.1, to: 4.4, arrow: [0, -6], at: 'hip', off: [-4, 14], text: 'BACK PRESSED DOWN', lx: [-18, 4] }],
    steps: ['Lie on your back with your arms overhead.', 'Press your lower back into the floor.', 'Lift your shoulders and straight legs a few centimetres.', 'Hold the banana shape. Bend your knees to make it easier.'],
    avoid: 'Your lower back arching off the floor.',
  });

  // ---------- Quests and tests ----------
  const wsHigh = { hip: [-6, 40], torso: 90, feet: two([18, B.ankle]), toes: two(FLAT), hands: two({ w: [3, -29] }) };
  const wsLow = set(wsHigh, { hip: [-6, 27.5] });
  add('wall-sit', {
    name: 'Wall sit', view: [-30, -8, 46, 92], dur: 6.4, props: [FLOOR, { wall: -11.5 }],
    keys: [{ t: 0, p: wsHigh, f: 'Back on the wall' }, { t: 1.2, p: wsLow, f: 'Knees at 90°' }, { t: 5.2, p: wsLow }, { t: 6.0, p: wsHigh }],
    tempo: [[0, 1.2, 'Slide down'], [1.2, 5.2, 'Hold'], [5.2, 6, 'Up']],
    cues: [{ from: 1.3, to: 5.2, text: '90°', at: 'knN', off: [-7, -9] }],
    steps: ['Back flat against a wall, feet about two steps out.', 'Slide down until your knees are at 90°.', 'Knees over your ankles, hands off your legs.', 'Hold. Breathe through it.'],
    avoid: 'Hands pushing on your thighs, or knees drifting past your toes.',
  });
  const bpStand = { hip: [0, STAND], torso: 90, feet: two([3, B.ankle]), toes: two(FLAT), hands: ARMS_DOWN };
  const BP_HANDS = two([19, 2.4]);
  const bpSquat = { hip: [-8, 19], torso: 28, feet: two([3, B.ankle]), toes: two(FLAT), hands: BP_HANDS, palms: PALMS, elbows: PUSH_ELBOWS };
  const bpT = [-49, 0];
  const bpBeta = betaForHeight(bpT, 32.6);
  const bpShift = 19.5 - onToes(bpT, bpBeta).neck[0];
  const bpPlank = Object.assign(plank([bpT[0] + bpShift, 0], bpBeta, BP_HANDS, PALMS), { elbows: PUSH_ELBOWS });
  // Mid-jump: shoulders stay over the hands, hips high, feet in the air between squat and plank.
  const bpAir = (s) => {
    const p = copy(bpPlank), a = bpPlank.feet[0], torso = 8 + 10 * s, neck = [19.5, 31.5];
    p.hip = [neck[0] - Math.cos(torso * DEG) * B.torso, neck[1] - Math.sin(torso * DEG) * B.torso];
    p.torso = torso; p.feet = two([a[0] + (3 - a[0]) * s, 13]); p.toes = two(-40);
    return p;
  };
  const bpTall = set(bpStand, { hands: two({ w: [3, 30] }) });
  add('burpee', {
    name: 'Burpee', view: [-62, -8, 52, 122], dur: 3.3, props: [FLOOR],
    keys: [{ t: 0, p: bpStand, f: 'Stand' }, { t: 0.55, p: bpSquat, f: 'Hands down' }, { t: 0.8, p: bpAir(0.45) }, { t: 1.05, p: bpPlank, f: 'Feet back to a plank' }, { t: 1.35, p: bpPlank }, { t: 1.6, p: bpAir(0.55) }, { t: 1.85, p: bpSquat }, { t: 2.55, p: bpTall, f: 'Stand tall' }, { t: 2.95, p: bpStand }],
    tempo: [[0, 0.55, 'Down'], [0.55, 1.35, 'Back'], [1.35, 1.85, 'In'], [1.85, 2.55, 'Up']],
    cues: [{ from: 1.05, to: 1.35, line: ['anN', 'neck'], text: 'STRAIGHT PLANK', ext: 4, lx: [-28, 8] }],
    steps: ['Stand tall, feet hip-width apart.', 'Squat down and put your hands flat on the floor.', 'Jump or step both feet back into a straight plank.', 'Jump or step your feet back in, then stand all the way up.'],
    avoid: 'Hips sagging in the plank. Pick jump or step and keep it the same every trial.',
  });

  // ---------- Fighting moves: orthodox stance, chest turned toward you ----------
  const YAW = -52;
  const FIGHT = { hip: [0, 47.5], torso: 92, yaw: YAW, feet: [[-13, B.ankle, 7], [14, B.ankle, -6]], toes: two(-16) };
  const fj = FG.solve(Object.assign({ hands: two({ w: [0, -30] }) }, FIGHT));
  const shN = fj.arms[0].root, shF = fj.arms[1].root;
  const GUARD = [[shN[0] + 10, shN[1] + 3, shN[2] - 8], [shF[0] + 15, shF[1] + 4, shF[2] + 5]];
  const DOWN_ELBOWS = two([0, -1, 0.25]);
  const guard = set(FIGHT, { hands: GUARD, elbows: DOWN_ELBOWS });
  const jab = set(guard, { twist: -6, hands: [GUARD[0], [shF[0] + 31, shF[1] + 1, shF[2] + 2]] });
  const cross = set(guard, { twist: 42, hip: [1.5, 47.5], hands: [[shN[0] + 34, shN[1] + 1, shN[2] - 8], GUARD[1]], toes: [-6, -16] });
  const hook = set(guard, { twist: -28, hands: [GUARD[0], [shF[0] + 13, shF[1] + 2, shF[2] + 15]], elbows: [DOWN_ELBOWS[0], [-0.2, 0.7, 1]] });
  const dip = set(guard, { hip: [0, 44], twist: -10, hands: [[shN[0] + 8, shN[1] - 9, shN[2] - 5], GUARD[1]] });
  const upper = set(guard, { twist: 30, hip: [1, 48], hands: [[shN[0] + 21, shN[1] + 14, shN[2] - 11], GUARD[1]], elbows: [[0.1, -1, -0.2], DOWN_ELBOWS[1]] });
  const FIGHT_VIEW = [-46, -8, 66, 108];
  add('boxing', {
    name: 'Shadowboxing', view: FIGHT_VIEW, dur: 2.7, props: [FLOOR],
    keys: [{ t: 0, p: guard, f: 'Guard up' }, { t: 0.18, p: jab, hi: ['aF'], f: 'Jab' }, { t: 0.42, p: guard }, { t: 0.62, p: cross, hi: ['aN'], f: 'Cross' }, { t: 0.9, p: guard }, { t: 1.12, p: hook, hi: ['aF'], f: 'Hook' }, { t: 1.4, p: guard }, { t: 1.55, p: dip }, { t: 1.75, p: upper, hi: ['aN'], f: 'Uppercut' }, { t: 2.05, p: guard }],
    cues: [
      { from: 0.05, to: 0.42, text: 'JAB', at: [40, 98] }, { from: 0.5, to: 0.9, text: 'CROSS', at: [40, 98] },
      { from: 0.98, to: 1.4, text: 'HOOK', at: [40, 98] }, { from: 1.5, to: 2.05, text: 'UPPERCUT', at: [40, 98] },
      { from: 1.0, to: 1.4, trail: ['tipF', 0.9, 1.12] }, { from: 1.65, to: 2.05, trail: ['tipN', 1.55, 1.75] },
    ],
    steps: ['Stance: lead foot forward, hands at your chin, elbows down.', 'Jab: snap the lead hand straight out and straight back.', 'Cross: turn your back foot and hip, drive the rear hand straight through.', 'Hook and uppercut: short turns from the hips. Hands back to your chin after every punch.'],
    avoid: 'Dropping your hands between punches, or holding your breath.',
  });
  add('speed-punches', {
    name: 'All-out punches', view: FIGHT_VIEW, dur: 0.9, props: [FLOOR],
    keys: [{ t: 0, p: guard }, { t: 0.12, p: jab, hi: ['aF'], f: 'Jab' }, { t: 0.3, p: guard }, { t: 0.45, p: cross, hi: ['aN'], f: 'Cross' }, { t: 0.63, p: guard }],
    steps: ['Stance, hands at your chin.', 'Throw straight punches, left and right, as fast as you can.', 'Snap each one back to your face. Speed over power.', 'Breathe out short and sharp on every punch.'],
    avoid: 'Swinging wide or leaning forward.',
  });
  const single = (id, name, p, hi, steps, avoid, pre) => add(id, {
    name, view: FIGHT_VIEW, dur: 1.6, props: [FLOOR],
    keys: pre ? [{ t: 0, p: guard, f: 'Guard' }, { t: 0.2, p: pre }, { t: 0.42, p, hi, f: name }, { t: 0.7, p }, { t: 0.95, p: guard }] : [{ t: 0, p: guard, f: 'Guard' }, { t: 0.25, p, hi, f: name }, { t: 0.6, p }, { t: 0.85, p: guard }],
    cues: [{ from: pre ? 0.3 : 0.15, to: pre ? 0.85 : 0.75, trail: [hi[0] === 'aN' ? 'tipN' : 'tipF', pre ? 0.2 : 0, pre ? 0.42 : 0.25] }],
    steps, avoid,
  });
  single('jab', 'Jab', jab, ['aF'], ['Lead foot forward, hands at your chin.', 'Snap your lead hand straight out, turning the fist over.', 'Full extension at shoulder height, chin tucked.', 'Snap it straight back to your chin.'], 'Pulling the hand back low.');
  single('cross', 'Cross', cross, ['aN'], ['Hands at your chin.', 'Turn your back heel out and rotate your hip forward.', 'Drive the rear hand straight through at shoulder height.', 'Return it to your chin as fast as it went out.'], 'Arm-only punching with no hip turn.');
  single('hook', 'Lead hook', hook, ['aF'], ['Hands at your chin.', 'Lift your lead elbow to shoulder height, arm bent at 90°.', 'Pivot on your lead foot and turn your hips through.', 'The fist travels sideways, then back to guard.'], 'Swinging the arm wide and loose.');
  single('uppercut', 'Rear uppercut', upper, ['aN'], ['Hands at your chin.', 'Dip slightly by bending your knees.', 'Drive up from the legs and hips, rear hand rising to chin height.', 'No wind-up. Back to guard.'], 'Dropping the hand before you throw.', dip);

  const rearLift = (f, toe) => ({ feet: [f, FIGHT.feet[1]], toes: [toe, -16] });
  const chamberRH = set(guard, Object.assign({ yaw: 10, torso: 98 }, rearLift([-2, 40, 16], -30)));
  const roundhouse = set(guard, Object.assign({ yaw: 60, torso: 112, hip: [2, 48] }, rearLift([44, 54, 2], 0)));
  const chamberFK = set(guard, Object.assign({ torso: 96 }, rearLift([6, 34, 6], -40)));
  const frontKick = set(guard, Object.assign({ torso: 104, hip: [1, 48.5] }, rearLift([47, 47, 3], 35)));
  const kneeStrike = set(guard, Object.assign({ torso: 100, hands: [[shN[0] + 24, shN[1] - 10, shN[2] - 6], [shF[0] + 24, shF[1] - 9, shF[2] + 4]] }, rearLift([12, 32, 4], -60)));
  const KICK_VIEW = [-46, -8, 76, 108];
  add('roundhouse', {
    name: 'Roundhouse kick', view: KICK_VIEW, dur: 1.9, props: [FLOOR],
    keys: [{ t: 0, p: guard, f: 'Stance' }, { t: 0.35, p: chamberRH, hi: ['lN'], f: 'Knee up, pivot' }, { t: 0.62, p: roundhouse, hi: ['lN'], f: 'Hip over, shin through' }, { t: 0.78, p: roundhouse, hi: ['lN'] }, { t: 1.05, p: chamberRH, hi: ['lN'] }, { t: 1.4, p: guard }],
    cues: [{ from: 0.3, to: 0.95, trail: ['toeN', 0.18, 0.62] }, { from: 0.45, to: 0.95, text: 'PIVOT', at: 'toeF', off: [-2, 8], anchor: 'end' }],
    steps: ['Fighting stance, hands up.', 'Lift your rear knee and pivot on your standing foot.', 'Turn your hip over and snap your shin through at waist height or higher.', 'Pull it back and land in stance. For the speed test, alternate legs.'],
    avoid: 'Kicking without pivoting, or dropping your hands.',
  });
  add('front-kick', {
    name: 'Front kick', view: KICK_VIEW, dur: 1.7, props: [FLOOR],
    keys: [{ t: 0, p: guard, f: 'Stance' }, { t: 0.3, p: chamberFK, hi: ['lN'], f: 'Knee up' }, { t: 0.52, p: frontKick, hi: ['lN'], f: 'Snap it out' }, { t: 0.66, p: frontKick, hi: ['lN'] }, { t: 0.9, p: chamberFK, hi: ['lN'] }, { t: 1.2, p: guard }],
    steps: ['Fighting stance, hands up.', 'Bring your knee up high first.', 'Snap the foot out, hips forward, striking with the ball of the foot.', 'Pull it back to the knee-up position, then land in stance.'],
    avoid: 'Swinging a straight leg up from the floor.',
  });
  add('knee-strike', {
    name: 'Knee strike', view: KICK_VIEW, dur: 1.4, props: [FLOOR],
    keys: [{ t: 0, p: guard, f: 'Stance' }, { t: 0.3, p: kneeStrike, hi: ['lN', 'aN', 'aF'], f: 'Pull down, knee up' }, { t: 0.55, p: kneeStrike, hi: ['lN'] }, { t: 0.85, p: guard }],
    steps: ['Fighting stance, hands up.', 'Reach forward as if grabbing the back of a head.', 'Pull down while driving your rear knee up and through.', 'Hips forward at the top, then step back to stance.'],
    avoid: 'Leaning back away from the knee.',
  });
  add('kicks', {
    name: 'Kick rounds', view: KICK_VIEW, dur: 4.8, props: [FLOOR],
    keys: [
      { t: 0, p: guard, f: 'Stance' }, { t: 0.3, p: chamberFK, hi: ['lN'] }, { t: 0.52, p: frontKick, hi: ['lN'], f: 'Front kick' }, { t: 0.66, p: frontKick, hi: ['lN'] }, { t: 0.9, p: chamberFK, hi: ['lN'] }, { t: 1.2, p: guard },
      { t: 1.6, p: chamberRH, hi: ['lN'] }, { t: 1.87, p: roundhouse, hi: ['lN'], f: 'Roundhouse' }, { t: 2.03, p: roundhouse, hi: ['lN'] }, { t: 2.3, p: chamberRH, hi: ['lN'] }, { t: 2.65, p: guard },
      { t: 3.0, p: kneeStrike, hi: ['lN'], f: 'Knee' }, { t: 3.25, p: kneeStrike, hi: ['lN'] }, { t: 3.6, p: guard },
    ],
    cues: [{ from: 0.2, to: 1.2, text: 'FRONT KICK', at: [44, 98] }, { from: 1.5, to: 2.65, text: 'ROUNDHOUSE', at: [44, 98] }, { from: 2.85, to: 3.6, text: 'KNEE', at: [44, 98] }],
    steps: ['Fighting stance, hands up the whole round.', 'Front kick: knee up, snap the foot out, pull it back.', 'Roundhouse: pivot, turn the hip over, shin through.', 'Knee: pull down and drive the knee up. Switch sides every 30 seconds.'],
    avoid: 'Kicking at full power before you are warm. Control first, then speed.',
  });

  // ---------- Warm-up ----------
  const mStand = { hip: [0, STAND], torso: 90, feet: two([3, B.ankle]), toes: two(FLAT), hands: ARMS_DOWN };
  const mKnee = (i) => {
    const p = copy(mStand);
    p.hip = [0, STAND - 1];
    p.feet[i] = [21, 27];
    p.toes[i] = -30;
    p.hands = i === 0 ? [{ w: [-10, -27] }, { w: [16, -22] }] : [{ w: [16, -22] }, { w: [-10, -27] }];
    return p;
  };
  add('march', {
    name: 'March on the spot', view: [-44, -8, 56, 106], dur: 1.6, props: [FLOOR],
    keys: [{ t: 0, p: mStand }, { t: 0.4, p: mKnee(0), f: 'Knee to hip height' }, { t: 0.8, p: mStand }, { t: 1.2, p: mKnee(1), f: 'Other knee, other arm' }],
    steps: ['Stand tall.', 'Drive one knee up to hip height.', 'Swing the opposite arm forward.', 'Switch, and keep a steady rhythm.'],
  });
  const jjIn = { front: true, hip: [0, STAND], torso: 90, feet: [[-5, B.ankle, 0], [5, B.ankle, 0]], toes: two(-10), hands: [[-12, 49, 0], [12, 49, 0]], elbows: two([0, 0, 1]) };
  const jjOut = set(jjIn, { feet: [[-20, B.ankle, 0], [20, B.ankle, 0]], hands: [[-9, 112, 0], [9, 112, 0]], hip: [0, STAND - 1.5] });
  const jjAir = (s) => set(jjIn, { hip: [0, STAND + 4], feet: [[-5 - 15 * s, 8, 0], [5 + 15 * s, 8, 0]], hands: [[-20, 92, 0], [20, 92, 0]] });
  add('jumping-jacks', {
    name: 'Jumping jacks', view: [-50, -8, 50, 126], dur: 1.2, props: [FLOOR],
    keys: [{ t: 0, p: jjIn, f: 'Feet together' }, { t: 0.18, p: jjAir(0.5) }, { t: 0.36, p: jjOut, f: 'Jump wide, hands up' }, { t: 0.6, p: jjOut }, { t: 0.78, p: jjAir(0.5) }, { t: 0.96, p: jjIn }],
    steps: ['Feet together, arms by your sides.', 'Jump your feet wide as your hands swing overhead.', 'Jump back to the start.', 'Land softly. Marching on the spot works too.'],
  });
  add('arm-circles', {
    name: 'Arm circles', view: [-50, -8, 50, 106], dur: 1.2, props: [FLOOR],
    keys: [{ t: 0, lin: true, p: { front: true, yaw: -32, hip: [0, STAND], torso: 90, feet: [[-5, B.ankle, 0], [5, B.ankle, 0]], toes: two(-10), hands: two({ w: [0, 0, 30] }), elbows: two([0, 1, 0]) }, f: 'Arms out, small circles' }],
    mod: (p, t) => { const a = (t / 1.2) * Math.PI * 2; p.hands = two({ w: [6 * Math.sin(a), 6 * Math.cos(a), 30] }); },
    steps: ['Stand tall, arms straight out to your sides.', 'Draw small circles with your hands.', 'Make them bigger every few seconds.', 'Switch direction halfway.'],
  });
  const lsSwing = (deg) => ({ hip: [0, STAND], torso: 90, feet: [at([0, STAND], -90 + deg, LEG - 0.6), [2, B.ankle]], toes: [deg - 15, FLAT], hands: [{ w: [-4, -28] }, { w: [26, -6] }] });
  add('leg-swings', {
    name: 'Leg swings', view: [-46, -8, 60, 106], dur: 1.3, props: [FLOOR],
    keys: [{ t: 0, p: lsSwing(-32), f: 'Swing back' }, { t: 0.65, p: lsSwing(62), f: 'Swing forward' }],
    steps: ['Hold a wall or chair for balance.', 'Swing one straight leg forward and back.', 'Let it get a little higher each time, no forcing.', '10 swings, then switch legs.'],
  });

  const MOVES = {
    all: M,
    get: (id) => M[id] || null,
    ids: () => Object.keys(M),
  };
  root.MOVES = MOVES;
  if (typeof module !== 'undefined' && module.exports) module.exports = MOVES;
})(typeof globalThis !== 'undefined' ? globalThis : this);
