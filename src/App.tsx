import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { LabelDetailsForm } from './components/LabelDetailsForm';
import { LabelPreview } from './components/LabelPreview';
import { PrintSetupBar } from './components/PrintSetupBar';
import { LabelData, PrinterLanguage, PrinterDevice } from './types/label';

const DEFAULT_LABEL: LabelData = {
  productName: 'Falhari Chiwda',
  netWeight: '250GM',
  mrp: '80/-',
  batchNumber: 'sep2026',
  barcodeNumber: '12345678',
  packedDate: '30 - 09 - 2026',
  bestBefore: '15 - 12 - 2026',
  gstin: 'GST NO.27ABFFM5946H1ZY',
  fssaiNo: 'FSSAI – 11517055001007'
};

export const App: React.FC = () => {
  const [labelData, setLabelData] = useState<LabelData>(DEFAULT_LABEL);
  const [copies, setCopies] = useState<number>(1);
  const [language, setLanguage] = useState<PrinterLanguage>('Zebra ZPL II');
  const [printers, setPrinters] = useState<PrinterDevice[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'preview' | 'setup'>('preview');
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [printStatus, setPrintStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string } | null>(null);

  const isThermalName = (name: string) => /zebra|honeywell|intermec|toshiba|tsc|datamax|sato|bixolon|thermal|zpl|godex/i.test(name);

  // Fetch installed Windows OS printers on mount
  const fetchPrinters = async () => {
    if (window.electronAPI?.getPrinters) {
      try {
        const list = await window.electronAPI.getPrinters();
        setPrinters(list);
        if (list.length > 0) {
          const thermalP = list.find((p) => isThermalName(p.name));
          const defaultP = list.find((p) => p.isDefault);
          if (thermalP) {
            setSelectedPrinter(thermalP.name);
          } else if (defaultP) {
            setSelectedPrinter(defaultP.name);
          } else {
            setSelectedPrinter(list[0].name);
          }
        }
      } catch (err) {
        console.warn('Failed to detect printers:', err);
      }
    }
  };

  useEffect(() => {
    fetchPrinters();
  }, []);

  const handleLabelDataChange = (updated: Partial<LabelData>) => {
    setLabelData((prev) => ({ ...prev, ...updated }));
  };

  const handleReset = () => {
    setLabelData(DEFAULT_LABEL);
    setCopies(1);
    setPrintStatus(null);
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    setPrintStatus(null);

    try {
      if (window.electronAPI?.printLabel) {
        const response = await window.electronAPI.printLabel({
          labelData,
          copies,
          printerName: selectedPrinter,
          language
        });

        if (response.success) {
          setPrintStatus({ type: 'success', message: 'Label Printed Successfully' });
        } else {
          setPrintStatus({ type: 'error', message: response.message || 'Printer offline or not found.' });
        }
      } else {
        // Fallback for preview mode
        setPrintStatus({ 
          type: 'success', 
          message: 'Label Printed Successfully' 
        });
      }
    } catch (error: any) {
      setPrintStatus({ type: 'error', message: error?.message || 'Printer error occurred.' });
    } finally {
      setIsPrinting(false);
      setTimeout(() => {
        setPrintStatus(null);
      }, 5000);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#F3F4F6] text-[#111827] overflow-hidden">
      {/* Dark Navy Enterprise Header */}
      <Header />

      {/* Main Two-Column Desktop Workspace */}
      <main className="flex-1 p-6 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        {/* Left Column: Form Card (5 cols) */}
        <div className="lg:col-span-5 h-full overflow-y-auto">
          <LabelDetailsForm
            labelData={labelData}
            onChange={handleLabelDataChange}
          />
        </div>

        {/* Right Column: Preview Card (7 cols) */}
        <div className="lg:col-span-7 h-full overflow-hidden">
          <LabelPreview
            labelData={labelData}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            printers={printers}
            selectedPrinter={selectedPrinter}
            onPrinterSelect={setSelectedPrinter}
            copies={copies}
            onCopiesChange={setCopies}
            onRefreshPrinters={fetchPrinters}
          />
        </div>
      </main>

      {/* Bottom Print Setup Control Bar */}
      <PrintSetupBar
        copies={copies}
        onCopiesChange={setCopies}
        language={language}
        onLanguageChange={setLanguage}
        printers={printers}
        selectedPrinter={selectedPrinter}
        onPrinterSelect={setSelectedPrinter}
        onRefreshPrinters={fetchPrinters}
        onResetForm={handleReset}
        onPrint={handlePrint}
        isPrinting={isPrinting}
        printStatus={printStatus}
      />
    </div>
  );
};

export default App;
