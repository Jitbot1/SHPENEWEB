import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public handleReload = () => {
    window.location.reload();
  };

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full text-center shadow-xl border-2 border-[#501214] space-y-5 animate-fade-in">
            <div className="w-16 h-16 bg-[#501214] text-white rounded-2xl mx-auto flex items-center justify-center shadow-md">
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-[#1A1A1A]">
                Something went wrong
              </h1>
              <p className="text-xs sm:text-sm text-gray-700">
                An unexpected interface error occurred. The application has safely intercepted the crash to protect your session.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-gray-100 p-3.5 rounded-xl text-left border border-gray-300 overflow-auto max-h-40">
                <p className="text-xs font-mono font-bold text-[#501214]">
                  {this.state.error.name}: {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-5 py-2.5 bg-[#501214] hover:bg-[#420f11] text-white rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center space-x-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="px-5 py-2.5 bg-white text-[#1A1A1A] hover:bg-gray-100 border-2 border-gray-300 rounded-xl text-xs font-bold transition-colors"
              >
                Reload Page
              </button>

              <a
                href="/"
                className="px-5 py-2.5 bg-[#1A1A1A] hover:bg-black text-white rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Return to Home</span>
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
