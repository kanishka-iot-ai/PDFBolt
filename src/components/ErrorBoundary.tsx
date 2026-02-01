import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
    errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
        this.setState({ errorInfo });

        // Log to error tracking service (e.g., Sentry) if configured
        if (window.location.hostname !== 'localhost') {
            // Production error logging would go here
            console.error('Production error:', { error, errorInfo });
        }
    }

    handleReset = () => {
        this.setState({ hasError: false, error: undefined, errorInfo: undefined });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
                    <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 text-center border border-slate-200 dark:border-slate-700">
                        <div className="inline-flex p-4 rounded-full bg-red-100 dark:bg-red-900/30 mb-6">
                            <AlertTriangle className="text-red-600 dark:text-red-400 w-12 h-12" />
                        </div>

                        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-4">
                            Oops! Something Went Wrong
                        </h1>

                        <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                            PDFBolt encountered an unexpected error. Don't worry, your files are safe and haven't been uploaded anywhere.
                        </p>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div className="mb-6 p-4 bg-slate-100 dark:bg-slate-900 rounded-xl text-left">
                                <p className="text-xs font-mono text-red-600 dark:text-red-400 break-all">
                                    {this.state.error.toString()}
                                </p>
                            </div>
                        )}

                        <button
                            onClick={this.handleReset}
                            className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-2xl font-black text-lg shadow-xl hover:from-yellow-600 hover:to-orange-600 hover:scale-105 transition-all flex items-center justify-center gap-3"
                        >
                            <RefreshCw size={20} />
                            Reload PDFBolt
                        </button>

                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-6">
                            If this keeps happening, try clearing your browser cache or contact support.
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
