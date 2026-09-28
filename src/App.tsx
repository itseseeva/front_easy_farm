import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ActiveSkill, INITIAL_CATALOG, INITIAL_SKILLS, ComboChain, DEFAULT_COMBO_CHAINS, DEFAULT_HOTKEY_SLOTS } from './data/skillsLibrary';
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
  CheckCircle2,
  RotateCcw
} from 'lucide-react';

// Дефолтное распределение для верхней сетки: все умения из INITIAL_CATALOG,
// не задействованные в INITIAL_SKILLS (дефолтной боевой раскладке), в порядке каталога.
const getDefaultTopGridSkillIds = (): (string | null)[] => {
  const initialSkillIdsSet = new Set(INITIAL_SKILLS.map(s => s.id));
  const remainingIds = INITIAL_CATALOG
    .filter(s => !initialSkillIdsSet.has(s.id))
    .map(s => s.id);

  const result: (string | null)[] = Array(24).fill(null);
  remainingIds.forEach((id, idx) => {
    if (idx < 24) result[idx] = id;
  });
  return result;
};

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
      skill: INITIAL_SKILLS[idx] || null
    }));
  });

  // Top Grid: 24 squares (skill IDs or null)
  const [topGridSkillIds, setTopGridSkillIds] = useState<(string | null)[]>(getDefaultTopGridSkillIds);

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
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [activeCasting, setActiveCasting] = useState<{ chainId: string; stepId: string } | null>(null);
  const [currentCastingSlot, setCurrentCastingSlot] = useState<number | null>(null);

  const isInitialMount = useRef<boolean>(true);

  // Восстанавливаем слоты и цепочки из файла на диске (skills_config.json),
  // а не из localStorage браузера — источник истины файл, потому что он
  // переживает перенос папки приложения на другой компьютер, а профиль
  // WebView2 с localStorage — нет. Payload тут крошечный JSON-текст (не
  // base64-картинки), поэтому мост не перегружается, в отличие от старой
  // истории с get_saved_icons.
  useEffect(() => {
    const fetchConfig = () => {
      if (!window.pywebview?.api?.load_config) return;
      window.pywebview.api.load_config().then((res) => {
        if (!res.ok || !res.config) {
          // файла ещё нет — первый запуск, оставляем дефолт
          setTopGridSkillIds(getDefaultTopGridSkillIds());
          return;
        }
        const cfg = res.config;

        if (Array.isArray(cfg.hotkeySlots) && cfg.hotkeySlots.length === 12) {
          setSlots(
            cfg.hotkeySlots.map((item: any, idx: number) => ({
              slotIndex: idx,
              key: item.slot,
              combo: item.combo,
              // Файл хранит только id скилла — сам объект (с картинкой и т.д.)
              // ищем в уже загруженном catalog по этому id.
              skill: item.skillId ? catalog.find(sk => sk.id === item.skillId) ?? null : null,
            }))
          );
        }

        if (Array.isArray(cfg.chains) && cfg.chains.length > 0) {
          setChains(
            cfg.chains.map((c: any) => ({
              id: c.id,
              name: c.name,
              order: c.order,
              // Поддержка и нового формата (одно число cooldownSeconds), и
              // старого (пара cooldownMinSeconds/cooldownMaxSeconds из ранее
              // сохранённых файлов) — берём среднее старого диапазона, если
              // новое поле в файле отсутствует.
              cooldown: c.cooldownSeconds ?? (
                c.cooldownMinSeconds != null && c.cooldownMaxSeconds != null
                  ? (c.cooldownMinSeconds + c.cooldownMaxSeconds) / 2
                  : 0
              ),
              triggerAfterChainId: c.triggerAfter,
              steps: (c.steps || []).map((s: any) => ({
                id: `${c.id}_step${s.stepIndex}`,
                skill: s.skillId ? catalog.find(sk => sk.id === s.skillId) ?? null : null,
                cooldown: 0,
                repeatCount: s.repeatCount ?? 1,
                castTimeSeconds: s.castTimeSeconds ?? 0,
              })),
            }))
          );
        }

        if (Array.isArray(cfg.topGridSkillIds)) {
          const ids: (string | null)[] = Array(24).fill(null);
          cfg.topGridSkillIds.slice(0, 24).forEach((id: any, i: number) => {
            ids[i] = typeof id === 'string' ? id : null;
          });
          setTopGridSkillIds(ids);
        } else {
          setTopGridSkillIds(getDefaultTopGridSkillIds());
        }
      }).catch((err) => {
        console.warn('load_config: не удалось восстановить конфигурацию', err);
        setTopGridSkillIds(getDefaultTopGridSkillIds());
      });
    };

    if (window.pywebview?.api?.load_config) {
      fetchConfig();
    } else {
      const handleReady = () => {
        fetchConfig();
      };
      window.addEventListener('pywebviewready', handleReady, { once: true });
      return () => {
        window.removeEventListener('pywebviewready', handleReady);
      };
    }
  }, []); // один раз при монтировании; catalog на этот момент уже заполнен из useState-инициализатора выше

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
  const generateConfigObject = useCallback((
    customSlots = slots,
    customTopGrid = topGridSkillIds,
    customChains = chains
  ) => {
    return {
      "_README": "Конфигурация умений, слотов и боевых цепочек ротации для Throne and Liberty.",
      "exportDate": new Date().toISOString(),
      "totalSlots": customSlots.length,
      "topGridSkillIds": customTopGrid,
      "hotkeySlots": customSlots.map((s, idx) => ({
        slot: s.key,
        slotIndex: idx + 1,
        combo: s.combo,
        skillId: s.skill ? s.skill.id : null,
        skillName: s.skill ? s.skill.name : "None"
      })),
      "totalChains": customChains.length,
      "chains": customChains.map(chain => ({
        id: chain.id,
        name: chain.name,
        order: chain.order,
        triggerAfter: chain.triggerAfterChainId,
        cooldownSeconds: chain.cooldown ?? 0,
        stepsCount: chain.steps.length,
        steps: chain.steps.map((s, idx) => {
          const boundSlot = s.skill ? customSlots.find(slot => slot.skill?.id === s.skill?.id) : null;
          const combo = boundSlot ? boundSlot.combo : (s.skill ? s.skill.defaultCombo : null);
          const slotKey = boundSlot ? boundSlot.key : (s.skill ? (DEFAULT_HOTKEY_SLOTS.find(h => h.combo === s.skill?.defaultCombo)?.slot || null) : null);

          return {
            stepIndex: idx + 1,
            skillId: s.skill ? s.skill.id : null,
            skillName: s.skill ? s.skill.name : "None",
            slot: slotKey,
            combo: combo,
            repeatCount: s.repeatCount ?? 1,
            castTimeSeconds: s.castTimeSeconds ?? 0
          };
        })
      }))
    };
  }, [slots, chains, topGridSkillIds]);

  // Backend Bridge: save_config(jsonString) autosave safeguard
  const saveCurrentConfigToBackend = async (
    customSlots = slots,
    customTopGrid = topGridSkillIds,
    customChains = chains
  ) => {
    const configObj = generateConfigObject(customSlots, customTopGrid, customChains);
    const configJson = JSON.stringify(configObj, null, 2);
    if (window.pywebview) {
      try {
        await window.pywebview.api.save_config(configJson);
      } catch (err: any) {
        console.warn('save_config auto-save warning:', err);
      }
    } else {
      localStorage.setItem('tl_placed_slots', JSON.stringify(customSlots));
      localStorage.setItem('tl_combo_chains', JSON.stringify(customChains));
    }
  };

  // Сброс: боевая панель умений полностью сбрасывается/очищается (12 слотов = null),
  // а все 24 умения из каталога возвращаются в верхнюю панель
  const handleResetToDefault = async () => {
    const newSlots: PlacedSlot[] = DEFAULT_HOTKEY_SLOTS.map((def, idx) => ({
      slotIndex: idx,
      key: def.slot,
      combo: def.combo,
      skill: null
    }));
    const newTopGrid = INITIAL_CATALOG.map(s => s.id);

    setSlots(newSlots);
    setTopGridSkillIds(newTopGrid);
    setShowResetConfirm(false);

    // Сразу сохраняем сброшенную конфигурацию на диск
    await saveCurrentConfigToBackend(newSlots, newTopGrid, chains);
    setSuccessMessage('Боевая панель сброшена, все умения возвращены в библиотеку');
  };

  // Автосохранение [slots, chains, topGridSkillIds] на диск с debounce ~600мс.
  // Первый вызов при монтировании пропускаем через isInitialMount,
  // чтобы не перезаписать файл дефолтной раскладкой до того, как load_config восстановит данные.
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      saveCurrentConfigToBackend();
    }, 600);

    return () => clearTimeout(timer);
  }, [slots, chains, topGridSkillIds]);

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

    // Call window.pywebview.api.save_icon(skillId, dataUrl) immediately after file selection.
    // Имя файла на диске = id скилла (а не текущий боевой слот), чтобы путь был стабильным
    // независимо от того, куда скилл перетащен в интерфейсе.
    if (window.pywebview) {
      try {
        const res = await window.pywebview.api.save_icon(skillId, base64);
        if (res.ok) {
          setSuccessMessage(`Иконка для «${skillId}» успешно сохранена`);
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

            {/* Reset to Default Button */}
            <button
              onClick={() => setShowResetConfirm(true)}
              disabled={isBotRunning || isTestRunning}
              className="p-1 text-gray-400 hover:text-amber-300 hover:bg-[#1f222e] rounded border border-transparent hover:border-[#2f3547] transition cursor-pointer disabled:opacity-40"
              title="Сбросить раскладку к дефолту"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

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

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#14161f] border border-[#2b3040] rounded-xl p-3 max-w-[280px] w-full shadow-2xl flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-amber-400">
              <RotateCcw className="w-4 h-4 shrink-0" />
              <h3 className="font-medium text-xs text-gray-100">Сбросить раскладку умений?</h3>
            </div>
            <div className="flex justify-end gap-1.5 pt-1 border-t border-[#222736]">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-2.5 py-1 rounded text-xs text-gray-400 hover:text-gray-200 hover:bg-[#1c202d] transition cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={handleResetToDefault}
                className="px-2.5 py-1 rounded text-xs font-medium bg-amber-600 hover:bg-amber-500 text-white transition shadow cursor-pointer flex items-center gap-1"
              >
                <span>Сбросить</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
              topGridSkillIds={topGridSkillIds}
              onTopGridChange={setTopGridSkillIds}
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

