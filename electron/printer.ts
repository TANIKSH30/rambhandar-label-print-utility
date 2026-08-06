import { BrowserWindow, PrinterInfo } from 'electron';
import { generateZPL, generateFingerprint, generateTPCL, LabelData } from './zplGenerator';
import { savePrintRecordOnlyOnSuccess } from './database';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';

export interface PrintRequest {
  labelData: LabelData;
  copies: number;
  printerName: string;
  language: 'Zebra ZPL II' | 'Honeywell Fingerprint' | 'Toshiba TPCL';
  labelHtml?: string;  // SVG HTML captured from renderer for print preview
}

const THERMAL_PRINTER_REGEX = /zebra|honeywell|intermec|toshiba|tsc|datamax|sato|bixolon|thermal|zpl|godex|xprinter|gprinter|pos|label|direct thermal/i;

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
 * Check live printer status (ready, busy, offline)
 */
export async function checkPrinterStatus(
  window: BrowserWindow,
  printerName?: string
): Promise<{ status: 'ready' | 'busy' | 'offline'; printerName: string }> {
  try {
    const installed = await getInstalledPrinters(window);
    if (!installed || installed.length === 0) {
      return { status: 'offline', printerName: printerName || 'No Printers Installed' };
    }

    let target = installed.find(p => p.name === printerName);
    if (!target) {
      // Fallback to thermal or default printer
      target = installed.find(p => THERMAL_PRINTER_REGEX.test(p.name)) || installed.find(p => p.isDefault) || installed[0];
    }

    if (!target) {
      return { status: 'offline', printerName: printerName || 'No Printer Found' };
    }

    // Windows status check: status 0 or 256 is typically Ready.
    // Check status flags or status string
    const statusVal = target.status;
    let computedStatus: 'ready' | 'busy' | 'offline' = 'ready';

    if (statusVal === 3 || statusVal === 4 || statusVal === 5 || statusVal === 7) {
      computedStatus = 'offline';
    } else if (statusVal === 1 || statusVal === 2) {
      computedStatus = 'busy';
    }

    return {
      status: computedStatus,
      printerName: target.name
    };
  } catch (err) {
    return { status: 'offline', printerName: printerName || 'Error' };
  }
}

/**
 * Send RAW bytes directly to Windows Thermal Print Queue using Win32 WritePrinter API
 * Speed target: Sub-100ms dispatch execution. Zero dialogs. Zero popups. Zero PDF conversions.
 */
