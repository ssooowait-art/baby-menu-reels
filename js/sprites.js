// ===== 절차적 스프라이트 (전부 코드로 그린 오리지널 아트) =====
'use strict';

const TW = 64, TH = 32; // isometric tile size

function mkCanvas(w, h, fn) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  fn(c.getContext('2d'), w, h);
  return c;
}
// 시드 난수 (스프라이트 변형용)
function srand(seed) {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}
function diamond(ctx, cx, cy, w, h) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - h / 2);
  ctx.lineTo(cx + w / 2, cy);
  ctx.lineTo(cx, cy + h / 2);
  ctx.lineTo(cx - w / 2, cy);
  ctx.closePath();
}

const SPR = {};

// ---- 타일 ----
function makeTiles() {
  SPR.grass = [];
  for (let v = 0; v < 4; v++) {
    SPR.grass.push(mkCanvas(TW, TH, (ctx) => {
      const r = srand(100 + v * 7);
      diamond(ctx, TW/2, TH/2, TW, TH);
      const g = ctx.createLinearGradient(0, 0, 0, TH);
      g.addColorStop(0, ['#41682f','#3d642c','#446b31','#3a5f2b'][v]);
      g.addColorStop(1, '#2e4d20');
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(20,35,12,.55)'; ctx.lineWidth = 1; ctx.stroke();
      // 풀잎 자국
      ctx.strokeStyle = 'rgba(120,170,80,.5)';
      for (let i = 0; i < 9; i++) {
        const x = TW/2 + (r()-.5) * TW * .7, y = TH/2 + (r()-.5) * TH * .7;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (r()-.5)*3, y - 3 - r()*3); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(30,50,18,.5)';
      for (let i = 0; i < 6; i++) ctx.fillRect(TW/2 + (r()-.5)*TW*.7, TH/2 + (r()-.5)*TH*.6, 1.5, 1.5);
    }));
  }
  SPR.water = [];
  for (let f = 0; f < 2; f++) {
    SPR.water.push(mkCanvas(TW, TH, (ctx) => {
      const r = srand(500 + f * 13);
      diamond(ctx, TW/2, TH/2, TW, TH);
      const g = ctx.createLinearGradient(0, 0, TW, TH);
      g.addColorStop(0, '#4fb3d9'); g.addColorStop(1, '#3a95c4');
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(20,60,90,.5)'; ctx.stroke();
      ctx.strokeStyle = 'rgba(220,245,255,.55)'; ctx.lineWidth = 1.2;
      for (let i = 0; i < 7; i++) {
        const x = TW/2 + (r()-.5)*TW*.6, y = TH/2 + (r()-.5)*TH*.6;
        ctx.beginPath(); ctx.moveTo(x-4, y); ctx.quadraticCurveTo(x, y-2+f, x+4, y); ctx.stroke();
      }
    }));
  }
  SPR.dirt = [mkCanvas(TW, TH, (ctx) => {
    const r = srand(900);
    diamond(ctx, TW/2, TH/2, TW, TH);
    ctx.fillStyle = '#6b5537'; ctx.fill();
    ctx.strokeStyle = 'rgba(40,30,15,.6)'; ctx.stroke();
    ctx.fillStyle = 'rgba(90,70,45,.8)';
    for (let i = 0; i < 8; i++) ctx.fillRect(TW/2+(r()-.5)*TW*.7, TH/2+(r()-.5)*TH*.6, 2, 1.5);
  })];
}

// ---- 월드 오브젝트 ----
function jaggedTri(ctx, cx, top, w, h, r, fill, line) {
  ctx.beginPath(); ctx.moveTo(cx, top);
  const steps = 4;
  for (let i = 1; i <= steps; i++) { // right side
    ctx.lineTo(cx + (w/2) * i/steps + (r()-.5)*3, top + h * i/steps + (r()-.5)*2);
  }
  for (let i = steps-1; i >= 0; i--) {
    ctx.lineTo(cx - (w/2) * i/steps + (r()-.5)*3, top + h * i/steps + (r()-.5)*2);
  }
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  ctx.strokeStyle = line; ctx.lineWidth = 1.5; ctx.stroke();
}

