// ===== 야생의 어둠 : 게임 데이터 (오리지널) =====
'use strict';

const ITEMS = {
  grass:      { n:'풀',        desc:'질긴 마른 풀. 끈이나 불쏘시개로 쓴다.' },
  twig:       { n:'나뭇가지',  desc:'가느다란 나뭇가지. 기본 재료.' },
  log:        { n:'통나무',    desc:'묵직한 통나무. 나무를 베면 얻는다.' },
  stone:      { n:'돌멩이',    desc:'단단한 돌. 건축과 도구에 쓴다.' },
  flint:      { n:'부싯돌',    desc:'날카로운 부싯돌. 도구의 날이 된다.' },
  ironOre:    { n:'철광석',    desc:'붉은 녹이 낀 광석. 화덕에서 제련하자.' },
  iron:       { n:'철괴',      desc:'제련된 철. 튼튼한 도구의 재료.' },
  hide:       { n:'가죽',      desc:'짐승의 가죽. 옷과 주머니를 만든다.' },
  berry:      { n:'산딸기',    desc:'새콤한 야생 딸기.', food:{hunger:8, thirst:3, hp:1} },
  bean:       { n:'콩',        desc:'야생 콩. 밭에 심거나 구워 먹는다.', food:{hunger:6} },
  egg:        { n:'새알',      desc:'둥지에서 얻은 알. 날로 먹긴 좀…', food:{hunger:9} },
  rawMeat:    { n:'생고기',    desc:'신선한 고기. 구워야 제맛.', food:{hunger:8} },
  fish:       { n:'생선',      desc:'펄떡이는 물고기.', food:{hunger:8} },
  cookedEgg:  { n:'구운 새알', desc:'노릇하게 구운 알.', food:{hunger:26, hp:4} },
  cookedBean: { n:'구운 콩',   desc:'고소하게 구운 콩.', food:{hunger:16, hp:2} },
  cookedMeat: { n:'구운 고기', desc:'육즙 가득한 스테이크.', food:{hunger:38, hp:6} },
  cookedFish: { n:'구운 생선', desc:'담백한 생선구이.', food:{hunger:30, hp:5} },
  shard:      { n:'어둠의 파편', desc:'어둠의 정령이 남긴 수상한 조각. 기이한 물건을 만들 수 있다.' },
  torch:      { n:'횃불',      desc:'어둠을 밝힌다. 밤에 들고 있으면 타들어간다.', equip:'light', dur:120, light:4.6 },
  lantern:    { n:'정령의 등불', desc:'어둠의 파편이 은은히 빛난다. 꺼지지 않는다.', equip:'light', light:5.6 },
  axe:        { n:'돌도끼',    desc:'나무를 벨 수 있다.', equip:'tool', tool:'axe', dmg:4, dur:40 },
  pick:       { n:'돌곡괭이',  desc:'바위를 캘 수 있다.', equip:'tool', tool:'pick', dmg:3, dur:40 },
  ironAxe:    { n:'철도끼',    desc:'잘 벼려진 도끼. 오래 쓰고 강하다.', equip:'tool', tool:'axe', dmg:8, dur:110 },
  ironPick:   { n:'철곡괭이',  desc:'단단한 곡괭이. 바위가 두렵지 않다.', equip:'tool', tool:'pick', dmg:7, dur:110 },
  rod:        { n:'낚싯대',    desc:'물가에서 장착하고 물을 탭하면 낚시를 한다.', equip:'tool', tool:'rod', dmg:1, dur:25 },
  spear:      { n:'돌창',      desc:'믿음직한 사냥 무기.', equip:'tool', tool:'spear', dmg:8, dur:50 },
  darkBlade:  { n:'어둠의 검', desc:'파편이 스며든 검. 밤을 베는 힘.', equip:'tool', tool:'blade', dmg:14, dur:90 },
  waterskin:  { n:'물주머니',  desc:'물을 담아 다닌다. 물가에서 마시면 자동으로 채워진다.', dur:3 },
  leatherArmor:{ n:'가죽옷',   desc:'짐승 가죽으로 만든 옷. 몸을 지키고 따뜻하다.', equip:'armor', def:3, warm:6 },
};

