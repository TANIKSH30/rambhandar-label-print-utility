import React, { useState, useEffect } from 'react';
import { PrintHistoryRecord } from '../types/label';
import { X, Search, RotateCw, Calendar, Tag, Barcode, Printer, CheckCircle, AlertCircle } from 'lucide-react';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReprint: (record: PrintHistoryRecord) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, onReprint }) => {
  const [history, setHistory] = useState<PrintHistoryRecord[]>([]);
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [reprintingId, setReprintingId] = useState<number | null>(null);

  const fetchHistory = async (searchTerm?: string) => {
    setLoading(true);
    try {
      if (window.electronAPI?.getPrintHistory) {
        const records = await window.electronAPI.getPrintHistory({ search: searchTerm || '', limit: 100 });
        setHistory(records);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory(search);
    }
  }, [isOpen, search]);

  if (!isOpen) return null;

  const handleReprintClick = async (record: PrintHistoryRecord) => {
    if (!record.id) return;
    setReprintingId(record.id);
    try {
      await onReprint(record);
    } finally {
      setTimeout(() => setReprintingId(null), 500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-[#0B1B3A] text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg border border-amber-500/30">
              <RotateCw className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Print Label History</h3>
              <p className="text-xs text-slate-300">Local SQLite Audit Log & Quick Reprint</p>
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

        {/* Filter Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Product, Barcode, or Batch..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B1B3A]/20 focus:border-[#0B1B3A]"
            />
          </div>
          <div className="text-xs text-slate-500 font-semibold">
            Total Logs: <span className="text-[#0B1B3A] font-bold">{history.length}</span>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
              Loading print records...
            </div>
          ) : history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
              <Printer className="w-10 h-10 text-slate-300" />
              <p className="text-sm font-medium">No print history found matching query.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                  <th className="py-3 px-3">Date & Time</th>
                  <th className="py-3 px-3">Product</th>
                  <th className="py-3 px-3">Weight / MRP</th>
                  <th className="py-3 px-3">Batch / Barcode</th>
                  <th className="py-3 px-3">Copies</th>
                  <th className="py-3 px-3">Printer</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {history.map((record) => {
                  const pDate = new Date(record.printDate);
                  const formattedDate = isNaN(pDate.getTime())
                    ? record.printDate
                    : `${pDate.toLocaleDateString()} ${pDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

                  return (
                    <tr key={record.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3 font-medium text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {formattedDate}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-[#0B1B3A]" />
                          {record.productName}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-700">
                        <span className="font-semibold">{record.netWeight}</span> | ₹{record.mrp}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600">
                        <div className="text-[11px] font-bold text-slate-800">Batch: {record.batchNumber}</div>
                        <div className="text-[10px] text-slate-500">BC: {record.barcodeNumber}</div>
                      </td>
                      <td className="py-3 px-3 font-black text-slate-900">
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-800 rounded-md font-mono">
                          {record.copies}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 truncate max-w-[140px]">
                        {record.printerName || 'Default'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleReprintClick(record)}
                          disabled={reprintingId === record.id}
                          className="px-3 py-1.5 bg-[#F59E0B] hover:bg-[#D97706] text-slate-950 font-bold rounded-lg text-xs transition active:scale-95 shadow-sm disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          <RotateCw className={`w-3.5 h-3.5 ${reprintingId === record.id ? 'animate-spin' : ''}`} />
                          Reprint
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition"
          >
            Close (Esc)
          </button>
        </div>

      </div>
    </div>
  );
};
