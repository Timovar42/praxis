import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

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
    console.error('Proxis Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 bg-black text-yellow-400 border-2 border-yellow-400 flex items-center justify-center mb-4 shadow-[0_0_12px_rgba(250,204,21,0.25)]">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-black uppercase tracking-wider mb-2 text-white">Произошла ошибка</h1>
          <p className="text-xs text-neutral-300 max-w-sm mb-4 font-mono break-all bg-neutral-950 p-3 border border-yellow-500/50">
            {this.state.error?.message || 'Неизвестная ошибка'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-5 py-3 bg-yellow-400 text-black font-black uppercase tracking-wider text-xs border border-yellow-400 hover:bg-yellow-300 flex items-center gap-2 active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Перезагрузить приложение</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
