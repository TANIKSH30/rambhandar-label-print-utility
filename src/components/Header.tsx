import React from 'react';
import logoImage from '../assets/logo.jpeg';
import { Printer, History, Download, Settings as SettingsIcon, HelpCircle, LayoutGrid, FileSpreadsheet } from 'lucide-react';
import { PrinterStatusType } from '../types/label';

interface HeaderProps {
  printerStatus: PrinterStatusType;
  selectedPrinterName: string;
  onOpenHistory: () => void;
  onOpenExport: () => void;
  onOpenTemplates: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onOpenImportExcel: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  printerStatus,
  selectedPrinterName,
  onOpenHistory,
  onOpenExport,
  onOpenTemplates,
  onOpenSettings,
  onOpenHelp,
  onOpenImportExcel
}) => {
  return (
    <header className="bg-[#0B1B3A] text-white px-6 py-3.5 flex items-center justify-between shadow-md select-none border-b border-slate-800 shrink-0">
      
      {/* Left side: Logo & Enterprise Titles */}
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 rounded-xl bg-white p-1 flex items-center justify-center shadow-lg border border-slate-200 overflow-hidden shrink-0">
          <img 
            src={logoImage} 
            alt="Matadin Ram Bhandar" 
            className="w-full h-full object-contain"
          />
        </div>
        <div className="flex flex-col">
          <h1 className="text-xl font-bold tracking-tight text-white leading-tight">
            Label Print Utility
          </h1>
          <span className="text-xs font-medium text-slate-300">
            Matadin Ram Bhandar
          </span>
        </div>
      </div>

      {/* Center/Right: Action Buttons & Live Printer Status Indicator */}
      <div className="flex items-center space-x-3">
        
        {/* Navigation Action Buttons */}
        <div className="hidden lg:flex items-center gap-1.5 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={onOpenImportExcel}
            title="Import Excel / CSV Bulk File"
            className="px-3.5 py-1.5 bg-[#F59E0B] hover:bg-[#D97706] text-slate-950 font-black text-xs rounded-lg flex items-center gap-1.5 transition shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-950" />
            <span>Import Excel</span>
          </button>

          <button
            type="button"
            onClick={onOpenTemplates}
            title="Product Templates (F2)"
            className="px-3 py-1.5 hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
            <span>Templates</span>
          </button>

          <button
            type="button"
            onClick={onOpenHistory}
            title="Label Print History (F3)"
            className="px-3 py-1.5 hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
          >
            <History className="w-3.5 h-3.5 text-amber-400" />
            <span>History</span>
          </button>

          <button
            type="button"
            onClick={onOpenExport}
            title="Export CSV Log Report (F4)"
            className="px-3 py-1.5 hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Export Report</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            title="Preferences & Settings"
            className="px-2.5 py-1.5 hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition"
          >
            <SettingsIcon className="w-3.5 h-3.5 text-slate-300" />
          </button>

          <button
            type="button"
            onClick={onOpenHelp}
            title="Keyboard Shortcuts Help"
            className="px-2.5 py-1.5 hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#F59E0B]" />
          </button>
        </div>

        {/* Live Thermal Printer Status Indicator (🟢 Ready, 🟡 Busy, 🔴 Offline) */}
        <div className={`flex items-center space-x-2.5 px-3.5 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider ${
          printerStatus === 'ready' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
          printerStatus === 'busy' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
          'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          <span className="relative flex h-2.5 w-2.5">
            {printerStatus !== 'offline' && (
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                printerStatus === 'ready' ? 'bg-emerald-400' : 'bg-amber-400'
              }`}></span>
            )}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
              printerStatus === 'ready' ? 'bg-emerald-500' :
              printerStatus === 'busy' ? 'bg-amber-500' : 'bg-red-500'
            }`}></span>
          </span>

          <Printer className="w-3.5 h-3.5" />
          
          <span>
            {printerStatus === 'ready' ? '🟢 Ready' :
             printerStatus === 'busy' ? '🟡 Busy' : '🔴 Offline'}
          </span>

          {selectedPrinterName && (
            <span className="hidden sm:inline text-[10px] font-mono normal-case tracking-normal opacity-80 border-l border-white/20 pl-2 max-w-[120px] truncate">
              {selectedPrinterName}
            </span>
          )}
        </div>

      </div>
    </header>
  );
};
