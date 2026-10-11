import React, { useState, useRef, useEffect } from 'react';
import { ComboChain, ChainStep } from '../data/skillsLibrary';
import { Plus, Clock, RotateCcw } from 'lucide-react';
import { CaptureProgressToast, CaptureProgressState } from './CaptureProgressToast';
import { CaptureSkillsModal } from './CaptureSkillsModal';
import { CaptureSkillsResponse, CaptureSkillsSlot } from '../types';
import { soundManager } from '../utils/sound';

interface Props {
  chains: ComboChain[];
  onChainsChange: (chains: ComboChain[]) => void;
  activeCasting?: { chainId: string; stepId: string } | null;
  isBotRunning?: boolean;
  onToast?: (message: string) => void;
  onError?: (message: string) => void;
}

const MAX_CAST_SECONDS = 5;

// Mock generators for preview mode or initial state
const createMockSkillIcon = (hue: number, label: string): string => {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 48;
  canvas.height = 48;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const grad = ctx.createLinearGradient(0, 0, 48, 48);
  grad.addColorStop(0, `hsl(${hue}, 70%, 45%)`);
  grad.addColorStop(1, `hsl(${(hue + 40) % 360}, 80%, 25%)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 48, 48);
  ctx.strokeStyle = `hsl(${hue}, 90%, 65%)`;
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 46, 46);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 24, 24);
  return canvas.toDataURL('image/png');
};

const createMockSkillSlots = (): CaptureSkillsSlot[] => {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='];
  return keys.map((key, idx) => {
    const isIssue = key === '5' || key === '0';
    return {
      key,
      row: 'bottom',
      brightness: isIssue ? 48 : 115 + (idx * 3) % 25,
      ok: !isIssue,
      status: isIssue ? 'тёмный: пустой или откат?' : 'ok',
      icon_png: createMockSkillIcon((idx * 30 + 190) % 360, key),
    };
  });
};

export const ComboSequence: React.FC<Props> = ({
  chains,
  onChainsChange,
  activeCasting = null,
  isBotRunning = false,
  onToast,
  onError,
}) => {
  // Capture Skills state
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState<CaptureProgressState | null>(null);
  const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);
  const [captureResult, setCaptureResult] = useState<CaptureSkillsResponse | null>(null);
  const captureToastTimeoutRef = useRef<any>(null);

  // Open skills modal handler
  const handleOpenSkillsModal = () => {
    if (!captureResult) {
      setCaptureResult({
        ok: true,
        message: 'Снимки сохранены',
        slots: createMockSkillSlots(),
      });
    }
    setIsCaptureModalOpen(true);
  };

  // Listen to easyfarm:capture-progress from backend
  useEffect(() => {
    const handleCaptureProgressEvent = (e: any) => {
      const detail = e.detail;
      if (!detail) return;
      const stage = detail.stage as 'minimize' | 'capture' | 'save';
      const secondsLeft = typeof detail.seconds_left === 'number' ? detail.seconds_left : 0;
      
      if (captureToastTimeoutRef.current) {
        clearTimeout(captureToastTimeoutRef.current);
        captureToastTimeoutRef.current = null;
      }

      setCaptureProgress({
        stage,
        secondsLeft,
      });
    };

    window.addEventListener('easyfarm:capture-progress', handleCaptureProgressEvent as EventListener);
    return () => {
      window.removeEventListener('easyfarm:capture-progress', handleCaptureProgressEvent as EventListener);
      if (captureToastTimeoutRef.current) {
        clearTimeout(captureToastTimeoutRef.current);
      }
    };
  }, []);

  const [isCaptureSuccess, setIsCaptureSuccess] = useState(false);

  // Active step being configured in modal
  const [editingStep, setEditingStep] = useState<{ chainId: string; stepId: string } | null>(null);

  // Draft step state for modal editing
  const [draftStep, setDraftStep] = useState<{
    key: string;
    actionType: string;
    castTimeSeconds: number;
    repeatCount: number;
    independent: boolean;
    skillCooldownSeconds: number;
  }>({
    key: '',
    actionType: 'press',
    castTimeSeconds: 0,
    repeatCount: 1,
    independent: false,
    skillCooldownSeconds: 0,
  });

  // Reference the active rotation chain (single sequence)
  const currentChain = chains[0] || {
    id: 'chain_1',
    name: 'Ротация скиллов',
    order: 1,
    cooldown: 0,
    triggerAfterChainId: 'always',
    steps: []
  };

  // Add a step to chain
  const handleAddStepToChain = (chainId: string) => {
    const updated = chains.map(c => {
      if (c.id === chainId) {
        const nextIdx = c.steps.length + 1;
        const newStep: ChainStep = {
          id: `step_${Date.now()}_${nextIdx}`,
          key: '',
          cooldown: 8.0,
          castTimeSeconds: 0,
          repeatCount: 1,
        };
        return { ...c, steps: [...c.steps, newStep] };
      }
      return c;
    });
    onChainsChange(updated);
  };

  // Delete a step from chain
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

  // Update key inside a step
  const handleUpdateStepKey = (chainId: string, stepId: string, newKey: string) => {
    const updated = chains.map(c => {
      if (c.id !== chainId) return c;
      return {
        ...c,
        steps: c.steps.map(s => {
          if (s.id !== stepId) return s;
          return { ...s, key: newKey.toUpperCase() };
        })
      };
    });
    onChainsChange(updated);
  };

  // Update step arbitrary fields (independent, skillCooldownSeconds, etc.)
  const handleUpdateStep = (chainId: string, stepId: string, updates: Partial<ChainStep>) => {
    const updated = chains.map(c => {
      if (c.id !== chainId) return c;
      return {
        ...c,
        steps: c.steps.map(s => (s.id === stepId ? { ...s, ...updates } : s))
      };
    });
    onChainsChange(updated);
  };

  // Reset steps in current chain to empty
  const handleClearAllChainSteps = (chainId: string) => {
    const updated = chains.map(c => {
      if (c.id === chainId) {
        return {
          ...c,
          steps: c.steps.map(s => ({ ...s, key: '', castTimeSeconds: 0, repeatCount: 1 }))
        };
      }
      return c;
    });
    onChainsChange(updated);
  };

  // Target step data for the step editor modal
  const editingChain = chains.find(c => c.id === editingStep?.chainId);
  const editingStepData = editingChain?.steps.find(s => s.id === editingStep?.stepId);
  const editingStepIndex = editingChain ? editingChain.steps.findIndex(s => s.id === editingStep?.stepId) : -1;

  // Sync draft state whenever a step is selected for editing
  useEffect(() => {
    if (editingStep && editingStepData) {
      const cd = typeof editingStepData.skillCooldownSeconds === 'number'
        ? editingStepData.skillCooldownSeconds
        : (typeof editingStepData.cooldown === 'number' ? editingStepData.cooldown : 0);
      setDraftStep({
        key: editingStepData.key || '',
        actionType: editingStepData.actionType || 'press',
        castTimeSeconds: editingStepData.castTimeSeconds ?? 0,
        repeatCount: editingStepData.repeatCount ?? 1,
        independent: Boolean(editingStepData.independent),
        skillCooldownSeconds: cd,
      });
    }
  }, [editingStep?.chainId, editingStep?.stepId]);

  // Close modal on Escape key
  useEffect(() => {
    if (!editingStep) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditingStep(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingStep]);

  // Commit changes from draft to active chain
  const handleSaveStep = () => {
    if (!editingStep) return;
    const cd = Math.max(0, draftStep.skillCooldownSeconds ?? 0);
    handleUpdateStep(editingStep.chainId, editingStep.stepId, {
      key: draftStep.key.toUpperCase(),
      actionType: draftStep.actionType,
      castTimeSeconds: draftStep.castTimeSeconds,
      repeatCount: Math.min(10, Math.max(1, draftStep.repeatCount ?? 1)),
      independent: draftStep.independent,
      skillCooldownSeconds: cd,
      cooldown: cd,
    });
    setEditingStep(null);
  };

  // Capture skills snapshot action with animation, sound, and notification
  const handleCaptureSkills = async () => {
    if (isBotRunning || isCapturing) return;
    setIsCapturing(true);
    setIsCaptureSuccess(false);

    // Initial toast: "Переключитесь на игру и ждите"
    setCaptureProgress({
      stage: 'prompt_switch',
      secondsLeft: 6,
      message: 'Переключитесь на игру и ждите — съёмка начнётся автоматически',
    });

    try {
      if (typeof window !== 'undefined' && window.pywebview?.api?.capture_skills) {
        const rawRes = await window.pywebview.api.capture_skills();
        let res: any = rawRes;
        if (typeof rawRes === 'string') {
          try {
            res = JSON.parse(rawRes);
          } catch (e) {
            console.warn('capture_skills: JSON parse failed', e);
          }
        }

        // Defensive normalization of response object
        if (!res || typeof res !== 'object') {
          res = { ok: false, message: 'Не удалось распознать ответ съемки скиллов' };
        }

        // Normalize slots array (safeguard keys as string, boolean ok, etc.)
        if (Array.isArray(res.slots)) {
          res.slots = res.slots.map((s: any) => ({
            key: s?.key != null ? String(s.key) : '',
            row: s?.row || 'bottom',
            icon_png: s?.icon_png || '',
            brightness: typeof s?.brightness === 'number' ? s.brightness : 100,
            ok: Boolean(s?.ok),
            status: s?.status || (s?.ok ? 'ok' : 'проверь'),
          }));
        } else {
          res.slots = [];
        }

        setCaptureResult(res);

        // Force viewport repaint in pywebview/WebView2 upon window restore to eliminate black screen
        if (typeof window !== 'undefined') {
          requestAnimationFrame(() => {
            window.dispatchEvent(new Event('resize'));
          });
          setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
          }, 80);
        }

        // Filter out Q and C if any, and check if all remaining skills are ready/ok
        const skillSlots = res.slots.filter((s: any) => {
          const k = String(s.key || '').toLowerCase();
          return k !== 'q' && k !== 'c';
        });

        const allSkillsOk = res.ok && skillSlots.length > 0 && skillSlots.every((s: any) => Boolean(s.ok));

        if (allSkillsOk) {
          setIsCaptureSuccess(true);
          soundManager.playSkillsReady();
          setCaptureProgress({
            stage: 'done',
            secondsLeft: 0,
            message: 'Скиллы готовы! Все снимки успешно сохранены',
          });
          setTimeout(() => setIsCaptureSuccess(false), 5000);
        } else {
          setIsCaptureSuccess(false);
          soundManager.playSkillsError();
          const badCount = skillSlots.filter((s: any) => !s.ok).length;
          setCaptureProgress({
            stage: 'error',
            secondsLeft: 0,
            message: badCount > 0
              ? `${badCount} ${badCount === 1 ? 'скилл не готов' : 'скилла не готовы'} (откат или темно) — попробуйте ещё раз`
              : (res.message || 'Скиллы не готовы — попробуйте ещё раз'),
          });
        }

        // Keep toast visible for 4 seconds after completion
        if (captureToastTimeoutRef.current) clearTimeout(captureToastTimeoutRef.current);
        captureToastTimeoutRef.current = setTimeout(() => {
          setCaptureProgress(null);
        }, 4000);
      } else {
        // Preview mode simulated progression
        // 1. prompt switch (1s)
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setCaptureProgress({ stage: 'minimize', secondsLeft: 6 });
        // 2. minimize countdown
        await new Promise((resolve) => setTimeout(resolve, 800));
        setCaptureProgress({ stage: 'capture', secondsLeft: 4 });
        await new Promise((resolve) => setTimeout(resolve, 600));
        setCaptureProgress({ stage: 'capture', secondsLeft: 2 });
        await new Promise((resolve) => setTimeout(resolve, 600));
        setCaptureProgress({ stage: 'save', secondsLeft: 0 });
        await new Promise((resolve) => setTimeout(resolve, 500));

        // In preview mode: demonstrate success with sound!
        const previewSlots = createMockSkillSlots();
        setCaptureResult({
          ok: true,
          message: 'Снимки сохранены',
          slots: previewSlots,
        });
        setIsCaptureSuccess(true);
        soundManager.playSkillsReady();

        setCaptureProgress({
          stage: 'done',
          secondsLeft: 0,
          message: 'Скиллы готовы! Все снимки успешно сохранены',
        });

        setTimeout(() => setIsCaptureSuccess(false), 5000);

        if (captureToastTimeoutRef.current) clearTimeout(captureToastTimeoutRef.current);
        captureToastTimeoutRef.current = setTimeout(() => {
          setCaptureProgress(null);
        }, 4000);
      }
    } catch (err: any) {
      soundManager.playSkillsError();
      setIsCaptureSuccess(false);
      setCaptureProgress({
        stage: 'error',
        secondsLeft: 0,
        message: err?.message || 'Ошибка съемки — попробуйте ещё раз',
      });
      if (captureToastTimeoutRef.current) clearTimeout(captureToastTimeoutRef.current);
      captureToastTimeoutRef.current = setTimeout(() => {
        setCaptureProgress(null);
      }, 4000);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="w-full max-w-[480px] mx-auto flex flex-col gap-2 relative select-none">
      <div className="w-full rounded-xl p-3 shadow-[0_6px_25px_rgba(0,0,0,0.95)] flex flex-col gap-2 relative transition-all duration-200 bg-[#08080c] border border-zinc-800/90">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-2 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-200 shadow-[0_0_8px_rgba(255,255,255,0.85)]" />
            <span className="font-semibold text-zinc-200 text-xs tracking-wide">
              Ротация скиллов
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Reset Steps in Chain */}
            <button
              onClick={() => handleClearAllChainSteps(currentChain.id)}
              title="Очистить все клавиши"
              className="text-zinc-400 hover:text-white hover:bg-zinc-800/70 hover:shadow-[0_0_10px_rgba(255,255,255,0.15)] p-1 rounded transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Chain Steps Squares - Small & Compact Keycaps */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 w-full pt-1 relative min-h-[46px]">
          <div className="flex flex-wrap items-center gap-1.5 max-w-full">
            {currentChain.steps.map((step, idx) => {
              const isCasting = activeCasting?.chainId === currentChain.id && activeCasting?.stepId === step.id;
              const isIndependent = Boolean(step.independent);
              const skillCd = typeof step.skillCooldownSeconds === 'number'
                ? step.skillCooldownSeconds
                : (typeof step.cooldown === 'number' && step.independent ? step.cooldown : 0);
              const hasCd = skillCd > 0;

              return (
                <React.Fragment key={step.id}>
                  <div
                    onClick={() => setEditingStep({ chainId: currentChain.id, stepId: step.id })}
                    className={`w-[46px] h-[46px] rounded-lg p-0.5 relative flex flex-col items-center justify-center select-none group transition-all duration-200 shrink-0 cursor-pointer ${
                      isCasting
                        ? 'ring-2 ring-zinc-200 shadow-[0_0_22px_rgba(255,255,255,0.85)] scale-105 bg-[#22222d] z-20'
                        : isIndependent
                        ? 'bg-[#0b1329] border border-blue-500/80 shadow-[0_0_12px_rgba(59,130,246,0.25)] hover:border-blue-400 hover:bg-[#101b38]'
                        : 'bg-[#0d0d12] border border-zinc-800/90 hover:border-zinc-400 hover:shadow-[0_0_16px_rgba(220,225,235,0.4)] hover:bg-[#161622]'
                    }`}
                    style={{
                      boxShadow: isCasting
                        ? '0 0 18px rgba(255,255,255,0.65), inset 0 1px 0 rgba(255,255,255,0.2)'
                        : isIndependent
                        ? 'inset 0 1px 0 rgba(59,130,246,0.2), 0 2px 6px rgba(0,0,0,0.85)'
                        : 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 5px rgba(0,0,0,0.8)',
                    }}
                  >
                    {/* Step Index number in top-left */}
                    <div className="absolute top-0.5 left-1 z-10 font-mono pointer-events-none text-[8px] text-zinc-500 group-hover:text-zinc-300">
                      {idx + 1}
                    </div>

                    {/* Delete Step button in top-right (on hover) */}
                    {currentChain.steps.length > 1 && (
                      <button
                        onClick={(e) => handleDeleteStep(currentChain.id, step.id, e)}
                        title="Удалить этот шаг"
                        className="absolute -top-1 -right-1 z-30 w-3.5 h-3.5 rounded-full bg-[#181822] hover:bg-zinc-700 text-zinc-400 hover:text-white text-[8px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow border border-zinc-600 cursor-pointer"
                      >
                        ✕
                      </button>
                    )}

                    {/* Editable Key Input inside the square */}
                    <input
                      type="text"
                      maxLength={5}
                      value={step.key || ''}
                      placeholder="+"
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleUpdateStepKey(currentChain.id, step.id, e.target.value)}
                      className="w-full text-center bg-transparent font-mono font-bold text-xs uppercase text-zinc-100 group-hover:text-white group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] placeholder-zinc-700 outline-none cursor-text transition-colors tracking-wide py-0.5"
                      title="Впишите сюда клавишу (например: 1, 2, Q, E, R, F). Клик по плитке открывает редактор"
                    />

                    {/* Skill CD / Permanent badge - Bottom Left Corner */}
                    {isIndependent ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingStep({ chainId: currentChain.id, stepId: step.id });
                        }}
                        title={`Тип: Постоянно (КД: ${skillCd > 0 ? `${skillCd}с` : '0с'}) — клик для настройки`}
                        className="absolute bottom-0.5 left-0.5 z-20 px-1 py-0.2 rounded font-mono font-bold text-[7.5px] leading-tight flex items-center gap-0.5 bg-blue-950/90 hover:bg-blue-900 text-blue-200 border border-blue-500/80 shadow-[0_0_8px_rgba(59,130,246,0.3)] cursor-pointer transition select-none active:scale-95"
                      >
                        <span>⏱</span>
                        <span>{skillCd > 0 ? `${skillCd}с` : 'CD'}</span>
                      </button>
                    ) : hasCd ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingStep({ chainId: currentChain.id, stepId: step.id });
                        }}
                        title={`КД скилла: ${skillCd}с (клик для настройки)`}
                        className="absolute bottom-0.5 left-0.5 z-20 px-1 py-0.2 rounded font-mono font-bold text-[7.5px] leading-tight flex items-center gap-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-600 shadow-[0_0_8px_rgba(255,255,255,0.15)] cursor-pointer transition select-none active:scale-95"
                      >
                        <span>⏱</span>
                        <span>{skillCd}с</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingStep({ chainId: currentChain.id, stepId: step.id });
                        }}
                        title="Настроить шаг (КД / Постоянно / Время каста)"
                        className="absolute bottom-0.5 left-0.5 z-20 px-0.8 py-0.2 rounded font-mono text-[7.5px] leading-tight flex items-center text-zinc-600 hover:text-zinc-200 hover:bg-zinc-800 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                      >
                        ⏱
                      </button>
                    )}

                    {/* Repeat Count Badge - Bottom Right Corner */}
                    {step.repeatCount && step.repeatCount > 1 && (
                      <span
                        title={`Нажимать ${step.repeatCount} раз(а) подряд`}
                        className="absolute bottom-0.5 right-1 z-20 font-mono text-[7.5px] font-bold text-amber-300 bg-[#120e06] px-1 py-0.2 rounded border border-amber-500/60 shadow-[0_0_6px_rgba(245,158,11,0.3)] select-none pointer-events-none"
                      >
                        {step.repeatCount}×
                      </span>
                    )}
                  </div>
                </React.Fragment>
              );
            })}

            {/* Add Step '+' button */}
            <button
              onClick={() => handleAddStepToChain(currentChain.id)}
              title="Добавить шаг в комбинацию"
              className="w-[46px] h-[46px] rounded-lg border border-dashed border-zinc-800 hover:border-zinc-400 hover:text-white hover:bg-[#14141c] hover:shadow-[0_0_16px_rgba(255,255,255,0.3)] transition flex items-center justify-center text-zinc-500 cursor-pointer shrink-0 group"
            >
              <Plus className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Step Settings Modal: Compact & Adaptive «Редактор шага» */}
      {editingStep && editingStepData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-3 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setEditingStep(null)}
        >
          <div
            className="w-full max-w-[280px] sm:max-w-[300px] max-h-[min(520px,90vh)] overflow-y-auto bg-[#0a0b10] border border-zinc-700/80 rounded-xl p-3 shadow-[0_16px_40px_rgba(0,0,0,0.95),0_0_20px_rgba(255,255,255,0.05)] flex flex-col gap-2 text-zinc-200 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 shadow-[0_0_6px_rgba(255,255,255,0.4)] shrink-0"></span>
                <span className="font-semibold text-[11px] text-white truncate">
                  Редактор шага #{editingStepIndex + 1}
                </span>
                <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-100 font-mono font-bold text-[9.5px] border border-zinc-700/80 shrink-0">
                  [{draftStep.key || '—'}]
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingStep(null)}
                className="text-zinc-500 hover:text-white p-0.5 rounded transition text-xs cursor-pointer shrink-0"
                title="Закрыть"
              >
                ✕
              </button>
            </div>

            {/* Тип действия */}
            <div className="flex items-center justify-between gap-2 bg-[#06070a]/90 px-2.5 py-1.5 rounded-lg border border-zinc-800/80">
              <label className="text-[10px] text-zinc-400 font-medium shrink-0">
                Тип действия
              </label>
              <select
                value={draftStep.actionType}
                onChange={(e) => setDraftStep(prev => ({ ...prev, actionType: e.target.value }))}
                className="bg-[#12131b] text-zinc-200 text-[10.5px] px-2 py-1 rounded-md border border-zinc-700/80 outline-none cursor-pointer focus:border-zinc-400 max-w-[150px] truncate"
              >
                <option value="press">Нажатие клавиши</option>
                <option value="hold">Зажатие клавиши</option>
              </select>
            </div>

            {/* Время каста (сек) */}
            <div className="flex items-center justify-between gap-2 bg-[#06070a]/90 px-2.5 py-1.5 rounded-lg border border-zinc-800/80">
              <label className="text-[10px] text-zinc-400 font-medium shrink-0">
                Время каста (сек)
              </label>
              <input
                type="number"
                min="0"
                max="5"
                step="1"
                value={draftStep.castTimeSeconds}
                onChange={(e) => {
                  const val = Math.min(5, Math.max(0, parseInt(e.target.value) || 0));
                  setDraftStep(prev => ({ ...prev, castTimeSeconds: val }));
                }}
                className="w-14 bg-[#12131b] text-zinc-100 font-mono font-bold text-[11px] px-2 py-0.5 rounded-md border border-zinc-700/80 outline-none text-center focus:border-zinc-400"
              />
            </div>

            {/* Сколько раз нажимать скилл подряд */}
            <div className="flex items-center justify-between gap-2 bg-[#06070a]/90 px-2.5 py-1.5 rounded-lg border border-zinc-800/80">
              <div className="flex flex-col">
                <label className="text-[10px] text-zinc-300 font-medium">
                  Нажатий подряд
                </label>
                <span className="text-[8.5px] text-zinc-500">
                  Сколько раз нажимать подряд
                </span>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setDraftStep(prev => ({ ...prev, repeatCount: cnt }))}
                    className={`w-6 h-6 rounded-md font-mono text-[10px] font-bold transition cursor-pointer flex items-center justify-center border ${
                      (draftStep.repeatCount || 1) === cnt
                        ? 'bg-amber-600/90 text-white border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                        : 'bg-[#12131b] text-zinc-400 hover:text-white border-zinc-800 hover:bg-zinc-800'
                    }`}
                    title={`Нажимать ${cnt} раз(а) подряд`}
                  >
                    {cnt}×
                  </button>
                ))}
              </div>
            </div>

            {/* Тип скилла: Обычный (в очереди) / Постоянно (по своему КД) */}
            <div className="flex flex-col gap-1.5 bg-[#06070a]/90 p-2 rounded-lg border border-zinc-800/80">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-zinc-400 font-medium">
                  Тип запуска скилла
                </label>
                {draftStep.independent ? (
                  <span className="text-[9px] font-bold text-blue-400 bg-blue-950/80 px-1.5 py-0.2 rounded border border-blue-500/60 shadow-[0_0_6px_rgba(59,130,246,0.2)]">
                    Постоянно по КД
                  </span>
                ) : (
                  <span className="text-[9px] text-zinc-500 bg-zinc-900 px-1.5 py-0.2 rounded border border-zinc-800">
                    По очереди
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-1.5 p-0.5 rounded-lg bg-[#0e0f17] border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setDraftStep(prev => ({ ...prev, independent: false }))}
                  className={`py-1 px-2 rounded-md text-[10.5px] font-semibold transition cursor-pointer flex items-center justify-center gap-1 ${
                    !draftStep.independent
                      ? 'bg-zinc-800 text-white border border-zinc-600 shadow-[0_0_10px_rgba(255,255,255,0.12)]'
                      : 'text-zinc-400 hover:text-zinc-200 border border-transparent hover:bg-zinc-800/40'
                  }`}
                >
                  <span>Обычный</span>
                  <span className="text-[8.5px] opacity-70 font-normal">(в очереди)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDraftStep(prev => ({
                    ...prev,
                    independent: true,
                    skillCooldownSeconds: (!prev.skillCooldownSeconds || prev.skillCooldownSeconds === 0) ? 6 : prev.skillCooldownSeconds,
                  }))}
                  className={`py-1 px-2 rounded-md text-[10.5px] font-semibold transition cursor-pointer flex items-center justify-center gap-1 ${
                    draftStep.independent
                      ? 'bg-blue-600 text-white border border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.45)]'
                      : 'text-zinc-400 hover:text-blue-300 border border-transparent hover:bg-blue-950/30'
                  }`}
                >
                  <span>⚡ Постоянно</span>
                  <span className="text-[8.5px] opacity-80 font-normal">(по КД)</span>
                </button>
              </div>
            </div>

            {/* КД скилла (сек) */}
            <div className={`flex flex-col gap-1.5 p-2.5 rounded-lg border transition-all ${
              draftStep.independent
                ? 'bg-[#0a0f1d] border-blue-500/60 shadow-[inset_0_0_12px_rgba(59,130,246,0.06)]'
                : 'bg-[#06070a]/90 border-zinc-700/80 shadow-[inset_0_0_10px_rgba(255,255,255,0.02)]'
            }`}>
              <div className="flex items-center justify-between gap-2">
                <label className="text-[10px] text-zinc-200 font-semibold shrink-0 flex items-center gap-1.5">
                  <Clock className={`w-3.5 h-3.5 ${draftStep.independent ? 'text-blue-400' : 'text-zinc-400'}`} />
                  <span>КД скилла (сек)</span>
                </label>
                <div className="flex items-center gap-1 bg-[#12131b] px-2 py-0.5 rounded-md border border-zinc-700/80 focus-within:border-zinc-400">
                  <input
                    type="number"
                    min="0"
                    max="300"
                    step="1"
                    value={draftStep.skillCooldownSeconds}
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value) || 0);
                      setDraftStep(prev => ({ ...prev, skillCooldownSeconds: val }));
                    }}
                    className={`w-12 bg-transparent text-center font-mono font-bold text-[11px] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                      draftStep.independent ? 'text-blue-200 font-black' : 'text-zinc-100'
                    }`}
                  />
                  <span className="text-[9.5px] text-zinc-400 font-mono">сек</span>
                </div>
              </div>

              {/* Быстрые кнопки пресетов */}
              <div className="flex flex-wrap items-center gap-1 pt-0.5">
                <span className="text-[9px] text-zinc-500">Быстро:</span>
                {[0, 3, 6, 8, 12, 15, 20, 24, 30].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setDraftStep(prev => ({ ...prev, skillCooldownSeconds: sec }))}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition cursor-pointer border ${
                      draftStep.skillCooldownSeconds === sec
                        ? draftStep.independent
                          ? 'bg-blue-900/80 text-white border-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.4)]'
                          : 'bg-[#1e1e28] text-white border-zinc-400 shadow-[0_0_8px_rgba(255,255,255,0.2)]'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700/60 hover:text-white hover:bg-zinc-700'
                    }`}
                  >
                    {sec}с
                  </button>
                ))}
              </div>

              {/* Подсказка */}
              <div className={`p-1.5 rounded-md border text-[9.5px] leading-tight flex items-start gap-1 mt-0.5 ${
                draftStep.independent
                  ? 'bg-blue-950/40 border-blue-800/60 text-blue-200'
                  : 'bg-zinc-900 border border-zinc-700/60 text-zinc-300'
              }`}>
                <span className="shrink-0 text-zinc-400">⏱</span>
                <span>
                  {draftStep.independent
                    ? `Скилл нажимается постоянно по своему КД (${draftStep.skillCooldownSeconds || 0}с) независимо от остальной комбинации.`
                    : draftStep.skillCooldownSeconds > 0
                    ? `Скилл нажимается по очереди в комбинации с проверкой КД (${draftStep.skillCooldownSeconds}с).`
                    : 'Скилл нажимается строго по очереди в комбинации.'}
                </span>
              </div>
            </div>

            {/* Footer Buttons: Отмена / Сохранить шаг */}
            <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/80 mt-0.5">
              <button
                type="button"
                onClick={() => setEditingStep(null)}
                className="flex-1 py-1 px-2 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[11px] font-medium border border-zinc-700/80 transition cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSaveStep}
                className="flex-1 py-1.5 px-2 rounded-lg bg-[#181822] hover:bg-[#22222e] text-zinc-100 hover:text-white text-[11px] font-medium border border-zinc-600 hover:border-zinc-300 shadow-[0_0_12px_rgba(255,255,255,0.18)] transition cursor-pointer"
              >
                Сохранить шаг
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Capture Skills Progress Toast (displays during countdown, persists 4s after finish) */}
      <CaptureProgressToast
        progress={captureProgress}
        onDismiss={() => setCaptureProgress(null)}
      />

      {/* Capture Skills Result Modal (opens on «Посмотреть скилы») */}
      <CaptureSkillsModal
        isOpen={isCaptureModalOpen}
        result={captureResult}
        onClose={() => setIsCaptureModalOpen(false)}
        onRetry={handleCaptureSkills}
        isLoading={isCapturing}
      />
    </div>
  );
};
