// ===== 야생의 어둠 : 메인 게임 로직 =====
'use strict';

/* ---------- 유틸 ---------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const $ = id => document.getElementById(id);
const SAVE_KEY = 'wild-dark-save-v1';
const DAY_LEN = 300;            // 게임 하루 = 300초
const MAP = 44;                 // 맵 크기

let worldSeed = Math.floor(Math.random() * 1e9);
function seededRand(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

/* ---------- 상태 ---------- */
const G = {
  tiles: null,          // Uint8Array: 0 grass, 1 water, 2 dirt
  objs: new Map(),      // idx -> {type, hp, respawnAt}
  structs: [],          // {type,x,y,life,lit}
  mobs: [],
  floats: [],           // {x,y,txt,color,t}
  day: 1, t: 0.28,      // t: 하루 진행도 0~1
  shards: 0,
  rain: false, rainT: 0,
  questIdx: 0,
  counters: {},         // 미션 카운터
  sound: true,
  msgQueue: [],
  gameOver: false,
  sleeping: false,
};

const P = {
  x: MAP / 2, y: MAP / 2,       // 타일 좌표(실수)
  path: [], face: 1,
  level: 1, exp: 0,
  hp: 80, maxHp: 80,
  ep: 100, hunger: 85, thirst: 85, fatigue: 10, temp: 22,
  inv: [],                       // {id, qty, dur}
  equipTool: -1, equipLight: -1, equipArmor: -1, // inv index
  swing: 0, atkCd: 0,
  target: null,                  // {kind:'obj'|'mob'|'struct'|'water'|'move', ...}
  actProg: 0,
  str: 10, agi: 11, int: 10, vit: 10, luck: 12,
};

/* ---------- 월드 생성 ---------- */
const idx = (x, y) => y * MAP + x;
const inMap = (x, y) => x >= 0 && y >= 0 && x < MAP && y < MAP;

function genWorld() {
  const r = seededRand(worldSeed);
  G.tiles = new Uint8Array(MAP * MAP);
  // 호수 몇 개 (blob)
  const lakes = [];
  for (let i = 0; i < 4; i++) lakes.push({ x: 6 + r() * (MAP - 12), y: 6 + r() * (MAP - 12), r: 2.5 + r() * 3.5 });
  for (let y = 0; y < MAP; y++) for (let x = 0; x < MAP; x++) {
    for (const l of lakes) {
      if (dist(x, y, l.x, l.y) < l.r + Math.sin(x * 1.7 + y * 2.3) * 0.9) { G.tiles[idx(x, y)] = 1; break; }
    }
  }
  // 시작 지점 주변은 물 제거
  for (let y = MAP/2 - 3; y < MAP/2 + 3; y++) for (let x = MAP/2 - 3; x < MAP/2 + 3; x++)
    G.tiles[idx(x|0, y|0)] = 0;

  // 오브젝트 뿌리기
  const density = [
    ['tree', 90], ['bush', 55], ['rock', 26], ['twig', 34], ['flint', 22],
    ['pebble', 20], ['berry', 16], ['bean', 14], ['nest', 10],
  ];
  for (const [type, n] of density) {
    let placed = 0, guard = 0;
    while (placed < n && guard++ < n * 30) {
      const x = (r() * MAP) | 0, y = (r() * MAP) | 0;
      if (G.tiles[idx(x, y)] !== 0 || G.objs.has(idx(x, y))) continue;
      if (dist(x, y, MAP/2, MAP/2) < 2.5) continue;
      G.objs.set(idx(x, y), { type, hp: WORLD_OBJS[type].hits, respawnAt: 0 });
      placed++;
    }
  }
}

function isBlocked(x, y) {
  if (!inMap(x, y)) return true;
  if (G.tiles[idx(x, y)] === 1) return true;
  const o = G.objs.get(idx(x, y));
  if (o && !o.dead && WORLD_OBJS[o.type].solid) return true;
  if (G.structs.some(s => s.x === x && s.y === y)) return true;
  return false;
}

/* ---------- 경로 탐색 (BFS) ---------- */
function findPath(sx, sy, tx, ty) {
  sx |= 0; sy |= 0; tx |= 0; ty |= 0;
  if (!inMap(tx, ty)) return null;
  const prev = new Int32Array(MAP * MAP).fill(-1);
  const q = [idx(sx, sy)];
  prev[idx(sx, sy)] = idx(sx, sy);
  const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  let found = false;
  while (q.length) {
    const cur = q.shift();
    if (cur === idx(tx, ty)) { found = true; break; }
    const cx = cur % MAP, cy = (cur / MAP) | 0;
    for (const [dx, dy] of dirs) {
      const nx = cx + dx, ny = cy + dy;
      if (!inMap(nx, ny) || prev[idx(nx, ny)] !== -1 || isBlocked(nx, ny)) continue;
      if (dx && dy && (isBlocked(cx + dx, cy) || isBlocked(cx, cy + dy))) continue; // 대각 끼임 방지
      prev[idx(nx, ny)] = cur;
      q.push(idx(nx, ny));
    }
  }
  if (!found) return null;
  const path = [];
  let cur = idx(tx, ty);
  while (cur !== idx(sx, sy)) { path.push({ x: cur % MAP, y: (cur / MAP) | 0 }); cur = prev[cur]; }
  return path.reverse();
}

// 목표 주변의 도달 가능한 인접 칸으로 경로
function pathToAdjacent(tx, ty) {
  let best = null;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const nx = tx + dx, ny = ty + dy;
    if ((dx || dy) && inMap(nx, ny) && !isBlocked(nx, ny)) {
      if (nx === (P.x | 0) && ny === (P.y | 0)) return [];
      const p = findPath(P.x | 0, P.y | 0, nx, ny);
      if (p && (!best || p.length < best.length)) best = p;
    }
  }
  return best;
}

/* ---------- 인벤토리 ---------- */
function invCount(id) { return P.inv.filter(s => s.id === id).reduce((a, s) => a + s.qty, 0); }
function addItem(id, qty) {
  const def = ITEMS[id];
  if (!def.equip) {
    const slot = P.inv.find(s => s.id === id);
    if (slot) { slot.qty += qty; return; }
  }
  for (let i = 0; i < qty; i++) P.inv.push({ id, qty: def.equip ? 1 : qty, dur: def.dur || 0 });
  if (!def.equip && qty > 1) { /* pushed once with qty above */ }
}
function addItemStack(id, qty) {
  const def = ITEMS[id];
  if (def.equip) { for (let i = 0; i < qty; i++) P.inv.push({ id, qty: 1, dur: def.dur }); }
  else {
    const slot = P.inv.find(s => s.id === id);
    if (slot) slot.qty += qty; else P.inv.push({ id, qty, dur: 0 });
  }
  bumpCounter('collect', id, qty);
}
function removeItems(id, qty) {
  let left = qty;
  for (let i = P.inv.length - 1; i >= 0 && left > 0; i--) {
    if (P.inv[i].id !== id) continue;
    const take = Math.min(P.inv[i].qty, left);
    P.inv[i].qty -= take; left -= take;
    if (P.inv[i].qty <= 0) removeSlot(i);
  }
}
function removeSlot(i) {
  P.inv.splice(i, 1);
  if (P.equipTool === i) P.equipTool = -1; else if (P.equipTool > i) P.equipTool--;
  if (P.equipLight === i) P.equipLight = -1; else if (P.equipLight > i) P.equipLight--;
  if (P.equipArmor === i) P.equipArmor = -1; else if (P.equipArmor > i) P.equipArmor--;
}
function armorDef() {
  return P.equipArmor >= 0 && P.inv[P.equipArmor] ? (ITEMS[P.inv[P.equipArmor].id].def || 0) : 0;
}
function hasTool(tool) {
  return P.equipTool >= 0 && ITEMS[P.inv[P.equipTool].id].tool === tool
    ? P.equipTool
    : P.inv.findIndex(s => ITEMS[s.id].tool === tool);
}

/* ---------- 경험치 / 레벨 ---------- */
function gainExp(n) {
  P.exp += n;
  spawnFloat(P.x, P.y - 1.2, `+${n} EXP`, '#ffe066');
  while (P.exp >= EXP_TABLE(P.level)) {
    P.exp -= EXP_TABLE(P.level);
    P.level++;
    P.maxHp += 8; P.hp = P.maxHp; P.ep = 100;
    P.str++; P.vit++;
    toast(`⬆ 레벨 ${P.level} 달성!`, '#ffe066');
    sfx('level');
  }
  updateHud();
}

