import React from 'react';
import { BulkImportRow } from '../utils/excelParser';
import {
  Printer,
  Pause,
  Play,
  XCircle,
  CheckCircle2,
  AlertCircle,
  Download,
  RotateCcw,
  Clock,
  Tag,
  Barcode,
  Hash
} from 'lucide-react';

interface BulkPrintProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLabelIndex: number;
  totalLabels: number;
  currentRow: BulkImportRow | null;
  printerName: string;
  isPaused: boolean;
  isFinished: boolean;
  onPauseToggle: () => void;
  onCancel: () => void;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  failedRows: Array<BulkImportRow & { failureReason?: string }>;
  onResumeRecovery?: () => void;
  onStartOverRecovery?: () => void;
  hasRecoveryJob?: boolean;
}

export const BulkPrintProgressModal: React.FC<BulkPrintProgressModalProps> = ({
  isOpen,
  onClose,
  currentLabelIndex,
  totalLabels,
  currentRow,
  printerName,
  isPaused,
  isFinished,
  onPauseToggle,
  onCancel,
  successCount,
  failedCount,
  skippedCount,
  failedRows,
  onResumeRecovery,
  onStartOverRecovery,
  hasRecoveryJob
}) => {
  if (!isOpen) return null;

  const percentage = totalLabels > 0 ? Math.min(100, Math.round((currentLabelIndex / totalLabels) * 100)) : 0;

  const handleExportFailedRowsCSV = () => {
    if (failedRows.length === 0) return;
    const headers = ['Row Number', 'Product Name', 'Barcode Number', 'Batch Number', 'Copies', 'Failure Reason'];
    const csvRows = [headers.join(',')];

    failedRows.forEach((r) => {
      csvRows.push([
        r.rowIndex,
        `"${(r.productName || '').replace(/"/g, '""')}"`,
        `"${(r.barcodeNumber || '').replace(/"/g, '""')}"`,
        `"${(r.batchNumber || '').replace(/"/g, '""')}"`,
        r.copies,
        `"${(r.failureReason || r.errorMessage || 'Printer error').replace(/"/g, '""')}"`
      ].join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Matadin_Failed_Labels_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-[#0B1B3A] text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg border border-amber-500/30">
              <Printer className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <div>
              <h3 className="text-lg font-bold">
                {hasRecoveryJob
                  ? 'Resume Previous Print Job?'
                  : isFinished
                  ? 'Bulk Thermal Printing Completed'
                  : 'Bulk Thermal Printing in Progress'}
              </h3>
              <p className="text-xs text-slate-300">
                Direct Thermal Spooler Engine
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          
          {/* Recovery State Option */}
          {hasRecoveryJob && !isFinished && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-3">
              <div className="flex items-start gap-2 text-amber-900 text-xs">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold">Interrupted Print Job Detected</h4>
                  <p>
                    Last successful printed label: <strong>{currentLabelIndex} / {totalLabels}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                {onStartOverRecovery && (
                  <button
                    type="button"
                    onClick={onStartOverRecovery}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg text-xs"
                  >
                    Start Over
                  </button>
                )}
                {onResumeRecovery && (
                  <button
                    type="button"
                    onClick={onResumeRecovery}
                    className="px-4 py-1.5 bg-[#F59E0B] hover:bg-[#D97706] text-slate-950 font-black rounded-lg text-xs"
                  >
                    Resume Printing
                  </button>
                )}
              </div>
            </div>
          )}

          {!hasRecoveryJob && (
            <>
              {/* Progress Bar & Counter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-600">Progress Counter</span>
                  <span className="text-[#0B1B3A]">
                    Printing {currentLabelIndex} / {totalLabels} ({percentage}%)
                  </span>
                </div>

                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-200"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>

              {/* Current Active Item Card */}
              {currentRow && !isFinished && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="font-bold text-slate-900 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-[#0B1B3A]" /> {currentRow.productName}
                    </span>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-mono text-[11px]">
                      {currentRow.copies} Cop{currentRow.copies > 1 ? 'ies' : 'y'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-slate-600 font-mono text-[11px] pt-1">
                    <div className="flex items-center gap-1">
                      <Barcode className="w-3.5 h-3.5 text-slate-400" /> BC: {currentRow.barcodeNumber}
                    </div>
                    <div className="flex items-center gap-1">
                      <Hash className="w-3.5 h-3.5 text-slate-400" /> Batch: {currentRow.batchNumber}
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-200/60 truncate">
                    Printer: <strong>{printerName || 'Direct Thermal Spooler'}</strong>
                  </div>
                </div>
              )}

              {/* Completion Summary */}
              {isFinished && (
                <div className="space-y-3 border-t border-slate-200 pt-3">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <div className="text-emerald-800 font-bold">Printed</div>
                      <div className="text-xl font-black text-emerald-900">{successCount}</div>
                    </div>
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                      <div className="text-red-800 font-bold">Failed</div>
                      <div className="text-xl font-black text-red-900">{failedCount}</div>
                    </div>
                    <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl">
                      <div className="text-slate-700 font-bold">Skipped</div>
                      <div className="text-xl font-black text-slate-900">{skippedCount}</div>
                    </div>
                  </div>

                  {failedRows.length > 0 && (
                    <button
                      type="button"
                      onClick={handleExportFailedRowsCSV}
                      className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-800 font-bold text-xs rounded-xl border border-red-200 flex items-center justify-center gap-1.5 transition"
                    >
                      <Download className="w-4 h-4 text-red-600" /> Export Failed Rows to CSV ({failedRows.length})
                    </button>
                  )}
                </div>
              )}
            </>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          {!isFinished && !hasRecoveryJob && (
            <>
              <button
                type="button"
                onClick={onPauseToggle}
                className={`px-4 py-2 font-bold rounded-xl text-xs flex items-center gap-1.5 transition ${
                  isPaused
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                }`}
              >
                {isPaused ? (
                  <>
                    <Play className="w-4 h-4" /> Resume Printing
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4" /> Pause Printing
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
              >
                <XCircle className="w-4 h-4" /> Cancel Job
              </button>
            </>
          )}

          {(isFinished || hasRecoveryJob) && (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition"
              >
                Close
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
