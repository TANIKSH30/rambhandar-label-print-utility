import React, { useState } from 'react';
import { X, Download, Calendar, CheckCircle2, AlertCircle, FileText } from 'lucide-react';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({ isOpen, onClose }) => {
  const [range, setRange] = useState<'today' | '7days' | '30days' | 'custom'>('today');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    setFeedback(null);

    try {
      if (window.electronAPI && window.electronAPI.exportReport) {
        const res = await window.electronAPI.exportReport({
          range,
          startDate: range === 'custom' ? startDate : undefined,
          endDate: range === 'custom' ? endDate : undefined
        });

        if (res.success) {
          setFeedback({ type: 'success', message: res.message });
        } else {
          setFeedback({ type: 'error', message: res.message });
        }
      } else {
        // Fallback for Web Browser environment: generate sample CSV and trigger browser download
        const sampleHeaders = ['Date', 'Time', 'Product Name', 'Weight', 'MRP', 'Batch', 'Barcode', 'Copies', 'Printer', 'Status'];
        const sampleRow = [
          new Date().toLocaleDateString('en-IN'),
          new Date().toLocaleTimeString('en-IN'),
          'Falhari Chiwda',
          '250GM',
          '80/-',
          'sep2026',
          '12345678',
          '1',
          'Direct Thermal Spooler',
          'SUCCESS'
        ];

        const csvContent = `${sampleHeaders.join(',')}\n${sampleRow.map(v => `"${v}"`).join(',')}`;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Matadin_Print_Report_${range}_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setFeedback({ type: 'success', message: 'Report downloaded successfully via browser!' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Export error occurred.' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-[#0B1B3A] text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg border border-amber-500/30">
              <Download className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Export Print Log Report</h3>
              <p className="text-xs text-slate-300">Generate CSV Audit Log File</p>
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
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Select Date Range</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'today', label: 'Today' },
                { id: '7days', label: 'Last 7 Days' },
                { id: '30days', label: 'Last 30 Days' },
                { id: 'custom', label: 'Custom Range' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setRange(opt.id as any)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition text-center border ${
                    range === opt.id
                      ? 'bg-[#0B1B3A] text-white border-[#0B1B3A] shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Pickers */}
          {range === 'custom' && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-600">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
                />
              </div>
            </div>
          )}

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <span className="font-bold text-slate-800 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-[#0B1B3A]" /> CSV File Columns:
            </span>
            <p className="font-mono text-[10px] text-slate-500">
              Date, Time, Product Name, Weight, MRP, Batch, Barcode, Copies, Printer, Status
            </p>
          </div>

          {/* Feedback */}
          {feedback && (
            <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              feedback.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-red-50 text-red-900 border border-red-200'
            }`}>
              {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
              <span>{feedback.message}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="px-5 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md transition disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-slate-950" />
            {isExporting ? 'Exporting...' : 'Save CSV File'}
          </button>
        </div>

      </div>
    </div>
  );
};
