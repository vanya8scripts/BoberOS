"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Heart,
  Coins,
  Swords,
  Shield,
  Package,
  RotateCcw,
  Footprints,
  Sparkles,
  ChevronRight,
  Skull,
  Trophy,
  Cherry,
} from "lucide-react";

type SceneType = "story" | "combat" | "ending";
type EndingKind = "good" | "neutral" | "bad";

interface Effect {
  hp?: number;
  maxHp?: number;
  gold?: number;
  addItem?: string;
  removeItem?: string;
  setFlag?: string;
  weapon?: string;
}

interface Requires {
  item?: string;
  flag?: string;
  gold?: number;
  noFlag?: string;
}

interface Choice {
  text: string;
  target: string;
  requires?: Requires;
  effect?: Effect;
}

interface Enemy {
  name: string;
  hp: number;
  attack: number;
  specialName: string;
  specialDamage: number;
  lootGold: number;
  lootItem?: string;
  emoji: string;
}

interface Scene {
  id: string;
  type: SceneType;
  title: string;
  text: string;
  emoji: string;
  gradient: string;
  milestone?: string;
  choices?: Choice[];
  enemy?: Enemy;
  victoryTarget?: string;
  fleeTarget?: string;
  ending?: EndingKind;
}

interface WeaponDef { id: string; name: string; damage: number }
interface ItemDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  consumable?: boolean;
  heal?: number;
}

interface PlayerState {
  hp: number;
  maxHp: number;
  gold: number;
  weapon: string;
  items: string[];
  flags: string[];
  currentScene: string;
  visited: string[];
}

const WEAPONS: Record<string, WeaponDef> = {
  none: { id: "none", name: "Голые лапы", damage: 4 },
  stick: { id: "stick", name: "Дубовый Посох", damage: 9 },
  claw: { id: "claw", name: "Коготь Барсука", damage: 14 },
};

const ITEMS: Record<string, ItemDef> = {
  berry: { id: "berry", name: "Ягода-Здоровье", emoji: "🍒", description: "Восстанавливает 20 ОЗ", consumable: true, heal: 20 },
  key: { id: "key", name: "Ключ от Плотины", emoji: "🗝️", description: "Открывает древние двери" },
  map: { id: "map", name: "Карта Руин", emoji: "📜", description: "Показывает верный путь" },
  tooth: { id: "tooth", name: "Зуб Барсука", emoji: "🦷", description: "Трофей воина" },
};

const MILESTONES = ["Дом", "Лес", "Река", "Плотина", "Барсуки", "Руины", "Ветвь"];

const INITIAL_PLAYER: PlayerState = {
  hp: 40, maxHp: 40, gold: 0, weapon: "none",
  items: [], flags: [], currentScene: "start", visited: ["start"],
};

