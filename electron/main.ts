import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { getInstalledPrinters, printLabel, checkPrinterStatus } from './printer';
import {
  initDatabase,
  getPrintRecords,
  getTemplates,
  saveTemplate,
  deleteTemplate,
  getSettings,
  saveSettings,
  exportPrintLogsCSV,
  getProductMasterFromDB,
  saveProductMasterToDB,
  syncExcelToProductMasterDB
// Native Electron Initialization
let mainWindow: BrowserWindow | null = null;

function createWindow() {
  let preloadPath = path.join(__dirname, 'preload.js');
  if (!fs.existsSync(preloadPath)) {
    preloadPath = path.join(app.getAppPath(), 'dist-electron', 'preload.js');
  }
  console.log('Initializing BrowserWindow with preload:', preloadPath);

  mainWindow = new BrowserWindow({
    width: 1380,
    height: 860,
    minWidth: 1200,
    minHeight: 750,
    title: 'Label Print Utility',
    icon: path.join(__dirname, '../public/logo.jpeg'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    backgroundColor: '#0B1B3A'
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

  if (isDev) {
    mainWindow.loadURL(devUrl).catch(() => {
      const indexPath = path.join(__dirname, '../dist/index.html');
      mainWindow?.loadFile(indexPath);
    });
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    await initDatabase();
    console.log('Local SQLite Database Initialized');
  } catch (err) {
    console.error('SQLite Init Warning:', err);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handler: Enumerate Windows Printers
ipcMain.handle('get-printers', async () => {
  if (!mainWindow) return [];
  return await getInstalledPrinters(mainWindow);
});

// IPC Handler: Check Thermal Printer Live Status
ipcMain.handle('check-printer-status', async (_, printerName?: string) => {
  if (!mainWindow) return { status: 'offline', printerName: printerName || '' };
  return await checkPrinterStatus(mainWindow, printerName);
});

// IPC Handler: Execute Thermal Print Request & Save to SQLite on Success Only
ipcMain.handle('print-label', async (_, request) => {
  if (!mainWindow) return { success: false, message: 'Window not active' };
  return await printLabel(mainWindow, request);
});

// IPC Handler: Fetch SQLite Print History
ipcMain.handle('get-print-history', async (_, filters?: { search?: string; limit?: number }) => {
  const search = typeof filters === 'string' ? filters : filters?.search;
  const limit = filters?.limit || 100;
  return await getPrintRecords(search, limit);
});

// IPC Handler: Fetch Product Templates
ipcMain.handle('get-templates', async () => {
  return await getTemplates();
});

// IPC Handler: Save or Update Product Template
ipcMain.handle('save-template', async (_, template) => {
  return await saveTemplate(template);
});

// IPC Handler: Delete Product Template
ipcMain.handle('delete-template', async (_, id: number) => {
  return await deleteTemplate(id);
});

// IPC Handler: Fetch App Settings
ipcMain.handle('get-settings', async () => {
  return await getSettings();
});

// IPC Handler: Save App Settings
ipcMain.handle('save-settings', async (_, settingsMap) => {
  return await saveSettings(settingsMap);
});

// IPC Handler: Fetch Product Master from SQLite
ipcMain.handle('get-product-master', async (_, search?: string) => {
  return await getProductMasterFromDB(search);
});

// IPC Handler: Save / Update Product Master Item in SQLite
ipcMain.handle('save-product-master', async (_, item) => {
  return await saveProductMasterToDB(item);
});

// IPC Handler: Sync Excel Rows to Product Master in SQLite
ipcMain.handle('sync-product-master', async (_, items) => {
  return await syncExcelToProductMasterDB(items);
});

// IPC Handler: Export Print Log CSV Report with Save File Dialog
ipcMain.handle('export-report', async (_event, options: { range: 'today' | '7days' | '30days' | 'custom'; startDate?: string; endDate?: string }) => {
  if (!mainWindow) return { success: false, message: 'Window not active' };

  const range = options?.range || 'today';
  const startDate = options?.startDate;
  const endDate = options?.endDate;

  const csvContent = await exportPrintLogsCSV(range, startDate, endDate);
  if (!csvContent) {
    return { success: false, message: 'No print history records found for the selected range.' };
  }

  const defaultFilename = `Matadin_Print_Report_${range}_${Date.now()}.csv`;
  const defaultDir = app.getPath('downloads') || app.getPath('documents');

  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Print Log Report (CSV)',
    defaultPath: path.join(defaultDir, defaultFilename),
    filters: [{ name: 'CSV Files (*.csv)', extensions: ['csv'] }]
  });

  if (canceled || !filePath) {
    return { success: false, message: 'Export canceled' };
  }

  try {
    fs.writeFileSync(filePath, csvContent, 'utf8');
    return { success: true, message: `Report exported to ${path.basename(filePath)}`, filePath };
  } catch (err: any) {
    return { success: false, message: `Failed to save CSV file: ${err.message}` };
  }
});

// IPC Handler: Open Native File Picker for Excel / CSV Import
ipcMain.handle('open-excel-file', async () => {
  if (!mainWindow) return null;
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Excel or CSV File for Bulk Label Import',
    filters: [
      { name: 'Excel / CSV Files (*.xlsx, *.xls, *.csv)', extensions: ['xlsx', 'xls', 'csv'] }
    ],
    properties: ['openFile']
  });

  if (canceled || filePaths.length === 0) return null;

  try {
    const fileBuffer = fs.readFileSync(filePaths[0]);
    return {
      fileName: path.basename(filePaths[0]),
      filePath: filePaths[0],
      buffer: fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength)
    };
  } catch (err: any) {
    console.error('Failed to read Excel file:', err);
    return null;
  }
});