/* ---------- 미션 ---------- */
function bumpCounter(type, key, n = 1) {
  const q = QUESTS[G.questIdx];
  if (!q) return;
  for (const line of q.lines) {
    if (line.type === type && (line.key === key || line.key === 'any')) {
      const ck = G.questIdx + ':' + line.t;
      G.counters[ck] = Math.min(line.n, (G.counters[ck] || 0) + n);
    }
  }
  checkQuest();
}
function questLineDone(line) {
  if (line.type === 'day') return G.day >= line.n;
  return (G.counters[G.questIdx + ':' + line.t] || 0) >= line.n;
}
function checkQuest() {
  const q = QUESTS[G.questIdx];
  if (!q) return;
  if (q.lines.every(questLineDone)) {
    toast(`✔ 미션 완료! (+${q.exp} EXP)`, '#8f8');
    gainExp(q.exp);
    G.questIdx++;
    sfx('quest');
  }
  renderMissions();
}
function renderMissions() {
  const q = QUESTS[G.questIdx];
  const title = $('mission-title'), lines = $('mission-lines');
  if (!q) { title.textContent = '모든 미션 완료!'; lines.innerHTML = '<div class="done">야생에서 계속 살아남으세요…</div>'; return; }
  title.textContent = q.title;
  lines.innerHTML = q.lines.map(l => {
    const cur = l.type === 'day' ? Math.min(G.day, l.n) : (G.counters[G.questIdx + ':' + l.t] || 0);
    const done = questLineDone(l);
    return `<div class="${done ? 'done' : ''}">${l.t} (${cur}/${l.n})</div>`;
  }).join('');
}

/* ---------- 사운드 (WebAudio 미니 효과음) ---------- */
let AC = null;
function sfx(kind) {
  if (!G.sound) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator(), g = AC.createGain();
    o.connect(g); g.connect(AC.destination);
    const now = AC.currentTime;
    const conf = {
      pick:  [520, 0.08, 'triangle'], hit: [180, 0.1, 'square'],
      craft: [420, 0.15, 'sine'], eat: [300, 0.12, 'sine'],
      level: [660, 0.4, 'sine'], quest: [560, 0.3, 'triangle'],
      hurt:  [120, 0.15, 'sawtooth'], die: [80, 0.6, 'sawtooth'],
    }[kind] || [400, 0.1, 'sine'];
    o.type = conf[2]; o.frequency.setValueAtTime(conf[0], now);
    o.frequency.exponentialRampToValueAtTime(conf[0] * (kind === 'level' || kind === 'quest' ? 2 : 0.6), now + conf[1]);
    g.gain.setValueAtTime(0.12, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + conf[1]);
    o.start(now); o.stop(now + conf[1] + 0.02);
  } catch (e) { /* 무음 환경 */ }
}

/* ---------- 메시지 ---------- */
function toast(msg, color) {
  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = msg;
  if (color) el.style.color = color;
  $('toast-area').appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity .5s'; el.style.opacity = 0; }, 2200);
  setTimeout(() => el.remove(), 2800);
}
function spawnFloat(x, y, txt, color) {
  G.floats.push({ x, y, txt, color, t: 0 });
}

/* ---------- 행동 ---------- */
function tapWorld(wx, wy) {
  if (G.gameOver || G.sleeping) return;
  const tx = Math.round(wx), ty = Math.round(wy);
  // 1) 몬스터?
  const mob = G.mobs.find(m => dist(m.x, m.y, wx, wy) < 0.8);
  if (mob) { setTargetMob(mob); return; }
  // 2) 구조물?
  const st = G.structs.find(s => s.x === tx && s.y === ty);
  if (st) { setTarget({ kind: 'struct', st, x: tx, y: ty }); return; }
  // 3) 오브젝트?
  const o = G.objs.get(idx(tx, ty));
  if (o && !o.dead) { setTarget({ kind: 'obj', o, x: tx, y: ty }); return; }
  // 4) 물?
  if (inMap(tx, ty) && G.tiles[idx(tx, ty)] === 1) { setTarget({ kind: 'water', x: tx, y: ty }); return; }
  // 5) 이동
  const p = findPath(P.x | 0, P.y | 0, tx, ty);
  if (p) { P.path = p; P.target = null; P.actProg = 0; }
}
function setTarget(t) {
  const p = pathToAdjacent(t.x, t.y);
  if (p === null || p === undefined) { toast('그곳엔 갈 수 없습니다.'); return; }
  P.path = p; P.target = t; P.actProg = 0;
}
function setTargetMob(mob) {
  P.target = { kind: 'mob', mob }; P.actProg = 0;
  P.path = [];
}

function nearTarget(t, range = 1.6) {
  const gx = t.kind === 'mob' ? t.mob.x : t.x;
  const gy = t.kind === 'mob' ? t.mob.y : t.y;
  return dist(P.x, P.y, gx, gy) <= range;
}

// 채집/벌목 실행 (도착 후 매 프레임)
function doGather(dt) {
  const t = P.target, o = t.o, def = WORLD_OBJS[o.type];
  if (def.tool) {
    const ti = hasTool(def.tool);
    if (ti < 0) {
      toast(def.tool === 'axe' ? '벌목 도구(돌도끼)가 필요합니다.' : '채굴 도구(돌곡괭이)가 필요합니다.');
      P.target = null; return;
    }
  }
  P.actProg += dt;
  const hitTime = 0.55;
  if (P.actProg >= hitTime) {
    P.actProg = 0; P.swing = 1;
    o.hp--;
    P.ep = clamp(P.ep - 1.2, 0, 100);
    P.fatigue = clamp(P.fatigue + 0.4, 0, 100);
    sfx(def.tool ? 'hit' : 'pick');
    // 도구 내구도
    if (def.tool) {
      const ti = hasTool(def.tool);
      if (ti >= 0) { P.inv[ti].dur -= 1; if (P.inv[ti].dur <= 0) { toast(`${ITEMS[P.inv[ti].id].n}이(가) 부서졌습니다!`, '#ff9d2e'); removeSlot(ti); } }
    }
    if (o.hp <= 0) {
      for (const y of def.yields) {
        if (y.p && Math.random() > y.p) continue;
        addItemStack(y.id, y.q);
        spawnFloat(t.x, t.y - 0.6, `+${y.q} ${ITEMS[y.id].n}`, '#fff');
      }
      gainExp(def.tool ? 6 : 3);
      if (def.respawn) { o.dead = true; o.respawnAt = nowGameTime() + def.respawn; }
      else G.objs.delete(idx(t.x, t.y));
      P.target = null;
      updateInvPanel(); updateCraftPanel();
    }
  }
}

function doDrink() {
  P.thirst = clamp(P.thirst + 35, 0, 100);
  spawnFloat(P.x, P.y - 1, '+갈증 해소', '#59d5e8');
  // 물주머니 자동 충전
  let filled = false;
  for (const s of P.inv) {
    if (s.id === 'waterskin' && s.dur < ITEMS.waterskin.dur) { s.dur = ITEMS.waterskin.dur; filled = true; }
  }
  if (filled) toast('물주머니를 가득 채웠습니다.', '#59d5e8');
  bumpCounter('drink', 'water');
  sfx('eat');
  P.target = null;
}

function doFish(dt) {
  const ri = hasTool('rod');
  if (ri < 0 || P.equipTool !== ri) { doDrink(); return; }
  P.actProg += dt;
  if (P.actProg >= 3) {
    P.actProg = 0; P.swing = 1;
    P.inv[ri].dur -= 1;
    P.ep = clamp(P.ep - 2, 0, 100);
    if (Math.random() < 0.65 + P.luck / 150) {
      addItemStack('fish', 1);
      spawnFloat(P.x, P.y - 1, '+1 생선', '#6aa8c4');
      gainExp(6);
      sfx('pick');
    } else {
      spawnFloat(P.x, P.y - 1, '놓쳤다…', '#8f8b7c');
    }
    if (P.inv[ri].dur <= 0) { toast('낚싯대가 부러졌습니다!', '#ff9d2e'); removeSlot(ri); P.target = null; }
    updateQuickslots();
  }
}

function useStruct(st) {
  openStructPanel(st);
}

