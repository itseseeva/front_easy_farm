import { SkillConfigItem, RoadmapStage, VisionSettings } from '../types';

export function parseComboString(comboStr: string): string[] {
  const parts = comboStr.trim().split('+').map(p => p.trim());
  if (parts.length === 1) {
    return [`press_${parts[0]}`];
  }
  const modifier = parts[0];
  const targetKey = parts.slice(1).join('+');
  return [`hold_${modifier}`, `press_${targetKey}`, `release_${modifier}`];
}

export const INITIAL_SKILLS: SkillConfigItem[] = [
  { slot: "1", name: "Heavy Strike", combo: "RB+X", cooldown: 8.0, steps: parseComboString("RB+X") },
  { slot: "2", name: "Blade Vortex", combo: "RB+Y", cooldown: 8.0, steps: parseComboString("RB+Y") },
  { slot: "3", name: "Stun Break", combo: "RB+B", cooldown: 8.0, steps: parseComboString("RB+B") },
  { slot: "4", name: "Guillotine Blade", combo: "RB+A", cooldown: 8.0, steps: parseComboString("RB+A") },
  { slot: "5", name: "Fireball Barrage", combo: "RT+X", cooldown: 8.0, steps: parseComboString("RT+X") },
  { slot: "6", name: "Infernal Wave", combo: "RT+Y", cooldown: 8.0, steps: parseComboString("RT+Y") },
  { slot: "7", name: "Chain Lightning", combo: "RT+B", cooldown: 8.0, steps: parseComboString("RT+B") },
  { slot: "8", name: "Frost Nova", combo: "RT+A", cooldown: 8.0, steps: parseComboString("RT+A") },
  { slot: "9", name: "Shadow Dash", combo: "RT+DPAD_LEFT", cooldown: 8.0, steps: parseComboString("RT+DPAD_LEFT") },
  { slot: "0", name: "Morale Boost", combo: "RT+DPAD_UP", cooldown: 8.0, steps: parseComboString("RT+DPAD_UP") },
  { slot: "-", name: "Camouflage", combo: "RT+DPAD_RIGHT", cooldown: 8.0, steps: parseComboString("RT+DPAD_RIGHT") },
  { slot: "=", name: "Ultimate Burst", combo: "RT+DPAD_DOWN", cooldown: 8.0, steps: parseComboString("RT+DPAD_DOWN") }
];

