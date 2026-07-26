// ===== 절차적 픽셀 스프라이트 (전부 코드로 그린 오리지널 도트 아트) =====
'use strict';

const TW = 64, TH = 32; // isometric tile size
const PXS = 4;          // 1도트 = 4px

function mkCanvas(w, h, fn) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  fn(ctx, w, h);
  return c;
}
function srand(seed) {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

// 픽셀맵 그리기: 문자열 지도 + 팔레트
function drawPix(ctx, map, pal, x, y, s) {
  const rows = map.trim().split('\n');
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      const col = pal[rows[r][c]];
      if (col) { ctx.fillStyle = col; ctx.fillRect(x + c * s, y + r * s, s, s); }
    }
  }
}
// 픽셀맵 → 지정 크기 캔버스 (가로 중앙, 바닥 정렬, 자동 외곽선)
function pxSpr(w, h, map, pal, s = PXS, mb = 4, outline = true) {
  const rows = map.trim().split('\n');
  const mw = Math.max(...rows.map(r => r.length)) * s;
  const mh = rows.length * s;
  return mkCanvas(w, h, (ctx) => {
    const ox = ((w - mw) / 2) | 0, oy = h - mh - mb;
    if (outline) {
      // 실루엣 주변 1도트 어두운 테두리 → 배경 위에서 또렷해진다
      const filled = (r, c) => !!(rows[r] && pal[rows[r][c]]);
      ctx.fillStyle = 'rgba(22,18,10,.85)';
      for (let r = -1; r <= rows.length; r++) {
        const len = Math.max(...rows.map(x => x.length));
        for (let c = -1; c <= len; c++) {
          if (filled(r, c)) continue;
          if (filled(r-1,c) || filled(r+1,c) || filled(r,c-1) || filled(r,c+1)) {
            ctx.fillRect(ox + c * s, oy + r * s, s, s);
          }
        }
      }
    }
    drawPix(ctx, map, pal, ox, oy, s);
  });
}
// 40x40 아이콘 (10x10 도트)
function pxIcon(map, pal) {
  return mkCanvas(40, 40, (ctx) => {
    const rows = map.trim().split('\n');
    const mw = Math.max(...rows.map(r => r.length)) * 4;
    const mh = rows.length * 4;
    drawPix(ctx, map, pal, ((40 - mw) / 2) | 0, ((40 - mh) / 2) | 0, 4);
  });
}

const SPR = {};

/* ================= 타일 (플랫 바탕 + 수작업 도트 데코) ================= */
// 진짜 픽셀아트 방식: 평평한 단색 다이아몬드 + 손으로 찍은 데코 몇 개.
// 랜덤 노이즈가 아니라서 화면이 차분하고, 오브젝트(4px 도트)와 밀도가 맞는다.
const TILE_BASE = { grass:'#3e6330', snow:'#dce3ed', swamp:'#47512d', water:'#3f9cc9', dirt:'#6b5537' };
function decoTile(base, decos) {
  return mkCanvas(TW, TH, (ctx) => {
    // 1px 확장해 이웃 타일과 겹침 → 안티앨리어싱 이음선 제거
    ctx.beginPath();
    ctx.moveTo(TW/2, -1.5); ctx.lineTo(TW + 1.5, TH/2); ctx.lineTo(TW/2, TH + 1.5); ctx.lineTo(-1.5, TH/2);
    ctx.closePath();
    ctx.fillStyle = base; ctx.fill();
    // 4px 도트 데코 (16x8 그리드, 다이아 안쪽만)
    for (const [dx, dy, c] of decos) {
      const cx = (dx + 0.5 - 8) / 8, cy = (dy + 0.5 - 4) / 4;
      if (Math.abs(cx) + Math.abs(cy) <= 0.88) {
        ctx.fillStyle = c;
        ctx.fillRect(dx * 4, dy * 4, 4, 4);
      }
    }
  });
}
function makeTiles() {
  const gD = '#2e4d22', gL = '#548038', fW = '#dce8c8';   // 풀 어두움/밝음/들꽃
  SPR.grass = [
    decoTile(TILE_BASE.grass, [[5,3,gD],[6,3,gL],[10,5,gD],[3,5,gD],[12,3,gL]]),
    decoTile(TILE_BASE.grass, [[8,2,gD],[9,2,gL],[4,4,gD],[11,5,gD],[6,6,gL]]),
    decoTile(TILE_BASE.grass, [[7,5,gD],[12,4,gD],[3,3,gL],[9,6,gD]]),
    decoTile(TILE_BASE.grass, [[6,4,gD],[7,4,gL],[10,2,gD],[4,6,gD],[11,6,fW]]),
  ];
  const wL = '#77c8e4', wD = '#2f86b4';
  SPR.water = [
    decoTile(TILE_BASE.water, [[4,3,wL],[5,3,wL],[10,5,wL],[11,5,wL],[8,2,wD],[6,6,wD]]),
    decoTile(TILE_BASE.water, [[6,4,wL],[7,4,wL],[12,3,wL],[13,3,wL],[4,6,wD],[10,2,wD]]),
  ];
  SPR.dirt = [decoTile(TILE_BASE.dirt, [[5,3,'#57452b'],[10,5,'#57452b'],[8,4,'#7d6540'],[4,6,'#57452b']])];
  const sS = '#c2cdd9', sW = '#f7fafc';                    // 눈 그림자/반짝임
  SPR.snow = [
    decoTile(TILE_BASE.snow, [[5,4,sS],[6,4,sS],[11,3,sS],[9,6,sW],[3,3,sW]]),
    decoTile(TILE_BASE.snow, [[8,3,sS],[9,3,sS],[4,5,sS],[12,5,sW],[6,2,sS]]),
  ];
  const mD = '#37401f', mL = '#5c6836', mP = '#3f6a58';    // 늪 어두움/갈대/물웅덩이
  SPR.swamp = [
    decoTile(TILE_BASE.swamp, [[5,3,mD],[6,3,mL],[10,5,mP],[11,5,mP],[3,5,mD]]),
    decoTile(TILE_BASE.swamp, [[8,2,mL],[4,4,mD],[11,3,mD],[7,6,mP],[12,4,mL]]),
  ];
  // 동굴 바닥/벽
  SPR.caveFloor = [
    decoTile('#3a352e', [[5,3,'#2c2822'],[10,5,'#463f36'],[8,4,'#2c2822'],[4,6,'#463f36']]),
    decoTile('#3a352e', [[7,2,'#463f36'],[11,4,'#2c2822'],[4,4,'#2c2822'],[9,6,'#463f36']]),
  ];
  SPR.caveWall = pxSpr(64, 58, `
...ssSSSSss...
..sSSSLSSSSs..
.sSSSSSSSsSSs.
sSSsSSSSSSSSSs
sSSSSSLsSSSSSs
sSSSSSSSSSsSSs
.sSsSSSSSSSSs.
..ssSSSsSSss..`,
    { s: '#26221c', S: '#332e26', L: '#443d32' }, PXS, 0, false);
}

