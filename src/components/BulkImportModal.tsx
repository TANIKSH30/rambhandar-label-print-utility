import React, { useState, useMemo } from 'react';
import {
  BulkImportRow,
  ColumnMapping,
  ALIAS_MAP,
  generateMatadinTemplateWorkbook
} from '../utils/excelParser';
import {
  X,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Printer,
  Trash2,
  Filter,
  Search,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Clock,
  Layers
} from 'lucide-react';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  headers: string[];
  rawRows: Record<string, any>[];
  rows: BulkImportRow[];
  mapping: ColumnMapping;
  onUpdateMapping: (newMapping: ColumnMapping) => void;
  onUpdateRows: (updatedRows: BulkImportRow[]) => void;
  onStartBulkPrint: (validRowsToPrint: BulkImportRow[]) => void;
  onReImportFile: () => void;
  selectedPrinter: string;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  headers,
  rawRows,
  rows,
  mapping,
  onUpdateMapping,
  onUpdateRows,
  onStartBulkPrint,
  onReImportFile,
  selectedPrinter
}) => {
  const [step, setStep] = useState<'mapping' | 'preview' | 'confirm'>('preview');
  const [search, setSearch] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'valid' | 'invalid' | 'duplicates'>('all');
  const [tempMapping, setTempMapping] = useState<ColumnMapping>(mapping);

  if (!isOpen) return null;

  // Filtered rows for preview table
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      // Search filter
      const q = search.trim().toLowerCase();
      if (q) {
        const matchStr = `${r.productName} ${r.barcodeNumber} ${r.batchNumber} ${r.netWeight} ${r.mrp}`.toLowerCase();
        if (!matchStr.includes(q)) return false;
      }

      // Filter type
      if (filterType === 'valid') return r.isValid;
      if (filterType === 'invalid') return !r.isValid;
      if (filterType === 'duplicates') return r.isDuplicateInFile || r.isDuplicateInHistory;

      return true;
    });
  }, [rows, search, filterType]);

  const validRows = useMemo(() => rows.filter((r) => r.isValid), [rows]);
  const invalidRows = useMemo(() => rows.filter((r) => !r.isValid), [rows]);
  const duplicateRows = useMemo(() => rows.filter((r) => r.isDuplicateInFile || r.isDuplicateInHistory), [rows]);

  const totalCopies = useMemo(() => {
    return validRows.reduce((acc, r) => acc + (r.copies || 1), 0);
  }, [validRows]);

  // Estimated print time formula: ~150ms per copy + 50ms setup overhead
  const estimatedSeconds = Math.ceil(totalCopies * 0.15 + validRows.length * 0.05);
  const estimatedMinStr = `${Math.floor(estimatedSeconds / 60)}m ${estimatedSeconds % 60}s`;

  const handleDownloadTemplateClick = () => {
    try {
      const buffer = generateMatadinTemplateWorkbook();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Matadin_Label_Template.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to generate sample template:', err);
    }
  };

  const handleRemoveRow = (index: number) => {
    const updated = rows.filter((_, i) => i !== index);
    onUpdateRows(updated);
  };

  const handleRemoveInvalidRows = () => {
    const updated = rows.filter((r) => r.isValid);
    onUpdateRows(updated);
  };

  const handleSkipDuplicates = () => {
    const updated = rows.filter((r) => !r.isDuplicateInFile && !r.isDuplicateInHistory);
    onUpdateRows(updated);
  };

  const handleSaveMapping = () => {
    onUpdateMapping(tempMapping);
    setStep('preview');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-[#0B1B3A] text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg border border-amber-500/30">
              <FileSpreadsheet className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Excel Bulk Label Import</h3>
              <p className="text-xs text-slate-300">
                100% Offline Batch Thermal Label Generation & Verification
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadTemplateClick}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-amber-500/30 transition"
            >
              <Download className="w-3.5 h-3.5" /> Download Sample Template
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* STEP 1: Column Mapping Wizard */}
        {step === 'mapping' && (
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3 text-amber-900 text-xs">
              <Sparkles className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm">Smart Column Mapping Wizard</h4>
                <p>
                  Map your Excel file headers to Matadin Ram Bhandar label fields.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(Object.keys(ALIAS_MAP) as Array<keyof ColumnMapping>).map((field) => (
                <div key={field} className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                    {field.replace(/([A-Z])/g, ' $1')}
                  </label>
                  <select
                    value={tempMapping[field] || ''}
                    onChange={(e) => setTempMapping({ ...tempMapping, [field]: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
                  >
                    <option value="">--(Skip / Blank)--</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setStep('preview')}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs"
              >
                Back to Preview
              </button>
              <button
                type="button"
                onClick={handleSaveMapping}
                className="px-5 py-2 bg-[#0B1B3A] hover:bg-[#152a54] text-white font-bold rounded-xl text-xs"
              >
                Apply Column Mapping
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Preview & Validation Table */}
        {step === 'preview' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Top Metric Cards */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-5 gap-3 shrink-0">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Rows</span>
                <span className="text-lg font-black text-[#0B1B3A]">{rows.length}</span>
              </div>
              <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200/80 shadow-sm flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Valid Labels</span>
                <span className="text-lg font-black text-emerald-800">{validRows.length}</span>
              </div>
              <div className="bg-red-50/70 p-3 rounded-xl border border-red-200/80 shadow-sm flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-700">Invalid Rows</span>
                <span className="text-lg font-black text-red-800">{invalidRows.length}</span>
              </div>
              <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/80 shadow-sm flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Total Copies</span>
                <span className="text-lg font-black text-amber-900">{totalCopies}</span>
              </div>
              <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200/80 shadow-sm flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Est. Time</span>
                <span className="text-lg font-black text-blue-900">{estimatedMinStr}</span>
              </div>
            </div>

            {/* Warning Banner for Duplicates or Invalid Rows */}
            {duplicateRows.length > 0 && (
              <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between text-xs text-amber-900 shrink-0">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>{duplicateRows.length} Duplicate Barcode(s) Detected!</strong> (In-file or SQLite history match).
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSkipDuplicates}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px]"
                  >
                    Skip Duplicates
                  </button>
                </div>
              </div>
            )}

            {/* Filter & Search Bar */}
            <div className="p-3 bg-white border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search product, barcode, batch..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B1B3A]/20"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setFilterType('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      filterType === 'all' ? 'bg-white text-[#0B1B3A] shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    All ({rows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('valid')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      filterType === 'valid' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    Valid ({validRows.length})
                  </button>
                  {invalidRows.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterType('invalid')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        filterType === 'invalid' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      Invalid ({invalidRows.length})
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep('mapping')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1"
                >
                  <Filter className="w-3.5 h-3.5 text-slate-500" /> Mapping Wizard
                </button>
                {invalidRows.length > 0 && (
                  <button
                    type="button"
                    onClick={handleRemoveInvalidRows}
                    className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 font-bold rounded-xl text-xs flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600" /> Remove Invalid ({invalidRows.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={onReImportFile}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" /> Re-import File
                </button>
              </div>
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-y-auto p-4">
              {filteredRows.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                  <FileSpreadsheet className="w-10 h-10 text-slate-300" />
                  <p className="text-sm font-medium">No rows match the selected filter query.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3">Weight / MRP</th>
                      <th className="py-2.5 px-3">Batch</th>
                      <th className="py-2.5 px-3">Barcode</th>
                      <th className="py-2.5 px-3">Packed Date</th>
                      <th className="py-2.5 px-3">Best Before</th>
                      <th className="py-2.5 px-3 text-center">Copies</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredRows.map((r) => (
                      <tr
                        key={r.rowIndex}
                        className={`transition ${
                          !r.isValid
                            ? 'bg-red-50/80 hover:bg-red-100/80'
                            : r.isDuplicateInFile || r.isDuplicateInHistory
                            ? 'bg-amber-50/50 hover:bg-amber-100/50'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-500">{r.rowIndex}</td>
                        <td className="py-2.5 px-3">
                          {r.isValid ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-md text-[10px]">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-800 font-bold rounded-md text-[10px]" title={r.errorMessage}>
                              <AlertCircle className="w-3 h-3 text-red-600" /> Invalid
                            </span>
                          )}
                          {(r.isDuplicateInFile || r.isDuplicateInHistory) && (
                            <span className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-200 text-amber-900 font-bold rounded-md text-[9px]">
                              Dup
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{r.productName || <span className="text-red-500 italic">Missing</span>}</td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {r.netWeight} | ₹{r.mrp}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">{r.batchNumber || <span className="text-red-500 italic">Missing</span>}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{r.barcodeNumber || <span className="text-red-500 italic">Missing</span>}</td>
                        <td className="py-2.5 px-3 text-slate-600">{r.packedDate}</td>
                        <td className="py-2.5 px-3 text-slate-600">{r.bestBefore}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-900 rounded font-mono">{r.copies}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(r.rowIndex - 1)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer Control Bar */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
              <div className="text-xs text-slate-600 font-medium">
                Target Printer: <strong className="text-slate-900">{selectedPrinter || 'Direct Thermal Spooler'}</strong>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setStep('confirm')}
                  disabled={validRows.length === 0}
                  className="px-6 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md transition disabled:opacity-50"
                >
                  Proceed to Confirmation <ArrowRight className="w-4 h-4 text-slate-950" />
                </button>
              </div>
            </div>

          </div>
        )}

        {/* STEP 3: Print Confirmation Screen */}
        {step === 'confirm' && (
          <div className="p-8 flex-1 flex flex-col items-center justify-center text-slate-800 space-y-6">
            <div className="bg-slate-50 border border-slate-200 p-8 rounded-2xl shadow-sm max-w-md w-full text-center space-y-5">
              <div className="w-14 h-14 bg-amber-500/20 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto text-[#F59E0B]">
                <Printer className="w-7 h-7" />
              </div>

              <h3 className="text-xl font-black text-[#0B1B3A]">Bulk Print Confirmation</h3>

              <div className="divide-y divide-slate-200 text-xs text-left bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between py-1">
                  <span className="font-semibold text-slate-500">Target Printer:</span>
                  <span className="font-bold text-slate-900">{selectedPrinter || 'Direct Thermal Spooler'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-semibold text-slate-500">Valid Label Items:</span>
                  <span className="font-bold text-emerald-700">{validRows.length} Labels</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-semibold text-slate-500">Total Copies to Dispatch:</span>
                  <span className="font-bold text-amber-900">{totalCopies} Copies</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-semibold text-slate-500">Estimated Duration:</span>
                  <span className="font-bold text-blue-900">{estimatedMinStr}</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('preview')}
                  className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => onStartBulkPrint(validRows)}
                  className="px-8 py-2.5 bg-[#F59E0B] hover:bg-[#D97706] text-slate-950 font-black text-sm rounded-xl shadow-lg transition active:scale-95 flex items-center gap-2"
                >
                  <Printer className="w-5 h-5 text-slate-950" /> Start Thermal Printing
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
