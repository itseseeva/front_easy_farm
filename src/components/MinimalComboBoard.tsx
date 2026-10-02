import React, { useState } from 'react';
import { ComboChain } from '../data/skillsLibrary';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Clock,
  Sparkles,
  Command
} from 'lucide-react';

interface Props {
  chains: ComboChain[];
  onChainsChange: (chains: ComboChain[]) => void;
  activeCasting?: { chainId: string; stepId: string } | null;
}

export const MinimalComboBoard: React.FC<Props> = ({
  chains,
  onChainsChange,
  activeCasting = null,
}) => {
  const [activeChainIndex, setActiveChainIndex] = useState(0);
  const [editingStep, setEditingStep] = useState<{ chainId: string; stepId: string } | null>(null);

  // Keep index within bounds
  const validChainIndex = Math.min(Math.max(0, activeChainIndex), Math.max(0, chains.length - 1));

  // Add new chain
  const handleAddChain = () => {
    const nextOrder = chains.length + 1;
    const newChain: ComboChain = {
      id: `chain_${Date.now()}`,
      name: `Цепочка #${nextOrder}`,
      order: nextOrder,
      cooldown: 0,
      triggerAfterChainId: chains.length > 0 ? chains[chains.length - 1].id : 'start',
      steps: [
        { id: `s_${Date.now()}_1`, key: '1', cooldown: 0 },
        { id: `s_${Date.now()}_2`, key: '2', cooldown: 0 },
        { id: `s_${Date.now()}_3`, key: '3', cooldown: 0 },
        { id: `s_${Date.now()}_4`, key: '4', cooldown: 0 },
      ]
    };
    onChainsChange([...chains, newChain]);
    setActiveChainIndex(chains.length);
  };

  // Remove chain
  const handleRemoveChain = (chainId: string) => {
    if (chains.length <= 1) return;
    const filtered = chains.filter(c => c.id !== chainId);
    const reordered = filtered.map((c, i) => ({ ...c, order: i + 1 }));
    onChainsChange(reordered);
    setActiveChainIndex(prev => Math.min(prev, Math.max(0, reordered.length - 1)));
  };

  // Update chain field
  const handleUpdateChain = (chainId: string, updates: Partial<ComboChain>) => {
    onChainsChange(chains.map(c => (c.id === chainId ? { ...c, ...updates } : c)));
  };

  // Add step to chain
  const handleAddStep = (chainId: string) => {
    const updated = chains.map(c => {
      if (c.id === chainId) {
        return {
          ...c,
          steps: [
            ...c.steps,
            { id: `s_${Date.now()}_${c.steps.length + 1}`, key: '', cooldown: 0 }
          ]
        };
      }
      return c;
    });
    onChainsChange(updated);
  };

  // Remove step
  const handleRemoveStep = (chainId: string, stepId: string) => {
    const updated = chains.map(c => {
      if (c.id === chainId) {
        return {
          ...c,
          steps: c.steps.filter(s => s.id !== stepId)
        };
      }
      return c;
    });
    onChainsChange(updated);
  };

  // Update step key
  const handleSetStepKey = (chainId: string, stepId: string, rawKey: string) => {
    // Format key cleanly: uppercase, limit to 4 chars for modifiers like F12, LMB, RMB, Q, etc.
    let clean = rawKey.trim().toUpperCase();
    if (clean.length > 5) clean = clean.slice(0, 5);

    const updated = chains.map(c => {
      if (c.id === chainId) {
        return {
          ...c,
          steps: c.steps.map(s => (s.id === stepId ? { ...s, key: clean } : s))
        };
      }
      return c;
    });
    onChainsChange(updated);
  };

  // Capture keyboard key directly when pressing any key on the square
  const handleKeyDownCapture = (
    e: React.KeyboardEvent<HTMLInputElement>,
    chainId: string,
    stepId: string
  ) => {
    if (e.key === 'Tab') return; // Allow normal tabbing
    if (e.key === 'Escape' || e.key === 'Enter') {
      e.currentTarget.blur();
      setEditingStep(null);
      return;
    }
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      handleSetStepKey(chainId, stepId, '');
      return;
    }

    e.preventDefault();
    let pressedKey = e.key;

    // Friendly key normalization
    if (pressedKey === ' ') pressedKey = 'SPACE';
    else if (pressedKey === 'Control') pressedKey = 'CTRL';
    else if (pressedKey === 'Alt') pressedKey = 'ALT';
    else if (pressedKey === 'Shift') pressedKey = 'SHIFT';
    else if (pressedKey.length === 1) pressedKey = pressedKey.toUpperCase();

    handleSetStepKey(chainId, stepId, pressedKey);
  };

  // Cycle repeat count
  const handleCycleRepeat = (chainId: string, stepId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = chains.map(c => {
      if (c.id !== chainId) return c;
      return {
        ...c,
        steps: c.steps.map(s => {
          if (s.id !== stepId) return s;
          const current = s.repeatCount ?? 1;
          const next = current >= 3 ? 1 : current + 1;
          return { ...s, repeatCount: next };
        })
      };
    });
    onChainsChange(updated);
  };

  // Current chain
  const currentChain = chains[validChainIndex] || chains[0];

  return (
    <div className="w-full flex flex-col items-center">
      {/* Sleek Mini Window Card */}
      <div className="w-full bg-[#13151c]/95 border border-[#232734] rounded-2xl p-4 sm:p-5 shadow-[0_12px_40px_rgba(0,0,0,0.7)] backdrop-blur-xl relative flex flex-col gap-4">
        
        {/* Top Header: Chain Selector & Controls */}
        <div className="flex items-center justify-between gap-3 border-b border-[#1f2330] pb-3">
          {/* Chain Switcher & Title */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-[#171a23] border border-[#2b3142] rounded-lg p-0.5 shadow-inner">
              <button
                type="button"
                disabled={validChainIndex <= 0}
                onClick={() => setActiveChainIndex(validChainIndex - 1)}
                className="p-1 rounded text-gray-400 hover:text-gray-100 disabled:opacity-30 disabled:hover:text-gray-400 transition cursor-pointer"
                title="Предыдущая цепочка"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <span className="font-mono text-xs font-semibold px-2 text-emerald-400">
                {validChainIndex + 1}/{chains.length}
              </span>
              <button
                type="button"
                disabled={validChainIndex >= chains.length - 1}
                onClick={() => setActiveChainIndex(validChainIndex + 1)}
                className="p-1 rounded text-gray-400 hover:text-gray-100 disabled:opacity-30 disabled:hover:text-gray-400 transition cursor-pointer"
                title="Следующая цепочка"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            <input
              type="text"
              value={currentChain.name}
              onChange={(e) => handleUpdateChain(currentChain.id, { name: e.target.value })}
              className="bg-transparent font-medium text-sm text-gray-100 outline-none border-b border-transparent hover:border-gray-600 focus:border-emerald-400 transition px-1 py-0.5 max-w-[150px] sm:max-w-[200px]"
              title="Нажмите, чтобы переименовать"
            />
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2">
            {/* Delay/Cooldown between loops */}
            <div className="flex items-center gap-1.5 bg-[#171a23] border border-[#262c3b] px-2.5 py-1 rounded-lg text-xs" title="Кулдаун повтора всей цепочки (сек)">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <input
                type="number"
                min="0"
                max="999"
                value={currentChain.cooldown ?? 0}
                onChange={(e) => handleUpdateChain(currentChain.id, { cooldown: Math.max(0, parseInt(e.target.value) || 0) })}
                className="w-10 bg-transparent text-center font-mono font-bold text-gray-200 outline-none focus:text-emerald-400"
              />
              <span className="text-gray-500 font-mono text-[10px]">сек</span>
            </div>

            {/* Add Chain */}
            <button
              onClick={handleAddChain}
              className="p-1.5 rounded-lg bg-[#171a23] hover:bg-[#222736] border border-[#2a3040] hover:border-emerald-500/50 text-gray-300 hover:text-emerald-400 transition shadow cursor-pointer"
              title="Создать новую цепочку"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>

            {/* Delete Chain */}
            {chains.length > 1 && (
              <button
                onClick={() => handleRemoveChain(currentChain.id)}
                className="p-1.5 rounded-lg bg-[#171a23] hover:bg-rose-950/60 border border-[#2a3040] hover:border-rose-600/60 text-gray-400 hover:text-rose-400 transition shadow cursor-pointer"
                title="Удалить эту цепочку"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Minimal Combo Steps (Small sleek squares) */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono">
            <span className="flex items-center gap-1.5">
              <Command className="w-3 h-3 text-emerald-400" /> Последовательность клавиш
            </span>
            <span className="text-[10px] text-gray-500">
              Кликните на квадратик и нажмите любую клавишу
            </span>
          </div>

          {/* Grid of Minimal Squares */}
          <div className="flex flex-wrap items-center gap-2">
            {currentChain.steps.map((step, idx) => {
              const isCasting = activeCasting?.chainId === currentChain.id && activeCasting?.stepId === step.id;
              const isFocused = editingStep?.chainId === currentChain.id && editingStep?.stepId === step.id;
              const hasKey = Boolean(step.key && step.key.trim() !== '');

              return (
                <div
                  key={step.id}
                  className={`group relative w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 select-none cursor-pointer ${
                    isCasting
                      ? 'bg-emerald-500/20 border-2 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.8)] scale-110 z-20'
                      : isFocused
                      ? 'bg-[#1b2230] border-2 border-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.5)] scale-105 z-20'
                      : hasKey
                      ? 'bg-[#181b24] border border-[#2d3448] hover:border-emerald-400 hover:shadow-[0_0_16px_rgba(52,211,153,0.35)] hover:-translate-y-0.5 hover:bg-[#1e2330]'
                      : 'bg-[#14161f] border border-dashed border-[#292f40] hover:border-gray-400 hover:bg-[#1a1d29]'
                  }`}
                  onClick={() => setEditingStep({ chainId: currentChain.id, stepId: step.id })}
                >
                  {/* Step index badge (top-left tiny index) */}
                  <span className="absolute top-1 left-1.5 text-[8px] font-mono font-medium text-gray-500 group-hover:text-gray-300 pointer-events-none">
                    {idx + 1}
                  </span>

                  {/* Key Display / Input */}
                  <input
                    type="text"
                    value={step.key || ''}
                    placeholder="+"
                    autoFocus={isFocused}
                    onFocus={() => setEditingStep({ chainId: currentChain.id, stepId: step.id })}
                    onBlur={() => setEditingStep(null)}
                    onKeyDown={(e) => handleKeyDownCapture(e, currentChain.id, step.id)}
                    onChange={(e) => handleSetStepKey(currentChain.id, step.id, e.target.value)}
                    className={`w-full text-center bg-transparent outline-none font-mono font-bold tracking-tight transition-all cursor-pointer ${
                      hasKey
                        ? 'text-emerald-300 text-sm drop-shadow-[0_0_8px_rgba(52,211,153,0.6)] group-hover:drop-shadow-[0_0_12px_rgba(52,211,153,0.9)] group-hover:text-emerald-200'
                        : 'text-gray-500 text-base placeholder:text-gray-600'
                    }`}
                  />

                  {/* Multiplier badge (x1 / x2 / x3) on bottom-right */}
                  {(step.repeatCount ?? 1) > 1 && (
                    <button
                      type="button"
                      onClick={(e) => handleCycleRepeat(currentChain.id, step.id, e)}
                      title="Количество повторов (клик: 1 -> 2 -> 3)"
                      className="absolute bottom-1 right-1 text-[8px] font-mono font-bold px-1 rounded bg-black/70 border border-emerald-400/40 text-emerald-300 shadow"
                    >
                      x{step.repeatCount}
                    </button>
                  )}

                  {/* Quick clear button on hover */}
                  {hasKey && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetStepKey(currentChain.id, step.id, '');
                      }}
                      title="Очистить клавишу"
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#202533] hover:bg-rose-600 text-gray-300 hover:text-white text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow border border-white/10"
                    >
                      ✕
                    </button>
                  )}

                  {/* Delete step if empty on hover */}
                  {!hasKey && currentChain.steps.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveStep(currentChain.id, step.id);
                      }}
                      title="Удалить этот шаг"
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#202533] hover:bg-rose-600 text-gray-400 hover:text-white text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow border border-white/10"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}

            {/* Add Step Button */}
            <button
              onClick={() => handleAddStep(currentChain.id)}
              className="w-12 h-12 rounded-xl border border-dashed border-[#2d3448] hover:border-emerald-400/70 hover:bg-[#181d28] hover:shadow-[0_0_15px_rgba(52,211,153,0.2)] text-gray-500 hover:text-emerald-300 flex items-center justify-center transition-all cursor-pointer group"
              title="Добавить шаг в комбинацию"
            >
              <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>

        {/* Minimal Bottom Helper / Status */}
        <div className="pt-2 border-t border-[#1f2330] flex items-center justify-between text-[11px] text-gray-500 font-mono">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400/80" />
            <span>Поддерживаются любые клавиши: 1, 2, Q, E, R, F, SPACE, F1...</span>
          </div>
          <div>
            Шагов: <span className="text-gray-300 font-semibold">{currentChain.steps.filter(s => s.key && s.key.trim() !== '').length}</span>
          </div>
        </div>

      </div>
    </div>
  );
};