/* ================= 팔레트 ================= */
const C = {
  hair: '#241a10', skin: '#d69a68', skinD: '#b57e52', eye: '#1a120a',
  cloth: '#a8874f', clothD: '#8a6a3e', wood: '#6e5230', woodD: '#4a3620', woodL: '#8a6a3e',
  leafD: '#1e3d22', leaf: '#2d5733', leafL: '#3d6b42',
  rock: '#8a8a7e', rockD: '#5c5c54', rockL: '#a0a094',
  flintC: '#4c4c50', flintL: '#6e6e74',
  fireY: '#fff3b8', fireO: '#ffc93d', fireR: '#ff8a1f',
  purp: '#8a3cd9', purpL: '#c46bff', purpP: '#f0dcff', purpD: '#3c1a5c',
  berry: '#e03b4e', green: '#7fb04a', greenD: '#3f6527',
  iron: '#a9b0b8', ironL: '#cfd6de', ironD: '#4a5058',
  bone: '#f2ead8', boneD: '#8f8b7c',
};

/* ================= 월드 오브젝트 ================= */
const TREE_MAP = `
........g........
.......gGg.......
......gGGGg......
.....gGGGGLg.....
.......gGg.......
......gGGLg......
.....gGGGGGg.....
....gGGgGGGLg....
...gGGGGGGGGGg...
......gGGGg......
.....gGGGGLg.....
....gGGgGGGGg....
...gGGGGGGgGLg...
..gGGGGGGGGGGGg..
.gGGgGGGGGGGGGLg.
........T........
........T........
........T........
.......TTT.......`;

