import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ComboChain, DEFAULT_COMBO_CHAINS } from './data/skillsLibrary';
import { ComboSequence } from './components/ComboSequence';
import {
  Play,
  Square,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RotateCcw
} from 'lucide-react';

export const App: React.FC = () => {
  // Combo Chains (Dynamic chains & customizable steps)
  const [chains, setChains] = useState<ComboChain[]>(() => {
    const saved = localStorage.getItem('tl_combo_chains');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((c: any) => ({
            ...c,
            steps: (c.steps || []).map((s: any, idx: number) => ({
              id: s.id || `step_${idx + 1}`,
              key: s.key || s.slot || s.combo || (s.skill ? s.skill.name : '') || `${idx + 1}`,
              castTimeSeconds: s.castTimeSeconds ?? 0,
            }))
          }));
        }
      } catch (e) {}
    }
    return DEFAULT_COMBO_CHAINS;
  });

  // Bot execution and bridge states
  const [isBotRunning, setIsBotRunning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [activeCasting, setActiveCasting] = useState<{ chainId: string; stepId: string } | null>(null);
  const isInitialMount = useRef<boolean>(true);

  // Восстанавливаем цепочки из файла на диске (skills_config.json)
  useEffect(() => {
    const fetchConfig = () => {
      if (!window.pywebview?.api?.load_config) return;
      window.pywebview.api.load_config().then((res) => {
        if (!res.ok || !res.config) return;
        const cfg = res.config;

        if (Array.isArray(cfg.chains) && cfg.chains.length > 0) {
          setChains(
            cfg.chains.map((c: any) => ({
              id: c.id,
              name: c.name,
              order: c.order,
              cooldown: c.cooldownSeconds ?? (
                c.cooldownMinSeconds != null && c.cooldownMaxSeconds != null
                  ? (c.cooldownMinSeconds + c.cooldownMaxSeconds) / 2
                  : 0
              ),
              triggerAfterChainId: c.triggerAfter || 'start',
              steps: (c.steps || []).map((s: any, idx: number) => ({
                id: `${c.id}_step${s.stepIndex || idx + 1}`,
                key: s.key || s.slot || s.combo || (s.skillName && s.skillName !== 'None' ? s.skillName : '') || `${idx + 1}`,
                castTimeSeconds: s.castTimeSeconds ?? 0,
              })),
            }))
          );
        }
      }).catch((err) => {
        console.warn('load_config: не удалось восстановить конфигурацию', err);
      });
    };

    if (window.pywebview?.api?.load_config) {
      fetchConfig();
    } else {
      const handleReady = () => fetchConfig();
      window.addEventListener('pywebviewready', handleReady, { once: true });
      return () => window.removeEventListener('pywebviewready', handleReady);
    }
  }, []);

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
    localStorage.setItem('tl_combo_chains', JSON.stringify(chains));
  }, [chains]);

  // Full config object generator matching backend schema
  const generateConfigObject = useCallback((customChains = chains) => {
    return {
      "_README": "Конфигурация клавиатурных комбинаций и цепочек ротации для Throne and Liberty.",
      "exportDate": new Date().toISOString(),
      "mode": "keyboard",
      "totalChains": customChains.length,
      "chains": customChains.map(chain => ({
        id: chain.id,
        name: chain.name,
        order: chain.order,
        triggerAfter: chain.triggerAfterChainId,
        cooldownSeconds: chain.cooldown ?? 0,
        stepsCount: chain.steps.length,
        steps: chain.steps.map((s, idx) => ({
          stepIndex: idx + 1,
          key: s.key || '',
          slot: s.key || '',
          combo: s.key || '',
          skillName: s.key ? `Key_${s.key}` : 'None',
          repeatCount: 1,
          castTimeSeconds: s.castTimeSeconds ?? 0
        }))
      }))
    };
  }, [chains]);

  // Backend Bridge: save_config(jsonString) autosave safeguard
  const saveCurrentConfigToBackend = async (customChains = chains) => {
    const configObj = generateConfigObject(customChains);
    const configJson = JSON.stringify(configObj, null, 2);
    if (window.pywebview) {
      try {
        await window.pywebview.api.save_config(configJson);
      } catch (err: any) {
        console.warn('save_config auto-save warning:', err);
      }
    } else {
      localStorage.setItem('tl_combo_chains', JSON.stringify(customChains));
    }
  };

  // Сброс: возврат комбинаций к дефолтным цепочкам
  const handleResetToDefault = async () => {
    setChains(DEFAULT_COMBO_CHAINS);
    setShowResetConfirm(false);
    await saveCurrentConfigToBackend(DEFAULT_COMBO_CHAINS);
    setSuccessMessage('Комбинации клавиш сброшены к начальным');
  };

  // Автосохранение [chains] на диск с debounce ~600мс
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      saveCurrentConfigToBackend();
    }, 600);

    return () => clearTimeout(timer);
  }, [chains]);

  // Backend Bridge: start_bot() with autosave safeguard
  const handleStartBot = async () => {
    if (isBotRunning || isStarting) return;
    setErrorMessage(null);
    setIsStarting(true);

    await saveCurrentConfigToBackend();

    if (window.pywebview) {
      try {
        const result = await window.pywebview.api.start_bot();
        if (result.ok || result.error === "already_running") {
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
      console.warn("pywebview API недоступен в превью браузера");
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
        } else {
          setErrorMessage(result.error || "Не удалось остановить бота");
        }
      } catch (err: any) {
        setErrorMessage(err?.message || "Ошибка связи с backend-мостом");
      } finally {
        setIsStopping(false);
      }
    } else {
      setTimeout(() => {
        setIsBotRunning(false);
        setActiveCasting(null);
        setIsStopping(false);
      }, 250);
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
    a.download = 'throne_and_liberty_keyboard_combo.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Global F5 key shortcut for Start / Stop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F5') {
        e.preventDefault();
        if (isBotRunning) {
          handleStopBot();
        } else {
          handleStartBot();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBotRunning, isStarting, isStopping]);

  return (
    <div className="min-h-screen bg-black text-zinc-300 flex flex-col selection:bg-zinc-700 selection:text-white justify-center items-center p-2 sm:p-4">
      {/* Sleek Uber-Black Window Card */}
      <div className="w-full max-w-[500px] bg-[#07070a] border border-zinc-800/90 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.95),0_0_25px_rgba(255,255,255,0.03)] flex flex-col overflow-hidden backdrop-blur-md">
        {/* Compact Header */}
        <header className="bg-[#0b0b0f] border-b border-zinc-800/80 px-3 py-2 flex items-center justify-between gap-2">
          {/* Animated Red Shimmer EZF Logo */}
          <div className="flex items-center shrink-0 pl-1">
            <span className="ezf-shimmer font-mono text-base font-black tracking-[0.24em] uppercase select-none cursor-default">
              EZF
            </span>
          </div>

          {/* Right Action Controls: Старт/Стоп (F5), Сброс, Экспорт */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Start / Stop Button (F5) with concise inline badge & silver glow */}
            {isBotRunning ? (
              <button
                onClick={handleStopBot}
                disabled={isStopping}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium text-xs transition cursor-pointer shadow border bg-[#181822] text-white border-zinc-400 hover:bg-[#22222e] disabled:opacity-50 shadow-[0_0_16px_rgba(255,255,255,0.35)] animate-pulse"
                title="Остановить бота (F5)"
              >
                {isStopping ? (
                  <Loader2 className="w-3 h-3 text-zinc-200 animate-spin" />
                ) : (
                  <Square className="w-3 h-3 fill-zinc-100 text-zinc-100" />
                )}
                <span>{isStopping ? 'Остановка...' : 'Стоп'}</span>
                <span className="px-1.5 py-0.2 rounded bg-zinc-900/90 text-zinc-100 text-[10px] font-mono font-bold border border-zinc-500 shadow-[0_0_8px_rgba(255,255,255,0.25)]">
                  F5
                </span>
              </button>
            ) : (
              <button
                onClick={handleStartBot}
                disabled={isStarting}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium text-xs transition cursor-pointer shadow border bg-[#111116] hover:bg-[#1a1a22] text-zinc-100 border-zinc-700/80 hover:border-zinc-400 hover:shadow-[0_0_18px_rgba(255,255,255,0.25)] disabled:opacity-50"
                title="Запустить бота (F5)"
              >
                {isStarting ? (
                  <Loader2 className="w-3 h-3 text-zinc-300 animate-spin" />
                ) : (
                  <Play className="w-3 h-3 fill-zinc-200 text-zinc-200" />
                )}
                <span>{isStarting ? 'Запуск...' : 'Старт'}</span>
                <span className="px-1.5 py-0.2 rounded bg-[#1c1c24] text-zinc-200 text-[10px] font-mono font-bold border border-zinc-600 shadow-[0_0_6px_rgba(255,255,255,0.12)]">
                  F5
                </span>
              </button>
            )}

            {/* Reset to Default Button */}
            <button
              onClick={() => setShowResetConfirm(true)}
              disabled={isBotRunning}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800/70 hover:shadow-[0_0_12px_rgba(255,255,255,0.15)] rounded-lg border border-transparent hover:border-zinc-700 transition cursor-pointer disabled:opacity-40"
              title="Сбросить все комбинации"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Download JSON backup */}
            <button
              onClick={handleExportJson}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800/70 hover:shadow-[0_0_12px_rgba(255,255,255,0.15)] rounded-lg border border-transparent hover:border-zinc-700 transition cursor-pointer"
              title="Скачать JSON файл конфигурации"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Reset Confirmation Dialog */}
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs">
            <div className="bg-[#0b0b0f] border border-zinc-700 rounded-xl p-3.5 max-w-[290px] w-full shadow-[0_0_40px_rgba(0,0,0,0.95),0_0_20px_rgba(255,255,255,0.06)] flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-zinc-200">
                <RotateCcw className="w-4 h-4 shrink-0 text-zinc-300" />
                <h3 className="font-medium text-xs text-zinc-100">Сбросить комбинации клавиш?</h3>
              </div>
              <p className="text-[11px] text-zinc-400">
                Все цепочки вернутся к начальным значениям по умолчанию.
              </p>
              <div className="flex justify-end gap-1.5 pt-1 border-t border-zinc-800">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-2.5 py-1 rounded text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  onClick={handleResetToDefault}
                  className="px-2.5 py-1 rounded text-xs font-medium bg-zinc-200 hover:bg-white text-black transition shadow-[0_0_12px_rgba(255,255,255,0.3)] cursor-pointer flex items-center gap-1"
                >
                  <span>Сбросить</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Status / Error Notifications */}
        {errorMessage && (
          <div className="mx-3 mt-2 px-3 py-1.5 rounded-lg bg-[#1a1215] border border-zinc-600 text-zinc-200 text-xs flex items-center justify-between shadow-[0_0_20px_rgba(0,0,0,0.9)]">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-zinc-300 shrink-0" />
              <span className="font-medium">{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-zinc-400 hover:text-white font-bold px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mx-3 mt-2 px-3 py-1.5 rounded-lg bg-[#111116] border border-zinc-600 text-zinc-200 text-xs flex items-center justify-between shadow-[0_0_20px_rgba(0,0,0,0.9)]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-zinc-300 shrink-0" />
              <span className="font-medium">{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-zinc-400 hover:text-white font-bold px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Main Content: Minimalist Combo Sequence */}
        <main className="p-3 w-full flex flex-col">
          <ComboSequence
            chains={chains}
            onChainsChange={setChains}
            activeCasting={activeCasting}
          />
        </main>
      </div>
    </div>
  );
};
