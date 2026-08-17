import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

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
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 font-sans">
                    <div className="max-w-xl w-full bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-10 text-center border border-slate-200 dark:border-slate-800 animate-scaleIn">
                        <a href="/" className="inline-block mb-6">
                            <img src="/pdfbolt-logo-transparent.png" alt="PDFBolt" className="h-10 mx-auto object-contain" />
                        </a>
                        <div className="inline-flex p-5 rounded-full bg-red-50 dark:bg-red-500/10 mb-6 border-8 border-red-100 dark:border-red-500/5">
                            <AlertTriangle className="text-red-500 w-12 h-12" />
                        </div>

                        <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
                            Oops! System Error
                        </h1>

                        <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed max-w-md mx-auto">
                            PDFBolt encountered an unexpected glitch. Don't worry, your files are completely safe and process locally.
                        </p>

                        {this.state.error && (
                            <div className="mb-8 p-4 bg-slate-100 dark:bg-slate-950 rounded-2xl text-left border border-slate-200 dark:border-slate-800 overflow-x-auto">
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Error Details</div>
                                <p className="text-sm font-mono text-red-600 dark:text-red-400 break-words whitespace-pre-wrap">
                                    {this.state.error.toString()}
                                </p>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button
                                onClick={this.handleReset}
                                className="px-8 py-4 bg-yellow-500 text-white rounded-2xl font-black text-lg shadow-xl shadow-yellow-500/20 hover:bg-yellow-600 hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={20} />
                                Restart Application
                            </button>
                            
                            <a 
                                href="mailto:support@pdfbolt.in?subject=App%20Crash%20Report" 
                                className="px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl font-bold text-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700"
                            >
                                <Mail size={20} />
                                Report Issue
                            </a>
                        </div>

                        <p className="text-xs font-medium text-slate-500 dark:text-slate-500 mt-8">
                            If this keeps happening, try clearing your browser cache.
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