export const PRESET_ROTATIONS: { id: string; name: string; description: string; skills: SkillConfigItem[] }[] = [
  {
    id: 'default',
    name: 'Стандартный конфиг (1..=)',
    description: 'Оригинальный порядок из skills_config.json',
    skills: INITIAL_SKILLS
  },
  {
    id: 'burst_dps',
    name: 'Бурст-урон (Greatsword + Dagger)',
    description: 'Сначала мощный контроль и дебаффы, затем финишеры',
    skills: [
      { slot: "4", name: "Guillotine Blade", combo: "RB+A", cooldown: 6.0, steps: parseComboString("RB+A") },
      { slot: "1", name: "Heavy Strike", combo: "RB+X", cooldown: 5.0, steps: parseComboString("RB+X") },
      { slot: "=", name: "Ultimate Burst", combo: "RT+DPAD_DOWN", cooldown: 25.0, steps: parseComboString("RT+DPAD_DOWN") },
      { slot: "2", name: "Blade Vortex", combo: "RB+Y", cooldown: 7.0, steps: parseComboString("RB+Y") },
      { slot: "9", name: "Shadow Dash", combo: "RT+DPAD_LEFT", cooldown: 8.0, steps: parseComboString("RT+DPAD_LEFT") },
      { slot: "5", name: "Fireball Barrage", combo: "RT+X", cooldown: 8.0, steps: parseComboString("RT+X") },
      { slot: "3", name: "Stun Break", combo: "RB+B", cooldown: 12.0, steps: parseComboString("RB+B") },
      { slot: "6", name: "Infernal Wave", combo: "RT+Y", cooldown: 8.0, steps: parseComboString("RT+Y") },
      { slot: "7", name: "Chain Lightning", combo: "RT+B", cooldown: 9.0, steps: parseComboString("RT+B") },
      { slot: "8", name: "Frost Nova", combo: "RT+A", cooldown: 10.0, steps: parseComboString("RT+A") },
      { slot: "0", name: "Morale Boost", combo: "RT+DPAD_UP", cooldown: 30.0, steps: parseComboString("RT+DPAD_UP") },
      { slot: "-", name: "Camouflage", combo: "RT+DPAD_RIGHT", cooldown: 20.0, steps: parseComboString("RT+DPAD_RIGHT") }
    ]
  },
  {
    id: 'aoe_farm',
    name: 'Массовый фарм (AoE Staff/Wand)',
    description: 'Фокус на стяжках, массовом контроле и периодическом уроне',
    skills: [
      { slot: "8", name: "Frost Nova", combo: "RT+A", cooldown: 8.0, steps: parseComboString("RT+A") },
      { slot: "6", name: "Infernal Wave", combo: "RT+Y", cooldown: 7.0, steps: parseComboString("RT+Y") },
      { slot: "7", name: "Chain Lightning", combo: "RT+B", cooldown: 6.0, steps: parseComboString("RT+B") },
      { slot: "5", name: "Fireball Barrage", combo: "RT+X", cooldown: 5.0, steps: parseComboString("RT+X") },
      { slot: "2", name: "Blade Vortex", combo: "RB+Y", cooldown: 8.0, steps: parseComboString("RB+Y") },
      { slot: "1", name: "Heavy Strike", combo: "RB+X", cooldown: 8.0, steps: parseComboString("RB+X") },
      { slot: "0", name: "Morale Boost", combo: "RT+DPAD_UP", cooldown: 20.0, steps: parseComboString("RT+DPAD_UP") },
      { slot: "4", name: "Guillotine Blade", combo: "RB+A", cooldown: 12.0, steps: parseComboString("RB+A") },
      { slot: "3", name: "Stun Break", combo: "RB+B", cooldown: 15.0, steps: parseComboString("RB+B") },
      { slot: "9", name: "Shadow Dash", combo: "RT+DPAD_LEFT", cooldown: 10.0, steps: parseComboString("RT+DPAD_LEFT") },
      { slot: "-", name: "Camouflage", combo: "RT+DPAD_RIGHT", cooldown: 25.0, steps: parseComboString("RT+DPAD_RIGHT") },
      { slot: "=", name: "Ultimate Burst", combo: "RT+DPAD_DOWN", cooldown: 40.0, steps: parseComboString("RT+DPAD_DOWN") }
    ]
  }
];

