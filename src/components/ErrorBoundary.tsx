import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-zinc-200 flex flex-col items-center justify-center p-4 select-none font-sans">
          <div className="w-full max-w-md bg-[#0e0e13] border border-red-900/60 rounded-xl p-4 shadow-2xl flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-red-400">
              Произошла ошибка интерфейса
            </h2>
            <p className="text-xs text-zinc-400 font-mono break-words bg-black/60 p-2.5 rounded border border-zinc-800">
              {this.state.error?.message || 'Неизвестная ошибка'}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-white transition cursor-pointer self-start border border-zinc-700"
            >
              Перезагрузить интерфейс
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