function openStructPanel(st) {
  const def = STRUCTS[st.type];
  $('struct-title').textContent = def.n;
  const box = $('struct-btns');
  box.innerHTML = '';
  const close = () => $('panel-struct').classList.add('hidden');
  if (def.cook) {
    addBtn(box, '🍳 요리하기', () => { close(); openCraftTab('요리'); });
    const fuelBtn = document.createElement('button');
    fuelBtn.className = 'menu-btn';
    fuelBtn.textContent = `🪵 연료 추가 — 통나무 1 (남은 연료 ${Math.max(0, Math.round(st.life / DAY_LEN * 100))}%)`;
    fuelBtn.onclick = () => {
      if (invCount('log') < 1) { toast('통나무가 없습니다.', '#ff5252'); return; }
      removeItems('log', 1);
      st.life = Math.min((st.life > 0 ? st.life : 0) + 0.6 * DAY_LEN, 2 * DAY_LEN);
      st.lit = true;
      toast(`${def.n}에 연료를 보충했습니다.`, '#8f8');
      sfx('craft');
      close();
    };
    box.appendChild(fuelBtn);
  }
  if (def.sleep) addBtn(box, '💤 잠자기', () => { close(); trySleep(st); });
  if (def.farm) {
    const grown = st.planted && (st.growT || 0) >= FIELD_GROW * DAY_LEN;
    const label = !st.planted ? '🌱 콩 심기'
      : grown ? '🌾 수확하기!'
      : `⏳ 성장중… (${Math.floor((st.growT || 0) / (FIELD_GROW * DAY_LEN) * 100)}%)`;
    addBtn(box, label, () => { close(); useField(st); });
  }
  addBtn(box, '⛏ 해체하기 (재료 일부 회수)', () => { close(); dismantleStruct(st); });
  openPanel('panel-struct');
}

function dismantleStruct(st) {
  const i = G.structs.indexOf(st);
  if (i < 0) return;
  G.structs.splice(i, 1);
  const r = RECIPES.find(r => r.place && r.out === st.type);
  if (r) {
    for (const [id, n] of Object.entries(r.mats)) {
      const back = Math.ceil(n / 2);
      if (back > 0) {
        addItemStack(id, back);
        spawnFloat(st.x, st.y - 0.6, `+${back} ${ITEMS[id].n}`, '#fff');
      }
    }
  }
  toast(`${STRUCTS[st.type].n}을(를) 해체했습니다.`, '#8f8');
  sfx('hit');
}

function useField(st) {
  if (!st.planted) {
    if (invCount('bean') < 1) { toast('심을 콩이 없습니다.', '#ff9d2e'); return; }
    removeItems('bean', 1);
    st.planted = true; st.growT = 0;
    spawnFloat(st.x, st.y - 0.8, '콩을 심었다', '#7fb04a');
    sfx('pick');
  } else if (st.growT >= FIELD_GROW * DAY_LEN) {
    st.planted = false; st.growT = 0;
    addItemStack('bean', 3);
    spawnFloat(st.x, st.y - 0.8, '+3 콩', '#7fb04a');
    bumpCounter('harvest', 'bean', 3);
    gainExp(8);
    sfx('craft');
  } else {
    const pct = Math.floor(st.growT / (FIELD_GROW * DAY_LEN) * 100);
    toast(`작물이 자라는 중… (${pct}%)`, '#8f8b7c');
  }
}

function trySleep(st) {
  if (G.mobs.some(m => dist(m.x, m.y, P.x, P.y) < 7)) { toast('근처에 적이 있어 잘 수 없습니다!', '#ff5252'); return; }
  G.sleeping = true;
  $('overlay-sleep').classList.remove('hidden');
  bumpCounter('sleep', 'bed');
  setTimeout(() => {
    // 아침으로
    if (G.t > 0.5) G.day++;
    G.t = 0.26;
    P.fatigue = 0; P.ep = 100;
    P.hp = clamp(P.hp + 25, 0, P.maxHp);
    P.hunger = clamp(P.hunger - 14, 0, 100);
    P.thirst = clamp(P.thirst - 18, 0, 100);
    G.mobs = [];
    G.sleeping = false;
    $('overlay-sleep').classList.add('hidden');
    toast('상쾌한 아침입니다!', '#8f8');
    bumpCounter('day', 'day', 0); checkQuest();
    save();
  }, 1600);
}

function eatItem(i) {
  const s = P.inv[i], def = ITEMS[s.id];
  if (!def.food) return;
  P.hunger = clamp(P.hunger + (def.food.hunger || 0), 0, 100);
  P.thirst = clamp(P.thirst + (def.food.thirst || 0), 0, 100);
  P.hp = clamp(P.hp + (def.food.hp || 0), 0, P.maxHp);
  s.qty--; if (s.qty <= 0) removeSlot(i);
  spawnFloat(P.x, P.y - 1, `${def.n} 냠냠`, '#c88a3d');
  bumpCounter('eat', 'any');
  sfx('eat');
  updateInvPanel(); updateHud();
}

function equipItem(i) {
  const def = ITEMS[P.inv[i].id];
  if (def.equip === 'tool') P.equipTool = P.equipTool === i ? -1 : i;
  if (def.equip === 'light') P.equipLight = P.equipLight === i ? -1 : i;
  if (def.equip === 'armor') P.equipArmor = P.equipArmor === i ? -1 : i;
  updateInvPanel(); updateQuickslots();
}

function useWaterskin(i) {
  const s = P.inv[i];
  if (s.dur <= 0) { toast('물주머니가 비어 있습니다. 물가에서 마시면 채워집니다.', '#8f8b7c'); return; }
  s.dur--;
  P.thirst = clamp(P.thirst + 30, 0, 100);
  spawnFloat(P.x, P.y - 1, '+갈증 해소', '#59d5e8');
  sfx('eat');
  updateInvPanel(); updateHud();
}

/* ---------- 제작 ---------- */
function canCraft(r) {
  if (P.level < (r.lv || 1)) return false;
  if (r.fire && !nearFire()) return false;
  if (r.smelt && !nearFurnace()) return false;
  return Object.entries(r.mats).every(([id, n]) => invCount(id) >= n);
}
function nearFire() {
  return G.structs.some(s => STRUCTS[s.type].cook && s.life > 0 && dist(s.x, s.y, P.x, P.y) < 2.5);
}
function nearFurnace() {
  return G.structs.some(s => STRUCTS[s.type].smelt && s.life > 0 && dist(s.x, s.y, P.x, P.y) < 2.5);
}
function craft(r) {
  if (P.level < (r.lv || 1)) { toast(r.lock || '레벨이 부족합니다.'); return; }
  if (r.fire && !nearFire()) { toast('불(모닥불/화덕) 근처에서만 요리할 수 있습니다.', '#ff9d2e'); return; }
  if (r.smelt && !nearFurnace()) { toast('화덕 근처에서만 제련할 수 있습니다.', '#ff9d2e'); return; }
  if (!Object.entries(r.mats).every(([id, n]) => invCount(id) >= n)) { toast('재료가 부족합니다.', '#ff5252'); return; }
  for (const [id, n] of Object.entries(r.mats)) removeItems(id, n);
  if (r.place) {
    // 주변 빈 칸에 설치 (플레이어가 갇히지 않는 자리만)
    const spots = [[0,1],[1,0],[0,-1],[-1,0],[1,1],[-1,1],[1,-1],[-1,-1]];
    const px = P.x | 0, py = P.y | 0;
    const freeSpot = ([dx, dy]) => {
      const x = px + dx, y = py + dy;
      return inMap(x, y) && !isBlocked(x, y) && !G.objs.has(idx(x, y));
    };
    // 설치 후에도 빠져나갈 수 있는지: 후보를 제외한 '이동 가능한' 인접 칸이 남아야 함
    const escapable = (ex, ey) => {
      for (const [dx, dy] of spots) {
        const x = px + dx, y = py + dy;
        if (x === ex && y === ey) continue;
        if (!inMap(x, y) || isBlocked(x, y)) continue;
        if (dx && dy && (isBlocked(px + dx, py) || isBlocked(px, py + dy) ||
            (px + dx === ex && py === ey) || (px === ex && py + dy === ey))) continue; // 대각 끼임
        return true;
      }
      return false;
    };
    let placed = false, blockedByTrap = false;
    for (const [dx, dy] of spots) {
      if (!freeSpot([dx, dy])) continue;
      const x = px + dx, y = py + dy;
      if (!escapable(x, y)) { blockedByTrap = true; continue; }
      G.structs.push({ type: r.out, x, y, life: (STRUCTS[r.out].life || 0) * DAY_LEN, lit: true });
      placed = true; break;
    }
    if (!placed) {
      for (const [id, n] of Object.entries(r.mats)) addItemStack(id, n); // 환불
      toast(blockedByTrap ? '설치하면 갇혀버립니다! 자리를 옮기세요.' : '설치할 공간이 없습니다.', '#ff5252');
      return;
    }
    toast(`${STRUCTS[r.out].n} 설치 완료!`, '#8f8');
    bumpCounter('place', r.out);
  } else {
    addItemStack(r.out, r.qty || 1);
    toast(`${ITEMS[r.out].n} 제작 완료!`, '#8f8');
    bumpCounter('craft', r.out);
    if (r.out === 'ironAxe' || r.out === 'ironPick') bumpCounter('craft', 'ironTool');
    // 방금 만든 도구/횃불 자동 장착
    const def = ITEMS[r.out];
    if (def.equip === 'tool' && P.equipTool < 0) P.equipTool = P.inv.length - 1;
    if (def.equip === 'light' && P.equipLight < 0) P.equipLight = P.inv.length - 1;
  }
  gainExp(6);
  sfx('craft');
  updateInvPanel(); updateCraftPanel(); updateQuickslots();
}

