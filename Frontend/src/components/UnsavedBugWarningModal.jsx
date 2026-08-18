import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function UnsavedBugWarningModal({ isOpen, onClose, onConfirmLeave }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-900/50 shadow-2xl max-w-md w-full p-6 text-slate-800 dark:text-slate-100 relative space-y-5 animate-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Stay on page"
        >
          <X size={18} />
        </button>

        {/* Warning Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Unsaved Bug Report Warning
            </h3>
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
              Draft Bug Details Not Sent Yet!
            </p>
          </div>
        </div>

        {/* Message */}
        <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-xl p-4 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
          You have unsaved details in your bug report. If you go to another page without clicking the <strong className="font-bold underline">Send Report</strong> button, your entered bug details and attachments will be erased!
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer shadow-xs"
          >
            Stay & Continue Editing
          </button>
          <button
            type="button"
            onClick={onConfirmLeave}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-sm active:scale-95"
          >
            Discard & Leave Page
          </button>
        </div>

      </div>
    </div>
  );
}
