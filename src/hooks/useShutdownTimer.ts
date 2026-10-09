import { useState, useEffect, useRef, useCallback } from 'react';
import { BotStatusResponse } from '../types';

interface UseShutdownTimerOptions {
  onBotStopped?: () => void;
  onToast?: (message: string) => void;
}

export interface UseShutdownTimerReturn {
  // Backend state
  shutdownMode: 'duration' | 'clock' | null;
  shutdownMinutes: number | null;
  shutdownDeadlineMs: number | null;
  
  // Computed & animation state
  remainingMs: number;
  totalDurationMs: number;
  isPendingStart: boolean; // "duration" && shutdownDeadlineMs == null
  isActiveCountdown: boolean; // shutdownDeadlineMs != null
  isWarning: boolean; // <= 60s
  
  // Actions
  setDuration: (minutes: number) => Promise<void>;
  setClockTarget: (deadlineMs: number) => Promise<void>;
  cancelTimer: () => Promise<void>;
}

// Local mock state for preview when pywebview is not present
let mockStatus: BotStatusResponse = {
  running: false,
  shutdown_mode: null,
  shutdown_minutes: null,
  shutdown_deadline_ms: null,
};

export function useShutdownTimer(options: UseShutdownTimerOptions = {}): UseShutdownTimerReturn {
  const { onBotStopped, onToast } = options;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [status, setStatus] = useState<BotStatusResponse>(() => ({
    running: false,
    shutdown_mode: null,
    shutdown_minutes: null,
    shutdown_deadline_ms: null,
  }));

  const [remainingMs, setRemainingMs] = useState<number>(0);
  const [totalDurationMs, setTotalDurationMs] = useState<number>(0);

  // Sync state handler
  const applyStatus = useCallback((newStatus: BotStatusResponse) => {
    setStatus((prev) => {
      // If deadline changed or newly set, adjust total duration
      if (newStatus.shutdown_deadline_ms) {
        if (!prev.shutdown_deadline_ms || prev.shutdown_deadline_ms !== newStatus.shutdown_deadline_ms) {
          const diff = Math.max(0, newStatus.shutdown_deadline_ms - Date.now());
          setTotalDurationMs(newStatus.shutdown_minutes ? newStatus.shutdown_minutes * 60 * 1000 : diff);
        }
      } else {
        if (newStatus.shutdown_minutes) {
          setTotalDurationMs(newStatus.shutdown_minutes * 60 * 1000);
        } else {
          setTotalDurationMs(0);
        }
      }
      return newStatus;
    });
  }, []);

  // Poll get_status() every 2 seconds
  useEffect(() => {
    let isCancelled = false;

    const pollStatus = async () => {
      if (typeof window !== 'undefined' && window.pywebview?.api?.get_status) {
        try {
          const res = await window.pywebview.api.get_status();
          if (!isCancelled && res) {
            applyStatus(res);
          }
        } catch (err) {
          console.warn('[ShutdownTimer] get_status error:', err);
        }
      } else {
        // Mock fallback
        if (!isCancelled) {
          applyStatus({ ...mockStatus });
        }
      }
    };

    pollStatus();
    const interval = setInterval(pollStatus, 2000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [applyStatus]);

  // Listen to easyfarm:shutdown-fired event
  useEffect(() => {
    const handleShutdownFired = (event?: any) => {
      console.info('[ShutdownTimer] easyfarm:shutdown-fired received', event);
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const msg = `Таймер: бот остановлен в ${hh}:${mm}`;

      optionsRef.current.onToast?.(msg);
      optionsRef.current.onBotStopped?.();

      // Reset timer locally and query status
      applyStatus({
        running: false,
        shutdown_mode: null,
        shutdown_minutes: null,
        shutdown_deadline_ms: null,
      });

      if (typeof window !== 'undefined' && window.pywebview?.api?.get_status) {
        window.pywebview.api.get_status().then((res) => {
          if (res) applyStatus(res);
        }).catch(() => {});
      }
    };

    window.addEventListener('easyfarm:shutdown-fired', handleShutdownFired);
    return () => {
      window.removeEventListener('easyfarm:shutdown-fired', handleShutdownFired);
    };
  }, [applyStatus]);

  // Animation countdown interval (purely for smooth UI ring & digits)
  useEffect(() => {
    const deadlineMs = status.shutdown_deadline_ms;
    if (!deadlineMs) {
      setRemainingMs(0);
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const diff = Math.max(0, deadlineMs - now);
      setRemainingMs(diff);
    };

    updateCountdown();
    const intervalId = setInterval(updateCountdown, 250);

    return () => {
      clearInterval(intervalId);
    };
  }, [status.shutdown_deadline_ms]);

  // Command 1: set_shutdown_duration(minutes)
  const setDuration = useCallback(async (minutes: number) => {
    if (typeof window !== 'undefined' && window.pywebview?.api?.set_shutdown_duration) {
      try {
        const res = await window.pywebview.api.set_shutdown_duration(minutes);
        if (res) applyStatus(res);
      } catch (err) {
        console.warn('[ShutdownTimer] set_shutdown_duration error:', err);
      }
    } else {
      console.info('[mock] set_shutdown_duration:', minutes);
      mockStatus = {
        ...mockStatus,
        shutdown_mode: 'duration',
        shutdown_minutes: minutes,
        shutdown_deadline_ms: mockStatus.running ? Date.now() + minutes * 60 * 1000 : null,
      };
      applyStatus({ ...mockStatus });
    }
  }, [applyStatus]);

  // Command 2: set_shutdown_timer(deadlineMs)
  const setClockTarget = useCallback(async (deadlineMs: number) => {
    if (typeof window !== 'undefined' && window.pywebview?.api?.set_shutdown_timer) {
      try {
        const res = await window.pywebview.api.set_shutdown_timer(deadlineMs);
        if (res) applyStatus(res);
      } catch (err) {
        console.warn('[ShutdownTimer] set_shutdown_timer error:', err);
      }
    } else {
      console.info('[mock] set_shutdown_timer:', deadlineMs);
      const mins = Math.max(1, Math.round((deadlineMs - Date.now()) / (60 * 1000)));
      mockStatus = {
        ...mockStatus,
        shutdown_mode: 'clock',
        shutdown_minutes: mins,
        shutdown_deadline_ms: deadlineMs,
      };
      applyStatus({ ...mockStatus });
    }
  }, [applyStatus]);

  // Command 3: cancel_shutdown_timer()
  const cancelTimer = useCallback(async () => {
    if (typeof window !== 'undefined' && window.pywebview?.api?.cancel_shutdown_timer) {
      try {
        const res = await window.pywebview.api.cancel_shutdown_timer();
        if (res) applyStatus(res);
      } catch (err) {
        console.warn('[ShutdownTimer] cancel_shutdown_timer error:', err);
      }
    } else {
      console.info('[mock] cancel_shutdown_timer');
      mockStatus = {
        ...mockStatus,
        shutdown_mode: null,
        shutdown_minutes: null,
        shutdown_deadline_ms: null,
      };
      applyStatus({ ...mockStatus });
    }
  }, [applyStatus]);

  const isPendingStart = status.shutdown_mode === 'duration' && status.shutdown_deadline_ms == null;
  const isActiveCountdown = status.shutdown_deadline_ms != null && remainingMs > 0;
  const isWarning = isActiveCountdown && remainingMs <= 60000;

  return {
    shutdownMode: status.shutdown_mode,
    shutdownMinutes: status.shutdown_minutes,
    shutdownDeadlineMs: status.shutdown_deadline_ms,
    remainingMs,
    totalDurationMs,
    isPendingStart,
    isActiveCountdown,
    isWarning,
    setDuration,
    setClockTarget,
    cancelTimer,
  };
}
