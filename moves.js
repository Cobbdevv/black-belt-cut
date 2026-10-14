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
    { from: 1.25, to: 2.2, text: 'THIGHS LEVEL', at: 'knN', off: [14, 12], anchor: 'middle' },
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
    cues: [SQ_CUES[0], { from: 1.25, to: 4.2, text: 'HOLD · 3 S', at: 'knN', off: [8, 6], anchor: 'middle' }],
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
    cues: [{ from: 0.1, to: 1.2, arrow: [0, -12], at: 'hip', off: [9, 6], text: 'STRAIGHT DOWN', lx: [3, 20] }],
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
    { from: 0.1, to: 1.0, arrow: [12, 3], at: 'chest', off: [-14, 0], text: 'PULL', lx: [-26, 2] },
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
    name: 'Dead bug', view: [-62, -8, 76, 60], dur: 5.6, props: [FLOOR],
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
    name: 'Hollow hold', view: [-64, -8, 78, 56], dur: 5.6, props: [FLOOR],
    keys: [{ t: 0, p: hoFlat, f: 'Arms overhead' }, { t: 1.0, p: hoUp, f: 'Lift into a banana' }, { t: 4.4, p: hoUp }, { t: 5.2, p: hoFlat }],
    tempo: [[0, 1, 'Lift'], [1, 4.4, 'Hold'], [4.4, 5.2, 'Lower']],
    cues: [{ from: 1.1, to: 4.4, arrow: [0, -6], at: 'hip', off: [-4, 14], text: 'BACK PRESSED DOWN', lx: [-18, 8] }],
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
    cues: [{ from: 1.3, to: 5.2, text: '90°', at: 'knN', off: [-15, -11] }],
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
    cues: [{ from: 0.3, to: 0.95, trail: ['toeN', 0.18, 0.62] }, { from: 0.45, to: 0.95, text: 'PIVOT', at: 'toeF', off: [-14, 4], anchor: 'end' }],
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

  // ---------- Techniques: every entry in the 20-technique list gets its own how-to ----------
  // Guard hands expressed relative to the shoulders, so they stay at the chin while the body turns or travels.
  const fF = FG.solve(guard).F;
  const toW = (pt, sh, s) => { const o = [pt[0] - sh[0], pt[1] - sh[1], pt[2] - sh[2]]; return { w: [o[0] * fF.fwd[0] + o[2] * fF.fwd[2], o[1], (o[0] * fF.side[0] + o[2] * fF.side[2]) * s] }; };
  const guardW = set(guard, { hands: [toW(GUARD[0], shN, 1), toW(GUARD[1], shF, -1)] });
  const LEAD = FIGHT.feet[1];
  const HIGH_VIEW = [-50, -8, 84, 126];
  // Spins add 360° of yaw; while the last key eases back into the first, hold its yaw so the figure never unwinds.
  const spin = (move, yaw) => { const last = move.keys.length - 1; move.mod = (p) => { if (p.key === last) p.yaw = yaw; }; return move; };
  const label = (from, to, text) => ({ from, to, text, at: [44, 98] });

  const chamberTP = set(guard, Object.assign({ torso: 98 }, rearLift([8, 36, 6], -30)));
  const teep = set(guard, Object.assign({ torso: 112, hip: [4, 48.5] }, rearLift([46, 42, 3], 55)));
  add('teep', {
    name: 'Push kick (teep)', view: KICK_VIEW, dur: 1.8, props: [FLOOR],
    keys: [{ t: 0, p: guard, f: 'Stance' }, { t: 0.3, p: chamberTP, hi: ['lN'], f: 'Knee up' }, { t: 0.55, p: teep, hi: ['lN'], f: 'Hips through, ball of the foot' }, { t: 0.75, p: teep, hi: ['lN'] }, { t: 1.0, p: chamberTP, hi: ['lN'] }, { t: 1.3, p: guard }],
    cues: [{ from: 0.45, to: 0.9, arrow: [12, 0], at: 'hip', off: [-4, 8], text: 'HIPS FORWARD', lx: [-54, 3] }],
    steps: ['Fighting stance, hands up.', 'Lift the knee straight up in front of you.', 'Push your hips forward and drive the ball of the foot into the target, like shoving a door open.', 'Pull it back to the knee, then land in stance.'],
    avoid: 'Leaning so far back that you lose your balance.',
  });

  const chamberSK = set(guardW, Object.assign({ yaw: 30, torso: 100 }, rearLift([8, 36, 8], -60)));
  const sideKick = set(guardW, Object.assign({ yaw: 80, torso: 124, hip: [-3, 48] }, rearLift([48, 53, 0], -95)));
  add('side-kick', {
    name: 'Side kick', view: KICK_VIEW, dur: 1.9, props: [FLOOR],
    keys: [{ t: 0, p: guardW, f: 'Stance' }, { t: 0.35, p: chamberSK, hi: ['lN'], f: 'Knee up, turn side-on' }, { t: 0.62, p: sideKick, hi: ['lN'], f: 'Heel drives out' }, { t: 0.8, p: sideKick, hi: ['lN'] }, { t: 1.08, p: chamberSK, hi: ['lN'] }, { t: 1.45, p: guardW }],
    cues: [{ from: 0.55, to: 0.95, line: ['hpN', 'anN'], text: 'HIP · KNEE · HEEL', side: [0, 1] }],
    steps: ['Fighting stance, hands up.', 'Lift the rear knee and turn side-on, pivoting the standing foot until its heel points at the target.', 'Drive the heel straight out at waist height, with hip, knee and heel in one line.', 'Pull the knee back to the chamber, then land in stance.'],
    avoid: 'Toes pointing up, or a bent knee at impact.',
  });

  const chamberHR = set(guardW, Object.assign({ yaw: 14, torso: 102 }, rearLift([-2, 46, 16], -30)));
  const highRH = set(guardW, Object.assign({ yaw: 64, torso: 128, hip: [0, 49] }, rearLift([38, 80, 2], 5)));
  add('high-roundhouse', {
    name: 'Head-height roundhouse', view: HIGH_VIEW, dur: 2, props: [FLOOR],
    keys: [{ t: 0, p: guardW, f: 'Stance' }, { t: 0.38, p: chamberHR, hi: ['lN'], f: 'Knee up, pivot' }, { t: 0.66, p: highRH, hi: ['lN'], f: 'Lean back, shin to head height' }, { t: 0.84, p: highRH, hi: ['lN'] }, { t: 1.12, p: chamberHR, hi: ['lN'] }, { t: 1.48, p: guardW }],
    cues: [{ from: 0.3, to: 1.0, trail: ['toeN', 0.2, 0.66] }, { from: 0.55, to: 1.0, text: 'HEAD HEIGHT', at: [46, 100] }],
    steps: ['Fighting stance, hands up.', 'Bring the knee up and pivot on your standing foot until the heel points at the target.', 'Turn the hip over and lean back as the shin snaps through at head height.', 'Pull it back and land in stance, hands up the whole time.'],
    avoid: 'Swinging a straight leg up, or dropping your hands to balance.',
  });

  const axeUp = set(guardW, Object.assign({ yaw: -30, torso: 104 }, rearLift([22, 84, 4], 40)));
  const axeTop = set(guardW, Object.assign({ yaw: -20, torso: 110, hip: [-2, 48.5] }, rearLift([14, 93, 4], 75)));
  const axeDown = set(guardW, Object.assign({ yaw: -30, torso: 98, hip: [1, 47.5] }, rearLift([40, 58, 3], -25)));
  const axeLow = set(guardW, Object.assign({ yaw: -40, torso: 94 }, rearLift([30, 16, 3], -20)));
  add('axe-kick', {
    name: 'Axe kick', view: HIGH_VIEW, dur: 1.9, props: [FLOOR],
    keys: [{ t: 0, p: guardW, f: 'Stance' }, { t: 0.3, p: axeUp, hi: ['lN'], f: 'Leg swings up, nearly straight' }, { t: 0.55, p: axeTop, hi: ['lN'], f: 'Up past your head' }, { t: 0.8, p: axeDown, hi: ['lN'], f: 'Heel drops through' }, { t: 1.0, p: axeLow, hi: ['lN'] }, { t: 1.3, p: guardW }],
    cues: [{ from: 0.55, to: 0.95, arrow: [0, -16], at: 'anN', off: [7, 4], text: 'HEEL DOWN', lx: [3, -2] }],
    steps: ['Fighting stance, hands up.', 'Swing the leg up fairly straight, just outside the target, as high as you can control.', 'At the top, drop it down hard and strike with the heel.', 'Land in stance with your hands still up.'],
    avoid: 'Bending the knee on the way down, or leaning back so far that you fall.',
  });

  const bkTurn = set(guardW, { yaw: 60, torso: 94, feet: [[-10, B.ankle, 8], LEAD], toes: [-16, -16] });
  const bkChamber = set(guardW, { yaw: 128, torso: 82, feet: [[2, 36, 2], LEAD], toes: [-70, -16] });
  const bkKick = set(guardW, { yaw: 128, torso: 64, hip: [-2, 47], feet: [[42, 48, 0], LEAD], toes: [-100, -16] });
  add('back-kick', {
    name: 'Back kick', view: KICK_VIEW, dur: 2.1, props: [FLOOR],
    keys: [{ t: 0, p: guardW, f: 'Stance' }, { t: 0.3, p: bkTurn, f: 'Turn, look over your shoulder' }, { t: 0.52, p: bkChamber, hi: ['lN'], f: 'Knee up, back to the target' }, { t: 0.75, p: bkKick, hi: ['lN'], f: 'Heel straight back' }, { t: 0.95, p: bkKick, hi: ['lN'] }, { t: 1.2, p: bkChamber, hi: ['lN'] }, { t: 1.5, p: bkTurn }],
    cues: [{ from: 0.65, to: 1.05, arrow: [12, 0], at: 'anN', off: [2, 8], text: 'STRAIGHT BACK', lx: [-24, 7] }],
    steps: ['Fighting stance, hands up.', 'Turn your back to the target, pivoting on the front foot, and look over your shoulder.', 'Lift the rear knee, then drive the heel straight back at the target, toes pointing down.', 'Pull the knee back and turn to face front in stance.'],
    avoid: 'Swinging the leg out to the side instead of straight back.',
  });

  const swAir = set(guardW, { hip: [0, 50.5], feet: [[0, 9, 7], [2, 9, -6]], toes: [-40, -40] });
  const swStance = set(guardW, { feet: [[13, B.ankle, 7], [-12, B.ankle, -6]], toes: two(-16) });
  const swChamber = set(guardW, { yaw: 10, torso: 98, feet: [[13, B.ankle, 7], [0, 40, -14]], toes: [-16, -30] });
  const swKick = set(guardW, { yaw: 60, torso: 112, hip: [2, 48], feet: [[13, B.ankle, 7], [44, 54, -2]], toes: [-16, 0] });
  add('switch-kick', {
    name: 'Switch kick', view: KICK_VIEW, dur: 2.1, props: [FLOOR],
    keys: [{ t: 0, p: guardW, f: 'Stance' }, { t: 0.15, p: swAir }, { t: 0.3, p: swStance, f: 'Quick switch' }, { t: 0.5, p: swChamber, hi: ['lF'] }, { t: 0.72, p: swKick, hi: ['lF'], f: 'Lead-leg roundhouse' }, { t: 0.88, p: swKick, hi: ['lF'] }, { t: 1.1, p: swChamber, hi: ['lF'] }, { t: 1.35, p: swStance }, { t: 1.5, p: swAir }, { t: 1.68, p: guardW }],
    cues: [label(0.05, 0.4, 'SWITCH'), { from: 0.45, to: 1.0, trail: ['toeF', 0.5, 0.72] }],
    steps: ['Fighting stance, hands up.', 'Switch your feet with a quick, small hop: the lead foot goes back and the rear foot comes forward.', 'Use the bounce to kick a roundhouse with the leg that was in front, turning the hip over.', 'Land and switch back to your normal stance.'],
    avoid: 'A big jump that tells your opponent the kick is coming.',
  });

  const chamberLK = set(guard, Object.assign({ yaw: 0, torso: 97 }, rearLift([-4, 26, 14], -30)));
  const lowKick = set(guard, Object.assign({ yaw: 44, torso: 106, hip: [2, 47.5] }, rearLift([38, 20, 4], -8)));
  add('combo', {
    name: 'Jab, cross, hook, low kick', view: KICK_VIEW, dur: 2.6, props: [FLOOR],
    keys: [{ t: 0, p: guard, f: 'Guard' }, { t: 0.15, p: jab, hi: ['aF'], f: 'Jab' }, { t: 0.35, p: guard }, { t: 0.52, p: cross, hi: ['aN'], f: 'Cross' }, { t: 0.75, p: guard }, { t: 0.92, p: hook, hi: ['aF'], f: 'Hook' }, { t: 1.15, p: guard },
      { t: 1.35, p: chamberLK, hi: ['lN'] }, { t: 1.55, p: lowKick, hi: ['lN'], f: 'Low kick' }, { t: 1.7, p: lowKick, hi: ['lN'] }, { t: 2.0, p: guard }],
    cues: [label(0.05, 0.35, 'JAB'), label(0.4, 0.75, 'CROSS'), label(0.8, 1.15, 'HOOK'), label(1.25, 1.95, 'LOW KICK'), { from: 1.4, to: 1.95, trail: ['toeN', 1.35, 1.55] }],
    steps: ['Jab: snap the lead hand straight out and back.', 'Cross: turn the back hip and drive the rear hand through.', 'Hook: lead elbow up, pivot on the lead foot.', 'Low kick: turn the rear hip over and swing the shin into the thigh, then straight back to guard.'],
    avoid: 'Pausing between strikes, or dropping your hands on the kick.',
  });

  const fw = (hx, near, far) => set(guardW, { hip: [hx, 47.5], feet: [near, far] });
  const N0 = FIGHT.feet[0];
  add('footwork', {
    name: 'Footwork', view: KICK_VIEW, dur: 2.4, props: [FLOOR],
    keys: [{ t: 0, p: guardW, f: 'Stance' }, { t: 0.22, p: fw(5, N0, [24, 5, -6]) }, { t: 0.4, p: fw(8, N0, [30, B.ankle, -6]), f: 'Lead foot steps first' }, { t: 0.6, p: fw(13, [-4, 4, 7], [30, B.ankle, -6]) },
      { t: 0.75, p: fw(16, [3, B.ankle, 7], [30, B.ankle, -6]), f: 'Rear foot follows' }, { t: 1.1, p: fw(16, [3, B.ankle, 7], [30, B.ankle, -6]) }, { t: 1.3, p: fw(11, [-6, 4, 7], [30, B.ankle, -6]) },
      { t: 1.45, p: fw(8, N0, [30, B.ankle, -6]), f: 'Back: rear foot first' }, { t: 1.65, p: fw(3, N0, [21, 4, -6]) }, { t: 1.8, p: guardW }],
    cues: [label(0.1, 0.85, 'FORWARD'), label(1.2, 1.9, 'BACK')],
    steps: ['Fighting stance, hands up, weight on the balls of your feet.', 'Forward: the lead foot steps first, then the rear foot follows the same distance.', 'Back: the rear foot steps first, then the lead foot follows.', 'Keep the same stance width on every step and never cross your feet.'],
    avoid: 'Crossing your feet, bouncing high, or letting your stance get narrow.',
  });

  const slip = set(guardW, { hip: [2, 44], torso: 72, twist: 28 });
  const rollDown = set(guardW, { hip: [-1, 38.5], torso: 66 });
  const rollUp = set(guardW, { hip: [1, 44], torso: 100, twist: -16 });
  add('slip-roll', {
    name: 'Slip and roll', view: KICK_VIEW, dur: 1.9, props: [FLOOR],
    keys: [{ t: 0, p: guardW, f: 'Guard' }, { t: 0.25, p: slip, f: 'Slip: head off the line' }, { t: 0.5, p: guardW }, { t: 0.85, p: rollDown, f: 'Roll: knees bend, head in a U' }, { t: 1.15, p: rollUp }, { t: 1.4, p: guardW }],
    cues: [label(0.05, 0.5, 'SLIP'), label(0.6, 1.4, 'ROLL'), { from: 0.7, to: 1.4, trail: ['head', 0.5, 1.15] }],
    steps: ['Guard up, eyes on the target.', 'Slip: turn your shoulders and dip your head just outside the straight punch, knees soft.', 'Roll: bend your knees and move your head in a U under the hook, coming up on the other side.', 'Hands stay at your chin and your eyes never leave the target.'],
    avoid: 'Bending at the waist or looking at the floor.',
  });

  const shTurn = set(guardW, { yaw: 80, torso: 96, feet: [[-8, B.ankle, 10], LEAD], toes: [-16, -16] });
  // Turned away from the target, so leaning away from it means leaning "forward" in the body's own frame (torso under 90).
  const shOut = set(guardW, { yaw: 150, torso: 52, hip: [-2, 47.5], feet: [[40, 74, -4], LEAD], toes: [10, -16] });
  const shHook = set(guardW, { yaw: 210, torso: 58, hip: [-2, 47.5], feet: [[24, 78, -22], LEAD], toes: [10, -16] });
  const shRecover = set(guardW, { yaw: 262, torso: 96, feet: [[-10, 28, 6], LEAD], toes: [-30, -16] });
  add('spin-hook', spin({
    name: 'Spinning hook kick', view: HIGH_VIEW, dur: 1.8, props: [FLOOR],
    keys: [{ t: 0, p: guardW, f: 'Stance' }, { t: 0.28, p: shTurn, f: 'Spin, look over your shoulder' }, { t: 0.55, p: shOut, hi: ['lN'], f: 'Leg sweeps at head height' }, { t: 0.72, p: shHook, hi: ['lN'], f: 'Heel hooks through' }, { t: 1.0, p: shRecover }, { t: 1.3, p: set(guardW, { yaw: 308 }), f: 'Land in stance' }],
    cues: [label(0.15, 0.5, 'LOOK'), { from: 0.45, to: 0.95, trail: ['toeN', 0.42, 0.75] }],
    steps: ['Fighting stance, hands up.', 'Spin backward on your front foot and look over your shoulder at the target.', 'Swing the rear leg around at head height, bending the knee so the heel hooks through.', 'Keep turning and land back in stance, hands up.'],
    avoid: 'Spinning without looking first, or kicking before your hips have turned.',
  }, 308));

  const jfAir = set(guardW, { hip: [3, 57], feet: [[-4, 16, 7], [10, 22, -6]], toes: [-50, -40] });
  const jfKick = set(guardW, { hip: [4, 60], torso: 104, feet: [[48, 60, 3], [8, 26, -6]], toes: [35, -40] });
  const jfBack = set(guardW, { hip: [3, 53], feet: [[10, 30, 5], [12, 9, -6]], toes: [-40, -30] });
  add('jump-front-kick', {
    name: 'Jumping front kick', view: HIGH_VIEW, dur: 1.9, props: [FLOOR],
    keys: [{ t: 0, p: guardW, f: 'Stance' }, { t: 0.28, p: set(guardW, { hip: [0, 43] }), f: 'Dip' }, { t: 0.48, p: jfAir, f: 'Jump, knee up' }, { t: 0.66, p: jfKick, hi: ['lN'], f: 'Kick at the top' }, { t: 0.86, p: jfBack }, { t: 1.06, p: set(guardW, { hip: [1, 44.5] }), f: 'Land softly' }, { t: 1.4, p: guardW }],
    cues: [{ from: 0.5, to: 0.95, trail: ['toeN', 0.48, 0.66] }],
    steps: ['Fighting stance, hands up.', 'Dip your knees and jump, driving the rear knee up high.', 'Snap the front kick out at the top of the jump, ball of the foot first.', 'Pull the foot back and land softly on both feet, knees bent.'],
    avoid: 'Kicking on the way down, or landing with straight legs.',
  });

  const tdTurn = set(guardW, { yaw: 100, hip: [0, 44], feet: [[-6, B.ankle, 9], LEAD] });
  const tdSpin = set(guardW, { yaw: 250, hip: [1, 58], feet: [[2, 32, 6], [6, 28, -6]], toes: [-40, -40] });
  const tdChamber = set(guardW, { yaw: 370, torso: 100, hip: [2, 60], feet: [[2, 50, 14], [4, 26, -6]], toes: [-30, -40] });
  const tdKick = set(guardW, { yaw: 420, torso: 112, hip: [2, 60], feet: [[44, 62, 2], [6, 28, -6]], toes: [0, -40] });
  const tdOut = set(guardW, { yaw: 370, hip: [1, 52], feet: [[4, 38, 12], [10, 10, -6]], toes: [-30, -30] });
  add('tornado', spin({
    name: 'Tornado kick', view: HIGH_VIEW, dur: 1.9, props: [FLOOR],
    keys: [{ t: 0, p: guardW, f: 'Stance' }, { t: 0.3, p: tdTurn, f: 'Step and turn your back' }, { t: 0.52, p: tdSpin, f: 'Jump and spin' }, { t: 0.7, p: tdChamber, hi: ['lN'] }, { t: 0.86, p: tdKick, hi: ['lN'], f: 'Roundhouse at the end of the spin' }, { t: 1.05, p: tdOut }, { t: 1.3, p: set(guardW, { yaw: 308, hip: [0, 46] }), f: 'Land in stance' }],
    cues: [label(0.3, 0.62, 'SPIN'), label(0.68, 1.05, 'KICK'), { from: 0.72, to: 1.05, trail: ['toeN', 0.7, 0.86] }],
    steps: ['Fighting stance, hands up.', 'Step across and turn your back to the target, then jump into the spin.', 'Keep turning in the air and finish the spin with a roundhouse from the rear leg.', 'Land on both feet in stance, hands up.'],
    avoid: 'Opening the kick before the spin is finished.',
  }, 308));

  const f5Turn = set(guardW, { yaw: 128, hip: [0, 45], feet: [[-4, B.ankle, -8], LEAD] });
  const f5Jump = set(guardW, { yaw: 260, hip: [2, 58], feet: [[-2, 30, 6], [12, 50, -6]], toes: [-40, -30] });
  const f5Kick = set(guardW, { yaw: 420, torso: 112, hip: [2, 60], feet: [[44, 64, 2], [6, 34, -6]], toes: [0, -40] });
  const f5Land = set(guardW, { yaw: 488, hip: [1, 46], feet: [[10, B.ankle, 6], [-12, 18, -6]], toes: [-16, -40] });
  add('540-kick', spin({
    name: '540 kick', view: HIGH_VIEW, dur: 1.9, props: [FLOOR],
    keys: [{ t: 0, p: guardW, f: 'Stance' }, { t: 0.3, p: f5Turn, f: 'Turn your back and step' }, { t: 0.5, p: f5Jump, hi: ['lF'], f: 'Jump, front knee up' }, { t: 0.72, p: f5Kick, hi: ['lN'], f: 'Kick with the takeoff leg' }, { t: 0.95, p: f5Land, hi: ['lN'], f: 'Land on the kicking leg' }, { t: 1.35, p: set(guardW, { yaw: 668 }) }],
    cues: [{ from: 0.62, to: 1.0, trail: ['toeN', 0.5, 0.72] }],
    steps: ['Fighting stance, hands up.', 'Turn your back to the target and step, then jump off that foot, driving the other knee up.', 'Keep spinning and kick with the leg you jumped off, a roundhouse at head height.', 'Land on the kicking leg, then turn to face front in stance.'],
    avoid: 'Trying it before your knees and spin are ready. Learn the tornado kick first.',
  }, 668));

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
    // The foot travels on an arc, so the leg stays straight through the whole swing.
    mod: (p, t) => { const d = 15 - 47 * Math.cos((t / 1.3) * Math.PI * 2); p.feet = [raise(d), p.feet[1]]; p.toes = [d - 15, FLAT]; },
    steps: ['Hold a wall or chair for balance.', 'Swing one straight leg forward and back.', 'Let it get a little higher each time, no forcing.', '10 swings, then switch legs.'],
  });

  // ---------- Stretching: holds for hamstrings, hip flexors, glutes and inner thighs, plus active raises for kick height ----------
  const SUP_S = [-14, 6.5], SUP_P = [SUP_S[0] + B.torso, 6.5];
  const supine = { hip: SUP_P, torso: 180 };
  const flatLeg = [SUP_P[0] + LEG - 0.8, 3.6];
  const hsPose = (deg) => {
    const foot = at(SUP_P, deg, LEG - 0.8);
    const reach = Math.atan2(foot[1] - SUP_S[1], foot[0] - SUP_S[0]) / DEG;
    return set(supine, { feet: [foot, flatLeg], toes: [deg + 90, 80], hands: two(at(SUP_S, reach, 22)) });
  };
  add('hamstring-stretch', {
    name: 'Lying hamstring stretch', view: [-30, -8, 70, 62], dur: 8, props: [FLOOR], strap: true,
    keys: [{ t: 0, p: hsPose(45), f: 'Towel around one foot' }, { t: 1.2, p: hsPose(72), f: 'Raise to a strong stretch' }, { t: 3.4, p: hsPose(72) }, { t: 4.4, p: hsPose(84), f: 'Push, relax, go deeper' }, { t: 6.4, p: hsPose(84) }, { t: 7.4, p: hsPose(45) }],
    tempo: [[0, 1.2, 'Raise'], [1.2, 3.4, 'Hold'], [3.4, 4.4, 'Deeper'], [4.4, 6.4, 'Hold'], [6.4, 7.4, 'Down']],
    cues: [{ from: 1.3, to: 3.4, text: 'PUSH · 5 S', at: [68, 22], anchor: 'end' }, { from: 3.5, to: 6.4, text: 'RELAX · DEEPER', at: [68, 22], anchor: 'end' }],
    steps: ['Lie on your back and loop a towel or belt around one foot.', 'Raise that leg straight until you feel a strong stretch behind the thigh, about 7 out of 10.', 'Halfway through, push the leg into the towel for 5 seconds, then relax and pull it a little closer.', 'Keep the other leg long on the floor. Switch legs when the timer says.'],
    avoid: 'Bouncing, or bending the knee to cheat the height.',
  });
  const HF_FRONT = [17, B.ankle], HF_BACK = [-38, 4.2];
  const hfPose = (hip, torso) => ({ hip, torso, feet: [HF_FRONT, HF_BACK], toes: [FLAT, 182], hands: two({ w: [15, -21] }) });
  add('hip-flexor-stretch', {
    name: 'Kneeling hip flexor stretch', view: [-58, -8, 40, 92], dur: 6.2, props: [FLOOR],
    keys: [{ t: 0, p: hfPose([-4, 27], 90), f: 'One knee down, tall' }, { t: 1.4, p: hfPose([3, 25.5], 93), f: 'Hips forward, squeeze' }, { t: 4.8, p: hfPose([3, 25.5], 93) }, { t: 5.8, p: hfPose([-4, 27], 90) }],
    tempo: [[0, 1.4, 'Shift forward'], [1.4, 4.8, 'Hold'], [4.8, 5.8, 'Back']],
    cues: [{ from: 0.1, to: 1.4, arrow: [8, 0], at: 'hip', off: [-14, 2], text: 'HIPS FORWARD', lx: [-38, 5] }, { from: 1.5, to: 4.8, text: 'SQUEEZE THE BACK GLUTE', at: [-10, 84], anchor: 'middle' }],
    steps: ['Kneel on one knee with a folded towel under it, the other foot flat in front.', 'Tuck your hips under and squeeze the glute of the back leg.', 'Shift your hips forward until you feel it at the front of the back hip.', 'Stay tall and breathe. Switch sides when the timer says.'],
    avoid: 'Arching your lower back to fake the stretch.',
  });
  // Near hand holds the knee, far hand the middle of the shin, wherever the leg ends up.
  const gsPose = (ankle) => {
    const p = set(supine, { feet: [ankle, flatLeg], toes: [10, 80], knees: [[0.4, 1, 0], null] });
    const leg = FG.solve(p).legs[0], knee = leg.mid, shin = [(leg.mid[0] + leg.end[0]) / 2, (leg.mid[1] + leg.end[1]) / 2, (leg.mid[2] + leg.end[2]) / 2];
    return Object.assign(p, { hands: [[knee[0] + 1, knee[1] + 3, knee[2]], [(knee[0] + shin[0]) / 2, (knee[1] + shin[1]) / 2 + 3, (knee[2] + shin[2]) / 2]] });
  };
  add('glute-stretch', {
    name: 'Lying glute stretch', view: [-30, -8, 70, 62], dur: 6.4, props: [FLOOR],
    keys: [{ t: 0, p: gsPose([25, 21, 4]), f: 'Hug one knee' }, { t: 1.4, p: gsPose([20, 27, -3]), f: 'Pull to the opposite shoulder' }, { t: 5, p: gsPose([20, 27, -3]) }, { t: 6, p: gsPose([25, 21, 4]) }],
    tempo: [[0, 1.4, 'Pull in'], [1.4, 5, 'Hold'], [5, 6, 'Ease off']],
    cues: [{ from: 1.5, to: 5, text: 'KNEE TO OPPOSITE SHOULDER', at: [20, 56], anchor: 'middle' }],
    steps: ['Lie on your back with both legs long.', 'Hug one knee and pull it toward the opposite shoulder.', 'Hold where you feel it in the side of your hip and glute. Breathe slowly.', 'Switch sides when the timer says.'],
    avoid: 'Lifting your head and shoulders off the floor.',
  });
  const SL_FEET = [[-28, B.ankle, 0], [28, B.ankle, 0]];
  const slPose = (hip) => ({ front: true, hip, torso: 90, feet: SL_FEET, toes: two(-10), knees: [[0.3, 0, 1], [0.3, 0, 1]], hands: [[hip[0] - 13, hip[1] - 4, 6], [hip[0] - 7, hip[1] + 1, 6]] });
  add('side-lunge-stretch', {
    name: 'Side lunge stretch', view: [-50, -8, 50, 96], dur: 6.2, props: [FLOOR],
    keys: [{ t: 0, p: slPose([0, 41]), f: 'Feet wide' }, { t: 1.4, p: slPose([-16, 29]), f: 'Sit toward one side' }, { t: 4.6, p: slPose([-16, 29]) }, { t: 5.8, p: slPose([0, 41]) }],
    tempo: [[0, 1.4, 'Shift'], [1.4, 4.6, 'Hold'], [4.6, 5.8, 'Back']],
    cues: [{ from: 1.5, to: 4.6, text: 'STRETCH INSIDE THE STRAIGHT LEG', at: [12, 86], anchor: 'middle' }],
    steps: ['Stand with your feet wide, toes turned out a little.', 'Bend one knee and sit your hips toward it, the other leg straight.', 'Hold where you feel it along the inside of the straight leg.', 'Keep your chest up. Switch sides when the timer says.'],
    avoid: 'Letting the bent knee cave in past your toes.',
  });
  const bfPose = (up) => ({ front: true, hip: [0, 9], torso: 90, feet: [[-4, 5.5, 13], [4, 5.5, 13]], toes: two(-30), knees: two([0, up, 1]), hands: [[-5, 9.5, 15], [5, 9.5, 15]] });
  add('butterfly', {
    name: 'Butterfly stretch', view: [-46, -8, 46, 62], dur: 6.4, props: [FLOOR],
    keys: [{ t: 0, p: bfPose(0.9), f: 'Soles together' }, { t: 1.4, p: bfPose(-0.35), f: 'Knees sink toward the floor' }, { t: 5, p: bfPose(-0.35) }, { t: 6, p: bfPose(0.9) }],
    tempo: [[0, 1.4, 'Let go'], [1.4, 5, 'Hold'], [5, 6, 'Ease off']],
    cues: [{ from: 1.5, to: 3.2, text: 'PRESS KNEES UP · 5 S', at: [0, 55], anchor: 'middle' }, { from: 3.3, to: 5, text: 'RELAX · DEEPER', at: [0, 55], anchor: 'middle' }],
    steps: ['Sit with the soles of your feet together, heels toward you.', 'Hold your feet and let your knees fall out to the sides.', 'Halfway through, press your knees up against your elbows for 5 seconds, relax, then let them sink lower.', 'Sit tall. Lean forward from the hips to go deeper.'],
    avoid: 'Forcing your knees down with your hands.',
  });
  // Wide straddle seen from the front: straight legs out to the sides, chest folding forward from the hips.
  // Upright: hands rest on the thighs. Folded: hands walk out to the floor in front.
  const stPose = (lean) => { const f = lean / 42; return { front: true, hip: [0, 9], torso: 90, pitch: lean, feet: [[-44, 3.6, 25], [44, 3.6, 25]], toes: two(80),
    hands: [[-(12.8 - 1.8 * f), 8 - 5 * f, 5 + 25 * f], [12.8 - 1.8 * f, 8 - 5 * f, 5 + 25 * f]] }; };
  add('straddle-stretch', {
    name: 'Seated straddle stretch', view: [-52, -8, 52, 62], dur: 6.4, props: [FLOOR],
    keys: [{ t: 0, p: stPose(0), f: 'Legs wide, sit tall' }, { t: 1.4, p: stPose(42), f: 'Fold forward from the hips' }, { t: 5, p: stPose(42) }, { t: 6, p: stPose(0) }],
    tempo: [[0, 1.4, 'Fold'], [1.4, 5, 'Hold'], [5, 6, 'Sit up']],
    cues: [{ from: 1.5, to: 5, text: 'CHEST FORWARD, BACK LONG', at: [0, 55], anchor: 'middle' }],
    steps: ['Sit with your legs straight and as wide as is comfortable, toes pointing up.', 'Sit tall, hands on the floor in front of you.', 'Walk your hands forward and fold from the hips, chest toward the floor, back long.', 'Hold where you feel the inside and back of both thighs. Sit on a cushion if your back rounds.'],
    avoid: 'Rounding your back to reach further, or letting your knees roll in.',
  });
  const raise = (deg) => ({ w: [Math.sin(deg * DEG) * (LEG - 0.6), -Math.cos(deg * DEG) * (LEG - 0.6), 0] });
  const flPose = (deg) => ({ hip: [0, STAND], torso: 90 + deg / 18, feet: [raise(deg), [2, B.ankle]], toes: [FLAT + deg, FLAT], hands: [{ w: [3, -25] }, { w: [26, -6] }] });
  add('front-leg-raise', {
    name: 'Front leg raise and hold', view: [-40, -8, 66, 106], dur: 6, props: [FLOOR],
    keys: [{ t: 0, p: flPose(0), f: 'Stand tall' }, { t: 1.6, p: flPose(78), hi: ['lN'], f: 'Raise slowly, hold 2 s' }, { t: 3.6, p: flPose(78), hi: ['lN'] }, { t: 5.4, p: flPose(0) }],
    tempo: [[0, 1.6, 'Raise'], [1.6, 3.6, 'Hold 2 s'], [3.6, 5.4, 'Lower slowly']],
    cues: [{ from: 1.7, to: 3.6, text: 'HOLD · NO SWINGING', at: [20, 100], anchor: 'middle' }],
    steps: ['Stand tall next to a wall or chair, one hand on it.', 'Raise one straight leg in front of you as high as you can control. No swinging.', 'Hold it at the top for 2 seconds, then lower it slowly.', 'This builds the strength to kick high, not just the stretch. About 5 slow reps per side.'],
    avoid: 'Leaning back or bending the knee to get the leg higher.',
  });
  const sideRaise = (deg) => ({ w: [0, -Math.cos(deg * DEG) * (LEG - 0.6), Math.sin(deg * DEG) * (LEG - 0.6)] });
  const srPose = (deg) => ({ front: true, hip: [0, STAND], torso: 90 - deg / 9, feet: [sideRaise(deg), [5, B.ankle, 0]], toes: two(-10), hands: [{ w: [3, -24, 6] }, { w: [0, -6, 27] }] });
  add('side-leg-raise', {
    name: 'Side leg raise and hold', view: [-56, -8, 50, 106], dur: 6, props: [FLOOR],
    keys: [{ t: 0, p: srPose(0), f: 'Stand tall' }, { t: 1.6, p: srPose(55), hi: ['lN'], f: 'Raise to the side, hold 2 s' }, { t: 3.6, p: srPose(55), hi: ['lN'] }, { t: 5.4, p: srPose(0) }],
    tempo: [[0, 1.6, 'Raise'], [1.6, 3.6, 'Hold 2 s'], [3.6, 5.4, 'Lower slowly']],
    cues: [{ from: 1.7, to: 3.6, text: 'TOES FORWARD', at: [0, 100], anchor: 'middle' }],
    steps: ['Stand tall with one hand on a wall or chair.', 'Raise one straight leg out to the side, toes pointing forward.', 'Hold 2 seconds at the top, then lower slowly.', 'Small and controlled beats high and sloppy. About 5 slow reps per side.'],
    avoid: 'Tipping your whole body sideways to cheat the height.',
  });
  add('side-leg-swings', {
    name: 'Side leg swings', view: [-56, -8, 50, 106], dur: 1.4, props: [FLOOR],
    keys: [{ t: 0, p: srPose(-16), f: 'Swing across your body' }, { t: 0.7, p: srPose(58), hi: ['lN'], f: 'Swing out and up' }],
    mod: (p, t) => { const s = srPose(21 - 37 * Math.cos((t / 1.4) * Math.PI * 2)); p.feet = s.feet; p.torso = s.torso; },
    steps: ['Stand tall and hold a wall or chair for balance.', 'Swing one straight leg across in front of you, then out to the side and up.', 'Let it go a little higher each swing, relaxed, no forcing.', '10–15 swings, then switch legs.'],
    avoid: 'Twisting your hips open to fake the height. Toes stay pointing forward.',
  });

  const MOVES = {
    all: M,
    get: (id) => M[id] || null,
    ids: () => Object.keys(M),
  };
  root.MOVES = MOVES;
  if (typeof module !== 'undefined' && module.exports) module.exports = MOVES;
})(typeof globalThis !== 'undefined' ? globalThis : this);
