import React, { useState, useEffect } from 'react';
import { Cloud, Loader2 } from 'lucide-react';

interface ChatBotToggleProps {
  chatRunning: boolean;
  onChatStateChange: (running: boolean) => void;
  onError: (message: string) => void;
  onSuccess?: (message: string) => void;
}

export const ChatBotToggle: React.FC<ChatBotToggleProps> = ({
  chatRunning,
  onChatStateChange,
  onError,
  onSuccess,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (window.pywebview) {
      return typeof window.pywebview.api?.start_chat === 'function';
    }
    // Preview environment without pywebview
    return true;
  });

  // Check if window.pywebview.api.start_chat is available
  useEffect(() => {
    const checkAvailability = () => {
      if (typeof window !== 'undefined') {
        if (window.pywebview) {
          setIsAvailable(typeof window.pywebview.api?.start_chat === 'function');
        } else {
          // Dev preview without pywebview
          setIsAvailable(true);
        }
      }
    };

    checkAvailability();
    window.addEventListener('pywebviewready', checkAvailability);
    return () => {
      window.removeEventListener('pywebviewready', checkAvailability);
    };
  }, []);

  // Poll get_status() every 2 seconds for chat_running (as specified: опрашивается как у таймера)
  useEffect(() => {
    let isCancelled = false;

    const pollStatus = async () => {
      if (typeof window !== 'undefined' && window.pywebview?.api?.get_status) {
        try {
          const res = await window.pywebview.api.get_status();
          if (!isCancelled && res && typeof res.chat_running === 'boolean') {
            if (!isProcessing) {
              onChatStateChange(res.chat_running);
            }
          }
        } catch {
          // Ignore polling errors
        }
      }
    };

    pollStatus();
    const interval = setInterval(pollStatus, 2000);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [isProcessing, onChatStateChange]);

  const handleToggle = async () => {
    if (isProcessing || !isAvailable) return;

    const nextState = !chatRunning;
    setIsProcessing(true);

    try {
      if (typeof window !== 'undefined' && window.pywebview?.api) {
        const api = window.pywebview.api;
        let res: { ok: boolean; message?: string; error?: string };

        if (nextState) {
          if (typeof api.start_chat === 'function') {
            res = await api.start_chat();
          } else {
            res = { ok: false, message: 'Метод start_chat недоступен' };
          }
        } else {
          if (typeof api.stop_chat === 'function') {
            res = await api.stop_chat();
          } else {
            res = { ok: false, message: 'Метод stop_chat недоступен' };
          }
        }

        if (res.ok) {
          onChatStateChange(nextState);
          if (res.message && onSuccess) {
            onSuccess(res.message);
          }
        } else {
          // ok:false — toast с message и переключатель обратно в «выкл»
          onChatStateChange(false);
          const errorMsg = res.message || res.error || 'Ошибка управления чат-ботом';
          onError(errorMsg);
        }
      } else {
        // Dev preview mock fallback
        await new Promise((resolve) => setTimeout(resolve, 800));
        onChatStateChange(nextState);
        if (onSuccess) {
          onSuccess(nextState ? 'Чат-бот запущен' : 'Чат-бот остановлен');
        }
      }
    } catch (err: any) {
      // Revert to off on error and show toast
      onChatStateChange(false);
      onError(err?.message || 'Ошибка связи с сервисом чат-бота');
    } finally {
      setIsProcessing(false);
    }
  };

  // Если window.pywebview.api.start_chat нет — переключатель серый с тултипом «Недоступно»
  if (!isAvailable) {
    return (
      <div
        title="Недоступно"
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium bg-[#0b0c10] border border-zinc-800/60 text-zinc-600 opacity-60 cursor-not-allowed select-none"
      >
        <Cloud className="w-3.5 h-3.5 shrink-0 text-zinc-600" />
        <span className="text-[11px] font-medium leading-none text-zinc-600">Чат-бот</span>
        <div className="w-5 h-2.5 rounded-full relative bg-zinc-800/80">
          <div className="w-2 h-2 rounded-full absolute top-0.25 left-0.5 bg-zinc-600" />
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isProcessing}
      title={
        isProcessing
          ? 'Загрузка (до 60 с)...'
          : chatRunning
          ? 'Выключить чат-бот'
          : 'Включить чат-бот'
      }
      className={`group flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition cursor-pointer select-none border ${
        chatRunning
          ? 'bg-[#14151e] border-zinc-500 text-zinc-100 shadow-[0_0_12px_rgba(255,255,255,0.08)]'
          : 'bg-[#0f1015] border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
      } disabled:opacity-75 disabled:cursor-wait`}
    >
      {/* Icon with smooth spinner when processing (первый запуск до 60 с — переключатель в состоянии загрузки) */}
      {isProcessing ? (
        <Loader2 className="w-3.5 h-3.5 text-zinc-300 animate-spin shrink-0" />
      ) : (
        <Cloud
          className={`w-3.5 h-3.5 shrink-0 transition ${
            chatRunning ? 'text-zinc-100' : 'text-zinc-400 group-hover:text-zinc-200'
          }`}
        />
      )}

      {/* Label */}
      <span className="text-[11px] font-medium leading-none">
        {isProcessing ? 'Загрузка…' : 'Чат-бот'}
      </span>

      {/* Mini Toggle Switch Indicator */}
      <div
        className={`w-5 h-2.5 rounded-full relative transition-colors duration-200 ${
          chatRunning ? 'bg-zinc-200' : 'bg-zinc-700/80'
        }`}
      >
        <div
          className={`w-2 h-2 rounded-full absolute top-0.25 transition-transform duration-200 ${
            chatRunning ? 'bg-black translate-x-2.75' : 'bg-zinc-400 translate-x-0.25'
          }`}
        />
      </div>
    </button>
  );
};