const SCENES: Record<string, Scene> = {
  start: {
    id: "start", type: "story", title: "Уход из дома", milestone: "Дом",
    emoji: "🏡", gradient: "from-amber-200 to-orange-400",
    text: "Ты — Боб. Молодой бобр с пушистым хвостом и мечтой в сердце. Бабушка рассказывала тебе о Золотой Ветви — древнем артефакте, что дарует мудрость всему роду бобров. Сегодня ты покидаешь родную хатку. Дремучий лес ждёт. С собой — лишь надежда и пустой рюкзак.",
    choices: [
      { text: "Пойти через тёмный лес", target: "forest_path" },
      { text: "Спуститься к реке", target: "river_bank" },
    ],
  },
  forest_path: {
    id: "forest_path", type: "story", title: "Тёмный лес", milestone: "Лес",
    emoji: "🌲", gradient: "from-emerald-700 to-green-900",
    text: "Стволы деревьев смыкаются над головой. Пахнет мхом и сыростью. Где-то ухает сова-бобр (да, такое бывает). Вдалеке мерцает свет — костёр старого мудреца. Но впереди и развилка: можно пойти на свет, либо свернуть к тёмной пещере.",
    choices: [
      { text: "Идти на свет костра", target: "old_sage" },
      { text: "Заглянуть в пещеру", target: "dark_cave" },
    ],
  },
  dark_cave: {
    id: "dark_cave", type: "story", title: "Тёмная пещера", milestone: "Лес",
    emoji: "🕷️", gradient: "from-stone-700 to-stone-900",
    text: "В пещере сыро и пахнет грибами. У дальней стены — старый сундук, покрытый мхом. Но у входа сидит паук размером с твою голову. Он смотрит на тебя восемью глазами и тихо шипит. Похоже, без драки не обойтись.",
    choices: [
      { text: "Атаковать паука", target: "spider_combat" },
      { text: "Вернуться к развилке", target: "forest_path" },
    ],
  },
  spider_combat: {
    id: "spider_combat", type: "combat", title: "Пещерный паук", milestone: "Лес",
    emoji: "🕷️", gradient: "from-stone-800 to-gray-900",
    text: "Паук шипит и прыгает! Его восемь глаз сверкают в темноте. За сундуком, кажется, что-то блестит. Покажи этому членистоногому, кто в пещере хозяин!",
    enemy: { name: "Пещерный Паук", hp: 16, attack: 4, specialName: "Паутина", specialDamage: 7, lootGold: 6, lootItem: "berry", emoji: "🕷️" },
    victoryTarget: "cave_victory", fleeTarget: "forest_path",
  },
  cave_victory: {
    id: "cave_victory", type: "story", title: "Сундук", milestone: "Лес",
    emoji: "💰", gradient: "from-stone-700 to-amber-800",
    text: "Паук повержен и жалко поджал лапки! В сундуке ты находишь Ягоду-Здоровье и немного монет. Хватит, чтобы продолжить путь. Лес снова манит тебя вперёд.",
    choices: [
      { text: "Идти к костру мудреца", target: "old_sage", effect: { addItem: "berry", gold: 6, setFlag: "cave_done" } },
    ],
  },
  old_sage: {
    id: "old_sage", type: "story", title: "Старый Бобр-Мудрец", milestone: "Лес",
    emoji: "🧙", gradient: "from-amber-300 to-yellow-600",
    text: "У костра сидит древний бобр с длинной седой бородой из мха. «А, путник, — бормочет он, не открывая глаз. — Ищешь Золотую Ветвь? Хм. Знание — главное оружие бобра. Возьми мой посох, он крепче любой дубинки. И запомни: барсуки уважают лишь тех, кто силён духом, а не только лапой». Он протягивает тебе дубовый посох, отполированный тысячами бобриных лап.",
    choices: [
      { text: "Поблагодарить и взять посох", target: "forest_to_river", effect: { weapon: "stick", setFlag: "sage_wisdom" } },
      { text: "Отказаться: «Мне не нужна помощь!»", target: "forest_to_river", effect: { setFlag: "stubborn" } },
    ],
  },
  forest_to_river: {
    id: "forest_to_river", type: "story", title: "Опушка леса", milestone: "Лес",
    emoji: "🌳", gradient: "from-green-500 to-teal-600",
    text: "Лес редеет. Слышишь плеск воды — впереди река. Пахнет рыбой, свободой и почему-то укропом. Пора выходить к воде и искать путь дальше.",
    choices: [{ text: "Идти к реке", target: "river_bank" }],
  },
  river_bank: {
    id: "river_bank", type: "story", title: "Берег реки", milestone: "Река",
    emoji: "🏞️", gradient: "from-teal-400 to-cyan-600",
    text: "Река бурлит и сверкает на солнце. У воды, на бревне, сидит выдра в ярком шарфе и пересчитывает монеты. «Эй, хвостатый! — кричит она. — Купец Выдра к твоим услугам! Лучшие товары по лучшим ценам! Без обмана, честное выдровое!» Она подмигивает.",
    choices: [
      { text: "Подойти к купцу", target: "otter_merchant" },
      { text: "Переплыть реку сразу", target: "river_crossing" },
    ],
  },
  otter_merchant: {
    id: "otter_merchant", type: "story", title: "Купец Выдра", milestone: "Река",
    emoji: "🦦", gradient: "from-teal-400 to-cyan-700",
    text: "«Смотри, что есть! — Выдра раскладывает товары на листьях кувшинок. — Ягода-Здоровье, восстанавливает силы — 5 монет. Карта Руин, найдёшь сокровища без ловушек — 10 монет. И всё честно, без обмана!» Она хитро щурится. «А ещё могу рассказать тайну, если купишь что-нибудь».",
    choices: [
      { text: "Купить Ягоду-Здоровье (5 золота)", target: "otter_merchant", requires: { gold: 5 }, effect: { gold: -5, addItem: "berry", setFlag: "talked_otter" } },
      { text: "Купить Карту Руин (10 золота)", target: "otter_merchant", requires: { gold: 10 }, effect: { gold: -10, addItem: "map", setFlag: "talked_otter" } },
      { text: "Уйти к реке", target: "river_crossing" },
    ],
  },
  river_crossing: {
    id: "river_crossing", type: "story", title: "Переправа", milestone: "Река",
    emoji: "🌊", gradient: "from-cyan-400 to-teal-600",
    text: "Река широкая, течение сильное. Вода пытается утянуть тебя вниз по руслу. Можно попытаться переплыть напрямик, рискуя выбиться из сил, либо поискать тихий брод под корягами.",
    choices: [
      { text: "Плыть напрямик (быстро, но рискованно)", target: "dam_gate", effect: { hp: -8 } },
      { text: "Искать брод (медленно, но безопасно)", target: "dam_gate" },
    ],
  },
  dam_gate: {
    id: "dam_gate", type: "story", title: "Ворота Город-Плотины", milestone: "Плотина",
    emoji: "🏰", gradient: "from-orange-400 to-red-600",
    text: "Перед тобой — колоссальная плотина, превращённая в город. Стены из брёвен, окна-норки, дымок из труб, на улицах снуют бобры-горожане. У ворот стоит стражник-бобр в бронированном жилете из коры. «Стоять! — рычит он. — В Город-Плотину пускают только с пропуском за 8 монет, или если докажешь, что достоин».",
    choices: [
      { text: "Заплатить 8 монет", target: "dam_market", requires: { gold: 8 }, effect: { gold: -8 } },
      { text: "Показать мудрость старца", target: "dam_market", requires: { flag: "sage_wisdom" }, effect: { setFlag: "sage_used" } },
      { text: "Драться со стражем", target: "guard_combat" },
    ],
  },
  guard_combat: {
    id: "guard_combat", type: "combat", title: "Страж-Бобр", milestone: "Плотина",
    emoji: "🛡️", gradient: "from-orange-500 to-red-700",
    text: "Страж хватает дубинку из морёного дуба и скалит резцы. «Ну держись, хвостатый!» Ворота пока открыты — если выживешь, пройдёшь.",
    enemy: { name: "Страж-Бобр", hp: 18, attack: 4, specialName: "Удар дубиной", specialDamage: 7, lootGold: 6, lootItem: "berry", emoji: "🛡️" },
    victoryTarget: "dam_market", fleeTarget: "dam_gate",
  },
  dam_market: {
    id: "dam_market", type: "story", title: "Рынок Город-Плотины", milestone: "Плотина",
    emoji: "🏛️", gradient: "from-amber-400 to-orange-700",
    text: "Рынок кипит жизнью. Бобры торгят рыбой, корой, инструментами, редкими кореньями. У фонтана сидит Старейшина — самый старый бобр города, с бородой до самой земли. На прилавке юный бобрёнок продаёт какие-то светящиеся зелья.",
    choices: [
      { text: "Поговорить со Старейшиной", target: "dam_elder" },
      { text: "Купить зелье у бобрёнка (6 золота)", target: "dam_market", requires: { gold: 6 }, effect: { gold: -6, addItem: "berry" } },
      { text: "Идти к землям барсуков", target: "badger_border" },
    ],
  },
  dam_elder: {
    id: "dam_elder", type: "story", title: "Старейшина", milestone: "Плотина",
    emoji: "👴", gradient: "from-amber-300 to-yellow-700",
    text: "Старейшина глядит на тебя выцветшими глазами. «Золотая Ветвь... да, я помню легенду. Руины за землями барсуков. Возьми этот Ключ от Плотины — он откроет дверь в усыпальницу. И помни: Ветвь проверяет сердце. Жадный бобр потеряет всё, мудрый — обретёт вечность».",
    choices: [
      { text: "Взять ключ и благодарить", target: "badger_border", requires: { noFlag: "elder_wisdom" }, effect: { addItem: "key", setFlag: "elder_wisdom" } },
      { text: "Спросить про барсуков", target: "dam_elder_info" },
    ],
  },
  dam_elder_info: {
    id: "dam_elder_info", type: "story", title: "Слова Старейшины", milestone: "Плотина",
    emoji: "📜", gradient: "from-yellow-300 to-amber-700",
    text: "«Барсучий Король — жесток, но не глуп. Если ты силён и знаешь старые речи, он может пропустить тебя мирно. Иначе... придётся бить его по коронованной голове. Береги себя, бобрёнок. Хвост — не только для красоты».",
    choices: [
      { text: "Взять ключ и идти дальше", target: "badger_border", requires: { noFlag: "elder_wisdom" }, effect: { addItem: "key", setFlag: "elder_wisdom" } },
      { text: "Идти к барсукам без ключа", target: "badger_border" },
    ],
  },
  badger_border: {
    id: "badger_border", type: "story", title: "Граница земель барсуков", milestone: "Барсуки",
    emoji: "🌑", gradient: "from-stone-600 to-gray-900",
    text: "Лес становится темнее, на деревьях — глубокие царапины когтей. Пахнет землёй и угрозой. Из кустов доносятся хриплые голоса. Барсучья территория. Можно пойти напролом, размахивая хвостом, либо попытаться прокрасться тихо.",
    choices: [
      { text: "Идти напролом", target: "badger_scout_combat" },
      { text: "Красться тихо", target: "badger_sneak" },
    ],
  },
  badger_sneak: {
    id: "badger_sneak", type: "story", title: "Тихий подход", milestone: "Барсуки",
    emoji: "🐾", gradient: "from-stone-700 to-gray-800",
    text: "Ты крадёшься через кусты, прижимая уши. Сердце колотится, хвост дрожит от напряжения. Вдруг — предательский хруст ветки под лапой! Барсук-разведчик резко поворачивает голову. Драки не избежать.",
    choices: [{ text: "Принять бой", target: "badger_scout_combat" }],
  },
  badger_scout_combat: {
    id: "badger_scout_combat", type: "combat", title: "Барсук-Разведчик", milestone: "Барсуки",
    emoji: "🦡", gradient: "from-stone-600 to-gray-900",
    text: "Барсук-разведчик рычит и скалит жёлтые зубы. Он быстр, зол и голоден. Но ты не из трусливых бобров — твой хвост поднят в боевой готовности!",
    enemy: { name: "Барсук-Разведчик", hp: 28, attack: 6, specialName: "Удар когтями", specialDamage: 11, lootGold: 10, lootItem: "berry", emoji: "🦡" },
    victoryTarget: "badger_scout_victory", fleeTarget: "dam_market",
  },
  badger_scout_victory: {
    id: "badger_scout_victory", type: "story", title: "После боя", milestone: "Барсуки",
    emoji: "⚔️", gradient: "from-red-500 to-stone-800",
    text: "Барсук-разведчик отступает, волоча лапу. «Ты... ты силён, бобр. Иди к Королю. Но он тебя не пощадит». Дорога к трону теперь свободна. Пахнет кровью и решимостью.",
    choices: [{ text: "Идти к трону Барсучьего Короля", target: "badger_king_throne" }],
  },
  badger_king_throne: {
    id: "badger_king_throne", type: "story", title: "Трон Барсучьего Короля", milestone: "Барсуки",
    emoji: "👑", gradient: "from-stone-700 to-red-900",
    text: "Огромная нора с костяным троном. На троне сидит Барсучий Король — массивный, в короне из крысиных черепов, с шрамом через весь нос. «Бобр? В МОЕЙ норе? — рычит он. — Зачем пришёл, хвостатый? Говори, пока я не потерял терпение».",
    choices: [
      { text: "Рассказать о Золотой Ветви (мудрость)", target: "badger_king_negotiate", requires: { flag: "sage_wisdom" } },
      { text: "Предложить золото за проход (15 монет)", target: "badger_king_bribe", requires: { gold: 15 }, effect: { gold: -15 } },
      { text: "Бросить вызов Королю", target: "badger_king_combat" },
    ],
  },
  badger_king_negotiate: {
    id: "badger_king_negotiate", type: "story", title: "Слова мудрости", milestone: "Барсуки",
    emoji: "🗣️", gradient: "from-amber-500 to-stone-800",
    text: "Ты говоришь речи, которым научил тебя старый мудрец. Король хмурится, потом неожиданно усмехается. «Хм. Ты не простая бобриха. В тебе есть... старая сила. Что ж, иди. Но если вернёшься с ветвью — поделись мудростью с моим народом». Он протягивает тебе свой коготь — символ пропуска и знак уважения.",
    choices: [{ text: "Идти к руинам с когтем", target: "ruins_entrance", effect: { setFlag: "king_blessing", weapon: "claw" } }],
  },
  badger_king_bribe: {
    id: "badger_king_bribe", type: "story", title: "Сделка", milestone: "Барсуки",
    emoji: "💰", gradient: "from-yellow-600 to-stone-800",
    text: "Ты высыпаешь золото к ногам Короля. Он сгребает монеты лапой и хмыкает. «Деньги — тоже сила, бобр. Иди. Но без моего когтя — он не продаётся». Ты проходишь мимо трона, чувствуя на спине его взгляд.",
    choices: [{ text: "Идти к руинам", target: "ruins_entrance", effect: { setFlag: "king_paid" } }],
  },
  badger_king_combat: {
    id: "badger_king_combat", type: "combat", title: "Барсучий Король", milestone: "Барсуки",
    emoji: "🦡", gradient: "from-red-700 to-stone-900",
    text: "Король вскакивает с трона, и его корона звенит. «Глупый бобр! Я разорву тебя на щепки и скормлю моим личинкам!» Его когти сверкают в свете факелов. Это бой не на жизнь, а на хвост.",
    enemy: { name: "Барсучий Король", hp: 45, attack: 8, specialName: "Королевский удар", specialDamage: 15, lootGold: 20, lootItem: "tooth", emoji: "👑" },
    victoryTarget: "badger_king_victory", fleeTarget: "badger_border",
  },
  badger_king_victory: {
    id: "badger_king_victory", type: "story", title: "Король повержен", milestone: "Барсуки",
    emoji: "🏆", gradient: "from-amber-500 to-red-800",
    text: "Барсучий Король падает на колени, тяжело дыша. «Достоин... бобр. Никто... не побеждал меня прежде. Бери мой коготь и иди к руинам. Я больше не трону тебя». Ты подбираешь коготь — он лёгкий, но острый как бритва. Отличное оружие.",
    choices: [{ text: "Идти к древним руинам", target: "ruins_entrance", effect: { weapon: "claw", setFlag: "king_slain" } }],
  },
  ruins_entrance: {
    id: "ruins_entrance", type: "story", title: "Древние Руины", milestone: "Руины",
    emoji: "🗿", gradient: "from-stone-500 to-emerald-900",
    text: "Руины высятся из земли — огромные каменные плиты, покрытые мхом и рунами старше бобриного рода. В центре — массивная дверь с замочной скважиной в форме бобрового резца. Пахнет древностью и тайной. Похоже, нужен ключ.",
    choices: [
      { text: "Открыть дверь ключом", target: "ruins_puzzle", requires: { item: "key" } },
      { text: "Выломать дверь силой", target: "ruins_trap", effect: { hp: -10 } },
    ],
  },
  ruins_puzzle: {
    id: "ruins_puzzle", type: "story", title: "Зал загадок", milestone: "Руины",
    emoji: "🔮", gradient: "from-purple-500 to-stone-800",
    text: "Дверь открывается со скрипом, словно не открывалась тысячу лет. Внутри — зал с тремя коридорами. На стене надпись старыми рунами: «Мудрый избежит ловушек, глупый — станет кормом для червей». Если у тебя есть Карта Руин, путь ясен. Иначе придётся довериться интуиции.",
    choices: [
      { text: "Идти по карте", target: "golden_chamber", requires: { item: "map" }, effect: { setFlag: "smart_path" } },
      { text: "Позвать на помощь мудрость старца", target: "golden_chamber", requires: { flag: "sage_wisdom" }, effect: { setFlag: "smart_path" } },
      { text: "Выбрать левый коридор", target: "ruins_trap" },
      { text: "Выбрать правый коридор", target: "ruins_trap" },
    ],
  },
  ruins_trap: {
    id: "ruins_trap", type: "story", title: "Ловушка", milestone: "Руины",
    emoji: "⚠️", gradient: "from-yellow-600 to-red-900",
    text: "Из стен с лязгом вылетают древние стрелы! Ты катишься по полу, уклоняясь, но несколько стрел царапают бок. Больно, но не смертельно. Впереди — мерцание золотого света. Ты почти у цели. Хвост поджимается от боли, но ноги несут вперёд.",
    choices: [{ text: "Прорваться к свету", target: "golden_chamber", effect: { hp: -6 } }],
  },
  golden_chamber: {
    id: "golden_chamber", type: "story", title: "Золотая Ветвь", milestone: "Ветвь",
    emoji: "✨", gradient: "from-yellow-300 to-amber-600",
    text: "Ты в огромном зале с куполообразным потолком. На каменном пьедестале сияет Золотая Ветвь — символ мудрости бобров, артефакт древних. Она пульсирует тёплым светом, и в голове звучит тихий голос: «Возьми меня с мудростью — и станешь мудрейшим. Возьми с жадностью — и станешь лишь богатым. Уничтожь — и легенда умрёт навеки. Уйди — и останешься собой».",
    choices: [
      { text: "Взять Ветвь с мудростью и смирением", target: "ending_good", requires: { flag: "sage_wisdom" } },
      { text: "Взять Ветвь жадно, ради богатства", target: "ending_neutral" },
      { text: "Уничтожить Ветвь — пусть легенда умрёт", target: "ending_bad" },
    ],
  },
  ending_good: {
    id: "ending_good", type: "ending", ending: "good", title: "Сага о мудром бобре", milestone: "Ветвь",
    emoji: "🌟", gradient: "from-yellow-200 to-amber-500",
    text: "Ты берёшь Золотую Ветвь с чистым сердцем. Она не жжёт лапы — наоборот, дарит тепло. Мудрость старца, выносливость леса, сила реки, отвага перед барсуками — всё слилось в тебе. Ты возвращаешься домой героем. Бабушка плачет от счастья. Вся община бобров собирается у твоей хатки. Ты становишься Старейшиной — самым молодым в истории. Легенда о Бобре-мудреце живёт века. КОНЕЦ.",
  },
  ending_neutral: {
    id: "ending_neutral", type: "ending", ending: "neutral", title: "Сага о богатом бобре", milestone: "Ветвь",
    emoji: "💰", gradient: "from-amber-400 to-yellow-700",
    text: "Ты хватаешь Ветвь жадными лапами. Золото слепит глаза, сердце колотится от алчности. Но мудрость не приходит — лишь богатство. Ты возвращаешься, строишь огромную хатку из лучших брёвен, набиваешь её золотом и редкостями. Бобры вокруг завидуют, но не уважают. Ты богат, но одинок. Золотая Ветвь пылится в сундуке. Старейшина качает головой: «Жадность съела мудрость, бобрёнок». КОНЕЦ.",
  },
  ending_bad: {
    id: "ending_bad", type: "ending", ending: "bad", title: "Сага о потерянной легенде", milestone: "Ветвь",
    emoji: "💀", gradient: "from-stone-600 to-gray-900",
    text: "Ты разламываешь Ветвь пополам. Золотой свет гаснет. Руины содрогаются. Легенда умирает навсегда. Ты выбегаешь наружу, но что-то навсегда сломалось в мире бобров. Бабушка не узнаёт тебя. Лес молчит. Реки текут тихо. Ты стал бобром, что убил мечту. Годы спустя, старый и седой, ты рассказываешь молодым о Ветви, которой больше нет. И они тебе не верят. КОНЕЦ.",
  },
  game_over: {
    id: "game_over", type: "ending", ending: "bad", title: "Погибель",
    emoji: "⚰️", gradient: "from-stone-700 to-black",
    text: "Твои силы иссякли. Бобр падает на землю, и хвост безвольно опускается в траву. Холод обнимает. Последнее, что ты видишь — серое небо сквозь ветви. Сага обрывается, но легенды не умирают — следующий молодой бобр продолжит твой путь...",
  },
};

