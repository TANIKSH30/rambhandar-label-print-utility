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

let dbInstance: Database | null = null;
let dbFilePath = '';

/**
 * Initialize local SQLite database on client machine
 */
export async function initDatabase(): Promise<Database | null> {
  if (dbInstance) return dbInstance;

  try {
    const userDataPath = app.getPath('userData');
    dbFilePath = path.join(userDataPath, 'matadin_labels.sqlite');

    const locateFile = (file: string) => {
      const pathsToTry = [
        path.join(__dirname, file),
        path.join(__dirname, '../node_modules/sql.js/dist', file),
        path.join(app.getAppPath(), 'node_modules/sql.js/dist', file),
        path.join(process.resourcesPath || '', 'app.asar.unpacked/node_modules/sql.js/dist', file)
      ];
      for (const p of pathsToTry) {
        if (fs.existsSync(p)) return p;
      }
      return file;
    };

    const SQL = await initSqlJs({ locateFile });

    if (fs.existsSync(dbFilePath)) {
      const fileBuffer = fs.readFileSync(dbFilePath);
      dbInstance = new SQL.Database(fileBuffer);
    } else {
      dbInstance = new SQL.Database();
    }

    // 1. Table: print_history
    dbInstance.run(`
      CREATE TABLE IF NOT EXISTS print_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_name TEXT NOT NULL,
        net_weight TEXT NOT NULL,
        mrp TEXT NOT NULL,
        batch_number TEXT NOT NULL,
        barcode_number TEXT NOT NULL,
        packed_date TEXT NOT NULL,
        best_before TEXT NOT NULL,
        copies INTEGER NOT NULL,
        printer_name TEXT,
        language TEXT,
        print_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'SUCCESS'
      );
    `);

    // 2. Table: products (Templates - NO barcode/batch stored here)
    dbInstance.run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_name TEXT NOT NULL,
        net_weight TEXT NOT NULL,
        mrp TEXT NOT NULL,
        default_best_before TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // 3. Table: settings
    dbInstance.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // 4. Table: product_master
    dbInstance.run(`
      CREATE TABLE IF NOT EXISTS product_master (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_name TEXT UNIQUE NOT NULL,
        net_weight TEXT,
        mrp TEXT,
        barcode_number TEXT,
        default_batch_number TEXT,
        default_best_before TEXT,
        created_at TEXT,
        updated_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_pm_name ON product_master(product_name);
    `);

    // Insert default preset templates if products table is empty
    const countRes = dbInstance.exec('SELECT COUNT(*) as count FROM products;');
    const count = countRes[0]?.values[0]?.[0] as number || 0;
    if (count === 0) {
      const now = new Date().toISOString();
      const defaultTemplates = [
        { name: 'Desi Ghee Soan Papdi', weight: '500GM', mrp: '220/-', bestBefore: '90 Days' },
        { name: 'Special Kaju Katli', weight: '250GM', mrp: '350/-', bestBefore: '30 Days' },
        { name: 'Mathura Peda', weight: '400GM', mrp: '240/-', bestBefore: '30 Days' },
        { name: 'Desi Ghee Besan Ladoo', weight: '500GM', mrp: '260/-', bestBefore: '60 Days' },
        { name: 'Falhari Chiwda', weight: '250GM', mrp: '80/-', bestBefore: '60 Days' },
        { name: 'Special Royal Namkeen', weight: '500GM', mrp: '150/-', bestBefore: '90 Days' }
      ];

      for (const t of defaultTemplates) {
        dbInstance.run(
          `INSERT INTO products (product_name, net_weight, mrp, default_best_before, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?);`,
          [t.name, t.weight, t.mrp, t.bestBefore, now, now]
        );
      }
    }

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
 * Insert print job details into local SQLite database ONLY after successful print job acceptance.
 */
export async function savePrintRecordOnlyOnSuccess(
  data: LabelData,
  copies: number,
  printerName: string,
  language: string,
  status: string = 'SUCCESS'
): Promise<boolean> {
  try {
    const db = await initDatabase();
    if (!db) return false;
    const printDate = new Date().toISOString();

    db.run(
      `INSERT INTO print_history (
        product_name, net_weight, mrp, batch_number, barcode_number,
        packed_date, best_before, copies, printer_name, language, print_date, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        data.productName,
        data.netWeight,
        data.mrp,
        data.batchNumber,
        data.barcodeNumber,
        data.packedDate,
        data.bestBefore,
        copies,
        printerName || 'Direct Thermal Spooler',
        language || 'Zebra ZPL II',
        printDate,
        status
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
 * Fetch local SQLite print records with optional search & limit
 */
export async function getPrintRecords(search?: string, limit: number = 100): Promise<PrintRecord[]> {
  try {
    const db = await initDatabase();
    if (!db) return [];

    let query = 'SELECT * FROM print_history';
    const params: any[] = [];

    if (search && search.trim() !== '') {
      query += ` WHERE product_name LIKE ? OR barcode_number LIKE ? OR batch_number LIKE ?`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY id DESC LIMIT ?;';
    params.push(limit);

    const stmt = db.prepare(query);
    stmt.bind(params);

    const records: PrintRecord[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      records.push({
        id: row.id as number,
        productName: row.product_name as string,
        netWeight: row.net_weight as string,
        mrp: row.mrp as string,
        batchNumber: row.batch_number as string,
        barcodeNumber: row.barcode_number as string,
        packedDate: row.packed_date as string,
        bestBefore: row.best_before as string,
        copies: row.copies as number,
        printerName: row.printer_name as string,
        language: row.language as string,
        printDate: row.print_date as string,
        status: (row.status as string) || 'SUCCESS'
      });
    }
    stmt.free();
    return records;
  } catch (err) {
    console.error('Failed to fetch SQLite print history records:', err);
    return [];
  }
}

/**
 * Product Templates CRUD
 */
export async function getTemplates(): Promise<ProductTemplate[]> {
  try {
    const db = await initDatabase();
    if (!db) return [];
    const stmt = db.prepare('SELECT * FROM products ORDER BY product_name ASC;');
    const templates: ProductTemplate[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      templates.push({
        id: row.id as number,
        productName: row.product_name as string,
        netWeight: row.net_weight as string,
        mrp: row.mrp as string,
        defaultBestBefore: row.default_best_before as string,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string
      });
    }
    stmt.free();
    return templates;
  } catch (err) {
    console.error('Failed to fetch product templates:', err);
    return [];
  }
}

export async function saveTemplate(template: Omit<ProductTemplate, 'createdAt' | 'updatedAt'>): Promise<boolean> {
  try {
    const db = await initDatabase();
    if (!db) return false;
    const now = new Date().toISOString();

    if (template.id) {
      db.run(
        `UPDATE products SET product_name = ?, net_weight = ?, mrp = ?, default_best_before = ?, updated_at = ? WHERE id = ?;`,
        [template.productName, template.netWeight, template.mrp, template.defaultBestBefore, now, template.id]
      );
    } else {
      db.run(
        `INSERT INTO products (product_name, net_weight, mrp, default_best_before, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?);`,
        [template.productName, template.netWeight, template.mrp, template.defaultBestBefore, now, now]
      );
    }

    saveDatabase();
    return true;
  } catch (err) {
    console.error('Failed to save product template:', err);
    return false;
  }
}

export async function deleteTemplate(id: number): Promise<boolean> {
  try {
    const db = await initDatabase();
    if (!db) return false;
    db.run('DELETE FROM products WHERE id = ?;', [id]);
    saveDatabase();
    return true;
  } catch (err) {
    console.error('Failed to delete product template:', err);
    return false;
  }
}

/**
 * Settings Store
 */
export async function getSettings(): Promise<Record<string, string>> {
  try {
    const db = await initDatabase();
    if (!db) return {};
    const stmt = db.prepare('SELECT * FROM settings;');
    const settings: Record<string, string> = {};
    while (stmt.step()) {
      const row = stmt.getAsObject();
      settings[row.key as string] = row.value as string;
    }
    stmt.free();
    return settings;
  } catch (err) {
    console.error('Failed to load settings:', err);
    return {};
  }
}

export async function saveSettings(settingsMap: Record<string, string>): Promise<boolean> {
  try {
    const db = await initDatabase();
    if (!db) return false;

    for (const [key, value] of Object.entries(settingsMap)) {
      db.run(
        `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);`,
        [key, String(value)]
      );
    }

    saveDatabase();
    return true;
  } catch (err) {
    console.error('Failed to save settings:', err);
    return false;
  }
}

/**
 * Export Print History to CSV formatted string based on date range
 */
export async function exportPrintLogsCSV(
  range: 'today' | '7days' | '30days' | 'custom',
  startDate?: string,
  endDate?: string
): Promise<string> {
  try {
    const db = await initDatabase();
    if (!db) return '';

    let whereClause = '';
    const now = new Date();

    if (range === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      whereClause = ` WHERE print_date LIKE '${todayStr}%'`;
    } else if (range === '7days') {
      const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      whereClause = ` WHERE print_date >= '${past7}'`;
    } else if (range === '30days') {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      whereClause = ` WHERE print_date >= '${past30}'`;
    } else if (range === 'custom' && startDate && endDate) {
      whereClause = ` WHERE print_date >= '${startDate}' AND print_date <= '${endDate}T23:59:59'`;
    }

    const query = `SELECT * FROM print_history${whereClause} ORDER BY id DESC;`;
    const stmt = db.prepare(query);

    const headers = ['Date', 'Time', 'Product Name', 'Weight', 'MRP', 'Batch', 'Barcode', 'Copies', 'Printer', 'Status'];
    const rows: string[] = [headers.join(',')];

    while (stmt.step()) {
      const r = stmt.getAsObject();
      const pDate = new Date(r.print_date as string);
      const datePart = isNaN(pDate.getTime()) ? (r.print_date as string) : pDate.toLocaleDateString('en-IN');
      const timePart = isNaN(pDate.getTime()) ? '' : pDate.toLocaleTimeString('en-IN');

      const rowValues = [
        `"${datePart}"`,
        `"${timePart}"`,
        `"${(r.product_name as string || '').replace(/"/g, '""')}"`,
        `"${(r.net_weight as string || '').replace(/"/g, '""')}"`,
        `"${(r.mrp as string || '').replace(/"/g, '""')}"`,
        `"${(r.batch_number as string || '').replace(/"/g, '""')}"`,
        `"${(r.barcode_number as string || '').replace(/"/g, '""')}"`,
        r.copies,
        `"${(r.printer_name as string || 'Default').replace(/"/g, '""')}"`,
        `"${r.status || 'SUCCESS'}"`
      ];

      rows.push(rowValues.join(','));
    }

    stmt.free();
    return rows.join('\n');
  } catch (err) {
    console.error('Failed to export CSV report:', err);
    return '';
  }
}

