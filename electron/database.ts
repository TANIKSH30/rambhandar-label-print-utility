import initSqlJs, { Database } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { LabelData } from './zplGenerator';

export interface PrintRecord {
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

let dbInstance: Database | null = null;
let dbFilePath = '';

/**
 * Initialize local SQLite database on the client machine
 */
export async function initDatabase(): Promise<Database | null> {
  if (dbInstance) return dbInstance;

  try {
    const userDataPath = app.getPath('userData');
    dbFilePath = path.join(userDataPath, 'matadin_labels.sqlite');

    const SQL = await initSqlJs();

    if (fs.existsSync(dbFilePath)) {
      const fileBuffer = fs.readFileSync(dbFilePath);
      dbInstance = new SQL.Database(fileBuffer);
    } else {
      dbInstance = new SQL.Database();
    }

    // Create SQLite tables if they do not exist
    dbInstance.run(`
      CREATE TABLE IF NOT EXISTS print_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_name TEXT NOT NULL,
        batch_number TEXT NOT NULL,
        mrp TEXT NOT NULL,
        net_weight TEXT NOT NULL,
        barcode_number TEXT NOT NULL,
        packed_date TEXT NOT NULL,
        best_before TEXT NOT NULL,
        print_date TEXT NOT NULL,
        copies INTEGER NOT NULL,
        printer_name TEXT,
        language TEXT
      );
    `);

    saveDatabase();
    return dbInstance;
  } catch (err) {
    console.warn('SQLite DB Initialization warning:', err);
    return null;
  }
}


/**
 * Persist SQLite database buffer to local file
 */
function saveDatabase() {
  if (dbInstance && dbFilePath) {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbFilePath, buffer);
  }
}

/**
 * Insert print job details into local SQLite database
 */
export async function savePrintRecord(
  data: LabelData,
  copies: number,
  printerName: string,
  language: string
): Promise<boolean> {
  try {
    const db = await initDatabase();
    if (!db) return false;
    const printDate = new Date().toISOString();

    db.run(
      `INSERT INTO print_history (
        product_name, batch_number, mrp, net_weight, barcode_number,
        packed_date, best_before, print_date, copies, printer_name, language
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        data.productName,
        data.batchNumber,
        data.mrp,
        data.netWeight,
        data.barcodeNumber,
        data.packedDate,
        data.bestBefore,
        printDate,
        copies,
        printerName || 'Default Printer',
        language || 'Zebra ZPL II'
      ]
    );

    saveDatabase();
    return true;
  } catch (err) {
    console.error('Failed to save print record to SQLite:', err);
    return false;
  }
}


/**
 * Fetch local SQLite print records
 */
export async function getPrintRecords(limit: number = 50): Promise<PrintRecord[]> {
  try {
    const db = await initDatabase();
    if (!db) return [];
    const stmt = db.prepare(
      `SELECT * FROM print_history ORDER BY id DESC LIMIT ${limit};`
    );

    
    const records: PrintRecord[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      records.push({
        id: row.id as number,
        productName: row.product_name as string,
        batchNumber: row.batch_number as string,
        mrp: row.mrp as string,
        netWeight: row.net_weight as string,
        barcodeNumber: row.barcode_number as string,
        packedDate: row.packed_date as string,
        bestBefore: row.best_before as string,
        printDate: row.print_date as string,
        copies: row.copies as number,
        printerName: row.printer_name as string,
        language: row.language as string
      });
    }
    stmt.free();
    return records;
  } catch (err) {
    console.error('Failed to fetch SQLite records:', err);
    return [];
  }
}
