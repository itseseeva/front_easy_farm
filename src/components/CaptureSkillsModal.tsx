import React, { useEffect, useState } from 'react';
import { CaptureSkillsResponse, CaptureSkillsSlot } from '../types';
import { Check, RefreshCw, X, Camera } from 'lucide-react';

interface CaptureSkillsModalProps {
  isOpen: boolean;
  result: CaptureSkillsResponse | null;
  onClose: () => void;
  onRetry: () => void;
  isLoading?: boolean;
}

interface SkillTileProps {
  slot: CaptureSkillsSlot;
}

const SkillTile: React.FC<SkillTileProps> = ({ slot }) => {
  const [isHovered, setIsHovered] = useState(false);

  const rawKey = slot?.key != null ? String(slot.key) : '';
  const displayKey = rawKey.toUpperCase();
  const brightness = slot?.brightness != null ? slot.brightness : '—';
  const status = slot?.status || (slot?.ok ? 'ok' : 'проверь');
  const tooltipText = `Клавиша ${displayKey || '?'} · яркость ${brightness} · ${status}`;
  const isOk = Boolean(slot?.ok);

  return (
    <div
      className="relative flex flex-col items-center select-none group w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Square Tile: responsive aspect-ratio 1:1, max 44px, min 26px */}
      <div
        className={`w-full aspect-square max-w-[44px] rounded-lg p-0.5 relative flex items-center justify-center transition-all duration-200 cursor-pointer overflow-hidden ${
          isOk
            ? 'border border-emerald-500/80 bg-[#090d0b] shadow-[0_0_10px_rgba(16,185,129,0.18)] hover:border-emerald-400 hover:shadow-[0_0_16px_rgba(16,185,129,0.35)]'
            : 'border border-amber-400 bg-[#161208] shadow-[0_0_12px_rgba(251,191,36,0.25)] animate-pulse hover:border-amber-300'
        }`}
      >
        {/* Real Skill Icon */}
        {slot?.icon_png ? (
          <img
            src={slot.icon_png}
            alt={`Слот ${displayKey}`}
            className="w-full h-full object-cover rounded-[6px]"
            style={{ imageRendering: 'pixelated' }}
            onError={(e) => {
              // Hide broken image and fall back to key text
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <div
            className={`w-full h-full rounded-[6px] flex items-center justify-center font-mono font-bold text-xs ${
              isOk ? 'bg-emerald-950/60 text-emerald-200' : 'bg-amber-950/70 text-amber-200'
            }`}
          >
            {displayKey}
          </div>
        )}

        {/* Status Badge in Top-Right Corner */}
        <div
          className={`absolute top-0.5 right-0.5 z-10 w-3 h-3 rounded-full flex items-center justify-center shadow-md ${
            isOk
              ? 'bg-emerald-500 text-black shadow-[0_0_8px_rgba(16,185,129,0.7)]'
              : 'bg-amber-400 text-black shadow-[0_0_8px_rgba(251,191,36,0.8)]'
          }`}
        >
          {isOk ? (
            <Check className="w-2 h-2 stroke-[3]" />
          ) : (
            <span className="font-bold text-[8px] leading-none">!</span>
          )}
        </div>
      </div>

      {/* Monospace Key Label Below the Tile - 11px font */}
      <span
        className={`mt-1 font-mono text-[11px] font-bold tracking-wider leading-none text-center truncate w-full transition-colors ${
          isOk
            ? 'text-zinc-300 group-hover:text-white'
            : 'text-amber-300 group-hover:text-amber-200'
        }`}
      >
        {displayKey}
      </span>

      {/* Hover Tooltip: «Клавиша 5 · яркость 48 · тёмный: пустой или откат?» */}
      {isHovered && (
        <div className="absolute bottom-full mb-2 z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-150 whitespace-nowrap">
          <div className="px-2.5 py-1.5 rounded-lg bg-[#0c0d12]/98 border border-zinc-700 text-zinc-100 shadow-[0_8px_25px_rgba(0,0,0,0.95),0_0_12px_rgba(255,255,255,0.1)] backdrop-blur-md flex items-center gap-1.5 text-xs">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                isOk ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'
              }`}
            />
            <span className="font-mono text-[11.5px] leading-none">{tooltipText}</span>
          </div>
          {/* Tooltip triangle arrow */}
          <div className="w-2 h-2 bg-[#0c0d12] border-r border-b border-zinc-700 rotate-45 mx-auto -mt-1" />
        </div>
      )}
    </div>
  );
};

export const CaptureSkillsModal: React.FC<CaptureSkillsModalProps> = ({
  isOpen,
  result,
  onClose,
  onRetry,
  isLoading = false,
}) => {
  // Esc key closes modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen || !result) return null;

  // Show all slots from backend response except row === "top"
  const rawSlots = Array.isArray(result.slots) ? result.slots : [];
  const visibleSlots = rawSlots.filter((s) => s?.row !== 'top');

  const totalSlots = visibleSlots.length;
  const okSlotsCount = visibleSlots.filter((s) => Boolean(s?.ok)).length;
  const issueSlotsCount = totalSlots - okSlotsCount;
  const isOkResult = Boolean(result.ok);
  const allOk = isOkResult && totalSlots > 0 && issueSlotsCount === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150 overflow-hidden"
      onClick={() => {
        if (!isLoading) onClose();
      }}
    >
      <div
        className="w-full max-w-[560px] h-auto max-h-[calc(100vh-16px)] sm:max-h-[calc(100vh-32px)] bg-[#09090d] border border-zinc-800/90 rounded-2xl p-3 sm:p-4 shadow-[0_20px_60px_rgba(0,0,0,0.98),0_0_30px_rgba(255,255,255,0.03)] flex flex-col text-zinc-200 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Fixed & Never cut off */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-zinc-800/90 border border-zinc-700/80 flex items-center justify-center text-zinc-200 shrink-0 shadow-sm">
              <Camera className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-semibold text-white tracking-wide truncate">
                Снимки скиллов
              </h2>
              <span className="text-[10px] sm:text-[10.5px] text-zinc-400 block truncate">
                {result.message || (isOkResult ? 'Снимки сохранены' : 'Ошибка при съемке')}
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition cursor-pointer disabled:opacity-40 shrink-0 ml-2"
            title="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0 overflow-y-auto py-2.5 sm:py-3 flex flex-col gap-2.5 sm:gap-3 pr-0.5">
          {/* Summary Line: «Снято N из N» (зелёным) или «M в порядке, K проверь» (жёлтым) + подсказка */}
          <div
            className={`rounded-xl px-3 py-2 border flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 shrink-0 ${
              allOk
                ? 'bg-[#09130d] border-emerald-900/60 shadow-[0_0_15px_rgba(16,185,129,0.08)]'
                : 'bg-[#181308] border-amber-900/70 shadow-[0_0_15px_rgba(251,191,36,0.1)]'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  allOk
                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                    : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                }`}
              />
              <span
                className={`text-xs font-semibold tracking-wide ${
                  allOk ? 'text-emerald-300' : 'text-amber-300'
                }`}
              >
                {allOk
                  ? `Снято ${totalSlots} из ${totalSlots}`
                  : `${okSlotsCount} в порядке, ${issueSlotsCount} проверь`}
              </span>
            </div>

            {!allOk && (
              <span className="text-[10.5px] text-amber-200/90 leading-tight">
                Если на отмеченных цифры отката — подожди и сними ещё раз
              </span>
            )}
          </div>

          {/* In-Game Style Skill Bar Frame - All slots in one row in backend order */}
          <div
            className="w-full bg-[#050608] border border-zinc-800/90 rounded-xl py-3 px-2 sm:px-3 flex flex-col items-center justify-center shadow-inner overflow-hidden"
          >
            {visibleSlots.length > 0 ? (
              <div className="w-full flex items-center justify-center overflow-hidden select-none">
                <div
                  className="grid items-center justify-center gap-1 sm:gap-1.5 w-full max-w-[520px]"
                  style={{
                    gridTemplateColumns: `repeat(${Math.max(1, visibleSlots.length)}, minmax(0, 1fr))`,
                  }}
                >
                  {visibleSlots.map((slot, idx) => (
                    <SkillTile key={`slot-${slot.key}-${idx}`} slot={slot} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-6 px-3 text-center text-xs text-zinc-400">
                {result.message || 'Снимки скиллов не найдены. Нажмите «Снять ещё раз».'}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons - Always visible and pinned to bottom */}
        <div className="pt-2.5 border-t border-zinc-800/80 flex items-center justify-between gap-2.5 shrink-0 bg-[#09090d]">
          <button
            type="button"
            disabled={isLoading}
            onClick={onRetry}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-lg text-xs font-medium bg-[#14151d] hover:bg-[#1e1f2b] text-zinc-200 border border-zinc-700/80 transition cursor-pointer disabled:opacity-50 active:scale-95 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Снять ещё раз</span>
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="px-4 sm:px-5 py-1.5 sm:py-2 rounded-lg text-xs font-semibold bg-zinc-200 hover:bg-white text-black transition shadow-[0_0_14px_rgba(255,255,255,0.25)] cursor-pointer disabled:opacity-50 active:scale-95"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};
