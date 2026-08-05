import React from 'react';
import { LabelData } from '../types/label';
import { Tag, Weight, IndianRupee, Hash, Barcode, Calendar, Clock, Sparkles } from 'lucide-react';

interface LabelDetailsFormProps {
  labelData: LabelData;
  onChange: (updated: Partial<LabelData>) => void;
}

const PRODUCT_PRESETS = [
  'Desi Ghee Soan Papdi',
  'Special Kaju Katli',
  'Mathura Peda',
  'Desi Ghee Besan Ladoo',
  'Gulab Jamun Pack',
  'Rasgulla Tinned',
  'Special Royal Namkeen',
  'All-in-One Mixture',
  'Ratlami Sev',
  'Bhakharwadi Crunch'
];

export const LabelDetailsForm: React.FC<LabelDetailsFormProps> = ({ labelData, onChange }) => {
  const handleInputChange = (field: keyof LabelData, value: string) => {
    onChange({ [field]: value });
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between h-full">
      <div>
        {/* Card Header */}
        <div className="border-b border-slate-100 pb-4 mb-5">
          <h2 className="text-xl font-bold text-[#111827] tracking-tight">Label Details</h2>
          <p className="text-xs font-medium text-slate-500 mt-1">Enter product label information</p>
        </div>

        {/* 2-Column Desktop Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Product Name (Span 2) */}
          <div className="md:col-span-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#0B1B3A]" /> Product Name
              </label>
              <span className="text-[10px] font-medium text-slate-400">Quick Presets Available</span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={labelData.productName}
                onChange={(e) => handleInputChange('productName', e.target.value)}
                placeholder="e.g. Desi Ghee Soan Papdi"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#0B1B3A]/20 focus:border-[#0B1B3A] transition"
              />
            </div>
            
            {/* Quick Product Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {PRODUCT_PRESETS.slice(0, 5).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleInputChange('productName', preset)}
                  className="text-[11px] font-medium px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition border border-slate-200"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Net Weight */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Weight className="w-3.5 h-3.5 text-[#0B1B3A]" /> Net Weight
            </label>
            <input
              type="text"
              value={labelData.netWeight}
              onChange={(e) => handleInputChange('netWeight', e.target.value)}
              placeholder="e.g. 500 g"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#0B1B3A]/20 focus:border-[#0B1B3A] transition"
            />
          </div>

          {/* MRP */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <IndianRupee className="w-3.5 h-3.5 text-[#0B1B3A]" /> MRP (₹)
            </label>
            <input
              type="text"
              value={labelData.mrp}
              onChange={(e) => handleInputChange('mrp', e.target.value)}
              placeholder="e.g. 250.00"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#0B1B3A]/20 focus:border-[#0B1B3A] transition"
            />
          </div>

          {/* Batch Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-[#0B1B3A]" /> Batch Number
            </label>
            <input
              type="text"
              value={labelData.batchNumber}
              onChange={(e) => handleInputChange('batchNumber', e.target.value)}
              placeholder="e.g. MRB-2026-08"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#0B1B3A]/20 focus:border-[#0B1B3A] transition"
            />
          </div>

          {/* Barcode Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Barcode className="w-3.5 h-3.5 text-[#0B1B3A]" /> Barcode Number
            </label>
            <input
              type="text"
              value={labelData.barcodeNumber}
              onChange={(e) => handleInputChange('barcodeNumber', e.target.value)}
              placeholder="e.g. 8901234567890"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#0B1B3A]/20 focus:border-[#0B1B3A] transition font-mono"
            />
          </div>

          {/* Packed Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#0B1B3A]" /> Packed Date
            </label>
            <input
              type="text"
              value={labelData.packedDate}
              onChange={(e) => handleInputChange('packedDate', e.target.value)}
              placeholder="e.g. 04-Aug-2026"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#0B1B3A]/20 focus:border-[#0B1B3A] transition"
            />
          </div>

          {/* Best Before */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#0B1B3A]" /> Best Before
            </label>
            <input
              type="text"
              value={labelData.bestBefore}
              onChange={(e) => handleInputChange('bestBefore', e.target.value)}
              placeholder="e.g. 6 Months from Packaging"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#0B1B3A]/20 focus:border-[#0B1B3A] transition"
            />
          </div>
        </div>
      </div>

      {/* Industrial Footer Note */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" /> Standard 80 × 50 mm Label Format
        </span>
        <span className="font-semibold text-slate-500">Matadin Ram Bhandar</span>
      </div>
    </div>
  );
};