/* ---------- 몬스터 ---------- */
function nowGameTime() { return (G.day - 1) * DAY_LEN + G.t * DAY_LEN; }
function isNight() { return G.t > 0.56 || G.t < 0.06; }
function darknessAlpha() {
  // 0(낮) ~ 0.93(한밤)
  const t = G.t;
  if (t >= 0.06 && t < 0.48) return 0;
  if (t >= 0.48 && t < 0.58) return (t - 0.48) / 0.10 * 0.93;   // 황혼
  if (t >= 0.58 || t < 0.02) return 0.93;                        // 밤
  return 0.93 * (1 - (t - 0.02) / 0.04);                          // 새벽
}
let mobTimer = 0, animalTimer = 5;
function spawnCreature(type, minD, maxD) {
  for (let tries = 0; tries < 20; tries++) {
    const a = Math.random() * Math.PI * 2, d = minD + Math.random() * (maxD - minD);
    const x = Math.round(P.x + Math.cos(a) * d), y = Math.round(P.y + Math.sin(a) * d);
    if (inMap(x, y) && !isBlocked(x, y)) {
      const def = MOBS[type];
      G.mobs.push({ type, x, y, hp: def.hp, maxHp: def.hp, atkCd: 0, t: Math.random() * 10, face: 1 });
      return true;
    }
  }
  return false;
}
function moveCreature(m, tx, ty, speed, dt) {
  const d = dist(m.x, m.y, tx, ty);
  if (d < 0.05) return;
  const nx = m.x + (tx - m.x) / d * speed * dt;
  const ny = m.y + (ty - m.y) / d * speed * dt;
  m.face = (nx - ny) > (m.x - m.y) ? 1 : -1;
  if (!isBlocked(Math.round(nx), Math.round(ny))) { m.x = nx; m.y = ny; }
  else if (!isBlocked(Math.round(nx), Math.round(m.y))) m.x = nx;
  else if (!isBlocked(Math.round(m.x), Math.round(ny))) m.y = ny;
  else { m.wx = null; }
}
function updateMobs(dt) {
  const nightCount = G.mobs.filter(m => MOBS[m.type].kind === 'night').length;
  const animalCount = G.mobs.filter(m => MOBS[m.type].kind === 'animal').length;
  // 밤 몬스터 스폰 (일수에 따라 강해짐)
  if (isNight()) {
    mobTimer -= dt;
    const cap = 3 + Math.min(3, Math.floor((G.day - 1) / 2));
    if (mobTimer <= 0 && nightCount < cap) {
      mobTimer = Math.max(8, 16 - G.day) + Math.random() * 10;
      const wolfChance = G.day >= 3 ? 0.3 : 0;
      spawnCreature(Math.random() < wolfChance ? 'wolf' : 'wisp', 8, 14);
    }
  } else {
    // 낮이 되면 밤 몬스터 소멸
    for (const m of G.mobs) if (MOBS[m.type].kind === 'night') m.hp -= dt * 12;
  }
  // 낮 동물 스폰
  animalTimer -= dt;
  if (animalTimer <= 0) {
    animalTimer = 18 + Math.random() * 12;
    if (!isNight() && animalCount < 4) spawnCreature(Math.random() < 0.65 ? 'rabbit' : 'boar', 7, 13);
  }

  for (const m of G.mobs) {
    m.t += dt;
    m.atkCd = Math.max(0, m.atkCd - dt);
    const def = MOBS[m.type];
    const d = dist(m.x, m.y, P.x, P.y);

    // 행동 결정
    if (def.flee) {
      // 토끼: 플레이어가 가까우면 도망
      if (d < 4.5) {
        const fx = clamp(m.x + (m.x - P.x) / (d || 1) * 3, 1, MAP - 2);
        const fy = clamp(m.y + (m.y - P.y) / (d || 1) * 3, 1, MAP - 2);
        moveCreature(m, fx, fy, def.speed, dt);
        continue;
      }
    } else if (def.retaliate) {
      // 멧돼지: 맞으면 분노해서 반격
      if (m.angry && d < 10) {
        if (d > 1.1) { moveCreature(m, P.x, P.y, def.speed, dt); continue; }
        if (m.atkCd <= 0) {
          m.atkCd = 1.6;
          hurtPlayer(def.dmg);
        }
        continue;
      }
    } else if (def.kind === 'night') {
      // 정령/늑대: 어그로 범위 내 추격 (늑대는 불빛 무시)
      const litSafe = !def.braveFire &&
        G.structs.some(s => STRUCTS[s.type].warm && s.life > 0 && dist(s.x, s.y, m.x, m.y) < 3.2);
      if (d < def.aggro && !litSafe) {
        if (d > 1.1) { moveCreature(m, P.x, P.y, def.speed, dt); continue; }
        if (m.atkCd <= 0) {
          m.atkCd = 1.5;
          hurtPlayer(def.dmg);
        }
        continue;
      }
    }
    // 배회
    if (m.wx == null || dist(m.x, m.y, m.wx, m.wy) < 0.3) {
      m.wx = clamp(m.x + (Math.random() - .5) * 6, 1, MAP - 2);
      m.wy = clamp(m.y + (Math.random() - .5) * 6, 1, MAP - 2);
    }
    moveCreature(m, m.wx, m.wy, def.speed * 0.35, dt);
  }
  // 죽은 생물 처리
  for (let i = G.mobs.length - 1; i >= 0; i--) {
    const m = G.mobs[i];
    if (m.hp <= 0) {
      const def = MOBS[m.type];
      if (m.killed) { // 플레이어가 처치한 경우에만 보상 (낮 소멸 제외)
        for (const dr of def.drops) if (Math.random() < dr.p) {
          addItemStack(dr.id, dr.q);
          if (dr.id === 'shard') G.shards += dr.q;
          spawnFloat(m.x, m.y - 0.6, `+${dr.q} ${ITEMS[dr.id].n}`, dr.id === 'shard' ? '#b13cff' : '#fff');
        }
        gainExp(def.exp);
        bumpCounter('kill', m.type);
      }
      G.mobs.splice(i, 1);
      if (P.target && P.target.mob === m) P.target = null;
    }
  }
}

function hurtPlayer(rawDmg) {
  const dmg = Math.max(1, rawDmg - armorDef() - Math.floor(P.level / 3));
  P.hp -= dmg;
  spawnFloat(P.x, P.y - 1.4, `-${dmg}`, '#ff5252');
  sfx('hurt');
  if (P.hp <= 0) die();
}

function playerAttack(mob) {
  if (P.atkCd > 0) return;
  P.atkCd = 0.8; P.swing = 1;
  const weapon = P.equipTool >= 0 ? ITEMS[P.inv[P.equipTool].id] : null;
  let dmg = 3 + (weapon ? weapon.dmg : 0) + Math.floor(P.str / 5);
  if (Math.random() < 0.08 + P.luck / 200) { dmg *= 2; spawnFloat(mob.x, mob.y - 1.6, '치명타!', '#ffe066'); }
  mob.hp -= dmg; mob.killed = true;
  if (MOBS[mob.type].retaliate) mob.angry = true;
  spawnFloat(mob.x, mob.y - 1.1, `-${dmg}`, '#fff');
  P.ep = clamp(P.ep - 1.5, 0, 100);
  sfx('hit');
  if (weapon && weapon.equip === 'tool') {
    P.inv[P.equipTool].dur -= 0.5;
    if (P.inv[P.equipTool].dur <= 0) { toast(`${weapon.n}이(가) 부서졌습니다!`, '#ff9d2e'); removeSlot(P.equipTool); }
  }
}

function attackNearest() {
  let best = null, bd = 2.0;
  for (const m of G.mobs) { const d = dist(m.x, m.y, P.x, P.y); if (d < bd) { bd = d; best = m; } }
  if (best) { playerAttack(best); }
  else { P.swing = 1; sfx('pick'); }
}

function die() {
  if (G.gameOver) return;
  G.gameOver = true;
  sfx('die');
  $('death-stats').textContent = `${G.day}일째 밤 · 레벨 ${P.level}\n수집한 어둠의 파편: ${G.shards}개`;
  $('overlay-death').classList.remove('hidden');
}
function revive() {
  G.gameOver = false;
  $('overlay-death').classList.add('hidden');
  P.hp = Math.floor(P.maxHp * 0.6);
  P.hunger = Math.max(P.hunger, 40); P.thirst = Math.max(P.thirst, 40);
  P.x = MAP / 2; P.y = MAP / 2; P.path = []; P.target = null;
  G.mobs = [];
  G.t = 0.26; G.day++;
  toast('당신은 간신히 살아 돌아왔습니다…', '#ff9d2e');
  save();
}

