import React, { useState, useEffect } from 'react';
import { ActiveSkill, INITIAL_CATALOG } from '../data/skillsLibrary';
import { SkillIconRenderer } from './SkillIconRenderer';
import { SkillPickerModal } from './SkillPickerModal';
import { setCustomDragGhost } from '../utils/dragUtils';
import { Trash2 } from 'lucide-react';

export interface PlacedSlot {
  slotIndex: number; // 0 to 11
  key: string;       // "1", "2", ... "="
  combo: string;     // "RB+X", etc.
  cooldown?: number; // legacy optional (deprecated)
  skill: ActiveSkill | null;
}

interface Props {
  catalog: ActiveSkill[];
  slots: PlacedSlot[];
  onSlotsChange: (slots: PlacedSlot[]) => void;
  onUploadImage: (id: string, base64: string) => void;
  currentCastingSlot?: number | null;
}

type DragSource =
  | { location: 'top'; index: number }
  | { location: 'bottom'; index: number };

export const ActiveSkillsBoard: React.FC<Props> = ({
  catalog,
  slots,
  onSlotsChange,
  onUploadImage,
  currentCastingSlot = null,
}) => {
  // Top grid: exactly 24 squares (4 rows x 6 cols).
  // Each square can hold a skill or be empty (null), and skills can be moved freely into ANY square.
  const [topSlots, setTopSlots] = useState<(ActiveSkill | null)[]>(() => {
    const saved = localStorage.getItem('tl_top_grid_slots');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 24) {
          return parsed;
        }
      } catch (e) {}
    }

    // Default initial distribution: skills not in bottom slots are placed in top slots
    const placedIds = new Set(
      slots.filter(s => s.skill !== null).map(s => s.skill!.id)
    );

    const initial: (ActiveSkill | null)[] = Array(24).fill(null);
    INITIAL_CATALOG.forEach((skill, idx) => {
      if (!placedIds.has(skill.id)) {
        initial[idx] = skill;
      }
    });

    return initial;
  });

  // Save top grid layout to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('tl_top_grid_slots', JSON.stringify(topSlots));
  }, [topSlots]);

  // Keep uploaded customIcon images synced
  useEffect(() => {
    setTopSlots(prev =>
      prev.map(slot => {
        if (!slot) return null;
        const matching = catalog.find(c => c.id === slot.id);
        if (matching && matching.customIcon !== slot.customIcon) {
          return { ...slot, customIcon: matching.customIcon };
        }
        return slot;
      })
    );
  }, [catalog]);

  // Active drag state
  const [activeDrag, setActiveDrag] = useState<DragSource | null>(null);
  const [hoveredLocation, setHoveredLocation] = useState<{ location: 'top' | 'bottom'; index: number } | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ location: 'top' | 'bottom'; index: number } | null>(null);
  const [pickerTarget, setPickerTarget] = useState<number | null>(null);

  // Helper to extract drag source
  const getDragSource = (e: React.DragEvent): DragSource | null => {
    if (activeDrag) return activeDrag;
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (raw) return JSON.parse(raw);
    } catch (err) {}
    return null;
  };

  // Drag start from TOP square
  const handleDragStartFromTop = (e: React.DragEvent, index: number) => {
    if (!topSlots[index]) {
      e.preventDefault();
      return;
    }
    setCustomDragGhost(e);
    const item: DragSource = { location: 'top', index };
    setActiveDrag(item);
    try {
      e.dataTransfer.setData('application/json', JSON.stringify(item));
    } catch (err) {}
    e.dataTransfer.effectAllowed = 'move';
  };

  // Drag start from BOTTOM slot
  const handleDragStartFromBottom = (e: React.DragEvent, index: number) => {
    if (!slots[index].skill) {
      e.preventDefault();
      return;
    }
    setCustomDragGhost(e);
    const item: DragSource = { location: 'bottom', index };
    setActiveDrag(item);
    try {
      e.dataTransfer.setData('application/json', JSON.stringify(item));
    } catch (err) {}
    e.dataTransfer.effectAllowed = 'move';
  };

  // Drag End
  const handleDragEnd = () => {
    setActiveDrag(null);
    setHoveredLocation(null);
  };

  // DROP onto a specific TOP square (index 0..23)
  const handleDropOnTopSquare = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    setHoveredLocation(null);

    const source = getDragSource(e);
    if (!source) {
      setActiveDrag(null);
      return;
    }

    if (source.location === 'top') {
      const srcIdx = source.index;
      if (srcIdx !== targetIdx) {
        const nextTop = [...topSlots];
        const temp = nextTop[targetIdx];
        nextTop[targetIdx] = nextTop[srcIdx];
        nextTop[srcIdx] = temp;
        setTopSlots(nextTop);
      }
    } else if (source.location === 'bottom') {
      const srcIdx = source.index;
      const nextBottom = [...slots];
      const nextTop = [...topSlots];

      const skillFromBottom = nextBottom[srcIdx].skill;
      const skillFromTop = nextTop[targetIdx];

      // Exact placement into target top square, swap if target had a skill
      nextTop[targetIdx] = skillFromBottom;
      nextBottom[srcIdx] = { ...nextBottom[srcIdx], skill: skillFromTop };

      setTopSlots(nextTop);
      onSlotsChange(nextBottom);
    }

    setActiveDrag(null);
    setSelectedCell(null);
  };

  // DROP onto a specific BOTTOM slot (index 0..11)
  const handleDropOnBottomSlot = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    setHoveredLocation(null);

    const source = getDragSource(e);
    if (!source) {
      setActiveDrag(null);
      return;
    }

    if (source.location === 'bottom') {
      const srcIdx = source.index;
      if (srcIdx !== targetIdx) {
        const nextBottom = [...slots];
        const temp = nextBottom[targetIdx].skill;
        nextBottom[targetIdx] = { ...nextBottom[targetIdx], skill: nextBottom[srcIdx].skill };
        nextBottom[srcIdx] = { ...nextBottom[srcIdx], skill: temp };
        onSlotsChange(nextBottom);
      }
    } else if (source.location === 'top') {
      const srcIdx = source.index;
      const nextTop = [...topSlots];
      const nextBottom = [...slots];

      const skillFromTop = nextTop[srcIdx];
      const skillFromBottom = nextBottom[targetIdx].skill;

      // Exact placement into target bottom slot, swap if target had a skill
      nextBottom[targetIdx] = { ...nextBottom[targetIdx], skill: skillFromTop };
      nextTop[srcIdx] = skillFromBottom;

      setTopSlots(nextTop);
      onSlotsChange(nextBottom);
    }

    setActiveDrag(null);
    setSelectedCell(null);
  };

  // Click-to-move / swap between any two squares (top or bottom)
  const handleCellClick = (location: 'top' | 'bottom', index: number) => {
    if (!selectedCell) {
      const hasSkill = location === 'top' ? !!topSlots[index] : !!slots[index].skill;
      if (hasSkill) {
        setSelectedCell({ location, index });
      } else if (location === 'bottom') {
        // Only open skill picker modal for bottom battle panel slots
        setPickerTarget(index);
      }
      return;
    }

    if (selectedCell.location === location && selectedCell.index === index) {
      setSelectedCell(null);
      return;
    }

    // Execute swap / move based on source & target
    if (selectedCell.location === 'top' && location === 'top') {
      const nextTop = [...topSlots];
      const temp = nextTop[index];
      nextTop[index] = nextTop[selectedCell.index];
      nextTop[selectedCell.index] = temp;
      setTopSlots(nextTop);
    } else if (selectedCell.location === 'bottom' && location === 'bottom') {
      const nextBottom = [...slots];
      const temp = nextBottom[index].skill;
      nextBottom[index] = { ...nextBottom[index], skill: nextBottom[selectedCell.index].skill };
      nextBottom[selectedCell.index] = { ...nextBottom[selectedCell.index], skill: temp };
      onSlotsChange(nextBottom);
    } else if (selectedCell.location === 'bottom' && location === 'top') {
      const nextBottom = [...slots];
      const nextTop = [...topSlots];
      const bottomSkill = nextBottom[selectedCell.index].skill;
      const topSkill = nextTop[index];
      nextTop[index] = bottomSkill;
      nextBottom[selectedCell.index] = { ...nextBottom[selectedCell.index], skill: topSkill };
      setTopSlots(nextTop);
      onSlotsChange(nextBottom);
    } else if (selectedCell.location === 'top' && location === 'bottom') {
      const nextTop = [...topSlots];
      const nextBottom = [...slots];
      const topSkill = nextTop[selectedCell.index];
      const bottomSkill = nextBottom[index].skill;
      nextBottom[index] = { ...nextBottom[index], skill: topSkill };
      nextTop[selectedCell.index] = bottomSkill;
      setTopSlots(nextTop);
      onSlotsChange(nextBottom);
    }

    setSelectedCell(null);
  };

  // Handle skill chosen from SkillPickerModal for bottom battle slot
  const handleSelectSkillFromPicker = (skill: ActiveSkill) => {
    if (pickerTarget === null) return;

    const targetIdx = pickerTarget;
    const nextBottom = [...slots];
    const nextTop = [...topSlots];

    // If the skill is in topSlots, clear it from topSlots or swap
    const topIdx = nextTop.findIndex(s => s?.id === skill.id);
    if (topIdx !== -1) {
      nextTop[topIdx] = nextBottom[targetIdx].skill;
    }

    // If the skill was placed in another bottom slot, remove duplicate
    for (let i = 0; i < nextBottom.length; i++) {
      if (i !== targetIdx && nextBottom[i].skill?.id === skill.id) {
        nextBottom[i] = { ...nextBottom[i], skill: null };
      }
    }

    nextBottom[targetIdx] = { ...nextBottom[targetIdx], skill };
    setTopSlots(nextTop);
    onSlotsChange(nextBottom);
    setPickerTarget(null);
  };

  // Remove skill from bottom slot (click ✕) -> moves to first free top slot
  const handleRemoveFromSlot = (e: React.MouseEvent, slotIdx: number) => {
    e.stopPropagation();
    const skillToReturn = slots[slotIdx].skill;
    if (!skillToReturn) return;

    const nextTop = [...topSlots];
    const emptyIndex = nextTop.findIndex(s => s === null);
    if (emptyIndex !== -1) {
      nextTop[emptyIndex] = skillToReturn;
    } else {
      nextTop.push(skillToReturn);
    }

    const nextBottom = [...slots];
    nextBottom[slotIdx] = { ...nextBottom[slotIdx], skill: null };

    setTopSlots(nextTop);
    onSlotsChange(nextBottom);
    setSelectedCell(null);
  };

  // Clear all bottom slots -> returns all skills to empty top slots
  const handleClearAllSlots = () => {
    const nextTop = [...topSlots];
    const nextBottom = slots.map(s => {
      if (s.skill) {
        const emptyIndex = nextTop.findIndex(slot => slot === null);
        if (emptyIndex !== -1) {
          nextTop[emptyIndex] = s.skill;
        }
      }
      return { ...s, skill: null };
    });

    setTopSlots(nextTop);
    onSlotsChange(nextBottom);
    setSelectedCell(null);
  };

  return (
    <div className="flex flex-col items-center gap-2 w-full select-none max-w-[500px]">
      {/* Main Board Container */}
      <div className="w-full bg-[#14161d] border border-[#272a36] rounded-xl p-2 sm:p-2.5 shadow-xl flex flex-col gap-2.5 relative overflow-hidden select-none items-center">

        {/* Concentric circular watermark behind skills */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-25">
          <svg viewBox="0 0 600 600" className="w-[480px] h-[480px] text-[#343a4a]">
            <circle cx="300" cy="270" r="230" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 6" opacity="0.4" />
            <circle cx="300" cy="270" r="200" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
            <circle cx="300" cy="270" r="170" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="8 4" opacity="0.4" />
            <circle cx="300" cy="270" r="130" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3" />
            <radialGradient id="centerGlow" cx="50%" cy="45%" r="50%">
              <stop offset="0%" stopColor="#252b38" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#14161d" stopOpacity="0" />
            </radialGradient>
            <rect width="600" height="600" fill="url(#centerGlow)" />
          </svg>
        </div>

        {/* ----------------- SECTION 1: TOP (АКТИВНЫЕ УМЕНИЯ: 24 СВОБОДНЫХ КВАДРАТИКА) ----------------- */}
        <div className="relative z-10 flex flex-col items-center w-full">
          {/* Header Title with fine divider lines */}
          <div className="flex items-center gap-3 mb-2 w-full max-w-sm justify-center">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#3a4153] to-transparent"></div>
            <h2 className="text-xs font-serif tracking-[0.2em] text-[#c2cbd8] uppercase font-semibold drop-shadow">
              Активные Умения
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#3a4153] to-transparent"></div>
          </div>

          {/* 4 rows x 6 columns: Each square is droppable, same size w-[70px] sm:w-[74px] */}
          <div className="flex flex-col gap-1.5 items-center justify-center">
            {[0, 6, 12, 18].map((rowStart) => (
              <div
                key={rowStart}
                className="flex items-center justify-center gap-1.5"
              >
                {[0, 1, 2, 3, 4, 5].map((colIdx) => {
                  const globalIdx = rowStart + colIdx;
                  const skill = topSlots[globalIdx];
                  const hasSkill = skill !== null;
                  const isHovered = hoveredLocation?.location === 'top' && hoveredLocation?.index === globalIdx;
                  const isSelected = selectedCell?.location === 'top' && selectedCell?.index === globalIdx;

                  if (!hasSkill) {
                    return (
                      <div
                        key={`top-empty-${globalIdx}`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (hoveredLocation?.location !== 'top' || hoveredLocation?.index !== globalIdx) {
                            setHoveredLocation({ location: 'top', index: globalIdx });
                          }
                        }}
                        onDragLeave={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                            if (hoveredLocation?.location === 'top' && hoveredLocation?.index === globalIdx) {
                              setHoveredLocation(null);
                            }
                          }
                        }}
                        onDrop={(e) => handleDropOnTopSquare(e, globalIdx)}
                        onClick={() => handleCellClick('top', globalIdx)}
                        className={`w-[70px] sm:w-[74px] aspect-square rounded-lg p-0.5 relative border transition flex items-center justify-center shrink-0 ${
                          isHovered
                            ? 'ring-2 ring-gray-200 border-white scale-102 z-10 bg-[#1e2330]'
                            : selectedCell
                            ? 'border-[#3b445c] hover:border-gray-400 cursor-pointer'
                            : 'border-[#1e212b] shadow-inner cursor-default'
                        }`}
                        style={{
                          background: 'radial-gradient(circle, #101217 0%, #0c0d12 100%)',
                          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6)'
                        }}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-[#1c202a] pointer-events-none" />
                      </div>
                    );
                  }

                  return (
                    <div
                      key={`top-skill-${skill.id}-${globalIdx}`}
                      draggable
                      onDragStart={(e) => handleDragStartFromTop(e, globalIdx)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (hoveredLocation?.location !== 'top' || hoveredLocation?.index !== globalIdx) {
                          setHoveredLocation({ location: 'top', index: globalIdx });
                        }
                      }}
                      onDragLeave={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                          if (hoveredLocation?.location === 'top' && hoveredLocation?.index === globalIdx) {
                            setHoveredLocation(null);
                          }
                        }
                      }}
                      onDrop={(e) => handleDropOnTopSquare(e, globalIdx)}
                      onClick={() => handleCellClick('top', globalIdx)}
                      className={`w-[70px] sm:w-[74px] aspect-square rounded-lg p-0.5 relative cursor-grab active:cursor-grabbing transition-all duration-150 group select-none shadow-md shrink-0 overflow-hidden ${
                        isSelected
                          ? 'ring-2 ring-[#e2e8f0] shadow-[0_0_12px_rgba(255,255,255,0.3)] scale-105 z-20'
                          : isHovered
                          ? 'ring-2 ring-gray-200 border-white scale-102 z-10'
                          : 'border border-[#2d3343] hover:border-[#4d566b] hover:shadow-lg'
                      }`}
                      style={{
                        background: 'linear-gradient(145deg, #1c1f2b, #12141c)',
                        contain: 'paint'
                      }}
                    >
                      <div className="w-full h-full relative">
                        <SkillIconRenderer
                          skill={skill}
                          showLevel={false}
                          onUploadImage={onUploadImage}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Ornamental Divider line */}
        <div className="relative z-10 flex items-center justify-center w-full my-0 py-0.5 pointer-events-none">
          <div className="w-full max-w-sm h-px bg-gradient-to-r from-transparent via-[#2d3444] to-transparent"></div>
        </div>

        {/* ----------------- SECTION 2: BOTTOM (БОЕВАЯ ПАНЕЛЬ: 12 СЛОТОВ) ----------------- */}
        <div className="relative z-10 flex flex-col items-center w-full">
          <div className="flex items-center justify-between w-full max-w-[460px] mb-1.5 px-0.5">
            <span className="text-[11px] uppercase tracking-wider text-gray-400 font-medium font-serif">
              Боевая панель умений (12 слотов)
            </span>
            <button
              onClick={handleClearAllSlots}
              className="text-[10px] text-gray-500 hover:text-gray-300 flex items-center gap-1 transition cursor-pointer"
            >
              <Trash2 className="w-3 h-3" /> Очистить
            </button>
          </div>

          {/* 2 rows of 6 slots: Exactly w-[70px] sm:w-[74px] */}
          <div className="flex flex-col gap-1.5 items-center justify-center">
            {/* Row 1 (Slots 1 to 6) */}
            <div className="flex items-center justify-center gap-1.5">
              {slots.slice(0, 6).map((slot, idx) => {
                const globalSlotIdx = idx;
                const hasSkill = slot.skill !== null;
                const isCasting = currentCastingSlot === globalSlotIdx;
                const isHovered = hoveredLocation?.location === 'bottom' && hoveredLocation?.index === globalSlotIdx;
                const isSelected = selectedCell?.location === 'bottom' && selectedCell?.index === globalSlotIdx;

                return (
                  <div
                    key={`bottom-slot-${globalSlotIdx}`}
                    draggable={hasSkill}
                    onDragStart={(e) => handleDragStartFromBottom(e, globalSlotIdx)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (hoveredLocation?.location !== 'bottom' || hoveredLocation?.index !== globalSlotIdx) {
                        setHoveredLocation({ location: 'bottom', index: globalSlotIdx });
                      }
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        if (hoveredLocation?.location === 'bottom' && hoveredLocation?.index === globalSlotIdx) {
                          setHoveredLocation(null);
                        }
                      }
                    }}
                    onDrop={(e) => handleDropOnBottomSlot(e, globalSlotIdx)}
                    onClick={() => handleCellClick('bottom', globalSlotIdx)}
                    className={`w-[70px] sm:w-[74px] aspect-square rounded-lg p-0.5 relative flex flex-col items-center justify-center transition-all duration-150 select-none group shadow-inner shrink-0 cursor-pointer ${
                      isCasting
                        ? 'ring-2 ring-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)] scale-105 z-20'
                        : isSelected
                        ? 'ring-2 ring-[#e2e8f0] shadow-[0_0_12px_rgba(255,255,255,0.3)] scale-105 z-20'
                        : isHovered
                        ? 'ring-2 ring-gray-200 border-white scale-102 z-10 bg-[#1c202d]'
                        : hasSkill
                        ? 'border border-[#384052] hover:border-[#4f5b75] cursor-grab active:cursor-grabbing'
                        : selectedCell
                        ? 'border border-[#4fb0c9]/60 hover:border-[#4fb0c9] bg-[#161a24]'
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
                    {hasSkill && slot.skill ? (
                      <div className="w-full h-full relative">
                        <SkillIconRenderer
                          skill={slot.skill}
                          showLevel={false}
                          onUploadImage={onUploadImage}
                        />

                        {/* Slot key badge */}
                        <div className="absolute top-1 left-1.5 z-20 px-1 py-0.5 rounded bg-black/75 border border-white/10 text-[9px] font-mono font-bold text-gray-200 shadow">
                          {slot.key}
                        </div>

                        {/* Remove Button on Hover */}
                        <button
                          onClick={(e) => handleRemoveFromSlot(e, globalSlotIdx)}
                          title="Вернуть в каталог"
                          className="absolute -top-1.5 -right-1.5 z-30 w-4 h-4 rounded-full bg-[#272b38] hover:bg-rose-700 text-gray-300 hover:text-white text-[10px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow border border-white/10 pointer-events-auto cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      /* Empty Slot Style */
                      <div className="flex flex-col items-center justify-center text-center p-1 text-gray-500 group-hover:text-gray-300 transition pointer-events-none">
                        <span className="text-xl sm:text-2xl font-extralight leading-none mb-0.5 text-gray-400 group-hover:text-gray-200">
                          +
                        </span>
                        <span className="text-[10px] font-mono font-semibold text-gray-400">
                          {slot.key}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Row 2 (Slots 7 to 12) */}
            <div className="flex items-center justify-center gap-1.5">
              {slots.slice(6, 12).map((slot, idx) => {
                const globalSlotIdx = idx + 6;
                const hasSkill = slot.skill !== null;
                const isCasting = currentCastingSlot === globalSlotIdx;
                const isHovered = hoveredLocation?.location === 'bottom' && hoveredLocation?.index === globalSlotIdx;
                const isSelected = selectedCell?.location === 'bottom' && selectedCell?.index === globalSlotIdx;

                return (
                  <div
                    key={`bottom-slot-${globalSlotIdx}`}
                    draggable={hasSkill}
                    onDragStart={(e) => handleDragStartFromBottom(e, globalSlotIdx)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (hoveredLocation?.location !== 'bottom' || hoveredLocation?.index !== globalSlotIdx) {
                        setHoveredLocation({ location: 'bottom', index: globalSlotIdx });
                      }
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        if (hoveredLocation?.location === 'bottom' && hoveredLocation?.index === globalSlotIdx) {
                          setHoveredLocation(null);
                        }
                      }
                    }}
                    onDrop={(e) => handleDropOnBottomSlot(e, globalSlotIdx)}
                    onClick={() => handleCellClick('bottom', globalSlotIdx)}
                    className={`w-[70px] sm:w-[74px] aspect-square rounded-lg p-0.5 relative flex flex-col items-center justify-center transition-all duration-150 select-none group shadow-inner shrink-0 cursor-pointer ${
                      isCasting
                        ? 'ring-2 ring-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)] scale-105 z-20'
                        : isSelected
                        ? 'ring-2 ring-[#e2e8f0] shadow-[0_0_12px_rgba(255,255,255,0.3)] scale-105 z-20'
                        : isHovered
                        ? 'ring-2 ring-gray-200 border-white scale-102 z-10 bg-[#1c202d]'
                        : hasSkill
                        ? 'border border-[#384052] hover:border-[#4f5b75] cursor-grab active:cursor-grabbing'
                        : selectedCell
                        ? 'border border-[#4fb0c9]/60 hover:border-[#4fb0c9] bg-[#161a24]'
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
                    {hasSkill && slot.skill ? (
                      <div className="w-full h-full relative">
                        <SkillIconRenderer
                          skill={slot.skill}
                          showLevel={false}
                          onUploadImage={onUploadImage}
                        />

                        {/* Slot key badge */}
                        <div className="absolute top-1 left-1.5 z-20 px-1 py-0.5 rounded bg-black/75 border border-white/10 text-[9px] font-mono font-bold text-gray-200 shadow">
                          {slot.key}
                        </div>

                        {/* Remove Button on Hover */}
                        <button
                          onClick={(e) => handleRemoveFromSlot(e, globalSlotIdx)}
                          title="Вернуть в каталог"
                          className="absolute -top-1.5 -right-1.5 z-30 w-4 h-4 rounded-full bg-[#272b38] hover:bg-rose-700 text-gray-300 hover:text-white text-[10px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow border border-white/10 pointer-events-auto cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      /* Empty Slot Style */
                      <div className="flex flex-col items-center justify-center text-center p-1 text-gray-500 group-hover:text-gray-300 transition pointer-events-none">
                        <span className="text-xl sm:text-2xl font-extralight leading-none mb-0.5 text-gray-400 group-hover:text-gray-200">
                          +
                        </span>
                        <span className="text-[10px] font-mono font-semibold text-gray-400">
                          {slot.key}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* Beautiful Skill Picker Modal when clicking an empty slot */}
      <SkillPickerModal
        isOpen={pickerTarget !== null}
        onClose={() => setPickerTarget(null)}
        onSelectSkill={handleSelectSkillFromPicker}
        title={pickerTarget !== null ? `Выбор умения для слота [ ${slots[pickerTarget]?.key} ]` : 'Выбор умения'}
        subtitle="Нажмите на умение, чтобы мгновенно назначить его в выбранный слот"
        catalog={catalog}
        placedSkillIds={new Set(slots.filter(s => s.skill !== null).map(s => s.skill!.id))}
        onUploadImage={onUploadImage}
      />
    </div>
  );
};
