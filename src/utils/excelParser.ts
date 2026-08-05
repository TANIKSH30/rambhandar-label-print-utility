import * as XLSX from 'xlsx';
import { PrintHistoryRecord } from '../types/label';

export interface BulkImportRow {
  rowIndex: number;
  productName: string;
  netWeight: string;
  mrp: string;
  batchNumber: string;
  barcodeNumber: string;
  packedDate: string;
  bestBefore: string;
  copies: number;
  isValid: boolean;
  errorMessage?: string;
  isDuplicateInFile?: boolean;
  isDuplicateInHistory?: boolean;
}

export interface ColumnMapping {
  productName: string;
  netWeight: string;
  mrp: string;
  batchNumber: string;
  barcodeNumber: string;
  packedDate: string;
  bestBefore: string;
  copies: string;
}

export const ALIAS_MAP: Record<keyof ColumnMapping, string[]> = {
  productName: ['product name', 'product', 'item name', 'item', 'productname', 'itemname', 'name', 'title'],
  netWeight: ['net weight', 'weight', 'netweight', 'wt', 'qty', 'quantity', 'pack size', 'size', 'net wt'],
  mrp: ['mrp', 'rate', 'price', 'mrp (₹)', 'mrp(rs)', 'cost', 'retail price'],
  batchNumber: ['batch number', 'batch', 'batch no', 'batchno', 'batch_number', 'lot', 'batch id'],
  barcodeNumber: ['barcode number', 'barcode', 'barcode no', 'barcodeno', 'code', 'ean', 'upc', 'item code'],
  packedDate: ['packed date', 'packed', 'mfd date', 'mfd', 'pack date', 'date of packing', 'pkd', 'mfg date'],
  bestBefore: ['best before', 'bestbefore', 'expiry', 'exp date', 'expiry date', 'exp', 'use by', 'best before date'],
  copies: ['copies', 'copy', 'qty to print', 'print count', 'count', 'no of copies', 'no. of copies', 'print copies']
};

/**
 * Format date as "DD - MM - YYYY"
 */
export const getTodayFormattedDate = (): string => {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day} - ${month} - ${year}`;
};

/**
 * Calculate Best Before date offset by N days
 */
export const calculateBestBeforeDateOffset = (days: number = 60): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day} - ${month} - ${year}`;
};

/**
 * Detect column header matches automatically using aliases
 */
export const autoDetectColumnMapping = (headers: string[]): ColumnMapping => {
  const mapping: ColumnMapping = {
    productName: '',
    netWeight: '',
    mrp: '',
    batchNumber: '',
    barcodeNumber: '',
    packedDate: '',
    bestBefore: '',
    copies: ''
  };

  headers.forEach((h) => {
    const cleanH = h.trim().toLowerCase();

    (Object.keys(ALIAS_MAP) as Array<keyof ColumnMapping>).forEach((field) => {
      if (!mapping[field]) {
        if (ALIAS_MAP[field].some((alias) => cleanH === alias || cleanH.includes(alias))) {
          mapping[field] = h;
        }
      }
    });
  });

  // Fallbacks if exact aliases weren't matched
  if (!mapping.productName && headers.length > 0) mapping.productName = headers[0];
  if (!mapping.netWeight && headers.length > 1) mapping.netWeight = headers[1];
  if (!mapping.mrp && headers.length > 2) mapping.mrp = headers[2];
  if (!mapping.batchNumber && headers.length > 3) mapping.batchNumber = headers[3];
  if (!mapping.barcodeNumber && headers.length > 4) mapping.barcodeNumber = headers[4];

  return mapping;
};

/**
 * Parse uploaded Excel or CSV file buffer/arrayBuffer into raw rows & column headers
 */
