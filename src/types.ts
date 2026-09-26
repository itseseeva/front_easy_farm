export interface SkillConfigItem {
  slot: string;
  name?: string;
  combo: string;
  cooldown: number;
  steps: string[];
  lastUsed?: number;
  icon?: string;
}

export type FSMState = 'SEARCH' | 'COMBAT' | 'LOOT' | 'ESCAPE' | 'IDLE';

export interface TargetInfo {
  found: boolean;
  hpPercent: number;
  offsetX: number;
  offsetY: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  level: 'info' | 'warn' | 'error' | 'success';
  source?: 'fsm' | 'input' | 'vision' | 'test';
}

export interface RoadmapTask {
  id: string;
  title: string;
  practice: string;
  completed: boolean;
}

export interface RoadmapStage {
  id: string;
  title: string;
  timeframe: string;
  tasks: RoadmapTask[];
}

export interface VisionSettings {
  targetHpOffsetX: number;
  targetHpOffsetY: number;
  targetHpWidth: number;
  targetHpHeight: number;
  maxTargetHpWidth: number;
  redLower1: [number, number, number];
  redUpper1: [number, number, number];
  redLower2: [number, number, number];
  redUpper2: [number, number, number];
  yellowLower: [number, number, number];
  yellowUpper: [number, number, number];
}
