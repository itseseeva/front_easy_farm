import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { FarmMode } from '../types';

interface FarmModeSwitchProps {
  isBotRunning: boolean;
  serverFarmMode?: FarmMode;
  onFarmModeChange?: (mode: FarmMode) => void;
  onToast?: (message: string) => void;
  onError?: (message: string) => void;
}

export const FarmModeSwitch: React.FC<FarmModeSwitchProps> = ({
  isBotRunning,
  serverFarmMode,
  onFarmModeChange,
  onToast,
  onError,
}) => {
  const [mode, setMode] = useState<FarmMode>('pull');
  const [isPending, setIsPending] = useState(false);
  const pendingTargetRef = useRef<FarmMode | null>(null);

  // 1) Initial load: fetch farm mode via get_farm_mode(), wait for pywebviewready if needed
  useEffect(() => {
    let isCancelled = false;

    const fetchInitialFarmMode = async () => {
      if (typeof window !== 'undefined' && window.pywebview?.api?.get_farm_mode) {
        try {
          const res = await window.pywebview.api.get_farm_mode();
          if (!isCancelled && res && res.ok && res.farm_mode) {
            setMode(res.farm_mode);
            onFarmModeChange?.(res.farm_mode);
          }
        } catch (err) {
          console.warn('get_farm_mode fetch error:', err);
        }
      }
    };

    if (typeof window !== 'undefined' && window.pywebview?.api?.get_farm_mode) {
      fetchInitialFarmMode();
    } else {
      window.addEventListener('pywebviewready', fetchInitialFarmMode, { once: true });
    }

    return () => {
      isCancelled = true;
      window.removeEventListener('pywebviewready', fetchInitialFarmMode);
    };
  }, [onFarmModeChange]);

  // 2) Sync with get_status() updates, but never while a set_farm_mode call is in flight
  useEffect(() => {
    if (serverFarmMode && !isPending && serverFarmMode !== mode) {
      setMode(serverFarmMode);
    }
  }, [serverFarmMode, isPending, mode]);

  // Handle mode selection (click or keyboard)
  const handleModeSelect = async (targetMode: FarmMode) => {
    // Avoid double clicks or re-triggering current active selection
    if (isPending || targetMode === mode) return;

    const previousMode = mode;
    setIsPending(true);
    pendingTargetRef.current = targetMode;

    try {
      if (typeof window !== 'undefined' && window.pywebview?.api?.set_farm_mode) {
        const res = await window.pywebview.api.set_farm_mode(targetMode);

        if (res && res.ok) {
          const finalMode = res.farm_mode || targetMode;
          setMode(finalMode);
          onFarmModeChange?.(finalMode);

          // If changes apply on next start (e.g. while bot is running), show toast with backend message
          if (res.applies === 'next_start') {
            const toastMsg =
              res.message ||
              (finalMode === 'pull'
                ? 'Режим «Агр мобов» включится после Стоп/Старт'
                : 'Режим «Обычный» включится после Стоп/Старт');
            onToast?.(toastMsg);
          }
        } else {
          // Revert to previous mode and show error
          setMode(previousMode);
          const errorMsg =
            res?.error === 'bad_mode'
              ? 'Неверный режим фарма'
              : res?.error || res?.message || 'Ошибка переключения режима фарма';
          onError?.(errorMsg);
        }
      } else {
        // Dev preview fallback without pywebview
        await new Promise((resolve) => setTimeout(resolve, 150));
        setMode(targetMode);
        onFarmModeChange?.(targetMode);

        if (isBotRunning) {
          onToast?.(
            targetMode === 'pull'
              ? 'Режим «Агр мобов» включится после Стоп/Старт'
              : 'Режим «Обычный» включится после Стоп/Старт'
          );
        }
      }
    } catch (err: any) {
      setMode(previousMode);
      onError?.(err?.message || 'Ошибка связи с бэкендом');
    } finally {
      setIsPending(false);
      pendingTargetRef.current = null;
    }
  };

  // Keyboard accessibility: Left/Right/Up/Down arrows toggle option
  const handleKeyDown = (e: React.KeyboardEvent, currentOption: FarmMode) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      handleModeSelect(currentOption === 'pull' ? 'normal' : 'pull');
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      handleModeSelect(currentOption === 'pull' ? 'normal' : 'pull');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center shrink-0">
      {/* Segmented Control / Две кнопки-таблетки */}
      <div
        role="radiogroup"
        aria-label="Режим фарма"
        className="inline-flex items-center p-0.5 rounded-lg bg-[#0e0f16] border border-zinc-800/90 text-xs select-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]"
      >
        {/* Вариант 1: «Агр мобов» */}
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'pull'}
          tabIndex={mode === 'pull' ? 0 : -1}
          disabled={isPending}
          onClick={() => handleModeSelect('pull')}
          onKeyDown={(e) => handleKeyDown(e, 'pull')}
          title="Бот собирает до 4 мобов тычками, приводит к дому и добивает их там — лут падает рядом с вами"
          className={`relative px-2 py-1 rounded-md text-[10.5px] font-medium leading-none transition-all duration-150 cursor-pointer select-none border flex items-center justify-center gap-1 ${
            mode === 'pull'
              ? 'bg-[#181822] text-zinc-100 border-zinc-500 shadow-[0_0_10px_rgba(255,255,255,0.08)]'
              : 'bg-transparent text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-zinc-800/50'
          } disabled:opacity-60 disabled:cursor-wait focus:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400`}
        >
          {isPending && pendingTargetRef.current === 'pull' && (
            <Loader2 className="w-2.5 h-2.5 text-zinc-300 animate-spin shrink-0" />
          )}
          <span>Агр мобов</span>
        </button>

        {/* Вариант 2: «Обычный» */}
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'normal'}
          tabIndex={mode === 'normal' ? 0 : -1}
          disabled={isPending}
          onClick={() => handleModeSelect('normal')}
          onKeyDown={(e) => handleKeyDown(e, 'normal')}
          title="Бот бьёт всех мобов подряд, без сбора и возврата к дому"
          className={`relative px-2 py-1 rounded-md text-[10.5px] font-medium leading-none transition-all duration-150 cursor-pointer select-none border flex items-center justify-center gap-1 ${
            mode === 'normal'
              ? 'bg-[#181822] text-zinc-100 border-zinc-500 shadow-[0_0_10px_rgba(255,255,255,0.08)]'
              : 'bg-transparent text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-zinc-800/50'
          } disabled:opacity-60 disabled:cursor-wait focus:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400`}
        >
          {isPending && pendingTargetRef.current === 'normal' && (
            <Loader2 className="w-2.5 h-2.5 text-zinc-300 animate-spin shrink-0" />
          )}
          <span>Обычный</span>
        </button>
      </div>

      {/* Пока бот работает: мелкая серая подпись «смена режима — после Стоп/Старт» (переключатель НЕ блокируется) */}
      {isBotRunning && (
        <span
          className="text-[8px] text-zinc-500 font-normal leading-none mt-0.5 select-none text-center whitespace-nowrap tracking-tight"
          title="Смена режима применится после остановки и повторного запуска бота"
        >
          смена режима — после Стоп/Старт
        </span>
      )}
    </div>
  );
};