/* ---------- 생존 스탯 ---------- */
function updateSurvival(dt) {
  const perDay = dt / DAY_LEN;
  P.hunger = clamp(P.hunger - 34 * perDay, 0, 100);
  P.thirst = clamp(P.thirst - 46 * perDay, 0, 100);
  P.fatigue = clamp(P.fatigue + 40 * perDay, 0, 100);
  // 체온
  let ambient = isNight() ? 4 : 22;
  if (G.rain) ambient -= 7;
  const warm = G.structs.some(s => STRUCTS[s.type].warm && s.life > 0 && dist(s.x, s.y, P.x, P.y) < 3) ? 26 : 0;
  const armorWarm = P.equipArmor >= 0 ? (ITEMS[P.inv[P.equipArmor].id].warm || 0) : 0;
  const target = Math.max(ambient, warm) + (P.equipLight >= 0 ? 4 : 0) + armorWarm;
  P.temp += (target - P.temp) * dt * 0.05;
  // 상태 페널티
  if (P.hunger <= 0) P.hp -= dt * 0.8;
  if (P.thirst <= 0) P.hp -= dt * 1.2;
  if (P.temp < 8) { P.hp -= dt * 0.7; }
  // 회복
  if (P.hunger > 50 && P.thirst > 50 && P.fatigue < 90) P.hp = clamp(P.hp + dt * 0.35, 0, P.maxHp);
  if (P.path.length === 0 && !P.target) P.ep = clamp(P.ep + dt * 2.2, 0, 100);
  P.atkCd = Math.max(0, P.atkCd - dt);
  P.swing = Math.max(0, P.swing - dt * 4);
  if (P.hp <= 0) die();
  // 횃불 내구도 (밤에만 소모 · 등불은 영구)
  if (P.equipLight >= 0 && isNight() && P.inv[P.equipLight].id === 'torch') {
    P.inv[P.equipLight].dur -= dt * (G.rain ? 1.6 : 1);
    if (P.inv[P.equipLight].dur <= 0) {
      toast('횃불이 다 타버렸습니다!', '#ff9d2e');
      removeSlot(P.equipLight);
      updateQuickslots();
    }
  }
  // 구조물 연료 & 밭 성장
  for (const s of G.structs) {
    if (STRUCTS[s.type].life) {
      s.life -= dt * (G.rain ? 1.8 : 1);
      if (s.life <= 0 && s.lit) { s.lit = false; toast(`${STRUCTS[s.type].n}이(가) 꺼졌습니다.`, '#8f8b7c'); }
    }
    if (STRUCTS[s.type].farm && s.planted) {
      s.growT = (s.growT || 0) + dt * (G.rain ? 1.6 : 1);
    }
  }
}

/* ---------- 날씨 (비) ---------- */
function updateWeather(dt) {
  if (G.rain) {
    G.rainT -= dt;
    if (G.rainT <= 0) { G.rain = false; toast('비가 그쳤습니다.', '#8f8b7c'); }
  } else {
    // 하루 평균 한 번꼴로 비 (프레임당 확률)
    if (Math.random() < dt / DAY_LEN * 1.2) {
      G.rain = true;
      G.rainT = 35 + Math.random() * 40;
      toast('비가 내리기 시작합니다… 몸이 차가워집니다.', '#59d5e8');
    }
  }
}

/* ---------- 이동 & 액션 업데이트 ---------- */
function updatePlayer(dt) {
  // 경로 이동
  if (P.path.length) {
    const n = P.path[0];
    const d = dist(P.x, P.y, n.x, n.y);
    const speed = 3.4 * (P.fatigue >= 100 ? 0.75 : 1) * (P.ep <= 0 ? 0.7 : 1);
    if (d < 0.08) { P.x = n.x; P.y = n.y; P.path.shift(); }
    else {
      P.face = n.x + n.y > P.x + P.y ? 1 : (Math.abs((n.x - P.x) - (n.y - P.y)) < 0.01 ? P.face : ((n.x - n.y) > (P.x - P.y) ? 1 : -1));
      P.x += (n.x - P.x) / d * Math.min(speed * dt, d);
      P.y += (n.y - P.y) / d * Math.min(speed * dt, d);
      P.ep = clamp(P.ep - dt * 0.5, 0, 100);
    }
  }
  // 타깃 액션
  const t = P.target;
  if (t && P.path.length === 0) {
    if (t.kind === 'mob') {
      if (t.mob.hp <= 0) { P.target = null; return; }
      const d = dist(P.x, P.y, t.mob.x, t.mob.y);
      if (d > 1.3) { // 추격
        const p = findPath(P.x | 0, P.y | 0, Math.round(t.mob.x), Math.round(t.mob.y));
        if (p && p.length) P.path = [p[0]];
      } else playerAttack(t.mob);
    }
    else if (t.kind === 'obj') {
      if (!nearTarget(t)) { const p = pathToAdjacent(t.x, t.y); if (p && p.length) P.path = p; else P.target = null; }
      else doGather(dt);
    }
    else if (t.kind === 'water') {
      if (!nearTarget(t)) P.target = null;
      else if (P.equipTool >= 0 && ITEMS[P.inv[P.equipTool].id].tool === 'rod') doFish(dt);
      else doDrink();
    }
    else if (t.kind === 'struct') {
      if (!nearTarget(t)) P.target = null;
      else { useStruct(t.st); P.target = null; }
    }
  }
  // 오브젝트 리스폰
  const now = nowGameTime();
  for (const [, o] of G.objs) {
    if (o.dead && o.respawnAt && now >= o.respawnAt) { o.dead = false; o.hp = WORLD_OBJS[o.type].hits; }
  }
}

/* ---------- 시간 ---------- */
function updateTime(dt) {
  const prev = G.t;
  G.t += dt / DAY_LEN;
  if (G.t >= 1) {
    G.t -= 1; G.day++;
    toast(`${G.day}일차 아침이 밝았습니다.`, '#ffe066');
    checkQuest(); save();
  }
  if (prev < 0.52 && G.t >= 0.52) toast('밤이 다가옵니다… 불을 준비하세요.', '#ff9d2e');
}

/* ---------- 렌더링 ---------- */
const canvas = $('game'), ctx = canvas.getContext('2d');
let VW = 0, VH = 0, DPR = 1;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  VW = window.innerWidth; VH = window.innerHeight;
  canvas.width = VW * DPR; canvas.height = VH * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener('resize', resize);

const worldSX = (x, y) => (x - y) * TW / 2;
const worldSY = (x, y) => (x + y) * TH / 2;
function camOffset() {
  return { ox: VW / 2 - worldSX(P.x, P.y), oy: VH / 2 + 40 - worldSY(P.x, P.y) };
}

let animT = 0;
function render() {
  ctx.fillStyle = '#0b0d0a';
  ctx.fillRect(0, 0, VW, VH);
  const { ox, oy } = camOffset();

  // 보이는 타일 범위 계산 (대충 넉넉히)
  const range = Math.ceil(Math.max(VW / TW, VH / TH)) + 4;
  const cx = P.x | 0, cy = P.y | 0;
  const waterFrame = (animT * 2 | 0) % 2;

  // 타일
  for (let y = Math.max(0, cy - range); y < Math.min(MAP, cy + range); y++) {
    for (let x = Math.max(0, cx - range); x < Math.min(MAP, cx + range); x++) {
      const sx = worldSX(x, y) + ox, sy = worldSY(x, y) + oy;
      if (sx < -TW || sx > VW + TW || sy < -TH * 2 || sy > VH + TH * 2) continue;
      const t = G.tiles[idx(x, y)];
      const spr = t === 1 ? SPR.water[waterFrame] : t === 2 ? SPR.dirt[0] : SPR.grass[(x * 7 + y * 13) % 4];
      ctx.drawImage(spr, sx - TW / 2, sy - TH / 2);
    }
  }

  // 드로어블 수집 & 정렬
  const draws = [];
  for (const [i, o] of G.objs) {
    if (o.dead) continue;
    const x = i % MAP, y = (i / MAP) | 0;
    draws.push({ depth: x + y, fn: () => drawObj(o, x, y, ox, oy) });
  }
  for (const s of G.structs) draws.push({ depth: s.x + s.y, fn: () => drawStruct(s, ox, oy) });
  for (const m of G.mobs) draws.push({ depth: m.x + m.y + 0.01, fn: () => drawCreature(m, ox, oy) });
  draws.push({ depth: P.x + P.y + 0.02, fn: () => drawPlayer(ctx, worldSX(P.x, P.y) + ox, worldSY(P.x, P.y) + oy, P.path.length ? animT : 0, P.face < 0, P.swing) });
  draws.sort((a, b) => a.depth - b.depth);
  for (const d of draws) d.fn();

  // 비
  if (G.rain) drawRain();

  // 어둠 & 빛
  drawDarkness(ox, oy);

  // 근처 오브젝트 라벨
  drawLabels(ox, oy);

  // 떠다니는 텍스트
  ctx.textAlign = 'center'; ctx.font = 'bold 15px "Gowun Dodum", sans-serif';
  for (const f of G.floats) {
    ctx.globalAlpha = clamp(1.6 - f.t, 0, 1);
    ctx.fillStyle = '#000';
    const fx = worldSX(f.x, f.y) + ox, fy = worldSY(f.x, f.y) + oy - 30 - f.t * 24;
    ctx.fillText(f.txt, fx + 1, fy + 1);
    ctx.fillStyle = f.color;
    ctx.fillText(f.txt, fx, fy);
  }
  ctx.globalAlpha = 1;
}

