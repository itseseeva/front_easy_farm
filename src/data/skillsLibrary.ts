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

export const INITIAL_CATALOG: ActiveSkill[] = [
  // Row 1 (6 skills)
  {
    id: "skill_1",
    name: "Ледяная стрела",
    level: 15,
    type: "Longbow / Frost",
    defaultCombo: "RB+X",
    defaultCooldown: 8.0,
    color: "#38bdf8",
    svgType: "ice_arrow"
  },
  {
    id: "skill_2",
    name: "Связывающая стрела",
    level: 15,
    type: "Crossbow / Chain",
    defaultCombo: "RB+Y",
    defaultCooldown: 8.0,
    color: "#f59e0b",
    svgType: "chain_arrow"
  },
  {
    id: "skill_3",
    name: "Прицельный выстрел",
    level: 15,
    type: "Longbow / Snipe",
    defaultCombo: "RB+B",
    defaultCooldown: 8.0,
    color: "#ea580c",
    svgType: "bullseye"
  },
  {
    id: "skill_4",
    name: "Ледяные сосульки",
    level: 15,
    type: "Staff / Ice Spikes",
    defaultCombo: "RB+A",
    defaultCooldown: 8.0,
    color: "#0284c7",
    svgType: "ice_spikes"
  },
  {
    id: "skill_5",
    name: "Длань природы",
    level: 15,
    type: "Wand / Nature",
    defaultCombo: "RT+X",
    defaultCooldown: 8.0,
    color: "#22c55e",
    svgType: "nature_leaves"
  },
  {
    id: "skill_6",
    name: "Крюк из бездны",
    level: 15,
    type: "Dagger / Pull",
    defaultCombo: "RT+Y",
    defaultCooldown: 8.0,
    color: "#06b6d4",
    svgType: "abyss_hook"
  },

  // Row 2 (6 skills)
  {
    id: "skill_7",
    name: "Пронзающий выстрел",
    level: 15,
    type: "Longbow / Pierce",
    defaultCombo: "RT+B",
    defaultCooldown: 8.0,
    color: "#64748b",
    svgType: "piercing_arrow"
  },
  {
    id: "skill_8",
    name: "Исцеляющие ладони",
    level: 15,
    type: "Wand / Holy Heal",
    defaultCombo: "RT+A",
    defaultCooldown: 8.0,
    color: "#10b981",
    svgType: "heal_hands"
  },
  {
    id: "skill_9",
    name: "Огненный хищник",
    level: 15,
    type: "Greatsword / Fire",
    defaultCombo: "RT+DPAD_LEFT",
    defaultCooldown: 8.0,
    color: "#ef4444",
    svgType: "fire_raptor"
  },
  {
    id: "skill_10",
    name: "Танец ветра",
    level: 15,
    type: "Wand / Leaf Storm",
    defaultCombo: "RT+DPAD_UP",
    defaultCooldown: 8.0,
    color: "#84cc16",
    svgType: "wind_leaves"
  },
  {
    id: "skill_11",
    name: "Стрела времени",
    level: 15,
    type: "Longbow / CDR",
    defaultCombo: "RT+DPAD_RIGHT",
    defaultCooldown: 8.0,
    color: "#14b8a6",
    svgType: "hourglass_arrow"
  },
  {
    id: "skill_12",
    name: "Лучезарный залп",
    level: 15,
    type: "Crossbow / Radiance",
    defaultCombo: "RT+DPAD_DOWN",
    defaultCooldown: 8.0,
    color: "#38bdf8",
    svgType: "radiant_burst"
  },

  // Row 3 (6 skills)
  {
    id: "skill_13",
    name: "Теневой серп",
    level: 15,
    type: "Dagger / Shadow",
    defaultCombo: "RB+X",
    defaultCooldown: 8.0,
    color: "#6366f1",
    svgType: "shadow_slash"
  },
  {
    id: "skill_14",
    name: "Костер стойкости",
    level: 15,
    type: "Sword & Shield / Camp",
    defaultCombo: "RB+Y",
    defaultCooldown: 8.0,
    color: "#d97706",
    svgType: "campfire"
  },
  {
    id: "skill_15",
    name: "Гравитационный вихрь",
    level: 15,
    type: "Staff / Void Vortex",
    defaultCombo: "RB+B",
    defaultCooldown: 8.0,
    color: "#a855f7",
    svgType: "purple_vortex"
  },
  {
    id: "skill_16",
    name: "Вспышка молнии",
    level: 15,
    type: "Staff / Lightning",
    defaultCombo: "RB+A",
    defaultCooldown: 8.0,
    color: "#c084fc",
    svgType: "lightning_zigzag"
  },
  {
    id: "skill_17",
    name: "Призрачный дух",
    level: 15,
    type: "Dagger / Phantom",
    defaultCombo: "RT+X",
    defaultCooldown: 8.0,
    color: "#818cf8",
    svgType: "shadow_spirit"
  },
  {
    id: "skill_18",
    name: "Души павших",
    level: 15,
    type: "Wand / Souls",
    defaultCombo: "RT+Y",
    defaultCooldown: 8.0,
    color: "#94a3b8",
    svgType: "soul_spirits"
  },

  // Row 4 (6 skills)
  {
    id: "skill_19",
    name: "Осколок льда",
    level: 15,
    type: "Staff / Frost Shard",
    defaultCombo: "RT+B",
    defaultCooldown: 8.0,
    color: "#06b6d4",
    svgType: "ice_shard"
  },
  {
    id: "skill_20",
    name: "Сфера рассвета",
    level: 15,
    type: "Wand / Solar Orb",
    defaultCombo: "RT+A",
    defaultCooldown: 8.0,
    color: "#eab308",
    svgType: "solar_hands"
  },
  {
    id: "skill_21",
    name: "Ледник",
    level: 15,
    type: "Staff / Glacier",
    defaultCombo: "RT+DPAD_LEFT",
    defaultCooldown: 8.0,
    color: "#38bdf8",
    svgType: "ice_glacier"
  },
  {
    id: "skill_22",
    name: "Грозовой клинок",
    level: 15,
    type: "Greatsword / Thunder",
    defaultCombo: "RT+DPAD_UP",
    defaultCooldown: 8.0,
    color: "#f59e0b",
    svgType: "thunder_blade"
  },
  {
    id: "skill_23",
    name: "Инфернальный вихрь",
    level: 15,
    type: "Staff / Inferno",
    defaultCombo: "RT+DPAD_RIGHT",
    defaultCooldown: 8.0,
    color: "#dc2626",
    svgType: "hellfire"
  },
  {
    id: "skill_24",
    name: "Порыв бури",
    level: 15,
    type: "Crossbow / Gale",
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

export interface ChainStep {
  id: string;
  skill: ActiveSkill | null;
  cooldown: number; // in seconds
}

export interface ComboChain {
  id: string;
  name: string;
  order: number; // 1, 2, 3...
  cooldownMin: number; // Min seconds, e.g. 12
  cooldownMax: number; // Max seconds, e.g. 18
  cooldown?: number;   // backward compatibility
  triggerAfterChainId: string; // "start" | "chain-id"
  steps: ChainStep[];
}

export const DEFAULT_COMBO_CHAINS: ComboChain[] = [
  {
    id: "chain_1",
    name: "Цепочка #1 (Основная)",
    order: 1,
    cooldownMin: 0,
    cooldownMax: 0,
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
    cooldownMin: 12,
    cooldownMax: 18,
    cooldown: 15.0,
    triggerAfterChainId: "chain_1",
    steps: [
      { id: "s2_1", skill: null, cooldown: 12.0 },
      { id: "s2_2", skill: null, cooldown: 15.0 },
      { id: "s2_3", skill: null, cooldown: 18.0 },
    ]
  }
];