function makeObjects() {
  SPR.tree = pxSpr(72, 100, TREE_MAP,
    { G: C.leaf, g: C.leafD, L: C.leafL, T: C.woodD }, PXS, 6);
  // 눈 덮인 나무 (설원) — 같은 실루엣, 눈 팔레트
  SPR.treeSnow = pxSpr(72, 100, TREE_MAP,
    { G: '#2a4a3c', g: '#1c3428', L: '#eaf0f6', T: C.woodD }, PXS, 6);

  SPR.bush = pxSpr(56, 44, `
.g..G..g...
g.G.g.L.g.g
.gG.Gg.G.g.
g.g.GLg.g..
.G.gGg.G.g.
..g.G.g.g..`,
    { G: '#4a7332', g: '#2c4a1e', L: '#5d8a40' }, PXS, 2);

  SPR.rock = pxSpr(64, 52, `
....rrrr....
..rrRLRRr...
.rRRRrRRRr..
rRLRRRRrRRr.
rRrRRRRRRRr.
.rrrrrrrrr..`,
    { R: C.rock, r: C.rockD, L: C.rockL }, PXS, 4);

  SPR.twig = pxSpr(40, 24, `
......tT
....tT..
..t.T...
.tTt....
tT......`,
    { T: C.wood, t: C.woodL }, PXS, 2);

  SPR.flint = pxSpr(36, 22, `
...ff..
..fFLf.
.fFFff.
.ffFf..`,
    { F: C.flintC, f: '#2c2c30', L: C.flintL }, PXS, 1);

  SPR.pebble = pxSpr(36, 22, `
..rr..R.
.rRLr.RR
.rrrr.r.`,
    { R: C.rock, r: C.rockD, L: C.rockL }, PXS, 1);

  SPR.berry = pxSpr(48, 40, `
..gGGg...
.GRgGRGg.
gGGRgGLg.
.gRgGRg..
..gGg....`,
    { G: C.greenD, g: '#2c4a1e', R: C.berry, L: '#4d7a30' }, PXS, 2);

  SPR.bean = pxSpr(44, 40, `
....g...
.P..g.P.
..g.gg..
.P.gg...
...g....
...g....`,
    { g: C.greenD, P: C.green }, PXS, 2);

  SPR.nest = pxSpr(48, 32, `
..tttttt..
.tEEtTEEt.
tEEtttEEtt
.tttttttt.`,
    { t: C.wood, T: C.woodD, E: C.bone }, PXS, 2);

  SPR.mushroom = pxSpr(44, 32, `
..RRRR....
.RRWRRR.r.
.RWRRWR.rr
...ss..s..
...ss..s..`,
    { R: '#c1552e', W: '#f2ead8', r: '#a8451f', s: '#e0d4b8' }, PXS, 2);

  SPR.herb = pxSpr(40, 30, `
.W..g..W.
..g.g.g..
.g.ggg.g.
....g....
....g....`,
    { g: '#4d7a30', W: '#e8e0f4' }, PXS, 2);

  SPR.snowBerry = pxSpr(48, 36, `
..gBGg...
.GBgGBGg.
gGGBgGGg.
.gBgGBg..
..gGg....`,
    { G: '#3c5a4a', g: '#2a4438', B: '#9ec8e8' }, PXS, 2);

  SPR.goldRock = pxSpr(64, 52, `
....rrrr....
..rrRoRRr...
.rRRRrRoRr..
rRoRRRRrRRr.
rRrRRoRRRRr.
.rrrrrrrrr..`,
    { R: C.rock, r: C.rockD, o: '#e8b830' }, PXS, 4);

  // 어둠 수정 (동굴)
  SPR.crystal = pxSpr(52, 48, `
....p.....
...pP..p..
..pPPp.Pp.
..pPLp.Pp.
.ppPPppPpp
.rPPPPPPr.
..rrrrrr..`,
    { P: C.purp, p: '#5c1a8c', L: C.purpP, r: C.rockD }, PXS, 2);

  // 동굴 입구 (지상)
  SPR.caveEntrance = pxSpr(80, 70, `
.....ssssssss.....
...ssSSSSSSSSss...
..sSSSSSLSSSSSSs..
.sSSSS______SSSSs.
.sSSS________SSSs.
sSSSS________SSSSs
sSSS__________SSSs
sSSS__________SSSs
.gg.__________.gg.`,
    { s: '#26221c', S: '#4a453c', L: '#5c554a', _: '#0a0806', g: '#2e4d22' }, PXS, 2);

  // 동굴 출구 (빛기둥 사다리)
  SPR.exitBeam = pxSpr(56, 74, `
...LLLLL...
...LlllL...
...LlllL...
...LlllL...
...LlllL...
...LlllL...
...LlllL...
..tLlllLt..
..tttttttt.`,
    { L: 'rgba(255,240,180,.35)', l: 'rgba(255,246,214,.55)', t: C.wood }, PXS, 2, false);

  // 심연의 문
  SPR.bossDoor = pxSpr(72, 84, `
..ppppppppppp..
.pkkkkkkkkkkkp.
pkkgkkkkkkkgkkp
pkkkkkgggkkkkkp
pkkkkgkkkgkkkkp
pkkkkgkOkgkkkkp
pkkkkgkkkgkkkkp
pkkkkkgggkkkkkp
pkkgkkkkkkkgkkp
pkkkkkkkkkkkkkp
pkkkkkkkkkkkkkp
.ppppppppppppp.`,
    { p: '#241e30', k: '#16121e', g: C.purp, O: C.purpL }, PXS, 2);
}

