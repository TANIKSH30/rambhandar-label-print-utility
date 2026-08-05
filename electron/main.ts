import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { getInstalledPrinters, printLabel } from './printer';
import { initDatabase, getPrintRecords } from './database';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 860,
    minWidth: 1200,
    minHeight: 750,
    title: 'Label Print Utility',
    icon: path.join(__dirname, '../public/logo.jpeg'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
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
  // Initialize local SQLite DB
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

// IPC Handler: Execute Thermal Print Request & Save SQLite
ipcMain.handle('print-label', async (_, request) => {
  if (!mainWindow) return { success: false, message: 'Window not active' };
  return await printLabel(mainWindow, request);
});

// IPC Handler: Fetch SQLite Print History
ipcMain.handle('get-print-history', async (_, limit?: number) => {
  return await getPrintRecords(limit || 50);
});
