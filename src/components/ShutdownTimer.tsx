import React, { useState, useEffect, useRef, useId } from 'react';
import { Clock, AlertTriangle, CheckCircle2, X } from 'lucide-react';
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
 * Calculates HH:MM string from now + minutes
 */
function getTargetTimeFromMinutes(minutes: number): string {
  const target = new Date(Date.now() + minutes * 60 * 1000);
  const hh = String(target.getHours()).padStart(2, '0');
  const mm = String(target.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Calculates minutes from now until target HH:MM (today or tomorrow)
 */
function getMinutesFromTargetTime(timeStr: string): number {
  if (!timeStr || !timeStr.includes(':')) return 30;
  const [hStr, mStr] = timeStr.split(':');
  const hours = parseInt(hStr, 10);
  const minutes = parseInt(mStr, 10);
  if (isNaN(hours) || isNaN(minutes)) return 30;

  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);

  // If time already passed today, target is tomorrow
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }

  const diffMs = target.getTime() - now.getTime();
  return Math.max(1, Math.round(diffMs / (60 * 1000)));
}

export const ShutdownTimer: React.FC<ShutdownTimerProps> = ({
  onBotStopped,
  onToast,
}) => {
  const {
    deadline,
    totalDurationMs,
    remainingMs,
    isRunning,
    isWarning,
    warningToastVisible,
    completionToast,
    start,
    cancel,
    snooze,
    dismissWarningToast,
    dismissCompletionToast,
  } = useShutdownTimer({
    onBotStopped,
    onToast,
  });

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedMinutes, setSelectedMinutes] = useState<number>(30);
  const [targetTimeInput, setTargetTimeInput] = useState<string>(() => getTargetTimeFromMinutes(30));

  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const minutesInputId = useId();
  const targetTimeInputId = useId();

  // Keep target time input synced when popover opens
  useEffect(() => {
    if (isPopoverOpen) {
      if (isRunning && deadline) {
        const remainingMinutes = Math.max(1, Math.ceil(remainingMs / 60000));
        setSelectedMinutes(remainingMinutes);
        const end = new Date(deadline);
        const hh = String(end.getHours()).padStart(2, '0');
        const mm = String(end.getMinutes()).padStart(2, '0');
        setTargetTimeInput(`${hh}:${mm}`);
      } else {
        setTargetTimeInput(getTargetTimeFromMinutes(selectedMinutes));
      }
    }
  }, [isPopoverOpen, isRunning, deadline, remainingMs, selectedMinutes]);

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
  if (isRunning) {
    if (remainingMs > 60000) {
      displayTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    } else {
      displayTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
  }

  // Real finish time for tooltip
  let tooltipText = 'Таймер автоостановки (клик для настройки)';
  if (isRunning && deadline) {
    const end = new Date(deadline);
    const endH = String(end.getHours()).padStart(2, '0');
    const endM = String(end.getMinutes()).padStart(2, '0');
    tooltipText = `Остановит бота в ${endH}:${endM}`;
  }

  // SVG progress ring calculations
  // Circle radius 14 for compact neat progress arc without extra outer framing
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const effectiveTotal = totalDurationMs > 0 ? totalDurationMs : remainingMs;
  const progress = isRunning && effectiveTotal > 0
    ? Math.max(0, Math.min(1, remainingMs / effectiveTotal))
    : 0;
  const strokeDashoffset = circumference * (1 - progress);

  const handlePresetClick = (mins: number) => {
    setSelectedMinutes(mins);
    setTargetTimeInput(getTargetTimeFromMinutes(mins));
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    const mins = isNaN(val) ? 1 : Math.max(1, Math.min(1440, val));
    setSelectedMinutes(mins);
    setTargetTimeInput(getTargetTimeFromMinutes(mins));
  };

  const handleTargetTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeVal = e.target.value;
    setTargetTimeInput(timeVal);
    const mins = getMinutesFromTargetTime(timeVal);
    setSelectedMinutes(mins);
  };

  const handleStartTimer = () => {
    if (selectedMinutes > 0) {
      start(selectedMinutes * 60 * 1000);
      setIsPopoverOpen(false);
    }
  };

  const handleCancelTimer = () => {
    cancel();
    setIsPopoverOpen(false);
  };

  return (
    <div className="relative inline-flex items-center shrink-0">
      {/* Clock Button: компактные чистые часики вровень с кнопкой (h-[28px]) без двойных рамок */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsPopoverOpen((prev) => !prev)}
        className={`relative w-[32px] h-[32px] rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer select-none group focus:outline-none focus:ring-1 focus:ring-zinc-400 ${
          isWarning
            ? 'bg-red-950/40 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.5)] animate-pulse'
            : isRunning
            ? 'bg-zinc-900/60 text-zinc-100 hover:bg-zinc-800/80 shadow-[0_0_8px_rgba(255,255,255,0.1)]'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
        }`}
        title={tooltipText}
        aria-label={
          isRunning
            ? `Таймер автоостановки: осталось ${displayTime}`
            : 'Таймер автоостановки'
        }
        aria-expanded={isPopoverOpen}
        aria-haspopup="dialog"
      >
        {/* SVG Progress Ring (только если таймер запущен) */}
        {isRunning && (
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
              className={`transition-all duration-700 ease-linear ${
                isWarning ? 'text-red-500' : 'text-zinc-200'
              }`}
              fill="none"
            />
          </svg>
        )}

        {/* Center Content: Calm Clock or Digits */}
        <div className="flex items-center justify-center pointer-events-none z-10">
          {isRunning ? (
            <span
              className={`font-mono font-bold text-[8.5px] tracking-tight leading-none ${
                isWarning ? 'text-red-400 animate-pulse' : 'text-zinc-100'
              }`}
            >
              {displayTime}
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
          aria-label="Настройка таймера автоостановки"
          className="absolute top-full mt-2 left-0 sm:right-0 sm:left-auto z-50 w-[275px] bg-[#0c0c10] border border-zinc-700/90 rounded-xl p-3 shadow-[0_12px_40px_rgba(0,0,0,0.95),0_0_20px_rgba(255,255,255,0.06)] backdrop-blur-md flex flex-col gap-2.5 text-xs text-zinc-300 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800">
            <div className="flex items-center gap-1.5 font-medium text-zinc-100">
              <Clock className="w-3.5 h-3.5 text-zinc-300" />
              <span>Автоостановка бота</span>
            </div>
            {isRunning && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-600 text-zinc-200">
                {displayTime}
              </span>
            )}
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase font-mono text-zinc-400 tracking-wider">
              Быстрый выбор
            </span>
            <div className="grid grid-cols-5 gap-1">
              {PRESETS.map((preset) => {
                const isSelected = selectedMinutes === preset.minutes;
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
                value={selectedMinutes}
                onChange={handleMinutesChange}
                className="w-full bg-[#121216] border border-zinc-700/80 rounded px-2 py-1 text-xs text-zinc-100 font-mono focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
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
                className="w-full bg-[#121216] border border-zinc-700/80 rounded px-2 py-1 text-xs text-zinc-100 font-mono focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 text-center"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-800">
            {isRunning ? (
              <button
                type="button"
                onClick={handleCancelTimer}
                className="px-2.5 py-1 rounded text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 border border-transparent hover:border-red-900 transition cursor-pointer"
              >
                Отменить
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsPopoverOpen(false)}
                className="px-2 py-1 rounded text-xs text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
              >
                Закрыть
              </button>
            )}

            <button
              type="button"
              onClick={handleStartTimer}
              className="px-3 py-1 rounded text-xs font-medium bg-[#181822] text-zinc-100 border border-zinc-600 hover:border-zinc-300 hover:bg-[#22222e] hover:shadow-[0_0_12px_rgba(255,255,255,0.2)] transition cursor-pointer flex items-center gap-1"
            >
              <span>{isRunning ? 'Обновить' : 'Запустить'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Warning Toast: 60 seconds before stop */}
      {warningToastVisible && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#161013] border border-red-500/70 text-zinc-100 text-xs shadow-[0_6px_30px_rgba(0,0,0,0.95),0_0_16px_rgba(239,68,68,0.35)] animate-in fade-in slide-in-from-bottom-2 duration-200">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 animate-pulse" />
          <span className="font-medium">Бот остановится через 1 минуту</span>
          <button
            type="button"
            onClick={() => snooze(15 * 60 * 1000)}
            className="px-2.5 py-1 rounded bg-[#201519] hover:bg-[#2c1d23] text-zinc-100 text-[11px] font-medium border border-zinc-600 hover:border-zinc-400 transition cursor-pointer shadow-sm ml-1"
          >
            Отложить на 15 мин
          </button>
          <button
            type="button"
            onClick={dismissWarningToast}
            className="text-zinc-400 hover:text-white p-0.5 cursor-pointer ml-0.5"
            aria-label="Закрыть уведомление"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Completion Toast: when timer stops the bot */}
      {completionToast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0f1412] border border-emerald-500/70 text-zinc-100 text-xs shadow-[0_6px_30px_rgba(0,0,0,0.95),0_0_16px_rgba(16,185,129,0.3)] animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{completionToast}</span>
          <button
            type="button"
            onClick={dismissCompletionToast}
            className="text-zinc-400 hover:text-white p-0.5 cursor-pointer ml-1"
            aria-label="Закрыть уведомление"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