/* ================= 구조물 ================= */
function makeStructs() {
  SPR.campfire = pxSpr(56, 48, `
..s......s..
T.TTTTTTTT.T
.TTTtTTtTT..
s..TTTTTT..s`,
    { T: C.woodD, t: C.wood, s: C.rockD }, PXS, 4);

  const flamePal = { Y: C.fireY, O: C.fireO, R: C.fireR };
  SPR.flame = [`
....Y....
...YYO...
..YOOOY..
..OOROO..
.OORRROO.
.ORRRRRO.
..RRRRR..`, `
..Y......
...YO.Y..
..YOOOY..
.OOROOO..
.OORRROO.
..RRRRRO.
..RRRRR..`, `
......Y..
..Y.OY...
...OOOY..
..OOROOO.
.OORRROO.
.ORRRRRR.
..RRRRR..`,
  ].map(m => pxSpr(40, 44, m, flamePal, PXS, 2, false));

  SPR.furnace = pxSpr(64, 60, `
...ssssss...
..sSSSLSSs..
.sSSSSSSSSs.
.sSSsSSsSSs.
.sSLSSSSSSs.
.sSSS__SSSs.
.sSS____SSs.
.sSS____SSs.
.sSSs__sSSs.`,
    { S: '#6a655c', s: '#3c3830', L: '#7e7970', _: '#1a120a' }, PXS, 4);

  SPR.bed = pxSpr(64, 40, `
.....mm......
...mmMMmm....
.mmPpMMMMmm..
mmPPpMMMtMMm.
.mmPpMMMMmm..
...mmMMmm....
.....mm......`,
    { M: '#b3a25e', m: '#8f7f42', t: '#9c8c50', P: '#8f7f42', p: '#c9b46a' }, PXS, 2);

  SPR.field = pxSpr(64, 40, `
......dd......
....ddDDdd....
..ddDDddDDdd..
ddDDddDDddDDdd
..ddDDddDDdd..
....ddDDdd....
......dd......`,
    { d: '#6b5537', D: '#54432a' }, PXS, 2);

  SPR.sprout = [
    pxSpr(24, 24, `
.p.p.
..p..
..p..`, { p: C.green }, PXS, 2),
    pxSpr(28, 34, `
.P..p.
p.PP..
..P.p.
.PP...
..P...
..P...`, { P: C.green, p: C.greenD }, PXS, 2),
  ];

  SPR.jangseung = pxSpr(40, 76, `
.HHHHHHHH.
HHHHHHHHHH
..tttttt..
..tEttEt..
..tetset..
..ttnntt..
..tMMMMt..
..ttmmtt..
..tttttt..
..t====t..
..tttttt..
..t-tt-t..
..tttttt..
..tttttt..
..t-tt-t..
..tttttt..
..tttttt..
..tttttt..`,
    { H: C.woodD, t: C.wood, E: C.bone, e: C.eye, s: C.eye, n: C.woodD,
      M: C.bone, m: C.woodD, '=': C.woodD, '-': C.woodD }, PXS, 2);

  SPR.brazier = pxSpr(48, 56, `
.ssssssssss.
s.sSSSSSSs.s
..ssssssss..
.....ss.....
....ssss....
...ssssss...`,
    { s: C.rockD, S: '#6e6e64' }, PXS, 4);

  const bfPal = { Y: C.purpP, O: C.purpL, R: C.purp };
  SPR.brazierFlame = [`
...Y...
..YYO..
.YOOOY.
.OOROO.
.ORRRO.
..RRR..`, `
.Y.....
..YO.Y.
.YOOOY.
.OOROO.
.ORRRO.
..RRR..`, `
.....Y.
.Y.OY..
..OOOY.
.OOROO.
.ORRRO.
..RRR..`,
  ].map(m => pxSpr(32, 34, m, bfPal, PXS, 2, false));

  // ---- 유적 ----
  SPR.dolmen = pxSpr(84, 72, `
....ccccccccccccc....
..ccccccccccccccccc..
.ccCCCLCCCCCCCCCCCcc.
.ccCCCCCCoCCCCLCCcc..
..ccccccccccccccccc..
....cc.........cc....
...rRRr........rRRr..
...rRLr........rRRr..
...rRRr........rRLr..
...rRRr........rRRr..
...rRRr........rRRr..
...rrrrr......rrrrr..`,
    { c: '#5c5c54', C: '#8a8a7e', L: '#a0a094', o: '#3a3a34', R: '#72726a', r: '#4a4a44' }, PXS, 4);

  SPR.chamber = pxSpr(88, 78, `
......ssssssssss......
....ssSSSSSSLSSSss....
...sSSSSSSSSSSSSSSs...
..sSSSSsSSSSSSsSSSSs..
..sSSLSSSSSSSSSSSSSs..
..sSSS________SSSSs...
..sSSS________SSSs....
..sSSS________SSSss...
..sSS_________SSSLs...
.ssSSS________SSSss...
.sSSSS________SSSSs...
..ssssss____sssssss...
..rr.ss..__..ss..rr...`,
    { s: '#3c3830', S: '#6a6a60', L: '#7e7e72', _: '#0c0a08', r: '#5c5c54' }, PXS, 4);

  // 어둠의 제단 (룬이 새겨진 돌 제단)
  SPR.altar = pxSpr(64, 60, `
....gg....gg....
.ssssssssssssss.
sSSSSSgSSgSSSSSs
.ssssssssssssss.
....sSSSSSSs....
....sSSgSSSs....
....sSSSSSSs....
....sSSSSSSs....
..ssssssssssss..
.sSSSSSSSSSSSSs.
.ssssssssssssss.`,
    { s: '#2c2834', S: '#4a4456', g: '#8a3cd9' }, PXS, 4);

  SPR.obelisk = pxSpr(56, 110, `
....PP....
...pkkp...
...pkkp...
..pkkkkp..
..pkkkkp..
..pkgkkp..
..pkkkkp..
..pkkgkp..
..pkkkkp..
..pkgkkp..
..pkkkkp..
..pkkkkp..
..pkggkp..
..pkkkkp..
..pkkkkp..
..pkgkkp..
..pkkkkp..
..pkkkkp..
..pkkkkp..
..pkkkkp..
.bbbbbbbb.
bbbbbbbbbb`,
    { P: '#3c3450', p: '#241e30', k: '#16121e', g: C.purp, b: '#241e30' }, PXS, 4);
}