// 설치형 구조물
const STRUCTS = {
  campfire: { n:'모닥불', light:6.5, warm:true, cook:true, life:1.0 },   // life: 게임일 단위 연료
  furnace:  { n:'화덕',   light:5,   warm:true, cook:true, smelt:true, life:2.0 },
  bed:      { n:'침낭',   light:0,   sleep:true },
  field:    { n:'밭',     light:0,   farm:true },
};

const RECIPES = [
  { cat:'도구',   out:'axe',      qty:1, mats:{twig:1, flint:1},          lv:1 },
  { cat:'도구',   out:'pick',     qty:1, mats:{twig:1, flint:1, stone:1}, lv:1 },
  { cat:'도구',   out:'rod',      qty:1, mats:{twig:2, grass:2},          lv:2, lock:'레벨 2 필요' },
  { cat:'도구',   out:'ironAxe',  qty:1, mats:{iron:1, twig:1},           lv:3, lock:'레벨 3 필요' },
  { cat:'도구',   out:'ironPick', qty:1, mats:{iron:1, twig:1},           lv:3, lock:'레벨 3 필요' },
  { cat:'도구',   out:'iron',     qty:1, mats:{ironOre:2},                lv:3, lock:'레벨 3 필요', smelt:true },
  { cat:'무기',   out:'spear',    qty:1, mats:{twig:2, flint:1},          lv:2, lock:'레벨 2 필요' },
  { cat:'무기',   out:'darkBlade',qty:1, mats:{shard:5, flint:2, twig:1}, lv:4, lock:'레벨 4 필요' },
  { cat:'장비',   out:'waterskin',qty:1, mats:{hide:1, grass:1},          lv:1 },
  { cat:'장비',   out:'leatherArmor', qty:1, mats:{hide:3, grass:2},      lv:2, lock:'레벨 2 필요' },
  { cat:'장비',   out:'lantern',  qty:1, mats:{shard:3, twig:1},          lv:3, lock:'레벨 3 필요' },
  { cat:'불/야영', out:'torch',    qty:1, mats:{grass:1, twig:1},          lv:1 },
  { cat:'불/야영', out:'campfire', place:true, mats:{grass:2, log:1},      lv:1 },
  { cat:'불/야영', out:'furnace',  place:true, mats:{stone:4, log:4},      lv:3, lock:'레벨 3 필요' },
  { cat:'불/야영', out:'bed',      place:true, mats:{grass:6},             lv:1 },
  { cat:'불/야영', out:'field',    place:true, mats:{twig:2, grass:2},     lv:2, lock:'레벨 2 필요' },
  { cat:'요리',   out:'cookedEgg',  qty:1, mats:{egg:1},     lv:1, fire:true },
  { cat:'요리',   out:'cookedBean', qty:1, mats:{bean:1},    lv:1, fire:true },
  { cat:'요리',   out:'cookedMeat', qty:1, mats:{rawMeat:1}, lv:1, fire:true },
  { cat:'요리',   out:'cookedFish', qty:1, mats:{fish:1},    lv:1, fire:true },
];
const CRAFT_CATS = ['도구','무기','장비','불/야영','요리'];

