import React, { useEffect, useState } from 'react';
import { SessionSummaryData } from '../types';
import { Clock, Zap, Target, AlertTriangle, X, Trophy } from 'lucide-react';

interface SessionSummaryModalProps {
  data: SessionSummaryData | null;
  onClose: () => void;
}

// Hook for smooth count-up animation over ~800ms
function useCountUp(target: number | null, durationMs = 800, decimals = 0): number | null {
  const [current, setCurrent] = useState<number | null>(() => (target === null ? null : 0));

  useEffect(() => {
    if (target === null) {
      setCurrent(null);
      return;
    }

    let startTime: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(1, elapsed / durationMs);

      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const val = target * easeOut;

      setCurrent(Number(val.toFixed(decimals)));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setCurrent(target);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => cancelAnimationFrame(animationFrameId);
  }, [target, durationMs, decimals]);

  return current;
}

function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const SessionSummaryModal: React.FC<SessionSummaryModalProps> = ({ data, onClose }) => {
  // Listen for Esc key to close
  useEffect(() => {
    if (!data) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [data, onClose]);

  const animatedKills = useCountUp(data ? data.kills : null, 800, 0);
  const animatedKillsPerHour = useCountUp(data ? data.kills_per_hour : null, 800, 0);
  const animatedDuration = useCountUp(data ? data.duration_s : null, 800, 0);
  const animatedLost = useCountUp(data ? data.lost : null, 800, 0);
  const animatedAvgGap = useCountUp(data?.avg_kill_gap_s != null ? data.avg_kill_gap_s : null, 800, 1);

  if (!data) return null;

  const isTimerStop = data.stop_reason === 'timer';
  const reasonText = isTimerStop ? 'Остановлено по таймеру' : 'Остановлено вручную';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[360px] bg-[#09090d] border border-zinc-800/90 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.95),0_0_30px_rgba(255,255,255,0.03)] flex flex-col gap-3.5 text-zinc-200 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Title and Close Button */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-zinc-800/90 border border-zinc-700/80 flex items-center justify-center text-zinc-200 shadow-[0_0_10px_rgba(255,255,255,0.05)]">
              <Trophy className="w-3.5 h-3.5 text-zinc-200" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-wide">Итог сессии</h2>
              <span className="text-[10px] text-zinc-400 font-mono">
                {new Date(data.stopped_at_ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition cursor-pointer"
            title="Закрыть (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hero Counter: Убито мобов */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-b from-[#12121a] to-[#0c0c12] border border-zinc-800/90 p-3.5 flex flex-col items-center justify-center text-center shadow-inner">
          <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 mb-0.5">
            Убито мобов
          </span>
          <div className="text-4xl font-extrabold font-mono tracking-tight text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.25)]">
            {animatedKills !== null ? Math.round(animatedKills) : data.kills}
          </div>

          {/* Subtitle Badge: Reason */}
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-700/70 text-[10.5px] text-zinc-300">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isTimerStop ? 'bg-zinc-300' : 'bg-emerald-400'
              } shadow-[0_0_6px_rgba(255,255,255,0.4)]`}
            />
            <span className="font-medium">{reasonText}</span>
          </div>
        </div>

        {/* Stats Grid 2x2 */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Время работы */}
          <div className="rounded-lg bg-[#0e0f14] border border-zinc-800/80 p-2.5 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-zinc-400 text-[10.5px]">
              <Clock className="w-3 h-3 text-zinc-400" />
              <span>Время работы</span>
            </div>
            <div className="text-base font-bold font-mono text-zinc-100">
              {formatDuration(animatedDuration !== null ? animatedDuration : data.duration_s)}
            </div>
          </div>

          {/* Темп в час */}
          <div className="rounded-lg bg-[#0e0f14] border border-zinc-800/80 p-2.5 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-zinc-400 text-[10.5px]">
              <Zap className="w-3 h-3 text-zinc-400" />
              <span>Темп в час</span>
            </div>
            <div className="text-base font-bold font-mono text-zinc-100">
              {animatedKillsPerHour !== null ? Math.round(animatedKillsPerHour) : data.kills_per_hour}
              <span className="text-[10px] text-zinc-500 font-normal ml-1">/ ч</span>
            </div>
          </div>

          {/* Среднее между убийствами */}
          <div className="rounded-lg bg-[#0e0f14] border border-zinc-800/80 p-2.5 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-zinc-400 text-[10.5px]">
              <Target className="w-3 h-3 text-zinc-400" />
              <span>Ср. между мобами</span>
            </div>
            <div className="text-base font-bold font-mono text-zinc-100">
              {data.avg_kill_gap_s != null && animatedAvgGap !== null ? (
                <>
                  {animatedAvgGap.toFixed(1)}
                  <span className="text-[10px] text-zinc-500 font-normal ml-1">сек</span>
                </>
              ) : (
                '—'
              )}
            </div>
          </div>

          {/* Потеряно целей */}
          <div className="rounded-lg bg-[#0e0f14] border border-zinc-800/80 p-2.5 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-zinc-400 text-[10.5px]">
              <AlertTriangle className="w-3 h-3 text-zinc-400" />
              <span>Потеряно целей</span>
            </div>
            <div className="text-base font-bold font-mono text-zinc-100">
              {animatedLost !== null ? Math.round(animatedLost) : data.lost}
            </div>
          </div>
        </div>

        {/* Footer with Close Button */}
        <div className="pt-1 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-1.5 px-3 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 text-white font-medium text-xs transition border border-zinc-600/80 shadow-[0_0_12px_rgba(255,255,255,0.08)] cursor-pointer text-center"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