export const parseRawExcelFile = (fileBuffer: ArrayBuffer | Uint8Array) => {
  const workbook = XLSX.read(fileBuffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
  if (!rawRows || rawRows.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = Object.keys(rawRows[0] || {});
  return { headers, rows: rawRows };
};

/**
 * Process raw JSON rows using mapped column headers into validated BulkImportRow objects
 */
export const processImportRows = (
  rawRows: Record<string, any>[],
  mapping: ColumnMapping,
  existingHistory: PrintHistoryRecord[] = []
): BulkImportRow[] => {
  const historyBarcodes = new Set(existingHistory.map((h) => String(h.barcodeNumber || '').trim()));
  const seenBarcodesInFile = new Set<string>();

  const processedRows: BulkImportRow[] = [];

  rawRows.forEach((row, idx) => {
    const productName = String(row[mapping.productName] || '').trim();
    const netWeight = String(row[mapping.netWeight] || '').trim() || '250GM';
    const mrp = String(row[mapping.mrp] || '').trim() || '100/-';
    const batchNumber = String(row[mapping.batchNumber] || '').trim();
    const barcodeNumber = String(row[mapping.barcodeNumber] || '').trim();
    let packedDate = String(row[mapping.packedDate] || '').trim();
    let bestBefore = String(row[mapping.bestBefore] || '').trim();
    const rawCopies = parseInt(String(row[mapping.copies] || '1'), 10);
    const copies = isNaN(rawCopies) || rawCopies < 1 ? 1 : Math.min(999, rawCopies);

    // Skip completely empty rows
    if (!productName && !batchNumber && !barcodeNumber) {
      return;
    }

    // Auto-fill dates if missing
    if (!packedDate) {
      packedDate = getTodayFormattedDate();
    }
    if (!bestBefore) {
      bestBefore = calculateBestBeforeDateOffset(60);
    }

    let isValid = true;
    const errors: string[] = [];

    if (!productName) {
      isValid = false;
      errors.push('Product Name is required');
    }
    if (!batchNumber) {
      isValid = false;
      errors.push('Batch Number is required');
    }
    if (!barcodeNumber) {
      isValid = false;
      errors.push('Barcode Number is required');
    }

    let isDuplicateInFile = false;
    let isDuplicateInHistory = false;

    if (barcodeNumber) {
      if (seenBarcodesInFile.has(barcodeNumber)) {
        isDuplicateInFile = true;
      } else {
        seenBarcodesInFile.add(barcodeNumber);
      }

      if (historyBarcodes.has(barcodeNumber)) {
        isDuplicateInHistory = true;
      }
    }

    processedRows.push({
      rowIndex: idx + 1,
      productName,
      netWeight,
      mrp,
      batchNumber,
      barcodeNumber,
      packedDate,
      bestBefore,
      copies,
      isValid,
      errorMessage: errors.join(', '),
      isDuplicateInFile,
      isDuplicateInHistory
    });
  });

  return processedRows;
};

/**
 * Generate standard downloadable Matadin_Label_Template.xlsx
 */
export const generateMatadinTemplateWorkbook = (): ArrayBuffer => {
  const sampleData = [
    {
      'Product Name': 'Falhari Chiwda',
      'Net Weight': '250GM',
      'MRP': '80/-',
      'Batch Number': 'SEP2026',
      'Barcode Number': '12345678',
      'Packed Date': '30-09-2026',
      'Best Before': '15-12-2026',
      'Copies': 10
    },
    {
      'Product Name': 'Special Kaju Katli',
      'Net Weight': '500GM',
      'MRP': '350/-',
      'Batch Number': 'SEP2026',
      'Barcode Number': '12345679',
      'Packed Date': '30-09-2026',
      'Best Before': '15-12-2026',
      'Copies': 5
    },
    {
      'Product Name': 'Mathura Peda',
      'Net Weight': '400GM',
      'MRP': '240/-',
      'Batch Number': 'SEP2026',
      'Barcode Number': '12345680',
      'Packed Date': '30-09-2026',
      'Best Before': '15-12-2026',
      'Copies': 15
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 24 }, // Product Name
    { wch: 12 }, // Net Weight
    { wch: 10 }, // MRP
    { wch: 14 }, // Batch Number
    { wch: 16 }, // Barcode Number
    { wch: 14 }, // Packed Date
    { wch: 14 }, // Best Before
    { wch: 8 }   // Copies
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Label Template');

  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
};
