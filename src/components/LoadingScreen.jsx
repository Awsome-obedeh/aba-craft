// src/components/LoadingScreen.js
'use client';

export default function LoadingScreen() {
    return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-black/70 dark:bg-white/50 z-50">
            <div className="flex flex-col items-center space-y-4">
                {/* Modern Spinner */}
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                
                {/* Pulsing Text */}
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 animate-pulse tracking-wide">
                    Loading Application...
                </p>
            </div>
        </div>
    );
}