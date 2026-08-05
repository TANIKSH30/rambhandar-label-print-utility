import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  printLabel: (request: any) => ipcRenderer.invoke('print-label', request),
  getPrintHistory: (limit?: number) => ipcRenderer.invoke('get-print-history', limit),
});
