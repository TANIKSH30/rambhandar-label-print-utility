import React, { useState, useEffect } from 'react';
import { ProductTemplate, LabelData } from '../types/label';
import { X, Plus, Edit2, Trash2, Copy, Check, Sparkles, Tag, Weight, IndianRupee, Clock } from 'lucide-react';

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: ProductTemplate) => void;
  currentLabelData: LabelData;
}

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  currentLabelData
}) => {
  const [templates, setTemplates] = useState<ProductTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<Partial<ProductTemplate> | null>(null);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);

  const fetchTemplates = async () => {
    try {
      if (window.electronAPI?.getTemplates) {
        const list = await window.electronAPI.getTemplates();
        setTemplates(list);
      }
    } catch (err) {
      console.error('Failed to load product templates:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOpenCreateForm = () => {
    setEditingTemplate({
      productName: currentLabelData.productName || '',
      netWeight: currentLabelData.netWeight || '250GM',
      mrp: currentLabelData.mrp || '100/-',
      defaultBestBefore: '60 Days'
    });
    setIsFormOpen(true);
  };

  const handleSaveForm = async () => {
    if (!editingTemplate || !editingTemplate.productName) return;

    try {
      if (window.electronAPI?.saveTemplate) {
        await window.electronAPI.saveTemplate({
          id: editingTemplate.id,
          productName: editingTemplate.productName,
          netWeight: editingTemplate.netWeight || '250GM',
          mrp: editingTemplate.mrp || '100/-',
          defaultBestBefore: editingTemplate.defaultBestBefore || '60 Days'
        });
        await fetchTemplates();
        setIsFormOpen(false);
        setEditingTemplate(null);
      }
    } catch (err) {
      console.error('Failed to save template:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this product template?')) return;
    try {
      if (window.electronAPI?.deleteTemplate) {
        await window.electronAPI.deleteTemplate(id);
        await fetchTemplates();
      }
    } catch (err) {
      console.error('Failed to delete template:', err);
    }
  };

  const handleDuplicate = async (t: ProductTemplate) => {
    try {
      if (window.electronAPI?.saveTemplate) {
        await window.electronAPI.saveTemplate({
          productName: `${t.productName} (Copy)`,
          netWeight: t.netWeight,
          mrp: t.mrp,
          defaultBestBefore: t.defaultBestBefore
        });
        await fetchTemplates();
      }
    } catch (err) {
      console.error('Failed to duplicate template:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-[#0B1B3A] text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg border border-amber-500/30">
              <Sparkles className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Product Templates Manager</h3>
              <p className="text-xs text-slate-300">Save & Reuse Product Name, Weight, MRP & Default Expiry</p>
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

        {/* Top Control Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <span className="text-xs font-semibold text-slate-600">
            Total Templates: <strong className="text-slate-900">{templates.length}</strong>
          </span>
          <button
            type="button"
            onClick={handleOpenCreateForm}
            className="px-4 py-2 bg-[#0B1B3A] hover:bg-[#152a54] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
          >
            <Plus className="w-4 h-4 text-[#F59E0B]" /> Save Current Form as Template
          </button>
        </div>

        {/* Template Form Drawer/Modal */}
        {isFormOpen && editingTemplate && (
          <div className="bg-amber-50/70 border-b border-amber-200 p-4 animate-fade-in">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-3">
              {editingTemplate.id ? 'Edit Template' : 'New Template'}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-slate-700">Product Name</label>
                <input
                  type="text"
                  value={editingTemplate.productName || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, productName: e.target.value })}
                  placeholder="e.g. Desi Ghee Soan Papdi"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700">Net Weight</label>
                <input
                  type="text"
                  value={editingTemplate.netWeight || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, netWeight: e.target.value })}
                  placeholder="e.g. 500GM"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700">MRP (₹)</label>
                <input
                  type="text"
                  value={editingTemplate.mrp || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, mrp: e.target.value })}
                  placeholder="e.g. 220/-"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900"
                />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-semibold text-slate-700">Default Best Before:</label>
                <select
                  value={editingTemplate.defaultBestBefore || '60 Days'}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, defaultBestBefore: e.target.value })}
                  className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
                >
                  <option value="15 Days">15 Days</option>
                  <option value="30 Days">30 Days</option>
                  <option value="60 Days">60 Days</option>
                  <option value="90 Days">90 Days</option>
                  <option value="180 Days">180 Days</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveForm}
                  className="px-4 py-1 bg-[#F59E0B] hover:bg-[#D97706] text-slate-950 text-xs font-black rounded-lg shadow-sm"
                >
                  Save Template
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {templates.map((t) => (
              <div
                key={t.id}
                className="bg-white border border-slate-200 hover:border-slate-400 p-4 rounded-xl shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-[#0B1B3A]" /> {t.productName}
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md">
                      {t.defaultBestBefore}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs text-slate-600 font-medium">
                    <span className="flex items-center gap-1">
                      <Weight className="w-3.5 h-3.5 text-slate-400" /> {t.netWeight}
                    </span>
                    <span className="flex items-center gap-1">
                      <IndianRupee className="w-3.5 h-3.5 text-slate-400" /> ₹{t.mrp}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTemplate(t);
                      onClose();
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-sm transition"
                  >
                    <Check className="w-3.5 h-3.5" /> Apply Template
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleDuplicate(t)}
                      title="Duplicate"
                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTemplate(t);
                        setIsFormOpen(true);
                      }}
                      title="Edit"
                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {t.id && (
                      <button
                        type="button"
                        onClick={() => handleDelete(t.id!)}
                        title="Delete"
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
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
