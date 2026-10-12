/* Black Belt Cut — exercise figures. A stick figure with 3D joints and two-bone IK, drawn flat as SVG, that plays the moves in moves.js. */
(function (root) {
  'use strict';

  const RAD = Math.PI / 180;
  const BODY = { head: 6.3, neck: 9.8, torso: 29, sh: 8.5, hip: 5, upper: 16.5, fore: 15, fist: 4.5, palm: 6.5, thigh: 24, shin: 23.5, foot: 11, ankle: 3.5 };
  const STROKE = { torso: 10.5, limb: 7.2, end: 5.6, halo: 3.6 };
  const UP = [0, 1, 0];

  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = (a) => Math.hypot(a[0], a[1], a[2]);
  const unit = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const mix = (a, b, s) => a + (b - a) * s;
  const mix3 = (a, b, s) => [mix(a[0], b[0], s), mix(a[1], b[1], s), mix(a[2], b[2], s)];

  function rotY(v, deg) {
    const c = Math.cos(deg * RAD), s = Math.sin(deg * RAD);
    return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
  }
  function rotAbout(v, k, deg) {
    const c = Math.cos(deg * RAD), s = Math.sin(deg * RAD);
    return add(add(mul(v, c), mul(cross(k, v), s)), mul(k, dot(k, v) * (1 - c)));
  }

  // Two bones from a toward t; the middle joint bends toward the pole. Out-of-reach targets get a straight limb pointing at them.
  function ik(a, t, l1, l2, pole) {
    const d = sub(t, a), dist0 = len(d);
    const dir = dist0 > 1e-6 ? mul(d, 1 / dist0) : [0, -1, 0];
    const dist = Math.max(Math.abs(l1 - l2) + 1e-3, Math.min(l1 + l2 - 1e-3, dist0));
    const along = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
    const h = Math.sqrt(Math.max(0, l1 * l1 - along * along));
    let p = sub(pole, mul(dir, dot(pole, dir)));
    if (len(p) < 1e-6) p = Math.abs(dir[1]) < 0.9 ? cross(dir, UP) : cross(dir, [1, 0, 0]);
    p = unit(p);
    return { mid: add(add(a, mul(dir, along)), mul(p, h)), end: add(a, mul(dir, dist)), reach: dist0 - dist };
  }

  // Body frame. Side mode: the torso leans in the x-y plane and the chest faces along it. Front mode: the chest faces the viewer.
  function frame(p) {
    const a = (p.torso == null ? 90 : p.torso) * RAD;
    let fwd, u, n;
    if (p.front) { fwd = [0, 0, 1]; u = [Math.cos(a), Math.sin(a), 0]; n = [0, 0, 1]; }
    else { fwd = [1, 0, 0]; u = [Math.cos(a), Math.sin(a), 0]; n = [Math.sin(a), -Math.cos(a), 0]; }
    if (p.yaw) { fwd = rotY(fwd, p.yaw); u = rotY(u, p.yaw); n = rotY(n, p.yaw); }
    return { fwd, u, n, r: cross(n, u), side: cross(fwd, UP) };
  }
  function inPlane(F, deg, splay) {
    let d = add(mul(F.fwd, Math.cos(deg * RAD)), mul(UP, Math.sin(deg * RAD)));
    if (splay) d = unit(add(d, mul(F.side, splay)));
    return d;
  }
  function resolve(spec, base, F, side) {
    if (spec == null) return null;
    if (spec.w) return add(base, add(add(mul(F.fwd, spec.w[0]), mul(UP, spec.w[1])), mul(F.side, (spec.w[2] || 0) * side)));
    if (spec.b) return add(base, add(add(mul(F.n, spec.b[0]), mul(F.u, spec.b[1])), mul(F.r, (spec.b[2] || 0) * side)));
    return [spec[0], spec[1], spec.length > 2 ? spec[2] : base[2]];
  }
  function target(spec, base, F, side) {
    if (spec && spec.mix) {
      const a = resolve(spec.mix[0], base, F, side), b = resolve(spec.mix[1], base, F, side);
      return mix3(a, b, spec.mix[2]);
    }
    return resolve(spec, base, F, side);
  }

  const ARM_POLE = [-1, -0.3, 0.3], LEG_POLE = [1, 0, 0.12];
  // Solve every joint for one pose. Index 0 is the near (+z) side, index 1 the far side.
  function solve(p) {
    const B = BODY, F = frame(p);
    const hip = [p.hip[0], p.hip[1], p.hip[2] || 0];
    const ns = p.twist ? rotAbout(F.n, F.u, p.twist) : F.n;
    const rs = cross(ns, F.u);
    const neck = add(hip, mul(F.u, B.torso));
    const headDir = p.head ? rotAbout(F.u, rs, p.head) : F.u;
    const head = add(neck, mul(headDir, B.neck));
    const arms = [1, -1].map((s, i) => {
      const sh = add(neck, mul(rs, B.sh * s));
      const tg = target(p.hands && p.hands[i], sh, F, s) || add(sh, [0, -B.upper - B.fore + 1, 0]);
      const pl = (p.elbows && p.elbows[i]) || ARM_POLE;
      const pole = add(add(mul(ns, pl[0]), mul(F.u, pl[1])), mul(rs, pl[2] * s));
      const j = ik(sh, tg, B.upper, B.fore, pole);
      const palm = p.palms && p.palms[i] != null ? p.palms[i] : null;
      const hd = palm == null ? unit(sub(j.end, j.mid)) : inPlane(F, palm);
      return { root: sh, mid: j.mid, end: j.end, tip: add(j.end, mul(hd, palm == null ? B.fist : B.palm)), reach: j.reach };
    });
    const legs = [1, -1].map((s, i) => {
      const hp = add(hip, mul(F.r, B.hip * s));
      const tg = target(p.feet && p.feet[i], hp, F, s) || add(hp, [0, -B.thigh - B.shin + 1, 0]);
      const pl = (p.knees && p.knees[i]) || LEG_POLE;
      const pole = add(add(mul(F.n, pl[0]), mul(F.u, pl[1])), mul(F.r, pl[2] * s));
      const j = ik(hp, tg, B.thigh, B.shin, pole);
      const toe = p.toes && p.toes[i] != null ? p.toes[i] : -18.6;
      return { root: hp, mid: j.mid, end: j.end, tip: add(j.end, mul(inPlane(F, toe, p.front ? 0.55 * s : 0), B.foot)), reach: j.reach };
    });
    return { hip, neck, head, arms, legs, F, rs, ns };
  }

  // ---------- Timeline ----------
  const ease = (s) => (1 - Math.cos(Math.PI * s)) / 2;
  const NUM = ['torso', 'yaw', 'twist', 'head'];
  const PAIRS = ['hands', 'feet'];
  const ANGLES = ['toes', 'palms'];
  const POLES = ['elbows', 'knees'];
  function blend(a, b, s) {
    const p = { hip: [mix(a.hip[0], b.hip[0], s), mix(a.hip[1], b.hip[1], s), mix(a.hip[2] || 0, b.hip[2] || 0, s)], front: a.front };
    NUM.forEach((k) => { if (a[k] != null || b[k] != null) p[k] = mix(a[k] == null ? (k === 'torso' ? 90 : 0) : a[k], b[k] == null ? (k === 'torso' ? 90 : 0) : b[k], s); });
    PAIRS.forEach((k) => {
      if (!a[k] && !b[k]) return;
      p[k] = [0, 1].map((i) => {
        const x = a[k] && a[k][i], y = b[k] && b[k][i];
        if (x == null || y == null) return x == null ? y : x;
        return { mix: [x, y, s] };
      });
    });
    ANGLES.forEach((k) => {
      if (!a[k] && !b[k]) return;
      p[k] = [0, 1].map((i) => {
        const x = a[k] && a[k][i], y = b[k] && b[k][i];
        if (x == null || y == null) return x == null ? y : x;
        return mix(x, y, s);
      });
    });
    POLES.forEach((k) => {
      if (!a[k] && !b[k]) return;
      const def = k === 'elbows' ? ARM_POLE : LEG_POLE;
      p[k] = [0, 1].map((i) => {
        const x = (a[k] && a[k][i]) || def, y = (b[k] && b[k][i]) || def;
        return [mix(x[0], y[0], s), mix(x[1], y[1], s), mix(x[2], y[2], s)];
      });
    });
    return p;
  }
  // Pose at time t (seconds) in a looping move. Keys are { t, p } and the last key eases back into the first.
  function poseAt(move, t) {
    const keys = move.keys, dur = move.dur;
    t = ((t % dur) + dur) % dur;
    let i = keys.length - 1;
    for (let k = 0; k < keys.length; k++) if (keys[k].t <= t) i = k;
    const a = keys[i], b = keys[(i + 1) % keys.length];
    const tb = i + 1 < keys.length ? b.t : dur + keys[0].t;
    const span = tb - a.t;
    const s = span > 1e-6 ? (t - a.t) / span : 0;
    const p = blend(a.p, b.p, a.lin ? s : ease(s));
    p.key = i;
    p.hi = a.hi || null;
    if (move.mod) move.mod(p, t);
    return p;
  }

  // ---------- Drawing ----------
  const r1 = (v) => Math.round(v * 10) / 10;
  const P2 = (q) => r1(q[0]) + ' ' + r1(-q[1]);
  const pathOf = (pts) => pts.map((q, i) => (i ? 'L' : 'M') + P2(q)).join('');
  function viewBox(move) { const v = move.view; return v[0] + ' ' + (-v[3]) + ' ' + (v[2] - v[0]) + ' ' + (v[3] - v[1]); }

  function joint(J, name) {
    const m = /^(sh|el|wr|tip|hp|kn|an|toe)([NF])$/.exec(name);
    if (m) {
      const limb = (m[1] === 'sh' || m[1] === 'el' || m[1] === 'wr' || m[1] === 'tip' ? J.arms : J.legs)[m[2] === 'N' ? 0 : 1];
      return { sh: limb.root, hp: limb.root, el: limb.mid, kn: limb.mid, wr: limb.end, an: limb.end, tip: limb.tip, toe: limb.tip }[m[1]];
    }
    if (name === 'chest') return add(add(J.neck, mul(J.F.u, -9)), mul(J.ns, 5));
    if (name === 'back') return add(add(J.neck, mul(J.F.u, -12)), mul(J.ns, -6));
    return J[name] || J.hip;
  }

  function limbParts(J, p) {
    const hi = p.hi || [];
    const near = (k) => k.endsWith('N');
    const parts = [];
    const limb = (name, L) => ({ name, d: pathOf([L.root, L.mid, L.end]) + 'L' + P2(L.tip), w: STROKE.limb, far: !near(name) && !hi.includes(name) && !p.front, hi: hi.includes(name) });
    parts.push(limb('lF', J.legs[1]), limb('aF', J.arms[1]));
    parts.push({ name: 'torso', d: pathOf([J.hip, J.neck]), w: STROKE.torso });
    parts.push({ name: 'head', head: J.head });
    parts.push(limb('lN', J.legs[0]), limb('aN', J.arms[0]));
    return parts;
  }
  function figureMarkup(J, p) {
    return limbParts(J, p).map((q) => {
      if (q.head) {
        return '<circle class="fg-halo-f" data-p="head-h" cx="' + r1(q.head[0]) + '" cy="' + r1(-q.head[1]) + '" r="' + (BODY.head + STROKE.halo / 2) + '"/>' +
          '<circle class="fg-head" data-p="head" cx="' + r1(q.head[0]) + '" cy="' + r1(-q.head[1]) + '" r="' + BODY.head + '"/>';
      }
      return '<path class="fg-halo" data-p="' + q.name + '-h" d="' + q.d + '" stroke-width="' + (q.w + STROKE.halo) + '"/>' +
        '<path class="' + (q.far ? 'fg-far' : 'fg-ink') + '" data-p="' + q.name + '" d="' + q.d + '" stroke-width="' + q.w + '"/>';
    }).join('');
  }

  function propMarkup(move) {
    return (move.props || []).map((pr) => {
      if (pr.floor) return '<line class="fg-floor" x1="' + move.view[0] + '" x2="' + move.view[2] + '" y1="0" y2="0"/>';
      if (pr.wall) {
        let hatch = '';
        for (let y = 4; y < move.view[3]; y += 8) hatch += 'M' + r1(pr.wall) + ' ' + r1(-y) + 'l-5 5';
        return '<path class="fg-prop" d="M' + r1(pr.wall) + ' 0V' + r1(-move.view[3]) + '"/><path class="fg-hatch" d="' + hatch + '"/>';
      }
      if (pr.path) return '<path class="' + (pr.cls || 'fg-prop') + '" d="' + pr.path + '"/>';
      return '';
    }).join('');
  }
  function backpack(J) {
    const c = add(add(J.hip, mul(J.F.u, 17)), mul(J.ns, -10));
    const u = J.F.u, n = J.ns;
    const pts = [[-5, -9], [5, -9], [5, 9], [-5, 9]].map((q) => add(add(c, mul(n, q[0])), mul(u, q[1])));
    return '<path class="fg-pack" d="' + pathOf(pts) + 'Z"/>';
  }

  function arrowMarkup(a, b, label, lx) {
    const d = sub(b, a), L = len(d) || 1, ux = d[0] / L, uy = d[1] / L;
    const h1 = [b[0] - ux * 4.5 - uy * 3, b[1] - uy * 4.5 + ux * 3, 0], h2 = [b[0] - ux * 4.5 + uy * 3, b[1] - uy * 4.5 - ux * 3, 0];
    return '<path class="fg-arrow" d="' + pathOf([a, b]) + 'M' + P2(h1) + 'L' + P2(b) + 'L' + P2(h2) + '"/>' + (label ? textMarkup(add(b, lx || [0, 0, 0]), label) : '');
  }
  function textMarkup(at, text, anchor) {
    return '<text class="fg-text" x="' + r1(at[0]) + '" y="' + r1(-at[1]) + '"' + (anchor ? ' text-anchor="' + anchor + '"' : '') + '>' + text + '</text>';
  }
  function cueWeight(c, t, dur) {
    const tt = ((t % dur) + dur) % dur;
    if (tt < c.from || tt > c.to) return 0;
    const edge = 0.18;
    return Math.max(0, Math.min(1, (tt - c.from) / edge, (c.to - tt) / edge));
  }
  function cuesMarkup(move, J, t, p) {
    return (move.cues || []).map((c) => {
      const w = c.always ? 1 : cueWeight(c, t, move.dur);
      if (!w) return '';
      let body = '';
      if (c.arrow) {
        const base = add(joint(J, c.at), [c.off ? c.off[0] : 0, c.off ? c.off[1] : 0, 0]);
        body = arrowMarkup(base, add(base, [c.arrow[0], c.arrow[1], 0]), c.text, c.lx ? [c.lx[0], c.lx[1], 0] : null);
      } else if (c.line) {
        const a = joint(J, c.line[0]), b = joint(J, c.line[1]);
        const d = unit(sub(b, a)), ext = c.ext || 6;
        const hint = c.side || [0, 1];
        let nx = -d[1], ny = d[0];
        if (nx * hint[0] + ny * hint[1] < 0) { nx = -nx; ny = -ny; }
        const off = c.offset == null ? 9 : c.offset, shift = [nx * off, ny * off, 0];
        const mid = add(mul(add(a, b), 0.5), shift), lift = c.lift || 4.5;
        let ang = Math.atan2(-d[1], d[0]) / RAD;
        if (ang > 90) ang -= 180; else if (ang < -90) ang += 180;
        const tx = r1(mid[0] + nx * lift), ty = r1(-(mid[1] + ny * lift));
        body = '<path class="fg-guide" d="' + pathOf([add(sub(a, mul(d, ext)), shift), add(add(b, mul(d, ext)), shift)]) + '"/>' +
          (c.text ? '<text class="fg-text" text-anchor="middle" dominant-baseline="middle" x="' + tx + '" y="' + ty + '" transform="rotate(' + r1(ang) + ' ' + tx + ' ' + ty + ')">' + c.text + '</text>' : '');
      } else if (c.trail) {
        const pts = [];
        for (let k = 0; k <= 16; k++) {
          const tt = c.trail[1] + (c.trail[2] - c.trail[1]) * (k / 16);
          pts.push(joint(solve(poseAt(move, tt)), c.trail[0]));
        }
        body = '<path class="fg-trail" d="' + pathOf(pts) + '"/>';
      } else if (c.text) {
        const at = Array.isArray(c.at) ? [c.at[0], c.at[1], 0] : add(joint(J, c.at), [c.off ? c.off[0] : 0, c.off ? c.off[1] : 0, 0]);
        body = textMarkup(at, c.text, c.anchor);
      }
      return '<g opacity="' + r1(w) + '">' + body + '</g>';
    }).join('') + (move.pack ? backpack(J) : '');
  }
  function crossBadge(move) {
    const x = move.view[2] - 8, y = -(move.view[3] - 8);
    return '<g class="fg-x"><circle cx="' + x + '" cy="' + y + '" r="5.5"/><path d="M' + (x - 2.4) + ' ' + (y - 2.4) + 'l4.8 4.8M' + (x + 2.4) + ' ' + (y - 2.4) + 'l-4.8 4.8"/></g>';
  }

  // A complete static SVG of the move at time t.
  function svg(move, t, opts) {
    opts = opts || {};
    const p = poseAt(move, t || 0), J = solve(p);
    return '<svg class="fg' + (opts.cls ? ' ' + opts.cls : '') + '" viewBox="' + viewBox(move) + '" role="img" aria-label="' + (opts.label || move.name) + '">' +
      '<g class="fg-props">' + propMarkup(move) + '</g><g class="fg-cues">' + (opts.cues === false ? (move.pack ? backpack(J) : '') : cuesMarkup(move, J, t || 0, p)) + '</g>' +
      '<g class="fg-fig">' + figureMarkup(J, p) + '</g>' + (opts.cross ? crossBadge(move) : '') + '</svg>';
  }

  // Redraws an existing figure in place (same parts, new geometry).
  function update(el, move, t) {
    const p = poseAt(move, t), J = solve(p);
    if (!el._fg) {
      const map = {};
      el.querySelectorAll('[data-p]').forEach((n) => { map[n.getAttribute('data-p')] = n; });
      el._fg = { map, cues: el.querySelector('.fg-cues') };
    }
    const map = el._fg.map;
    limbParts(J, p).forEach((q) => {
      if (q.head) {
        ['head', 'head-h'].forEach((k) => { if (map[k]) { map[k].setAttribute('cx', r1(q.head[0])); map[k].setAttribute('cy', r1(-q.head[1])); } });
        return;
      }
      if (map[q.name]) { map[q.name].setAttribute('d', q.d); map[q.name].setAttribute('class', q.far ? 'fg-far' : 'fg-ink'); }
      if (map[q.name + '-h']) map[q.name + '-h'].setAttribute('d', q.d);
    });
    if (el._fg.cues) el._fg.cues.innerHTML = cuesMarkup(move, J, t, p);
    return p;
  }

  // ---------- Live stages: every .fg-stage[data-fg] on the page plays its move ----------
  const live = { raf: 0 };
  function reducedMotion() { return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function tick(now) {
    live.raf = 0;
    const doc = root.document;
    if (!doc || !root.MOVES) return;
    const stages = doc.getElementsByClassName('fg-stage');
    if (!stages.length || doc.hidden) return;
    const vh = root.innerHeight || 800;
    let moving = 0;
    for (let i = 0; i < stages.length; i++) {
      const st = stages[i], id = st.getAttribute('data-fg'), move = id && root.MOVES.get(id);
      if (!move) continue;
      moving++;
      const box = st.getBoundingClientRect();
      if (box.bottom < 0 || box.top > vh) continue;
      if (!st._t0) st._t0 = now;
      const t = ((now - st._t0) / 1000) * (Number(st.getAttribute('data-speed')) || 1);
      const svgEl = st.querySelector('svg.fg');
      if (svgEl) update(svgEl, move, t);
      const bar = st.querySelector('.fg-play');
      if (bar) bar.style.left = (((t % move.dur) + move.dur) % move.dur / move.dur * 100).toFixed(2) + '%';
    }
    if (moving) live.raf = root.requestAnimationFrame(tick);
  }
  function play() {
    if (live.raf || reducedMotion() || typeof root.requestAnimationFrame !== 'function') return;
    live.raf = root.requestAnimationFrame(tick);
  }

  const FG = { BODY, STROKE, solve, poseAt, svg, update, play, reducedMotion, joint, ik, frame };
  root.FG = FG;
  if (typeof module !== 'undefined' && module.exports) module.exports = FG;
})(typeof globalThis !== 'undefined' ? globalThis : this);
