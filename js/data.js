// ===== 야생의 어둠 : 게임 데이터 (오리지널) =====
'use strict';

const ITEMS = {
  grass:      { n:'풀',        desc:'질긴 마른 풀. 끈이나 불쏘시개로 쓴다.' },
  twig:       { n:'나뭇가지',  desc:'가느다란 나뭇가지. 기본 재료.' },
  log:        { n:'통나무',    desc:'묵직한 통나무. 나무를 베면 얻는다.' },
  stone:      { n:'돌멩이',    desc:'단단한 돌. 건축과 도구에 쓴다.' },
  flint:      { n:'부싯돌',    desc:'날카로운 부싯돌. 도구의 날이 된다.' },
  berry:      { n:'산딸기',    desc:'새콤한 야생 딸기.', food:{hunger:8, thirst:3, hp:1} },
  bean:       { n:'콩',        desc:'야생 콩. 구우면 더 든든하다.', food:{hunger:6} },
  egg:        { n:'새알',      desc:'둥지에서 얻은 알. 날로 먹긴 좀…', food:{hunger:9} },
  cookedEgg:  { n:'구운 새알', desc:'노릇하게 구운 알.', food:{hunger:26, hp:4} },
  cookedBean: { n:'구운 콩',   desc:'고소하게 구운 콩.', food:{hunger:16, hp:2} },
  shard:      { n:'어둠의 파편', desc:'어둠의 정령이 남긴 수상한 조각.' },
  torch:      { n:'횃불',      desc:'어둠을 밝힌다. 시간이 지나면 꺼진다.', equip:'light', dur:120 },
  axe:        { n:'돌도끼',    desc:'나무를 벨 수 있다.', equip:'tool', tool:'axe', dmg:4, dur:40 },
  pick:       { n:'돌곡괭이',  desc:'바위를 캘 수 있다.', equip:'tool', tool:'pick', dmg:3, dur:40 },
  spear:      { n:'돌창',      desc:'믿음직한 사냥 무기.', equip:'tool', tool:'spear', dmg:8, dur:50 },
};

// 설치형 구조물
const STRUCTS = {
  campfire: { n:'모닥불', light:6.5, warm:true, cook:true, life:1.0 },   // life: 게임일 단위 연료
  furnace:  { n:'화덕',   light:5,   warm:true, cook:true, life:2.0 },
  bed:      { n:'침낭',   light:0,   sleep:true },
};

const RECIPES = [
  { cat:'도구',   out:'axe',   qty:1, mats:{twig:1, flint:1},          lv:1 },
  { cat:'도구',   out:'pick',  qty:1, mats:{twig:1, flint:1, stone:1}, lv:1 },
  { cat:'무기',   out:'spear', qty:1, mats:{twig:2, flint:1},          lv:2, lock:'레벨 2 필요' },
  { cat:'불/야영', out:'torch', qty:1, mats:{grass:1, twig:1},          lv:1 },
  { cat:'불/야영', out:'campfire', place:true, mats:{grass:2, log:1},   lv:1 },
  { cat:'불/야영', out:'furnace',  place:true, mats:{stone:4, log:4},   lv:3, lock:'레벨 3 필요' },
  { cat:'불/야영', out:'bed',      place:true, mats:{grass:6},          lv:1 },
  { cat:'요리',   out:'cookedEgg',  qty:1, mats:{egg:1},  lv:1, fire:true },
  { cat:'요리',   out:'cookedBean', qty:1, mats:{bean:1}, lv:1, fire:true },
];
const CRAFT_CATS = ['도구','무기','불/야영','요리'];

// ===== 미션 체인 =====
// need: {type, key, n}  type: collect | craft | place | kill | day | drink
const QUESTS = [
  { title:'시작 미션', exp:20, lines:[
    { t:'나뭇가지를 1개 수집', type:'collect', key:'twig',  n:1 },
    { t:'부싯돌을 1개 수집',   type:'collect', key:'flint', n:1 },
  ]},
  { title:'시작 미션', exp:25, lines:[
    { t:'돌도끼 제작', type:'craft', key:'axe', n:1 },
  ]},
  { title:'시작 미션', exp:30, lines:[
    { t:'나무를 베어 통나무 2개 수집', type:'collect', key:'log', n:2 },
    { t:'풀을 3개 수집', type:'collect', key:'grass', n:3 },
  ]},
  { title:'시작 미션', exp:30, lines:[
    { t:'횃불 제작', type:'craft', key:'torch', n:1 },
  ]},
  { title:'시작 미션', exp:40, lines:[
    { t:'모닥불 설치', type:'place', key:'campfire', n:1 },
  ]},
  { title:'일반 미션', exp:40, lines:[
    { t:'물 마시기', type:'drink', key:'water', n:1 },
    { t:'음식 먹기', type:'eat', key:'any', n:1 },
  ]},
  { title:'일반 미션', exp:60, lines:[
    { t:'첫날 밤 살아남기 (2일차 도달)', type:'day', key:'day', n:2 },
  ]},
  { title:'일반 미션', exp:80, lines:[
    { t:'어둠의 정령 처치', type:'kill', key:'wisp', n:1 },
  ]},
  { title:'일반 미션', exp:100, lines:[
    { t:'침낭 설치 후 잠자기', type:'sleep', key:'bed', n:1 },
    { t:'어둠의 파편 3개 수집', type:'collect', key:'shard', n:3 },
  ]},
];

// ===== 몬스터 =====
const MOBS = {
  wisp: { n:'어둠의 정령', hp:24, dmg:6, speed:2.2, exp:15, aggro:6.5,
          drops:[{id:'shard', q:1, p:1}, {id:'shard', q:1, p:0.35}] },
};

// 세계 오브젝트 정의
// tool: 필요 도구(null=맨손), hits: 채집 타수, yields: 드롭
const WORLD_OBJS = {
  tree:   { n:'나무',     tool:'axe',  hits:4, yields:[{id:'log',q:2},{id:'twig',q:1}], respawn:0,   solid:true },
  bush:   { n:'수풀',     tool:null,   hits:1, yields:[{id:'grass',q:2}],               respawn:90 },
  rock:   { n:'바위',     tool:'pick', hits:4, yields:[{id:'stone',q:2},{id:'flint',q:1}], respawn:0, solid:true },
  twig:   { n:'나뭇가지', tool:null,   hits:1, yields:[{id:'twig',q:1}],                respawn:120 },
  flint:  { n:'부싯돌',   tool:null,   hits:1, yields:[{id:'flint',q:1}],               respawn:150 },
  pebble: { n:'돌멩이',   tool:null,   hits:1, yields:[{id:'stone',q:1}],               respawn:150 },
  berry:  { n:'산딸기',   tool:null,   hits:1, yields:[{id:'berry',q:2}],               respawn:120 },
  bean:   { n:'콩',       tool:null,   hits:1, yields:[{id:'bean',q:2}],                respawn:120 },
  nest:   { n:'새알',     tool:null,   hits:1, yields:[{id:'egg',q:2}],                 respawn:180 },
};

const EXP_TABLE = lv => 40 + (lv-1)*35;  // 다음 레벨까지 필요 경험치