function makeObjects() {
  // 침엽수
  SPR.tree = mkCanvas(72, 100, (ctx) => {
    const r = srand(11);
    ctx.fillStyle = '#4a3620';
    ctx.fillRect(33, 78, 7, 16);
    ctx.strokeStyle = '#241a0e'; ctx.strokeRect(33, 78, 7, 16);
    jaggedTri(ctx, 36, 44, 52, 40, r, '#1e3d22', '#0e2212');
    jaggedTri(ctx, 36, 22, 42, 36, r, '#25492a', '#0e2212');
    jaggedTri(ctx, 36, 4, 30, 32, r, '#2d5733', '#0e2212');
    ctx.strokeStyle = 'rgba(140,190,120,.35)';
    for (let i = 0; i < 8; i++) {
      const y = 20 + r()*55, x = 36 + (r()-.5)*30;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x-4, y+4); ctx.stroke();
    }
  });
  SPR.stump = mkCanvas(72, 100, (ctx) => {
    ctx.fillStyle = '#5a4226'; ctx.strokeStyle = '#2a1e10';
    ctx.beginPath(); ctx.ellipse(36, 88, 10, 5, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillRect(26, 80, 20, 8);
    ctx.beginPath(); ctx.ellipse(36, 80, 10, 5, 0, 0, Math.PI*2);
    ctx.fillStyle = '#8a6a3e'; ctx.fill(); ctx.stroke();
  });
  SPR.bush = mkCanvas(56, 44, (ctx) => {
    const r = srand(22);
    ctx.strokeStyle = '#2c4a1e'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (let i = 0; i < 14; i++) {
      const x = 10 + r()*36;
      ctx.strokeStyle = ['#2c4a1e','#3b5f28','#4a7332'][i%3];
      ctx.beginPath(); ctx.moveTo(x, 40);
      ctx.quadraticCurveTo(x + (r()-.5)*10, 22 + r()*8, x + (r()-.5)*16, 6 + r()*10);
      ctx.stroke();
    }
  });
  SPR.rock = mkCanvas(64, 52, (ctx) => {
    const r = srand(33);
    function blob(cx, cy, rad, col) {
      ctx.beginPath();
      for (let a = 0; a < Math.PI*2; a += Math.PI/5) {
        const rr = rad * (0.8 + r()*0.35);
        const x = cx + Math.cos(a)*rr, y = cy + Math.sin(a)*rr*0.75;
        a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.fillStyle = col; ctx.fill();
      ctx.strokeStyle = '#20201c'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    blob(24, 36, 15, '#6e6e64');
    blob(43, 38, 11, '#7c7c70');
    blob(33, 26, 12, '#8a8a7e');
    ctx.strokeStyle = 'rgba(30,30,25,.6)';
    ctx.beginPath(); ctx.moveTo(28, 22); ctx.lineTo(34, 30); ctx.lineTo(31, 36); ctx.stroke();
  });
  SPR.twig = mkCanvas(40, 24, (ctx) => {
    ctx.strokeStyle = '#5a4226'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(6, 18); ctx.lineTo(30, 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(18, 13); ctx.lineTo(26, 18); ctx.stroke();
    ctx.strokeStyle = '#6e5230'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(10, 20); ctx.lineTo(34, 14); ctx.stroke();
  });
  SPR.flint = mkCanvas(36, 22, (ctx) => {
    ctx.fillStyle = '#4c4c50'; ctx.strokeStyle = '#1c1c20';
    ctx.beginPath(); ctx.moveTo(6, 16); ctx.lineTo(14, 6); ctx.lineTo(24, 9); ctx.lineTo(18, 17); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5e5e64';
    ctx.beginPath(); ctx.moveTo(20, 14); ctx.lineTo(29, 8); ctx.lineTo(31, 14); ctx.closePath(); ctx.fill(); ctx.stroke();
  });
  SPR.pebble = mkCanvas(36, 22, (ctx) => {
    ctx.fillStyle = '#8a8a7e'; ctx.strokeStyle = '#3a3a34';
    ctx.beginPath(); ctx.ellipse(13, 14, 7, 5, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#7a7a70';
    ctx.beginPath(); ctx.ellipse(24, 15, 5, 4, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  });
  SPR.berry = mkCanvas(48, 40, (ctx) => {
    const r = srand(44);
    ctx.fillStyle = '#33531f'; ctx.strokeStyle = '#16290d';
    ctx.beginPath(); ctx.ellipse(24, 26, 18, 12, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3f6527';
    ctx.beginPath(); ctx.ellipse(24, 20, 13, 9, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e03b4e';
    for (let i = 0; i < 7; i++) {
      ctx.beginPath(); ctx.arc(12 + r()*24, 16 + r()*14, 2.4, 0, Math.PI*2); ctx.fill();
    }
  });
  SPR.bean = mkCanvas(44, 40, (ctx) => {
    ctx.strokeStyle = '#3f6527'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(22, 38); ctx.quadraticCurveTo(18, 20, 22, 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(22, 26); ctx.quadraticCurveTo(30, 22, 34, 14); ctx.stroke();
    ctx.fillStyle = '#7fb04a'; ctx.strokeStyle = '#33531f'; ctx.lineWidth = 1.5;
    [[14,18],[28,12],[24,28]].forEach(([x,y]) => {
      ctx.beginPath(); ctx.ellipse(x, y, 4, 8, 0.4, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    });
  });
  SPR.nest = mkCanvas(48, 32, (ctx) => {
    ctx.strokeStyle = '#6e5230'; ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.ellipse(24, 24, 16 - i*0.8, 7 - i*0.3, 0, 0, Math.PI*2); ctx.stroke();
    }
    ctx.fillStyle = '#f2ead8'; ctx.strokeStyle = '#8f8b7c'; ctx.lineWidth = 1;
    [[18,18],[27,16],[23,21]].forEach(([x,y]) => {
      ctx.beginPath(); ctx.ellipse(x, y, 4, 5, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    });
  });
}

// ---- 구조물 ----
function makeStructs() {
  SPR.campfire = mkCanvas(56, 48, (ctx) => { // unlit base (logs + stones)
    ctx.strokeStyle = '#4a3620'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(14, 40); ctx.lineTo(42, 32); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(16, 32); ctx.lineTo(40, 40); ctx.stroke();
    ctx.fillStyle = '#6e6e64';
    for (let a = 0; a < Math.PI*2; a += Math.PI/4) {
      ctx.beginPath(); ctx.arc(28 + Math.cos(a)*17, 37 + Math.sin(a)*8, 3, 0, Math.PI*2); ctx.fill();
    }
  });
  SPR.flame = [0,1,2].map(f => mkCanvas(40, 44, (ctx) => {
    const r = srand(70 + f*3);
    function fl(w, h, col) {
      ctx.beginPath(); ctx.moveTo(20, 42);
      ctx.quadraticCurveTo(20 - w, 30, 20 - w*0.4 + (r()-.5)*4, 42 - h*0.7);
      ctx.quadraticCurveTo(20 + (r()-.5)*5, 42 - h - f*2, 20 + w*0.4, 42 - h*0.7);
      ctx.quadraticCurveTo(20 + w, 30, 20, 42);
      ctx.fillStyle = col; ctx.fill();
    }
    fl(14, 32, '#ff8a1f'); fl(9, 22, '#ffc93d'); fl(5, 12, '#fff3b8');
  }));
  SPR.furnace = mkCanvas(64, 60, (ctx) => {
    ctx.fillStyle = '#6a655c'; ctx.strokeStyle = '#26241f'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(10, 52); ctx.quadraticCurveTo(10, 16, 32, 14);
    ctx.quadraticCurveTo(54, 16, 54, 52); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1a120a';
    ctx.beginPath(); ctx.moveTo(24, 52); ctx.quadraticCurveTo(24, 34, 32, 33);
    ctx.quadraticCurveTo(40, 34, 40, 52); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(30,28,24,.7)';
    for (const [x,y] of [[16,30],[44,26],[22,20],[40,42],[14,44]]) {
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI*2); ctx.stroke();
    }
  });
  SPR.field = mkCanvas(64, 40, (ctx) => {
    ctx.save(); ctx.translate(32, 24);
    ctx.fillStyle = '#6b5537'; ctx.strokeStyle = '#3c2c16'; ctx.lineWidth = 1.5;
    diamond(ctx, 0, 0, 56, 28); ctx.fill(); ctx.stroke();
    // 고랑
    ctx.strokeStyle = 'rgba(50,36,18,.8)'; ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(-18 + i * 9, -6 + i * 4.5);
      ctx.lineTo(4 + i * 9, 5 + i * 4.5);
      ctx.stroke();
    }
    ctx.restore();
  });
  SPR.sprout = [
    mkCanvas(24, 24, (ctx) => { // 새싹
      ctx.strokeStyle = '#7fb04a'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(12, 22); ctx.lineTo(12, 14); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(12, 16); ctx.quadraticCurveTo(7, 14, 6, 9); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(12, 15); ctx.quadraticCurveTo(17, 13, 18, 8); ctx.stroke();
    }),
    mkCanvas(28, 34, (ctx) => { // 다 자란 콩
      ctx.strokeStyle = '#3f6527'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(14, 32); ctx.quadraticCurveTo(12, 16, 14, 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(14, 20); ctx.quadraticCurveTo(21, 17, 24, 10); ctx.stroke();
      ctx.fillStyle = '#7fb04a'; ctx.strokeStyle = '#33531f'; ctx.lineWidth = 1.5;
      [[9,14],[19,10],[16,22]].forEach(([x,y]) => {
        ctx.beginPath(); ctx.ellipse(x, y, 3, 6, 0.4, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      });
    }),
  ];
  // 수호 장승 (얼굴 새긴 나무 기둥)
  SPR.jangseung = mkCanvas(40, 76, (ctx) => {
    ctx.fillStyle = '#6e5230'; ctx.strokeStyle = '#33240e'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(13, 72); ctx.lineTo(14, 16); ctx.quadraticCurveTo(20, 8, 26, 16); ctx.lineTo(27, 72);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // 갓(모자)
    ctx.fillStyle = '#4a3620';
    ctx.beginPath(); ctx.ellipse(20, 14, 12, 5, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    // 부릅뜬 눈
    ctx.fillStyle = '#f2ead8';
    ctx.beginPath(); ctx.ellipse(16.5, 26, 3.5, 4.5, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(24.5, 26, 3.5, 4.5, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1a120a';
    ctx.beginPath(); ctx.arc(16.5, 26, 1.6, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(24.5, 26, 1.6, 0, Math.PI*2); ctx.fill();
    // 주먹코 & 이빨
    ctx.fillStyle = '#5c451e';
    ctx.beginPath(); ctx.ellipse(20.5, 34, 3, 4, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#33240e'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(13, 43); ctx.lineTo(28, 43); ctx.stroke();
    for (const x of [16, 20, 24]) { ctx.beginPath(); ctx.moveTo(x, 40); ctx.lineTo(x, 46); ctx.stroke(); }
    // 몸통 문양
    ctx.beginPath(); ctx.moveTo(15, 54); ctx.lineTo(26, 54); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(17, 60); ctx.lineTo(24, 60); ctx.stroke();
  });
  // 빛의 화로 (파편이 타는 돌 화로)
  SPR.brazier = mkCanvas(48, 56, (ctx) => {
    ctx.fillStyle = '#6e6e64'; ctx.strokeStyle = '#26241f'; ctx.lineWidth = 2;
    // 받침
    ctx.beginPath(); ctx.moveTo(18, 52); ctx.lineTo(30, 52); ctx.lineTo(27, 42); ctx.lineTo(21, 42); ctx.closePath();
    ctx.fill(); ctx.stroke();
    // 그릇
    ctx.beginPath(); ctx.moveTo(8, 30); ctx.quadraticCurveTo(24, 46, 40, 30);
    ctx.lineTo(38, 26); ctx.quadraticCurveTo(24, 38, 10, 26); ctx.closePath();
    ctx.fill(); ctx.stroke();
  });
  SPR.brazierFlame = [0,1,2].map(f => mkCanvas(32, 34, (ctx) => {
    const r = srand(300 + f * 7);
    function fl(w, h, col) {
      ctx.beginPath(); ctx.moveTo(16, 32);
      ctx.quadraticCurveTo(16 - w, 22, 16 - w*0.4 + (r()-.5)*3, 32 - h*0.7);
      ctx.quadraticCurveTo(16 + (r()-.5)*4, 32 - h - f*1.5, 16 + w*0.4, 32 - h*0.7);
      ctx.quadraticCurveTo(16 + w, 22, 16, 32);
      ctx.fillStyle = col; ctx.fill();
    }
    fl(11, 24, '#8a3cd9'); fl(7, 16, '#c46bff'); fl(3.5, 9, '#f0dcff');
  }));
  // 고인돌
  SPR.dolmen = mkCanvas(84, 72, (ctx) => {
    const r = srand(410);
    ctx.fillStyle = '#7c7c70'; ctx.strokeStyle = '#2a2a24'; ctx.lineWidth = 2;
    // 받침돌 둘
    ctx.beginPath(); ctx.moveTo(18, 66); ctx.lineTo(20, 36); ctx.lineTo(32, 34); ctx.lineTo(32, 66); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(52, 66); ctx.lineTo(52, 34); ctx.lineTo(64, 36); ctx.lineTo(66, 66); ctx.closePath();
    ctx.fillStyle = '#72726a'; ctx.fill(); ctx.stroke();
    // 덮개돌
    ctx.fillStyle = '#8a8a7e';
    ctx.beginPath(); ctx.moveTo(6, 36); ctx.lineTo(14, 20); ctx.lineTo(72, 16); ctx.lineTo(78, 30);
    ctx.lineTo(70, 40); ctx.lineTo(12, 42); ctx.closePath();
    ctx.fill(); ctx.stroke();
    // 이끼 & 문양
    ctx.fillStyle = 'rgba(90,140,70,.5)';
    for (let i = 0; i < 6; i++) ctx.fillRect(10 + r()*60, 18 + r()*20, 4 + r()*5, 2.5);
    ctx.strokeStyle = 'rgba(40,40,34,.8)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(42, 28, 5, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(42, 28, 2, 0, Math.PI*2); ctx.stroke();
  });
  // 무너진 석실
  SPR.chamber = mkCanvas(88, 78, (ctx) => {
    const r = srand(520);
    ctx.fillStyle = '#6a6a60'; ctx.strokeStyle = '#26261f'; ctx.lineWidth = 2;
    // 뒷벽
    ctx.beginPath(); ctx.moveTo(10, 60); ctx.lineTo(12, 24); ctx.lineTo(44, 14); ctx.lineTo(76, 24); ctx.lineTo(78, 60);
    ctx.lineTo(60, 70); ctx.lineTo(26, 70); ctx.closePath();
    ctx.fill(); ctx.stroke();
    // 입구(검은 구멍)
    ctx.fillStyle = '#0c0a08';
    ctx.beginPath(); ctx.moveTo(34, 68); ctx.lineTo(36, 38); ctx.lineTo(52, 38); ctx.lineTo(54, 68); ctx.closePath();
    ctx.fill();
    // 무너진 돌들
    ctx.fillStyle = '#7c7c70';
    for (const [x, y, s] of [[16, 62, 7], [68, 58, 8], [58, 66, 5]]) {
      ctx.beginPath(); ctx.ellipse(x, y, s, s*0.6, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    }
    // 균열 & 이끼
    ctx.strokeStyle = 'rgba(20,20,16,.7)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(22, 26); ctx.lineTo(28, 40); ctx.lineTo(24, 52); ctx.stroke();
    ctx.fillStyle = 'rgba(90,140,70,.45)';
    for (let i = 0; i < 7; i++) ctx.fillRect(14 + r()*58, 20 + r()*38, 4 + r()*4, 2.5);
  });
  // 검은 오벨리스크
  SPR.obelisk = mkCanvas(56, 110, (ctx) => {
    ctx.fillStyle = '#16121e'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, 104); ctx.lineTo(23, 14); ctx.lineTo(28, 4); ctx.lineTo(33, 14); ctx.lineTo(36, 104);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // 받침
    ctx.fillStyle = '#241e30';
    ctx.beginPath(); ctx.moveTo(12, 104); ctx.lineTo(16, 94); ctx.lineTo(40, 94); ctx.lineTo(44, 104); ctx.closePath();
    ctx.fill(); ctx.stroke();
    // 빛나는 문양 (보라)
    ctx.strokeStyle = '#8a3cd9'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(28, 20); ctx.lineTo(26, 34); ctx.lineTo(30, 44); ctx.lineTo(27, 58); ctx.stroke();
    ctx.beginPath(); ctx.arc(28, 70, 4, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(28, 78); ctx.lineTo(28, 88); ctx.stroke();
    ctx.fillStyle = '#b13cff';
    ctx.beginPath(); ctx.arc(28, 70, 1.6, 0, Math.PI*2); ctx.fill();
  });
  SPR.bed = mkCanvas(64, 40, (ctx) => {
    const r = srand(88);
    ctx.save(); ctx.translate(32, 24);
    ctx.fillStyle = '#b3a25e'; ctx.strokeStyle = '#5c5124'; ctx.lineWidth = 1.5;
    diamond(ctx, 0, 0, 52, 26); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(92,81,36,.8)';
    for (let i = 0; i < 14; i++) {
      const x = (r()-.5)*40, y = (r()-.5)*18;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x+5, y-2); ctx.stroke();
    }
    ctx.fillStyle = '#8f7f42';
    diamond(ctx, -12, -4, 16, 9); ctx.fill(); ctx.stroke();
    ctx.restore();
  });
}

// ---- 아이템 아이콘 (40x40) ----
function makeIcons() {
  const I = {};
  const mk = (fn) => mkCanvas(40, 40, fn);
  I.grass = mk((ctx) => {
    ctx.strokeStyle = '#7fb04a'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (const [x, dx] of [[14,-4],[20,0],[26,4],[17,-1],[23,2]]) {
      ctx.beginPath(); ctx.moveTo(x, 34); ctx.quadraticCurveTo(x+dx, 20, x+dx*2, 8); ctx.stroke();
    }
  });
  I.twig = mk((ctx) => {
    ctx.strokeStyle = '#6e5230'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(8, 32); ctx.lineTo(32, 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(20, 21); ctx.lineTo(29, 25); ctx.stroke();
  });
  I.log = mk((ctx) => {
    ctx.fillStyle = '#7a5c34'; ctx.strokeStyle = '#3c2c16'; ctx.lineWidth = 2;
    ctx.fillRect(6, 14, 24, 12); ctx.strokeRect(6, 14, 24, 12);
    ctx.beginPath(); ctx.ellipse(30, 20, 5, 6, 0, 0, Math.PI*2);
    ctx.fillStyle = '#c9a86a'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(30, 20, 2, 2.6, 0, 0, Math.PI*2); ctx.stroke();
  });
  I.stone = mk((ctx) => {
    ctx.fillStyle = '#8a8a7e'; ctx.strokeStyle = '#3a3a34'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(8, 28); ctx.lineTo(12, 14); ctx.lineTo(24, 10); ctx.lineTo(32, 20); ctx.lineTo(28, 30); ctx.closePath();
    ctx.fill(); ctx.stroke();
  });
  I.flint = mk((ctx) => {
    ctx.fillStyle = '#4c4c50'; ctx.strokeStyle = '#17171b'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(8, 30); ctx.lineTo(16, 8); ctx.lineTo(30, 14); ctx.lineTo(20, 32); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(200,200,210,.5)';
    ctx.beginPath(); ctx.moveTo(14, 24); ctx.lineTo(22, 14); ctx.stroke();
  });
  I.berry = mk((ctx) => {
    ctx.fillStyle = '#e03b4e'; ctx.strokeStyle = '#7c1522'; ctx.lineWidth = 1.5;
    for (const [x,y] of [[16,22],[24,20],[20,28]]) {
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    }
    ctx.strokeStyle = '#3f6527'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(20, 16); ctx.quadraticCurveTo(22, 10, 26, 8); ctx.stroke();
  });
  I.bean = mk((ctx) => {
    ctx.fillStyle = '#7fb04a'; ctx.strokeStyle = '#33531f'; ctx.lineWidth = 2;
    for (const [x,y,a] of [[15,16,0.5],[25,20,0.2],[18,28,0.8]]) {
      ctx.beginPath(); ctx.ellipse(x, y, 4.5, 8, a, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    }
  });
  I.egg = mk((ctx) => {
    ctx.fillStyle = '#f2ead8'; ctx.strokeStyle = '#8f8b7c'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(20, 21, 9, 12, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(180,170,150,.6)';
    ctx.beginPath(); ctx.arc(17, 17, 1.5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(23, 24, 1.5, 0, Math.PI*2); ctx.fill();
  });
  I.cookedEgg = mk((ctx) => {
    ctx.fillStyle = '#e8b04a'; ctx.strokeStyle = '#8a5c1a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(20, 21, 9, 12, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#a8742a';
    ctx.beginPath(); ctx.moveTo(14, 16); ctx.quadraticCurveTo(20, 20, 26, 16); ctx.stroke();
  });
  I.cookedBean = mk((ctx) => {
    ctx.fillStyle = '#c9903d'; ctx.strokeStyle = '#6e4a14'; ctx.lineWidth = 2;
    for (const [x,y,a] of [[15,16,0.5],[25,20,0.2],[18,28,0.8]]) {
      ctx.beginPath(); ctx.ellipse(x, y, 4.5, 8, a, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    }
  });
  I.shard = mk((ctx) => {
    ctx.fillStyle = '#b13cff'; ctx.strokeStyle = '#5c1a8c'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(20, 6); ctx.lineTo(28, 18); ctx.lineTo(20, 34); ctx.lineTo(12, 18); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(240,210,255,.8)';
    ctx.beginPath(); ctx.moveTo(20, 10); ctx.lineTo(20, 30); ctx.stroke();
  });
  I.torch = mk((ctx) => {
    ctx.strokeStyle = '#6e5230'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(14, 34); ctx.lineTo(24, 16); ctx.stroke();
    ctx.fillStyle = '#ff8a1f';
    ctx.beginPath(); ctx.moveTo(24, 16); ctx.quadraticCurveTo(18, 8, 25, 3);
    ctx.quadraticCurveTo(26, 8, 31, 8); ctx.quadraticCurveTo(30, 14, 24, 16);
    ctx.fill();
    ctx.fillStyle = '#ffc93d';
    ctx.beginPath(); ctx.arc(25.5, 10, 3, 0, Math.PI*2); ctx.fill();
  });
  function toolIcon(headFn) {
    return mk((ctx) => {
      ctx.strokeStyle = '#8a6a3e'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(10, 34); ctx.lineTo(28, 10); ctx.stroke();
      headFn(ctx);
    });
  }
  I.axe = toolIcon((ctx) => {
    ctx.fillStyle = '#9a9a90'; ctx.strokeStyle = '#3a3a34'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(24, 6); ctx.lineTo(34, 10); ctx.lineTo(32, 20); ctx.lineTo(24, 16); ctx.closePath();
    ctx.fill(); ctx.stroke();
  });
  I.pick = toolIcon((ctx) => {
    ctx.strokeStyle = '#5a5a54'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(18, 6); ctx.quadraticCurveTo(28, 2, 36, 12); ctx.stroke();
  });
  I.ironAxe = toolIcon((ctx) => {
    ctx.fillStyle = '#cfd6de'; ctx.strokeStyle = '#4a5058'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(23, 4); ctx.lineTo(35, 9); ctx.lineTo(33, 21); ctx.lineTo(23, 16); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.beginPath(); ctx.moveTo(33, 10); ctx.lineTo(32, 18); ctx.stroke();
  });
  I.ironPick = toolIcon((ctx) => {
    ctx.strokeStyle = '#aab2ba'; ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.moveTo(17, 7); ctx.quadraticCurveTo(28, 1, 37, 12); ctx.stroke();
    ctx.strokeStyle = '#4a5058'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(17, 7); ctx.quadraticCurveTo(28, 1, 37, 12); ctx.stroke();
  });
  I.spear = mk((ctx) => {
    ctx.strokeStyle = '#8a6a3e'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(8, 34); ctx.lineTo(28, 12); ctx.stroke();
    ctx.fillStyle = '#4c4c50'; ctx.strokeStyle = '#17171b'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(26, 14); ctx.lineTo(34, 4); ctx.lineTo(31, 14) ; ctx.closePath();
    ctx.fill(); ctx.stroke();
  });
  I.ironOre = mk((ctx) => {
    ctx.fillStyle = '#7a6a5c'; ctx.strokeStyle = '#3a2e24'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(8, 28); ctx.lineTo(12, 14); ctx.lineTo(24, 10); ctx.lineTo(32, 20); ctx.lineTo(28, 30); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c1552e';
    for (const [x,y] of [[15,20],[23,16],[24,24]]) {
      ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI*2); ctx.fill();
    }
  });
  I.iron = mk((ctx) => {
    ctx.fillStyle = '#a9b0b8'; ctx.strokeStyle = '#4a5058'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(8, 26); ctx.lineTo(14, 16); ctx.lineTo(32, 16); ctx.lineTo(26, 26); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#cfd6de';
    ctx.beginPath(); ctx.moveTo(14, 16); ctx.lineTo(32, 16); ctx.lineTo(30, 12); ctx.lineTo(16, 12); ctx.closePath();
    ctx.fill(); ctx.stroke();
  });
  I.hide = mk((ctx) => {
    ctx.fillStyle = '#a8874f'; ctx.strokeStyle = '#5c451e'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(10, 10); ctx.quadraticCurveTo(20, 4, 30, 10);
    ctx.quadraticCurveTo(34, 20, 30, 30); ctx.quadraticCurveTo(20, 36, 10, 30);
    ctx.quadraticCurveTo(6, 20, 10, 10); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(92,69,30,.6)';
    ctx.beginPath(); ctx.moveTo(14, 16); ctx.lineTo(26, 24); ctx.stroke();
  });
  I.rawMeat = mk((ctx) => {
    ctx.fillStyle = '#d95560'; ctx.strokeStyle = '#7c1522'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(18, 20, 11, 9, 0.4, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f2ead8';
    ctx.beginPath(); ctx.arc(30, 12, 4, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,220,220,.7)';
    ctx.beginPath(); ctx.moveTo(12, 18); ctx.quadraticCurveTo(18, 22, 24, 20); ctx.stroke();
  });
  I.cookedMeat = mk((ctx) => {
    ctx.fillStyle = '#9c5a28'; ctx.strokeStyle = '#4c2a0e'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(18, 20, 11, 9, 0.4, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e8d8b8';
    ctx.beginPath(); ctx.arc(30, 12, 4, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#6e3a12';
    ctx.beginPath(); ctx.moveTo(11, 16); ctx.lineTo(24, 24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(13, 24); ctx.lineTo(24, 15); ctx.stroke();
  });
  I.fish = mk((ctx) => {
    ctx.fillStyle = '#6aa8c4'; ctx.strokeStyle = '#2a5468'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(18, 20, 11, 6, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(28, 20); ctx.lineTo(35, 14); ctx.lineTo(35, 26); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1a2a34';
    ctx.beginPath(); ctx.arc(12, 18, 1.5, 0, Math.PI*2); ctx.fill();
  });
  I.cookedFish = mk((ctx) => {
    ctx.fillStyle = '#c98d4a'; ctx.strokeStyle = '#6e4a14'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(18, 20, 11, 6, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(28, 20); ctx.lineTo(35, 14); ctx.lineTo(35, 26); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#8a5c1a';
    for (const x of [12, 17, 22]) { ctx.beginPath(); ctx.moveTo(x, 16); ctx.lineTo(x + 2, 24); ctx.stroke(); }
  });
  I.rod = mk((ctx) => {
    ctx.strokeStyle = '#8a6a3e'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(8, 34); ctx.quadraticCurveTo(20, 18, 32, 8); ctx.stroke();
    ctx.strokeStyle = '#d8d4c4'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(32, 8); ctx.lineTo(31, 24); ctx.stroke();
    ctx.strokeStyle = '#4c4c50'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(31, 27, 3, -0.5, Math.PI * 0.9); ctx.stroke();
  });
  I.waterskin = mk((ctx) => {
    ctx.fillStyle = '#8a6a3e'; ctx.strokeStyle = '#4a3a1e'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(16, 12); ctx.quadraticCurveTo(6, 20, 12, 30);
    ctx.quadraticCurveTo(20, 36, 28, 30); ctx.quadraticCurveTo(34, 20, 24, 12);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5c451e';
    ctx.fillRect(17, 6, 6, 7); ctx.strokeRect(17, 6, 6, 7);
    ctx.strokeStyle = 'rgba(90,220,240,.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(14, 24); ctx.quadraticCurveTo(20, 28, 26, 24); ctx.stroke();
  });
  I.leatherArmor = mk((ctx) => {
    ctx.fillStyle = '#a8874f'; ctx.strokeStyle = '#5c451e'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(12, 8); ctx.lineTo(28, 8); ctx.lineTo(32, 14); ctx.lineTo(29, 18);
    ctx.lineTo(28, 34); ctx.lineTo(12, 34); ctx.lineTo(11, 18); ctx.lineTo(8, 14); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(92,69,30,.8)';
    ctx.beginPath(); ctx.moveTo(20, 8); ctx.lineTo(20, 34); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(15, 14); ctx.lineTo(25, 14); ctx.stroke();
  });
  I.lantern = mk((ctx) => {
    ctx.strokeStyle = '#4a4a44; '; ctx.strokeStyle = '#4a4a44'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(20, 8, 4, Math.PI, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(177,60,255,.25)'; ctx.strokeStyle = '#3a3a34';
    ctx.beginPath(); ctx.moveTo(13, 12); ctx.lineTo(27, 12); ctx.lineTo(29, 32) ; ctx.lineTo(11, 32); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#b13cff';
    ctx.beginPath(); ctx.moveTo(20, 16); ctx.lineTo(24, 22); ctx.lineTo(20, 28); ctx.lineTo(16, 22); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(240,210,255,.9)';
    ctx.beginPath(); ctx.arc(20, 22, 2, 0, Math.PI*2); ctx.fill();
  });
  I.darkBlade = mk((ctx) => {
    ctx.fillStyle = '#3a2a54'; ctx.strokeStyle = '#1a1028'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(10, 30); ctx.lineTo(26, 6); ctx.lineTo(30, 10); ctx.lineTo(14, 34); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#b13cff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(13, 29); ctx.lineTo(27, 9); ctx.stroke();
    ctx.strokeStyle = '#8a6a3e'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(8, 36); ctx.lineTo(12, 30); ctx.stroke();
    ctx.strokeStyle = '#4c4c50'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(8, 28); ctx.lineTo(16, 34); ctx.stroke();
  });
  I.jangseung = mk((ctx) => {
    ctx.fillStyle = '#6e5230'; ctx.strokeStyle = '#33240e'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(14, 36); ctx.lineTo(15, 10); ctx.quadraticCurveTo(20, 5, 25, 10); ctx.lineTo(26, 36); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#4a3620';
    ctx.beginPath(); ctx.ellipse(20, 9, 9, 3.5, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f2ead8';
    ctx.beginPath(); ctx.arc(17, 17, 2.5, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(23, 17, 2.5, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1a120a';
    ctx.beginPath(); ctx.arc(17, 17, 1, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(23, 17, 1, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#33240e'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(15, 26); ctx.lineTo(25, 26); ctx.stroke();
    for (const x of [17, 20, 23]) { ctx.beginPath(); ctx.moveTo(x, 24); ctx.lineTo(x, 28); ctx.stroke(); }
  });
  I.brazier = mk((ctx) => {
    ctx.fillStyle = '#6e6e64'; ctx.strokeStyle = '#26241f'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(15, 36); ctx.lineTo(25, 36); ctx.lineTo(23, 28); ctx.lineTo(17, 28); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(6, 20); ctx.quadraticCurveTo(20, 32, 34, 20);
    ctx.lineTo(32, 17); ctx.quadraticCurveTo(20, 26, 8, 17); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8a3cd9';
    ctx.beginPath(); ctx.moveTo(20, 18); ctx.quadraticCurveTo(13, 10, 20, 2);
    ctx.quadraticCurveTo(22, 8, 27, 9); ctx.quadraticCurveTo(26, 15, 20, 18); ctx.fill();
    ctx.fillStyle = '#e8c8ff'; ctx.beginPath(); ctx.arc(21, 10, 2.5, 0, Math.PI*2); ctx.fill();
  });
  I.starHeart = mk((ctx) => {
    const g = ctx.createRadialGradient(20, 20, 2, 20, 20, 14);
    g.addColorStop(0, '#e8f4ff'); g.addColorStop(0.5, '#59d5e8'); g.addColorStop(1, '#16121e');
    ctx.fillStyle = g; ctx.strokeStyle = '#0a0812'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 - Math.PI / 2;
      const rr = i % 2 === 0 ? 14 : 7;
      const x = 20 + Math.cos(a) * rr, y = 20 + Math.sin(a) * rr;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.beginPath(); ctx.arc(20, 20, 3, 0, Math.PI*2); ctx.fill();
  });
  I.field = mk((ctx) => {
    ctx.fillStyle = '#6b5537'; ctx.strokeStyle = '#3c2c16'; ctx.lineWidth = 2;
    diamond(ctx, 20, 22, 30, 16); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#7fb04a'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (const [x, y] of [[14, 20], [22, 18], [24, 26]]) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.lineTo(x - 3, y - 6); ctx.stroke();
    }
  });
  // 구조물 아이콘
  I.campfire = mk((ctx) => {
    ctx.strokeStyle = '#4a3620'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(8, 34); ctx.lineTo(32, 28); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, 28); ctx.lineTo(30, 34); ctx.stroke();
    ctx.fillStyle = '#ff8a1f';
    ctx.beginPath(); ctx.moveTo(20, 28); ctx.quadraticCurveTo(12, 18, 20, 6);
    ctx.quadraticCurveTo(22, 14, 28, 16); ctx.quadraticCurveTo(28, 24, 20, 28); ctx.fill();
    ctx.fillStyle = '#ffc93d'; ctx.beginPath(); ctx.arc(21, 20, 4, 0, Math.PI*2); ctx.fill();
  });
  I.furnace = mk((ctx) => {
    ctx.fillStyle = '#6a655c'; ctx.strokeStyle = '#26241f'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(8, 34); ctx.quadraticCurveTo(8, 10, 20, 8);
    ctx.quadraticCurveTo(32, 10, 32, 34); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1a120a';
    ctx.beginPath(); ctx.moveTo(15, 34); ctx.quadraticCurveTo(15, 22, 20, 21);
    ctx.quadraticCurveTo(25, 22, 25, 34); ctx.closePath(); ctx.fill();
  });
  I.bed = mk((ctx) => {
    ctx.fillStyle = '#b3a25e'; ctx.strokeStyle = '#5c5124'; ctx.lineWidth = 2;
    diamond(ctx, 20, 22, 30, 16); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8f7f42'; diamond(ctx, 13, 19, 10, 6); ctx.fill(); ctx.stroke();
  });
  SPR.icons = I;
}

// ---- 플레이어 / 몬스터 (동적 드로잉) ----
function drawPlayer(ctx, x, y, t, flip, swing) {
  ctx.save(); ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  const bob = Math.sin(t * 10) * 1.5;
  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath(); ctx.ellipse(0, 0, 10, 5, 0, 0, Math.PI*2); ctx.fill();
  ctx.translate(0, bob);
  // 다리
  ctx.strokeStyle = '#c98d5f'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  const step = Math.sin(t * 10) * 3;
  ctx.beginPath(); ctx.moveTo(-3, -12); ctx.lineTo(-3 - step, -2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(3, -12); ctx.lineTo(3 + step, -2); ctx.stroke();
  // 몸통(가죽옷)
  ctx.fillStyle = '#a8874f'; ctx.strokeStyle = '#4a3a1e'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-7, -26); ctx.lineTo(7, -26); ctx.lineTo(9, -10); ctx.lineTo(-9, -10); ctx.closePath();
  ctx.fill(); ctx.stroke();
  // 팔
  ctx.strokeStyle = '#d69a68'; ctx.lineWidth = 4;
  const armA = swing ? -1.2 + swing * 2.2 : 0.3 + Math.sin(t * 10) * 0.25;
  ctx.beginPath(); ctx.moveTo(7, -24);
  ctx.lineTo(7 + Math.cos(armA) * 10, -24 + Math.sin(armA) * 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-7, -24); ctx.lineTo(-9, -14); ctx.stroke();
  // 머리
  ctx.fillStyle = '#d69a68';
  ctx.beginPath(); ctx.arc(0, -33, 8, 0, Math.PI*2); ctx.fill();
  // 머리카락(덥수룩)
  ctx.fillStyle = '#241a10';
  ctx.beginPath(); ctx.arc(0, -36, 8.5, Math.PI * 0.95, Math.PI * 2.08); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-2, -40, 9, 5, -0.2, 0, Math.PI*2); ctx.fill();
  // 눈
  ctx.fillStyle = '#1a120a';
  ctx.beginPath(); ctx.arc(3.5, -32, 1.2, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawMob(ctx, x, y, t, hpRatio) {
  ctx.save(); ctx.translate(x, y);
  const wob = Math.sin(t * 6) * 2;
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath(); ctx.ellipse(0, 0, 11, 5, 0, 0, Math.PI*2); ctx.fill();
  ctx.translate(0, -14 + wob);
  // 어둠 몸체
  const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 16);
  g.addColorStop(0, 'rgba(90,30,140,.95)');
  g.addColorStop(1, 'rgba(20,5,40,.85)');
  ctx.fillStyle = g;
  ctx.beginPath();
  for (let a = 0; a < Math.PI*2; a += Math.PI/6) {
    const rr = 13 + Math.sin(a * 3 + t * 5) * 2.5;
    const px = Math.cos(a) * rr, py = Math.sin(a) * rr * 0.9;
    a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill();
  // 눈
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-4, -2, 2.4, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(4, -2, 2.4, 0, Math.PI*2); ctx.fill();
  // HP 바
  if (hpRatio < 1) {
    ctx.fillStyle = '#000'; ctx.fillRect(-12, -22, 24, 4);
    ctx.fillStyle = '#d9273a'; ctx.fillRect(-11, -21, 22 * hpRatio, 2);
  }
  ctx.restore();
}

function drawRabbit(ctx, x, y, t, hpRatio, flip) {
  ctx.save(); ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath(); ctx.ellipse(0, 0, 8, 4, 0, 0, Math.PI*2); ctx.fill();
  const hop = Math.abs(Math.sin(t * 8)) * 4;
  ctx.translate(0, -hop);
  // 몸통
  ctx.fillStyle = '#cfc4b0'; ctx.strokeStyle = '#6e6250'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(0, -8, 8, 6, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  // 머리
  ctx.beginPath(); ctx.arc(7, -13, 4.5, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  // 귀
  ctx.beginPath(); ctx.ellipse(6, -20, 1.6, 5, -0.15, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(9, -20, 1.6, 5, 0.15, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  // 꼬리 & 눈
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-8, -8, 2.5, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#1a120a';
  ctx.beginPath(); ctx.arc(8.5, -14, 1, 0, Math.PI*2); ctx.fill();
  if (hpRatio < 1) {
    ctx.fillStyle = '#000'; ctx.fillRect(-10, -28, 20, 3);
    ctx.fillStyle = '#d9273a'; ctx.fillRect(-9, -27.4, 18 * hpRatio, 1.8);
  }
  ctx.restore();
}

function drawBoar(ctx, x, y, t, hpRatio, flip, angry) {
  ctx.save(); ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath(); ctx.ellipse(0, 0, 12, 5, 0, 0, Math.PI*2); ctx.fill();
  const trot = Math.sin(t * 9) * 1.5;
  ctx.translate(0, trot * 0.5);
  // 다리
  ctx.strokeStyle = '#3c2c1a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-6, -8); ctx.lineTo(-6 - trot, -1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(5, -8); ctx.lineTo(5 + trot, -1); ctx.stroke();
  // 몸통
  ctx.fillStyle = '#5c4630'; ctx.strokeStyle = '#2c1e10'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(-1, -13, 11, 8, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  // 갈기
  ctx.strokeStyle = '#3c2c1a'; ctx.lineWidth = 2;
  for (let i = -8; i < 6; i += 3) {
    ctx.beginPath(); ctx.moveTo(i, -20); ctx.lineTo(i - 1, -23); ctx.stroke();
  }
  // 머리 + 코
  ctx.fillStyle = '#6e5238';
  ctx.beginPath(); ctx.ellipse(10, -12, 6, 5.5, 0.2, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#8a6a4a';
  ctx.beginPath(); ctx.ellipse(15, -10, 3, 2.5, 0.2, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  // 엄니
  ctx.strokeStyle = '#f2ead8'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(13, -8); ctx.quadraticCurveTo(15, -5, 18, -6); ctx.stroke();
  // 눈
  ctx.fillStyle = angry ? '#ff3838' : '#1a120a';
  ctx.beginPath(); ctx.arc(11, -14, 1.3, 0, Math.PI*2); ctx.fill();
  if (hpRatio < 1) {
    ctx.fillStyle = '#000'; ctx.fillRect(-12, -30, 24, 4);
    ctx.fillStyle = '#d9273a'; ctx.fillRect(-11, -29, 22 * hpRatio, 2);
  }
  ctx.restore();
}

function drawWolf(ctx, x, y, t, hpRatio, flip) {
  ctx.save(); ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.fillStyle = 'rgba(0,0,0,.4)';
  ctx.beginPath(); ctx.ellipse(0, 0, 13, 5, 0, 0, Math.PI*2); ctx.fill();
  const lope = Math.sin(t * 10) * 2;
  // 다리
  ctx.strokeStyle = '#141020'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-7, -9); ctx.lineTo(-7 - lope, -1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(6, -9); ctx.lineTo(6 + lope, -1); ctx.stroke();
  // 몸통 (어둠에 잠긴)
  const g = ctx.createLinearGradient(0, -24, 0, -6);
  g.addColorStop(0, '#241a3c'); g.addColorStop(1, '#0e0a1c');
  ctx.fillStyle = g; ctx.strokeStyle = '#050310'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(-1, -14, 12, 7, -0.08, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  // 꼬리
  ctx.strokeStyle = '#241a3c'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-12, -16); ctx.quadraticCurveTo(-18, -20 + lope, -20, -14); ctx.stroke();
  // 머리
  ctx.fillStyle = '#1c1430';
  ctx.beginPath(); ctx.moveTo(8, -20); ctx.lineTo(19, -14); ctx.lineTo(9, -10); ctx.closePath(); ctx.fill(); ctx.stroke();
  // 귀
  ctx.beginPath(); ctx.moveTo(8, -20); ctx.lineTo(7, -26); ctx.lineTo(11, -21); ctx.closePath(); ctx.fill(); ctx.stroke();
  // 붉은 눈
  ctx.fillStyle = '#ff2f4a';
  ctx.beginPath(); ctx.arc(11.5, -16.5, 1.6, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = 'rgba(255,47,74,.35)';
  ctx.beginPath(); ctx.arc(11.5, -16.5, 3.2, 0, Math.PI*2); ctx.fill();
  if (hpRatio < 1) {
    ctx.fillStyle = '#000'; ctx.fillRect(-13, -32, 26, 4);
    ctx.fillStyle = '#d9273a'; ctx.fillRect(-12, -31, 24 * hpRatio, 2);
  }
  ctx.restore();
}

function initSprites() { makeTiles(); makeObjects(); makeStructs(); makeIcons(); }
