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
  starHeart:  { n:'별의 심장', desc:'검은 오벨리스크 깊은 곳에서 꺼낸 차가운 핵. 지니고 있으면 어둠 속에서도 앞이 보인다.' },
};

// 설치형 구조물
const STRUCTS = {
  campfire: { n:'모닥불', light:6.5, warm:true, cook:true, life:1.0 },   // life: 게임일 단위 연료
  furnace:  { n:'화덕',   light:5,   warm:true, cook:true, smelt:true, life:2.0 },
  bed:      { n:'침낭',   light:0,   sleep:true },
  field:    { n:'밭',     light:0,   farm:true },
  jangseung:{ n:'수호 장승', light:0, ward:4.5 },                        // 밤 생물이 시선을 피함
  brazier:  { n:'빛의 화로', light:5.5, warm:true },                     // 연료 없이 영원히 탄다
};

// ===== 유적 =====
// tier1 고인돌: 맨손 조사 / tier2 석실: 곡괭이 필요 / tier3 오벨리스크: 밤 + 파편 3개 봉헌
const RUIN_DEFS = {
  dolmen:  { n:'고인돌',        tier:1, count:3 },
  chamber: { n:'무너진 석실',   tier:2, count:2 },
  obelisk: { n:'검은 오벨리스크', tier:3, count:1 },
  altar:   { n:'어둠의 제단',   tier:4, count:2 },  // 반복 사용 가능 (밤, 파편 2 봉헌)
};

// ===== 제단의 축복 =====
const BLESSINGS = [
  { id:'atk',    n:'힘의 축복',   desc:'공격력이 크게 오른다' },
  { id:'speed',  n:'바람의 축복', desc:'발걸음이 가벼워진다' },
  { id:'sight',  n:'별빛의 축복', desc:'어둠 속에서도 멀리 보인다' },
  { id:'bounty', n:'풍요의 축복', desc:'채집량이 2배가 된다' },
  { id:'heal',   n:'생명의 은총', desc:'몸과 마음이 온전히 회복된다', instant:true },
];

// ===== 방랑 상인 거래 목록 =====
const TRADES = [
  { give:{ shard:2 }, get:{ iron:1 },  label:'철괴 1' },
  { give:{ hide:2 },  get:{ shard:1 }, label:'어둠의 파편 1' },
  { give:{ shard:1 }, get:{ torch:2 }, label:'횃불 2' },
  { give:{ shard:5 }, get:'page',      label:'낡은 일기 한 장' },
];