/* ================= 아이템 아이콘 (10x10 도트) ================= */
function makeIcons() {
  const I = {};
  I.grass = pxIcon(`
..g....G..
.g.g..g...
.G.g..g.G.
.g.gG.g.g.
..g.g.gg..
.g..gg.g..
..g.g..g..
...gg.g...
....gg....`, { g: C.green, G: C.greenD });
  I.twig = pxIcon(`
.......tt.
......tT..
.....tT...
...tT.T...
....Tt....
...Tt.....
..tT......
.tT.......`, { T: C.wood, t: C.woodL });
  I.log = pxIcon(`
..........
..LLLLLLl.
.LWWWWWWll
.LWwwWWWlL
.LWWWWWWll
..LLLLLLl.
..........`, { L: '#7a5c34', l: '#5c4426', W: '#c9a86a', w: '#8a6a3e' });
  I.stone = pxIcon(`
...rrrr...
..rRRLRr..
.rRRRRRRr.
.rRLRRRRr.
.rRRRRRLr.
..rrrrrr..`, { R: C.rock, r: C.rockD, L: C.rockL });
  I.flint = pxIcon(`
....ff....
...fFLf...
..fFFFf...
..fFLff...
.fFFFf....
.ffff.....`, { F: C.flintC, f: '#2c2c30', L: C.flintL });
  I.ironOre = pxIcon(`
...rrrr...
..rRRoRr..
.rRoRRRRr.
.rRRRoRRr.
.rRoRRRRr.
..rrrrrr..`, { R: '#7a6a5c', r: '#3a2e24', o: '#c1552e' });
  I.iron = pxIcon(`
..........
..lllllll.
.lLLLLLLl.
.lIIIIIIl.
.lIIIIIll.
..lllll...`, { l: C.ironD, L: C.ironL, I: C.iron });
  I.hide = pxIcon(`
.hh....hh.
hHHhhhhHHh
.hHHHHHHh.
.hHHhHHHh.
.hHHHHHHh.
hHHhhhhHHh
.hh....hh.`, { H: '#a8874f', h: '#5c451e' });
  I.berry = pxIcon(`
....gg....
...g......
..RR..RR..
.RrRR.RrR.
..RR...RR.
...RR.RR..
....RR....`, { R: C.berry, r: '#f28a96', g: C.greenD });
  I.bean = pxIcon(`
...g......
.P.g......
PpP.g..P..
.P..gg.pP.
....g..P..
..P.g.....
.pP.g.....
..P.......`, { P: C.green, p: '#a8d474', g: C.greenD });
  I.egg = pxIcon(`
...EEE....
..EEEEe...
.EEEEEEe..
.EEeEEEe..
.EEEEEEe..
..EEEEe...
...EEe....`, { E: C.bone, e: C.boneD });
  I.rawMeat = pxIcon(`
.......BB.
.MMMM.BB..
MMmmMMM...
MmMMMMM...
MMMMmMM...
.MMMMM....`, { M: '#d95560', m: '#f2a2aa', B: C.bone });
  I.fish = pxIcon(`
..........
..FFFF..F.
.FeFFFFFF.
.FFFFFFFF.
..FFFF..F.
..........`, { F: '#6aa8c4', e: '#1a2a34' });
  I.shard = pxIcon(`
....P.....
...PPp....
..PPPPp...
..PPpPp...
...PPp....
...PPp....
....P.....`, { P: C.purp, p: C.purpL });
  I.torch = pxIcon(`
.....YY...
....YOO...
....ORR...
.....R....
....TT....
...TT.....
..TT......
.TT.......`, { Y: C.fireY, O: C.fireO, R: C.fireR, T: C.wood });
  I.lantern = pxIcon(`
....hh....
...h..h...
..pppppp..
..pkPPkp..
..pPPPPp..
..pkPPkp..
..pppppp..
...pppp...`, { h: '#4a4a44', p: '#3a3a34', k: '#16121e', P: C.purpL });
  I.axe = pxIcon(`
....AAa...
...AAAAa..
...AAaa...
....Ta....
...TT.....
..TT......
.TT.......
TT........`, { A: C.rock, a: C.rockD, T: C.woodL });
  I.pick = pxIcon(`
...ppPP...
..p...PP..
.p.....P..
....T..P..
...TT.....
..TT......
.TT.......
TT........`, { p: C.rockD, P: C.rock, T: C.woodL });
  I.ironAxe = pxIcon(`
....AAa...
...AAAAa..
...AAaa...
....Ta....
...TT.....
..TT......
.TT.......
TT........`, { A: C.ironL, a: C.ironD, T: C.woodL });
  I.ironPick = pxIcon(`
...ppPP...
..p...PP..
.p.....P..
....T..P..
...TT.....
..TT......
.TT.......
TT........`, { p: C.ironD, P: C.ironL, T: C.woodL });
  I.rod = pxIcon(`
.......T..
.....TT.l.
....T...l.
...T....l.
..T....ll.
..T.......
.T........
.T........`, { T: C.woodL, l: '#d8d4c4' });
  I.spear = pxIcon(`
.......ff.
......fF..
.....TF...
....TT....
...TT.....
..TT......
.TT.......
TT........`, { f: C.flintC, F: C.flintL, T: C.woodL });
  I.darkBlade = pxIcon(`
.......kp.
......kp..
.....kp...
....kp....
...kp.....
..hh......
.Th.h.....
TT........`, { k: '#3a2a54', p: C.purpL, h: C.flintC, T: C.woodL });
  I.waterskin = pxIcon(`
....hh....
....hh....
..hHHHHh..
.hHHHHHHh.
.hHHbbHHh.
.hHHHHHHh.
..hHHHHh..
...hhhh...`, { h: '#4a3a1e', H: '#8a6a3e', b: '#59d5e8' });
  I.leatherArmor = pxIcon(`
.hh.hh.hh.
hHHhHHhHHh
hHHHHHHHHh
.hHHhhHHh.
.hHHHHHHh.
.hHHhhHHh.
.hHHHHHHh.
..hhhhhh..`, { H: '#a8874f', h: '#5c451e' });
  I.starHeart = pxIcon(`
....s.....
....s.....
..sSWSs...
.ssWWWss..
..sSWSs...
....s.....
....s.....`, { s: '#3a95c4', S: '#59d5e8', W: '#e8f4ff' });
  I.campfire = pxIcon(`
....Y.....
...YOO....
..OOROO...
..ORRRO...
.T.RRR.T..
..TTTTTT..
.TT....TT.`, { Y: C.fireY, O: C.fireO, R: C.fireR, T: C.woodD });
  I.furnace = pxIcon(`
...ssss...
..sSSSSs..
.sSSSSSSs.
.sSSssSSs.
.sSs__sSs.
.sSs__sSs.
.ssssssss.`, { s: '#3c3830', S: '#6a655c', _: '#1a120a' });
  I.bed = pxIcon(`
..........
....mm....
..mmMMmm..
.mPpMMMMm.
..mmMMmm..
....mm....`, { M: '#b3a25e', m: '#8f7f42', P: '#8f7f42', p: '#c9b46a' });
  I.field = pxIcon(`
....dd....
..ddDDdd..
ddDDddDDdd
..ddDDdd..
....dd....
..p..p....`, { d: '#6b5537', D: '#54432a', p: C.green });
  I.jangseung = pxIcon(`
.HHHHHH...
HHHHHHHH..
..tttt....
..tEEt....
..tnnt....
..tMMt....
..tttt....
..t==t....
..tttt....
..tttt....`, { H: C.woodD, t: C.wood, E: C.bone, n: C.woodD, M: C.bone, '=': C.woodD });
  I.brazier = pxIcon(`
....R.....
...ROR....
...RRR....
.ssssss...
s.sSSs.s..
...ss.....
..ssss....`, { R: C.purp, O: C.purpL, s: C.rockD, S: '#6e6e64' });
  I.mushroom = pxIcon(`
..RRRR....
.RRWRRR...
.RWRRWRR..
...ss.....
...ss.....
...ss.....`, { R: '#c1552e', W: '#f2ead8', s: '#e0d4b8' });
  I.cookedMushroom = pxIcon(`
..RRRR....
.RRWRRR...
.RWRRWRR..
...ss.....
...ss.....
...ss.....`, { R: '#8a5c28', W: '#e8d8b8', s: '#c9b088' });
  I.herb = pxIcon(`
.W..g..W..
..g.g.g...
.g.ggg.g..
...ggg....
....g.....
....g.....`, { g: '#4d7a30', W: '#e8e0f4' });
  I.snowBerry = pxIcon(`
....gg....
...g......
..BB..BB..
.BbBB.BbB.
..BB...BB.
...BB.BB..`, { B: '#9ec8e8', b: '#e4f2fc', g: '#3c5a4a' });
  I.goldOre = pxIcon(`
...rrrr...
..rRRoRr..
.rRoRRRRr.
.rRRRoRRr.
.rRoRRoRr.
..rrrrrr..`, { R: C.rock, r: C.rockD, o: '#e8b830' });
  I.gold = pxIcon(`
..........
..lllllll.
.lLLLLLLl.
.lGGGGGGl.
.lGGGGGll.
..lllll...`, { l: '#8a6a14', L: '#f4d868', G: '#e8b830' });
  I.stew = pxIcon(`
...ss.s...
..MmMMm...
.BMMMMMB..
.BBMMMBB..
..BBBBB...
...BBB....`, { B: '#6e5230', M: '#9c5a28', m: '#c1552e', s: '#d8d4c4' });
  I.bandage = pxIcon(`
..WWWW....
.WWwwWW...
.WwWWwW...
.WWwwWW...
..WWWW....
....gg....`, { W: '#f2ead8', w: '#cfc4b0', g: '#4d7a30' });
  I.furArmor = pxIcon(`
.mm.mm.mm.
mMMmMMmMMm
mMMMMMMMMm
.mMMmmMMm.
.mMMMMMMm.
.mMMmmMMm.
.mMMMMMMm.
..mmmmmm..`, { M: '#6e5438', m: '#3c2c1a' });
  // 요리 리컬러
  I.cookedEgg = pxIcon(`
...EEE....
..EEEEe...
.EEEEEEe..
.EEeEEEe..
.EEEEEEe..
..EEEEe...
...EEe....`, { E: '#e8b04a', e: '#8a5c1a' });
  I.cookedBean = pxIcon(`
...g......
.P.g......
PpP.g..P..
.P..gg.pP.
....g..P..
..P.g.....
.pP.g.....
..P.......`, { P: '#c9903d', p: '#e8b878', g: '#6e4a14' });
  I.cookedMeat = pxIcon(`
.......BB.
.MMMM.BB..
MMmmMMM...
MmMMMMM...
MMMMmMM...
.MMMMM....`, { M: '#9c5a28', m: '#c9903d', B: '#e8d8b8' });
  I.cookedFish = pxIcon(`
..........
..FFFF..F.
.FeFFFFFF.
.FFfFfFFF.
..FFFF..F.
..........`, { F: '#c98d4a', f: '#8a5c1a', e: '#4c2a0e' });
  SPR.icons = I;
}

