import React, { useState, useEffect } from 'react';
import { AppSettings, PrinterDevice } from '../types/label';
import { X, Settings as SettingsIcon, Save, CheckCircle2, Building, Printer, Hash, Clock, FileText } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  printers: PrinterDevice[];
  onSettingsSaved: (settings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  printers,
  onSettingsSaved
}) => {
  const [settings, setSettings] = useState<AppSettings>({
    defaultPrinter: '',
    defaultCopies: 1,
    defaultBestBefore: '60 Days',
    autoPrintAfterSave: false,
    autoIncrementBatch: false,
    companyAddress: '15, income tex colony, rana pratap nagar, 440022',
    gstin: 'GST NO.27ABFFM5946H1ZY',
    fssaiNo: 'FSSAI – 11517055001007'
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const fetchSettings = async () => {
    try {
      if (window.electronAPI?.getSettings) {
        const storedMap = await window.electronAPI.getSettings();
        setSettings((prev) => ({
          ...prev,
          defaultPrinter: storedMap.defaultPrinter || prev.defaultPrinter,
          defaultCopies: storedMap.defaultCopies ? parseInt(storedMap.defaultCopies, 10) : prev.defaultCopies,
          defaultBestBefore: storedMap.defaultBestBefore || prev.defaultBestBefore,
          autoPrintAfterSave: storedMap.autoPrintAfterSave === 'true',
          autoIncrementBatch: storedMap.autoIncrementBatch === 'true',
          companyAddress: storedMap.companyAddress || prev.companyAddress,
          gstin: storedMap.gstin || prev.gstin,
          fssaiNo: storedMap.fssaiNo || prev.fssaiNo
        }));
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (window.electronAPI?.saveSettings) {
        const map: Record<string, string> = {
          defaultPrinter: settings.defaultPrinter || '',
          defaultCopies: String(settings.defaultCopies || 1),
          defaultBestBefore: settings.defaultBestBefore || '60 Days',
          autoPrintAfterSave: String(settings.autoPrintAfterSave || false),
          autoIncrementBatch: String(settings.autoIncrementBatch || false),
          companyAddress: settings.companyAddress || '',
          gstin: settings.gstin || '',
          fssaiNo: settings.fssaiNo || ''
        };
        await window.electronAPI.saveSettings(map);
        onSettingsSaved(settings);
        setSavedSuccess(true);
        setTimeout(() => {
          setSavedSuccess(false);
          onClose();
        }, 800);
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-[#0B1B3A] text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg border border-amber-500/30">
              <SettingsIcon className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <div>
              <h3 className="text-lg font-bold">System Preferences & Settings</h3>
              <p className="text-xs text-slate-300">Stored locally in SQLite database</p>
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
        <div className="p-6 overflow-y-auto space-y-4 max-h-[70vh]">
          {/* Default Printer & Copies */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5 text-[#0B1B3A]" /> Default Thermal Printer
              </label>
              <select
                value={settings.defaultPrinter}
                onChange={(e) => setSettings({ ...settings, defaultPrinter: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900"
              >
                <option value="">(Auto Detect Thermal Printer)</option>
                {printers.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name} {p.isDefault ? '(OS Default)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-[#0B1B3A]" /> Default Copies
              </label>
              <input
                type="number"
                min="1"
                max="999"
                value={settings.defaultCopies}
                onChange={(e) => setSettings({ ...settings, defaultCopies: parseInt(e.target.value, 10) || 1 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900"
              />
            </div>
          </div>

          {/* Expiry Default & Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#0B1B3A]" /> Default Best Before Period
              </label>
              <select
                value={settings.defaultBestBefore}
                onChange={(e) => setSettings({ ...settings, defaultBestBefore: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900"
              >
                <option value="15 Days">15 Days</option>
                <option value="30 Days">30 Days</option>
                <option value="60 Days">60 Days</option>
                <option value="90 Days">90 Days</option>
                <option value="180 Days">180 Days</option>
              </select>
            </div>

            <div className="space-y-2 pt-4">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoIncrementBatch}
                  onChange={(e) => setSettings({ ...settings, autoIncrementBatch: e.target.checked })}
                  className="rounded border-slate-300 text-[#0B1B3A] focus:ring-[#0B1B3A]"
                />
                <span>Auto Increment Batch Number</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoPrintAfterSave}
                  onChange={(e) => setSettings({ ...settings, autoPrintAfterSave: e.target.checked })}
                  className="rounded border-slate-300 text-[#0B1B3A] focus:ring-[#0B1B3A]"
                />
                <span>Auto Print After Template Selection</span>
              </label>
            </div>
          </div>

          {/* Legal / Statutory Headers */}
          <div className="border-t border-slate-200 pt-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-[#0B1B3A]" /> Statutory & Label Header Values
            </h4>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-700">Company Address Line</label>
              <input
                type="text"
                value={settings.companyAddress}
                onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-700">GSTIN Number</label>
                <input
                  type="text"
                  value={settings.gstin}
                  onChange={(e) => setSettings({ ...settings, gstin: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-700">FSSAI License No.</label>
                <input
                  type="text"
                  value={settings.fssaiNo}
                  onChange={(e) => setSettings({ ...settings, fssaiNo: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900"
                />
              </div>
            </div>
          </div>

          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Settings saved to local SQLite database!</span>
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
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md transition disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-slate-950" />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

      </div>
    </div>
  );
};
