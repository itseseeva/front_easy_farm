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
  RotateCcw,
  Keyboard
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
    <div className="min-h-screen bg-[#0b0d12] text-[#b8bfcc] flex flex-col selection:bg-[#343a4a] selection:text-white justify-center items-center p-2 sm:p-4">
      {/* Sleek Minimalist Window Card */}
      <div className="w-full max-w-[500px] bg-[#0e1017] border border-[#1f2330] rounded-2xl shadow-2xl shadow-black/80 flex flex-col overflow-hidden backdrop-blur-md">
        {/* Compact Header */}
        <header className="bg-[#121520] border-b border-[#1c202d] px-3 py-2 flex items-center justify-between gap-2">
          {/* Logo & Keyboard Mode Title */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-6 h-6 rounded-lg bg-[#181c28] border border-[#272e42] flex items-center justify-center font-bold text-gray-200 text-xs shadow-inner">
              <Keyboard className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif tracking-[0.16em] text-[11px] uppercase text-gray-100 font-bold leading-tight">
                EZF • КОМБО
              </span>
              <span className="text-[9px] text-gray-500 font-mono leading-none">
                Клавиатурная ротация
              </span>
            </div>
          </div>

          {/* Right Action Controls: Старт/Стоп (F5), Сброс, Экспорт */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Start / Stop Button (F5) with concise inline badge */}
            {isBotRunning ? (
              <button
                onClick={handleStopBot}
                disabled={isStopping}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium text-xs transition cursor-pointer shadow border bg-[#2d1519] text-rose-300 border-rose-800/80 hover:bg-[#3d191f] disabled:opacity-50 animate-pulse"
                title="Остановить бота (F5)"
              >
                {isStopping ? (
                  <Loader2 className="w-3 h-3 text-rose-300 animate-spin" />
                ) : (
                  <Square className="w-3 h-3 fill-rose-300" />
                )}
                <span>{isStopping ? 'Остановка...' : 'Стоп'}</span>
                <span className="px-1.5 py-0.2 rounded bg-rose-950/90 text-rose-300 text-[10px] font-mono font-bold border border-rose-500/40">
                  F5
                </span>
              </button>
            ) : (
              <button
                onClick={handleStartBot}
                disabled={isStarting}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium text-xs transition cursor-pointer shadow border bg-[#14231a] text-emerald-300 border-emerald-800/80 hover:bg-[#1b2f23] disabled:opacity-50"
                title="Запустить бота (F5)"
              >
                {isStarting ? (
                  <Loader2 className="w-3 h-3 text-emerald-300 animate-spin" />
                ) : (
                  <Play className="w-3 h-3 fill-emerald-300" />
                )}
                <span>{isStarting ? 'Запуск...' : 'Старт'}</span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-950/90 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/40">
                  F5
                </span>
              </button>
            )}

            {/* Reset to Default Button */}
            <button
              onClick={() => setShowResetConfirm(true)}
              disabled={isBotRunning}
              className="p-1.5 text-gray-400 hover:text-amber-300 hover:bg-[#1a1e2b] rounded-lg border border-transparent hover:border-[#2b3144] transition cursor-pointer disabled:opacity-40"
              title="Сбросить все комбинации"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Download JSON backup */}
            <button
              onClick={handleExportJson}
              className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-[#1a1e2b] rounded-lg border border-transparent hover:border-[#2b3144] transition cursor-pointer"
              title="Скачать JSON файл конфигурации"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Reset Confirmation Dialog */}
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs">
            <div className="bg-[#141722] border border-[#2b3144] rounded-xl p-3.5 max-w-[290px] w-full shadow-2xl flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-amber-400">
                <RotateCcw className="w-4 h-4 shrink-0" />
                <h3 className="font-medium text-xs text-gray-100">Сбросить комбинации клавиш?</h3>
              </div>
              <p className="text-[11px] text-gray-400">
                Все цепочки вернутся к начальным значениям по умолчанию.
              </p>
              <div className="flex justify-end gap-1.5 pt-1 border-t border-[#202534]">
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
          <div className="mx-3 mt-2 px-3 py-1.5 rounded-lg bg-rose-950/90 border border-rose-700 text-rose-200 text-xs flex items-center justify-between shadow-xl">
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
          <div className="mx-3 mt-2 px-3 py-1.5 rounded-lg bg-emerald-950/90 border border-emerald-700 text-emerald-200 text-xs flex items-center justify-between shadow-xl">
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