function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

const SAVE_KEY = "beaver-saga-save";

function loadSave(): PlayerState {
  if (typeof window === "undefined") return { ...INITIAL_PLAYER };
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PlayerState>;
      if (parsed && typeof parsed.currentScene === "string" && SCENES[parsed.currentScene]) {
        return {
          ...INITIAL_PLAYER,
          ...parsed,
          items: Array.isArray(parsed.items) ? parsed.items : [],
          flags: Array.isArray(parsed.flags) ? parsed.flags : [],
          visited: Array.from(new Set([
            ...(Array.isArray(parsed.visited) ? parsed.visited : []),
            parsed.currentScene,
          ])),
        };
      }
    }
  } catch {
    /* ignore corrupted save */
  }
  return { ...INITIAL_PLAYER };
}

export function BeaverSaga() {
  const [player, setPlayer] = useState<PlayerState>(loadSave);
  const [shownText, setShownText] = useState("");
  const [activeSceneId, setActiveSceneId] = useState(player.currentScene);
  const [log, setLog] = useState<string[]>([]);
  const [enemyHp, setEnemyHp] = useState(0);
  const [defending, setDefending] = useState(false);
  const [combatLock, setCombatLock] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const playerRef = useRef(player);
  useEffect(() => { playerRef.current = player; }, [player]);

  const scene = SCENES[player.currentScene] ?? SCENES.start;
  const fullText = scene.text;
  const weapon = WEAPONS[player.weapon] ?? WEAPONS.none;
  const enemy = scene.enemy;
  const enemyMaxHp = enemy?.hp ?? 0;

  useEffect(() => {
    try { window.localStorage.setItem(SAVE_KEY, JSON.stringify(player)); } catch { /* ignore */ }
  }, [player]);

  if (scene.id !== activeSceneId) {
    setActiveSceneId(scene.id);
    setShownText("");
    setLog([]);
    setDefending(false);
    setCombatLock(false);
    if (scene.enemy) setEnemyHp(scene.enemy.hp);
  }

  const isTyping = shownText.length < fullText.length;

  useEffect(() => {
    if (!isTyping) return;
    const timer = window.setTimeout(() => {
      setShownText(fullText.slice(0, shownText.length + 2));
    }, 18);
    return () => window.clearTimeout(timer);
  }, [isTyping, shownText, fullText]);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), 1400);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const visitedMilestones = useMemo(() => {
    const set = new Set<string>();
    for (const id of player.visited) {
      const sc = SCENES[id];
      if (sc?.milestone) set.add(sc.milestone);
    }
    return set;
  }, [player.visited]);

  const currentMilestone = useMemo(() => {
    if (scene.milestone) return scene.milestone;
    for (let i = player.visited.length - 1; i >= 0; i--) {
      const sc = SCENES[player.visited[i]];
      if (sc?.milestone) return sc.milestone;
    }
    return "Дом";
  }, [scene.milestone, player.visited]);

  const itemCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const id of player.items) map.set(id, (map.get(id) ?? 0) + 1);
    return Array.from(map.entries()).map(([id, count]) => ({ id, count }));
  }, [player.items]);

  const flashMsg = (msg: string) => setFlash(msg);
  const hasItem = (id: string) => player.items.includes(id);
  const hasFlag = (f: string) => player.flags.includes(f);

  const meetsRequire = (req?: Requires): boolean => {
    if (!req) return true;
    if (req.item && !hasItem(req.item)) return false;
    if (req.flag && !hasFlag(req.flag)) return false;
    if (req.gold !== undefined && player.gold < req.gold) return false;
    if (req.noFlag && hasFlag(req.noFlag)) return false;
    return true;
  };

  const applyEffect = (eff?: Effect) => {
    if (!eff) return;
    setPlayer((prev) => {
      const next: PlayerState = { ...prev, items: [...prev.items], flags: [...prev.flags] };
      if (eff.hp) next.hp = Math.max(0, Math.min(next.maxHp, next.hp + eff.hp));
      if (eff.maxHp) next.maxHp += eff.maxHp;
      if (eff.gold) next.gold = Math.max(0, next.gold + eff.gold);
      if (eff.weapon) next.weapon = eff.weapon;
      if (eff.addItem) next.items.push(eff.addItem);
      if (eff.removeItem) {
        const idx = next.items.indexOf(eff.removeItem);
        if (idx >= 0) next.items.splice(idx, 1);
      }
      if (eff.setFlag && !next.flags.includes(eff.setFlag)) next.flags.push(eff.setFlag);
      return next;
    });
  };

  const goToScene = (id: string) => {
    setPlayer((prev) => ({
      ...prev,
      currentScene: id,
      visited: prev.visited.includes(id) ? prev.visited : [...prev.visited, id],
    }));
  };

  const onChoice = (choice: Choice) => {
    if (!meetsRequire(choice.requires)) { flashMsg("Не выполнены условия"); return; }
    applyEffect(choice.effect);
    goToScene(choice.target);
  };

  const skipTyping = () => { if (isTyping) setShownText(fullText); };

  const consumeItem = (id: string) => {
    if (scene.type === "ending") return;
    if (scene.type === "combat") { flashMsg("Используй кнопку «Ягода» в бою"); return; }
    if (id === "berry") {
      if (player.hp >= player.maxHp) { flashMsg("Здоровье уже полное"); return; }
      setPlayer((prev) => {
        const items = [...prev.items];
        const idx = items.indexOf("berry");
        if (idx < 0) return prev;
        items.splice(idx, 1);
        return { ...prev, items, hp: Math.min(prev.maxHp, prev.hp + 20) };
      });
      flashMsg("+20 ОЗ");
    }
  };

  const enemyTurn = (willDefend: boolean) => {
    if (!enemy) return;
    const isSpecial = Math.random() < 0.25;
    let dmg = isSpecial ? enemy.specialDamage : enemy.attack + Math.floor(Math.random() * 3);
    if (willDefend) dmg = Math.floor(dmg / 2);
    setDefending(false);
    const currentHp = playerRef.current.hp;
    const newHp = Math.max(0, currentHp - dmg);
    setPlayer((prev) => ({ ...prev, hp: Math.max(0, prev.hp - dmg) }));
    setLog((l) => [...l, `${enemy.name} использует ${isSpecial ? enemy.specialName : "атаку"}: −${dmg} ОЗ.`]);
    if (newHp <= 0) {
      setLog((l) => [...l, "Ты пал в бою..."]);
      setCombatLock(true);
      window.setTimeout(() => goToScene("game_over"), 1000);
    } else {
      setCombatLock(false);
    }
  };

  const combatAct = (action: "attack" | "defend" | "item" | "flee") => {
    if (combatLock || !enemy) return;
    if (action === "item") {
      if (!hasItem("berry")) { flashMsg("Нет ягод в рюкзаке!"); return; }
      setPlayer((prev) => {
        const items = [...prev.items];
        const idx = items.indexOf("berry");
        if (idx >= 0) items.splice(idx, 1);
        return { ...prev, items, hp: Math.min(prev.maxHp, prev.hp + 20) };
      });
      setLog((l) => [...l, "Ты съел Ягоду-Здоровье (+20 ОЗ)."]);
      setCombatLock(true);
      window.setTimeout(() => enemyTurn(false), 700);
      return;
    }
    if (action === "attack") {
      const dmg = weapon.damage + Math.floor(Math.random() * 4);
      const newHp = Math.max(0, enemyHp - dmg);
      setEnemyHp(newHp);
      setLog((l) => [...l, `Ты бьёшь ${enemy.name} на ${dmg} урона.`]);
      if (newHp <= 0) {
        setLog((l) => [...l, `${enemy.name} повержен!`]);
        setCombatLock(true);
        window.setTimeout(() => {
          applyEffect({ gold: enemy.lootGold, addItem: enemy.lootItem });
          if (scene.victoryTarget) goToScene(scene.victoryTarget);
        }, 900);
        return;
      }
      setCombatLock(true);
      window.setTimeout(() => enemyTurn(false), 700);
      return;
    }
    if (action === "defend") {
      setDefending(true);
      setLog((l) => [...l, "Ты занимаешь оборону, прикрывая хвост."]);
      setCombatLock(true);
      window.setTimeout(() => enemyTurn(true), 700);
      return;
    }
    if (action === "flee") {
      if (Math.random() < 0.5) {
        setLog((l) => [...l, "Ты сбегаешь, поджав хвост!"]);
        setCombatLock(true);
        window.setTimeout(() => { if (scene.fleeTarget) goToScene(scene.fleeTarget); }, 600);
        return;
      }
      setLog((l) => [...l, "Сбежать не удалось — враг быстрее!"]);
      setCombatLock(true);
      window.setTimeout(() => enemyTurn(false), 700);
    }
  };

  const restart = () => {
    const fresh: PlayerState = { ...INITIAL_PLAYER, items: [], flags: [], visited: ["start"] };
    setPlayer(fresh);
    setLog([]);
    setEnemyHp(0);
    setShownText("");
    setFlash(null);
    setDefending(false);
    setCombatLock(false);
  };

  const hpPct = Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100));
  const enemyPct = enemyMaxHp > 0 ? (enemyHp / enemyMaxHp) * 100 : 0;
  const isEnding = scene.type === "ending";
  const isCombat = scene.type === "combat" && !!enemy;
  const showActions = !isTyping;

  return (
    <div className="h-full flex flex-col bg-stone-900 text-stone-100 overflow-hidden font-sans">
      <header className="flex items-center justify-between px-3 py-2 bg-stone-950 border-b border-stone-800 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden="true">🦫</span>
          <div>
            <h1 className="text-base font-bold text-amber-400 leading-tight">Сага о Бобре</h1>
            <p className="text-[10px] text-stone-400 leading-tight">Легенда о Золотой Ветви</p>
          </div>
        </div>
        <button
          onClick={restart}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md bg-stone-800 hover:bg-stone-700 border border-stone-700 transition active:scale-95"
          aria-label="Начать заново"
        >
          <RotateCcw className="w-3 h-3" /> Заново
        </button>
      </header>

      <div className="flex gap-1 px-3 py-2 overflow-x-auto border-b border-stone-800 bg-stone-900 shrink-0">
        {MILESTONES.map((m, i) => {
          const done = visitedMilestones.has(m);
          const active = m === currentMilestone;
          return (
            <div
              key={m}
              className={cn(
                "shrink-0 px-2 py-1 text-[10px] rounded-full transition flex items-center gap-1 border",
                active ? "bg-amber-400 text-stone-900 font-bold border-amber-300"
                  : done ? "bg-stone-700 text-stone-300 border-stone-600"
                  : "bg-stone-800 text-stone-500 border-stone-700",
              )}
            >
              <span className={cn(active ? "text-stone-900" : done ? "text-amber-400" : "text-stone-600")}>{i + 1}</span>
              {m}
            </div>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-stone-800 rounded-lg p-2 border border-stone-700">
              <div className="flex items-center gap-1 text-[10px] text-stone-400 mb-1">
                <Heart className="w-3 h-3 text-red-400" /> Здоровье
              </div>
              <div className="text-sm font-bold">{player.hp}/{player.maxHp}</div>
              <div className="mt-1 h-1.5 bg-stone-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-red-500 to-rose-400 transition-all duration-300" style={{ width: `${hpPct}%` }} />
              </div>
            </div>
            <div className="bg-stone-800 rounded-lg p-2 border border-stone-700">
              <div className="flex items-center gap-1 text-[10px] text-stone-400 mb-1">
                <Coins className="w-3 h-3 text-amber-400" /> Золото
              </div>
              <div className="text-sm font-bold text-amber-300">{player.gold}</div>
              <div className="text-[10px] text-stone-500 mt-1">монет</div>
            </div>
            <div className="bg-stone-800 rounded-lg p-2 border border-stone-700">
              <div className="flex items-center gap-1 text-[10px] text-stone-400 mb-1">
                <Swords className="w-3 h-3 text-orange-400" /> Оружие
              </div>
              <div className="text-xs font-bold truncate" title={weapon.name}>{weapon.name}</div>
              <div className="text-[10px] text-stone-500 mt-1">Урон: {weapon.damage}</div>
            </div>
          </div>

          <div className="bg-stone-800 rounded-lg p-2 border border-stone-700">
            <div className="flex items-center gap-1 text-[10px] text-stone-400 mb-1.5">
              <Package className="w-3 h-3" /> Рюкзак
            </div>
            {itemCounts.length === 0 ? (
              <div className="text-[11px] text-stone-500 italic">Рюкзак пуст</div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {itemCounts.map(({ id, count }) => {
                  const def = ITEMS[id];
                  if (!def) return null;
                  const disabled = !def.consumable || isEnding || isCombat || scene.type !== "story";
                  return (
                    <button
                      key={id}
                      onClick={() => consumeItem(id)}
                      disabled={disabled}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] border transition",
                        !disabled ? "bg-stone-700 hover:bg-stone-600 border-stone-600 cursor-pointer"
                          : "bg-stone-800 border-stone-700 cursor-default opacity-90",
                      )}
                      title={def.description}
                    >
                      <span aria-hidden="true">{def.emoji}</span>
                      <span>{def.name}</span>
                      {count > 1 && <span className="text-amber-400 font-bold">×{count}</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className={cn("relative h-32 rounded-xl overflow-hidden bg-gradient-to-br shadow-lg", scene.gradient)}>
            <div className="absolute inset-0 flex items-center justify-center text-6xl drop-shadow-lg">
              <span aria-hidden="true">{scene.emoji}</span>
            </div>
            <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 backdrop-blur-sm rounded text-[10px] font-semibold text-white">
              {scene.title}
            </div>
            {isEnding && scene.ending && (
              <div className={cn(
                "absolute top-2 right-2 px-2 py-1 backdrop-blur-sm rounded text-[10px] font-bold",
                scene.ending === "good" ? "bg-amber-400/90 text-stone-900"
                  : scene.ending === "neutral" ? "bg-yellow-500/90 text-stone-900"
                  : "bg-stone-800/90 text-stone-200",
              )}>
                {scene.ending === "good" ? "СЧАСТЛИВЫЙ ФИНАЛ" : scene.ending === "neutral" ? "НЕЙТРАЛЬНЫЙ ФИНАЛ" : "ГОРЬКИЙ ФИНАЛ"}
              </div>
            )}
          </div>

          <div
            onClick={skipTyping}
            className="bg-stone-800 rounded-lg p-3 border border-stone-700 min-h-[110px] cursor-pointer select-none"
            role="button"
            tabIndex={0}
          >
            <p className="text-sm leading-relaxed text-stone-200 whitespace-pre-wrap">
              {shownText}
              {isTyping && <span className="inline-block w-1.5 h-4 bg-amber-400 ml-0.5 animate-pulse align-middle" />}
            </p>
            {isTyping && <div className="mt-2 text-[10px] text-stone-500">Нажми, чтобы пропустить анимацию</div>}
          </div>

          {isCombat && showActions && (
            <div className="space-y-2">
              <div className="bg-red-950/40 border border-red-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl" aria-hidden="true">{enemy?.emoji}</span>
                    <div>
                      <div className="text-sm font-bold text-red-300">{enemy?.name}</div>
                      <div className="text-[10px] text-stone-400">Урон: {enemy?.attack}–{enemy?.specialDamage}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-stone-400">ОЗ врага</div>
                    <div className="text-sm font-bold">{enemyHp}/{enemyMaxHp}</div>
                  </div>
                </div>
                <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-red-600 to-rose-500 transition-all duration-300" style={{ width: `${enemyPct}%` }} />
                </div>
              </div>

              {log.length > 0 && (
                <div className="max-h-32 overflow-y-auto bg-stone-950 rounded-lg p-2 border border-stone-800 text-[11px] space-y-1">
                  {log.map((entry, i) => (
                    <div key={i} className="text-stone-300 leading-snug">
                      <span className="text-stone-600 mr-1">›</span>{entry}
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => combatAct("attack")} disabled={combatLock}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold transition active:scale-95">
                  <Swords className="w-4 h-4" /> Атака
                </button>
                <button onClick={() => combatAct("defend")} disabled={combatLock}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-teal-700 hover:bg-teal-600 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold transition active:scale-95">
                  <Shield className="w-4 h-4" /> Защита
                </button>
                <button onClick={() => combatAct("item")} disabled={combatLock || !hasItem("berry")}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold transition active:scale-95">
                  <Cherry className="w-4 h-4" /> Ягода
                </button>
                <button onClick={() => combatAct("flee")} disabled={combatLock}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-stone-700 hover:bg-stone-600 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold transition active:scale-95">
                  <Footprints className="w-4 h-4" /> Бежать
                </button>
              </div>
              {defending && <div className="text-[11px] text-teal-300 text-center animate-pulse">Ты занимаешь оборону...</div>}
              {combatLock && !defending && <div className="text-[11px] text-stone-500 text-center">Ход врага...</div>}
            </div>
          )}

          {scene.type === "story" && showActions && scene.choices && (
            <div className="space-y-2">
              {scene.choices.map((choice, i) => {
                const ok = meetsRequire(choice.requires);
                const reqLabel = !ok && choice.requires ? (
                  choice.requires.gold ? `Нужно ${choice.requires.gold} зол.`
                  : choice.requires.item ? `Нужно: ${ITEMS[choice.requires.item]?.name ?? choice.requires.item}`
                  : "Недоступно"
                ) : null;
                return (
                  <button
                    key={i}
                    onClick={() => onChoice(choice)}
                    disabled={!ok}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-lg border text-sm transition flex items-start gap-2",
                      ok ? "bg-stone-800 hover:bg-stone-700 hover:border-amber-500/50 border-stone-700 text-stone-100 active:scale-[0.99]"
                        : "bg-stone-900 border-stone-800 text-stone-600 cursor-not-allowed",
                    )}
                  >
                    <ChevronRight className={cn("w-4 h-4 mt-0.5 shrink-0", ok ? "text-amber-400" : "text-stone-700")} />
                    <span className="flex-1">{choice.text}</span>
                    {reqLabel && <span className="text-[10px] text-stone-600 shrink-0 self-center">{reqLabel}</span>}
                  </button>
                );
              })}
            </div>
          )}

          {isEnding && showActions && (
            <div className="space-y-3">
              <div className={cn(
                "rounded-lg p-3 border text-center",
                scene.ending === "good" ? "bg-amber-900/30 border-amber-600"
                  : scene.ending === "neutral" ? "bg-yellow-900/30 border-yellow-600"
                  : "bg-stone-800 border-stone-600",
              )}>
                <div className="flex items-center justify-center gap-2 mb-1.5">
                  {scene.ending === "good" ? <Trophy className="w-5 h-5 text-amber-400" />
                    : scene.ending === "neutral" ? <Sparkles className="w-5 h-5 text-yellow-400" />
                    : <Skull className="w-5 h-5 text-stone-400" />}
                  <span className="text-sm font-bold">
                    {scene.ending === "good" ? "Достойный финал" : scene.ending === "neutral" ? "Пройденный путь" : "Горький итог"}
                  </span>
                </div>
                <div className="text-[11px] text-stone-400">
                  Посещено сцен: {player.visited.length} · Золото: {player.gold} · Предметов: {player.items.length} · Флагов: {player.flags.length}
                </div>
              </div>
              <button
                onClick={restart}
                className="w-full py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-900 font-bold text-sm transition flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <RotateCcw className="w-4 h-4" /> Начать новую сагу
              </button>
            </div>
          )}

          <div className="h-2" />
        </div>
      </div>

      {flash && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-stone-950 border border-amber-500 rounded-lg text-sm text-amber-300 shadow-xl z-50 pointer-events-none">
          {flash}
        </div>
      )}
    </div>
  );
}
