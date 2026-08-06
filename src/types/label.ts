export interface LabelData {
  productName: string;
  netWeight: string;
  mrp: string;
  batchNumber: string;
  barcodeNumber: string;
  packedDate: string;
  bestBefore: string;
  gstin?: string;
  fssaiNo?: string;
}

export type PrinterLanguage = 'Zebra ZPL II' | 'Honeywell Fingerprint' | 'Toshiba TPCL';

export interface PrinterDevice {
  name: string;
  isDefault: boolean;
  status?: number;
}

export interface PrintHistoryRecord {
  id?: number;
  productName: string;
  batchNumber: string;
  mrp: string;
  netWeight: string;
  barcodeNumber: string;
  packedDate: string;
  bestBefore: string;
  printDate: string;
  copies: number;
  printerName?: string;
  language?: string;
  status: string;
}

export interface ProductTemplate {
  id?: number;
  productName: string;
  netWeight: string;
  mrp: string;
  defaultBestBefore: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AppSettings {
  defaultPrinter?: string;
  defaultCopies?: number;
  defaultBestBefore?: string;
  autoPrintAfterSave?: boolean;
  autoIncrementBatch?: boolean;
  companyAddress?: string;
  gstin?: string;
  fssaiNo?: string;
}

export type PrinterStatusType = 'ready' | 'busy' | 'offline';

export interface ElectronAPI {
  getPrinters: () => Promise<PrinterDevice[]>;
  checkPrinterStatus: (printerName?: string) => Promise<{ status: PrinterStatusType; printerName: string }>;
  printLabel: (request: {
    labelData: LabelData;
    copies: number;
    printerName: string;
    language: PrinterLanguage;
  }) => Promise<{ success: boolean; message: string }>;
  getPrintHistory: (params?: { search?: string; limit?: number }) => Promise<PrintHistoryRecord[]>;
  getTemplates: () => Promise<ProductTemplate[]>;
  saveTemplate: (template: Omit<ProductTemplate, 'createdAt' | 'updatedAt'>) => Promise<boolean>;
  deleteTemplate: (id: number) => Promise<boolean>;
  getSettings: () => Promise<Record<string, string>>;
  saveSettings: (settingsMap: Record<string, string>) => Promise<boolean>;
  exportReport: (params: {
    range: 'today' | '7days' | '30days' | 'custom';
    startDate?: string;
    endDate?: string;
  }) => Promise<{ success: boolean; message: string; filePath?: string }>;
  openExcelFile: () => Promise<{ fileName: string; filePath: string; buffer: ArrayBuffer } | null>;
  getProductMaster: (search?: string) => Promise<any[]>;
  saveProductMaster: (item: any) => Promise<boolean>;
  syncProductMaster: (items: any[]) => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
