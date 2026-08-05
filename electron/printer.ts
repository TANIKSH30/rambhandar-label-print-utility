import { BrowserWindow, PrinterInfo } from 'electron';
import { savePrintRecord } from './database';
import { LabelData } from './zplGenerator';

export interface PrintRequest {
  labelData: LabelData;
  copies: number;
  printerName: string;
  language: 'Zebra ZPL II' | 'Honeywell Fingerprint' | 'Toshiba TPCL';
}

/**
 * Enumerate printers installed on Windows OS using native Electron API
 */
export async function getInstalledPrinters(window: BrowserWindow): Promise<PrinterInfo[]> {
  try {
    const printers = await window.webContents.getPrintersAsync();
    return printers;
  } catch (error) {
    console.error('Failed to get system printers:', error);
    return [];
  }
}

/**
 * Handle print request: Open standard Windows native print dialog (Ctrl+P style)
 */
export async function printLabel(window: BrowserWindow, request: PrintRequest): Promise<{ success: boolean; message: string }> {
  try {
    const { labelData, copies, printerName, language } = request;

    // 1. Save job details to local SQLite database (failsafe)
    await savePrintRecord(labelData, copies, printerName || 'Default Printer', language);

    // 2. Open standard Windows native print dialog
    return new Promise((resolve) => {
      window.webContents.print(
        {
          silent: false,
          printBackground: true,
          deviceName: ''
        },
        (success, failureReason) => {
          if (success) {
            resolve({
              success: true,
              message: 'Print Job Sent'
            });
          } else {
            resolve({
              success: false,
              message: failureReason === 'cancelled' ? 'Print cancelled' : (failureReason || 'Failed to print')
            });
          }
        }
      );
    });

  } catch (error: any) {
    console.error('Print Execution Error:', error);
    return {
      success: false,
      message: `Print Error: ${error?.message || 'Failed to open print dialog.'}`
    };
  }
}


