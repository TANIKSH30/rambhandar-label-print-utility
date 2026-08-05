import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { LabelDetailsForm } from './components/LabelDetailsForm';
import { LabelPreview } from './components/LabelPreview';
import { PrintSetupBar } from './components/PrintSetupBar';
import { HistoryModal } from './components/HistoryModal';
import { TemplatesModal } from './components/TemplatesModal';
import { ExportReportModal } from './components/ExportReportModal';
import { SettingsModal } from './components/SettingsModal';
import { HelpModal } from './components/HelpModal';
import { BulkImportModal } from './components/BulkImportModal';
import { BulkPrintProgressModal } from './components/BulkPrintProgressModal';
import {
  parseRawExcelFile,
  autoDetectColumnMapping,
  processImportRows,
  BulkImportRow,
  ColumnMapping
} from './utils/excelParser';
import {
  LabelData,
  PrinterLanguage,
  PrinterDevice,
  PrintHistoryRecord,
  ProductTemplate,
  AppSettings,
  PrinterStatusType
} from './types/label';

const getTodayDateStr = () => {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day} - ${month} - ${year}`;
};

const getCalculatedBestBefore = (days: number = 60) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day} - ${month} - ${year}`;
};

const DEFAULT_LABEL: LabelData = {
  productName: 'Falhari Chiwda',
  netWeight: '250GM',
  mrp: '80/-',
  batchNumber: 'sep2026',
  barcodeNumber: '12345678',
  packedDate: getTodayDateStr(),
  bestBefore: getCalculatedBestBefore(60),
  gstin: 'GST NO.27ABFFM5946H1ZY',
  fssaiNo: 'FSSAI – 11517055001007'
};

