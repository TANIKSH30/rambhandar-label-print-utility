import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  exportReport: (options: any) => ipcRenderer.invoke('export-report', options),
  getPrintHistory: (filters: any) => ipcRenderer.invoke('get-print-history', filters),
  getTemplates: () => ipcRenderer.invoke('get-templates'),
  saveTemplate: (template: any) => ipcRenderer.invoke('save-template', template),
  deleteTemplate: (id: number) => ipcRenderer.invoke('delete-template', id),
  getPrinterStatus: (printerName?: string) => ipcRenderer.invoke('check-printer-status', printerName),
  checkPrinterStatus: (printerName?: string) => ipcRenderer.invoke('check-printer-status', printerName),
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  printLabel: (request: any) => ipcRenderer.invoke('print-label', request),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settingsMap: Record<string, string>) => ipcRenderer.invoke('save-settings', settingsMap)
});