/* ================= 플레이어 / 생물 (도트 프레임) ================= */
const PLAYER_PAL = { H: C.hair, S: C.skin, s: C.skinD, E: C.eye, C: C.cloth, c: C.clothD, B: C.wood };
const PLAYER_BODY = `
..HHHH..
.HHHHHH.
HHHHHHHH
HSESSESH
.SSSSSS.
..SssS..
.CCCCCC.
SCCCCCCS
SCCcCCCS
.CCcCCC.
.CCCCCC.`;
function makePlayer() {
  SPR.playerWalk = [
    pxSpr(40, 64, PLAYER_BODY + `
..S..S..
..S..S..
.BB..BB.`, PLAYER_PAL, PXS, 2),
    pxSpr(40, 64, PLAYER_BODY + `
.S....S.
.S....S.
BB....BB`, PLAYER_PAL, PXS, 2),
  ];
  SPR.playerSwing = pxSpr(44, 64, `
..HHHH..s
.HHHHHH.s
HHHHHHHHs
HSESSESHs
.SSSSSSSs
..SssSS..
.CCCCCC..
SCCCCCC..
SCCcCCC..
.CCcCCC..
.CCCCCC..
..S..S...
..S..S...
.BB..BB..`, PLAYER_PAL, PXS, 2);
}

