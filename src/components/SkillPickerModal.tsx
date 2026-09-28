import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ActiveSkill, INITIAL_CATALOG } from '../data/skillsLibrary';
import { SkillIconRenderer } from './SkillIconRenderer';
import { X, Search } from 'lucide-react';

interface SkillPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSkill: (skill: ActiveSkill) => void;
  title?: string;
  subtitle?: string;
  catalog?: ActiveSkill[];
  placedSkillIds?: Set<string>;
  onUploadImage?: (id: string, base64: string) => void;
}

export const SkillPickerModal: React.FC<SkillPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectSkill,
  title = "Выберите умение",
  subtitle = "Нажмите на умение, чтобы поместить его в выбранный слот",
  catalog = INITIAL_CATALOG,
  placedSkillIds = new Set(),
  onUploadImage,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus input when opened, reset query when closed
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => {
        inputRef.current?.focus();
      }, 120);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => {
        setSearchQuery('');
      }, 700);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSelect = (skill: ActiveSkill) => {
    onSelectSkill(skill);
    onClose();
  };

  const filteredSkills = catalog.filter(skill => {
    if (placedSkillIds.has(skill.id)) return false;
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      skill.name.toLowerCase().includes(query) ||
      (skill.type && skill.type.toLowerCase().includes(query)) ||
      (skill.defaultCombo && skill.defaultCombo.toLowerCase().includes(query))
    );
  });

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      inert={!isOpen ? true : undefined}
      className={`fixed inset-0 z-[9999] flex items-start justify-center p-2.5 pt-4 sm:p-4 sm:pt-8 bg-black/75 backdrop-blur-md ${
        isOpen
          ? 'opacity-100 pointer-events-auto cursor-pointer panel-backdrop-enter'
          : 'opacity-0 pointer-events-none panel-backdrop-exit'
      }`}
      onClick={onClose}
    >
      <div
        className={`relative bg-[#12141d] border border-[#2b3040] rounded-xl w-full max-w-[490px] max-h-[85vh] flex flex-col shadow-[0_25px_65px_-10px_rgba(0,0,0,0.95)] overflow-hidden select-none cursor-default backdrop-blur-xl ${
          isOpen ? 'panel-slide-top-enter' : 'panel-slide-top-exit'
        }`}
        style={{
          transform: isOpen ? 'translateY(0)' : 'translateY(-125vh)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3 sm:p-3.5 border-b border-[#212636] flex items-center justify-between bg-gradient-to-r from-[#151722] via-[#171a26] to-[#131520] relative">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block"></span>
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-gray-400 font-semibold">
                ВЫБОР УМЕНИЯ
              </span>
            </div>
            <h3 className="font-serif tracking-wide text-gray-100 font-bold text-sm">
              {title}
            </h3>
            {subtitle && (
              <span className="text-[10px] text-gray-400 font-sans mt-0.5">
                {subtitle}
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-[#1a1e2b] hover:bg-rose-900/60 text-gray-400 hover:text-white flex items-center justify-center transition border border-[#2e3448] hover:border-rose-500/50 cursor-pointer shadow-sm"
            title="Закрыть (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tech Search Bar */}
        <div className="p-2 sm:p-2.5 bg-[#0e1017] border-b border-[#1d2230]">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск умения по названию или оружию..."
              autoFocus
              className="w-full bg-[#161823] border border-[#292f3f] focus:border-gray-400 focus:ring-1 focus:ring-gray-400/20 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-100 placeholder-gray-500 outline-none transition font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 text-xs text-gray-500 hover:text-gray-300"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Skills Grid */}
        <div className="p-2.5 sm:p-3 overflow-y-auto max-h-[58vh] flex flex-col gap-1.5 custom-scrollbar bg-[#0f1118]/80">
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {filteredSkills.map((skill) => {
              const isAlreadyPlaced = placedSkillIds.has(skill.id);

              return (
                <div
                  key={skill.id}
                  onClick={() => handleSelect(skill)}
                  title={`${skill.name} (${skill.defaultCooldown}с)`}
                  className={`group relative aspect-square flex items-center justify-center p-1 rounded-lg border transition-all duration-200 cursor-pointer ${
                    isAlreadyPlaced
                      ? 'bg-[#151722] border-[#292e3d] hover:border-gray-300 hover:bg-[#1f2331] hover:shadow-[0_4px_16px_rgba(255,255,255,0.08)]'
                      : 'bg-[#161924] border-[#282d3d] hover:border-gray-300 hover:scale-105 hover:-translate-y-0.5 hover:bg-[#202534] hover:shadow-[0_4px_16px_rgba(255,255,255,0.09)] shadow-sm'
                  }`}
                >
                  {/* Skill Icon */}
                  <div className="w-full h-full relative">
                    <SkillIconRenderer
                      skill={skill}
                      showLevel={false}
                    />
                  </div>

                  {/* Placed indicator (green dot on panel) */}
                  {isAlreadyPlaced && (
                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 border border-black shadow-[0_0_6px_rgba(52,211,153,0.9)]" title="Уже на панели" />
                  )}
                </div>
              );
            })}
          </div>

          {filteredSkills.length === 0 && (
            <div className="py-8 text-center text-xs text-gray-500 font-sans">
              {searchQuery
                ? `Умений не найдено по запросу «${searchQuery}»`
                : 'Все доступные умения уже распределены по панелям'}
            </div>
          )}
        </div>

        {/* Clean Footer (without "модулей 24") */}
        <div className="p-2 sm:p-2.5 bg-[#0c0e14] border-t border-[#1d2230] flex items-center justify-center text-[10px] text-gray-400 font-mono tracking-wider">
          КЛИК ПО УМЕНИЮ ДЛЯ ВСТАВКИ В СЛОТ
        </div>
      </div>
    </div>,
    document.body
  );
};
