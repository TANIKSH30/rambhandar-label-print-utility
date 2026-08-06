import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('React ErrorBoundary caught runtime exception:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-8 max-w-md w-full text-center space-y-4">
            <div className="w-14 h-14 bg-red-100 border border-red-200 rounded-2xl flex items-center justify-center mx-auto text-red-600">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-bold text-slate-900">Application Error Recovered</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              An unexpected error occurred during rendering. The application state has been safely protected.
            </p>

            {this.state.error?.message && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-left text-xs font-mono text-red-800 break-all max-h-32 overflow-auto">
                {this.state.error.message}
              </div>
            )}

            <button
              type="button"
              onClick={this.handleReset}
              className="w-full py-2.5 px-4 bg-[#0B1B3A] hover:bg-[#162e5c] text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4 text-amber-400" /> Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
