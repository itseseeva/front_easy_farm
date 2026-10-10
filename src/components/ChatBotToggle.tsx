import React, { useState } from 'react';
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

  const handleToggle = async () => {
    if (isProcessing) return;

    const nextState = !chatRunning;
    setIsProcessing(true);

    try {
      if (typeof window !== 'undefined' && window.pywebview?.api) {
        const api = window.pywebview.api;
        let res: { ok: boolean; message?: string; error?: string };

        if (nextState) {
          if (api.start_chat) {
            res = await api.start_chat();
          } else {
            res = { ok: true, message: 'Чат-бот запущен' };
          }
        } else {
          if (api.stop_chat) {
            res = await api.stop_chat();
          } else {
            res = { ok: true, message: 'Чат-бот остановлен' };
          }
        }

        if (res.ok) {
          onChatStateChange(nextState);
          if (res.message && onSuccess) {
            onSuccess(res.message);
          }
        } else {
          // Revert back and show error toast
          onChatStateChange(chatRunning);
          onError(res.error || res.message || 'Не удалось переключить чат-бот');
        }
      } else {
        // Preview mode mock
        await new Promise((resolve) => setTimeout(resolve, 800));
        onChatStateChange(nextState);
        if (onSuccess) {
          onSuccess(nextState ? 'Чат-бот запущен' : 'Чат-бот остановлен');
        }
      }
    } catch (err: any) {
      onChatStateChange(chatRunning);
      onError(err?.message || 'Ошибка связи с сервисом чат-бота');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isProcessing}
      title={
        isProcessing
          ? 'Подключение...'
          : chatRunning
          ? 'Выключить чат-бот'
          : 'Включить чат-бот'
      }
      className={`group flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition cursor-pointer select-none border ${
        chatRunning
          ? 'bg-[#14151e] border-zinc-600/90 text-zinc-100 shadow-[0_0_12px_rgba(255,255,255,0.06)]'
          : 'bg-[#0f1015] border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
      } disabled:opacity-70`}
    >
      {/* Icon with smooth loading spinner when processing or connecting */}
      {isProcessing ? (
        <Loader2 className="w-3.5 h-3.5 text-zinc-300 animate-spin shrink-0" />
      ) : (
        <Cloud
          className={`w-3.5 h-3.5 shrink-0 transition ${
            chatRunning ? 'text-zinc-100' : 'text-zinc-400 group-hover:text-zinc-200'
          }`}
        />
      )}

      {/* Label / Loading status */}
      <span className="text-[11px] font-medium leading-none">
        {isProcessing ? 'Загрузка…' : 'Чат-бот'}
      </span>

      {/* Mini Toggle Switch Indicator in clean monochrome style */}
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
