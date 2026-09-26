import React, { useState, useEffect, useCallback } from 'react';
import { ActiveSkill, INITIAL_CATALOG, ComboChain, DEFAULT_COMBO_CHAINS, DEFAULT_HOTKEY_SLOTS } from './data/skillsLibrary';
import { ComboSequence } from './components/ComboSequence';
import { ActiveSkillsBoard, PlacedSlot } from './components/ActiveSkillsBoard';
import {
  Play,
  Square,
  FastForward,
  Zap,
  LayoutGrid,
  Layers,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2
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

  // Bot execution and bridge states
  const [isBotRunning, setIsBotRunning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [activeCasting, setActiveCasting] = useState<{ chainId: string; stepId: string } | null>(null);
  const [currentCastingSlot, setCurrentCastingSlot] = useState<number | null>(null);

  // Auto-dismiss notifications
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

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

  // Full config object generator matching backend schema
  const generateConfigObject = useCallback(() => {
    return {
      "_README": "Конфигурация умений, слотов и боевых цепочек ротации для Throne and Liberty.",
      "exportDate": new Date().toISOString(),
      "totalSlots": slots.length,
      "hotkeySlots": slots.map((s, idx) => ({
        slot: s.key,
        slotIndex: idx + 1,
        combo: s.combo,
        skillId: s.skill ? s.skill.id : null,
        skillName: s.skill ? s.skill.name : "None"
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
  }, [slots, chains]);

  // Backend Bridge: save_config(jsonString) autosave safeguard
  const saveCurrentConfigToBackend = async () => {
    const configObj = generateConfigObject();
    const configJson = JSON.stringify(configObj, null, 2);
    if (window.pywebview) {
      try {
        await window.pywebview.api.save_config(configJson);
      } catch (err: any) {
        console.warn('save_config auto-save warning:', err);
      }
    } else {
      localStorage.setItem('tl_placed_slots', JSON.stringify(slots));
      localStorage.setItem('tl_combo_chains', JSON.stringify(chains));
    }
  };

  // Backend Bridge: start_bot() with autosave safeguard
  const handleStartBot = async () => {
    if (isBotRunning || isStarting) return;
    setErrorMessage(null);
    setIsStarting(true);

    // 1. Автосохранение-подстраховка конфигурации перед стартом
    await saveCurrentConfigToBackend();

    // 2. Запуск бота
    if (window.pywebview) {
      try {
        const result = await window.pywebview.api.start_bot();
        if (result.ok) {
          setIsBotRunning(true);
        } else if (result.error === "already_running") {
          setIsBotRunning(true);
        } else {
          setErrorMessage(result.error || "Не удалось запустить бота");
        }
      } catch (err: any) {
        setErrorMessage(err?.message || "Ошибка связи с backend-мостом");
      } finally {
        setIsStarting(false);
      }
    } else {
      console.warn("pywebview API недоступен — это нормально в превью AI Studio, заработает после сборки .exe");
      setTimeout(() => {
        setIsBotRunning(true);
        setIsStarting(false);
      }, 250);
    }
  };

  // Backend Bridge: stop_bot()
  const handleStopBot = async () => {
    if (!isBotRunning || isStopping) return;
    setErrorMessage(null);
    setIsStopping(true);

    if (window.pywebview) {
      try {
        const result = await window.pywebview.api.stop_bot();
        if (result.ok) {
          setIsBotRunning(false);
          setActiveCasting(null);
          setCurrentCastingSlot(null);
        } else {
          setErrorMessage(result.error || "Не удалось остановить бота");
        }
      } catch (err: any) {
        setErrorMessage(err?.message || "Ошибка связи с backend-мостом");
      } finally {
        setIsStopping(false);
      }
    } else {
      console.warn("pywebview API недоступен — это нормально в превью AI Studio, заработает после сборки .exe");
      setTimeout(() => {
        setIsBotRunning(false);
        setActiveCasting(null);
        setCurrentCastingSlot(null);
        setIsStopping(false);
      }, 250);
    }
  };

  // Backend Bridge: test_rotation() with autosave safeguard
  const handleTestRotation = async () => {
    if (isBotRunning || isTestRunning) return;
    setErrorMessage(null);
    setIsTestRunning(true);

    // Автосохранение перед запуском теста ротации
    const configObj = generateConfigObject();
    const configJson = JSON.stringify(configObj, null, 2);
    if (window.pywebview) {
      try {
        await window.pywebview.api.save_config(configJson);
      } catch (err: any) {
        console.warn('save_config auto-save warning:', err);
      }
    } else {
      localStorage.setItem('tl_placed_slots', JSON.stringify(slots));
      localStorage.setItem('tl_combo_chains', JSON.stringify(chains));
    }

    if (window.pywebview) {
      try {
        // Visual highlight in parallel with real backend gamepad simulation
        const runVisualTest = async () => {
          const sortedChains = [...chains].sort((a, b) => a.order - b.order);
          for (const chain of sortedChains) {
            for (const step of chain.steps.filter(s => s.skill !== null)) {
              setActiveCasting({ chainId: chain.id, stepId: step.id });
              await new Promise(r => setTimeout(r, 400));
            }
          }
          setActiveCasting(null);
        };
        runVisualTest();

        const result = await window.pywebview.api.test_rotation();
        if (result.ok) {
          const testedCount = result.chains_tested ?? chains.length;
          setSuccessMessage(`Тест ротации успешно завершён (проверено цепочек: ${testedCount})`);
        } else {
          setErrorMessage(result.error || "Ошибка тестирования ротации");
        }
      } catch (err: any) {
        setErrorMessage(err?.message || "Ошибка выполнения теста ротации");
      } finally {
        setIsTestRunning(false);
        setActiveCasting(null);
      }
    } else {
      console.warn("pywebview API недоступен — это нормально в превью AI Studio, заработает после сборки .exe");
      // Simulation in AI Studio browser preview
      try {
        if (activeTab === 'skills') {
          for (let i = 0; i < slots.length; i++) {
            if (slots[i].skill !== null) {
              setCurrentCastingSlot(i);
              await new Promise(r => setTimeout(r, 450));
            }
          }
          setCurrentCastingSlot(null);
        } else {
          const sortedChains = [...chains].sort((a, b) => a.order - b.order);
          for (const chain of sortedChains) {
            const activeSteps = chain.steps.filter(s => s.skill !== null);
            for (const step of activeSteps) {
              setActiveCasting({ chainId: chain.id, stepId: step.id });
              await new Promise(r => setTimeout(r, 450));
            }
          }
          setActiveCasting(null);
        }
        setSuccessMessage("Тест ротации (симуляция) завершён");
      } finally {
        setIsTestRunning(false);
      }
    }
  };

  // Backend Bridge: save_icon(slot, dataUrl)
  const handleUploadImage = async (skillId: string, base64: string) => {
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

    // Call window.pywebview.api.save_icon(slot, dataUrl) immediately after file selection
    const boundSlot = slots.find(s => s.skill?.id === skillId);
    const slotKey = boundSlot ? boundSlot.key : skillId;

    if (window.pywebview) {
      try {
        const res = await window.pywebview.api.save_icon(slotKey, base64);
        if (res.ok) {
          setSuccessMessage(`Иконка для слота [${slotKey}] успешно сохранена`);
        } else if (res.error) {
          setErrorMessage(`Ошибка сохранения иконки: ${res.error}`);
        }
      } catch (err: any) {
        console.error('save_icon error:', err);
        setErrorMessage("Ошибка вызова save_icon");
      }
    } else {
      console.warn("pywebview API недоступен — это нормально в превью AI Studio, заработает после сборки .exe");
    }
  };

  // Export JSON file download
  const handleExportJson = () => {
    saveCurrentConfigToBackend();
    const output = generateConfigObject();
    const jsonStr = JSON.stringify(output, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'throne_and_liberty_rotation_config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Global F4 / F5 key shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F4') {
        e.preventDefault();
        if (isBotRunning) {
          handleStopBot();
        } else {
          handleStartBot();
        }
      } else if (e.key === 'F5') {
        e.preventDefault();
        if (!isBotRunning && !isTestRunning) {
          handleTestRotation();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBotRunning, isTestRunning, isStarting, isStopping]);

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
              EZF
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

          {/* Right Action Controls: Тест, Старт/Стоп, Экспорт */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Test Rotation Button (Bridge: test_rotation, F5) */}
            <button
              onClick={handleTestRotation}
              disabled={isBotRunning || isTestRunning}
              className="flex items-center gap-1 px-2 py-1 bg-[#171922] hover:bg-[#20232e] disabled:opacity-40 text-gray-300 text-xs font-medium rounded border border-[#282c3a] transition cursor-pointer"
              title={isBotRunning ? 'Бот работает, тест недоступен' : 'Тест ротации (F5)'}
            >
              {isTestRunning ? (
                <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
              ) : (
                <FastForward className="w-3 h-3 text-gray-400" />
              )}
              <span>{isTestRunning ? 'Тест...' : 'Тест'}</span>
            </button>

            {/* Start / Stop Button (Bridge: start_bot / stop_bot, F4) */}
            {isBotRunning ? (
              <button
                onClick={handleStopBot}
                disabled={isStopping}
                className="flex items-center gap-1 px-2.5 py-1 rounded font-medium text-xs transition cursor-pointer shadow border bg-[#2d1519] text-rose-300 border-rose-800/80 hover:bg-[#3d191f] disabled:opacity-50 animate-pulse"
                title="Остановить бота (F4)"
              >
                {isStopping ? (
                  <Loader2 className="w-3 h-3 text-rose-300 animate-spin" />
                ) : (
                  <Square className="w-3 h-3 fill-rose-300" />
                )}
                <span>{isStopping ? 'Остановка...' : 'Стоп'}</span>
              </button>
            ) : (
              <button
                onClick={handleStartBot}
                disabled={isStarting}
                className="flex items-center gap-1 px-2.5 py-1 rounded font-medium text-xs transition cursor-pointer shadow border bg-[#15241b] text-emerald-300 border-emerald-800/80 hover:bg-[#1b2e23] disabled:opacity-50"
                title="Запустить бота (F4)"
              >
                {isStarting ? (
                  <Loader2 className="w-3 h-3 text-emerald-300 animate-spin" />
                ) : (
                  <Play className="w-3 h-3 fill-emerald-300" />
                )}
                <span>{isStarting ? 'Запуск...' : 'Старт'}</span>
              </button>
            )}

            {/* Download JSON backup */}
            <button
              onClick={handleExportJson}
              className="p-1 text-gray-400 hover:text-gray-200 hover:bg-[#1f222e] rounded border border-transparent hover:border-[#2f3547] transition cursor-pointer"
              title="Скачать файл throne_and_liberty_rotation_config.json"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Floating Status / Error Notifications */}
      {errorMessage && (
        <div className="w-full max-w-[530px] mx-auto mt-1 px-3 py-1.5 rounded-lg bg-rose-950/90 border border-rose-700 text-rose-200 text-xs flex items-center justify-between shadow-xl backdrop-blur z-30">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-white font-bold px-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {successMessage && (
        <div className="w-full max-w-[530px] mx-auto mt-1 px-3 py-1.5 rounded-lg bg-emerald-950/90 border border-emerald-700 text-emerald-200 text-xs flex items-center justify-between shadow-xl backdrop-blur z-30">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-400 hover:text-white font-bold px-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content Area: Smooth sliding transition between Skills and Combos */}
      <main className="flex-1 w-full max-w-[530px] mx-auto p-1.5 overflow-hidden flex flex-col">
        <div
          className="flex w-full transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] items-start"
          style={{
            transform: activeTab === 'skills' ? 'translateX(0%)' : 'translateX(-100%)',
          }}
        >
          {/* Panel 1: Умения */}
          <div className="w-full shrink-0 flex flex-col items-center">
            <ActiveSkillsBoard
              catalog={catalog}
              slots={slots}
              onSlotsChange={setSlots}
              onUploadImage={handleUploadImage}
              currentCastingSlot={currentCastingSlot}
            />
          </div>

          {/* Panel 2: Комбо */}
          <div className="w-full shrink-0 flex flex-col items-center">
            <ComboSequence
              chains={chains}
              onChainsChange={setChains}
              catalog={catalog}
              onUploadImage={handleUploadImage}
              activeCasting={activeCasting}
              slots={slots}
            />
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="bg-[#0f1116] border-t border-[#1c1e27] py-1 text-[10px] text-gray-500 px-3">
        <div className="max-w-[530px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isBotRunning ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`}></span>
            <span>{isBotRunning ? 'Бот активен (F4)' : 'Готов (F4)'}</span>
          </div>
          <div>EZF • PyWebView Bridge</div>
        </div>
      </footer>
    </div>
  );
};