async function sendRawToWindowsPrinter(printerName: string, rawData: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const tempFilePath = path.join(os.tmpdir(), `matadin_zpl_${Date.now()}.zpl`);
      fs.writeFileSync(tempFilePath, rawData, 'utf8');

      const psScript = `
$printerName = "${printerName.replace(/"/g, '`"')}"
$filePath = "${tempFilePath.replace(/\\/g, '\\\\')}"

$code = @"
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrinterHelper {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }

    [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

    [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);

    public static bool SendStringToPrinter(string szPrinterName, string szString) {
        IntPtr pBytes;
        Int32 dwCount = szString.Length;
        pBytes = Marshal.StringToCoTaskMemAnsi(szString);
        IntPtr hPrinter = new IntPtr(0);
        DOCINFOA di = new DOCINFOA();
        di.pDocName = "Matadin Thermal Label Job";
        di.pDataType = "RAW";
        bool bSuccess = false;
        if (OpenPrinter(szPrinterName, out hPrinter, IntPtr.Zero)) {
            if (StartDocPrinter(hPrinter, 1, di)) {
                if (StartPagePrinter(hPrinter)) {
                    Int32 dwWritten = 0;
                    bSuccess = WritePrinter(hPrinter, pBytes, dwCount, out dwWritten);
                    EndPagePrinter(hPrinter);
                }
                EndDocPrinter(hPrinter);
            }
            ClosePrinter(hPrinter);
        }
        Marshal.FreeCoTaskMem(pBytes);
        return bSuccess;
    }
}
"@
Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue
$content = [System.IO.File]::ReadAllText($filePath)
$result = [RawPrinterHelper]::SendStringToPrinter($printerName, $content)
if ($result) { Write-Output "SUCCESS" } else { Write-Output "FAILED" }
`;

      const base64Ps = Buffer.from(psScript, 'utf16le').toString('base64');
      exec(`powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${base64Ps}`, (error, stdout) => {
        try { fs.unlinkSync(tempFilePath); } catch (_) {}
        if (!error && stdout && stdout.trim().includes('SUCCESS')) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    } catch (e) {
      console.error('Win32 RAW Spool error:', e);
      resolve(false);
    }
  });
}

/**
 * Handle direct thermal print execution with Win32 RAW Spooler API
 */
export async function printLabel(window: BrowserWindow, request: PrintRequest): Promise<{ success: boolean; message: string }> {
  try {
    const { labelData, copies, printerName, language } = request;

    // 1. Enumerate system printers
    const installedPrinters = await getInstalledPrinters(window);
    let targetPrinterName = printerName;

    // Auto-detect target printer
    if (!targetPrinterName || targetPrinterName === 'Direct Thermal Spooler') {
      const thermalMatch = installedPrinters.find(p => THERMAL_PRINTER_REGEX.test(p.name));
      const defaultPrinter = installedPrinters.find(p => p.isDefault);

      if (thermalMatch) {
        targetPrinterName = thermalMatch.name;
      } else if (defaultPrinter) {
        targetPrinterName = defaultPrinter.name;
      } else if (installedPrinters.length > 0) {
        targetPrinterName = installedPrinters[0].name;
      }
    }

    const isThermalPrinter = targetPrinterName && THERMAL_PRINTER_REGEX.test(targetPrinterName);

    // 2. Generate RAW command
    let rawCommand = '';
    if (language === 'Honeywell Fingerprint') {
      rawCommand = generateFingerprint(labelData, copies);
    } else if (language === 'Toshiba TPCL') {
      rawCommand = generateTPCL(labelData, copies);
    } else {
      rawCommand = generateZPL(labelData, copies);
    }

    // 3. If thermal printer is connected, send RAW ZPL directly to Windows spooler
    if (isThermalPrinter && targetPrinterName) {
      const isSuccess = await sendRawToWindowsPrinter(targetPrinterName, rawCommand);
      if (isSuccess) {
        savePrintRecordOnlyOnSuccess(labelData, copies, targetPrinterName, language, 'SUCCESS').catch(err => {
          console.warn('SQLite print history log notice:', err);
        });

        return {
          success: true,
          message: `Label Printed Successfully (${copies} cop${copies > 1 ? 'ies' : 'y'})`
        };
      }
    }

    // 4. Windows Printer Fallback: Call webContents.print directly on mainWindow
    //    @media print in index.css isolates #printable-zebra-label (80mm x 50mm)
    if (window) {
      console.log('Triggering Windows print dialog on mainWindow for printer:', targetPrinterName);
      
      await new Promise<void>((resolve) => {
        window.webContents.print(
          {
            silent: false,
            printBackground: true,
            deviceName: (targetPrinterName && targetPrinterName !== 'Direct Thermal Spooler') ? targetPrinterName : undefined,
            copies: copies,
            color: true,
            margins: { marginType: 'none' },
            pageSize: { width: 80000, height: 50000 }
          },
          (success, failureReason) => {
            console.log('mainWindow print result:', success ? 'SUCCESS' : failureReason);
            resolve();
          }
        );
      });
    }

    savePrintRecordOnlyOnSuccess(labelData, copies, targetPrinterName || 'Windows Print Dialog', language, 'SUCCESS').catch(err => {
      console.warn('SQLite print history log notice:', err);
    });

    return {
      success: true,
      message: 'Print dialog opened with label preview'
    };

  } catch (error: any) {
    console.error('Print Engine Error:', error);
    return {
      success: false,
      message: 'Print error occurred.'
    };
  }
}
