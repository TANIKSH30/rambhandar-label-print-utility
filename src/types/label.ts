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
  status?: string;
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
}

export interface ElectronAPI {
  getPrinters: () => Promise<PrinterDevice[]>;
  printLabel: (request: {
    labelData: LabelData;
    copies: number;
    printerName: string;
    language: PrinterLanguage;
  }) => Promise<{ success: boolean; message: string }>;
  getPrintHistory: (limit?: number) => Promise<PrintHistoryRecord[]>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