export interface ProductMasterDBRecord {
  id?: number;
  productName: string;
  netWeight: string;
  mrp: string;
  barcodeNumber: string;
  defaultBatchNumber?: string;
  defaultBestBefore?: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function getProductMasterFromDB(search?: string): Promise<ProductMasterDBRecord[]> {
  try {
    await initDatabase();
    if (!dbInstance) return [];

    let query = 'SELECT * FROM product_master';
    if (search && search.trim()) {
      const sanitized = search.trim().replace(/'/g, "''");
      query += ` WHERE product_name LIKE '%${sanitized}%' OR barcode_number LIKE '%${sanitized}%'`;
    }
    query += ' ORDER BY product_name ASC LIMIT 1000;';

    const res = dbInstance.exec(query);
    if (res.length === 0) return [];

    const columns = res[0].columns;
    const values = res[0].values;

    const nameIdx = columns.indexOf('product_name');
    const weightIdx = columns.indexOf('net_weight');
    const mrpIdx = columns.indexOf('mrp');
    const barcodeIdx = columns.indexOf('barcode_number');
    const batchIdx = columns.indexOf('default_batch_number');
    const bestIdx = columns.indexOf('default_best_before');
    const idIdx = columns.indexOf('id');

    return values.map((row) => ({
      id: row[idIdx] as number,
      productName: row[nameIdx] as string,
      netWeight: (row[weightIdx] as string) || '',
      mrp: (row[mrpIdx] as string) || '',
      barcodeNumber: (row[barcodeIdx] as string) || '',
      defaultBatchNumber: (row[batchIdx] as string) || '',
      defaultBestBefore: (row[bestIdx] as string) || ''
    }));
  } catch (err) {
    console.error('Failed to get Product Master from SQLite:', err);
    return [];
  }
}

export async function saveProductMasterToDB(item: ProductMasterDBRecord): Promise<boolean> {
  try {
    await initDatabase();
    if (!dbInstance || !item.productName || !item.productName.trim()) return false;

    const now = new Date().toISOString();
    const name = item.productName.trim().replace(/'/g, "''");
    const weight = (item.netWeight || '').replace(/'/g, "''");
    const mrp = (item.mrp || '').replace(/'/g, "''");
    const barcode = (item.barcodeNumber || '').replace(/'/g, "''");
    const batch = (item.defaultBatchNumber || '').replace(/'/g, "''");
    const best = (item.defaultBestBefore || '').replace(/'/g, "''");

    const query = `
      INSERT INTO product_master (product_name, net_weight, mrp, barcode_number, default_batch_number, default_best_before, created_at, updated_at)
      VALUES ('${name}', '${weight}', '${mrp}', '${barcode}', '${batch}', '${best}', '${now}', '${now}')
      ON CONFLICT(product_name) DO UPDATE SET
        net_weight = excluded.net_weight,
        mrp = excluded.mrp,
        barcode_number = excluded.barcode_number,
        default_batch_number = excluded.default_batch_number,
        default_best_before = excluded.default_best_before,
        updated_at = excluded.updated_at;
    `;

    dbInstance.run(query);
    saveDatabase();
    return true;
  } catch (err) {
    console.error('Failed to save Product Master item to SQLite:', err);
    return false;
  }
}

export async function syncExcelToProductMasterDB(items: ProductMasterDBRecord[]): Promise<boolean> {
  try {
    await initDatabase();
    if (!dbInstance || !items || items.length === 0) return false;

    for (const item of items) {
      if (item.productName && item.productName.trim()) {
        await saveProductMasterToDB(item);
      }
    }
    return true;
  } catch (err) {
    console.error('Failed to sync Excel items to SQLite product master:', err);
    return false;
  }
}
