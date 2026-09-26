import React, { useState, useEffect } from 'react';
import { ActiveSkill, INITIAL_CATALOG, ComboChain, DEFAULT_COMBO_CHAINS, DEFAULT_HOTKEY_SLOTS } from './data/skillsLibrary';
import { ComboSequence } from './components/ComboSequence';
import { ActiveSkillsBoard, PlacedSlot } from './components/ActiveSkillsBoard';
import {
  Play,
  Square,
  FastForward,
  Zap,
  LayoutGrid,
  Layers
} from 'lucide-react';

export const App: React.FC = () => {
  // Active Tab: "skills" (Панель умений) or "combos" (Панель комбо)
  const [activeTab, setActiveTab] = useState<'skills' | 'combos'>('skills');

  // 24 Available Skills (guaranteed fixed order matching INITIAL_CATALOG, preserving custom uploaded icons)
  const [catalog, setCatalog] = useState<ActiveSkill[]>(() => {
    const saved = localStorage.getItem('tl_skills_catalog');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return INITIAL_CATALOG.map(initial => {
            const found = parsed.find((p: ActiveSkill) => p.id === initial.id);
            return found && found.customIcon ? { ...initial, customIcon: found.customIcon } : initial;
          });
        }
      } catch (e) {
        return INITIAL_CATALOG;
      }
    }
    return INITIAL_CATALOG;
  });

  // 12 Battle Slots (Панель умений)
  const [slots, setSlots] = useState<PlacedSlot[]>(() => {
    const saved = localStorage.getItem('tl_placed_slots');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 12) {
          return parsed;
        }
      } catch (e) {}
    }
    return DEFAULT_HOTKEY_SLOTS.map((def, idx) => ({
      slotIndex: idx,
      key: def.slot,
      combo: def.combo,
      cooldown: def.defaultCooldown,
      skill: INITIAL_CATALOG[idx] || null
    }));
  });

  // Combo Chains (Dynamic chains & customizable steps)
  const [chains, setChains] = useState<ComboChain[]>(() => {
    const saved = localStorage.getItem('tl_combo_chains');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {}
    }
    return DEFAULT_COMBO_CHAINS;
  });

  // Bot execution state
  const [isBotRunning, setIsBotRunning] = useState(false);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [activeCasting, setActiveCasting] = useState<{ chainId: string; stepId: string } | null>(null);
  const [currentCastingSlot, setCurrentCastingSlot] = useState<number | null>(null);

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem('tl_skills_catalog', JSON.stringify(catalog));
  }, [catalog]);

  useEffect(() => {
    localStorage.setItem('tl_placed_slots', JSON.stringify(slots));
  }, [slots]);

  useEffect(() => {
    localStorage.setItem('tl_combo_chains', JSON.stringify(chains));
  }, [chains]);

  // Global F4 / F5 key shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F4') {
        e.preventDefault();
        toggleBot();
      } else if (e.key === 'F5') {
        e.preventDefault();
        runTest();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const toggleBot = () => {
    if (isBotRunning) {
      setIsBotRunning(false);
      setActiveCasting(null);
      setCurrentCastingSlot(null);
    } else {
      setIsBotRunning(true);
    }
  };

  // Run Test (F5)
  const runTest = async () => {
    if (isBotRunning || isTestRunning) return;
    setIsTestRunning(true);

    if (activeTab === 'skills') {
      // Test cast skills in the 12 slots in order
      for (let i = 0; i < slots.length; i++) {
        if (slots[i].skill !== null) {
          setCurrentCastingSlot(i);
          await new Promise(r => setTimeout(r, 600));
        }
      }
      setCurrentCastingSlot(null);
    } else {
      // Test cast combo chains
      const sortedChains = [...chains].sort((a, b) => a.order - b.order);

      for (const chain of sortedChains) {
        const activeSteps = chain.steps.filter(s => s.skill !== null);
        for (const step of activeSteps) {
          setActiveCasting({ chainId: chain.id, stepId: step.id });
          await new Promise(r => setTimeout(r, 600));
        }
        // Wait for chain randomized cooldown simulation if any
        const minCd = chain.cooldownMin ?? chain.cooldown ?? 0;
        const maxCd = chain.cooldownMax ?? minCd;
        const randomCooldown = maxCd > minCd
          ? Math.floor(Math.random() * (maxCd - minCd + 1)) + minCd
          : minCd;

        if (randomCooldown > 0) {
          await new Promise(r => setTimeout(r, Math.min(randomCooldown * 50, 1000)));
        }
      }
      setActiveCasting(null);
    }

    setIsTestRunning(false);
  };

  const handleUploadImage = (skillId: string, base64: string) => {
    setCatalog(prev =>
      prev.map(s => (s.id === skillId ? { ...s, customIcon: base64 } : s))
    );
    setSlots(prevSlots =>
      prevSlots.map(s => {
        if (s.skill && s.skill.id === skillId) {
          return { ...s, skill: { ...s.skill, customIcon: base64 } };
        }
        return s;
      })
    );
    setChains(prevChains =>
      prevChains.map(chain => ({
        ...chain,
        steps: chain.steps.map(step => {
          if (step.skill && step.skill.id === skillId) {
            return {
              ...step,
              skill: { ...step.skill, customIcon: base64 }
            };
          }
          return step;
        })
      }))
    );
  };

  const handleExportJson = () => {
    const output: Record<string, any> = {
      "_README": "Конфигурация умений, слотов и боевых цепочек ротации для Throne and Liberty.",
      "exportDate": new Date().toISOString(),
      "totalSlots": slots.length,
      "hotkeySlots": slots.map((s, idx) => ({
        slot: s.key,
        slotIndex: idx + 1,
        combo: s.combo,
        skillId: s.skill ? s.skill.id : null,
        skillName: s.skill ? s.skill.name : "None",
        cooldown: s.cooldown
      })),
      "totalChains": chains.length,
      "chains": chains.map(chain => ({
        id: chain.id,
        name: chain.name,
        order: chain.order,
        triggerAfter: chain.triggerAfterChainId,
        cooldownMinSeconds: chain.cooldownMin ?? chain.cooldown ?? 0,
        cooldownMaxSeconds: chain.cooldownMax ?? chain.cooldownMin ?? chain.cooldown ?? 0,
        stepsCount: chain.steps.length,
        steps: chain.steps.map((s, idx) => {
          // If skill placed in slots, find its slot & combo
          const boundSlot = s.skill ? slots.find(slot => slot.skill?.id === s.skill?.id) : null;
          const combo = boundSlot ? boundSlot.combo : (s.skill ? s.skill.defaultCombo : null);
          const slotKey = boundSlot ? boundSlot.key : (s.skill ? (DEFAULT_HOTKEY_SLOTS.find(h => h.combo === s.skill?.defaultCombo)?.slot || null) : null);

          return {
            stepIndex: idx + 1,
            skillId: s.skill ? s.skill.id : null,
            skillName: s.skill ? s.skill.name : "None",
            slot: slotKey,
            combo: combo
          };
        })
      }))
    };

    const jsonStr = JSON.stringify(output, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'throne_and_liberty_rotation_config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#0e1015] text-[#b8bfcc] flex flex-col selection:bg-[#343a4a] selection:text-white">
      {/* Top Compact Header */}
      <header className="bg-[#12141a] border-b border-[#21242e] sticky top-0 z-40 px-2 py-1.5 shadow-sm">
        <div className="max-w-[530px] w-full mx-auto flex items-center justify-between gap-1.5">
          {/* Logo & Title */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-6 h-6 rounded bg-[#1c1f28] border border-[#2e3342] flex items-center justify-center font-bold text-gray-200 text-xs shadow-inner">
              <Zap className="w-3 h-3 text-emerald-400" />
            </div>
            <span className="font-serif tracking-[0.15em] text-xs uppercase text-gray-100 font-bold">
              EasyFarm
            </span>
          </div>

          {/* Navigation Tabs: Умения / Комбо */}
          <div className="flex items-center bg-[#151722] p-0.5 rounded-lg border border-[#262a3a]">
            <button
              onClick={() => setActiveTab('skills')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${
                activeTab === 'skills'
                  ? 'bg-[#252b3d] text-gray-100 shadow border border-[#3b445c]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#1a1e2b]'
              }`}
            >
              <LayoutGrid className="w-3 h-3 text-blue-400" />
              <span>Умения</span>
            </button>

            <button
              onClick={() => setActiveTab('combos')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${
                activeTab === 'combos'
                  ? 'bg-[#252b3d] text-gray-100 shadow border border-[#3b445c]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#1a1e2b]'
              }`}
            >
              <Layers className="w-3 h-3 text-emerald-400" />
              <span>Комбо</span>
            </button>
          </div>

          {/* Right Action Controls: Старт & Тест */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={toggleBot}
              className={`flex items-center gap-1 px-2.5 py-1 rounded font-medium text-xs transition cursor-pointer shadow border ${
                isBotRunning
                  ? 'bg-[#2d1519] text-rose-300 border-rose-800/80 animate-pulse'
                  : 'bg-[#15241b] text-emerald-300 border-emerald-800/80 hover:bg-[#1b2e23]'
              }`}
            >
              {isBotRunning ? <Square className="w-3 h-3 fill-rose-300" /> : <Play className="w-3 h-3 fill-emerald-300" />}
              <span>{isBotRunning ? 'Стоп' : 'Старт'}</span>
            </button>

            <button
              onClick={runTest}
              disabled={isBotRunning || isTestRunning}
              className="flex items-center gap-1 px-2 py-1 bg-[#171922] hover:bg-[#20232e] disabled:opacity-40 text-gray-300 text-xs font-medium rounded border border-[#282c3a] transition cursor-pointer"
              title="Тестовый прогон цепочек (F5)"
            >
              <FastForward className="w-3 h-3 text-gray-400" />
              <span>Тест</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area: Compact, snug fit without empty margins */}
      <main className="flex-1 w-full max-w-[530px] mx-auto p-1.5 flex flex-col items-center">
        {activeTab === 'skills' ? (
          <ActiveSkillsBoard
            catalog={catalog}
            slots={slots}
            onSlotsChange={setSlots}
            onUploadImage={handleUploadImage}
            currentCastingSlot={currentCastingSlot}
          />
        ) : (
          <ComboSequence
            chains={chains}
            onChainsChange={setChains}
            catalog={catalog}
            onUploadImage={handleUploadImage}
            activeCasting={activeCasting}
            slots={slots}
          />
        )}
      </main>

      {/* Minimal Footer */}
      <footer className="bg-[#0f1116] border-t border-[#1c1e27] py-1 text-[10px] text-gray-500 px-3">
        <div className="max-w-[530px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isBotRunning ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`}></span>
            <span>{isBotRunning ? 'Бот активен (F4)' : 'Готов (F4)'}</span>
          </div>
          <div>EasyFarm</div>
        </div>
      </footer>
    </div>
  );
};
