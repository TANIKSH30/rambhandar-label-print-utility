import React, { useState, useEffect } from 'react';
import { LabelData, ProductTemplate } from '../types/label';
import { Tag, Weight, IndianRupee, Hash, Barcode, Calendar, Clock, Sparkles, LayoutGrid, Plus, Check } from 'lucide-react';
import {
  getProductMasterAsync,
  searchProductMasterAsync,
  addOrUpdateProductMasterItem,
  ProductMasterItem
} from '../utils/productMaster';

interface LabelDetailsFormProps {
  labelData: LabelData;
  onChange: (updated: Partial<LabelData>) => void;
  templates: ProductTemplate[];
  onOpenTemplatesModal: () => void;
}

const EXPIRY_PRESETS = [
  { label: '15 Days', days: 15 },
  { label: '30 Days', days: 30 },
  { label: '60 Days', days: 60 },
  { label: '90 Days', days: 90 },
  { label: '180 Days', days: 180 }
];

export const LabelDetailsForm: React.FC<LabelDetailsFormProps> = ({
  labelData,
  onChange,
  templates,
  onOpenTemplatesModal
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedExpiryPreset, setSelectedExpiryPreset] = useState<string>('60 Days');

  // Autocomplete Product Master State
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<ProductMasterItem[]>([]);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [isExistingInMaster, setIsExistingInMaster] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    searchProductMasterAsync(labelData.productName).then((res) => {
      if (isMounted) {
        setSuggestions(res);
        const exists = res.some(
          (p) => p.productName.toLowerCase() === labelData.productName.trim().toLowerCase()
        );
        setIsExistingInMaster(exists);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [labelData.productName]);

  const handleInputChange = (field: keyof LabelData, value: string) => {
    onChange({ [field]: value });
  };

  const handleProductNameChange = (value: string) => {
    onChange({ productName: value });
    setShowSuggestions(true);
    searchProductMasterAsync(value).then((res) => setSuggestions(res));
  };

  const handleSelectProductMasterItem = (item: ProductMasterItem) => {
    setShowSuggestions(false);
    onChange({
      productName: item.productName,
      netWeight: item.netWeight || labelData.netWeight,
      mrp: item.mrp || labelData.mrp,
      barcodeNumber: item.barcodeNumber || labelData.barcodeNumber,
      batchNumber: item.defaultBatchNumber || labelData.batchNumber,
      bestBefore: item.defaultBestBefore || labelData.bestBefore
    });
  };

  const handleSaveCurrentToMaster = async () => {
    if (!labelData.productName || !labelData.productName.trim()) return;
    await addOrUpdateProductMasterItem({
      productName: labelData.productName,
      netWeight: labelData.netWeight,
      mrp: labelData.mrp,
      barcodeNumber: labelData.barcodeNumber,
      defaultBatchNumber: labelData.batchNumber,
      defaultBestBefore: labelData.bestBefore
    });
    setSavedSuccess(true);
    setIsExistingInMaster(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  // Helper to format today's date: e.g. "05 - 08 - 2026"
  const getTodayFormatted = () => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day} - ${month} - ${year}`;
  };

  // Calculate Best Before date given days offset
  const calculateBestBeforeDate = (days: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day} - ${month} - ${year}`;
  };

  // Auto-fill Packed Date if empty
  useEffect(() => {
    if (!labelData.packedDate) {
      onChange({ packedDate: getTodayFormatted() });
    }
  }, []);

  const handleExpiryPresetChange = (presetLabel: string) => {
    setSelectedExpiryPreset(presetLabel);
    const matched = EXPIRY_PRESETS.find((p) => p.label === presetLabel);
    if (matched) {
      const calculated = calculateBestBeforeDate(matched.days);
      onChange({ bestBefore: calculated });
    }
  };

  const handleTemplateSelect = (tId: string) => {
    setSelectedTemplateId(tId);
    if (!tId) return;

    const t = templates.find((item) => String(item.id) === tId);
    if (t) {
      const updated: Partial<LabelData> = {
        productName: t.productName,
        netWeight: t.netWeight,
        mrp: t.mrp
      };

      if (t.defaultBestBefore) {
        setSelectedExpiryPreset(t.defaultBestBefore);
        const matched = EXPIRY_PRESETS.find((p) => p.label === t.defaultBestBefore);
        if (matched) {
          updated.bestBefore = calculateBestBeforeDate(matched.days);
        } else {
          updated.bestBefore = t.defaultBestBefore;
        }
      }

      onChange(updated);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between h-full">
      <div>
        {/* Card Header & Product Template Selector */}
        <div className="border-b border-slate-100 pb-4 mb-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#111827] tracking-tight">Label Details</h2>
            <button
              type="button"
              onClick={onOpenTemplatesModal}
              className="text-xs font-bold text-[#0B1B3A] hover:text-amber-600 flex items-center gap-1 transition"
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Manage Templates
            </button>
          </div>

          {/* Product Template Dropdown */}
          <div className="mt-3 bg-amber-50/70 border border-amber-200 p-2.5 rounded-xl flex items-center gap-2">
            <label className="text-xs font-bold text-amber-900 shrink-0 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" /> Select Product Template:
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => handleTemplateSelect(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              <option value="">-- Choose Preset Product Template --</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.productName} ({t.netWeight} | ₹{t.mrp})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 2-Column Desktop Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Product Name Autocomplete Combobox (Span 2) */}
          <div className="md:col-span-2 space-y-1.5 relative">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#0B1B3A]" /> Product Name
              </label>

              {savedSuccess ? (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-600" /> Saved to Master
                </span>
              ) : !isExistingInMaster && labelData.productName.trim() ? (
                <button
                  type="button"
                  onClick={handleSaveCurrentToMaster}
                  className="text-[10px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1 transition shadow-xs"
                >
                  <Plus className="w-3 h-3 text-amber-600" /> Save to Master
                </button>
              ) : null}
            </div>

            <input
              type="text"
              value={labelData.productName}
              onChange={(e) => handleProductNameChange(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Type product name (e.g. Falhari Chiwda)..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#0B1B3A]/20 focus:border-[#0B1B3A] transition"
            />

            {/* Live Autocomplete Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-auto py-1">
                {suggestions.map((item) => (
                  <button
                    key={(item.id || '') + item.productName}
                    type="button"
                    onMouseDown={() => handleSelectProductMasterItem(item)}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0 flex items-center justify-between text-xs transition"
                  >
                    <div>
                      <div className="font-bold text-[#0B1B3A] text-sm">{item.productName}</div>
                      <div className="text-slate-500 text-[11px]">
                        Weight: {item.netWeight} | MRP: ₹{item.mrp}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-xs font-bold text-slate-700">#{item.barcodeNumber}</div>
                      <div className="text-[10px] text-amber-600 font-semibold">Click to Auto-fill</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
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
              placeholder="e.g. 500GM"
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
              placeholder="e.g. 220/-"
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
              placeholder="e.g. sep2026"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#0B1B3A]/20 focus:border-[#0B1B3A] transition font-mono"
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
              placeholder="e.g. 12345678"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#0B1B3A]/20 focus:border-[#0B1B3A] transition font-mono"
            />
          </div>

          {/* Packed Date (Auto-filled today) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#0B1B3A]" /> Packed Date
              </label>
              <button
                type="button"
                onClick={() => onChange({ packedDate: getTodayFormatted() })}
                className="text-[10px] font-bold text-amber-600 hover:underline"
              >
                Set Today
              </button>
            </div>
            <input
              type="text"
              value={labelData.packedDate}
              onChange={(e) => handleInputChange('packedDate', e.target.value)}
              placeholder="e.g. 30 - 09 - 2026"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#0B1B3A]/20 focus:border-[#0B1B3A] transition"
            />
          </div>

          {/* Best Before & Preset Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#0B1B3A]" /> Best Before
              </label>
              
              {/* Expiry Dropdown Preset */}
              <select
                value={selectedExpiryPreset}
                onChange={(e) => handleExpiryPresetChange(e.target.value)}
                className="text-[10px] font-bold bg-slate-100 border border-slate-300 rounded-md px-1.5 py-0.5 text-slate-800"
              >
                <option value="15 Days">15 Days</option>
                <option value="30 Days">30 Days</option>
                <option value="60 Days">60 Days</option>
                <option value="90 Days">90 Days</option>
                <option value="180 Days">180 Days</option>
              </select>
            </div>
            <input
              type="text"
              value={labelData.bestBefore}
              onChange={(e) => handleInputChange('bestBefore', e.target.value)}
              placeholder="e.g. 15 - 12 - 2026"
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
