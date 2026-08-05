import React from 'react';
import { X, Keyboard, HelpCircle } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'F1', description: 'New Label / Clear Form' },
    { key: 'F2', description: 'Save Current Form as Product Template' },
    { key: 'F3', description: 'Open Label Print History' },
    { key: 'F4', description: 'Export Print Log CSV Report' },
    { key: 'Ctrl + P', description: 'Print Labels Immediately' },
    { key: 'Ctrl + R', description: 'Reset Form to Default Values' },
    { key: 'Ctrl + S', description: 'Save Product Template' },
    { key: 'Escape', description: 'Close Open Dialog / Modal' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-[#0B1B3A] text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg border border-amber-500/30">
              <Keyboard className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Keyboard Shortcuts</h3>
              <p className="text-xs text-slate-300">Industrial High-Speed Operation Hotkeys</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-3">
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {shortcuts.map((sc) => (
              <div key={sc.key} className="p-3 flex items-center justify-between bg-white hover:bg-slate-50 transition">
                <span className="text-xs font-semibold text-slate-700">{sc.description}</span>
                <kbd className="px-2.5 py-1 bg-slate-100 border border-slate-300 rounded-lg font-mono text-xs font-bold text-[#0B1B3A] shadow-xs">
                  {sc.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#0B1B3A] text-white font-bold rounded-xl text-xs transition"
          >
            Got it (Esc)
          </button>
        </div>

      </div>
    </div>
  );
};
