// ===== PixelFX : 절차적 픽셀 VFX 엔진 (의존성 없음, 이미지 에셋 없음) =====
// 모든 입자는 PX(기본 4px) 격자에 스냅되어 도트 아트처럼 그려진다.
// 색은 팔레트(밝음→어두움)를 수명에 따라 계단식으로 밟고, 사라질 때는 알파 대신 디더로 녹아든다.
//
// 사용법:
//   const fx = PFX.createSystem({ px: 4 });
//   fx.spawn('fire/burst', x, y, { palette: 'ice', scale: 1.5 });
//   매 프레임: fx.update(dt); fx.draw(ctx, ox, oy, 'world' | 'top');
'use strict';

(function (global) {
  const TAU = Math.PI * 2;

  /* ---------- 팔레트 (밝음 → 어두움) ---------- */
  const PAL = {
    fire:   ['#fff7c2', '#ffe066', '#ffb238', '#ff7b1f', '#d9401a', '#7a2316'],
    ice:    ['#ffffff', '#d6f6ff', '#8fe3ff', '#4fb3e8', '#2a6fb8', '#1b3f7a'],
    dark:   ['#f1c9ff', '#c77dff', '#9b3cf0', '#6a1fb0', '#3d1270', '#1c0a33'],
    poison: ['#f2ffb8', '#c6f36b', '#7ed957', '#3fa34d', '#1f6b3a', '#0f3a24'],
    holy:   ['#ffffff', '#fff6c9', '#ffe066', '#f5b82e', '#c98a1c', '#7a5110'],
    blood:  ['#ff8a80', '#ff3b3b', '#c41e2a', '#8a1020', '#4d0a14'],
    smoke:  ['#e9e4d8', '#bdb6a6', '#8f8879', '#625c50', '#3b372f'],
    water:  ['#ffffff', '#c9f0ff', '#7fd3f0', '#3f9cc9', '#23628f'],
    earth:  ['#c9b48a', '#a08458', '#7a6040', '#56422b', '#33271a'],
    wood:   ['#e8c48a', '#c1904f', '#94632e', '#6b4320', '#3f2612'],
    stone:  ['#e1e1d8', '#b4b4ab', '#86867f', '#5c5c56', '#363632'],
    leaf:   ['#c6f36b', '#7ed957', '#4fae3c', '#2f7a2a', '#1a4a1c'],
    spark:  ['#ffffff', '#fffbd0', '#ffe066', '#ffa531', '#d9541a'],
    heal:   ['#ffffff', '#d4ffd6', '#8cf58e', '#3fd35c', '#1f8f3a'],
    food:   ['#ffe6b0', '#e8b26a', '#c88a3d', '#8f5a24'],
    blood2: ['#ffd0d0', '#ff6b6b', '#d8344a', '#8a1a3a'],
  };

  /* ---------- 유틸 ---------- */
  function mulberry(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const isRange = v => Array.isArray(v) && v.length === 2 && typeof v[0] === 'number';
  const easeOut = t => 1 - (1 - t) * (1 - t);
  // 디더 소멸용 해시 (입자 id + 시간 스텝)
  const hash = (a, b) => ((Math.imul(a, 73856093) ^ Math.imul(b, 19349663)) >>> 0) % 1024 / 1024;

  /* ---------- 이펙트 인스턴스 (이펙트 정의에 넘기는 헬퍼) ---------- */
  class Emitter {
    constructor(sys, def, x, y, o) {
      this.sys = sys; this.def = def; this.x = x; this.y = y;
      this.scale = o.scale || 1;
      this.R = mulberry(o.seed != null ? o.seed : (Math.random() * 4294967296) >>> 0);
      this.P = typeof o.palette === 'string' ? PAL[o.palette] : (o.palette || PAL[def.pal] || PAL.fire);
      this.dur = o.dur != null ? o.dur : (def.dur || 0);
      this.top = o.top != null ? o.top : !!def.top;
      this.t = 0; this.acc = 0;
    }
    v(x) { return isRange(x) ? x[0] + this.R() * (x[1] - x[0]) : x; }
    pick(arr) { return arr[(this.R() * arr.length) | 0]; }
    // 입자 하나 추가: 좌표·속도는 이펙트 원점 기준(px), 스케일 적용
    add(c) {
      const s = this.scale, p = { id: this.sys.nextId++, age: 0 };
      for (const k in c) p[k] = this.v(c[k]);
      p.x = this.x + (p.x || 0) * s; p.y = this.y + (p.y || 0) * s;
      p.vx = (p.vx || 0) * s; p.vy = (p.vy || 0) * s;
      p.g = (p.g || 0) * s;
      p.life = p.life || 0.5;
      p.size = p.size || 1;
      p.pal = p.pal || this.P;
      p.shape = p.shape || 'dot';
      p.fade = p.fade != null ? p.fade : 0.65;
      p.top = p.top != null ? p.top : this.top;
      if (p.floor != null) p.floor = this.y + p.floor * s;
      if (p.r0 != null) { p.r0 *= s; p.r1 = (p.r1 != null ? p.r1 : p.r0) * s; }
      if (p.orbit) { p.cx = this.x; p.cy = this.y; p.rad = (p.rad || 0) * s; p.vr = (p.vr || 0) * s; }
      if (p.pull) { p.cx = this.x + (p.tx || 0) * s; p.cy = this.y + (p.ty || 0) * s; p.pull *= s; }
      if (p.pts) p.pts = p.pts.map(([px, py]) => [this.x + px * s, this.y + py * s]);
      this.sys.parts.push(p);
      return p;
    }
    // n개를 원형(또는 부채꼴)으로 뿌린다
    burst(n, c) {
      const { angle, spread, speed = [40, 100], radius = 0, flat = 1, ...rest } = c;
      for (let i = 0; i < n; i++) {
        const a = angle != null ? angle + (this.R() - 0.5) * (spread != null ? spread : TAU)
          : (c.even ? i / n * TAU : this.R() * TAU);
        const sp = this.v(speed), r0 = this.v(radius);
        this.add({
          ...rest,
          x: Math.cos(a) * r0 + (rest.x ? this.v(rest.x) : 0),
          y: Math.sin(a) * r0 * flat + (rest.y ? this.v(rest.y) : 0),
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp * flat + (rest.vy ? this.v(rest.vy) : 0),
        });
      }
    }
    // 초당 rate회 fn 호출 (지속형 이펙트용)
    every(dt, rate, fn) {
      this.acc += dt * rate;
      while (this.acc >= 1) { this.acc--; fn(); }
    }
  }

  /* ---------- 이펙트 정의 ---------- */
  // cat: 분류, n: 이름, pal: 기본 팔레트(교체 가능), top: 어둠 위에 그림(발광), dur: 지속 방출 시간
  const UP = -Math.PI / 2;
  const EFFECTS = {
    'fire/burst': { cat: '불', n: '불꽃 폭발', pal: 'fire', top: true,
      spawn(e) {
        e.add({ shape: 'ring', r0: 4, r1: 30, flat: 0.55, life: 0.25, pal: e.P.slice(0, 3) });
        e.burst(30, { speed: [50, 170], g: -60, drag: 3, life: [0.35, 0.8], size: [1, 2.6], flat: 0.8 });
        e.burst(8, { speed: [10, 30], vy: -30, life: [0.8, 1.2], size: [2, 3], size1: 1, pal: PAL.smoke, top: false, fade: 0.4 });
      } },
    'fire/embers': { cat: '불', n: '모닥불 불티', pal: 'fire', top: true, dur: 1.2, loop: true,
      tick(e, dt) {
        e.every(dt, 14, () => e.add({ x: [-10, 10], y: [-4, 2], vx: [-8, 8], vy: [-70, -35],
          wob: [10, 30], wf: [4, 9], drag: 0.5, life: [0.6, 1.2], size: [1, 1.6] }));
      } },
    'smoke/puff': { cat: '연기', n: '연기 뭉게', pal: 'smoke',
      spawn(e) {
        e.burst(12, { speed: [15, 45], flat: 0.5, vy: -25, drag: 1.5, life: [0.6, 1.1], size: [2, 3.4], size1: [0.8, 1.4], fade: 0.35 });
      } },
    'hit/spark': { cat: '타격', n: '타격 스파크', pal: 'spark', top: true,
      spawn(e) {
        e.add({ shape: 'star', arm: 3, life: 0.14 });
        e.burst(9, { shape: 'streak', len: [2, 4], speed: [160, 280], drag: 7, life: [0.14, 0.28] });
        e.add({ shape: 'ring', r0: 4, r1: 16, life: 0.16, pal: e.P.slice(0, 2) });
      } },
    'hit/crit': { cat: '타격', n: '치명타', pal: 'holy', top: true,
      spawn(e) {
        e.add({ shape: 'star', arm: 7, arm1: 2, life: 0.32 });
        e.add({ shape: 'ring', r0: 6, r1: 34, life: 0.3, size: 1 });
        e.burst(16, { shape: 'streak', len: [3, 6], speed: [200, 360], drag: 6, life: [0.2, 0.4], even: true });
        e.burst(8, { shape: 'star', arm: 2, speed: [40, 90], drag: 2, life: [0.4, 0.7], radius: 12 });
      } },
    'hit/blood': { cat: '타격', n: '피격', pal: 'blood',
      spawn(e) {
        e.burst(14, { angle: UP, spread: 2.4, speed: [60, 150], g: 420, floor: 20, bounce: 0.25, life: [0.5, 0.9], size: [1, 1.8] });
        e.add({ shape: 'star', arm: 3, life: 0.12, pal: PAL.blood2, top: true });
      } },
    'gather/wood': { cat: '채집', n: '나무 조각', pal: 'wood',
      spawn(e) {
        e.burst(9, { angle: UP, spread: 2.2, speed: [70, 150], g: 380, floor: 22, bounce: 0.3, life: [0.6, 1], size: [1, 2], fade: 0.8 });
        e.burst(4, { angle: UP, spread: 2, speed: [40, 80], g: 60, drag: 2, wob: 30, wf: 6, life: [0.8, 1.2], pal: PAL.leaf });
      } },
    'gather/rock': { cat: '채집', n: '돌 파편', pal: 'stone',
      spawn(e) {
        e.add({ shape: 'star', arm: 2, life: 0.1, pal: PAL.spark, top: true });
        e.burst(10, { angle: UP, spread: 2.6, speed: [80, 170], g: 460, floor: 20, bounce: 0.35, life: [0.5, 0.9], size: [1, 2.2], fade: 0.8 });
        e.burst(5, { speed: [10, 30], flat: 0.5, vy: -10, drag: 2, life: [0.5, 0.8], size: [2, 3], pal: PAL.earth, fade: 0.3, y: 16 });
      } },
    'gather/grass': { cat: '채집', n: '풀잎', pal: 'leaf',
      spawn(e) {
        e.burst(10, { angle: UP, spread: 2.4, speed: [50, 110], g: 120, drag: 2.5, wob: [20, 40], wf: [5, 9], life: [0.7, 1.1] });
      } },
    'dust/step': { cat: '연기', n: '흙먼지', pal: 'earth',
      spawn(e) {
        e.burst(6, { speed: [20, 50], flat: 0.35, vy: -8, drag: 3, life: [0.3, 0.5], size: [1.4, 2.2], size1: 0.6, fade: 0.3 });
      } },
    'water/splash': { cat: '물', n: '물보라', pal: 'water',
      spawn(e) {
        e.add({ shape: 'ring', r0: 4, r1: 30, flat: 0.5, life: 0.6, fade: 0.4 });
        e.burst(14, { angle: UP, spread: 1.6, speed: [70, 170], g: 520, floor: 0, life: [0.4, 0.7], size: [1, 1.6] });
      } },
    'water/ripple': { cat: '물', n: '물결', pal: 'water',
      spawn(e) {
        for (let i = 0; i < 3; i++) e.add({ shape: 'ring', r0: 2, r1: 34, flat: 0.5, life: 0.9, delay: i * 0.22, pal: e.P.slice(1), fade: 0.3 });
      } },
    'weather/rain-splash': { cat: '물', n: '빗방울', pal: 'water',
      spawn(e) {
        e.add({ shape: 'ring', r0: 1, r1: 8, flat: 0.5, life: 0.25, pal: e.P.slice(1, 3) });
        e.burst(3, { angle: UP, spread: 1.4, speed: [40, 70], g: 400, life: [0.18, 0.28], pal: e.P.slice(0, 3) });
      } },
    'swamp/bubble': { cat: '물', n: '늪 거품', pal: 'poison', dur: 1.4, loop: true,
      tick(e, dt) {
        e.every(dt, 5, () => e.add({ shape: 'ring', r0: [2, 4], r1: [5, 8], x: [-14, 14], y: [-4, 4], vy: [-14, -6], life: [0.5, 0.9], fade: 0.9 }));
      } },
    'heal/rise': { cat: '버프', n: '회복', pal: 'heal', top: true,
      spawn(e) {
        e.burst(7, { shape: 'cross', arm: [1, 2], radius: [4, 18], flat: 0.5, speed: [0, 8], vy: [-60, -35], drag: 0.6, life: [0.7, 1.1], delay: [0, 0.35] });
        e.burst(12, { radius: [2, 20], flat: 0.5, speed: [0, 6], vy: [-80, -40], life: [0.5, 0.9], delay: [0, 0.4] });
      } },
    'buff/levelup': { cat: '버프', n: '레벨 업', pal: 'holy', top: true, dur: 0.6,
      spawn(e) {
        e.add({ shape: 'ring', r0: 4, r1: 44, flat: 0.5, life: 0.5, size: 1 });
        e.add({ shape: 'ring', r0: 2, r1: 30, flat: 0.5, life: 0.55, delay: 0.12 });
        e.burst(10, { shape: 'star', arm: 2, radius: [10, 30], flat: 0.5, vy: [-90, -50], speed: 0, life: [0.6, 1], delay: [0.1, 0.5] });
      },
      tick(e, dt) {
        e.every(dt, 70, () => e.add({ x: [-14, 14], y: [-2, 4], vy: [-260, -140], drag: 1.2, life: [0.4, 0.7], size: [1, 1.6] }));
      } },
    'item/sparkle': { cat: '아이템', n: '반짝임', pal: 'holy', top: true,
      spawn(e) {
        for (let i = 0; i < 6; i++) e.add({ shape: 'star', arm: [2, 3], x: [-18, 18], y: [-26, 6], life: [0.35, 0.6], delay: i * 0.07, twinkle: 1 });
      } },
    'item/shard': { cat: '아이템', n: '파편 흡수', pal: 'dark', top: true,
      spawn(e) {
        for (let i = 0; i < 18; i++) {
          const a = i / 18 * TAU, r = 36 + e.R() * 14;
          e.add({ x: Math.cos(a) * r, y: Math.sin(a) * r * 0.6 - 14, vx: -Math.sin(a) * 120, vy: Math.cos(a) * 70,
            pull: 900, ty: -14, drag: 2.2, life: [0.45, 0.6], size: [1, 1.6], kill: 5 });
        }
        e.add({ shape: 'star', arm: 4, arm1: 1, y: -14, life: 0.5, delay: 0.35, pal: PAL.dark.slice(0, 3) });
      } },
    'dark/spirit-death': { cat: '어둠', n: '정령 소멸', pal: 'dark', top: true,
      spawn(e) {
        e.add({ shape: 'ring', r0: 26, r1: 2, life: 0.22, pal: e.P.slice(0, 3) });
        e.add({ shape: 'star', arm: 5, arm1: 1, life: 0.3, delay: 0.2 });
        e.burst(22, { speed: [30, 120], vy: -40, drag: 2.5, wob: [10, 30], wf: [3, 7], life: [0.6, 1.2], size: [1, 2.4], size1: 0.8, delay: 0.2 });
        e.burst(8, { speed: [5, 20], vy: [-50, -30], life: [1, 1.5], size: [2.5, 3.5], size1: 1, pal: e.P.slice(3), fade: 0.3, delay: 0.2, top: false });
      } },
    'dark/nova': { cat: '어둠', n: '어둠 파동', pal: 'dark', top: true,
      spawn(e) {
        e.add({ shape: 'ring', r0: 10, r1: 110, flat: 0.5, life: 0.55, size: 2 });
        e.add({ shape: 'ring', r0: 4, r1: 80, flat: 0.5, life: 0.5, delay: 0.08, pal: e.P.slice(2) });
        e.burst(36, { speed: [160, 260], flat: 0.5, drag: 3, life: [0.4, 0.7], size: [1, 2], shape: 'streak', len: 3, even: true });
        e.burst(14, { speed: [10, 40], flat: 0.5, vy: [-70, -30], life: [0.8, 1.2], size: [2, 3], size1: 1, delay: 0.15, fade: 0.4 });
      } },
    'ice/frost-nova': { cat: '얼음', n: '서리 폭발', pal: 'ice', top: true,
      spawn(e) {
        e.add({ shape: 'ring', r0: 6, r1: 70, flat: 0.5, life: 0.45, size: 2 });
        e.burst(12, { shape: 'streak', len: [3, 5], speed: [180, 260], flat: 0.5, drag: 5, life: [0.3, 0.5], even: true });
        e.burst(16, { shape: 'cross', arm: 1, radius: [6, 50], flat: 0.5, vy: [10, 30], vx: [-10, 10], wob: 16, wf: 4, life: [0.9, 1.4], delay: [0.1, 0.4] });
      } },
    'elec/lightning': { cat: '번개', n: '번개', pal: 'ice', top: true,
      spawn(e) {
        // 지그재그 번개줄기: 위에서 원점까지 점 목록
        const pts = []; let x = e.v([-20, 20]), y = -170;
        while (y < 0) {
          const ny = Math.min(0, y + e.v([14, 26])), nx = x + e.v([-14, 14]);
          const steps = Math.ceil(Math.hypot(nx - x, ny - y) / 3);
          for (let i = 0; i < steps; i++) pts.push([x + (nx - x) * i / steps, y + (ny - y) * i / steps]);
          x = nx; y = ny;
        }
        e.add({ shape: 'bolt', pts, life: 0.32, fade: 0.3, flicker: 1, pal: e.P.slice(0, 3) });
        e.add({ shape: 'ring', r0: 4, r1: 36, flat: 0.5, life: 0.3 });
        e.burst(14, { shape: 'streak', len: 2, angle: UP, spread: 2.8, speed: [100, 220], g: 300, drag: 2, life: [0.25, 0.5] });
      } },
    'magic/portal': { cat: '마법', n: '차원문', pal: 'dark', top: true, dur: 1.6, loop: true,
      spawn(e) { e.add({ shape: 'ring', r0: 8, r1: 30, flat: 0.5, life: 0.4 }); },
      tick(e, dt) {
        e.every(dt, 40, () => {
          const a = e.R() * TAU;
          e.add({ orbit: 1, ang: a, rad: [24, 32], vr: -18, av: 5, flat: 0.5, vy: 0, life: [0.5, 0.9], size: [1, 1.5] });
        });
        e.every(dt, 8, () => e.add({ x: [-10, 10], vy: [-60, -30], life: [0.5, 0.8], pal: e.P.slice(0, 3) }));
      } },
    'craft/poof': { cat: '아이템', n: '제작 완료', pal: 'smoke',
      spawn(e) {
        e.burst(14, { speed: [50, 90], flat: 0.55, drag: 4, life: [0.4, 0.6], size: [2, 3], size1: 0.8, even: true, fade: 0.4 });
        e.burst(5, { shape: 'star', arm: 2, radius: [6, 22], speed: 0, vy: -30, life: [0.4, 0.6], delay: [0.1, 0.3], pal: PAL.holy, top: true });
      } },
    'eat/crumbs': { cat: '아이템', n: '냠냠 부스러기', pal: 'food',
      spawn(e) {
        e.burst(8, { angle: UP, spread: 2.6, speed: [40, 100], g: 360, floor: 26, bounce: 0.2, life: [0.4, 0.7] });
      } },
    'status/poison': { cat: '상태', n: '중독', pal: 'poison', dur: 1.2, loop: true,
      tick(e, dt) {
        e.every(dt, 9, () => e.add({ shape: e.R() < 0.5 ? 'ring' : 'dot', r0: 2, r1: 4, x: [-12, 12], y: [-20, 0], vy: [-45, -25], wob: 12, wf: 6, life: [0.6, 0.9] }));
      } },
    'status/sleep': { cat: '상태', n: '졸음', pal: 'ice', dur: 1.6, loop: true,
      tick(e, dt) {
        e.every(dt, 2.5, () => e.add({ shape: 'z', x: [4, 10], y: -20, vx: 14, vy: -22, wob: 16, wf: 3, life: 1.2, size: [1, 1.4], fade: 0.5, pal: e.P.slice(0, 3) }));
      } },
  };

  /* ---------- 시스템 ---------- */
  function createSystem(opts = {}) {
    const S = opts.px || 4;
    const max = opts.max || 1600;
    const sys = {
      px: S, parts: [], emitters: [], nextId: 1,
      spawn(name, x, y, o = {}) {
        const def = EFFECTS[name];
        if (!def) return null;
        const e = new Emitter(sys, def, x, y, o);
        if (def.spawn) def.spawn(e);
        if (def.tick && e.dur > 0) sys.emitters.push(e);
        if (sys.parts.length > max) sys.parts.splice(0, sys.parts.length - max);
        return e;
      },
      clear() { sys.parts.length = 0; sys.emitters.length = 0; },
      get busy() { return sys.parts.length > 0 || sys.emitters.length > 0; },
      update(dt) {
        for (let i = sys.emitters.length - 1; i >= 0; i--) {
          const e = sys.emitters[i];
          const step = Math.min(dt, e.dur - e.t);
          if (step > 0) e.def.tick(e, step);
          e.t += dt;
          if (e.t >= e.dur) sys.emitters.splice(i, 1);
        }
        const ps = sys.parts;
        for (let i = ps.length - 1; i >= 0; i--) {
          const p = ps[i];
          if (p.delay > 0) { p.delay -= dt; continue; }
          p.age += dt;
          if (p.age >= p.life) { ps.splice(i, 1); continue; }
          if (p.orbit) {
            p.ang += p.av * dt; p.rad = Math.max(0, p.rad + p.vr * dt);
            p.x = p.cx + Math.cos(p.ang) * p.rad;
            p.y = p.cy + Math.sin(p.ang) * p.rad * (p.flat || 1);
            continue;
          }
          if (p.pull) {
            const dx = p.cx - p.x, dy = p.cy - p.y, d = Math.hypot(dx, dy) || 1;
            if (p.kill && d < p.kill) { ps.splice(i, 1); continue; }
            p.vx += dx / d * p.pull * dt; p.vy += dy / d * p.pull * dt;
          }
          p.vy += p.g * dt;
          if (p.drag) { const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; }
          p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.wob) p.x += Math.sin(p.age * (p.wf || 5) + p.id) * p.wob * dt;
          if (p.floor != null && p.y > p.floor) {
            p.y = p.floor;
            p.vy = Math.abs(p.vy) > 30 ? -p.vy * (p.bounce || 0) : 0;
            p.vx *= 0.55;
          }
        }
      },
      // layer: 'world'(어둠 아래) | 'top'(발광, 어둠 위) | 생략 시 전부
      draw(ctx, ox = 0, oy = 0, layer) {
        const ps = sys.parts;
        for (let i = 0; i < ps.length; i++) {
          const p = ps[i];
          if (p.delay > 0) continue;
          if (layer && (layer === 'top') !== !!p.top) continue;
          const t = p.age / p.life;
          // 디더 소멸 (알파 없이 도트가 듬성듬성 빠지며 사라짐)
          if (t > p.fade && hash(p.id, (p.age * 24) | 0) > (1 - t) / (1 - p.fade)) continue;
          if (p.flicker && ((p.age * 30) | 0) % 3 === 1) continue;
          const pal = p.pal;
          const ci = Math.min(pal.length - 1, (t * pal.length) | 0);
          ctx.fillStyle = pal[ci];
          const size = p.size1 != null ? p.size + (p.size1 - p.size) * t : p.size;
          drawShape(ctx, p, t, size, ox, oy, S, pal, ci);
        }
      },
    };
    return sys;
  }

  const snap = (v, S) => Math.round(v / S) * S;
  function dot(ctx, x, y, n, S) {
    const w = Math.max(1, Math.round(n)) * S;
    ctx.fillRect(snap(x, S) - (w >> 1), snap(y, S) - (w >> 1), w, w);
  }
  // 'z' 글자 (5x5 도트)
  const Z_MAP = ['11111', '00010', '00100', '01000', '11111'];

  function drawShape(ctx, p, t, size, ox, oy, S, pal, ci) {
    const x = p.x + ox, y = p.y + oy;
    switch (p.shape) {
      case 'dot': dot(ctx, x, y, size, S); break;
      case 'streak': { // 진행 방향 반대로 꼬리
        const sp = Math.hypot(p.vx, p.vy) || 1, dx = -p.vx / sp, dy = -p.vy / sp;
        const len = Math.max(1, Math.round((p.len || 3) * Math.min(1, sp / 80)));
        for (let k = 0; k < len; k++) {
          ctx.fillStyle = pal[Math.min(pal.length - 1, ci + ((k * 2 / len) | 0))];
          dot(ctx, x + dx * k * S, y + dy * k * S, size, S);
        }
        break;
      }
      case 'ring': {
        const r = p.r0 + (p.r1 - p.r0) * easeOut(t), f = p.flat || 1;
        const n = Math.max(6, Math.round(TAU * r / S));
        for (let k = 0; k < n; k++) {
          const a = k / n * TAU;
          dot(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * f, size, S);
        }
        break;
      }
      case 'cross': case 'star': {
        let arm = p.arm || 2;
        if (p.arm1 != null) arm = arm + (p.arm1 - arm) * t;
        if (p.twinkle) arm = arm * Math.sin(Math.PI * t);
        arm = Math.round(arm);
        const cx = snap(x, S), cy = snap(y, S);
        ctx.fillRect(cx - S / 2, cy - S / 2 - arm * S, S, (arm * 2 + 1) * S);
        ctx.fillRect(cx - S / 2 - arm * S, cy - S / 2, (arm * 2 + 1) * S, S);
        if (p.shape === 'star' && arm >= 2) { // 대각 반짝
          ctx.fillStyle = pal[Math.min(pal.length - 1, ci + 1)];
          for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) ctx.fillRect(cx - S / 2 + sx * S, cy - S / 2 + sy * S, S, S);
        }
        break;
      }
      case 'bolt': {
        for (const [px, py] of p.pts) dot(ctx, px + ox, py + oy, size, S);
        break;
      }
      case 'z': {
        const cx = snap(x, S), cy = snap(y, S), s = Math.max(1, Math.round(size)) * S / 2;
        for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++)
          if (Z_MAP[r][c] === '1') ctx.fillRect(cx + (c - 2) * s, cy + (r - 2) * s, s, s);
        break;
      }
    }
  }

  /* ---------- 스프라이트 시트 굽기 (다른 엔진용: 투명 PNG + Aseprite JSON) ---------- */
  // 같은 seed → 같은 결과. 반환: { canvas, json, frames }
  function bake(name, o = {}) {
    const fps = o.fps || 24, cell = o.cell || 160, px = o.px || 4;
    const cols = o.cols || 8, maxFrames = o.maxFrames || 72;
    const sys = createSystem({ px });
    sys.spawn(name, cell / 2, cell * (o.anchorY != null ? o.anchorY : 0.62), { seed: o.seed || 1, palette: o.palette, scale: o.scale });
    const frames = [];
    const dt = 1 / fps;
    while (frames.length < maxFrames) {
      const c = document.createElement('canvas');
      c.width = c.height = cell;
      const cx = c.getContext('2d');
      cx.imageSmoothingEnabled = false;
      sys.draw(cx);
      frames.push(c);
      sys.update(dt);
      if (!sys.busy) break;
    }
    const rows = Math.ceil(frames.length / cols);
    const sheet = document.createElement('canvas');
    sheet.width = Math.min(cols, frames.length) * cell; sheet.height = rows * cell;
    const sc = sheet.getContext('2d');
    const file = name.replace('/', '-');
    const json = { frames: {}, meta: {
      app: 'pixelfx (baby-menu-reels)', image: file + '.png', format: 'RGBA8888',
      size: { w: sheet.width, h: sheet.height }, scale: '1',
      frameTags: [{ name: file, from: 0, to: frames.length - 1, direction: 'forward' }],
    } };
    frames.forEach((f, i) => {
      const x = (i % cols) * cell, y = ((i / cols) | 0) * cell;
      sc.drawImage(f, x, y);
      json.frames[`${file} ${i}.png`] = {
        frame: { x, y, w: cell, h: cell }, rotated: false, trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: cell, h: cell }, sourceSize: { w: cell, h: cell },
        duration: Math.round(1000 / fps),
      };
    });
    return { canvas: sheet, json, frames: frames.length };
  }

  global.PFX = { PAL, EFFECTS, createSystem, bake };
})(typeof window !== 'undefined' ? window : globalThis);
