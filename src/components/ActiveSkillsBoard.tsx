import React, { useState } from 'react';
import { ActiveSkill } from '../data/skillsLibrary';
import { SkillIconRenderer } from './SkillIconRenderer';
import { Trash2 } from 'lucide-react';

export interface PlacedSlot {
  slotIndex: number; // 0 to 11
  key: string;       // "1", "2", ... "="
  combo: string;     // "RB+X", etc.
  cooldown: number;  // 8.0
  skill: ActiveSkill | null;
}

interface Props {
  catalog: ActiveSkill[];
  slots: PlacedSlot[];
  onSlotsChange: (slots: PlacedSlot[]) => void;
  onUploadImage: (id: string, base64: string) => void;
  currentCastingSlot?: number | null;
}

type DragItem =
  | { type: 'catalog'; skillId: string }
  | { type: 'slot'; fromSlotIndex: number };

export const ActiveSkillsBoard: React.FC<Props> = ({
  catalog,
  slots,
  onSlotsChange,
  onUploadImage,
  currentCastingSlot = null,
}) => {
  const [selectedCatalogSkill, setSelectedCatalogSkill] = useState<ActiveSkill | null>(null);

  // Active drag state in memory for 100% reliable tracking
  const [activeDrag, setActiveDrag] = useState<DragItem | null>(null);
  const [hoveredSlotIndex, setHoveredSlotIndex] = useState<number | null>(null);
  const [isOverCatalog, setIsOverCatalog] = useState<boolean>(false);

  // Set of skill IDs currently placed in the bottom bar
  const placedSkillIds = new Set(
    slots.filter(s => s.skill !== null).map(s => s.skill!.id)
  );

  // Click on a top catalog skill
  const handleCatalogSkillClick = (skill: ActiveSkill) => {
    if (placedSkillIds.has(skill.id)) return;

    if (selectedCatalogSkill?.id === skill.id) {
      setSelectedCatalogSkill(null);
    } else {
      setSelectedCatalogSkill(skill);
    }
  };

  // Place skill into bottom slot
  const placeSkillInSlot = (slotIdx: number, skillToPlace: ActiveSkill) => {
    const next = [...slots];

    for (let i = 0; i < next.length; i++) {
      if (next[i].skill?.id === skillToPlace.id) {
        next[i] = { ...next[i], skill: null };
      }
    }

    next[slotIdx] = {
      ...next[slotIdx],
      skill: skillToPlace
    };
    onSlotsChange(next);
    setSelectedCatalogSkill(null);
  };

  // Click on bottom slot
  const handleSlotClick = (slotIdx: number) => {
    if (selectedCatalogSkill) {
      placeSkillInSlot(slotIdx, selectedCatalogSkill);
    }
  };

  // Explicit remove button (click on ✕) -> returns to top catalog
  const handleRemoveFromSlot = (e: React.MouseEvent, slotIdx: number) => {
    e.stopPropagation();
    const next = [...slots];
    next[slotIdx] = { ...next[slotIdx], skill: null };
    onSlotsChange(next);
  };

  // Drag start from top catalog
  const handleDragStartFromCatalog = (e: React.DragEvent, skill: ActiveSkill) => {
    if (placedSkillIds.has(skill.id)) {
      e.preventDefault();
      return;
    }
    const item: DragItem = { type: 'catalog', skillId: skill.id };
    setActiveDrag(item);
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.setData('text/plain', skill.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Drag start from bottom slot
  const handleDragStartFromSlot = (e: React.DragEvent, slotIdx: number) => {
    if (!slots[slotIdx].skill) {
      e.preventDefault();
      return;
    }
    const item: DragItem = { type: 'slot', fromSlotIndex: slotIdx };
    setActiveDrag(item);
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.setData('text/plain', String(slotIdx));
    e.dataTransfer.effectAllowed = 'move';
  };

  // Drag End
  const handleDragEnd = () => {
    setActiveDrag(null);
    setHoveredSlotIndex(null);
    setIsOverCatalog(false);
  };

  // Drop on the top catalog area -> returns the dragged skill from bottom back to top
  const handleDropOnCatalog = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOverCatalog(false);

    let item = activeDrag;
    if (!item) {
      try {
        const raw = e.dataTransfer.getData('application/json');
        if (raw) item = JSON.parse(raw);
      } catch (err) {
        // fallback
      }
    }

    if (item && item.type === 'slot') {
      const fromIdx = item.fromSlotIndex;
      const next = [...slots];
      next[fromIdx] = { ...next[fromIdx], skill: null };
      onSlotsChange(next);
      setSelectedCatalogSkill(null);
    }

    setActiveDrag(null);
    setHoveredSlotIndex(null);
  };

  // Drop on bottom slot
  const handleDropOnSlot = (e: React.DragEvent, targetSlotIdx: number) => {
    e.preventDefault();
    setHoveredSlotIndex(null);

    let item = activeDrag;
    if (!item) {
      try {
        const raw = e.dataTransfer.getData('application/json');
        if (raw) item = JSON.parse(raw);
      } catch (err) {
        // fallback
      }
    }

    if (item) {
      if (item.type === 'catalog') {
        const skill = catalog.find(s => s.id === item.skillId);
        if (skill) {
          placeSkillInSlot(targetSlotIdx, skill);
        }
      } else if (item.type === 'slot') {
        const fromIdx = item.fromSlotIndex;
        if (fromIdx !== targetSlotIdx) {
          const next = [...slots];
          const tempSkill = next[targetSlotIdx].skill;
          next[targetSlotIdx] = { ...next[targetSlotIdx], skill: next[fromIdx].skill };
          next[fromIdx] = { ...next[fromIdx], skill: tempSkill };
          onSlotsChange(next);
        }
      }
    }

    setActiveDrag(null);
  };

  // Render a single bottom slot with the exact style of the combo steps
  const renderBottomSlot = (slot: PlacedSlot, index: number) => {
    const hasSkill = slot.skill !== null;
    const isCasting = currentCastingSlot === index;
    const isHovered = hoveredSlotIndex === index;

    return (
      <div
        key={slot.key + '-' + index}
        draggable={hasSkill}
        onDragStart={(e) => handleDragStartFromSlot(e, index)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => {
          e.preventDefault();
          if (hoveredSlotIndex !== index) setHoveredSlotIndex(index);
        }}
        onDragLeave={() => {
          if (hoveredSlotIndex === index) setHoveredSlotIndex(null);
        }}
        onDrop={(e) => handleDropOnSlot(e, index)}
        onClick={() => handleSlotClick(index)}
        className={`flex-1 aspect-square rounded-lg p-0.5 sm:p-1 relative flex flex-col items-center justify-center transition-all duration-150 cursor-pointer select-none group shadow-inner ${
          isCasting
            ? 'ring-2 ring-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)] scale-105 z-20'
            : isHovered
            ? 'ring-2 ring-gray-300 scale-102 z-10 bg-[#1c202d]'
            : hasSkill
            ? 'border border-[#384052] hover:border-[#4f5b75] cursor-grab active:cursor-grabbing'
            : selectedCatalogSkill
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
          <>
            {/* Render Placed Skill */}
            <SkillIconRenderer
              skill={slot.skill}
              showLevel={true}
              onUploadImage={onUploadImage}
            />

            {/* Remove Button on Hover */}
            <button
              onClick={(e) => handleRemoveFromSlot(e, index)}
              title="Убрать в каталог"
              className="absolute -top-1.5 -right-1.5 z-30 w-4 h-4 rounded-full bg-[#272b38] hover:bg-rose-700 text-gray-300 hover:text-white text-[10px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow border border-white/10"
            >
              ✕
            </button>
          </>
        ) : (
          /* Empty Slot Style identical to Combo */
          <div className="flex flex-col items-center justify-center text-center p-1 text-gray-500 group-hover:text-gray-300 transition pointer-events-none">
            <span className="text-xl sm:text-2xl font-extralight leading-none mb-1 text-gray-400 group-hover:text-gray-200">
              +
            </span>
            <span className="text-[11px] font-sans tracking-wider text-gray-400">
              Пусто
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full select-none">
      {/* Main Board Container */}
      <div className="w-full max-w-4xl bg-[#14161d] border border-[#272a36] rounded-xl p-4 sm:p-7 shadow-[0_12px_45px_rgba(0,0,0,0.85)] flex flex-col gap-6 relative overflow-hidden select-none">

        {/* Concentric circular watermark behind skills */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
          <svg viewBox="0 0 600 600" className="w-[580px] h-[580px] text-[#343a4a]">
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

        {/* ----------------- SECTION 1: TOP (АКТИВНЫЕ УМЕНИЯ) ----------------- */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (activeDrag?.type === 'slot') setIsOverCatalog(true);
          }}
          onDragLeave={() => setIsOverCatalog(false)}
          onDrop={handleDropOnCatalog}
          className={`relative z-10 flex flex-col items-center p-2 rounded-xl transition ${
            isOverCatalog && activeDrag?.type === 'slot'
              ? 'ring-2 ring-gray-400 bg-white/[0.02]'
              : ''
          }`}
        >
          {/* Header Title with fine divider lines identical to ы.jpg */}
          <div className="flex items-center gap-4 mb-4 w-full max-w-md justify-center">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#3a4153] to-transparent"></div>
            <h2 className="text-base sm:text-lg font-serif tracking-[0.2em] text-[#c2cbd8] uppercase font-medium drop-shadow">
              Активные Умения
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#3a4153] to-transparent"></div>
          </div>

          {/* 4 rows x 6 columns - dimensions matching Combo steps exactly */}
          <div className="flex flex-col gap-1.5 sm:gap-2.5 w-full max-w-2xl items-center">
            {[0, 6, 12, 18].map((rowStart) => (
              <div
                key={rowStart}
                className="flex items-center justify-center gap-1.5 sm:gap-2.5 w-full"
              >
                {catalog.slice(rowStart, rowStart + 6).map((skill) => {
                  const isPlaced = placedSkillIds.has(skill.id);
                  const isSelected = selectedCatalogSkill?.id === skill.id;

                  if (isPlaced) {
                    return (
                      <div
                        key={skill.id}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (activeDrag?.type === 'slot') setIsOverCatalog(true);
                        }}
                        onDrop={handleDropOnCatalog}
                        className="flex-1 aspect-square rounded-lg p-1 relative border border-[#1e212b] shadow-inner flex items-center justify-center transition"
                        style={{
                          background: 'radial-gradient(circle, #101217 0%, #0c0d12 100%)',
                          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6)'
                        }}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-[#1c202a]" />
                      </div>
                    );
                  }

                  return (
                    <div
                      key={skill.id}
                      draggable
                      onDragStart={(e) => handleDragStartFromCatalog(e, skill)}
                      onDragEnd={handleDragEnd}
                      onClick={() => handleCatalogSkillClick(skill)}
                      className={`flex-1 aspect-square rounded-lg p-0.5 sm:p-1 relative cursor-grab active:cursor-grabbing transition-all duration-150 group select-none shadow-md ${
                        isSelected
                          ? 'ring-2 ring-[#e2e8f0] shadow-[0_0_12px_rgba(255,255,255,0.3)] scale-105 z-20'
                          : 'border border-[#2d3343] hover:border-[#4d566b] hover:shadow-lg'
                      }`}
                      style={{
                        background: 'linear-gradient(145deg, #1c1f2b, #12141c)'
                      }}
                    >
                      <SkillIconRenderer
                        skill={skill}
                        showLevel={true}
                        onUploadImage={onUploadImage}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Ornamental Divider line matching ы.jpg */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (activeDrag?.type === 'slot') setIsOverCatalog(true);
          }}
          onDrop={handleDropOnCatalog}
          className="relative z-10 flex items-center justify-center my-0.5 py-1"
        >
          <div className="w-full max-w-xl h-px bg-gradient-to-r from-transparent via-[#2d3444] to-transparent"></div>
        </div>

        {/* ----------------- SECTION 2: BOTTOM (БОЕВАЯ ПАНЕЛЬ: 12 СЛОТОВ) ----------------- */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="flex items-center justify-end w-full max-w-2xl mb-2 px-1">
            <button
              onClick={() => onSlotsChange(slots.map(s => ({ ...s, skill: null })))}
              className="text-[10px] text-gray-500 hover:text-gray-300 flex items-center gap-1 transition cursor-pointer"
            >
              <Trash2 className="w-3 h-3" /> Очистить
            </button>
          </div>

          {/* 2 rows of 6 slots matching the exact dimensions and style of Combo */}
          <div className="flex flex-col gap-1.5 sm:gap-2.5 w-full max-w-2xl items-center">
            {/* Row 1 (Slots 1 to 6) */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 w-full">
              {slots.slice(0, 6).map((slot, idx) => renderBottomSlot(slot, idx))}
            </div>

            {/* Row 2 (Slots 7 to 12) */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 w-full">
              {slots.slice(6, 12).map((slot, idx) => renderBottomSlot(slot, idx + 6))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
