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
 * Safely convert any cell value into a clean, trimmed string.
 * Prevents undefined/null/[object Object] stringification errors.
 */
export const safeString = (val: any): string => {
  if (val === null || val === undefined) return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    const day = String(val.getDate()).padStart(2, '0');
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const year = val.getFullYear();
    return `${day} - ${month} - ${year}`;
  }
  if (typeof val === 'object') {
    return '';
  }
  const str = String(val).trim();
  if (str === 'undefined' || str === 'null' || str === 'NaN') return '';
  return str;
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
 * Safely parse date input into standardized "DD - MM - YYYY" string format
 */
export const formatDateString = (dateInput: any): string => {
  if (!dateInput) return getTodayFormattedDate();
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return getTodayFormattedDate();
    const day = String(dateInput.getDate()).padStart(2, '0');
    const month = String(dateInput.getMonth() + 1).padStart(2, '0');
    const year = dateInput.getFullYear();
    return `${day} - ${month} - ${year}`;
  }

  const str = safeString(dateInput);
  if (!str) return getTodayFormattedDate();

  // If already formatted like DD - MM - YYYY
  if (/^\d{2}\s*-\s*\d{2}\s*-\s*\d{4}$/.test(str)) {
    return str.replace(/\s+/g, ' ');
  }

  // Handle DD-MM-YYYY or DD/MM/YYYY or YYYY-MM-DD
  const parts = str.split(/[-/.\s]+/);
  if (parts.length === 3) {
    let day = parts[0];
    let month = parts[1];
    let year = parts[2];

    if (day.length === 4) {
      const temp = day;
      day = year;
      year = temp;
    }

    if (day.length === 1) day = '0' + day;
    if (month.length === 1) month = '0' + month;
    if (year.length === 2) year = '20' + year;

    if (!isNaN(Number(day)) && !isNaN(Number(month)) && !isNaN(Number(year))) {
      return `${day} - ${month} - ${year}`;
    }
  }

  return str;
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

  const safeHeaders = Array.isArray(headers) ? headers.map(safeString).filter(Boolean) : [];

  safeHeaders.forEach((h) => {
    const cleanH = h.toLowerCase();

    (Object.keys(ALIAS_MAP) as Array<keyof ColumnMapping>).forEach((field) => {
      if (!mapping[field]) {
        if (ALIAS_MAP[field].some((alias) => cleanH === alias || cleanH.includes(alias))) {
          mapping[field] = h;
        }
      }
    });
  });

  // Fallbacks if exact aliases weren't matched
  if (!mapping.productName && safeHeaders.length > 0) mapping.productName = safeHeaders[0];
  if (!mapping.netWeight && safeHeaders.length > 1) mapping.netWeight = safeHeaders[1];
  if (!mapping.mrp && safeHeaders.length > 2) mapping.mrp = safeHeaders[2];
  if (!mapping.batchNumber && safeHeaders.length > 3) mapping.batchNumber = safeHeaders[3];
  if (!mapping.barcodeNumber && safeHeaders.length > 4) mapping.barcodeNumber = safeHeaders[4];

  return mapping;
};

/**
 * Parse uploaded Excel or CSV file buffer/arrayBuffer into raw rows & column headers
 */
export const parseRawExcelFile = (fileBuffer: ArrayBuffer | Uint8Array | null | undefined): { headers: string[]; rows: Record<string, any>[] } => {
  try {
    if (!fileBuffer || (fileBuffer instanceof ArrayBuffer && fileBuffer.byteLength === 0)) {
      return { headers: [], rows: [] };
    }

    const workbook = XLSX.read(fileBuffer, { type: 'array', cellDates: false, raw: false });
    if (!workbook || !workbook.SheetNames || !Array.isArray(workbook.SheetNames) || workbook.SheetNames.length === 0) {
      return { headers: [], rows: [] };
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      return { headers: [], rows: [] };
    }

    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '', raw: false });
    if (!rawRows || !Array.isArray(rawRows) || rawRows.length === 0) {
      return { headers: [], rows: [] };
    }

    // Extract headers safely and exclude empty key names
    const headers = Object.keys(rawRows[0] || {})
      .map(safeString)
      .filter(Boolean);

    return { headers, rows: rawRows };
  } catch (err) {
    console.error('Exception inside parseRawExcelFile:', err);
    return { headers: [], rows: [] };
  }
};

/**
 * Process raw JSON rows using mapped column headers into validated BulkImportRow objects
 */
export const processImportRows = (
  rawRows: Record<string, any>[] | null | undefined,
  mapping: ColumnMapping,
  existingHistory: PrintHistoryRecord[] = []
): BulkImportRow[] => {
  if (!rawRows || !Array.isArray(rawRows)) return [];

  const historyBarcodes = new Set(
    (existingHistory || [])
      .map((h) => safeString(h?.barcodeNumber))
      .filter(Boolean)
  );
  const seenBarcodesInFile = new Set<string>();

  const processedRows: BulkImportRow[] = [];

  rawRows.forEach((row, idx) => {
    if (!row || typeof row !== 'object') return;

    const productName = safeString(row[mapping?.productName]);
    const netWeight = safeString(row[mapping?.netWeight]) || '250GM';
    const mrp = safeString(row[mapping?.mrp]) || '100/-';
    const batchNumber = safeString(row[mapping?.batchNumber]);
    const barcodeNumber = safeString(row[mapping?.barcodeNumber]);
    
    let packedDate = formatDateString(row[mapping?.packedDate]) || getTodayFormattedDate();
    let bestBefore = formatDateString(row[mapping?.bestBefore]) || calculateBestBeforeDateOffset(60);

    const rawCopiesVal = row[mapping?.copies];
    const parsedCopies = parseInt(String(rawCopiesVal || '1'), 10);
    const copies = isNaN(parsedCopies) || parsedCopies < 1 ? 1 : Math.min(999, parsedCopies);

    // Skip completely empty rows
    if (!productName && !batchNumber && !barcodeNumber) {
      return;
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
    } else if (!/^[A-Za-z0-9\-_]+$/.test(barcodeNumber)) {
      isValid = false;
      errors.push('Invalid Barcode format');
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
