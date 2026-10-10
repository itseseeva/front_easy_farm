import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, CheckCircle2, AlertCircle } from 'lucide-react';

export interface CaptureProgressState {
  stage: 'prompt_switch' | 'minimize' | 'capture' | 'save' | 'done' | 'error';
  secondsLeft: number;
  message?: string;
}

interface CaptureProgressToastProps {
  progress: CaptureProgressState | null;
  onDismiss?: () => void;
}

export const CaptureProgressToast: React.FC<CaptureProgressToastProps> = ({ progress, onDismiss }) => {
  const [mountTarget, setMountTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el = document.getElementById('app-window-card');
    if (el) {
      setMountTarget(el);
    }
  }, []);

  if (!progress) return null;

  const isDone = progress.stage === 'done';
  const isError = progress.stage === 'error';
  const isPrompt = progress.stage === 'prompt_switch';

  // Calculate progress bar percentage (0 to 100)
  // Stages: prompt_switch -> minimize (6s) -> capture (4s down to 1s) -> save (0s) -> done
  let progressPct = 0;
  if (isPrompt) {
    progressPct = 5;
  } else if (progress.stage === 'minimize') {
    const elapsed = Math.max(0, 6 - progress.secondsLeft);
    progressPct = 10 + (elapsed / 6) * 35; // 10% -> 45%
  } else if (progress.stage === 'capture') {
    const elapsed = Math.max(0, 4 - progress.secondsLeft);
    progressPct = 45 + (elapsed / 4) * 45; // 45% -> 90%
  } else if (progress.stage === 'save') {
    progressPct = 95;
  } else if (isDone) {
    progressPct = 100;
  }

  const toastContent = (
    <div className="absolute top-12 right-2 sm:right-3 z-50 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-200 max-w-[calc(100%-16px)]">
      <div
        className={`pointer-events-auto min-w-[260px] sm:min-w-[280px] max-w-[340px] rounded-xl border p-2.5 sm:p-3 shadow-[0_16px_36px_rgba(0,0,0,0.95),0_0_20px_rgba(255,255,255,0.06)] backdrop-blur-md transition-all ${
          isDone
            ? 'bg-[#0b1410] border-emerald-800/80 text-emerald-200'
            : isError
            ? 'bg-[#180e10] border-rose-900/80 text-rose-200'
            : isPrompt
            ? 'bg-[#0f1017] border-zinc-700/90 text-zinc-100 shadow-[0_0_24px_rgba(255,255,255,0.12)]'
            : 'bg-[#0a0b10] border-zinc-800 text-zinc-200'
        }`}
      >
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 shrink-0">
            {isDone ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : isError ? (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            ) : (
              <Camera className="w-4 h-4 text-zinc-300 animate-pulse" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold tracking-wide">
                {isDone
                  ? 'Готово'
                  : isError
                  ? 'Ошибка съемки'
                  : isPrompt
                  ? 'Переключитесь на игру'
                  : 'Снимаю панель скиллов…'}
              </span>
              {!isDone && !isError && progress.secondsLeft > 0 && (
                <span className="text-[11px] font-mono text-zinc-400 font-bold shrink-0">
                  {progress.secondsLeft} с
                </span>
              )}
            </div>

            <p className="text-[11px] text-zinc-400 leading-tight mt-0.5">
              {progress.message ||
                (isPrompt
                  ? 'Переключитесь на окно игры и ждите, съемка начнется после переключения'
                  : progress.stage === 'minimize'
                  ? 'Окно сворачивается…'
                  : progress.stage === 'capture'
                  ? `Идёт съёмка экрана (${progress.secondsLeft} с)`
                  : progress.stage === 'save'
                  ? 'Сохранение снимков…'
                  : 'Снимки сохранены')}
            </p>
          </div>

          {onDismiss && (isDone || isError) && (
            <button
              type="button"
              onClick={onDismiss}
              className="text-zinc-500 hover:text-zinc-200 text-xs p-0.5 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Thin progress bar */}
        {!isError && (
          <div className="mt-2.5 w-full h-1 bg-zinc-800/80 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ease-out rounded-full ${
                isDone ? 'bg-emerald-400' : 'bg-zinc-300'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );

  if (mountTarget) {
    return createPortal(toastContent, mountTarget);
  }

  return toastContent;
};
