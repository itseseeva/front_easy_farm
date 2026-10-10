import React, { useState, useRef, useEffect } from 'react';
import { ComboChain, ChainStep } from '../data/skillsLibrary';
import { Plus, Clock, CornerDownRight, ChevronUp, ChevronDown, RotateCcw, AlertCircle, Trash2, Camera, Loader2, Sparkles, CheckCircle2, Eye, Zap, ArrowRight } from 'lucide-react';
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
  const [isViewSkillsTipHovered, setIsViewSkillsTipHovered] = useState(false);
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

  // Active Chain for vertical navigation
  const [activeChainIndex, setActiveChainIndex] = useState(0);

  // Exclamation mark tooltips & capture button hover state
  const [isPeriodicityTipHovered, setIsPeriodicityTipHovered] = useState(false);
  const [isCastTimeTipHovered, setIsCastTimeTipHovered] = useState(false);
  const [isCaptureButtonTipHovered, setIsCaptureButtonTipHovered] = useState(false);
  const [isCaptureSuccess, setIsCaptureSuccess] = useState(false);

  // Active step being configured in modal
  const [editingStep, setEditingStep] = useState<{ chainId: string; stepId: string } | null>(null);

  // Draft step state for modal editing
  const [draftStep, setDraftStep] = useState<{
    key: string;
    actionType: string;
    castTimeSeconds: number;
    independent: boolean;
    skillCooldownSeconds: number;
  }>({
    key: '',
    actionType: 'press',
    castTimeSeconds: 0,
    independent: false,
    skillCooldownSeconds: 6,
  });

  // Keep active index within valid bounds
  const validChainIndex = Math.min(Math.max(0, activeChainIndex), Math.max(0, chains.length - 1));

  // Vertical touch swipe handling
  const touchStartY = useRef<number | null>(null);
  const touchDeltaY = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchDeltaY.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    touchDeltaY.current = e.touches[0].clientY - touchStartY.current;
  };

  const handleTouchEnd = () => {
    if (touchStartY.current === null) return;
    const threshold = 40;
    if (touchDeltaY.current < -threshold && validChainIndex < chains.length - 1) {
      setActiveChainIndex(validChainIndex + 1);
    } else if (touchDeltaY.current > threshold && validChainIndex > 0) {
      setActiveChainIndex(validChainIndex - 1);
    }
    touchStartY.current = null;
    touchDeltaY.current = 0;
  };

  // Mouse wheel vertical navigation
  const lastWheelTime = useRef<number>(0);
  const handleWheel = (e: React.WheelEvent) => {
    if (chains.length <= 1) return;
    const now = Date.now();
    if (now - lastWheelTime.current < 450) return;
    if (Math.abs(e.deltaY) > 25) {
      if (e.deltaY > 0 && validChainIndex < chains.length - 1) {
        lastWheelTime.current = now;
        setActiveChainIndex(validChainIndex + 1);
      } else if (e.deltaY < 0 && validChainIndex > 0) {
        lastWheelTime.current = now;
        setActiveChainIndex(validChainIndex - 1);
      }
    }
  };

  // Add new chain
  const handleAddChain = () => {
    const nextOrder = chains.length + 1;
    const newChainId = `chain_${Date.now()}`;

    const newChain: ComboChain = {
      id: newChainId,
      name: `Приоритет`,
      order: nextOrder,
      cooldown: 0,
      triggerAfterChainId: 'priority',
      steps: [
        { id: `step_${Date.now()}_1`, key: '1', cooldown: 8.0, castTimeSeconds: 0, repeatCount: 1 },
        { id: `step_${Date.now()}_2`, key: '2', cooldown: 8.0, castTimeSeconds: 0, repeatCount: 1 },
        { id: `step_${Date.now()}_3`, key: '3', cooldown: 8.0, castTimeSeconds: 0, repeatCount: 1 },
      ]
    };

    const nextIndex = chains.length;
    onChainsChange([...chains, newChain]);
    // Allow the browser to paint the new chain in its initial offscreen position (translateY(100%)),
    // then trigger the slide transition smoothly to the new chain, identical to slide on delete/navigation!
    setTimeout(() => {
      setActiveChainIndex(nextIndex);
    }, 40);
  };

  // Move chain up in list (higher priority)
  const handleMoveChainUp = (index: number) => {
    if (index <= 0) return;
    const newChains = [...chains];
    const temp = newChains[index];
    newChains[index] = newChains[index - 1];
    newChains[index - 1] = temp;
    const reordered = newChains.map((c, idx) => ({ ...c, order: idx + 1 }));
    onChainsChange(reordered);
    setActiveChainIndex(index - 1);
  };

  // Move chain down in list (lower priority)
  const handleMoveChainDown = (index: number) => {
    if (index >= chains.length - 1) return;
    const newChains = [...chains];
    const temp = newChains[index];
    newChains[index] = newChains[index + 1];
    newChains[index + 1] = temp;
    const reordered = newChains.map((c, idx) => ({ ...c, order: idx + 1 }));
    onChainsChange(reordered);
    setActiveChainIndex(index + 1);
  };

  // Remove chain
  const handleRemoveChain = (chainId: string) => {
    if (chains.length <= 1) return;
    const filtered = chains.filter(c => c.id !== chainId);
    const reordered = filtered.map((c, idx) => ({ ...c, order: idx + 1 }));
    onChainsChange(reordered);
    setActiveChainIndex(prev => Math.min(prev, Math.max(0, reordered.length - 1)));
  };

  // Update chain attributes
  const handleUpdateChain = (chainId: string, updates: Partial<ComboChain>) => {
    const updated = chains.map(c => (c.id === chainId ? { ...c, ...updates } : c));
    onChainsChange(updated);
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

  // Cycle step seconds (cast / hold duration): 0s -> 1s -> 2s -> 3s -> 4s -> 5s -> 0s
  const handleCycleStepCastTime = (chainId: string, stepId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const updated = chains.map(c => {
      if (c.id !== chainId) return c;
      return {
        ...c,
        steps: c.steps.map(s => {
          if (s.id !== stepId) return s;
          const current = s.castTimeSeconds ?? 0;
          const next = current >= MAX_CAST_SECONDS ? 0 : current + 1;
          return { ...s, castTimeSeconds: next };
        })
      };
    });
    onChainsChange(updated);
  };

  // Cycle step multiplier (number of repeated sequential presses): 1 -> 2 -> 3 -> 1
  const MAX_REPEAT = 3;
  const handleCycleStepRepeat = (chainId: string, stepId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const updated = chains.map(c => {
      if (c.id !== chainId) return c;
      return {
        ...c,
        steps: c.steps.map(s => {
          if (s.id !== stepId) return s;
          const current = s.repeatCount ?? 1;
          const next = current >= MAX_REPEAT ? 1 : current + 1;
          return { ...s, repeatCount: next };
        })
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
      setDraftStep({
        key: editingStepData.key || '',
        actionType: editingStepData.actionType || 'press',
        castTimeSeconds: editingStepData.castTimeSeconds ?? 0,
        independent: Boolean(editingStepData.independent),
        skillCooldownSeconds: editingStepData.skillCooldownSeconds ?? 6,
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
    handleUpdateStep(editingStep.chainId, editingStep.stepId, {
      key: draftStep.key.toUpperCase(),
      actionType: draftStep.actionType,
      castTimeSeconds: draftStep.castTimeSeconds,
      independent: draftStep.independent,
      skillCooldownSeconds: draftStep.independent ? (draftStep.skillCooldownSeconds || 6) : undefined,
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
    <div
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="w-full max-w-[480px] mx-auto flex flex-col gap-2 relative select-none"
    >
      {/* Sliding Carousel Frame */}
      <div className="relative w-full">
        {/* Top Arrow Button: navigate up */}
        {chains.length > 1 && validChainIndex > 0 && (
          <button
            onClick={() => setActiveChainIndex(validChainIndex - 1)}
            className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center w-12 h-4 rounded-full bg-[#0c0c11]/95 hover:bg-[#1a1a24] text-zinc-400 hover:text-white border border-zinc-700/80 hover:border-zinc-400 shadow-[0_4px_16px_rgba(0,0,0,0.9),0_0_10px_rgba(255,255,255,0.12)] backdrop-blur-md transition cursor-pointer"
            title={`Предыдущая: ${chains[validChainIndex - 1]?.triggerAfterChainId === 'priority' ? 'Приоритет' : 'Постоянно'}`}
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Bottom Arrow Button: navigate down */}
        {chains.length > 1 && validChainIndex < chains.length - 1 && (
          <button
            onClick={() => setActiveChainIndex(validChainIndex + 1)}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center w-12 h-4 rounded-full bg-[#0c0c11]/95 hover:bg-[#1a1a24] text-zinc-400 hover:text-white border border-zinc-700/80 hover:border-zinc-400 shadow-[0_4px_16px_rgba(0,0,0,0.9),0_0_10px_rgba(255,255,255,0.12)] backdrop-blur-md transition cursor-pointer"
            title={`Следующая: ${chains[validChainIndex + 1]?.triggerAfterChainId === 'priority' ? 'Приоритет' : 'Постоянно'}`}
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Sliding Vertical Track */}
        <div className="w-full grid grid-cols-1 grid-rows-1 overflow-hidden rounded-xl">
          {chains.map((chain, chainIdx) => {
            const offset = chainIdx - validChainIndex;
            const isCurrent = offset === 0;
            const isPriority = chain.triggerAfterChainId === 'priority';
            const priorityChains = chains.filter(c => c.triggerAfterChainId === 'priority');
            const priorityRank = priorityChains.findIndex(c => c.id === chain.id);

            return (
              <div
                key={chain.id}
                className={`w-full col-start-1 row-start-1 transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  isCurrent ? 'z-10 opacity-100 pointer-events-auto' : 'z-0 opacity-0 pointer-events-none'
                }`}
                style={{
                  transform: `translateY(${offset * 100}%)`,
                  visibility: Math.abs(offset) <= 1 ? 'visible' : 'hidden',
                }}
              >
                <div
                  className={`w-full rounded-xl p-3 shadow-[0_6px_25px_rgba(0,0,0,0.95)] flex flex-col gap-2.5 relative transition-all duration-200 ${
                    isPriority
                      ? 'bg-[#0c0905] border-2 border-amber-500/90 shadow-[0_0_24px_rgba(245,158,11,0.2),inset_0_1px_0_rgba(251,191,36,0.15)]'
                      : 'bg-[#08080c] border border-zinc-800/90'
                  }`}
                >
                  {/* Chain Header & Parameters */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-2 text-xs">
                    {/* Left: Priority / Permanent Badge & Order */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          isPriority
                            ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]'
                            : 'bg-zinc-200 shadow-[0_0_8px_rgba(255,255,255,0.85)]'
                        }`}
                      />

                      {/* Mode Badge (Приоритет или Постоянно) */}
                      {isPriority ? (
                        <div
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/80 text-amber-300 font-bold text-[10.5px] tracking-wide shadow-[0_0_10px_rgba(245,158,11,0.3)] select-none shrink-0"
                          title="Приоритетная цепочка: проверяется сверху вниз при готовности скиллов"
                        >
                          <Zap className="w-2.5 h-2.5 fill-amber-400 text-amber-400 shrink-0" />
                          <span>{priorityRank !== -1 ? `Приоритет ${priorityRank + 1}` : 'Приоритет'}</span>
                        </div>
                      ) : (
                        <div
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800/80 border border-zinc-700/80 text-zinc-200 font-semibold text-[10.5px] tracking-wide shadow-[0_0_8px_rgba(255,255,255,0.06)] select-none shrink-0"
                          title="Постоянная цепочка"
                        >
                          <span>Постоянно</span>
                        </div>
                      )}

                      <span className="text-zinc-500 font-mono text-[10px]">
                        (№ {chain.order})
                      </span>
                    </div>

                    {/* Right: Actions (Reorder ▲▼, Reset, Delete) */}
                    <div className="flex items-center gap-1">
                      {/* Move Up */}
                      <button
                        type="button"
                        disabled={chainIdx === 0}
                        onClick={() => handleMoveChainUp(chainIdx)}
                        title="Поднять цепочку выше (повысить приоритет)"
                        className="text-zinc-400 hover:text-white hover:bg-zinc-800/70 p-1 rounded transition cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed text-[10px] flex items-center justify-center leading-none"
                      >
                        ▲
                      </button>

                      {/* Move Down */}
                      <button
                        type="button"
                        disabled={chainIdx === chains.length - 1}
                        onClick={() => handleMoveChainDown(chainIdx)}
                        title="Опустить цепочку ниже (понизить приоритет)"
                        className="text-zinc-400 hover:text-white hover:bg-zinc-800/70 p-1 rounded transition cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed text-[10px] flex items-center justify-center leading-none"
                      >
                        ▼
                      </button>

                      {/* Reset Steps in Chain */}
                      <button
                        onClick={() => handleClearAllChainSteps(chain.id)}
                        title="Очистить все клавиши в этой цепочке"
                        className="text-zinc-400 hover:text-white hover:bg-zinc-800/70 hover:shadow-[0_0_10px_rgba(255,255,255,0.15)] p-1 rounded transition cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Chain (if > 1) */}
                      {chains.length > 1 && (
                        <button
                          onClick={() => handleRemoveChain(chain.id)}
                          title="Удалить эту цепочку"
                          className="text-zinc-400 hover:text-zinc-200 text-[11px] px-1.5 py-0.5 rounded bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-600 transition cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Flow Trigger & Periodicity Settings */}
                  <div
                    className={`flex flex-wrap items-center justify-between gap-2 text-[11px] p-1.5 rounded-lg border transition-colors ${
                      isPriority
                        ? 'bg-[#120d06] border-amber-800/70'
                        : 'bg-[#040406] border-zinc-800/80'
                    }`}
                  >
                    {/* Execution Trigger: Only 2 options (Постоянно и Приоритет) */}
                    <div className="flex items-center gap-1 text-zinc-400">
                      <CornerDownRight className={`w-3 h-3 shrink-0 ${isPriority ? 'text-amber-400' : 'text-zinc-500'}`} />
                      <span className="text-[10px]">{isPriority ? 'Режим:' : 'Пуск:'}</span>
                      <select
                        value={isPriority ? 'priority' : 'always'}
                        onChange={(e) => {
                          const newTrigger = e.target.value;
                          handleUpdateChain(chain.id, {
                            triggerAfterChainId: newTrigger,
                            name: newTrigger === 'priority' ? 'Приоритет' : 'Постоянно',
                          });
                        }}
                        className={`px-1.5 py-0.5 rounded border outline-none text-[11px] cursor-pointer focus:border-zinc-400 ${
                          isPriority
                            ? 'bg-[#181208] border-amber-600/90 text-amber-200 font-semibold shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                            : 'bg-[#0e0e14] border-zinc-700/80 text-zinc-200'
                        }`}
                      >
                        <option value="always">Постоянно</option>
                        <option value="priority">Приоритет</option>
                      </select>
                    </div>

                    {/* Periodicity (Cooldown) */}
                    <div className="flex items-center gap-1 text-zinc-400">
                      <Clock className={`w-3 h-3 shrink-0 ${isPriority ? 'text-amber-400' : 'text-zinc-500'}`} />
                      <span className="text-[10px]">{isPriority ? 'Запасной CD:' : 'Период:'}</span>
                      <div
                        className={`rounded px-1 py-0.5 shadow-inner border focus-within:border-zinc-400 ${
                          isPriority
                            ? 'bg-[#181208] border-amber-600/80'
                            : 'bg-[#0e0e14] border-zinc-700/80'
                        }`}
                        title={isPriority ? "Запасной таймер, если бот не видит откат на панели. 0 — только по готовности скиллов" : undefined}
                      >
                        <input
                          type="number"
                          step="1"
                          min="0"
                          max="300"
                          value={chain.cooldown ?? 0}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            handleUpdateChain(chain.id, { cooldown: val });
                          }}
                          className={`w-7 bg-transparent text-[11px] font-mono outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                            isPriority ? 'text-amber-200 font-bold' : 'text-zinc-100'
                          }`}
                          title={isPriority ? "Запасной таймер, если бот не видит откат на панели. 0 — только по готовности скиллов" : "Периодичность (сек)"}
                        />
                      </div>
                      <span className={`text-[10px] ${isPriority ? 'text-amber-400/80' : 'text-zinc-500'}`}>с</span>

                      {/* Exclamation 1: Periodicity */}
                      <div
                        onMouseEnter={() => setIsPeriodicityTipHovered(true)}
                        onMouseLeave={() => setIsPeriodicityTipHovered(false)}
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center cursor-help transition ${
                          isPeriodicityTipHovered
                            ? isPriority
                              ? 'text-amber-200 bg-amber-900/90 shadow-[0_0_10px_rgba(245,158,11,0.6)] scale-110'
                              : 'text-white bg-zinc-800/90 shadow-[0_0_10px_rgba(255,255,255,0.5)] scale-110'
                            : isPriority
                            ? 'text-amber-400 hover:text-amber-200'
                            : 'text-zinc-400/80 hover:text-white'
                        }`}
                        title={isPriority ? "Запасной таймер, если бот не видит откат на панели. 0 — только по готовности скиллов" : "Подсказка о периодичности"}
                      >
                        <AlertCircle className="w-3.5 h-3.5 stroke-[2.2]" />
                      </div>

                      {/* Exclamation 2: Cast Seconds */}
                      <div
                        onMouseEnter={() => setIsCastTimeTipHovered(true)}
                        onMouseLeave={() => setIsCastTimeTipHovered(false)}
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center cursor-help transition ${
                          isCastTimeTipHovered
                            ? 'text-white bg-zinc-800/90 shadow-[0_0_10px_rgba(255,255,255,0.5)] scale-110'
                            : 'text-zinc-400/80 hover:text-white'
                        }`}
                        title="Время каста спела в секундах"
                      >
                        <AlertCircle className="w-3.5 h-3.5 stroke-[2.2]" />
                      </div>
                    </div>
                  </div>

                  {/* Chain Steps Squares - Small & Compact Keycaps with Grey Glowing Effect */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 w-full pt-1 relative min-h-[46px]">
                    <div className="flex flex-wrap items-center gap-1.5 max-w-full">
                      {chain.steps.map((step, idx) => {
                        const isCasting = activeCasting?.chainId === chain.id && activeCasting?.stepId === step.id;
                        const castSec = step.castTimeSeconds ?? 0;
                        const isIndependent = Boolean(step.independent);
                        const skillCd = step.skillCooldownSeconds ?? 6;

                        return (
                          <React.Fragment key={step.id}>
                            {/* Directional arrow between priority steps (1 → 2 → 3) */}
                            {idx > 0 && isPriority && (
                              <div
                                className="flex items-center justify-center text-amber-400/90 select-none shrink-0 -mx-0.5"
                                title="Строгий порядок нажатия: следующий шаг"
                              >
                                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                              </div>
                            )}

                            <div
                              className={`w-[46px] h-[46px] rounded-lg p-0.5 relative flex flex-col items-center justify-center select-none group transition-all duration-200 shrink-0 ${
                                isCasting
                                  ? 'ring-2 ring-zinc-200 shadow-[0_0_22px_rgba(255,255,255,0.85)] scale-105 bg-[#22222d] z-20'
                                  : isPriority
                                  ? 'bg-[#120e08] border border-amber-600/80 shadow-[0_0_12px_rgba(245,158,11,0.15)] hover:border-amber-400 hover:bg-[#1a140b]'
                                  : isIndependent
                                  ? 'bg-[#0e1017] border border-zinc-600/90 shadow-[0_0_10px_rgba(255,255,255,0.06)] hover:border-zinc-300 hover:bg-[#151722]'
                                  : 'bg-[#0d0d12] border border-zinc-800/90 hover:border-zinc-400 hover:shadow-[0_0_16px_rgba(220,225,235,0.4)] hover:bg-[#161622]'
                              }`}
                              style={{
                                boxShadow: isCasting
                                  ? '0 0 18px rgba(255,255,255,0.65), inset 0 1px 0 rgba(255,255,255,0.2)'
                                  : isPriority
                                  ? 'inset 0 1px 0 rgba(251,191,36,0.15), 0 2px 6px rgba(0,0,0,0.85)'
                                  : isIndependent
                                  ? 'inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 6px rgba(0,0,0,0.85)'
                                  : 'inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 5px rgba(0,0,0,0.8)',
                              }}
                            >
                              {/* Step Index number in top-left */}
                              <div
                                className={`absolute top-0.5 left-1 z-10 font-mono pointer-events-none ${
                                  isPriority
                                    ? 'text-[8.5px] font-bold text-amber-300 drop-shadow-[0_0_4px_rgba(245,158,11,0.6)]'
                                    : 'text-[8px] text-zinc-500 group-hover:text-zinc-300'
                                }`}
                              >
                                {idx + 1}
                              </div>

                            {/* Delete Step button in top-right (on hover) */}
                            {chain.steps.length > 1 && (
                              <button
                                onClick={(e) => handleDeleteStep(chain.id, step.id, e)}
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
                              onChange={(e) => handleUpdateStepKey(chain.id, step.id, e.target.value)}
                              className="w-full text-center bg-transparent font-mono font-bold text-xs uppercase text-zinc-100 group-hover:text-white group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] placeholder-zinc-700 outline-none cursor-text transition-colors tracking-wide py-0.5"
                              title="Впишите сюда клавишу (например: 1, 2, Q, E, R, F, Shift+Q)"
                            />

                            {/* Independent CD badge (⏱6с) - Bottom Left Corner */}
                            {isIndependent ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingStep({ chainId: chain.id, stepId: step.id });
                                }}
                                title={`Жать по своему КД: ${skillCd}с (нажмите для настройки)`}
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
                                  setEditingStep({ chainId: chain.id, stepId: step.id });
                                }}
                                title="Настроить шаг: Жать по своему КД"
                                className="absolute bottom-0.5 left-0.5 z-20 px-0.8 py-0.2 rounded font-mono text-[7.5px] leading-tight flex items-center text-zinc-600 hover:text-zinc-200 hover:bg-zinc-800 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                              >
                                ⏱
                              </button>
                            )}

                            {/* Seconds badge (Система секунд из кнопок) - Bottom Right Corner */}
                            <button
                              type="button"
                              onClick={(e) => handleCycleStepCastTime(chain.id, step.id, e)}
                              onMouseEnter={() => setIsCastTimeTipHovered(true)}
                              onMouseLeave={() => setIsCastTimeTipHovered(false)}
                              title="Время каста спела в секундах (клик: 0s → 1s → 2s → 3s → 4s → 5s → 0s)"
                              className={`absolute bottom-0.5 right-0.5 z-20 px-1 py-0.2 rounded font-mono font-bold text-[8px] flex items-center justify-center transition-all cursor-pointer select-none active:scale-95 ${
                                castSec > 0
                                  ? 'bg-zinc-700/80 text-zinc-100 border border-zinc-500 shadow-[0_0_10px_rgba(255,255,255,0.4)]'
                                  : 'text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800'
                              }`}
                            >
                              {castSec > 0 ? `${castSec}s` : '0s'}
                            </button>
                          </div>
                        </React.Fragment>
                      );
                    })}

                    {/* Add Step '+' button */}
                    <button
                      onClick={() => handleAddStepToChain(chain.id)}
                      title="Добавить шаг в комбинацию"
                      className="w-[46px] h-[46px] rounded-lg border border-dashed border-zinc-800 hover:border-zinc-400 hover:text-white hover:bg-[#14141c] hover:shadow-[0_0_16px_rgba(255,255,255,0.3)] transition flex items-center justify-center text-zinc-500 cursor-pointer shrink-0 group"
                    >
                      <Plus className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                    </button>
                  </div>

                  {/* Notification Box in the empty area on the right (exclamation marks, capture skills button & view skills button) */}
                  {chainIdx === validChainIndex && (isPeriodicityTipHovered || isCastTimeTipHovered || isCaptureButtonTipHovered || isViewSkillsTipHovered) && (
                    <div className="absolute right-0 bottom-0 z-30 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                      <div className="w-[220px] sm:w-[245px] h-[46px] px-2.5 py-1 rounded-xl bg-[#0b0b10]/98 border border-zinc-600 text-zinc-100 shadow-[0_8px_30px_rgba(0,0,0,0.95),0_0_16px_rgba(255,255,255,0.16)] backdrop-blur-md flex flex-col justify-center">
                        {isViewSkillsTipHovered ? (
                          <>
                            <div className="flex items-center gap-1.5 leading-none mb-1">
                              <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-zinc-800/90 text-zinc-100 font-mono font-bold text-[9px] border border-zinc-600 shadow-[0_0_6px_rgba(255,255,255,0.12)]">
                                Обзор
                              </span>
                              <span className="font-semibold text-zinc-100 text-[11px] truncate drop-shadow-[0_0_6px_rgba(255,255,255,0.2)]">
                                Посмотреть скилы
                              </span>
                            </div>
                            <p className="text-[9.5px] leading-tight text-zinc-300 font-normal truncate">
                              Показывает 12 слотов скиллов и состояние готовности
                            </p>
                          </>
                        ) : isCaptureButtonTipHovered ? (
                          <>
                            <div className="flex items-center gap-1.5 leading-none mb-1">
                              <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-zinc-800/90 text-zinc-100 font-mono font-bold text-[9px] border border-zinc-600 shadow-[0_0_6px_rgba(255,255,255,0.12)]">
                                Снимок
                              </span>
                              <span className="font-semibold text-zinc-100 text-[11px] truncate drop-shadow-[0_0_6px_rgba(255,255,255,0.2)]">
                                Снять скиллы
                              </span>
                            </div>
                            <p className="text-[9.5px] leading-tight text-zinc-300 font-normal truncate">
                              Фотографирует панель скиллов в игре для распознавания откатов
                            </p>
                          </>
                        ) : isPeriodicityTipHovered ? (
                          isPriority ? (
                            <>
                              <div className="flex items-center gap-1.5 leading-none mb-1">
                                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-amber-950/90 text-amber-200 font-mono font-bold text-[9px] border border-amber-600 shadow-[0_0_6px_rgba(245,158,11,0.25)]">
                                  Запасной CD
                                </span>
                                <span className="font-semibold text-amber-200 text-[11px] truncate drop-shadow-[0_0_6px_rgba(245,158,11,0.3)]">
                                  Период (приоритет)
                                </span>
                              </div>
                              <p className="text-[9px] leading-tight text-amber-100/90 font-normal">
                                Запасной таймер, если бот не видит откат на панели. 0 — только по готовности скиллов
                              </p>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-1.5 leading-none mb-1">
                                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-zinc-800/90 text-zinc-100 font-mono font-bold text-[9px] border border-zinc-600 shadow-[0_0_6px_rgba(255,255,255,0.12)]">
                                  CD
                                </span>
                                <span className="font-semibold text-zinc-100 text-[11px] truncate drop-shadow-[0_0_6px_rgba(255,255,255,0.2)]">
                                  Периодичность
                                </span>
                              </div>
                              <p className="text-[9.5px] leading-tight text-zinc-300 font-normal truncate">
                                Откат самого долгого умения цепочки.
                              </p>
                            </>
                          )
                        ) : (
                            <>
                              <div className="flex items-center gap-1.5 leading-none mb-1">
                                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-zinc-800/90 text-zinc-100 font-mono font-bold text-[9px] border border-zinc-600 shadow-[0_0_6px_rgba(255,255,255,0.12)]">
                                  0s...5s
                                </span>
                                <span className="font-semibold text-zinc-100 text-[11px] truncate drop-shadow-[0_0_6px_rgba(255,255,255,0.2)]">
                                  Время каста
                                </span>
                              </div>
                              <p className="text-[9.5px] leading-tight text-zinc-300 font-normal truncate">
                                Время каста спела в секундах
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom controls: Add new chain & chain counter */}
      <div className="flex items-center justify-between px-1 text-xs text-zinc-500">
        <button
          onClick={handleAddChain}
          className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition cursor-pointer py-0.5 px-1.5 rounded hover:bg-[#121218] border border-transparent hover:border-zinc-700 hover:shadow-[0_0_10px_rgba(255,255,255,0.12)]"
          title="Создать ещё одну цепочку комбинаций"
        >
          <Plus className="w-3 h-3 text-zinc-300" />
          <span>Добавить цепочку</span>
        </button>

        <span className="text-[10px] font-mono text-zinc-500">
          Цепочка {validChainIndex + 1} из {chains.length}
        </span>
      </div>

      {/* Bottom Action Controls: «Снять скиллы» & «Посмотреть скилы» */}
      <div className="flex items-center justify-center gap-2 pt-2 border-t border-zinc-800/80 mt-1 w-full">
        {/* Button 1: Снять скиллы */}
        <button
          type="button"
          disabled={isBotRunning || isCapturing}
          onClick={handleCaptureSkills}
          onMouseEnter={() => setIsCaptureButtonTipHovered(true)}
          onMouseLeave={() => setIsCaptureButtonTipHovered(false)}
          className={`flex-1 max-w-[210px] relative group overflow-hidden flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all duration-300 cursor-pointer select-none border active:scale-95 ${
            isBotRunning
              ? 'bg-[#0a0a0f] border-zinc-800/50 text-zinc-500 cursor-not-allowed opacity-50'
              : isCapturing
              ? 'bg-gradient-to-r from-violet-950/60 via-indigo-950/70 to-purple-950/60 border-indigo-500/80 text-indigo-100 shadow-[0_0_25px_rgba(99,102,241,0.35)]'
              : isCaptureSuccess
              ? 'bg-gradient-to-r from-emerald-950/70 via-teal-900/60 to-emerald-950/70 border-emerald-400 text-emerald-100 shadow-[0_0_30px_rgba(16,185,129,0.45)]'
              : 'bg-gradient-to-b from-[#181926] via-[#10111a] to-[#0a0b12] hover:from-[#202235] hover:to-[#121320] text-zinc-100 border-zinc-700/80 hover:border-zinc-400 shadow-[0_4px_20px_rgba(0,0,0,0.8),0_0_15px_rgba(255,255,255,0.06)] hover:shadow-[0_4px_25px_rgba(0,0,0,0.9),0_0_22px_rgba(255,255,255,0.18)]'
          }`}
        >
          {/* Subtle glowing ambient pulse when capturing */}
          {isCapturing && (
            <span className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/20 to-indigo-500/10 animate-pulse pointer-events-none" />
          )}

          {/* Animated Sheen effect on hover */}
          <span className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:left-[100%] transition-all duration-1000 ease-in-out pointer-events-none" />

          {isCapturing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 text-indigo-300 animate-spin shrink-0" />
              <span className="relative z-10 text-indigo-200 animate-pulse text-[11.5px] truncate">
                Снимаю…
              </span>
            </>
          ) : isCaptureSuccess ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="relative z-10 text-emerald-200 text-[11.5px]">
                Готовы!
              </span>
            </>
          ) : (
            <>
              <Camera className="w-3.5 h-3.5 text-zinc-300 group-hover:text-white transition-colors shrink-0 group-hover:scale-110 duration-200" />
              <span className="relative z-10 truncate">Снять скиллы</span>
              <Sparkles className="w-3 h-3 text-zinc-400 group-hover:text-amber-300 opacity-60 group-hover:opacity-100 transition-all shrink-0 ml-0.5" />
            </>
          )}
        </button>

        {/* Button 2: Посмотреть скилы */}
        <button
          type="button"
          disabled={isCapturing}
          onClick={handleOpenSkillsModal}
          onMouseEnter={() => setIsViewSkillsTipHovered(true)}
          onMouseLeave={() => setIsViewSkillsTipHovered(false)}
          className="flex-1 max-w-[210px] relative group overflow-hidden flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all duration-300 cursor-pointer select-none border border-zinc-700/80 hover:border-zinc-400 bg-gradient-to-b from-[#13141e] via-[#0d0e16] to-[#08090f] hover:from-[#1b1c2b] hover:to-[#0f101a] text-zinc-200 hover:text-white shadow-[0_4px_16px_rgba(0,0,0,0.7),0_0_12px_rgba(255,255,255,0.04)] hover:shadow-[0_4px_22px_rgba(0,0,0,0.85),0_0_16px_rgba(255,255,255,0.12)] active:scale-95 disabled:opacity-50"
        >
          {/* Animated Sheen effect on hover */}
          <span className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:left-[100%] transition-all duration-1000 ease-in-out pointer-events-none" />

          <Eye className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-100 transition-colors shrink-0 group-hover:scale-110 duration-200" />
          <span className="relative z-10 truncate">Посмотреть скилы</span>
        </button>
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
            <div className="flex items-center justify-between gap-2 bg-[#06070a]/90 px-2 py-1.5 rounded-lg border border-zinc-800/80">
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
            <div className="flex items-center justify-between gap-2 bg-[#06070a]/90 px-2 py-1.5 rounded-lg border border-zinc-800/80">
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

            {/* Условие запуска */}
            <div className="flex items-center justify-between gap-2 bg-[#06070a]/90 px-2 py-1.5 rounded-lg border border-zinc-800/80">
              <label className="text-[10px] text-zinc-400 font-medium shrink-0">
                Условие запуска
              </label>
              <select
                value={draftStep.independent ? 'always' : 'queue'}
                onChange={(e) => {
                  const isAlways = e.target.value === 'always';
                  setDraftStep(prev => ({
                    ...prev,
                    independent: isAlways,
                    skillCooldownSeconds: isAlways ? (prev.skillCooldownSeconds || 6) : prev.skillCooldownSeconds
                  }));
                }}
                className="bg-[#12131b] text-zinc-200 text-[10.5px] px-2 py-1 rounded-md border border-zinc-700/80 outline-none cursor-pointer focus:border-zinc-400 max-w-[150px] truncate"
              >
                <option value="queue">Обычный (в очереди)</option>
                <option value="always">Постоянно</option>
              </select>
            </div>

            {/* Свое КД умения (сек) - когда выбрано «Постоянно» */}
            {draftStep.independent && (
              <div className="flex flex-col gap-1.5 bg-[#06070a]/90 p-2 rounded-lg border border-zinc-700/80 shadow-[inset_0_0_10px_rgba(255,255,255,0.02)] animate-in fade-in duration-100">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[10px] text-zinc-300 font-medium shrink-0">
                    Свое КД умения (сек)
                  </label>
                  <div className="flex items-center gap-1 bg-[#12131b] px-1.5 py-0.5 rounded-md border border-zinc-700/80 focus-within:border-zinc-400">
                    <input
                      type="number"
                      min="1"
                      max="300"
                      step="1"
                      value={draftStep.skillCooldownSeconds}
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value) || 1);
                        setDraftStep(prev => ({ ...prev, skillCooldownSeconds: val }));
                      }}
                      className="w-10 bg-transparent text-center font-mono font-bold text-[11px] text-zinc-100 outline-none"
                    />
                    <span className="text-[9px] text-zinc-400 font-mono">сек</span>
                  </div>
                </div>

                {/* Быстрые кнопки пресетов */}
                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                  <span className="text-[9px] text-zinc-500">Быстро:</span>
                  {[3, 6, 8, 12, 15, 20, 24].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setDraftStep(prev => ({ ...prev, skillCooldownSeconds: sec }))}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition cursor-pointer border ${
                        draftStep.skillCooldownSeconds === sec
                          ? 'bg-[#1e1e28] text-white border-zinc-400 shadow-[0_0_8px_rgba(255,255,255,0.2)]'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700/60 hover:text-white hover:bg-zinc-700'
                      }`}
                    >
                      {sec}с
                    </button>
                  ))}
                </div>

                {/* Подсказка */}
                <div className="p-1.5 rounded-md bg-zinc-900 border border-zinc-700/60 text-zinc-300 text-[9.5px] leading-tight flex items-start gap-1 mt-0.5">
                  <span className="shrink-0 text-zinc-400">⏱</span>
                  <span>
                    Умение будет нажиматься по своему КД ({draftStep.skillCooldownSeconds}с) независимо от общего цикла ротации.
                  </span>
                </div>
              </div>
            )}

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
