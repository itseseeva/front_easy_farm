import React, { useState, useEffect, useRef, useId } from 'react';
import { Clock } from 'lucide-react';
import { useShutdownTimer } from '../hooks/useShutdownTimer';

interface ShutdownTimerProps {
  onBotStopped?: () => void;
  onToast?: (message: string) => void;
}

const PRESETS = [
  { label: '15 мин', minutes: 15 },
  { label: '30 мин', minutes: 30 },
  { label: '1 ч', minutes: 60 },
  { label: '2 ч', minutes: 120 },
  { label: '4 ч', minutes: 240 },
];

/**
 * Calculates HH:MM string from target timestamp
 */
function formatTimeFromTimestamp(timestamp: number): string {
  const target = new Date(timestamp);
  const hh = String(target.getHours()).padStart(2, '0');
  const mm = String(target.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Calculates deadline ms from HH:MM string (today or tomorrow)
 * Returns null if invalid format
 */
function getDeadlineMsFromTimeString(timeStr: string): number | null {
  if (!timeStr || !timeStr.includes(':')) return null;
  const parts = timeStr.trim().split(':');
  if (parts.length !== 2) return null;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);

  // If time already passed today, target is tomorrow
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }

  return target.getTime();
}

export const ShutdownTimer: React.FC<ShutdownTimerProps> = ({
  onBotStopped,
  onToast,
}) => {
  const {
    shutdownMode,
    shutdownMinutes,
    shutdownDeadlineMs,
    remainingMs,
    totalDurationMs,
    isPendingStart,
    isActiveCountdown,
    isWarning,
    setDuration,
    setClockTarget,
    cancelTimer,
  } = useShutdownTimer({
    onBotStopped,
    onToast,
  });

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Form input fields
  const [minutesInput, setMinutesInput] = useState<string>('');
  const [targetTimeInput, setTargetTimeInput] = useState<string>('');

  // Error validation indicators
  const [isMinutesInvalid, setIsMinutesInvalid] = useState(false);
  const [isTimeInvalid, setIsTimeInvalid] = useState(false);

  const isSyncingInputsRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const minutesInputId = useId();
  const targetTimeInputId = useId();

  // Populate or clear fields according to shutdownMode & inputs when popover opens or mode changes
  useEffect(() => {
    if (isPopoverOpen) {
      isSyncingInputsRef.current = true;
      if (shutdownMode === null) {
        setMinutesInput('');
        setTargetTimeInput('');
      } else if (shutdownMode === 'duration') {
        setMinutesInput(shutdownMinutes ? String(shutdownMinutes) : '');
        setTargetTimeInput('');
      } else if (shutdownMode === 'clock') {
        if (shutdownDeadlineMs) {
          setTargetTimeInput(formatTimeFromTimestamp(shutdownDeadlineMs));
          const minsRemaining = Math.max(1, Math.round((shutdownDeadlineMs - Date.now()) / 60000));
          setMinutesInput(String(minsRemaining));
        }
      }
      setIsMinutesInvalid(false);
      setIsTimeInvalid(false);

      const timer = setTimeout(() => {
        isSyncingInputsRef.current = false;
      }, 50);
      return () => clearTimeout(timer);
    } else {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    }
  }, [isPopoverOpen, shutdownMode, shutdownMinutes, shutdownDeadlineMs]);

  // Handle outside click & Esc key
  useEffect(() => {
    if (!isPopoverOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPopoverOpen(false);
        buttonRef.current?.focus();
      }
    };

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsPopoverOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isPopoverOpen]);

  // Formatted countdown strings
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let displayTime = '';
  if (isActiveCountdown) {
    if (remainingMs > 60000) {
      displayTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    } else {
      displayTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
  }

  // Real finish time or status text for tooltip
  let tooltipText = 'Таймер автоостановки (клик для настройки)';
  if (isPendingStart) {
    tooltipText = `Остановит бота через ${shutdownMinutes} мин (начнётся со Старта)`;
  } else if (isActiveCountdown && shutdownDeadlineMs) {
    tooltipText = `Остановит бота в ${formatTimeFromTimestamp(shutdownDeadlineMs)}`;
  }

  // SVG Progress Ring calculations
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  let strokeDashoffset = circumference;

  if (isPendingStart) {
    // кольцо полное, без анимации
    strokeDashoffset = 0;
  } else if (isActiveCountdown) {
    const effectiveTotal = totalDurationMs > 0 ? totalDurationMs : remainingMs;
    const progress = effectiveTotal > 0 ? Math.max(0, Math.min(1, remainingMs / effectiveTotal)) : 0;
    strokeDashoffset = circumference * (1 - progress);
  }

  // 1. Preset click: window.pywebview.api.set_shutdown_duration(minutes)
  const handlePresetClick = (mins: number) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    isSyncingInputsRef.current = true;
    setMinutesInput(String(mins));
    setTargetTimeInput('');
    setIsMinutesInvalid(false);
    setIsTimeInvalid(false);
    setDuration(mins);
    setTimeout(() => {
      isSyncingInputsRef.current = false;
    }, 50);
  };

  // 2. Custom minutes change (debounced 600ms): window.pywebview.api.set_shutdown_duration(minutes)
  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setMinutesInput(rawVal);
    setIsMinutesInvalid(false);

    if (isSyncingInputsRef.current) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (rawVal.trim() === '') {
        // Очистили поле -> cancel_shutdown_timer()
        cancelTimer();
        setTargetTimeInput('');
        setIsMinutesInvalid(false);
        return;
      }

      const num = Number(rawVal.trim());
      if (!isNaN(num) && Number.isInteger(num) && num >= 1 && num <= 1440) {
        setIsMinutesInvalid(false);
        setTargetTimeInput('');
        setDuration(num);
      } else {
        setIsMinutesInvalid(true);
      }
    }, 600);
  };

  // 3. Stop at HH:MM change (debounced 600ms): window.pywebview.api.set_shutdown_timer(deadlineMs)
  const handleTargetTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setTargetTimeInput(rawVal);
    setIsTimeInvalid(false);

    if (isSyncingInputsRef.current) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (rawVal.trim() === '') {
        // Очистили поле -> cancel_shutdown_timer()
        cancelTimer();
        setMinutesInput('');
        setIsTimeInvalid(false);
        return;
      }

      const deadline = getDeadlineMsFromTimeString(rawVal);
      if (deadline !== null) {
        setIsTimeInvalid(false);
        const minsRemaining = Math.max(1, Math.round((deadline - Date.now()) / 60000));
        setMinutesInput(String(minsRemaining));
        setClockTarget(deadline);
      } else {
        setIsTimeInvalid(true);
      }
    }, 600);
  };

  // 4. Cancel button click: window.pywebview.api.cancel_shutdown_timer()
  const handleCancelClick = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    cancelTimer();
    setMinutesInput('');
    setTargetTimeInput('');
    setIsMinutesInvalid(false);
    setIsTimeInvalid(false);
  };

  const isTimerConfigured = shutdownMode !== null;

  return (
    <div className="relative inline-flex items-center shrink-0">
      {/* Clock Button: компактные часики вровень со стартом */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsPopoverOpen((prev) => !prev)}
        className={`relative w-[32px] h-[32px] rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer select-none group focus:outline-none focus:ring-1 focus:ring-zinc-400 ${
          isWarning
            ? 'bg-red-950/40 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.5)] animate-pulse'
            : isActiveCountdown
            ? 'bg-zinc-900/60 text-zinc-100 hover:bg-zinc-800/80 shadow-[0_0_8px_rgba(255,255,255,0.1)]'
            : isPendingStart
            ? 'bg-amber-950/20 text-amber-300 hover:bg-amber-900/30 border border-amber-500/30'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
        }`}
        title={tooltipText}
        aria-label={
          isActiveCountdown
            ? `Таймер автоостановки: осталось ${displayTime}`
            : isPendingStart
            ? `Таймер ожидает старта: ${shutdownMinutes} мин`
            : 'Таймер автоостановки'
        }
        aria-expanded={isPopoverOpen}
        aria-haspopup="dialog"
      >
        {/* SVG Progress Ring */}
        {(isActiveCountdown || isPendingStart) && (
          <svg
            className="absolute inset-0 w-full h-full -rotate-90 transform pointer-events-none"
            viewBox="0 0 32 32"
            aria-hidden="true"
          >
            <circle
              cx={16}
              cy={16}
              r={radius}
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={
                isPendingStart
                  ? 'text-amber-400'
                  : `transition-all duration-700 ease-linear ${
                      isWarning ? 'text-red-500' : 'text-zinc-200'
                    }`
              }
              fill="none"
            />
          </svg>
        )}

        {/* Center Content: Calm Clock, Digits or Pending Indicator */}
        <div className="flex items-center justify-center pointer-events-none z-10">
          {isActiveCountdown ? (
            <span
              className={`font-mono font-bold text-[8.5px] tracking-tight leading-none ${
                isWarning ? 'text-red-400 animate-pulse' : 'text-zinc-100'
              }`}
            >
              {displayTime}
            </span>
          ) : isPendingStart ? (
            <span className="font-mono font-bold text-[8px] text-amber-300 leading-none">
              ⏸{shutdownMinutes}м
            </span>
          ) : (
            <Clock className="w-4 h-4 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
          )}
        </div>
      </button>

      {/* Popover */}
      {isPopoverOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Настройка автоостановки бота"
          className="absolute top-full mt-2 right-0 z-50 w-[280px] bg-[#0c0c10] border border-zinc-700/90 rounded-xl p-3 shadow-[0_12px_40px_rgba(0,0,0,0.95),0_0_20px_rgba(255,255,255,0.06)] backdrop-blur-md flex flex-col gap-2.5 text-xs text-zinc-300 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800">
            <div className="flex items-center gap-1.5 font-medium text-zinc-100">
              <Clock className="w-3.5 h-3.5 text-zinc-300" />
              <span>Автоостановка бота</span>
            </div>
            {isActiveCountdown ? (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-600 text-zinc-200">
                {displayTime}
              </span>
            ) : isPendingStart ? (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/40 border border-amber-600/50 text-amber-300">
                Ждёт старта
              </span>
            ) : null}
          </div>

          {/* Presets: сразу вызывают set_shutdown_duration */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase font-mono text-zinc-400 tracking-wider">
              Быстрый выбор
            </span>
            <div className="grid grid-cols-5 gap-1">
              {PRESETS.map((preset) => {
                const isSelected = shutdownMinutes === preset.minutes;
                return (
                  <button
                    key={preset.minutes}
                    type="button"
                    onClick={() => handlePresetClick(preset.minutes)}
                    className={`px-1 py-1 rounded text-[11px] font-medium transition cursor-pointer border text-center ${
                      isSelected
                        ? 'bg-[#1c1c24] text-white border-zinc-400 shadow-[0_0_8px_rgba(255,255,255,0.2)]'
                        : 'bg-[#121216] text-zinc-300 border-zinc-800 hover:border-zinc-600 hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Time (minutes) & Stop At (HH:MM) */}
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <div className="flex flex-col gap-1">
              <label
                htmlFor={minutesInputId}
                className="text-[10px] text-zinc-400 font-mono"
              >
                Своё время (мин):
              </label>
              <input
                id={minutesInputId}
                type="number"
                min="1"
                max="1440"
                placeholder="напр. 60"
                value={minutesInput}
                onChange={handleMinutesChange}
                className={`w-full bg-[#121216] border rounded px-2 py-1 text-xs text-zinc-100 font-mono transition-colors focus:outline-none ${
                  isMinutesInvalid
                    ? 'border-red-500 ring-1 ring-red-500/50'
                    : 'border-zinc-700/80 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400'
                }`}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                htmlFor={targetTimeInputId}
                className="text-[10px] text-zinc-400 font-mono"
              >
                Остановить в:
              </label>
              <input
                id={targetTimeInputId}
                type="time"
                value={targetTimeInput}
                onChange={handleTargetTimeChange}
                className={`w-full bg-[#121216] border rounded px-2 py-1 text-xs text-zinc-100 font-mono text-center transition-colors focus:outline-none ${
                  isTimeInvalid
                    ? 'border-red-500 ring-1 ring-red-500/50'
                    : 'border-zinc-700/80 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400'
                }`}
              />
            </div>
          </div>

          {/* Status Line & Cancel button */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-800">
            {/* Fine status text as specified */}
            <span
              className={`text-[11px] font-mono truncate select-none ${
                isPendingStart
                  ? 'text-amber-300'
                  : isActiveCountdown
                  ? 'text-zinc-200'
                  : 'text-zinc-500'
              }`}
            >
              {isPendingStart
                ? `⏸ ${shutdownMinutes || 60} мин — начнётся со Старта`
                : isActiveCountdown && shutdownDeadlineMs
                ? `Остановит бота в ${formatTimeFromTimestamp(shutdownDeadlineMs)}`
                : 'Таймер выключен'}
            </span>

            {/* Cancel button: видна только когда таймер настроен */}
            {isTimerConfigured && (
              <button
                type="button"
                onClick={handleCancelClick}
                className="shrink-0 px-2 py-1 rounded text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 border border-red-900/40 hover:border-red-700 transition cursor-pointer"
              >
                Отменить таймер
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
