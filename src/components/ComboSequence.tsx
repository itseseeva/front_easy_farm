import React, { useState } from 'react';
import { ActiveSkill, ComboChain, ChainStep } from '../data/skillsLibrary';
import { SkillIconRenderer } from './SkillIconRenderer';
import { Plus, Trash2, Clock, CornerDownRight } from 'lucide-react';

interface Props {
  chains: ComboChain[];
  onChainsChange: (chains: ComboChain[]) => void;
  catalog: ActiveSkill[];
  onUploadImage: (id: string, base64: string) => void;
  activeCasting?: { chainId: string; stepId: string } | null;
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
}) => {
  const [selectedCatalogSkill, setSelectedCatalogSkill] = useState<ActiveSkill | null>(null);

  // In-memory drag tracking
  const [activeDrag, setActiveDrag] = useState<DragItem | null>(null);
  const [hoveredTarget, setHoveredTarget] = useState<{ chainId: string; stepId: string } | null>(null);
  const [isOverCatalog, setIsOverCatalog] = useState(false);

  // Set of all skill IDs currently placed in any chain
  const placedSkillIds = new Set<string>();
  chains.forEach(chain => {
    chain.steps.forEach(step => {
      if (step.skill) placedSkillIds.add(step.skill.id);
    });
  });

  // Helper to add a new chain
  const handleAddChain = () => {
    const nextOrder = chains.length + 1;
    const newChainId = `chain_${Date.now()}`;
    const previousChainId = chains.length > 0 ? chains[chains.length - 1].id : 'start';

    const newChain: ComboChain = {
      id: newChainId,
      name: `Цепочка #${nextOrder}`,
      order: nextOrder,
      cooldownMin: 12,
      cooldownMax: 18,
      cooldown: 15.0,
      triggerAfterChainId: previousChainId,
      steps: [
        { id: `step_${Date.now()}_1`, skill: null, cooldown: 8.0 },
        { id: `step_${Date.now()}_2`, skill: null, cooldown: 8.0 },
        { id: `step_${Date.now()}_3`, skill: null, cooldown: 8.0 },
      ]
    };

    onChainsChange([...chains, newChain]);
  };

  // Helper to remove a chain
  const handleRemoveChain = (chainId: string) => {
    if (chains.length <= 1) return;
    const filtered = chains.filter(c => c.id !== chainId);
    // Reindex order
    const reordered = filtered.map((c, idx) => ({ ...c, order: idx + 1 }));
    onChainsChange(reordered);
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

  // Step click: places catalog skill if one is selected
  const handleStepClick = (chainId: string, stepId: string) => {
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
    }
  };

  // Drag and Drop: Start from step
  const handleDragStartFromStep = (e: React.DragEvent, chainId: string, stepId: string, fromIndex: number) => {
    const chain = chains.find(c => c.id === chainId);
    const step = chain?.steps.find(s => s.id === stepId);
    if (!step?.skill) {
      e.preventDefault();
      return;
    }
    const item: DragItem = { type: 'step', chainId, stepId, fromIndex };
    setActiveDrag(item);
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'move';
  };

  // Drag and Drop: Start from catalog
  const handleDragStartFromCatalog = (e: React.DragEvent, skill: ActiveSkill) => {
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
      const skill = catalog.find(s => s.id === item.skillId);
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
    <div className="flex flex-col items-center gap-6 w-full select-none max-w-4xl">
      {/* Top Action Bar: Add Chain button */}
      <div className="w-full flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-serif tracking-widest uppercase text-gray-300 font-medium">
            Боевые цепочки комбо
          </span>
          <span className="text-[10px] text-gray-500 font-mono">
            ({chains.length} {chains.length === 1 ? 'цепочка' : 'цепочки'})
          </span>
        </div>

        <button
          onClick={handleAddChain}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1b202c] hover:bg-[#252b3b] text-gray-200 text-xs font-medium rounded-lg border border-[#32394c] hover:border-[#4d5670] transition shadow cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-emerald-400" />
          <span>+ Добавить цепочку</span>
        </button>
      </div>

      {/* Render Each Chain */}
      <div className="flex flex-col gap-5 w-full">
        {chains.map((chain) => {
          return (
            <div
              key={chain.id}
              className="w-full bg-[#14161d] border border-[#272a36] rounded-xl p-4 sm:p-5 shadow-[0_12px_40px_rgba(0,0,0,0.7)] flex flex-col gap-4 relative overflow-hidden transition"
            >
              {/* Chain Header & Parameters */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#232633] pb-3 text-xs">
                {/* Left: Chain Title & Order */}
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                  <input
                    type="text"
                    value={chain.name}
                    onChange={(e) => handleUpdateChain(chain.id, { name: e.target.value })}
                    className="bg-transparent font-serif tracking-wider text-gray-200 font-medium text-xs sm:text-sm hover:border-b border-gray-600 focus:border-gray-400 outline-none px-1 py-0.5"
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

                  {/* Chain Cooldown Range Input: 2 separate window boxes */}
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Clock className="w-3.5 h-3.5 text-gray-500" />
                    <span>Периодичность раз в:</span>
                    <div className="flex items-center gap-1.5">
                      {/* First window box */}
                      <div className="bg-[#101217] border border-[#2c3242] hover:border-[#3e465a] focus-within:border-emerald-500/70 rounded px-1.5 py-0.5 transition shadow-inner">
                        <input
                          type="number"
                          step="1"
                          min="0"
                          max="300"
                          placeholder="12"
                          value={chain.cooldownMin ?? chain.cooldown ?? 0}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            handleUpdateChain(chain.id, {
                              cooldownMin: val,
                              cooldown: val
                            });
                          }}
                          className="w-8 sm:w-9 bg-transparent text-gray-100 text-xs font-mono outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>

                      {/* Dash */}
                      <span className="text-gray-500 font-mono text-xs select-none font-bold">-</span>

                      {/* Second window box */}
                      <div className="bg-[#101217] border border-[#2c3242] hover:border-[#3e465a] focus-within:border-emerald-500/70 rounded px-1.5 py-0.5 transition shadow-inner">
                        <input
                          type="number"
                          step="1"
                          min="0"
                          max="300"
                          placeholder="18"
                          value={chain.cooldownMax ?? chain.cooldownMin ?? chain.cooldown ?? 0}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            handleUpdateChain(chain.id, {
                              cooldownMax: val
                            });
                          }}
                          className="w-8 sm:w-9 bg-transparent text-gray-100 text-xs font-mono outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>

                      <span className="text-[10px] text-gray-500 select-none">сек</span>
                    </div>
                  </div>

                  {/* Clear Skills */}
                  <button
                    onClick={() => handleClearAllChainSkills(chain.id)}
                    title="Очистить умения в этой цепочке"
                    className="text-gray-500 hover:text-gray-300 p-1 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 w-full">
                {chain.steps.map((step, idx) => {
                  const hasSkill = step.skill !== null;
                  const isCasting = activeCasting?.chainId === chain.id && activeCasting?.stepId === step.id;
                  const isHovered = hoveredTarget?.chainId === chain.id && hoveredTarget?.stepId === step.id;

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
                      onClick={() => handleStepClick(chain.id, step.id)}
                      className={`w-[68px] sm:w-[76px] aspect-square rounded-lg p-0.5 sm:p-1 relative flex flex-col items-center justify-center transition-all duration-150 select-none group shadow-inner shrink-0 ${
                        isCasting
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
                            onUploadImage={onUploadImage}
                          />

                          {/* Hover Remove Skill button */}
                          <button
                            onClick={(e) => handleClearStepSkill(chain.id, step.id, e)}
                            title="Убрать умение в каталог"
                            className="absolute -top-1.5 -right-1.5 z-30 w-4 h-4 rounded-full bg-[#272b38] hover:bg-rose-700 text-gray-300 hover:text-white text-[10px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow border border-white/10"
                          >
                            ✕
                          </button>
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
                })}

                {/* Add Step Button "+" Square at the end of the chain */}
                <button
                  onClick={() => handleAddStepToChain(chain.id)}
                  title="Добавить ещё один квадратик в цепочку"
                  className="w-[68px] sm:w-[76px] aspect-square rounded-lg border border-dashed border-[#2d3445] hover:border-[#4d5770] hover:bg-[#161922] transition flex flex-col items-center justify-center text-gray-500 hover:text-gray-200 cursor-pointer shadow-inner shrink-0 group"
                >
                  <Plus className="w-5 h-5 text-gray-400 group-hover:text-gray-200 transition mb-0.5" />
                  <span className="text-[10px] font-sans">Шаг</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Catalog of Available Skills (24 skills) */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (activeDrag?.type === 'step') setIsOverCatalog(true);
        }}
        onDragLeave={() => setIsOverCatalog(false)}
        onDrop={handleDropOnCatalog}
        className={`w-full bg-[#12141b] border rounded-xl p-4 sm:p-5 transition ${
          isOverCatalog && activeDrag?.type === 'step'
            ? 'border-gray-400 ring-2 ring-gray-400/40'
            : 'border-[#232734]'
        }`}
        title="Перетащите умение на любой квадратик в цепочке"
      >
        <div className="flex items-center justify-between mb-3 pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-300 uppercase tracking-wider">
              Доступные умения
            </span>
            <span className="text-[10px] text-gray-500 font-mono">
              (перетащите в нужный квадратик или кликните)
            </span>
          </div>
          <span className="text-[10px] text-gray-500">
            {24 - placedSkillIds.size} свободно
          </span>
        </div>

        {/* 2 rows of 12 skills (or wrap) */}
        <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 sm:gap-2">
          {catalog.map((skill) => {
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
      </div>
    </div>
  );
};