function drawPlayer(ctx, x, y, t, flip, swing) {
  ctx.save();
  ctx.translate(x, y);
  ctx.imageSmoothingEnabled = false;
  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath(); ctx.ellipse(0, 0, 11, 5, 0, 0, Math.PI * 2); ctx.fill();
  if (flip) ctx.scale(-1, 1);
  const bob = t > 0 ? Math.abs(Math.sin(t * 8)) * -2 : 0;
  let spr;
  if (swing > 0.3) spr = SPR.playerSwing;
  else spr = SPR.playerWalk[t > 0 ? (t * 8 | 0) % 2 : 0];
  ctx.drawImage(spr, -spr.width / 2, -spr.height + 4 + bob);
  ctx.restore();
}

const MOB_SPRITES = {};
function makeMobs() {
  MOB_SPRITES.wisp = [`
...PPPP...
..PPpPPP..
.PPpppPPP.
.PWWpWWPP.
PPWBpWBPPP
.PPpppPPP.
..PPpPPP..
.P.PPPP.P.
..P....P..`, `
...PPPP...
..PPpPPPP.
.PPpppPP..
.PWWpWWPP.
PPWBpWBPPP
.PPpppPPP.
..PPpPPP..
..PP.PP.P.
.P...P....`,
  ].map(m => pxSpr(52, 50, m, { P: C.purpD, p: '#5a2a8c', W: '#fff', B: '#1a0a2c' }, PXS, 2));

  MOB_SPRITES.rabbit = [`
.....e..e.
.....e.ee.
....ffffff
...fffffEf
.Wffffffff
.fffffffn.
..ff..ff..`, `
.....e.e..
.....ee.e.
....ffffff
...fffffEf
.Wffffffff
.fffffffn.
.ff....ff.`,
  ].map(m => pxSpr(52, 42, m, { e: '#cfc4b0', f: '#cfc4b0', E: C.eye, W: '#fff', n: '#e8a8a8' }, PXS, 2));

  MOB_SPRITES.boar = [`
..mmmmmmmm....
.mbbbbbbbbmm..
mbbbbbbbbbbhh.
mbbbbbbbbhhhh.
.bbbbbbbbhEhn.
.bb..bb.bht.n.
.bb..bb..b....`, `
..mmmmmmmm....
.mbbbbbbbbmm..
mbbbbbbbbbbhh.
mbbbbbbbbhhhh.
.bbbbbbbbhEhn.
..bb.bb..ht.n.
..bb..bb.b....`,
  ].map(m => pxSpr(68, 46, m, { m: '#3c2c1a', b: '#5c4630', h: '#6e5238', E: C.eye, n: '#8a6a4a', t: C.bone }, PXS, 2));

  // 동굴 박쥐
  MOB_SPRITES.bat = [`
.ww.....ww.
wwww.k.wwww
.wwwkkkwww.
...kEkEk...
....kkk....`, `
...w...w...
..www.www..
.wwwkkkwww.
...kEkEk...
....kkk....`,
  ].map(m => pxSpr(52, 30, m, { w: '#2c2438', k: '#1c1430', E: '#e8b830' }, PXS, 6));

  // 깨어난 어둠 (보스) — 6px 도트로 더 크고 묵직하게
  MOB_SPRITES.awakened = [`
....PPPPPP....
..PPpppppPPP..
.PPpkkkkkpPPP.
PPpkkWkWkkpPPP
PpkkkkkkkkkpPP
PpkWkkkkkWkpPP
PPpkkkWkkkpPPP
.PPpkkkkkpPPP.
..PPpppppPP...
.P.PPPPPP.P.P.
P....PP....P..`, `
....PPPPPP....
..PPpppppPPPP.
.PPpkkkkkpPP..
PPpkkWkWkkpPPP
PpkkkkkkkkkpPP
PpkWkkkkkWkpPP
PPpkkkWkkkpPPP
.PPpkkkkkpPPP.
..PPpppppPPP..
.P.PPPPP.PP.P.
..P....PP...P.`,
  ].map(m => pxSpr(136, 116, m, { P: '#4a2470', p: '#7a2ab0', k: '#160a26', W: '#ff2f4a' }, 8, 8));

  // 방랑 상인 (두건 쓴 행상)
  MOB_SPRITES.trader = [`
...rrrr...
..rrrrrr..
..rSSSSr..
..rSeSer..
...SSSS...
..rrrrrr..
.rrrrrrrr.
.rrrrrrrB.
.rrrrrrBB.
.rrrrrrBB.
..rr..rr..
..rr..rr..
.LL....LL.`, `
...rrrr...
..rrrrrr..
..rSSSSr..
..rSeSer..
...SSSS...
..rrrrrr..
.rrrrrrrr.
.rrrrrrrB.
.rrrrrrBB.
.rrrrrrBB.
...rr.rr..
...rr.rr..
..LL...LL.`,
  ].map(m => pxSpr(52, 64, m, { r: '#5c4630', S: '#d69a68', e: '#1a120a', B: '#8a6a3e', L: '#4a3620' }, PXS, 2));

  // 독사 (늪)
  MOB_SPRITES.snake = [`
..........hE.
.sss.....hhn.
s...s...hh...
.....s.ss....
......ss.....`, `
..........hE.
..sss....hhn.
.s...ss.hh...
s......ss....
.............`,
  ].map(m => pxSpr(64, 30, m, { s: '#4d6a2a', h: '#5d7a34', E: '#e8b830', n: '#c14545' }, PXS, 2));

  // 곰 (설원)
  MOB_SPRITES.bear = [`
..mm......mm...
..mmmmmmmmmm...
.mbbbbbbbbbbm..
.mbbbbbbbbbbhh.
mbbbbbbbbbbhhh.
mbbbbbbbbbhEhn.
.bbbbbbbbbhhnn.
.bbb.bbb..bb...
.bbb.bbb..bb...`, `
..mm......mm...
..mmmmmmmmmm...
.mbbbbbbbbbbm..
.mbbbbbbbbbbhh.
mbbbbbbbbbbhhh.
mbbbbbbbbbhEhn.
.bbbbbbbbbhhnn.
..bbb.bbb.bb...
.bbb.bbb...bb..`,
  ].map(m => pxSpr(72, 54, m, { m: '#3c2c1a', b: '#5a442c', h: '#6e5438', E: '#1a120a', n: '#2c1e10' }, PXS, 2));

  MOB_SPRITES.wolf = [`
.k.........k.
.kk..kkkkkkE.
..kkkkkkkkkk.
.Kkkkkkkkkkkk
...kkkkkkkk..
...kk....kk..
...k......k..`, `
.k.........k.
.kk..kkkkkkE.
..kkkkkkkkkk.
.Kkkkkkkkkkkk
...kkkkkkkk..
....kk..kk...
....k....k...`,
  ].map(m => pxSpr(64, 46, m, { k: '#1c1430', K: '#241a3c', E: '#ff2f4a' }, PXS, 2));
}

