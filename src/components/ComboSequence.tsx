import React, { useState, useRef } from 'react';
import { ComboChain, ChainStep } from '../data/skillsLibrary';
import { Plus, Clock, CornerDownRight, ChevronUp, ChevronDown, RotateCcw, AlertCircle, Trash2 } from 'lucide-react';

interface Props {
  chains: ComboChain[];
  onChainsChange: (chains: ComboChain[]) => void;
  activeCasting?: { chainId: string; stepId: string } | null;
}

const MAX_CAST_SECONDS = 5;

export const ComboSequence: React.FC<Props> = ({
  chains,
  onChainsChange,
  activeCasting = null,
}) => {
  // Active Chain for vertical navigation
  const [activeChainIndex, setActiveChainIndex] = useState(0);

  // Exclamation mark tooltips hover state
  const [isPeriodicityTipHovered, setIsPeriodicityTipHovered] = useState(false);
  const [isCastTimeTipHovered, setIsCastTimeTipHovered] = useState(false);

  // Keep active index within valid bounds
  const validChainIndex = Math.min(Math.max(0, activeChainIndex), Math.max(0, chains.length - 1));

  // Vertical touch swipe handling
  const touchStartY = useRef<number | null>(null);
  const touchDeltaY = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchDeltaY.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    touchDeltaY.current = e.touches[0].clientY - touchStartY.current;
  };

  const handleTouchEnd = () => {
    if (touchStartY.current === null) return;
    const threshold = 40;
    if (touchDeltaY.current < -threshold && validChainIndex < chains.length - 1) {
      setActiveChainIndex(validChainIndex + 1);
    } else if (touchDeltaY.current > threshold && validChainIndex > 0) {
      setActiveChainIndex(validChainIndex - 1);
    }
    touchStartY.current = null;
    touchDeltaY.current = 0;
  };

  // Mouse wheel vertical navigation
  const lastWheelTime = useRef<number>(0);
  const handleWheel = (e: React.WheelEvent) => {
    if (chains.length <= 1) return;
    const now = Date.now();
    if (now - lastWheelTime.current < 450) return;
    if (Math.abs(e.deltaY) > 25) {
      if (e.deltaY > 0 && validChainIndex < chains.length - 1) {
        lastWheelTime.current = now;
        setActiveChainIndex(validChainIndex + 1);
      } else if (e.deltaY < 0 && validChainIndex > 0) {
        lastWheelTime.current = now;
        setActiveChainIndex(validChainIndex - 1);
      }
    }
  };

  // Add new chain
  const handleAddChain = () => {
    const nextOrder = chains.length + 1;
    const newChainId = `chain_${Date.now()}`;
    const previousChainId = chains.length > 0 ? chains[chains.length - 1].id : 'start';

    const newChain: ComboChain = {
      id: newChainId,
      name: `Цепочка #${nextOrder}`,
      order: nextOrder,
      cooldown: 15,
      triggerAfterChainId: previousChainId,
      steps: [
        { id: `step_${Date.now()}_1`, key: '1', cooldown: 8.0, castTimeSeconds: 0 },
        { id: `step_${Date.now()}_2`, key: '2', cooldown: 8.0, castTimeSeconds: 0 },
        { id: `step_${Date.now()}_3`, key: '3', cooldown: 8.0, castTimeSeconds: 0 },
      ]
    };

    const nextIndex = chains.length;
    onChainsChange([...chains, newChain]);
    // Allow the browser to paint the new chain in its initial offscreen position (translateY(100%)),
    // then trigger the slide transition smoothly to the new chain, identical to slide on delete/navigation!
    setTimeout(() => {
      setActiveChainIndex(nextIndex);
    }, 40);
  };

  // Remove chain
  const handleRemoveChain = (chainId: string) => {
    if (chains.length <= 1) return;
    const filtered = chains.filter(c => c.id !== chainId);
    const reordered = filtered.map((c, idx) => ({ ...c, order: idx + 1 }));
    onChainsChange(reordered);
    setActiveChainIndex(prev => Math.min(prev, Math.max(0, reordered.length - 1)));
  };

  // Update chain attributes
  const handleUpdateChain = (chainId: string, updates: Partial<ComboChain>) => {
    const updated = chains.map(c => (c.id === chainId ? { ...c, ...updates } : c));
    onChainsChange(updated);
  };

  // Add a step to chain
  const handleAddStepToChain = (chainId: string) => {
    const updated = chains.map(c => {
      if (c.id === chainId) {
        const nextIdx = c.steps.length + 1;
        const newStep: ChainStep = {
          id: `step_${Date.now()}_${nextIdx}`,
          key: '',
          cooldown: 8.0,
          castTimeSeconds: 0
        };
        return { ...c, steps: [...c.steps, newStep] };
      }
      return c;
    });
    onChainsChange(updated);
  };

  // Delete a step from chain
  const handleDeleteStep = (chainId: string, stepId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = chains.map(c => {
      if (c.id === chainId) {
        return { ...c, steps: c.steps.filter(s => s.id !== stepId) };
      }
      return c;
    });
    onChainsChange(updated);
  };

  // Update key inside a step
  const handleUpdateStepKey = (chainId: string, stepId: string, newKey: string) => {
    const updated = chains.map(c => {
      if (c.id !== chainId) return c;
      return {
        ...c,
        steps: c.steps.map(s => {
          if (s.id !== stepId) return s;
          return { ...s, key: newKey.toUpperCase() };
        })
      };
    });
    onChainsChange(updated);
  };

  // Cycle step seconds (cast / hold duration): 0s -> 1s -> 2s -> 3s -> 4s -> 5s -> 0s
  const handleCycleStepCastTime = (chainId: string, stepId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const updated = chains.map(c => {
      if (c.id !== chainId) return c;
      return {
        ...c,
        steps: c.steps.map(s => {
          if (s.id !== stepId) return s;
          const current = s.castTimeSeconds ?? 0;
          const next = current >= MAX_CAST_SECONDS ? 0 : current + 1;
          return { ...s, castTimeSeconds: next };
        })
      };
    });
    onChainsChange(updated);
  };

  // Reset steps in current chain to empty
  const handleClearAllChainSteps = (chainId: string) => {
    const updated = chains.map(c => {
      if (c.id === chainId) {
        return {
          ...c,
          steps: c.steps.map(s => ({ ...s, key: '', castTimeSeconds: 0 }))
        };
      }
      return c;
    });
    onChainsChange(updated);
  };

  return (
    <div
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="w-full max-w-[480px] mx-auto flex flex-col gap-2 relative select-none"
    >
      {/* Sliding Carousel Frame */}
      <div className="relative w-full">
        {/* Top Arrow Button: navigate up */}
        {chains.length > 1 && validChainIndex > 0 && (
          <button
            onClick={() => setActiveChainIndex(validChainIndex - 1)}
            className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center w-12 h-4 rounded-full bg-[#141722]/95 hover:bg-[#202638] text-gray-400 hover:text-white border border-[#2e374c] hover:border-gray-300 shadow-[0_4px_16px_rgba(0,0,0,0.85)] backdrop-blur-md transition cursor-pointer"
            title={`Предыдущая: ${chains[validChainIndex - 1]?.name || 'цепочка'}`}
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Bottom Arrow Button: navigate down */}
        {chains.length > 1 && validChainIndex < chains.length - 1 && (
          <button
            onClick={() => setActiveChainIndex(validChainIndex + 1)}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center w-12 h-4 rounded-full bg-[#141722]/95 hover:bg-[#202638] text-gray-400 hover:text-white border border-[#2e374c] hover:border-gray-300 shadow-[0_4px_16px_rgba(0,0,0,0.85)] backdrop-blur-md transition cursor-pointer"
            title={`Следующая: ${chains[validChainIndex + 1]?.name || 'цепочка'}`}
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Sliding Vertical Track */}
        <div className="w-full grid grid-cols-1 grid-rows-1 overflow-hidden rounded-xl">
          {chains.map((chain, chainIdx) => {
            const offset = chainIdx - validChainIndex;
            const isCurrent = offset === 0;

            return (
              <div
                key={chain.id}
                className={`w-full col-start-1 row-start-1 transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  isCurrent ? 'z-10 opacity-100 pointer-events-auto' : 'z-0 opacity-0 pointer-events-none'
                }`}
                style={{
                  transform: `translateY(${offset * 100}%)`,
                  visibility: Math.abs(offset) <= 1 ? 'visible' : 'hidden',
                }}
              >
                <div className="w-full bg-[#11131a] border border-[#232734] rounded-xl p-3 shadow-xl flex flex-col gap-2.5 relative">
                  {/* Chain Header & Parameters */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1f232e] pb-2 text-xs">
                    {/* Left: Chain Title & Order */}
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"></div>
                      <input
                        type="text"
                        value={chain.name}
                        onChange={(e) => handleUpdateChain(chain.id, { name: e.target.value })}
                        className="bg-transparent font-medium text-gray-200 text-xs hover:border-b border-gray-600 focus:border-emerald-400 outline-none px-1 py-0.5 max-w-[150px]"
                        title="Нажмите для переименования цепочки"
                      />
                      <span className="text-gray-500 font-mono text-[10px]">
                        (№ {chain.order})
                      </span>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1.5">
                      {/* Reset Steps in Chain */}
                      <button
                        onClick={() => handleClearAllChainSteps(chain.id)}
                        title="Очистить все клавиши в этой цепочке"
                        className="text-gray-500 hover:text-amber-300 p-1 rounded hover:bg-[#1a1e29] transition cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Chain (if > 1) */}
                      {chains.length > 1 && (
                        <button
                          onClick={() => handleRemoveChain(chain.id)}
                          title="Удалить эту цепочку"
                          className="text-rose-400 hover:text-rose-300 text-[11px] px-1.5 py-0.5 rounded bg-rose-950/30 hover:bg-rose-900/40 border border-rose-900/40 transition cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Flow Trigger & Periodicity Settings */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] bg-[#0c0d12] p-1.5 rounded-lg border border-[#1b1e28]">
                    {/* Execution Trigger */}
                    <div className="flex items-center gap-1 text-gray-400">
                      <CornerDownRight className="w-3 h-3 text-gray-500 shrink-0" />
                      <span className="text-[10px]">Пуск:</span>
                      <select
                        value={chain.triggerAfterChainId}
                        onChange={(e) => handleUpdateChain(chain.id, { triggerAfterChainId: e.target.value })}
                        className="bg-[#141720] text-gray-200 px-1.5 py-0.5 rounded border border-[#2a2f3e] outline-none text-[11px] cursor-pointer focus:border-emerald-500"
                      >
                        <option value="start">Сразу (в начале)</option>
                        {chains
                          .filter(c => c.id !== chain.id)
                          .map(c => (
                            <option key={c.id} value={c.id}>
                              После {c.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Periodicity (Cooldown) */}
                    <div className="flex items-center gap-1 text-gray-400">
                      <Clock className="w-3 h-3 text-gray-500 shrink-0" />
                      <span className="text-[10px]">Период:</span>
                      <div className="bg-[#141720] border border-[#2a2f3e] focus-within:border-amber-400/80 rounded px-1 py-0.5">
                        <input
                          type="number"
                          step="1"
                          min="0"
                          max="300"
                          value={chain.cooldown ?? 0}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            handleUpdateChain(chain.id, { cooldown: val });
                          }}
                          className="w-7 bg-transparent text-gray-100 text-[11px] font-mono outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                      <span className="text-[10px] text-gray-500">с</span>

                      {/* Exclamation 1: Periodicity */}
                      <div
                        onMouseEnter={() => setIsPeriodicityTipHovered(true)}
                        onMouseLeave={() => setIsPeriodicityTipHovered(false)}
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center cursor-help transition ${
                          isPeriodicityTipHovered
                            ? 'text-amber-300 bg-amber-400/20 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                            : 'text-amber-400/80 hover:text-amber-300'
                        }`}
                        title="Подсказка о периодичности"
                      >
                        <AlertCircle className="w-3.5 h-3.5 stroke-[2.2]" />
                      </div>

                      {/* Exclamation 2: Cast Seconds */}
                      <div
                        onMouseEnter={() => setIsCastTimeTipHovered(true)}
                        onMouseLeave={() => setIsCastTimeTipHovered(false)}
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center cursor-help transition ${
                          isCastTimeTipHovered
                            ? 'text-amber-300 bg-amber-400/20 shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                            : 'text-amber-400/80 hover:text-amber-300'
                        }`}
                        title="Время каста спела в секундах"
                      >
                        <AlertCircle className="w-3.5 h-3.5 stroke-[2.2]" />
                      </div>
                    </div>
                  </div>

                  {/* Chain Steps Squares - Small & Compact Keycaps with Glowing Effect */}
                  <div className="flex items-center justify-between gap-2 w-full pt-1 relative min-h-[46px]">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {chain.steps.map((step, idx) => {
                        const isCasting = activeCasting?.chainId === chain.id && activeCasting?.stepId === step.id;
                        const hasKey = Boolean(step.key && step.key.trim().length > 0);
                        const castSec = step.castTimeSeconds ?? 0;

                        return (
                          <div
                            key={step.id}
                            className={`w-[44px] h-[44px] rounded-lg p-0.5 relative flex flex-col items-center justify-center select-none group transition-all duration-200 shrink-0 ${
                              isCasting
                                ? 'ring-2 ring-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.85)] scale-105 bg-[#17251d] z-20'
                                : 'bg-[#141620] border border-[#272c3d] hover:border-emerald-400 hover:shadow-[0_0_14px_rgba(52,211,153,0.45)] hover:bg-[#191d2a]'
                            }`}
                            style={{
                              boxShadow: isCasting
                                ? '0 0 16px rgba(52,211,153,0.6), inset 0 1px 0 rgba(255,255,255,0.1)'
                                : 'inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 4px rgba(0,0,0,0.5)',
                            }}
                          >
                            {/* Step Index number in top-left */}
                            <div className="absolute top-0.5 left-1 z-10 text-[8px] font-mono text-gray-500 pointer-events-none group-hover:text-gray-400">
                              {idx + 1}
                            </div>

                            {/* Delete Step button in top-right (on hover) */}
                            {chain.steps.length > 1 && (
                              <button
                                onClick={(e) => handleDeleteStep(chain.id, step.id, e)}
                                title="Удалить этот шаг"
                                className="absolute -top-1 -right-1 z-30 w-3.5 h-3.5 rounded-full bg-[#1e2230] hover:bg-rose-700 text-gray-400 hover:text-white text-[8px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow border border-white/10"
                              >
                                ✕
                              </button>
                            )}

                            {/* Editable Key Input inside the square */}
                            <input
                              type="text"
                              maxLength={5}
                              value={step.key || ''}
                              placeholder="+"
                              onChange={(e) => handleUpdateStepKey(chain.id, step.id, e.target.value)}
                              className="w-full text-center bg-transparent font-mono font-bold text-xs uppercase text-gray-100 group-hover:text-emerald-300 placeholder-gray-600 outline-none cursor-text transition-colors tracking-wide py-0.5"
                              title="Впишите сюда клавишу (например: 1, 2, Q, E, R, F, Shift+Q)"
                            />

                            {/* Seconds badge (Система секунд из кнопок) - Bottom Right Corner */}
                            <button
                              type="button"
                              onClick={(e) => handleCycleStepCastTime(chain.id, step.id, e)}
                              title="Время удержания/каста (клик: 0s → 1s → 2s → 3s → 4s → 5s → 0s)"
                              className={`absolute bottom-0.5 right-0.5 z-20 px-1 py-0.2 rounded font-mono font-bold text-[8px] flex items-center justify-center transition-all cursor-pointer select-none active:scale-95 ${
                                castSec > 0
                                  ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-[0_0_6px_rgba(245,158,11,0.5)]'
                                  : 'text-gray-600 hover:text-gray-300 hover:bg-white/10'
                              }`}
                            >
                              {castSec > 0 ? `${castSec}s` : '0s'}
                            </button>
                          </div>
                        );
                      })}

                      {/* Add Step '+' button */}
                      <button
                        onClick={() => handleAddStepToChain(chain.id)}
                        title="Добавить шаг в комбинацию"
                        className="w-[44px] h-[44px] rounded-lg border border-dashed border-[#2b3040] hover:border-emerald-400 hover:text-emerald-300 hover:bg-[#151924] hover:shadow-[0_0_12px_rgba(52,211,153,0.35)] transition flex items-center justify-center text-gray-500 cursor-pointer shrink-0 group"
                      >
                        <Plus className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                      </button>
                    </div>

                    {/* Notification Box in the red-circled empty area on the right */}
                    {(isPeriodicityTipHovered || isCastTimeTipHovered) && (
                      <div className="absolute right-0 bottom-0 z-30 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                        <div className="w-[220px] sm:w-[235px] h-[46px] px-2.5 py-1 rounded-xl bg-[#141824]/95 border border-amber-400/80 text-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.85),0_0_12px_rgba(245,158,11,0.25)] backdrop-blur-md flex flex-col justify-center">
                          {isPeriodicityTipHovered ? (
                            <>
                              <div className="flex items-center gap-1.5 leading-none mb-1">
                                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-mono font-bold text-[9px] border border-amber-400/40">
                                  CD
                                </span>
                                <span className="font-semibold text-amber-300 text-[11px] truncate">
                                  Периодичность
                                </span>
                              </div>
                              <p className="text-[9.5px] leading-tight text-gray-200 font-normal truncate">
                                Откат самого долгого умения цепочки.
                              </p>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-1.5 leading-none mb-1">
                                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-mono font-bold text-[9px] border border-amber-400/40">
                                  0s...5s
                                </span>
                                <span className="font-semibold text-amber-300 text-[11px] truncate">
                                  Время каста
                                </span>
                              </div>
                              <p className="text-[9.5px] leading-tight text-gray-200 font-normal truncate">
                                Время каста спела в секундах
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom controls: Add new chain & chain counter */}
      <div className="flex items-center justify-between px-1 text-xs text-gray-500">
        <button
          onClick={handleAddChain}
          className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-emerald-300 transition cursor-pointer py-0.5 px-1.5 rounded hover:bg-[#151822] border border-transparent hover:border-[#272c3d]"
          title="Создать ещё одну цепочку комбинаций"
        >
          <Plus className="w-3 h-3 text-emerald-400" />
          <span>Добавить цепочку</span>
        </button>

        <span className="text-[10px] font-mono text-gray-500">
          Цепочка {validChainIndex + 1} из {chains.length}
        </span>
      </div>
    </div>
  );
};