export const INITIAL_ROADMAP: RoadmapStage[] = [
  {
    id: "stage1",
    title: "Этап 1: Инфраструктура и обход защиты",
    timeframe: "Оценка: 1-2 дня",
    tasks: [
      {
        id: "t1_1",
        title: "Настройка Python-окружения и Git-репозитория",
        practice: "Создается виртуальное окружение, ставятся библиотеки OpenCV и mss. Разворачивается базовая ветка main для контроля версий.",
        completed: true
      },
      {
        id: "t1_2",
        title: "Интеграция драйвера-эмулятора ввода",
        practice: "Устанавливается системный драйвер (ViGEmBus + vgamepad), который эмулирует геймпад Xbox 360, полностью изолируя реальные устройства ввода и обходя античит.",
        completed: true
      }
    ]
  },
  {
    id: "stage2",
    title: "Этап 2: Машинное зрение (Perception)",
    timeframe: "Оценка: 2-3 дня",
    tasks: [
      {
        id: "t2_1",
        title: "Считывание шкал HP/MP и состояния интерфейса",
        practice: "Скрипт 60 раз в секунду забирает кадр напрямую из буфера видеокарты. Алгоритм считает красные пиксели на полоске здоровья цели и передает в логику точный процент ХП, не нагружая процессор.",
        completed: true
      },
      {
        id: "t2_2",
        title: "Распознавание внеэкранных указок таргета",
        practice: "OpenCV сканирует кольцевую зону вокруг центра экрана. Если находит красную треугольную указку, вычисляет ее угол и дает команду плавно поворачивать камеру, пока моб не окажется в поле зрения.",
        completed: false
      }
    ]
  },
  {
    id: "stage3",
    title: "Этап 3: Эмуляция движений и Автопуть",
    timeframe: "Оценка: 2-4 дня",
    tasks: [
      {
        id: "t3_1",
        title: "Рандомизация встроенного автопути",
        practice: "В игре работает автопуть к таргету. Но чтобы бег не выглядел искусственно, скрипт на ходу случайным образом нажимает Space (прыжок) или вклинивает короткие стрейфы (A / D), сбивая идеальную траекторию.",
        completed: false
      },
      {
        id: "t3_2",
        title: "Модуль кривых Безье для камеры",
        practice: "При довороте камеры к цели мышь/стик движется с легкими дугами, микро-ускорениями и замедлениями (smoothstep 3t²-2t³), полностью имитируя небрежное движение человеческой руки.",
        completed: true
      },
      {
        id: "t3_3",
        title: "Генератор случайных пауз (Humanizer)",
        practice: "Задержки между нажатиями кнопок всегда генерируются по-новому (например, 182 мс, затем 315 мс). Роботизированные и повторяющиеся тайминги полностью исключены.",
        completed: true
      }
    ]
  },
  {
    id: "stage4",
    title: "Этап 4: Конечный автомат (FSM)",
    timeframe: "Оценка: 3-5 дней",
    tasks: [
      {
        id: "t4_1",
        title: "Состояние SEARCH / IDLE (Случайный патруль)",
        practice: "Бот жмет R3/Target. Если целей нет, он делает случайный поворот камеры и пробегает пару секунд вперед, меняя позицию на споте. Это размазывает тепловую карту перемещений на сервере.",
        completed: true
      },
      {
        id: "t4_2",
        title: "Состояние COMBAT (Ротация и Микро-стрейфы)",
        practice: "Цель поймана. Бот кастует скиллы по кулдаунам из skills_config.json, но между кастами рандомно зажимает стрейфы. Персонаж постоянно мнется на месте, имитируя живого игрока.",
        completed: true
      },
      {
        id: "t4_3",
        title: "Состояние KITE (Отступление ренджевика)",
        practice: "Если зрение видит, что моб подошел вплотную (индикатор слишком крупный), бот прерывает атаку и делает кувырок назад или отбегает, разрывая дистанцию для безопасной стрельбы.",
        completed: false
      },
      {
        id: "t4_4",
        title: "Анти-застревание автопути и Усталость",
        practice: "Если включен автопуть, но координаты экрана не меняются долгое время (уперся в дерево), скрипт сбрасывает таргет и делает отскок. Раз в пару часов бот садится на землю и уходит в АФК на 5-10 минут.",
        completed: false
      }
    ]
  },
  {
    id: "stage5",
    title: "Этап 5: Социальный модуль и чат (LLM)",
    timeframe: "Оценка: 3-5 дней",
    tasks: [
      {
        id: "t5_1",
        title: "Интеграция OCR и генерации ответов",
        practice: "Скрипт распознает личное сообщение в чате. Текст улетает в языковую модель с промптом 'ты уставший игрок, отвечай коротко'. Модель генерирует ответ игровым сленгом.",
        completed: false
      },
      {
        id: "t5_2",
        title: "Имитатор набора текста",
        practice: "Сгенерированный текст вводится по одной букве с разной скоростью. Периодически скрипт нажимает Backspace, чтобы стереть намеренно допущенную опечатку.",
        completed: false
      }
    ]
  },
  {
    id: "stage6",
    title: "Этап 6: Тестирование и полировка",
    timeframe: "Оценка: 2-3 дня",
    tasks: [
      {
        id: "t6_1",
        title: "Полевые тесты и настройка таймингов",
        practice: "Бот запускается на твинке. Идет подгонка задержек микро-стрейфов и прыжков во время автопути, чтобы они не прерывали каст долгих скиллов и выглядели максимально естественно.",
        completed: false
      }
    ]
  }
];

export const INITIAL_VISION: VisionSettings = {
  targetHpOffsetX: -150,
  targetHpOffsetY: -300,
  targetHpWidth: 300,
  targetHpHeight: 300,
  maxTargetHpWidth: 150,
  redLower1: [0, 120, 70],
  redUpper1: [10, 255, 255],
  redLower2: [170, 120, 70],
  redUpper2: [180, 255, 255],
  yellowLower: [15, 100, 100],
  yellowUpper: [45, 255, 255],
};