// ===== 먼저 온 자의 일기 (12장) =====
const LORE_PAGES = [
  { t:'첫 밤',
    b:'배가 부서졌다. 나 혼자 살아남았다.\n이 섬의 밤은 이상하다. 어둠이 그냥 내려앉는 게 아니라… 움직인다. 숨을 쉬는 것처럼.\n오늘은 불을 피우지 못했다. 다시는 그런 실수를 하지 않겠다.' },
  { t:'돌을 세운 자들',
    b:'나보다 먼저 온 이들이 있었다. 숲 곳곳에 거대한 돌이 세워져 있다.\n처음엔 무덤인 줄 알았다. 아니다. 이건 자물쇠다.\n무언가를 가두기 위해, 혹은 무언가에게서 숨기 위해 세운 것이다.' },
  { t:'속삭임',
    b:'밤마다 땅 밑에서 낮은 웅웅거림이 올라온다. 벌레 소리가 아니다. 노래에 가깝다.\n이상한 건, 모닥불 곁에서는 들리지 않는다는 것.\n불이 소리를 막는 게 아니다. 그것이 불을 싫어하는 것이다.' },
  { t:'정령의 정체',
    b:'어둠 속을 떠도는 그림자를 하나 갈랐다. 안에서 보랏빛 조각이 나왔다.\n심장도, 뼈도 없다. 이것은 생물이 아니다.\n조각이다. 아주 큰 무언가가 부서진… 조각.' },
  { t:'발굴',
    b:'웅웅거림을 따라 섬의 중심을 팠다. 사흘을 팠다.\n검은 돌이 나왔다. 별처럼 매끄럽고 얼음처럼 차갑다.\n이건 이 땅의 돌이 아니다. 하늘에서 떨어진 것이다. 아주, 아주 오래 전에.' },
  { t:'별 아래 잠든 것',
    b:'그것은 죽어서 떨어진 게 아니다. 잠든 채 떨어진 것이다.\n부서진 조각들은 밤마다 깨어나 본체를 향해 기어간다.\n정령들이 어디로 걸어가는지 지켜보라. 전부 같은 방향이다.' },
  { t:'장승',
    b:'돌을 세운 자들이 남긴 벽화에서 배웠다. 나무 기둥에 얼굴을 새겨 세우는 것이다.\n조각들은 그 시선을 견디지 못한다. 눈이 없는 것들이 시선을 두려워하다니.\n어쩌면 저들이 무서워하는 건 지켜보는 자가 있다는 사실 그 자체인지도.' },
  { t:'실수',
    b:'파편을 너무 많이 모았다. 움집 안에 쌓아두었더니 밤에 서로 공명하며 운다.\n노래처럼. 아니, 부르는 것처럼.\n오늘 밤 정령이 여덟이나 왔다. 파편은 나눠서, 멀리, 묻어야 한다.' },
  { t:'늑대',
    b:'조각이 짐승의 몸에 파고들면 늑대 같은 것이 된다.\n눈이 붉게 타는 건 그 때문이다. 불을 두려워하지 않는 것도.\n몸을 얻은 조각은 영리하다. 모닥불 뒤에 숨어도 소용없다. 좋은 무기를 만들어라.' },
  { t:'등불',
    b:'파편을 단단히 가두면 빛을 낸다는 걸 알아냈다. 우습지 않은가.\n그것의 조각으로 그것의 어둠을 밀어내다니.\n이 등불은 꺼지지 않는다. 조각이 본체를 찾으려 내뿜는 빛이기 때문이다. 길을 잃은 자의 등대다.' },
  { t:'마지막 계획',
    b:'조각들을 모아 검을 벼렸다. 어둠은 어둠으로 베인다.\n그리고 오벨리스크 밑에서 그것의 심장을 꺼냈다. 차갑고, 희미하게 뛰고 있다.\n본체가 눈을 뜨기 전에 심장을 최대한 멀리 가져가야 한다. 내일 뗏목을 띄운다.' },
  { t:'당부',
    b:'이 글을 읽는 그대에게. 파편을 오벨리스크에 바치지 마라.\n…아니, 이미 바쳤겠지. 그러지 않았다면 이 장을 읽고 있을 리 없으니. 나도 그랬다.\n호기심은 이 섬의 또 다른 이름이다. 부디 심장을 지켜라. 밤은 길지만, 아침은 반드시 온다.' },
];

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
  { cat:'불/야영', out:'jangseung',place:true, mats:{log:2, stone:1},      lv:2, bp:'jangseung' },
  { cat:'불/야영', out:'brazier',  place:true, mats:{stone:3, shard:2},    lv:2, bp:'brazier' },
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
  { title:'먼저 온 자의 흔적', exp:100, lines:[
    { t:'고인돌 조사하기', type:'ruinTier', key:'1', n:1 },
    { t:'일기 2장 모으기', type:'pages', key:'any', n:2 },
  ]},
  { title:'먼저 온 자의 흔적', exp:130, lines:[
    { t:'무너진 석실 조사 (곡괭이 필요)', type:'ruinTier', key:'2', n:1 },
    { t:'일기 6장 모으기', type:'pages', key:'any', n:6 },
  ]},
  { title:'별 아래 잠든 것', exp:200, lines:[
    { t:'밤에 검은 오벨리스크에 파편 3개 봉헌', type:'ruinTier', key:'3', n:1 },
  ]},
  { title:'별 아래 잠든 것', exp:300, lines:[
    { t:'일기 12장 전부 모으기', type:'pages', key:'any', n:12 },
  ]},
  { title:'수상한 방문자', exp:80, lines:[
    { t:'방랑 상인과 거래하기 (2일차부터 낮에 출현)', type:'trade', key:'any', n:1 },
  ]},
  { title:'어둠과의 거래', exp:120, lines:[
    { t:'어둠의 제단에 봉헌하기 (밤, 파편 2개)', type:'altar', key:'any', n:1 },
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
  trader: { n:'방랑 상인',   kind:'npc',   hp:999, dmg:0,  speed:1.2, exp:0, drops:[] },
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
