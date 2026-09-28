export interface ActiveSkill {
  id: string;
  name: string;
  level: number;
  type: string;
  defaultCombo: string;
  defaultCooldown: number;
  color: string;
  customIcon?: string; // base64 or URL
  svgType: string;
}

// ВАЖНО: name/type здесь — РЕАЛЬНЫЕ названия скиллов Throne & Liberty
// (сверено со скриншотами из игры: 12 Longbow + 12 Staff). id/defaultCombo/
// svgType/color НЕ трогаем при переименовании — их меняли бы, только если
// бы переставляли слоты, а name/type — чисто отображаемый текст, менять
// который безопасно для уже собранных цепочек (slot/combo уже привязаны
// вручную через drag-and-drop и не зависят от name).
export const INITIAL_CATALOG: ActiveSkill[] = [
  // Longbow (12 skills)
  {
    id: "skill_1",
    name: "Второе дыхание",
    level: 15,
    type: "Longbow",
    defaultCombo: "RB+X",
    defaultCooldown: 8.0,
    color: "#38bdf8",
    svgType: "ice_arrow"
  },
  {
    id: "skill_2",
    name: "Знак жертвы",
    level: 15,
    type: "Longbow",
    defaultCombo: "RB+Y",
    defaultCooldown: 8.0,
    color: "#f59e0b",
    svgType: "chain_arrow"
  },
  {
    id: "skill_3",
    name: "Милость природы",
    level: 15,
    type: "Longbow",
    defaultCombo: "RB+B",
    defaultCooldown: 8.0,
    color: "#ea580c",
    svgType: "bullseye"
  },
  {
    id: "skill_4",
    name: "Множественный выстрел",
    level: 15,
    type: "Longbow",
    defaultCombo: "RB+A",
    defaultCooldown: 8.0,
    color: "#0284c7",
    svgType: "ice_spikes"
  },
  {
    id: "skill_5",
    name: "Навесная стрела",
    level: 15,
    type: "Longbow",
    defaultCombo: "RT+X",
    defaultCooldown: 8.0,
    color: "#22c55e",
    svgType: "nature_leaves"
  },
  {
    id: "skill_6",
    name: "Опутывающая стрела",
    level: 15,
    type: "Longbow",
    defaultCombo: "RT+Y",
    defaultCooldown: 8.0,
    color: "#06b6d4",
    svgType: "abyss_hook"
  },
  {
    id: "skill_7",
    name: "Очистительное прикосновение",
    level: 15,
    type: "Longbow",
    defaultCombo: "RT+B",
    defaultCooldown: 8.0,
    color: "#64748b",
    svgType: "piercing_arrow"
  },
  {
    id: "skill_8",
    name: "Полевая медицына",
    level: 15,
    type: "Longbow",
    defaultCombo: "RT+A",
    defaultCooldown: 8.0,
    color: "#10b981",
    svgType: "heal_hands"
  },
  {
    id: "skill_9",
    name: "Прорыв ветра",
    level: 15,
    type: "Longbow",
    defaultCombo: "RT+DPAD_LEFT",
    defaultCooldown: 8.0,
    color: "#ef4444",
    svgType: "fire_raptor"
  },
  {
    id: "skill_10",
    name: "Стрела зари",
    level: 15,
    type: "Longbow",
    defaultCombo: "RT+DPAD_UP",
    defaultCooldown: 8.0,
    color: "#84cc16",
    svgType: "wind_leaves"
  },
  {
    id: "skill_11",
    name: "Точный выстрел",
    level: 15,
    type: "Longbow",
    defaultCombo: "RT+DPAD_RIGHT",
    defaultCooldown: 8.0,
    color: "#14b8a6",
    svgType: "hourglass_arrow"
  },
  {
    id: "skill_12",
    name: "Штурмовая стрела",
    level: 15,
    type: "Longbow",
    defaultCombo: "RT+DPAD_DOWN",
    defaultCooldown: 8.0,
    color: "#38bdf8",
    svgType: "radiant_burst"
  },

  // Staff (12 skills)
  {
    id: "skill_13",
    name: "Внутренний покой",
    level: 15,
    type: "Staff",
    defaultCombo: "RB+X",
    defaultCooldown: 8.0,
    color: "#6366f1",
    svgType: "shadow_slash"
  },
  {
    id: "skill_14",
    name: "Зов спасения",
    level: 15,
    type: "Staff",
    defaultCombo: "RB+Y",
    defaultCooldown: 8.0,
    color: "#d97706",
    svgType: "campfire"
  },
  {
    id: "skill_15",
    name: "Карающий заряд",
    level: 15,
    type: "Staff",
    defaultCombo: "RB+B",
    defaultCooldown: 8.0,
    color: "#a855f7",
    svgType: "purple_vortex"
  },
  {
    id: "skill_16",
    name: "Ледяное копьё",
    level: 15,
    type: "Staff",
    defaultCombo: "RB+A",
    defaultCooldown: 8.0,
    color: "#c084fc",
    svgType: "lightning_zigzag"
  },
  {
    id: "skill_17",
    name: "Метеор",
    level: 15,
    type: "Staff",
    defaultCombo: "RT+X",
    defaultCooldown: 8.0,
    color: "#818cf8",
    svgType: "shadow_spirit"
  },
  {
    id: "skill_18",
    name: "Морозная завеса",
    level: 15,
    type: "Staff",
    defaultCombo: "RT+Y",
    defaultCooldown: 8.0,
    color: "#94a3b8",
    svgType: "soul_spirits"
  },
  {
    id: "skill_19",
    name: "Обстрел пламенем",
    level: 15,
    type: "Staff",
    defaultCombo: "RT+B",
    defaultCooldown: 8.0,
    color: "#06b6d4",
    svgType: "ice_shard"
  },
  {
    id: "skill_20",
    name: "Огненные заряды",
    level: 15,
    type: "Staff",
    defaultCombo: "RT+A",
    defaultCooldown: 8.0,
    color: "#eab308",
    svgType: "solar_hands"
  },
  {
    id: "skill_21",
    name: "Пылающий разлом",
    level: 15,
    type: "Staff",
    defaultCombo: "RT+DPAD_LEFT",
    defaultCooldown: 8.0,
    color: "#38bdf8",
    svgType: "ice_glacier"
  },
  {
    id: "skill_22",
    name: "Сосредоточенный разум",
    level: 15,
    type: "Staff",
    defaultCombo: "RT+DPAD_UP",
    defaultCooldown: 8.0,
    color: "#f59e0b",
    svgType: "thunder_blade"
  },
  {
    id: "skill_23",
    name: "Холодная гробница",
    level: 15,
    type: "Staff",
    defaultCombo: "RT+DPAD_RIGHT",
    defaultCooldown: 8.0,
    color: "#dc2626",
    svgType: "hellfire"
  },
  {
    id: "skill_24",
    name: "Цепная молния",
    level: 15,
    type: "Staff",
    defaultCombo: "RT+DPAD_DOWN",
    defaultCooldown: 8.0,
    color: "#60a5fa",
    svgType: "gale_wave"
  }
];

