import { useState, useEffect, useRef, useCallback } from 'react';

const STORAGE_DEADLINE_KEY = 'easyfarm.shutdownDeadline';
const STORAGE_TOTAL_DURATION_KEY = 'easyfarm.shutdownTotalDuration';

interface UseShutdownTimerOptions {
  onBotStopped?: () => void;
  onToast?: (message: string) => void;
}

export interface UseShutdownTimerReturn {
  deadline: number | null;
  totalDurationMs: number;
  remainingMs: number;
  isRunning: boolean;
  isWarning: boolean;
  warningToastVisible: boolean;
  completionToast: string | null;
  start: (durationMs: number) => void;
  cancel: () => void;
  snooze: (additionalMs?: number) => void;
  dismissWarningToast: () => void;
  dismissCompletionToast: () => void;
}

export function useShutdownTimer(options: UseShutdownTimerOptions = {}): UseShutdownTimerReturn {
  const { onBotStopped, onToast } = options;

  // Initialize deadline and total duration from localStorage
  const [deadline, setDeadline] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_DEADLINE_KEY);
      if (!saved) return null;
      const parsed = Number(saved);
      if (isNaN(parsed) || parsed <= Date.now()) {
        // If deadline is already in the past, clean it up and do nothing
        localStorage.removeItem(STORAGE_DEADLINE_KEY);
        localStorage.removeItem(STORAGE_TOTAL_DURATION_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });

  const [totalDurationMs, setTotalDurationMs] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_TOTAL_DURATION_KEY);
      if (saved) {
        const parsed = Number(saved);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
      const savedDeadline = localStorage.getItem(STORAGE_DEADLINE_KEY);
      if (savedDeadline) {
        const parsedDl = Number(savedDeadline);
        if (!isNaN(parsedDl) && parsedDl > Date.now()) {
          return parsedDl - Date.now();
        }
      }
      return 0;
    } catch {
      return 0;
    }
  });

  const [remainingMs, setRemainingMs] = useState<number>(() => {
    if (!deadline) return 0;
    return Math.max(0, deadline - Date.now());
  });

  const [warningToastVisible, setWarningToastVisible] = useState(false);
  const [completionToast, setCompletionToast] = useState<string | null>(null);

  // Keep track of warning triggered flag so we only trigger once per deadline
  const warningTriggeredRef = useRef<boolean>(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Trigger bot stop execution
  const executeStopBot = useCallback(async () => {
    if (typeof window !== 'undefined' && window.pywebview?.api?.stop_bot) {
      try {
        const res = await window.pywebview.api.stop_bot();
        console.info('[ShutdownTimer] stop_bot response:', res);
      } catch (err) {
        console.warn('[ShutdownTimer] stop_bot error:', err);
      }
    } else {
      console.info('[mock] stop_bot');
    }

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const msg = `Таймер: бот остановлен в ${hh}:${mm}`;

    setCompletionToast(msg);
    optionsRef.current.onToast?.(msg);
    optionsRef.current.onBotStopped?.();
  }, []);

  // Timer interval for updating countdown and checking threshold
  useEffect(() => {
    if (!deadline) {
      setRemainingMs(0);
      setWarningToastVisible(false);
      warningTriggeredRef.current = false;
      return;
    }

    const checkTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, deadline - now);
      setRemainingMs(diff);

      // Warning toast at 60 seconds or less
      if (diff > 0 && diff <= 60000) {
        if (!warningTriggeredRef.current) {
          warningTriggeredRef.current = true;
          setWarningToastVisible(true);
        }
      }

      // Time expired
      if (diff <= 0) {
        // Clear stored values
        try {
          localStorage.removeItem(STORAGE_DEADLINE_KEY);
          localStorage.removeItem(STORAGE_TOTAL_DURATION_KEY);
        } catch {}

        setDeadline(null);
        setTotalDurationMs(0);
        setRemainingMs(0);
        setWarningToastVisible(false);
        warningTriggeredRef.current = false;

        executeStopBot();
      }
    };

    // Initial check right away
    checkTimer();

    // Regular interval
    const intervalId = setInterval(checkTimer, 500);

    return () => {
      clearInterval(intervalId);
    };
  }, [deadline, executeStopBot]);

  // Start timer
  const start = useCallback((durationMs: number) => {
    if (durationMs <= 0) return;
    const newDeadline = Date.now() + durationMs;

    try {
      localStorage.setItem(STORAGE_DEADLINE_KEY, String(newDeadline));
      localStorage.setItem(STORAGE_TOTAL_DURATION_KEY, String(durationMs));
    } catch {}

    warningTriggeredRef.current = false;
    setWarningToastVisible(false);
    setCompletionToast(null);
    setTotalDurationMs(durationMs);
    setDeadline(newDeadline);
    setRemainingMs(durationMs);
  }, []);

  // Cancel timer
  const cancel = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_DEADLINE_KEY);
      localStorage.removeItem(STORAGE_TOTAL_DURATION_KEY);
    } catch {}

    warningTriggeredRef.current = false;
    setWarningToastVisible(false);
    setDeadline(null);
    setTotalDurationMs(0);
    setRemainingMs(0);
  }, []);

  // Snooze (+15 minutes default)
  const snooze = useCallback((additionalMs: number = 15 * 60 * 1000) => {
    setDeadline((curr) => {
      const base = curr && curr > Date.now() ? curr : Date.now();
      const newDeadline = base + additionalMs;

      setTotalDurationMs((prevTotal) => {
        const newTotal = (prevTotal || 0) + additionalMs;
        try {
          localStorage.setItem(STORAGE_TOTAL_DURATION_KEY, String(newTotal));
        } catch {}
        return newTotal;
      });

      try {
        localStorage.setItem(STORAGE_DEADLINE_KEY, String(newDeadline));
      } catch {}

      warningTriggeredRef.current = false;
      setWarningToastVisible(false);
      setRemainingMs(newDeadline - Date.now());
      return newDeadline;
    });
  }, []);

  const dismissWarningToast = useCallback(() => {
    setWarningToastVisible(false);
  }, []);

  const dismissCompletionToast = useCallback(() => {
    setCompletionToast(null);
  }, []);

  const isRunning = deadline !== null && remainingMs > 0;
  const isWarning = isRunning && remainingMs <= 60000;

  return {
    deadline,
    totalDurationMs,
    remainingMs,
    isRunning,
    isWarning,
    warningToastVisible,
    completionToast,
    start,
    cancel,
    snooze,
    dismissWarningToast,
    dismissCompletionToast,
  };
}