function drawObj(o, x, y, ox, oy) {
  const sx = worldSX(x, y) + ox, sy = worldSY(x, y) + oy;
  const map = {
    tree: [SPR.tree, 36, 90], bush: [SPR.bush, 28, 40], rock: [SPR.rock, 32, 44],
    twig: [SPR.twig, 20, 20], flint: [SPR.flint, 18, 18], pebble: [SPR.pebble, 18, 18],
    berry: [SPR.berry, 24, 34], bean: [SPR.bean, 22, 36], nest: [SPR.nest, 24, 26],
  };
  const [spr, ax, ay] = map[o.type];
  // 채집 중 흔들림
  let shake = 0;
  if (P.target && P.target.o === o && P.actProg > 0.4) shake = Math.sin(animT * 40) * 2;
  ctx.drawImage(spr, sx - ax + shake, sy - ay + 8);
}

function drawStruct(s, ox, oy) {
  const sx = worldSX(s.x, s.y) + ox, sy = worldSY(s.x, s.y) + oy;
  if (s.type === 'campfire') {
    ctx.drawImage(SPR.campfire, sx - 28, sy - 36);
    if (s.lit) ctx.drawImage(SPR.flame[(animT * 8 | 0) % 3], sx - 20, sy - 52);
  } else if (s.type === 'furnace') {
    ctx.drawImage(SPR.furnace, sx - 32, sy - 48);
    if (s.lit) {
      ctx.fillStyle = `rgba(255,150,40,${0.6 + Math.sin(animT * 9) * 0.3})`;
      ctx.beginPath(); ctx.arc(sx, sy - 6, 5, 0, Math.PI * 2); ctx.fill();
    }
  } else if (s.type === 'bed') {
    ctx.drawImage(SPR.bed, sx - 32, sy - 24);
  } else if (s.type === 'field') {
    ctx.drawImage(SPR.field, sx - 32, sy - 20);
    if (s.planted) {
      const grown = (s.growT || 0) >= FIELD_GROW * DAY_LEN;
      const spr = grown ? SPR.sprout[1] : SPR.sprout[0];
      ctx.drawImage(spr, sx - spr.width / 2, sy - spr.height + 4);
      if (!grown) { // 어린 싹 몇 개 더
        ctx.drawImage(SPR.sprout[0], sx - 16, sy - 16);
        ctx.drawImage(SPR.sprout[0], sx + 2, sy - 12);
      }
    }
  }
}

function drawCreature(m, ox, oy) {
  const sx = worldSX(m.x, m.y) + ox, sy = worldSY(m.x, m.y) + oy;
  const r = m.hp / m.maxHp;
  const flip = m.face < 0;
  if (m.type === 'rabbit') drawRabbit(ctx, sx, sy, m.t, r, flip);
  else if (m.type === 'boar') drawBoar(ctx, sx, sy, m.t, r, flip, m.angry);
  else if (m.type === 'wolf') drawWolf(ctx, sx, sy, m.t, r, flip);
  else drawMob(ctx, sx, sy, m.t, r);
}

// 빗줄기
function drawRain() {
  ctx.save();
  ctx.strokeStyle = 'rgba(180,215,235,.4)';
  ctx.lineWidth = 1.2;
  const n = 90;
  for (let i = 0; i < n; i++) {
    // 의사 난수 고정 배치 + 시간 흐름
    const seed = i * 37.71;
    const x = ((seed * 13.3 + animT * 320) % (VW + 120)) - 60;
    const y = ((seed * 71.7 + animT * 640) % (VH + 40)) - 20;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 5, y + 14);
    ctx.stroke();
  }
  // 차가운 색조
  ctx.fillStyle = 'rgba(60,90,120,.10)';
  ctx.fillRect(0, 0, VW, VH);
  ctx.restore();
}

// 어둠 오버레이(빛 구멍 뚫기)
const darkCanvas = document.createElement('canvas');
function drawDarkness(ox, oy) {
  const alpha = darknessAlpha();
  darkCanvas.width = VW; darkCanvas.height = VH;
  const dctx = darkCanvas.getContext('2d');
  // 기본 비네트(낮에도 가장자리 어둡게 - 원작 느낌)
  const vg = dctx.createRadialGradient(VW/2, VH/2, Math.min(VW,VH)*0.32, VW/2, VH/2, Math.max(VW,VH)*0.72);
  vg.addColorStop(0, `rgba(0,0,0,${alpha})`);
  vg.addColorStop(1, `rgba(0,0,0,${Math.max(alpha, 0.88)})`);
  dctx.fillStyle = vg;
  dctx.fillRect(0, 0, VW, VH);

  dctx.globalCompositeOperation = 'destination-out';
  const lights = [];
  // 플레이어 기본 시야
  lights.push({ x: P.x, y: P.y, r: alpha > 0.5 ? 2.2 : 8, warm: false });
  if (P.equipLight >= 0 && P.inv[P.equipLight])
    lights.push({ x: P.x, y: P.y, r: ITEMS[P.inv[P.equipLight].id].light || 4.6, warm: true });
  for (const s of G.structs) {
    const def = STRUCTS[s.type];
    if (def.light && s.lit && s.life > 0) lights.push({ x: s.x, y: s.y, r: def.light, warm: true });
  }
  for (const l of lights) {
    const sx = worldSX(l.x, l.y) + ox, sy = worldSY(l.x, l.y) + oy - 10;
    const pr = l.r * TW * 0.62 * (1 + (l.warm ? Math.sin(animT * 7) * 0.03 : 0));
    const g = dctx.createRadialGradient(sx, sy, pr * 0.25, sx, sy, pr);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    dctx.fillStyle = g;
    dctx.beginPath(); dctx.arc(sx, sy, pr, 0, Math.PI * 2); dctx.fill();
  }
  dctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(darkCanvas, 0, 0);

  // 따뜻한 불빛 색감
  for (const l of lights) {
    if (!l.warm) continue;
    const sx = worldSX(l.x, l.y) + ox, sy = worldSY(l.x, l.y) + oy - 10;
    const pr = l.r * TW * 0.5;
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, pr);
    g.addColorStop(0, 'rgba(255,160,60,0.18)');
    g.addColorStop(1, 'rgba(255,160,60,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(sx, sy, pr, 0, Math.PI * 2); ctx.fill();
  }
}

// 근처 오브젝트 이름표
function drawLabels(ox, oy) {
  ctx.font = 'bold 16px "Gowun Dodum", sans-serif';
  ctx.textAlign = 'center';
  const r = 4;
  for (let y = Math.max(0, (P.y|0) - r); y <= Math.min(MAP-1, (P.y|0) + r); y++) {
    for (let x = Math.max(0, (P.x|0) - r); x <= Math.min(MAP-1, (P.x|0) + r); x++) {
      const o = G.objs.get(idx(x, y));
      if (!o || o.dead) continue;
      const def = WORLD_OBJS[o.type];
      const sx = worldSX(x, y) + ox, sy = worldSY(x, y) + oy;
      const toolMark = def.tool === 'axe' ? '🪓 ' : def.tool === 'pick' ? '⛏ ' : '';
      const label = toolMark + def.n;
      ctx.fillStyle = 'rgba(0,0,0,.7)';
      ctx.fillText(label, sx + 1, sy - (o.type === 'tree' ? 88 : 34) + 1);
      ctx.fillStyle = '#fff';
      ctx.fillText(label, sx, sy - (o.type === 'tree' ? 88 : 34));
    }
  }
  // 구조물 라벨
  for (const s of G.structs) {
    if (dist(s.x, s.y, P.x, P.y) > 4) continue;
    const sx = worldSX(s.x, s.y) + ox, sy = worldSY(s.x, s.y) + oy;
    let hint = STRUCTS[s.type].sleep ? ' (잠자기)' : STRUCTS[s.type].cook && s.lit ? ' (요리)' : '';
    if (STRUCTS[s.type].farm) {
      hint = !s.planted ? ' (심기)'
        : (s.growT || 0) >= FIELD_GROW * DAY_LEN ? ' (수확!)'
        : ' (성장중)';
    }
    ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillText(STRUCTS[s.type].n + hint, sx + 1, sy - 47);
    ctx.fillStyle = '#ffd94d'; ctx.fillText(STRUCTS[s.type].n + hint, sx, sy - 48);
  }
}

