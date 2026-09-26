import React, { useState, useEffect } from 'react';
import { ActiveSkill, INITIAL_CATALOG, ComboChain, DEFAULT_COMBO_CHAINS } from './data/skillsLibrary';
import { ComboSequence } from './components/ComboSequence';
import {
  Play,
  Square,
  FastForward,
  Download,
  Package,
  Zap,
} from 'lucide-react';

export const App: React.FC = () => {
  // 24 Available Skills
  const [catalog, setCatalog] = useState<ActiveSkill[]>(() => {
    const saved = localStorage.getItem('tl_skills_catalog');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_CATALOG;
      }
    }
    return INITIAL_CATALOG;
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
  const [showExeModal, setShowExeModal] = useState(false);

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem('tl_skills_catalog', JSON.stringify(catalog));
  }, [catalog]);

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
    } else {
      setIsBotRunning(true);
    }
  };

  // Run Test (F5) through all filled steps in all chains
  const runTest = async () => {
    if (isBotRunning || isTestRunning) return;
    setIsTestRunning(true);

    // Sort chains by order
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
    setIsTestRunning(false);
  };

  const handleUploadImage = (skillId: string, base64: string) => {
    setCatalog(prev =>
      prev.map(s => (s.id === skillId ? { ...s, customIcon: base64 } : s))
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
      "_README": "Конфигурация боевых цепочек ротации для Throne and Liberty.",
      "chains": chains.map(chain => ({
        id: chain.id,
        name: chain.name,
        order: chain.order,
        triggerAfter: chain.triggerAfterChainId,
        cooldownMinSeconds: chain.cooldownMin ?? chain.cooldown ?? 0,
        cooldownMaxSeconds: chain.cooldownMax ?? chain.cooldownMin ?? chain.cooldown ?? 0,
        stepsCount: chain.steps.length,
        steps: chain.steps.map((s, idx) => ({
          stepIndex: idx + 1,
          skillName: s.skill ? s.skill.name : "None",
          skillId: s.skill ? s.skill.id : null
        }))
      }))
    };

    const jsonStr = JSON.stringify(output, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'combo_chains_config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#0e1015] text-[#b8bfcc] flex flex-col selection:bg-[#343a4a] selection:text-white">
      {/* Minimalist Top Bar */}
      <header className="bg-[#12141a] border-b border-[#21242e] sticky top-0 z-40 px-4 sm:px-6 py-2.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-7 h-7 rounded bg-[#1c1f28] border border-[#2e3342] flex items-center justify-center font-bold text-gray-200 text-xs shadow-inner">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span className="font-serif tracking-widest text-xs uppercase text-gray-200 font-semibold">
              Throne & Liberty <span className="text-gray-500 font-normal">| Конструктор Комбо</span>
            </span>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={toggleBot}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium text-xs transition cursor-pointer shadow border ${
                isBotRunning
                  ? 'bg-[#2d1519] text-rose-300 border-rose-800/80 animate-pulse'
                  : 'bg-[#15241b] text-emerald-300 border-emerald-800/80 hover:bg-[#1b2e23]'
              }`}
            >
              {isBotRunning ? <Square className="w-3.5 h-3.5 fill-rose-300" /> : <Play className="w-3.5 h-3.5 fill-emerald-300" />}
              <span>{isBotRunning ? 'Стоп (F4)' : 'Старт (F4)'}</span>
            </button>

            <button
              onClick={runTest}
              disabled={isBotRunning || isTestRunning}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#171922] hover:bg-[#20232e] disabled:opacity-40 text-gray-300 text-xs font-medium rounded-md border border-[#282c3a] transition cursor-pointer"
            >
              <FastForward className="w-3.5 h-3.5 text-gray-400" />
              <span className="hidden sm:inline">Тест</span> (F5)
            </button>

            <button
              onClick={handleExportJson}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#171922] hover:bg-[#20232e] text-gray-300 text-xs font-medium rounded-md border border-[#282c3a] transition cursor-pointer"
              title="Скачать конфигурацию цепочек"
            >
              <Download className="w-3.5 h-3.5 text-gray-400" />
              <span className="hidden md:inline">JSON</span>
            </button>

            <button
              onClick={() => setShowExeModal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#171922] hover:bg-[#20232e] text-gray-300 text-xs font-medium rounded-md border border-[#282c3a] transition cursor-pointer"
              title="Инструкция по сборке в .EXE"
            >
              <Package className="w-3.5 h-3.5 text-gray-400" />
              <span>.EXE</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area (Only Combo Chains) */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-5 flex flex-col items-center">
        <ComboSequence
          chains={chains}
          onChainsChange={setChains}
          catalog={catalog}
          onUploadImage={handleUploadImage}
          activeCasting={activeCasting}
        />
      </main>

      {/* Minimal Footer */}
      <footer className="bg-[#0f1116] border-t border-[#1c1e27] py-2 text-[10px] text-gray-500 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${isBotRunning ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`}></span>
            <span>{isBotRunning ? 'Бот активен (F4)' : 'Бот готов к запуску'}</span>
          </div>
          <div>EasyFarm • Модульные цепочки комбо ротации</div>
        </div>
      </footer>

      {/* .EXE Modal */}
      {showExeModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#14161e] border border-[#272b38] rounded-xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-[#212430] flex items-center justify-between">
              <h3 className="font-medium text-gray-200 text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-gray-400" />
                Сборка в автономный .EXE файл
              </h3>
              <button
                onClick={() => setShowExeModal(false)}
                className="text-gray-400 hover:text-white text-base p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto text-xs text-gray-300 space-y-3 leading-relaxed">
              <div className="p-3 bg-[#181b24] border border-[#292e3d] rounded-lg text-gray-300">
                <strong className="block text-gray-200 text-xs mb-1">
                  ✓ Работа в одном файле:
                </strong>
                При запуске <strong>EasyFarm.exe</strong> открывается это окно. Вы настраиваете свои цепочки умений и их кулдауны, а кнопка <strong>«Старт (F4)»</strong> запускает бота.
              </div>

              <div>
                <span className="font-medium text-gray-300 text-xs block mb-1">
                  1. Команда сборки PyInstaller:
                </span>
                <pre className="bg-[#0c0d12] p-2.5 rounded-lg border border-[#1e212b] font-mono text-gray-300 text-[11px] overflow-x-auto">
                  pip install pyinstaller pywebview{'\n'}
                  pyinstaller --onefile --noconsole --name "EasyFarm" app_launcher.py
                </pre>
              </div>

              <div>
                <span className="font-medium text-gray-300 text-xs block mb-1">
                  2. Код app_launcher.py:
                </span>
                <pre className="bg-[#0c0d12] p-2.5 rounded-lg border border-[#1e212b] font-mono text-gray-400 text-[11px] overflow-x-auto">
{`import webview
from main import BotController

controller = BotController()

class Api:
    def start_bot(self):
        controller._start()
    def stop_bot(self):
        controller._stop()

window = webview.create_window(
    'Throne and Liberty EasyFarm',
    'dist/index.html',
    js_api=Api(),
    width=920,
    height=880
)
webview.start()`}
                </pre>
              </div>
            </div>

            <div className="p-3 border-t border-[#212430] bg-[#101218] flex justify-end">
              <button
                onClick={() => setShowExeModal(false)}
                className="px-3.5 py-1.5 bg-[#20232e] hover:bg-[#2a2f3e] text-gray-200 text-xs font-medium rounded border border-[#2e3342] transition cursor-pointer"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