function drawCreaturePix(ctx, key, x, y, t, hpRatio, flip, extra) {
  const frames = MOB_SPRITES[key];
  const spr = frames[(t * 6 | 0) % 2];
  ctx.save();
  ctx.translate(x, y);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath(); ctx.ellipse(0, 0, spr.width * 0.28, 5, 0, 0, Math.PI * 2); ctx.fill();
  if (flip) ctx.scale(-1, 1);
  const hop = key === 'rabbit' ? Math.abs(Math.sin(t * 8)) * -4
    : key === 'wisp' ? Math.sin(t * 5) * 3 - 4 : 0;
  ctx.drawImage(spr, -spr.width / 2, -spr.height + 2 + hop);
  // 멧돼지 분노 눈
  if (extra && extra.angry) {
    ctx.fillStyle = '#ff3838';
    ctx.fillRect(flip ? -spr.width / 2 + 36 : spr.width / 2 - 20, -spr.height + 18 + hop, 4, 4);
  }
  ctx.restore();
  if (hpRatio < 1) {
    ctx.fillStyle = '#000'; ctx.fillRect(x - 13, y - spr.height - 8, 26, 4);
    ctx.fillStyle = '#d9273a'; ctx.fillRect(x - 12, y - spr.height - 7, 24 * Math.max(0, hpRatio), 2);
  }
}
function drawMob(ctx, x, y, t, hpRatio) { drawCreaturePix(ctx, 'wisp', x, y, t, hpRatio, false); }
function drawRabbit(ctx, x, y, t, hpRatio, flip) { drawCreaturePix(ctx, 'rabbit', x, y, t, hpRatio, flip); }
function drawBoar(ctx, x, y, t, hpRatio, flip, angry) { drawCreaturePix(ctx, 'boar', x, y, t, hpRatio, flip, { angry }); }
function drawWolf(ctx, x, y, t, hpRatio, flip) { drawCreaturePix(ctx, 'wolf', x, y, t, hpRatio, flip); }
function drawTrader(ctx, x, y, t, flip) { drawCreaturePix(ctx, 'trader', x, y, t, 1, flip); }

function initSprites() { makeTiles(); makeObjects(); makeStructs(); makeIcons(); makePlayer(); makeMobs(); }
