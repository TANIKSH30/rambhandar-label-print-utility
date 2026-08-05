import React from 'react';
import { PrinterLanguage, PrinterDevice } from '../types/label';
import { Printer, RefreshCw, RotateCcw, Minus, Plus, Cpu, CheckCircle2, AlertCircle, Wifi, WifiOff } from 'lucide-react';

interface PrintSetupBarProps {
  copies: number;
  onCopiesChange: (copies: number) => void;
  language: PrinterLanguage;
  onLanguageChange: (lang: PrinterLanguage) => void;
  printers: PrinterDevice[];
  selectedPrinter: string;
  onPrinterSelect: (printer: string) => void;
  onRefreshPrinters: () => void;
  onResetForm: () => void;
  onPrint: () => void;
  isPrinting: boolean;
  printStatus: { type: 'idle' | 'success' | 'error'; message: string } | null;
}

const isThermalPrinter = (name: string): boolean => {
  if (!name) return false;
  return /zebra|honeywell|intermec|toshiba|tsc|datamax|sato|bixolon|thermal|zpl|godex/i.test(name);
};

export const PrintSetupBar: React.FC<PrintSetupBarProps> = ({
  copies,
  onCopiesChange,
  language,
  onLanguageChange,
  printers,
  selectedPrinter,
  onPrinterSelect,
  onRefreshPrinters,
  onResetForm,
  onPrint,
  isPrinting,
  printStatus
}) => {
  const isThermalConnected = printers.some(p => isThermalPrinter(p.name)) || isThermalPrinter(selectedPrinter);

  return (
    <div className="bg-white/95 backdrop-blur-md border-t border-slate-200/80 p-4 shadow-lg select-none">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Left Controls: Copies, Language, Printer */}
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          
          {/* Copies Selector */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Copies</label>
            <div className="flex items-center bg-slate-100/80 rounded-xl p-1 border border-slate-300/80">
              <button
                type="button"
                onClick={() => onCopiesChange(Math.max(1, copies - 1))}
                className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-700 hover:bg-slate-200 transition active:scale-95 disabled:opacity-50"
                disabled={copies <= 1}
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-10 text-center font-bold text-sm text-[#0B1B3A]">
                {copies}
              </span>
              <button
                type="button"
                onClick={() => onCopiesChange(copies + 1)}
                className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-700 hover:bg-slate-200 transition active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Printer Language Dropdown */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Cpu className="w-3 h-3 text-slate-400" /> Command Language
            </label>
            <select
              value={language}
              onChange={(e) => onLanguageChange(e.target.value as PrinterLanguage)}
              className="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#0B1B3A]/20 focus:border-[#0B1B3A] h-[40px] min-w-[170px] transition-all"
            >
              <option value="Zebra ZPL II">Zebra ZPL II</option>
              <option value="Honeywell Fingerprint">Honeywell Fingerprint</option>
              <option value="Toshiba TPCL">Toshiba TPCL</option>
            </select>
          </div>

          {/* Installed Printer Dropdown + Refresh */}
          <div className="flex flex-col gap-1 flex-1 min-w-[220px]">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Printer className="w-3 h-3 text-slate-400" /> Target Printer
            </label>
            <div className="flex items-center gap-1.5">
              <select
                value={selectedPrinter}
                onChange={(e) => onPrinterSelect(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#0B1B3A]/20 focus:border-[#0B1B3A] h-[40px] transition-all"
              >
                {printers.length > 0 ? (
                  printers.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name} {p.isDefault ? '(Default)' : ''}
                    </option>
                  ))
                ) : (
                  <option value="">Direct Thermal Spooler</option>
                )}
              </select>

              <button
                type="button"
                onClick={onRefreshPrinters}
                title="Refresh Printer List"
                className="h-[40px] w-[40px] shrink-0 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl flex items-center justify-center text-slate-700 transition active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Controls: Connection Status, Feedback, Reset & Print Button */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          
          {/* Requirement 7: Green Printer Connected vs Yellow Thermal Printer Not Connected */}
          <div className="hidden sm:flex items-center">
            {isThermalConnected ? (
              <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200/80 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                <span>Printer Connected</span>
              </div>
            ) : (
              <div className="px-3 py-1.5 bg-amber-50 border border-amber-200/80 text-amber-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                <span>Thermal Printer Not Connected</span>
              </div>
            )}
          </div>

          {/* Print Status Feedback */}
          {printStatus && (
            <div className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 animate-fade-in ${
              printStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm' :
              printStatus.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200 shadow-sm' : 'text-slate-500'
            }`}>
              {printStatus.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
              {printStatus.type === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />}
              <span>{printStatus.message}</span>
            </div>
          )}

          {/* Form Reset Button */}
          <button
            type="button"
            onClick={onResetForm}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold text-xs rounded-xl transition-all duration-150 flex items-center gap-2 h-[42px] active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" /> Reset
          </button>

          {/* Primary Amber Print Button (#F59E0B) */}
          <button
            type="button"
            onClick={onPrint}
            disabled={isPrinting}
            className="px-8 py-2.5 bg-[#F59E0B] hover:bg-[#D97706] text-slate-950 font-black text-sm rounded-xl shadow-md hover:shadow-lg transition-all duration-150 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2.5 h-[42px] tracking-wide"
          >
            <Printer className="w-5 h-5 text-slate-950" />
            <span>{isPrinting ? 'PRINTING...' : 'PRINT LABELS'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