/* ---------- HUD ---------- */
const clockCanvas = $('clock'), clockCtx = clockCanvas.getContext('2d');
function updateHud() {
  $('lv-label').textContent = 'LV ' + P.level;
  $('day-label').textContent = G.day + ' DAYS';
  $('temp-val').textContent = Math.round(P.temp);
  $('shard-count').textContent = G.shards;
  setGauge('g-hp', P.hp / P.maxHp);
  setGauge('g-ep', P.ep / 100);
  setGauge('g-hunger', P.hunger / 100);
  setGauge('g-thirst', P.thirst / 100);
  setGauge('g-fatigue', 1 - P.fatigue / 100);
  // 시계
  const c = clockCtx; c.clearRect(0, 0, 72, 72);
  c.save(); c.translate(36, 36);
  c.beginPath(); c.arc(0, 0, 33, 0, Math.PI * 2);
  c.fillStyle = '#14140e'; c.fill();
  c.lineWidth = 4; c.strokeStyle = '#2e2e24'; c.stroke();
  // 낮(위 절반 노랑) / 밤(아래 남색)
  c.rotate(-Math.PI / 2 + G.t * Math.PI * 2);
  c.beginPath(); c.arc(0, 0, 28, -Math.PI * 0.52 - G.t * Math.PI * 2, Math.PI * 0.52 - G.t * Math.PI * 2);
  c.restore(); c.save(); c.translate(36, 36);
  c.beginPath(); c.arc(0, 0, 28, Math.PI, Math.PI * 2);
  c.fillStyle = '#e8c33d'; c.fill();
  c.beginPath(); c.arc(0, 0, 28, 0, Math.PI);
  c.fillStyle = '#232345'; c.fill();
  // 바늘: t=0.25 정오(위), t=0.75 자정(아래)
  c.rotate(G.t * Math.PI * 2 + Math.PI / 2);
  c.beginPath(); c.moveTo(0, 4); c.lineTo(0, -26);
  c.strokeStyle = '#0e0e08'; c.lineWidth = 3; c.stroke();
  c.beginPath(); c.arc(0, 0, 4, 0, Math.PI * 2); c.fillStyle = '#0e0e08'; c.fill();
  c.restore();
}
function setGauge(id, ratio) {
  const el = $(id);
  el.querySelector('.g-fill').style.height = clamp(ratio, 0, 1) * 100 + '%';
  el.classList.toggle('low', ratio < 0.25);
}

function updateQuickslots() {
  const slots = [
    { el: $('qs-light'), inv: P.equipLight, fallbackIcon: 'torch' },
    { el: $('qs-tool'), inv: P.equipTool, fallbackIcon: 'axe' },
  ];
  for (const s of slots) {
    const cv = s.el.querySelector('canvas'), c = cv.getContext('2d');
    c.clearRect(0, 0, 52, 52);
    const dur = s.el.querySelector('.qs-dur');
    if (s.inv >= 0 && P.inv[s.inv]) {
      const item = P.inv[s.inv], def = ITEMS[item.id];
      c.drawImage(SPR.icons[item.id], 6, 6);
      s.el.classList.add('active');
      if (def.dur) {
        dur.style.display = 'block';
        dur.style.width = clamp(item.dur / def.dur, 0, 1) * 82 + '%';
        dur.style.background = item.dur / def.dur > 0.3 ? '#4caf50' : '#ff5252';
      } else dur.style.display = 'none';
    } else {
      c.globalAlpha = 0.22;
      c.drawImage(SPR.icons[s.fallbackIcon], 6, 6);
      c.globalAlpha = 1;
      s.el.classList.remove('active');
      dur.style.display = 'none';
    }
  }
}

/* ---------- 패널: 인벤토리 ---------- */
let selSlot = -1;
function updateInvPanel() {
  const grid = $('inv-grid');
  grid.innerHTML = '';
  P.inv.forEach((s, i) => {
    const el = document.createElement('div');
    el.className = 'inv-slot' + (i === selSlot ? ' sel' : '');
    const cv = document.createElement('canvas'); cv.width = 40; cv.height = 40;
    cv.getContext('2d').drawImage(SPR.icons[s.id], 0, 0);
    el.appendChild(cv);
    if (s.qty > 1) { const q = document.createElement('span'); q.className = 'qty'; q.textContent = s.qty; el.appendChild(q); }
    if (i === P.equipTool || i === P.equipLight || i === P.equipArmor) { const e = document.createElement('span'); e.className = 'equipped'; e.textContent = '장착'; el.appendChild(e); }
    el.onclick = () => { selSlot = selSlot === i ? -1 : i; updateInvPanel(); };
    grid.appendChild(el);
  });
  for (let i = P.inv.length; i < 20; i++) {
    const el = document.createElement('div'); el.className = 'inv-slot'; grid.appendChild(el);
  }
  // 상세
  const info = $('inv-info');
  if (selSlot >= 0 && P.inv[selSlot]) {
    const s = P.inv[selSlot], def = ITEMS[s.id];
    info.classList.remove('hidden');
    $('inv-info-name').textContent = def.n + (def.dur ? `  (내구도 ${Math.ceil(s.dur)}/${def.dur})` : '');
    $('inv-info-desc').textContent = def.desc || '';
    const btns = $('inv-info-btns'); btns.innerHTML = '';
    if (def.food) addBtn(btns, '먹기', () => { eatItem(selSlot); });
    if (s.id === 'waterskin') addBtn(btns, `마시기 (${Math.floor(s.dur)}/${def.dur})`, () => { useWaterskin(selSlot); });
    if (def.equip) addBtn(btns, (selSlot === P.equipTool || selSlot === P.equipLight || selSlot === P.equipArmor) ? '해제' : '장착', () => { equipItem(selSlot); });
    addBtn(btns, '버리기', () => { removeSlot(selSlot); selSlot = -1; updateInvPanel(); updateQuickslots(); });
  } else info.classList.add('hidden');
}
function addBtn(parent, label, fn) {
  const b = document.createElement('button');
  b.className = 'menu-btn'; b.style.flex = '1'; b.textContent = label;
  b.onclick = fn; parent.appendChild(b);
}

/* ---------- 패널: 제작 ---------- */
let craftCat = '도구';
function openCraftTab(cat) {
  craftCat = cat;
  openPanel('panel-craft');
  updateCraftPanel();
}
function updateCraftPanel() {
  const tabs = $('craft-tabs');
  tabs.innerHTML = '';
  for (const cat of CRAFT_CATS) {
    const b = document.createElement('button');
    b.className = 'craft-tab' + (cat === craftCat ? ' active' : '');
    b.textContent = cat;
    b.onclick = () => { craftCat = cat; updateCraftPanel(); };
    tabs.appendChild(b);
  }
  const list = $('craft-list');
  list.innerHTML = '';
  for (const r of RECIPES.filter(r => r.cat === craftCat)) {
    const lockedLv = P.level < (r.lv || 1);
    const lockedFire = r.fire && !nearFire();
    const lockedSmelt = r.smelt && !nearFurnace();
    const card = document.createElement('div');
    card.className = 'craft-card' + ((lockedLv || lockedFire || lockedSmelt) ? ' locked' : '');
    const name = r.place ? STRUCTS[r.out].n : ITEMS[r.out].n;
    const iconWrap = document.createElement('div'); iconWrap.className = 'cc-icon';
    const cv = document.createElement('canvas'); cv.width = 40; cv.height = 40;
    cv.style.transform = 'scale(1.7)';
    cv.getContext('2d').drawImage(SPR.icons[r.out], 0, 0);
    iconWrap.appendChild(cv);
    if (lockedLv || lockedFire || lockedSmelt) {
      const lock = document.createElement('div'); lock.className = 'cc-lock';
      lock.textContent = lockedLv ? (r.lock || `레벨 ${r.lv} 필요`) : lockedSmelt ? '화덕 근처 필요' : '불 근처 필요';
      iconWrap.appendChild(lock);
    }
    // 재료
    const mats = document.createElement('div'); mats.className = 'cc-mats';
    for (const [id, n] of Object.entries(r.mats)) {
      const have = invCount(id);
      const m = document.createElement('div');
      m.className = 'cc-mat' + (have < n ? ' lack' : '');
      const mc = document.createElement('canvas'); mc.width = 20; mc.height = 20;
      mc.getContext('2d').drawImage(SPR.icons[id], 0, 0, 40, 40, 0, 0, 20, 20);
      m.appendChild(mc);
      m.appendChild(document.createTextNode(n));
      m.title = ITEMS[id].n;
      mats.appendChild(m);
    }
    iconWrap.appendChild(mats);
    card.appendChild(iconWrap);
    const nm = document.createElement('div'); nm.className = 'cc-name'; nm.textContent = name;
    card.appendChild(nm);
    card.onclick = () => craft(r);
    list.appendChild(card);
  }
}