// ===== 미션 체인 =====
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
  { title:'사냥꾼의 길', exp:80, lines:[
    { t:'토끼 사냥하기', type:'kill', key:'rabbit', n:1 },
    { t:'구운 고기 만들기', type:'craft', key:'cookedMeat', n:1 },
  ]},
  { title:'사냥꾼의 길', exp:80, lines:[
    { t:'낚싯대 제작', type:'craft', key:'rod', n:1 },
    { t:'물고기 낚기', type:'collect', key:'fish', n:1 },
  ]},
  { title:'개척자의 길', exp:90, lines:[
    { t:'밭 설치하기', type:'place', key:'field', n:1 },
    { t:'콩 수확하기', type:'harvest', key:'bean', n:3 },
  ]},
  { title:'개척자의 길', exp:100, lines:[
    { t:'가죽옷 제작', type:'craft', key:'leatherArmor', n:1 },
    { t:'물주머니 제작', type:'craft', key:'waterskin', n:1 },
  ]},
  { title:'대장장이의 길', exp:110, lines:[
    { t:'화덕 설치하기', type:'place', key:'furnace', n:1 },
    { t:'철광석 2개 수집', type:'collect', key:'ironOre', n:2 },
  ]},
  { title:'대장장이의 길', exp:120, lines:[
    { t:'철괴 제련하기', type:'craft', key:'iron', n:1 },
    { t:'철 도구 제작 (철도끼 또는 철곡괭이)', type:'craft', key:'ironTool', n:1 },
  ]},
  { title:'어둠 속으로', exp:140, lines:[
    { t:'어둠의 늑대 처치 (3일차 밤부터 출현)', type:'kill', key:'wolf', n:1 },
  ]},
  { title:'어둠 속으로', exp:180, lines:[
    { t:'정령의 등불 제작', type:'craft', key:'lantern', n:1 },
    { t:'어둠의 검 제작', type:'craft', key:'darkBlade', n:1 },
  ]},
];

// ===== 생물 =====
// kind: night(밤 몬스터) | animal(낮 동물)
// flee: 도망감 / retaliate: 맞으면 반격 / braveFire: 불빛을 무서워하지 않음
const MOBS = {
  wisp:   { n:'어둠의 정령', kind:'night', hp:24, dmg:6,  speed:2.2, exp:15, aggro:6.5,
            drops:[{id:'shard', q:1, p:1}, {id:'shard', q:1, p:0.35}] },
  wolf:   { n:'어둠의 늑대', kind:'night', hp:44, dmg:11, speed:2.7, exp:40, aggro:8, braveFire:true,
            drops:[{id:'shard', q:2, p:1}, {id:'hide', q:1, p:0.6}] },
  rabbit: { n:'토끼',       kind:'animal', hp:8,  dmg:0,  speed:3.1, exp:8, flee:true,
            drops:[{id:'rawMeat', q:1, p:1}, {id:'hide', q:1, p:0.5}] },
  boar:   { n:'멧돼지',     kind:'animal', hp:34, dmg:8,  speed:2.4, exp:25, retaliate:true,
            drops:[{id:'rawMeat', q:2, p:1}, {id:'hide', q:1, p:1}] },
};

// 세계 오브젝트 정의
const WORLD_OBJS = {
  tree:   { n:'나무',     tool:'axe',  hits:4, yields:[{id:'log',q:2},{id:'twig',q:1}], respawn:0,   solid:true },
  bush:   { n:'수풀',     tool:null,   hits:1, yields:[{id:'grass',q:2}],               respawn:90 },
  rock:   { n:'바위',     tool:'pick', hits:4, yields:[{id:'stone',q:2},{id:'flint',q:1},{id:'ironOre',q:1,p:0.55}], respawn:0, solid:true },
  twig:   { n:'나뭇가지', tool:null,   hits:1, yields:[{id:'twig',q:1}],                respawn:120 },
  flint:  { n:'부싯돌',   tool:null,   hits:1, yields:[{id:'flint',q:1}],               respawn:150 },
  pebble: { n:'돌멩이',   tool:null,   hits:1, yields:[{id:'stone',q:1}],               respawn:150 },
  berry:  { n:'산딸기',   tool:null,   hits:1, yields:[{id:'berry',q:2}],               respawn:120 },
  bean:   { n:'콩',       tool:null,   hits:1, yields:[{id:'bean',q:2}],                respawn:120 },
  nest:   { n:'새알',     tool:null,   hits:1, yields:[{id:'egg',q:2}],                 respawn:180 },
};

const FIELD_GROW = 0.6; // 밭 성장에 걸리는 게임일
const EXP_TABLE = lv => 40 + (lv-1)*35;  // 다음 레벨까지 필요 경험치
