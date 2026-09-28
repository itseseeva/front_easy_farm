import React, { useState, useRef } from 'react';
import { ActiveSkill, ComboChain, ChainStep } from '../data/skillsLibrary';
import { SkillIconRenderer } from './SkillIconRenderer';
import { SkillPickerModal } from './SkillPickerModal';
import { PlacedSlot } from './ActiveSkillsBoard';
import { setCustomDragGhost } from '../utils/dragUtils';
import { Plus, Trash2, Clock, CornerDownRight, ChevronUp, ChevronDown, RotateCcw, AlertCircle } from 'lucide-react';

interface Props {
  chains: ComboChain[];
  onChainsChange: (chains: ComboChain[]) => void;
  catalog: ActiveSkill[];
  onUploadImage: (id: string, base64: string) => void;
  activeCasting?: { chainId: string; stepId: string } | null;
  slots?: PlacedSlot[];
}

type DragItem =
  | { type: 'step'; chainId: string; stepId: string; fromIndex: number }
  | { type: 'catalog'; skillId: string };

export const ComboSequence: React.FC<Props> = ({
  chains,
  onChainsChange,
  catalog,
  onUploadImage,
  activeCasting = null,
  slots = [],
}) => {
  const [selectedCatalogSkill, setSelectedCatalogSkill] = useState<ActiveSkill | null>(null);

  // In-memory drag tracking
  const [activeDrag, setActiveDrag] = useState<DragItem | null>(null);
  const [hoveredTarget, setHoveredTarget] = useState<{ chainId: string; stepId: string } | null>(null);
  const [isOverCatalog, setIsOverCatalog] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<{ chainId: string; stepId: string; stepIndex: number } | null>(null);

  // Active Chain for Swipe / Carousel View
  const [activeChainIndex, setActiveChainIndex] = useState(0);
  const [isPeriodicityTipHovered, setIsPeriodicityTipHovered] = useState(false);
  const [isMultiplierTipHovered, setIsMultiplierTipHovered] = useState(false);

  // Keep active index within valid bounds
  const validChainIndex = Math.min(Math.max(0, activeChainIndex), Math.max(0, chains.length - 1));

  // Vertical swipe touch handling
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
      // Swiped UP -> navigate to next chain below
      setActiveChainIndex(validChainIndex + 1);
    } else if (touchDeltaY.current > threshold && validChainIndex > 0) {
      // Swiped DOWN -> navigate to previous chain above
      setActiveChainIndex(validChainIndex - 1);
    }
    touchStartY.current = null;
    touchDeltaY.current = 0;
  };

  // Mouse wheel vertical navigation with debounce
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

  // Only the skills that are currently assigned to the 12 battle panel slots
  const activePanelSkills: ActiveSkill[] = [];
  const seenSkillIds = new Set<string>();
  for (const slot of slots) {
    if (slot.skill && !seenSkillIds.has(slot.skill.id)) {
      seenSkillIds.add(slot.skill.id);
      activePanelSkills.push(slot.skill);
    }
  }

  // Set of all skill IDs currently placed in any chain
  const placedSkillIds = new Set<string>();
  chains.forEach(chain => {
    chain.steps.forEach(step => {
      if (step.skill) placedSkillIds.add(step.skill.id);
    });
  });

  // Helper to add a new chain with smooth swipe transition
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
        { id: `step_${Date.now()}_1`, skill: null, cooldown: 8.0 },
        { id: `step_${Date.now()}_2`, skill: null, cooldown: 8.0 },
        { id: `step_${Date.now()}_3`, skill: null, cooldown: 8.0 },
      ]
    };

    onChainsChange([...chains, newChain]);
    // Smoothly swipe to the newly created chain
    setActiveChainIndex(chains.length);
  };

  // Helper to remove a chain
  const handleRemoveChain = (chainId: string) => {
    if (chains.length <= 1) return;
    const filtered = chains.filter(c => c.id !== chainId);
    // Reindex order
    const reordered = filtered.map((c, idx) => ({ ...c, order: idx + 1 }));
    onChainsChange(reordered);
    setActiveChainIndex(prev => Math.min(prev, Math.max(0, reordered.length - 1)));
  };

  // Update chain attributes (name, order, cooldown, triggerAfterChainId)
  const handleUpdateChain = (chainId: string, updates: Partial<ComboChain>) => {
    const updated = chains.map(c => (c.id === chainId ? { ...c, ...updates } : c));
    onChainsChange(updated);
  };

  // Add a step to a specific chain
  const handleAddStepToChain = (chainId: string) => {
    const updated = chains.map(c => {
      if (c.id === chainId) {
        const newStep: ChainStep = {
          id: `step_${Date.now()}_${c.steps.length + 1}`,
          skill: null,
          cooldown: 8.0
        };
        return { ...c, steps: [...c.steps, newStep] };
      }
      return c;
    });
    onChainsChange(updated);
  };

  // Remove a step completely from a chain
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

  // Clear skill from a step (without removing the square)
  const handleClearStepSkill = (chainId: string, stepId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = chains.map(c => {
      if (c.id === chainId) {
        return {
          ...c,
          steps: c.steps.map(s => (s.id === stepId ? { ...s, skill: null } : s))
        };
      }
      return c;
    });
    onChainsChange(updated);
  };

  // Клик по бейджу "xN": циклит 1 -> 2 -> 3 -> 1 (максимум 3 повтора)
  const handleCycleStepRepeat = (chainId: string, stepId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const MAX_REPEAT = 3;
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

  // Clear all skills in a chain
  const handleClearAllChainSkills = (chainId: string) => {
    const updated = chains.map(c => {
      if (c.id === chainId) {
        return {
          ...c,
          steps: c.steps.map(s => ({ ...s, skill: null }))
        };
      }
      return c;
    });
    onChainsChange(updated);
  };

  // Step click: places catalog skill if one is selected, or opens picker if empty
  const handleStepClick = (chainId: string, stepId: string, stepIndex: number) => {
    if (selectedCatalogSkill) {
      const updated = chains.map(c => {
        return {
          ...c,
          steps: c.steps.map(s => {
            if (c.id === chainId && s.id === stepId) {
              return { ...s, skill: selectedCatalogSkill };
            }
            // Clear if duplicate in same or other chain
            if (s.skill?.id === selectedCatalogSkill.id) {
              return { ...s, skill: null };
            }
            return s;
          })
        };
      });
      onChainsChange(updated);
      setSelectedCatalogSkill(null);
    } else {
      const chain = chains.find(c => c.id === chainId);
      const step = chain?.steps.find(s => s.id === stepId);
      if (!step?.skill) {
        // Empty step clicked! Open skill picker modal
        setPickerTarget({ chainId, stepId, stepIndex });
      }
    }
  };

  // Skill selected from modal for combo chain
  const handleSelectSkillFromPicker = (skill: ActiveSkill) => {
    if (!pickerTarget) return;
    const { chainId, stepId } = pickerTarget;

    const updated = chains.map(c => {
      return {
        ...c,
        steps: c.steps.map(s => {
          if (c.id === chainId && s.id === stepId) {
            return { ...s, skill };
          }
          if (s.skill?.id === skill.id) {
            return { ...s, skill: null };
          }
          return s;
        })
      };
    });
    onChainsChange(updated);
    setPickerTarget(null);
  };

  // Drag and Drop: Start from step
  const handleDragStartFromStep = (e: React.DragEvent, chainId: string, stepId: string, fromIndex: number) => {
    const chain = chains.find(c => c.id === chainId);
    const step = chain?.steps.find(s => s.id === stepId);
    if (!step?.skill) {
      e.preventDefault();
      return;
    }
    setCustomDragGhost(e);
    const item: DragItem = { type: 'step', chainId, stepId, fromIndex };
    setActiveDrag(item);
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'move';
  };

  // Drag and Drop: Start from catalog
  const handleDragStartFromCatalog = (e: React.DragEvent, skill: ActiveSkill) => {
    setCustomDragGhost(e);
    const item: DragItem = { type: 'catalog', skillId: skill.id };
    setActiveDrag(item);
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setActiveDrag(null);
    setHoveredTarget(null);
    setIsOverCatalog(false);
  };

  // Drop onto catalog (returns skill to catalog)
  const handleDropOnCatalog = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOverCatalog(false);

    let item = activeDrag;
    if (!item) {
      try {
        const raw = e.dataTransfer.getData('application/json');
        if (raw) item = JSON.parse(raw);
      } catch (err) {}
    }

    if (item && item.type === 'step') {
      const { chainId, stepId } = item;
      const updated = chains.map(c => {
        if (c.id === chainId) {
          return {
            ...c,
            steps: c.steps.map(s => (s.id === stepId ? { ...s, skill: null } : s))
          };
        }
        return c;
      });
      onChainsChange(updated);
    }

    setActiveDrag(null);
    setHoveredTarget(null);
  };

  // Drop on a step in any chain
  const handleDropOnStep = (e: React.DragEvent, targetChainId: string, targetStepId: string) => {
    e.preventDefault();
    setHoveredTarget(null);

    let item = activeDrag;
    if (!item) {
      try {
        const raw = e.dataTransfer.getData('application/json');
        if (raw) item = JSON.parse(raw);
      } catch (err) {}
    }

    if (!item) return;

    if (item.type === 'catalog') {
      const skill = activePanelSkills.find(s => s.id === item.skillId) || catalog.find(s => s.id === item.skillId);
      if (skill) {
        const updated = chains.map(c => {
          return {
            ...c,
            steps: c.steps.map(s => {
              if (c.id === targetChainId && s.id === targetStepId) {
                return { ...s, skill };
              }
              // Clear duplicate elsewhere
              if (s.skill?.id === skill.id) {
                return { ...s, skill: null };
              }
              return s;
            })
          };
        });
        onChainsChange(updated);
      }
    } else if (item.type === 'step') {
      const { chainId: srcChainId, stepId: srcStepId } = item;
      if (srcChainId === targetChainId && srcStepId === targetStepId) return;

      // Find source step and target step skills
      const srcChain = chains.find(c => c.id === srcChainId);
      const targetChain = chains.find(c => c.id === targetChainId);
      const srcStep = srcChain?.steps.find(s => s.id === srcStepId);
      const targetStep = targetChain?.steps.find(s => s.id === targetStepId);

      if (srcStep && targetStep) {
        const updated = chains.map(c => {
          return {
            ...c,
            steps: c.steps.map(s => {
              if (c.id === srcChainId && s.id === srcStepId) {
                return { ...s, skill: targetStep.skill };
              }
              if (c.id === targetChainId && s.id === targetStepId) {
                return { ...s, skill: srcStep.skill };
              }
              return s;
            })
          };
        });
        onChainsChange(updated);
      }
    }

    setActiveDrag(null);
  };

  return (
    <div className="flex flex-col items-center gap-2.5 w-full select-none max-w-[500px]">
      {/* Top Action Bar: Add Chain button + Chain switcher if > 1 */}
      <div className="w-full flex items-center justify-between px-0.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-serif tracking-widest uppercase text-gray-300 font-medium">
            Боевые цепочки комбо
          </span>
          <span className="text-[10px] text-gray-500 font-mono">
            ({chains.length})
          </span>

          {chains.length > 1 && (
            <div className="flex items-center gap-1 bg-[#101217] p-0.5 rounded-lg border border-[#232736] ml-1">
              {chains.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => setActiveChainIndex(i)}
                  className={`px-2 py-0.5 text-[10px] font-mono rounded transition cursor-pointer ${
                    i === validChainIndex
                      ? 'bg-[#222838] text-white font-bold shadow border border-[#3b435a]'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                  title={c.name}
                >
                  #{i + 1}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleAddChain}
          className="flex items-center gap-1 px-2.5 py-1 bg-[#1b202c] hover:bg-[#252b3b] text-gray-200 text-xs font-medium rounded-lg border border-[#32394c] hover:border-[#4d5670] transition shadow cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-gray-300" />
          <span>+ Цепочка</span>
        </button>
      </div>

      {/* Swipeable Carousel of Chains (Vertical swipe) */}
      <div
        className="relative w-full my-1.5"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        {/* Top Arrow Button: Smoothly swipe back to previous chain */}
        {chains.length > 1 && validChainIndex > 0 && (
          <button
            onClick={() => setActiveChainIndex(validChainIndex - 1)}
            className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center w-14 sm:w-16 h-5 rounded-full bg-[#141722]/95 hover:bg-[#202638] text-gray-300 hover:text-white border border-[#2e374c] hover:border-gray-300 shadow-[0_4px_16px_rgba(0,0,0,0.85)] backdrop-blur-md transition-all duration-200 cursor-pointer group hover:scale-105 active:scale-95"
            title={`Предыдущая: ${chains[validChainIndex - 1]?.name || 'цепочка'}`}
          >
            <ChevronUp className="w-4 h-4 text-gray-300 group-hover:text-white group-hover:-translate-y-0.5 transition-transform" />
          </button>
        )}

        {/* Bottom Arrow Button: Smoothly swipe to next chain */}
        {chains.length > 1 && validChainIndex < chains.length - 1 && (
          <button
            onClick={() => setActiveChainIndex(validChainIndex + 1)}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center w-14 sm:w-16 h-5 rounded-full bg-[#141722]/95 hover:bg-[#202638] text-gray-300 hover:text-white border border-[#2e374c] hover:border-gray-300 shadow-[0_4px_16px_rgba(0,0,0,0.85)] backdrop-blur-md transition-all duration-200 cursor-pointer group hover:scale-105 active:scale-95"
            title={`Следующая: ${chains[validChainIndex + 1]?.name || 'цепочка'}`}
          >
            <ChevronDown className="w-4 h-4 text-gray-300 group-hover:text-white group-hover:translate-y-0.5 transition-transform" />
          </button>
        )}

        {/* Sliding Vertical Track: CSS Grid where active card dictates height and cards slide vertically */}
        <div className="w-full rounded-xl grid grid-cols-1 grid-rows-1">
          {chains.map((chain, chainIdx) => {
            const offset = chainIdx - validChainIndex;
            const isCurrent = offset === 0;

            return (
              <div
                key={chain.id}
                className={`w-full col-start-1 row-start-1 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  isCurrent ? 'z-10 opacity-100 pointer-events-auto' : 'z-0 opacity-0 pointer-events-none'
                }`}
                style={{
                  transform: `translateY(${offset * 100}%)`,
                  visibility: Math.abs(offset) <= 1 ? 'visible' : 'hidden',
                }}
              >
                <div className="w-full bg-[#14161d] border border-[#272a36] rounded-xl p-2.5 sm:p-3 shadow-lg flex flex-col gap-2 relative transition">
                  {/* Уведомления в пустом месте справа вверху карточки (где нарисовано красным маркером):
                      Одинаковый размер, позиция и геометрия для эффекта бесшовного переключения */}
                  {(isMultiplierTipHovered || isPeriodicityTipHovered) && (
                    <div className="absolute top-2.5 right-3 z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-200">
                      <div className="w-[260px] h-[64px] p-2.5 rounded-xl bg-[#141824]/95 border border-yellow-400/80 text-gray-100 shadow-[0_8px_25px_rgba(0,0,0,0.9),0_0_15px_rgba(250,204,21,0.25)] backdrop-blur-md flex flex-col justify-center">
                        {isMultiplierTipHovered ? (
                          <>
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-yellow-400/20 text-yellow-300 font-mono font-bold text-[9px] border border-yellow-400/40">
                                x1 / x2 / x3
                              </span>
                              <span className="font-semibold text-yellow-300 text-[11px]">
                                Мультипликатор
                              </span>
                            </div>
                            <p className="text-[10px] leading-snug text-gray-200 font-normal">
                              Показывает, сколько раз скил повторится в комбинации.
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-yellow-400/20 text-yellow-300 font-mono font-bold text-[9px] border border-yellow-400/40">
                                CD
                              </span>
                              <span className="font-semibold text-yellow-300 text-[11px]">
                                Периодичность
                              </span>
                            </div>
                            <p className="text-[10px] leading-snug text-gray-200 font-normal line-clamp-2">
                              Ставьте время отката самого долгого умения цепочки.
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Chain Header & Parameters */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#232633] pb-2 text-xs">
                    {/* Left: Chain Title & Order */}
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                      <input
                        type="text"
                        value={chain.name}
                        onChange={(e) => handleUpdateChain(chain.id, { name: e.target.value })}
                        className="bg-transparent font-serif tracking-wider text-gray-200 font-medium text-xs hover:border-b border-gray-600 focus:border-gray-400 outline-none px-1 py-0.5"
                      />
                      <span className="text-gray-500 font-mono text-[10px]">
                        (№ {chain.order})
                      </span>
                    </div>

                {/* Center / Right: Execution Flow & Cooldown Settings */}
                <div className="flex flex-wrap items-center gap-3.5 text-[11px]">
                  {/* Trigger After which chain */}
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <CornerDownRight className="w-3.5 h-3.5 text-gray-500" />
                    <span>Применяется:</span>
                    <select
                      value={chain.triggerAfterChainId}
                      onChange={(e) => handleUpdateChain(chain.id, { triggerAfterChainId: e.target.value })}
                      className="bg-[#101217] text-gray-200 px-2 py-1 rounded border border-[#2c3242] outline-none text-xs cursor-pointer focus:border-gray-400"
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

                  {/* Chain Cooldown: single number input */}
                  <div className={`flex items-center gap-1.5 transition-colors duration-150 ${
                    isPeriodicityTipHovered ? 'text-yellow-300 drop-shadow-[0_0_8px_rgba(253,224,71,0.6)]' : 'text-gray-400'
                  }`}>
                    <Clock className={`w-3.5 h-3.5 transition-colors duration-150 ${
                      isPeriodicityTipHovered ? 'text-yellow-300 drop-shadow-[0_0_6px_rgba(253,224,71,0.8)]' : 'text-gray-500'
                    }`} />
                    <span className={`transition-colors duration-150 font-medium ${
                      isPeriodicityTipHovered ? 'text-yellow-300' : 'text-gray-400'
                    }`}>
                      Периодичность раз в:
                    </span>
                    <div className={`bg-[#101217] border rounded px-1.5 py-0.5 transition shadow-inner ${
                      isPeriodicityTipHovered ? 'border-yellow-400/80 shadow-[0_0_8px_rgba(250,204,21,0.3)]' : 'border-[#2c3242] hover:border-[#3e465a] focus-within:border-emerald-500/70'
                    }`}>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="300"
                        placeholder="15"
                        value={chain.cooldown ?? 0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          handleUpdateChain(chain.id, { cooldown: val });
                        }}
                        className="w-8 sm:w-9 bg-transparent text-gray-100 text-xs font-mono outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <span className={`text-[10px] select-none transition-colors duration-150 ${
                      isPeriodicityTipHovered ? 'text-yellow-300' : 'text-gray-500'
                    }`}>
                      сек
                    </span>

                    {/* Exclamation Tooltip 1: Periodicity */}
                    <div className="relative inline-flex items-center">
                      <div
                        onMouseEnter={() => setIsPeriodicityTipHovered(true)}
                        onMouseLeave={() => setIsPeriodicityTipHovered(false)}
                        className={`w-4 h-4 rounded-full flex items-center justify-center cursor-help transition ${
                          isPeriodicityTipHovered
                            ? 'text-amber-300 bg-amber-400/20 scale-110 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                            : 'text-amber-400 hover:text-amber-300 hover:bg-amber-400/10'
                        }`}
                        title="Подсказка о периодичности"
                      >
                        <AlertCircle className="w-3.5 h-3.5 stroke-[2.2]" />
                      </div>
                    </div>

                    {/* Exclamation Tooltip 2: Multiplier
                        При наведении на знак восклицания в пустом месте справа вверху карточки
                        появляется аккуратное стильное уведомление в рамке без треугольника, а значок x1 подсвечивается */}
                    <div className="relative inline-flex items-center">
                      <div
                        onMouseEnter={() => setIsMultiplierTipHovered(true)}
                        onMouseLeave={() => setIsMultiplierTipHovered(false)}
                        className={`w-4 h-4 rounded-full flex items-center justify-center cursor-help transition ${
                          isMultiplierTipHovered
                            ? 'text-yellow-300 bg-yellow-400/20 scale-110 shadow-[0_0_8px_rgba(253,224,71,0.6)]'
                            : 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10'
                        }`}
                        title="Подсказка о мультипликаторе"
                      >
                        <AlertCircle className="w-3.5 h-3.5 stroke-[2.2]" />
                      </div>
                    </div>
                  </div>

                  {/* Clear / Reset Skills in Chain */}
                  <button
                    onClick={() => handleClearAllChainSkills(chain.id)}
                    title="Сбросить умения в этой цепочке"
                    className="text-gray-500 hover:text-amber-300 p-1 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete Chain (if > 1) */}
                  {chains.length > 1 && (
                    <button
                      onClick={() => handleRemoveChain(chain.id)}
                      title="Удалить эту цепочку"
                      className="text-rose-500/70 hover:text-rose-400 text-xs px-2 py-0.5 rounded bg-rose-950/30 hover:bg-rose-900/40 border border-rose-900/40 transition cursor-pointer"
                    >
                      ✕ Удалить
                    </button>
                  )}
                </div>
              </div>

              {/* Chain Steps Squares */}
              <div className="flex flex-wrap items-center gap-1.5 w-full">
                {(() => {
                  // Условия вывода уведомления:
                  // 1. Если на панели комбо вообще нет скилов — уведомление показывается из знака восклицания.
                  // 2. Если есть скилы — показывается из значка x1 скила, раскрываясь вправо поверх соседних слотов (как на скриншоте)
                  const firstSkillIdx = chain.steps.findIndex(s => s.skill !== null);
                  const targetHighlightIdx = firstSkillIdx !== -1 ? firstSkillIdx : -1;

                  return chain.steps.map((step, idx) => {
                    const hasSkill = step.skill !== null;
                    const isCasting = activeCasting?.chainId === chain.id && activeCasting?.stepId === step.id;
                    const isHovered = hoveredTarget?.chainId === chain.id && hoveredTarget?.stepId === step.id;
                    const isTargetForTip = isCurrent && isMultiplierTipHovered && idx === targetHighlightIdx && targetHighlightIdx !== -1;

                    return (
                      <div
                        key={step.id}
                        draggable={hasSkill}
                        onDragStart={(e) => handleDragStartFromStep(e, chain.id, step.id, idx)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (hoveredTarget?.stepId !== step.id) {
                            setHoveredTarget({ chainId: chain.id, stepId: step.id });
                          }
                        }}
                        onDragLeave={() => {
                          if (hoveredTarget?.stepId === step.id) setHoveredTarget(null);
                        }}
                        onDrop={(e) => handleDropOnStep(e, chain.id, step.id)}
                        onClick={() => handleStepClick(chain.id, step.id, idx + 1)}
                        className={`w-[70px] sm:w-[74px] aspect-square rounded-lg p-0.5 relative flex flex-col items-center justify-center transition-all duration-150 select-none group shadow-inner shrink-0 ${
                          isTargetForTip
                            ? 'ring-2 ring-yellow-400 shadow-[0_0_16px_rgba(250,204,21,0.5)] z-40'
                            : isCasting
                            ? 'ring-2 ring-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)] scale-105 z-20'
                            : isHovered
                            ? 'ring-2 ring-gray-300 scale-102 z-10 bg-[#1c202d]'
                            : hasSkill
                            ? 'border border-[#384052] hover:border-[#4f5b75] cursor-grab active:cursor-grabbing'
                            : selectedCatalogSkill
                            ? 'border border-[#4fb0c9]/60 hover:border-[#4fb0c9] bg-[#161a24] cursor-pointer'
                            : 'border border-[#262b38] hover:border-[#384052] hover:bg-[#161821]'
                        }`}
                        style={{
                          background: hasSkill
                            ? 'linear-gradient(145deg, #1b1e2a, #11131a)'
                            : 'linear-gradient(145deg, #161822, #0f1016)',
                          boxShadow: hasSkill
                            ? 'inset 0 1px 0 rgba(255,255,255,0.06), 0 3px 6px rgba(0,0,0,0.5)'
                            : 'inset 0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)'
                        }}
                      >
                        {/* Step Number in top-left (#1, #2, ...) */}
                        <div className="absolute top-1 left-1.5 z-20 text-[9px] font-mono font-medium text-gray-500 pointer-events-none">
                          {idx + 1}
                        </div>

                        {hasSkill && step.skill ? (
                          <>
                            <SkillIconRenderer
                              skill={step.skill}
                              showLevel={false}
                            />

                            {/* Hover Remove Skill button */}
                            <button
                              onClick={(e) => handleClearStepSkill(chain.id, step.id, e)}
                              title="Убрать умение в каталог"
                              className="absolute -top-1.5 -right-1.5 z-30 w-4 h-4 rounded-full bg-[#272b38] hover:bg-rose-700 text-gray-300 hover:text-white text-[10px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow border border-white/10"
                            >
                              ✕
                            </button>

                            {/* Repeat-count badge в правом нижнем углу:
                                при наведении становится жёлтым text-yellow-300;
                                при наведении на знак восклицания подсвечивается золотом */}
                            <div className="absolute bottom-1 right-1 z-30">
                              <button
                                type="button"
                                onClick={(e) => handleCycleStepRepeat(chain.id, step.id, e)}
                                title="Количество повторов нажатия (клик: 1 -> 2 -> 3 -> 1)"
                                className={`min-w-[18px] h-[18px] px-1 rounded font-mono font-bold text-[9px] flex items-center justify-center transition-all cursor-pointer select-none active:scale-95 bg-black/60 hover:bg-black/90 backdrop-blur-[2px] ${
                                  isTargetForTip
                                    ? 'text-yellow-300 scale-125 bg-black/95 drop-shadow-[0_0_10px_rgba(253,224,71,1)] ring-1 ring-yellow-400'
                                    : (step.repeatCount ?? 1) > 1
                                    ? 'text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.9)] scale-105 hover:text-yellow-300'
                                    : 'text-gray-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] hover:text-yellow-300 hover:drop-shadow-[0_0_8px_rgba(253,224,71,0.95)]'
                                }`}
                              >
                                x{step.repeatCount ?? 1}
                              </button>
                            </div>
                          </>
                        ) : (
                          /* Empty Slot "+" & "Пусто" */
                          <div className="flex flex-col items-center justify-center text-center p-1 text-gray-500 group-hover:text-gray-300 transition pointer-events-none">
                            <span className="text-xl sm:text-2xl font-extralight leading-none mb-1 text-gray-400 group-hover:text-gray-200">
                              +
                            </span>
                            <span className="text-[11px] font-sans tracking-wider text-gray-400">
                              Пусто
                            </span>
                          </div>
                        )}

                        {/* Small delete square icon if empty */}
                        {!hasSkill && chain.steps.length > 1 && (
                          <button
                            onClick={(e) => handleDeleteStep(chain.id, step.id, e)}
                            title="Удалить этот квадратик"
                            className="absolute -top-1.5 -right-1.5 z-30 w-4 h-4 rounded-full bg-[#232734] hover:bg-rose-800 text-gray-400 hover:text-white text-[9px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  });
                })()}

                {/* Add Step Button "+" Square at the end of the chain */}
                <button
                  onClick={() => handleAddStepToChain(chain.id)}
                  title="Добавить ещё один квадратик в цепочку"
                  className="w-[70px] sm:w-[74px] aspect-square rounded-lg border border-dashed border-[#2d3445] hover:border-[#4d5770] hover:bg-[#161922] transition flex flex-col items-center justify-center text-gray-500 hover:text-gray-200 cursor-pointer shadow-inner shrink-0 group"
                >
                  <Plus className="w-4 h-4 text-gray-400 group-hover:text-gray-200 transition mb-0.5" />
                  <span className="text-[10px] font-sans">Шаг</span>
                </button>
              </div>
            </div>
          </div>
        );
      })}
        </div>
      </div>

      {/* Catalog of Available Skills (Only skills from the 12 battle panel slots) */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (activeDrag?.type === 'step') setIsOverCatalog(true);
        }}
        onDragLeave={() => setIsOverCatalog(false)}
        onDrop={handleDropOnCatalog}
        className={`w-full bg-[#12141b] border rounded-xl p-2.5 transition ${
          isOverCatalog && activeDrag?.type === 'step'
            ? 'border-gray-400 ring-2 ring-gray-400/40'
            : 'border-[#232734]'
        }`}
        title="Перетащите умение на любой квадратик в цепочке"
      >
        <div className="flex items-center justify-between mb-2 pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-300 uppercase tracking-wider">
              Умения с боевой панели
            </span>
            <span className="text-[10px] text-gray-500 font-mono">
              ({activePanelSkills.length} на панели)
            </span>
          </div>
          <span className="text-[10px] text-gray-500 font-mono">
            {Math.max(0, activePanelSkills.length - placedSkillIds.size)} свободно
          </span>
        </div>

        {activePanelSkills.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-500 font-sans border border-dashed border-[#232734] rounded-lg">
            На боевой панели нет активных умений. Сначала разместите умения на вкладке «Умения».
          </div>
        ) : (
          <div className="grid grid-cols-6 gap-1.5">
            {activePanelSkills.map((skill) => {
              const isPlaced = placedSkillIds.has(skill.id);
              const isSelected = selectedCatalogSkill?.id === skill.id;

              if (isPlaced) {
                return (
                  <div
                    key={skill.id}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (activeDrag?.type === 'step') setIsOverCatalog(true);
                    }}
                    onDrop={handleDropOnCatalog}
                    className="aspect-square rounded border border-[#1b1e28] bg-[#0c0d12] opacity-25"
                    title={`${skill.name} (уже в комбо)`}
                  />
                );
              }

              return (
                <div
                  key={skill.id}
                  draggable
                  onDragStart={(e) => handleDragStartFromCatalog(e, skill)}
                  onDragEnd={handleDragEnd}
                  onClick={() => setSelectedCatalogSkill(selectedCatalogSkill?.id === skill.id ? null : skill)}
                  className={`aspect-square rounded p-0.5 relative cursor-pointer hover:border-[#4d566b] transition bg-[#171922] border ${
                    isSelected ? 'ring-2 ring-gray-200 border-white' : 'border-[#272b38]'
                  }`}
                  title={`${skill.name} (${skill.defaultCooldown}с)`}
                >
                  <SkillIconRenderer
                    skill={skill}
                    showLevel={false}
                    onUploadImage={onUploadImage}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Skill Picker Modal for empty combo step click - filtered strictly to battle panel skills */}
      <SkillPickerModal
        isOpen={pickerTarget !== null}
        onClose={() => setPickerTarget(null)}
        onSelectSkill={handleSelectSkillFromPicker}
        title={
          pickerTarget
            ? `Выбор умения для шага #${pickerTarget.stepIndex}`
            : 'Выбор умения'
        }
        subtitle="Нажмите на умение с боевой панели, чтобы добавить его в этот шаг"
        catalog={activePanelSkills}
        placedSkillIds={placedSkillIds}
        onUploadImage={onUploadImage}
      />
    </div>
  );
};
