import React, { useState, useRef, useEffect } from 'react';
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

  // Active step being configured in modal
  const [editingStep, setEditingStep] = useState<{ chainId: string; stepId: string } | null>(null);

  // Draft step state for modal editing
  const [draftStep, setDraftStep] = useState<{
    key: string;
    actionType: string;
    castTimeSeconds: number;
    independent: boolean;
    skillCooldownSeconds: number;
  }>({
    key: '',
    actionType: 'press',
    castTimeSeconds: 0,
    independent: false,
    skillCooldownSeconds: 6,
  });

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
        { id: `step_${Date.now()}_1`, key: '1', cooldown: 8.0, castTimeSeconds: 0, repeatCount: 1 },
        { id: `step_${Date.now()}_2`, key: '2', cooldown: 8.0, castTimeSeconds: 0, repeatCount: 1 },
        { id: `step_${Date.now()}_3`, key: '3', cooldown: 8.0, castTimeSeconds: 0, repeatCount: 1 },
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
          castTimeSeconds: 0,
          repeatCount: 1,
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

  // Update step arbitrary fields (independent, skillCooldownSeconds, etc.)
  const handleUpdateStep = (chainId: string, stepId: string, updates: Partial<ChainStep>) => {
    const updated = chains.map(c => {
      if (c.id !== chainId) return c;
      return {
        ...c,
        steps: c.steps.map(s => (s.id === stepId ? { ...s, ...updates } : s))
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

  // Cycle step multiplier (number of repeated sequential presses): 1 -> 2 -> 3 -> 1
  const MAX_REPEAT = 3;
  const handleCycleStepRepeat = (chainId: string, stepId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const updated = chains.map(c => {
      if (c.id !== chainId) return c;
      return {
        ...c,
        steps: c.steps.map(s => {
          if (s.id !== stepId) return s;
          const current = s.repeatCount ?? 1;
          const next = current >= MAX_REPEAT ? 1 : current + 1;
          return { ...s, repeatCount: next };
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
          steps: c.steps.map(s => ({ ...s, key: '', castTimeSeconds: 0, repeatCount: 1 }))
        };
      }
      return c;
    });
    onChainsChange(updated);
  };

  // Target step data for the step editor modal
  const editingChain = chains.find(c => c.id === editingStep?.chainId);
  const editingStepData = editingChain?.steps.find(s => s.id === editingStep?.stepId);
  const editingStepIndex = editingChain ? editingChain.steps.findIndex(s => s.id === editingStep?.stepId) : -1;

  // Sync draft state whenever a step is selected for editing
  useEffect(() => {
    if (editingStep && editingStepData) {
      setDraftStep({
        key: editingStepData.key || '',
        actionType: editingStepData.actionType || 'press',
        castTimeSeconds: editingStepData.castTimeSeconds ?? 0,
        independent: Boolean(editingStepData.independent),
        skillCooldownSeconds: editingStepData.skillCooldownSeconds ?? 6,
      });
    }
  }, [editingStep?.chainId, editingStep?.stepId]);

  // Close modal on Escape key
  useEffect(() => {
    if (!editingStep) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditingStep(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingStep]);

  // Commit changes from draft to active chain
  const handleSaveStep = () => {
    if (!editingStep) return;
    handleUpdateStep(editingStep.chainId, editingStep.stepId, {
      key: draftStep.key.toUpperCase(),
      actionType: draftStep.actionType,
      castTimeSeconds: draftStep.castTimeSeconds,
      independent: draftStep.independent,
      skillCooldownSeconds: draftStep.independent ? (draftStep.skillCooldownSeconds || 6) : undefined,
    });
    setEditingStep(null);
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
            className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center w-12 h-4 rounded-full bg-[#0c0c11]/95 hover:bg-[#1a1a24] text-zinc-400 hover:text-white border border-zinc-700/80 hover:border-zinc-400 shadow-[0_4px_16px_rgba(0,0,0,0.9),0_0_10px_rgba(255,255,255,0.12)] backdrop-blur-md transition cursor-pointer"
            title={`Предыдущая: ${chains[validChainIndex - 1]?.name || 'цепочка'}`}
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Bottom Arrow Button: navigate down */}
        {chains.length > 1 && validChainIndex < chains.length - 1 && (
          <button
            onClick={() => setActiveChainIndex(validChainIndex + 1)}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center w-12 h-4 rounded-full bg-[#0c0c11]/95 hover:bg-[#1a1a24] text-zinc-400 hover:text-white border border-zinc-700/80 hover:border-zinc-400 shadow-[0_4px_16px_rgba(0,0,0,0.9),0_0_10px_rgba(255,255,255,0.12)] backdrop-blur-md transition cursor-pointer"
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
                <div className="w-full bg-[#08080c] border border-zinc-800/90 rounded-xl p-3 shadow-[0_6px_25px_rgba(0,0,0,0.95)] flex flex-col gap-2.5 relative">
                  {/* Chain Header & Parameters */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-2 text-xs">
                    {/* Left: Chain Title & Order */}
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-200 shadow-[0_0_8px_rgba(255,255,255,0.85)]"></div>
                      <input
                        type="text"
                        value={chain.name}
                        onChange={(e) => handleUpdateChain(chain.id, { name: e.target.value })}
                        className="bg-transparent font-medium text-zinc-100 text-xs hover:border-b border-zinc-600 focus:border-zinc-300 outline-none px-1 py-0.5 max-w-[150px]"
                        title="Нажмите для переименования цепочки"
                      />
                      <span className="text-zinc-500 font-mono text-[10px]">
                        (№ {chain.order})
                      </span>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1.5">
                      {/* Reset Steps in Chain */}
                      <button
                        onClick={() => handleClearAllChainSteps(chain.id)}
                        title="Очистить все клавиши в этой цепочке"
                        className="text-zinc-400 hover:text-white hover:bg-zinc-800/70 hover:shadow-[0_0_10px_rgba(255,255,255,0.15)] p-1 rounded transition cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Chain (if > 1) */}
                      {chains.length > 1 && (
                        <button
                          onClick={() => handleRemoveChain(chain.id)}
                          title="Удалить эту цепочку"
                          className="text-zinc-400 hover:text-zinc-200 text-[11px] px-1.5 py-0.5 rounded bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-600 transition cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Flow Trigger & Periodicity Settings */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] bg-[#040406] p-1.5 rounded-lg border border-zinc-800/80">
                    {/* Execution Trigger */}
                    <div className="flex items-center gap-1 text-zinc-400">
                      <CornerDownRight className="w-3 h-3 text-zinc-500 shrink-0" />
                      <span className="text-[10px]">Пуск:</span>
                      <select
                        value={chain.triggerAfterChainId}
                        onChange={(e) => handleUpdateChain(chain.id, { triggerAfterChainId: e.target.value })}
                        className="bg-[#0e0e14] text-zinc-200 px-1.5 py-0.5 rounded border border-zinc-700/80 outline-none text-[11px] cursor-pointer focus:border-zinc-400"
                      >
                        <option value="start">Сразу (в начале)</option>
                        <option value="always">Постоянно</option>
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
                    <div className="flex items-center gap-1 text-zinc-400">
                      <Clock className="w-3 h-3 text-zinc-500 shrink-0" />
                      <span className="text-[10px]">Период:</span>
                      <div className="bg-[#0e0e14] border border-zinc-700/80 focus-within:border-zinc-400 rounded px-1 py-0.5 shadow-inner">
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
                          className="w-7 bg-transparent text-zinc-100 text-[11px] font-mono outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                      <span className="text-[10px] text-zinc-500">с</span>

                      {/* Exclamation 1: Periodicity */}
                      <div
                        onMouseEnter={() => setIsPeriodicityTipHovered(true)}
                        onMouseLeave={() => setIsPeriodicityTipHovered(false)}
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center cursor-help transition ${
                          isPeriodicityTipHovered
                            ? 'text-white bg-zinc-800/90 shadow-[0_0_10px_rgba(255,255,255,0.5)] scale-110'
                            : 'text-zinc-400/80 hover:text-white'
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
                            ? 'text-white bg-zinc-800/90 shadow-[0_0_10px_rgba(255,255,255,0.5)] scale-110'
                            : 'text-zinc-400/80 hover:text-white'
                        }`}
                        title="Время каста спела в секундах"
                      >
                        <AlertCircle className="w-3.5 h-3.5 stroke-[2.2]" />
                      </div>
                    </div>
                  </div>

                  {/* Chain Steps Squares - Small & Compact Keycaps with Grey Glowing Effect */}
                  <div className="flex items-center justify-between gap-2 w-full pt-1 relative min-h-[46px]">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {chain.steps.map((step, idx) => {
                        const isCasting = activeCasting?.chainId === chain.id && activeCasting?.stepId === step.id;
                        const castSec = step.castTimeSeconds ?? 0;
                        const isIndependent = Boolean(step.independent);
                        const skillCd = step.skillCooldownSeconds ?? 6;

                        return (
                          <div
                            key={step.id}
                            className={`w-[46px] h-[46px] rounded-lg p-0.5 relative flex flex-col items-center justify-center select-none group transition-all duration-200 shrink-0 ${
                              isCasting
                                ? 'ring-2 ring-zinc-200 shadow-[0_0_22px_rgba(255,255,255,0.85)] scale-105 bg-[#22222d] z-20'
                                : isIndependent
                                ? 'bg-[#0b0f16] border border-cyan-800/80 shadow-[0_0_10px_rgba(6,182,212,0.18)] hover:border-cyan-400 hover:bg-[#101722]'
                                : 'bg-[#0d0d12] border border-zinc-800/90 hover:border-zinc-400 hover:shadow-[0_0_16px_rgba(220,225,235,0.4)] hover:bg-[#161622]'
                            }`}
                            style={{
                              boxShadow: isCasting
                                ? '0 0 18px rgba(255,255,255,0.65), inset 0 1px 0 rgba(255,255,255,0.2)'
                                : isIndependent
                                ? 'inset 0 1px 0 rgba(6,182,212,0.15), 0 2px 6px rgba(0,0,0,0.85)'
                                : 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 5px rgba(0,0,0,0.8)',
                            }}
                          >
                            {/* Step Index number in top-left */}
                            <div className="absolute top-0.5 left-1 z-10 text-[8px] font-mono text-zinc-500 pointer-events-none group-hover:text-zinc-300">
                              {idx + 1}
                            </div>

                            {/* Delete Step button in top-right (on hover) */}
                            {chain.steps.length > 1 && (
                              <button
                                onClick={(e) => handleDeleteStep(chain.id, step.id, e)}
                                title="Удалить этот шаг"
                                className="absolute -top-1 -right-1 z-30 w-3.5 h-3.5 rounded-full bg-[#181822] hover:bg-zinc-700 text-zinc-400 hover:text-white text-[8px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow border border-zinc-600 cursor-pointer"
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
                              className="w-full text-center bg-transparent font-mono font-bold text-xs uppercase text-zinc-100 group-hover:text-white group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] placeholder-zinc-700 outline-none cursor-text transition-colors tracking-wide py-0.5"
                              title="Впишите сюда клавишу (например: 1, 2, Q, E, R, F, Shift+Q)"
                            />

                            {/* Independent CD badge (⏱6с) - Bottom Left Corner */}
                            {isIndependent ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingStep({ chainId: chain.id, stepId: step.id });
                                }}
                                title={`Жать по своему КД: ${skillCd}с (нажмите для настройки)`}
                                className="absolute bottom-0.5 left-0.5 z-20 px-1 py-0.2 rounded font-mono font-bold text-[7.5px] leading-tight flex items-center gap-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-600 shadow-[0_0_8px_rgba(255,255,255,0.15)] cursor-pointer transition select-none active:scale-95"
                              >
                                <span>⏱</span>
                                <span>{skillCd}с</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingStep({ chainId: chain.id, stepId: step.id });
                                }}
                                title="Настроить шаг: Жать по своему КД"
                                className="absolute bottom-0.5 left-0.5 z-20 px-0.8 py-0.2 rounded font-mono text-[7.5px] leading-tight flex items-center text-zinc-600 hover:text-zinc-200 hover:bg-zinc-800 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                              >
                                ⏱
                              </button>
                            )}

                            {/* Seconds badge (Система секунд из кнопок) - Bottom Right Corner */}
                            <button
                              type="button"
                              onClick={(e) => handleCycleStepCastTime(chain.id, step.id, e)}
                              onMouseEnter={() => setIsCastTimeTipHovered(true)}
                              onMouseLeave={() => setIsCastTimeTipHovered(false)}
                              title="Время каста спела в секундах (клик: 0s → 1s → 2s → 3s → 4s → 5s → 0s)"
                              className={`absolute bottom-0.5 right-0.5 z-20 px-1 py-0.2 rounded font-mono font-bold text-[8px] flex items-center justify-center transition-all cursor-pointer select-none active:scale-95 ${
                                castSec > 0
                                  ? 'bg-zinc-700/80 text-zinc-100 border border-zinc-500 shadow-[0_0_10px_rgba(255,255,255,0.4)]'
                                  : 'text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800'
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
                        className="w-[46px] h-[46px] rounded-lg border border-dashed border-zinc-800 hover:border-zinc-400 hover:text-white hover:bg-[#14141c] hover:shadow-[0_0_16px_rgba(255,255,255,0.3)] transition flex items-center justify-center text-zinc-500 cursor-pointer shrink-0 group"
                      >
                        <Plus className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                      </button>
                    </div>

                    {/* Notification Box in the red-circled empty area on the right */}
                    {(isPeriodicityTipHovered || isCastTimeTipHovered) && (
                      <div className="absolute right-0 bottom-0 z-30 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                        <div className="w-[220px] sm:w-[235px] h-[46px] px-2.5 py-1 rounded-xl bg-[#0b0b10]/98 border border-zinc-600 text-zinc-100 shadow-[0_8px_30px_rgba(0,0,0,0.95),0_0_16px_rgba(255,255,255,0.16)] backdrop-blur-md flex flex-col justify-center">
                          {isPeriodicityTipHovered ? (
                            <>
                              <div className="flex items-center gap-1.5 leading-none mb-1">
                                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-zinc-800/90 text-zinc-100 font-mono font-bold text-[9px] border border-zinc-600 shadow-[0_0_6px_rgba(255,255,255,0.12)]">
                                  CD
                                </span>
                                <span className="font-semibold text-zinc-100 text-[11px] truncate drop-shadow-[0_0_6px_rgba(255,255,255,0.2)]">
                                  Периодичность
                                </span>
                              </div>
                              <p className="text-[9.5px] leading-tight text-zinc-300 font-normal truncate">
                                Откат самого долгого умения цепочки.
                              </p>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-1.5 leading-none mb-1">
                                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-zinc-800/90 text-zinc-100 font-mono font-bold text-[9px] border border-zinc-600 shadow-[0_0_6px_rgba(255,255,255,0.12)]">
                                  0s...5s
                                </span>
                                <span className="font-semibold text-zinc-100 text-[11px] truncate drop-shadow-[0_0_6px_rgba(255,255,255,0.2)]">
                                  Время каста
                                </span>
                              </div>
                              <p className="text-[9.5px] leading-tight text-zinc-300 font-normal truncate">
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
      <div className="flex items-center justify-between px-1 text-xs text-zinc-500">
        <button
          onClick={handleAddChain}
          className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition cursor-pointer py-0.5 px-1.5 rounded hover:bg-[#121218] border border-transparent hover:border-zinc-700 hover:shadow-[0_0_10px_rgba(255,255,255,0.12)]"
          title="Создать ещё одну цепочку комбинаций"
        >
          <Plus className="w-3 h-3 text-zinc-300" />
          <span>Добавить цепочку</span>
        </button>

        <span className="text-[10px] font-mono text-zinc-500">
          Цепочка {validChainIndex + 1} из {chains.length}
        </span>
      </div>

      {/* Step Settings Modal: Compact & Adaptive «Редактор шага» */}
      {editingStep && editingStepData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-3 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setEditingStep(null)}
        >
          <div
            className="w-full max-w-[280px] sm:max-w-[300px] max-h-[min(520px,90vh)] overflow-y-auto bg-[#0a0b10] border border-zinc-700/80 rounded-xl p-3 shadow-[0_16px_40px_rgba(0,0,0,0.95),0_0_20px_rgba(255,255,255,0.05)] flex flex-col gap-2 text-zinc-200 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 shadow-[0_0_6px_rgba(255,255,255,0.4)] shrink-0"></span>
                <span className="font-semibold text-[11px] text-white truncate">
                  Редактор шага #{editingStepIndex + 1}
                </span>
                <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-100 font-mono font-bold text-[9.5px] border border-zinc-700/80 shrink-0">
                  [{draftStep.key || '—'}]
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingStep(null)}
                className="text-zinc-500 hover:text-white p-0.5 rounded transition text-xs cursor-pointer shrink-0"
                title="Закрыть"
              >
                ✕
              </button>
            </div>

            {/* Тип действия */}
            <div className="flex items-center justify-between gap-2 bg-[#06070a]/90 px-2 py-1.5 rounded-lg border border-zinc-800/80">
              <label className="text-[10px] text-zinc-400 font-medium shrink-0">
                Тип действия
              </label>
              <select
                value={draftStep.actionType}
                onChange={(e) => setDraftStep(prev => ({ ...prev, actionType: e.target.value }))}
                className="bg-[#12131b] text-zinc-200 text-[10.5px] px-2 py-1 rounded-md border border-zinc-700/80 outline-none cursor-pointer focus:border-zinc-400 max-w-[150px] truncate"
              >
                <option value="press">Нажатие клавиши</option>
                <option value="hold">Зажатие клавиши</option>
              </select>
            </div>

            {/* Время каста (сек) */}
            <div className="flex items-center justify-between gap-2 bg-[#06070a]/90 px-2 py-1.5 rounded-lg border border-zinc-800/80">
              <label className="text-[10px] text-zinc-400 font-medium shrink-0">
                Время каста (сек)
              </label>
              <input
                type="number"
                min="0"
                max="5"
                step="1"
                value={draftStep.castTimeSeconds}
                onChange={(e) => {
                  const val = Math.min(5, Math.max(0, parseInt(e.target.value) || 0));
                  setDraftStep(prev => ({ ...prev, castTimeSeconds: val }));
                }}
                className="w-14 bg-[#12131b] text-zinc-100 font-mono font-bold text-[11px] px-2 py-0.5 rounded-md border border-zinc-700/80 outline-none text-center focus:border-zinc-400"
              />
            </div>

            {/* Условие запуска */}
            <div className="flex items-center justify-between gap-2 bg-[#06070a]/90 px-2 py-1.5 rounded-lg border border-zinc-800/80">
              <label className="text-[10px] text-zinc-400 font-medium shrink-0">
                Условие запуска
              </label>
              <select
                value={draftStep.independent ? 'always' : 'queue'}
                onChange={(e) => {
                  const isAlways = e.target.value === 'always';
                  setDraftStep(prev => ({
                    ...prev,
                    independent: isAlways,
                    skillCooldownSeconds: isAlways ? (prev.skillCooldownSeconds || 6) : prev.skillCooldownSeconds
                  }));
                }}
                className="bg-[#12131b] text-zinc-200 text-[10.5px] px-2 py-1 rounded-md border border-zinc-700/80 outline-none cursor-pointer focus:border-zinc-400 max-w-[150px] truncate"
              >
                <option value="queue">Обычный (в очереди)</option>
                <option value="always">Постоянно</option>
              </select>
            </div>

            {/* Свое КД умения (сек) - когда выбрано «Постоянно» */}
            {draftStep.independent && (
              <div className="flex flex-col gap-1.5 bg-[#06070a]/90 p-2 rounded-lg border border-zinc-700/80 shadow-[inset_0_0_10px_rgba(255,255,255,0.02)] animate-in fade-in duration-100">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[10px] text-zinc-300 font-medium shrink-0">
                    Свое КД умения (сек)
                  </label>
                  <div className="flex items-center gap-1 bg-[#12131b] px-1.5 py-0.5 rounded-md border border-zinc-700/80 focus-within:border-zinc-400">
                    <input
                      type="number"
                      min="1"
                      max="300"
                      step="1"
                      value={draftStep.skillCooldownSeconds}
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value) || 1);
                        setDraftStep(prev => ({ ...prev, skillCooldownSeconds: val }));
                      }}
                      className="w-10 bg-transparent text-center font-mono font-bold text-[11px] text-zinc-100 outline-none"
                    />
                    <span className="text-[9px] text-zinc-400 font-mono">сек</span>
                  </div>
                </div>

                {/* Быстрые кнопки пресетов */}
                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                  <span className="text-[9px] text-zinc-500">Быстро:</span>
                  {[3, 6, 8, 12, 15, 20, 24].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setDraftStep(prev => ({ ...prev, skillCooldownSeconds: sec }))}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition cursor-pointer border ${
                        draftStep.skillCooldownSeconds === sec
                          ? 'bg-[#1e1e28] text-white border-zinc-400 shadow-[0_0_8px_rgba(255,255,255,0.2)]'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700/60 hover:text-white hover:bg-zinc-700'
                      }`}
                    >
                      {sec}с
                    </button>
                  ))}
                </div>

                {/* Подсказка */}
                <div className="p-1.5 rounded-md bg-zinc-900 border border-zinc-700/60 text-zinc-300 text-[9.5px] leading-tight flex items-start gap-1 mt-0.5">
                  <span className="shrink-0 text-zinc-400">⏱</span>
                  <span>
                    Умение будет нажиматься по своему КД ({draftStep.skillCooldownSeconds}с) независимо от общего цикла ротации.
                  </span>
                </div>
              </div>
            )}

            {/* Footer Buttons: Отмена / Сохранить шаг */}
            <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/80 mt-0.5">
              <button
                type="button"
                onClick={() => setEditingStep(null)}
                className="flex-1 py-1 px-2 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[11px] font-medium border border-zinc-700/80 transition cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSaveStep}
                className="flex-1 py-1.5 px-2 rounded-lg bg-[#181822] hover:bg-[#22222e] text-zinc-100 hover:text-white text-[11px] font-medium border border-zinc-600 hover:border-zinc-300 shadow-[0_0_12px_rgba(255,255,255,0.18)] transition cursor-pointer"
              >
                Сохранить шаг
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