/* ---------- 패널: 캐릭터 ---------- */
function updateCharPanel() {
  $('char-title').innerHTML = `레벨. ${P.level}&nbsp;&nbsp;직업: 모험가`;
  const weapon = P.equipTool >= 0 ? ITEMS[P.inv[P.equipTool].id] : null;
  const atk = 3 + (weapon ? weapon.dmg : 0) + Math.floor(P.str / 5);
  const rows = [
    ['힘', P.str], ['민첩', P.agi], ['지능', P.int], ['체력', P.vit], ['운', P.luck],
    ['생명력', `${Math.ceil(P.hp)} / ${P.maxHp}`],
    ['에너지', `${Math.ceil(P.ep)} / 100`],
    ['공격력', atk], ['방어력', armorDef()], ['치명타 확률', `${Math.round(8 + P.luck / 2)}%`],
    ['이동 속도', 10], ['배고픔', Math.round(P.hunger)], ['갈증', Math.round(P.thirst)],
    ['피로도', Math.round(P.fatigue)], ['체온', Math.round(P.temp) + '°'],
    ['어둠의 파편', G.shards], ['생존 일수', G.day + '일'],
  ];
  $('char-cols').innerHTML = rows.map(([k, v]) => `<div><b>${k}</b>: ${v}</div>`).join('');
  const need = EXP_TABLE(P.level);
  $('char-exp-fill').style.width = (P.exp / need * 100) + '%';
  $('char-exp-label').textContent = `EXP ${P.exp} / ${need}`;
}

/* ---------- 패널 공통 ---------- */
const PANELS = ['panel-inv', 'panel-craft', 'panel-char', 'panel-settings', 'panel-help', 'panel-struct'];
function openPanel(id) {
  PANELS.forEach(p => $(p).classList.add('hidden'));
  $(id).classList.remove('hidden');
  if (id === 'panel-inv') updateInvPanel();
  if (id === 'panel-craft') updateCraftPanel();
  if (id === 'panel-char') updateCharPanel();
}
function togglePanel(id) {
  const isOpen = !$(id).classList.contains('hidden');
  PANELS.forEach(p => $(p).classList.add('hidden'));
  if (!isOpen) openPanel(id);
}

/* ---------- 저장 / 불러오기 ---------- */
function save() {
  try {
    const objsArr = [];
    for (const [i, o] of G.objs) objsArr.push([i, o.type, o.hp, o.dead ? 1 : 0, o.respawnAt || 0]);
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      seed: worldSeed, day: G.day, t: G.t, shards: G.shards, questIdx: G.questIdx,
      counters: G.counters, structs: G.structs, sound: G.sound, objs: objsArr,
      rain: G.rain, rainT: G.rainT,
      p: { x: P.x, y: P.y, level: P.level, exp: P.exp, hp: P.hp, maxHp: P.maxHp,
           ep: P.ep, hunger: P.hunger, thirst: P.thirst, fatigue: P.fatigue, temp: P.temp,
           inv: P.inv, equipTool: P.equipTool, equipLight: P.equipLight, equipArmor: P.equipArmor,
           str: P.str, agi: P.agi, int: P.int, vit: P.vit, luck: P.luck },
    }));
  } catch (e) { /* 저장 공간 부족 등 */ }
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    worldSeed = d.seed;
    genWorld();
    G.objs.clear();
    for (const [i, type, hp, dead, respawnAt] of d.objs)
      G.objs.set(i, { type, hp, dead: !!dead, respawnAt });
    G.day = d.day; G.t = d.t; G.shards = d.shards; G.questIdx = d.questIdx;
    G.counters = d.counters || {}; G.structs = d.structs || []; G.sound = d.sound !== false;
    G.rain = !!d.rain; G.rainT = d.rainT || 0;
    Object.assign(P, d.p);
    if (P.equipArmor === undefined) P.equipArmor = -1; // 구버전 저장 호환
    return true;
  } catch (e) { return false; }
}
function hardReset() {
  localStorage.removeItem(SAVE_KEY);
  location.reload();
}

/* ---------- 입력 ---------- */
function bindInput() {
  canvas.addEventListener('pointerdown', (e) => {
    if (AC && AC.state === 'suspended') AC.resume();
    const { ox, oy } = camOffset();
    const mx = e.clientX - ox, my = e.clientY - oy;
    const wx = (mx / (TW / 2) + my / (TH / 2)) / 2;
    const wy = (my / (TH / 2) - mx / (TW / 2)) / 2;
    tapWorld(wx, wy);
  });
  $('btn-bag').onclick = () => togglePanel('panel-inv');
  $('btn-craft').onclick = () => togglePanel('panel-craft');
  $('btn-char').onclick = () => togglePanel('panel-char');
  $('btn-settings').onclick = () => togglePanel('panel-settings');
  $('btn-attack').onclick = () => { if (!G.gameOver) attackNearest(); };
  $('btn-wait').onclick = () => { P.path = []; P.target = null; toast('잠시 숨을 고릅니다…'); };
  $('qs-light').onclick = () => {
    if (P.equipLight >= 0) { P.equipLight = -1; }
    else { const i = P.inv.findIndex(s => ITEMS[s.id].equip === 'light'); if (i >= 0) P.equipLight = i; else toast('횃불이 없습니다.'); }
    updateQuickslots();
  };
  $('qs-tool').onclick = () => {
    if (P.equipTool >= 0) {
      // 다음 도구로 순환
      const tools = P.inv.map((s, i) => ({ s, i })).filter(o => ITEMS[o.s.id].equip === 'tool');
      const cur = tools.findIndex(o => o.i === P.equipTool);
      P.equipTool = tools.length > 1 ? tools[(cur + 1) % tools.length].i : -1;
    } else {
      const i = P.inv.findIndex(s => ITEMS[s.id].equip === 'tool');
      if (i >= 0) P.equipTool = i; else toast('도구가 없습니다.');
    }
    updateQuickslots();
  };
  document.querySelectorAll('.panel-close').forEach(b => b.onclick = () => $(b.dataset.close).classList.add('hidden'));
  $('set-save').onclick = () => { save(); toast('저장되었습니다.', '#8f8'); };
  $('set-sound').onclick = () => { G.sound = !G.sound; $('set-sound').textContent = G.sound ? '🔊 소리: 켜짐' : '🔇 소리: 꺼짐'; };
  $('set-help').onclick = () => openPanel('panel-help');
  $('set-reset').onclick = () => { if (confirm('정말 처음부터 시작할까요? 저장 데이터가 사라집니다.')) hardReset(); };
  $('btn-revive').onclick = revive;
  window.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
}

/* ---------- 메인 루프 ---------- */
let lastT = 0;
let hudTimer = 0, saveTimer = 0;
function loop(ts) {
  const dt = Math.min((ts - lastT) / 1000, 0.1);
  lastT = ts;
  animT += dt;
  if (!G.gameOver && !G.sleeping) {
    updateTime(dt);
    updateWeather(dt);
    updatePlayer(dt);
    updateMobs(dt);
    updateSurvival(dt);
  }
  // 떠다니는 텍스트
  for (let i = G.floats.length - 1; i >= 0; i--) {
    G.floats[i].t += dt;
    if (G.floats[i].t > 1.6) G.floats.splice(i, 1);
  }
  render();
  hudTimer -= dt;
  if (hudTimer <= 0) { hudTimer = 0.2; updateHud(); }
  saveTimer += dt;
  if (saveTimer > 15) { saveTimer = 0; save(); }
  requestAnimationFrame(loop);
}

/* ---------- 시작 ---------- */
function start() {
  initSprites();
  resize();
  if (!load()) {
    genWorld();
    toast('야생에서 살아남으세요!', '#ffe066');
  }
  bindInput();
  renderMissions();
  updateHud();
  updateQuickslots();
  requestAnimationFrame((ts) => { lastT = ts; requestAnimationFrame(loop); });
}
start();