export const App: React.FC = () => {
  const [labelData, setLabelData] = useState<LabelData>(DEFAULT_LABEL);
  const [copies, setCopies] = useState<number>(1);
  const [language, setLanguage] = useState<PrinterLanguage>('Zebra ZPL II');
  const [printers, setPrinters] = useState<PrinterDevice[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [printerStatus, setPrinterStatus] = useState<PrinterStatusType>('ready');
  const [activeTab, setActiveTab] = useState<'preview' | 'setup'>('preview');

  // Modals state
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  // Bulk Import state
  const [isBulkImportOpen, setIsBulkImportOpen] = useState<boolean>(false);
  const [bulkHeaders, setBulkHeaders] = useState<string[]>([]);
  const [bulkRawRows, setBulkRawRows] = useState<Record<string, any>[]>([]);
  const [bulkRows, setBulkRows] = useState<BulkImportRow[]>([]);
  const [bulkMapping, setBulkMapping] = useState<ColumnMapping>({
    productName: '',
    netWeight: '',
    mrp: '',
    batchNumber: '',
    barcodeNumber: '',
    packedDate: '',
    bestBefore: '',
    copies: ''
  });

  // Bulk Print Progress state
  const [isBulkPrintProgressOpen, setIsBulkPrintProgressOpen] = useState<boolean>(false);
  const [bulkCurrentIndex, setBulkCurrentIndex] = useState<number>(0);
  const [bulkTotalCount, setBulkTotalCount] = useState<number>(0);
  const [bulkCurrentRow, setBulkCurrentRow] = useState<BulkImportRow | null>(null);
  const [isBulkPaused, setIsBulkPaused] = useState<boolean>(false);
  const [isBulkFinished, setIsBulkFinished] = useState<boolean>(false);
  const [bulkSuccessCount, setBulkSuccessCount] = useState<number>(0);
  const [bulkFailedCount, setBulkFailedCount] = useState<number>(0);
  const [bulkSkippedCount, setBulkSkippedCount] = useState<number>(0);
  const [bulkFailedRows, setBulkFailedRows] = useState<Array<BulkImportRow & { failureReason?: string }>>([]);
  const [hasRecoveryJob, setHasRecoveryJob] = useState<boolean>(false);

  const isBulkPausedRef = useRef<boolean>(false);
  const isBulkCancelledRef = useRef<boolean>(false);
  const pendingBulkQueueRef = useRef<BulkImportRow[]>([]);
  const hiddenFileInputRef = useRef<HTMLInputElement | null>(null);

  // Data state
  const [templates, setTemplates] = useState<ProductTemplate[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>({});

  // Print progress state
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [printProgress, setPrintProgress] = useState<{ current: number; total: number } | null>(null);
  const [printStatus, setPrintStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string } | null>(null);

  const isThermalName = (name: string) => /zebra|honeywell|intermec|toshiba|tsc|datamax|sato|bixolon|thermal|zpl|godex/i.test(name);

  // Fetch printers & initial DB data
  const fetchPrinters = useCallback(async () => {
    if (window.electronAPI?.getPrinters) {
      try {
        const list = await window.electronAPI.getPrinters();
        setPrinters(list);
        if (list.length > 0 && !selectedPrinter) {
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
        console.warn('Failed to detect system printers:', err);
      }
    }
  }, [selectedPrinter]);

  const loadTemplatesAndSettings = useCallback(async () => {
    if (window.electronAPI?.getTemplates) {
      try {
        const tmpls = await window.electronAPI.getTemplates();
        setTemplates(tmpls);
      } catch (err) {
        console.error('Failed to load templates:', err);
      }
    }
    if (window.electronAPI?.getSettings) {
      try {
        const s = await window.electronAPI.getSettings();
        setAppSettings({
          defaultPrinter: s.defaultPrinter,
          defaultCopies: s.defaultCopies ? parseInt(s.defaultCopies, 10) : 1,
          defaultBestBefore: s.defaultBestBefore || '60 Days',
          autoPrintAfterSave: s.autoPrintAfterSave === 'true',
          autoIncrementBatch: s.autoIncrementBatch === 'true',
          companyAddress: s.companyAddress,
          gstin: s.gstin,
          fssaiNo: s.fssaiNo
        });
        if (s.defaultPrinter) setSelectedPrinter(s.defaultPrinter);
        if (s.defaultCopies) setCopies(parseInt(s.defaultCopies, 10) || 1);
        if (s.gstin || s.fssaiNo) {
          setLabelData((prev) => ({
            ...prev,
            gstin: s.gstin || prev.gstin,
            fssaiNo: s.fssaiNo || prev.fssaiNo
          }));
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    }
  }, []);

  // Poll printer status every 5 seconds (Requirement 8)
  const pollPrinterStatus = useCallback(async () => {
    if (window.electronAPI?.checkPrinterStatus) {
      try {
        const res = await window.electronAPI.checkPrinterStatus(selectedPrinter);
        setPrinterStatus(res.status);
      } catch (err) {
        setPrinterStatus('offline');
      }
    }
  }, [selectedPrinter]);

  useEffect(() => {
    fetchPrinters();
    loadTemplatesAndSettings();
  }, []);

  useEffect(() => {
    pollPrinterStatus();
    const interval = setInterval(pollPrinterStatus, 5000);
    return () => clearInterval(interval);
  }, [pollPrinterStatus]);

  const handleLabelDataChange = (updated: Partial<LabelData>) => {
    setLabelData((prev) => ({ ...prev, ...updated }));
  };

  const handleReset = useCallback(() => {
    setLabelData({
      ...DEFAULT_LABEL,
      packedDate: getTodayDateStr(),
      bestBefore: getCalculatedBestBefore(60)
    });
    setCopies(appSettings.defaultCopies || 1);
    setPrintStatus(null);
  }, [appSettings]);

  const handlePrint = async () => {
    if (printerStatus === 'offline') {
      setPrintStatus({ type: 'error', message: 'Thermal printer is offline or disconnected.' });
      return;
    }

    setIsPrinting(true);
    setPrintStatus(null);
    setPrintProgress({ current: 1, total: copies });

    // Live counter animation for multi-copy ZPL dispatch
    const totalCopies = copies;
    let step = 1;
    const progressInterval = setInterval(() => {
      if (step < totalCopies) {
        step += Math.max(1, Math.floor(totalCopies / 10));
        setPrintProgress({ current: Math.min(step, totalCopies), total: totalCopies });
      }
    }, 100);

    try {
      if (window.electronAPI?.printLabel) {
        const response = await window.electronAPI.printLabel({
          labelData,
          copies,
          printerName: selectedPrinter,
          language
        });

        clearInterval(progressInterval);
        setPrintProgress({ current: totalCopies, total: totalCopies });

        if (response.success) {
          setPrintStatus({ type: 'success', message: response.message || 'Label Printed Successfully' });
        } else {
          setPrintStatus({ type: 'error', message: response.message || 'Printer not connected.' });
        }
      } else {
        clearInterval(progressInterval);
        window.print();
        setPrintStatus({ type: 'success', message: 'Print Dialog Opened' });
      }
    } catch (error: any) {
      clearInterval(progressInterval);
      setPrintStatus({ type: 'error', message: error?.message || 'Printer error occurred.' });
    } finally {
      setIsPrinting(false);
      setPrintProgress(null);
      setTimeout(() => {
        setPrintStatus(null);
      }, 5000);
    }
  };

  // Helper to parse file arrayBuffer into state
  const loadExcelArrayBuffer = async (arrayBuffer: ArrayBuffer) => {
    let history: PrintHistoryRecord[] = [];
    if (window.electronAPI?.getPrintHistory) {
      try {
        history = await window.electronAPI.getPrintHistory({ limit: 500 });
      } catch (_) {}
    }

    const { headers, rows } = parseRawExcelFile(arrayBuffer);
    if (!rows || rows.length === 0) {
      alert('Selected file contains no data or could not be parsed.');
      return;
    }

    const detectedMapping = autoDetectColumnMapping(headers);
    const processed = processImportRows(rows, detectedMapping, history);

    setBulkHeaders(headers);
    setBulkRawRows(rows);
    setBulkMapping(detectedMapping);
    setBulkRows(processed);
    setIsBulkImportOpen(true);
  };

  const handleOpenImportExcel = async () => {
    if (window.electronAPI?.openExcelFile) {
      const res = await window.electronAPI.openExcelFile();
      if (res && res.buffer) {
        await loadExcelArrayBuffer(res.buffer);
        return;
      }
    }
    // Web fallback
    if (hiddenFileInputRef.current) {
      hiddenFileInputRef.current.click();
    }
  };

  const handleHiddenFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const arrayBuffer = await file.arrayBuffer();
    await loadExcelArrayBuffer(arrayBuffer);
    e.target.value = '';
  };

  // Re-process rows when user edits column mapping in wizard
  const handleUpdateMapping = (newMapping: ColumnMapping) => {
    setBulkMapping(newMapping);
    const reProcessed = processImportRows(bulkRawRows, newMapping);
    setBulkRows(reProcessed);
  };

  // Direct Thermal Sequential Bulk Printing Engine
  const executeBulkPrintQueue = async (queue: BulkImportRow[], startIndex: number = 0) => {
    setIsBulkImportOpen(false);
    setIsBulkPrintProgressOpen(true);
    setIsBulkFinished(false);
    setIsBulkPaused(false);
    isBulkPausedRef.current = false;
    isBulkCancelledRef.current = false;
    pendingBulkQueueRef.current = queue;

    setBulkTotalCount(queue.length);
    let currentSuccess = startIndex > 0 ? bulkSuccessCount : 0;
    let currentFailed = startIndex > 0 ? bulkFailedCount : 0;
    if (startIndex === 0) {
      setBulkSuccessCount(0);
      setBulkFailedCount(0);
      setBulkSkippedCount(0);
      setBulkFailedRows([]);
    }

    const failedList: Array<BulkImportRow & { failureReason?: string }> = startIndex > 0 ? [...bulkFailedRows] : [];

    for (let i = startIndex; i < queue.length; i++) {
      if (isBulkCancelledRef.current) {
        break;
      }

      while (isBulkPausedRef.current && !isBulkCancelledRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      if (isBulkCancelledRef.current) {
        break;
      }

      const row = queue[i];
      setBulkCurrentIndex(i + 1);
      setBulkCurrentRow(row);

      // Persist recovery state to localStorage
      try {
        localStorage.setItem(
          'matadin_bulk_recovery',
          JSON.stringify({
            queue,
            currentIndex: i + 1,
            selectedPrinter,
            language
          })
        );
      } catch (_) {}

      const rowLabelData: LabelData = {
        productName: row.productName,
        netWeight: row.netWeight,
        mrp: row.mrp,
        batchNumber: row.batchNumber,
        barcodeNumber: row.barcodeNumber,
        packedDate: row.packedDate,
        bestBefore: row.bestBefore,
        gstin: labelData.gstin,
        fssaiNo: labelData.fssaiNo
      };

      try {
        if (window.electronAPI?.printLabel) {
          const res = await window.electronAPI.printLabel({
            labelData: rowLabelData,
            copies: row.copies || 1,
            printerName: selectedPrinter,
            language
          });

          if (res.success) {
            currentSuccess++;
            setBulkSuccessCount(currentSuccess);
          } else {
            currentFailed++;
            setBulkFailedCount(currentFailed);
            failedList.push({ ...row, failureReason: res.message || 'Printer error' });
            setBulkFailedRows([...failedList]);
          }
        } else {
          // Web fallback simulate delay
          await new Promise((r) => setTimeout(r, 150));
          currentSuccess++;
          setBulkSuccessCount(currentSuccess);
        }
      } catch (err: any) {
        currentFailed++;
        setBulkFailedCount(currentFailed);
        failedList.push({ ...row, failureReason: err?.message || 'Print error' });
        setBulkFailedRows([...failedList]);
      }

      await new Promise((r) => setTimeout(r, 50));
    }

    setIsBulkFinished(true);
    setBulkCurrentRow(null);
    localStorage.removeItem('matadin_bulk_recovery');
  };

  // Check for interrupted print recovery on initial mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('matadin_bulk_recovery');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.queue && parsed.queue.length > 0 && parsed.currentIndex < parsed.queue.length) {
          pendingBulkQueueRef.current = parsed.queue;
          setBulkCurrentIndex(parsed.currentIndex);
          setBulkTotalCount(parsed.queue.length);
          setHasRecoveryJob(true);
          setIsBulkPrintProgressOpen(true);
        }
      }
    } catch (_) {}
  }, []);

  // Reprint from History (uses historical record payload, NOT current form)
  const handleReprintFromHistory = async (record: PrintHistoryRecord) => {
    const historyLabelData: LabelData = {
      productName: record.productName,
      netWeight: record.netWeight,
      mrp: record.mrp,
      batchNumber: record.batchNumber,
      barcodeNumber: record.barcodeNumber,
      packedDate: record.packedDate,
      bestBefore: record.bestBefore,
      gstin: labelData.gstin,
      fssaiNo: labelData.fssaiNo
    };

    if (window.electronAPI?.printLabel) {
      const res = await window.electronAPI.printLabel({
        labelData: historyLabelData,
        copies: record.copies || 1,
        printerName: record.printerName || selectedPrinter,
        language: (record.language as PrinterLanguage) || language
      });

      if (res.success) {
        setPrintStatus({ type: 'success', message: `Reprinted ${record.productName} successfully!` });
      } else {
        setPrintStatus({ type: 'error', message: res.message || 'Reprint failed.' });
      }
    }
  };

  // Global Keyboard Shortcuts (F1, F2, F3, F4, Ctrl+P, Ctrl+R, Ctrl+S, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;

      if (e.key === 'F1') {
        e.preventDefault();
        handleReset();
      } else if (e.key === 'F2') {
        e.preventDefault();
        setIsTemplatesOpen(true);
      } else if (e.key === 'F3') {
        e.preventDefault();
        setIsHistoryOpen(true);
      } else if (e.key === 'F4') {
        e.preventDefault();
        setIsExportOpen(true);
      } else if (isCtrl && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        handlePrint();
      } else if (isCtrl && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        handleReset();
      } else if (isCtrl && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        setIsTemplatesOpen(true);
      } else if (e.key === 'Escape') {
        setIsHistoryOpen(false);
        setIsTemplatesOpen(false);
        setIsExportOpen(false);
        setIsSettingsOpen(false);
        setIsHelpOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleReset, handlePrint]);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#F3F4F6] text-[#111827] overflow-hidden">
      
      {/* Header with Live 5s Printer Status & Navigation */}
      <Header
        printerStatus={printerStatus}
        selectedPrinterName={selectedPrinter}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenTemplates={() => setIsTemplatesOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        onOpenImportExcel={handleOpenImportExcel}
      />

      <input
        type="file"
        ref={hiddenFileInputRef}
        onChange={handleHiddenFileChange}
        accept=".xlsx,.xls,.csv"
        className="hidden"
      />

      {/* Main Two-Column Desktop Workspace */}
      <main className="flex-1 p-6 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        
        {/* Left Column: Form Card (5 cols) */}
        <div className="lg:col-span-5 h-full overflow-y-auto">
          <LabelDetailsForm
            labelData={labelData}
            onChange={handleLabelDataChange}
            templates={templates}
            onOpenTemplatesModal={() => setIsTemplatesOpen(true)}
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

      {/* Bottom Control Bar */}
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
        printerStatus={printerStatus}
        printProgress={printProgress}
      />

      {/* Modals */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onReprint={handleReprintFromHistory}
      />

      <TemplatesModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        onSelectTemplate={(t) => {
          setLabelData((prev) => ({
            ...prev,
            productName: t.productName,
            netWeight: t.netWeight,
            mrp: t.mrp
          }));
        }}
        currentLabelData={labelData}
      />

      <ExportReportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        printers={printers}
        onSettingsSaved={(newSettings) => {
          setAppSettings(newSettings);
          if (newSettings.defaultPrinter) setSelectedPrinter(newSettings.defaultPrinter);
          if (newSettings.defaultCopies) setCopies(newSettings.defaultCopies);
        }}
      />

      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        headers={bulkHeaders}
        rawRows={bulkRawRows}
        rows={bulkRows}
        mapping={bulkMapping}
        onUpdateMapping={handleUpdateMapping}
        onUpdateRows={setBulkRows}
        onStartBulkPrint={(validQueue) => executeBulkPrintQueue(validQueue, 0)}
        onReImportFile={handleOpenImportExcel}
        selectedPrinter={selectedPrinter}
      />

      <BulkPrintProgressModal
        isOpen={isBulkPrintProgressOpen}
        onClose={() => {
          setIsBulkPrintProgressOpen(false);
          setHasRecoveryJob(false);
        }}
        currentLabelIndex={bulkCurrentIndex}
        totalLabels={bulkTotalCount}
        currentRow={bulkCurrentRow}
        printerName={selectedPrinter}
        isPaused={isBulkPaused}
        isFinished={isBulkFinished}
        onPauseToggle={() => {
          const nextState = !isBulkPaused;
          setIsBulkPaused(nextState);
          isBulkPausedRef.current = nextState;
        }}
        onCancel={() => {
          isBulkCancelledRef.current = true;
          setIsBulkFinished(true);
          localStorage.removeItem('matadin_bulk_recovery');
        }}
        successCount={bulkSuccessCount}
        failedCount={bulkFailedCount}
        skippedCount={bulkSkippedCount}
        failedRows={bulkFailedRows}
        hasRecoveryJob={hasRecoveryJob}
        onResumeRecovery={() => {
          setHasRecoveryJob(false);
          executeBulkPrintQueue(pendingBulkQueueRef.current, bulkCurrentIndex > 0 ? bulkCurrentIndex - 1 : 0);
        }}
        onStartOverRecovery={() => {
          setHasRecoveryJob(false);
          localStorage.removeItem('matadin_bulk_recovery');
          executeBulkPrintQueue(pendingBulkQueueRef.current, 0);
        }}
      />

    </div>
  );
};

export default App;