// Bottom bar slots keys matching the 12 keys of T&L
export const DEFAULT_HOTKEY_SLOTS = [
  { slot: "1", combo: "RB+X" },
  { slot: "2", combo: "RB+Y" },
  { slot: "3", combo: "RB+B" },
  { slot: "4", combo: "RB+A" },
  { slot: "5", combo: "RT+X" },
  { slot: "6", combo: "RT+Y" },
  { slot: "7", combo: "RT+B" },
  { slot: "8", combo: "RT+A" },
  { slot: "9", combo: "RT+DPAD_LEFT" },
  { slot: "0", combo: "RT+DPAD_UP" },
  { slot: "-", combo: "RT+DPAD_RIGHT" },
  { slot: "=", combo: "RT+DPAD_DOWN" }
];

// 12 default active skills placed in hotkey slots
export const INITIAL_SKILLS: ActiveSkill[] = INITIAL_CATALOG.slice(0, 12);

export interface ChainStep {
  id: string;
  skill: ActiveSkill | null;
  cooldown: number; // in seconds
  repeatCount?: number; // сколько раз подряд нажать этот скилл (по умолчанию 1)
  castTimeSeconds?: number; // реальное время каста этого скилла в игре, сек (0/не задано — обычная короткая пауза)
}

export interface ComboChain {
  id: string;
  name: string;
  order: number; // 1, 2, 3...
  cooldown: number; // Периодичность цепочки, сек — одно число, не диапазон
  triggerAfterChainId: string; // "start" | "chain-id"
  steps: ChainStep[];
}

export const DEFAULT_COMBO_CHAINS: ComboChain[] = [
  {
    id: "chain_1",
    name: "Цепочка #1 (Основная)",
    order: 1,
    cooldown: 0,
    triggerAfterChainId: "start",
    steps: [
      { id: "s1_1", skill: INITIAL_CATALOG[0], cooldown: 8.0 },
      { id: "s1_2", skill: INITIAL_CATALOG[1], cooldown: 8.0 },
      { id: "s1_3", skill: INITIAL_CATALOG[2], cooldown: 8.0 },
      { id: "s1_4", skill: INITIAL_CATALOG[3], cooldown: 8.0 },
      { id: "s1_5", skill: INITIAL_CATALOG[4], cooldown: 8.0 },
      { id: "s1_6", skill: INITIAL_CATALOG[5], cooldown: 8.0 },
    ]
  },
  {
    id: "chain_2",
    name: "Цепочка #2 (Бурст)",
    order: 2,
    cooldown: 15,
    triggerAfterChainId: "chain_1",
    steps: [
      { id: "s2_1", skill: null, cooldown: 12.0 },
      { id: "s2_2", skill: null, cooldown: 15.0 },
      { id: "s2_3", skill: null, cooldown: 18.0 },
    ]
  }
];
