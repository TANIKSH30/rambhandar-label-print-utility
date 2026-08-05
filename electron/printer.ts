import { BrowserWindow, PrinterInfo } from 'electron';
import { generateZPL, generateFingerprint, generateTPCL, LabelData } from './zplGenerator';
import { savePrintRecord } from './database';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';

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
 * Direct RAW thermal printing to Windows Print Queue using Win32 WritePrinter API via PowerShell
 */
async function printRawToWindowsPrinter(printerName: string, rawData: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const tempFilePath = path.join(os.tmpdir(), `matadin_label_${Date.now()}.zpl`);
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
        if (OpenPrinter(szPrinterName, out hPrinter, IntPtr.Zero)) {
            if (StartDocPrinter(hPrinter, 1, di)) {
                if (StartPagePrinter(hPrinter)) {
                    Int32 dwWritten = 0;
                    WritePrinter(hPrinter, pBytes, dwCount, out dwWritten);
                    EndPagePrinter(hPrinter);
                }
                EndDocPrinter(hPrinter);
            }
            ClosePrinter(hPrinter);
            Marshal.FreeCoTaskMem(pBytes);
            return true;
        }
        Marshal.FreeCoTaskMem(pBytes);
        return false;
    }
}
"@
Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue
$content = [System.IO.File]::ReadAllText($filePath)
[RawPrinterHelper]::SendStringToPrinter($printerName, $content)
`;

      const base64Ps = Buffer.from(psScript, 'utf16le').toString('base64');
      exec(`powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${base64Ps}`, (error) => {
        try { fs.unlinkSync(tempFilePath); } catch (_) {}
        if (error) {
          console.warn('PowerShell raw spool warning:', error);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    } catch (e) {
      console.error('Raw print error:', e);
      resolve(false);
    }
  });
}

/**
 * Handle direct thermal printing request offline & save to local SQLite DB
 */
export async function printLabel(window: BrowserWindow, request: PrintRequest): Promise<{ success: boolean; message: string }> {
  try {
    const { labelData, copies, printerName, language } = request;

    // 1. Save job details to local SQLite database (failsafe)
    await savePrintRecord(labelData, copies, printerName || 'Default Printer', language);

    // 2. Try Direct Raw Thermal Spooling if printer selected
    if (printerName) {
      let rawCommand = '';
      if (language === 'Honeywell Fingerprint') {
        rawCommand = generateFingerprint(labelData, copies);
      } else if (language === 'Toshiba TPCL') {
        rawCommand = generateTPCL(labelData, copies);
      } else {
        rawCommand = generateZPL(labelData, copies);
      }

      const rawSuccess = await printRawToWindowsPrinter(printerName, rawCommand);
      if (rawSuccess) {
        return {
          success: true,
          message: `Label sent directly to thermal printer (${copies} cop${copies > 1 ? 'ies' : 'y'})`
        };
      }
    }

    // 3. Fallback to Chromium Native Print Dialog (Formatted via @media print CSS for exact 80x50mm label)
    return new Promise((resolve) => {
      window.webContents.print(
        {
          silent: false,
          printBackground: true,
          deviceName: printerName || undefined
        },
        (success, errorType) => {
          if (success) {
            resolve({
              success: true,
              message: 'Print Job Sent'
            });
          } else {
            resolve({
              success: false,
              message: errorType === 'cancelled' ? 'Print cancelled' : (errorType || 'Failed to print')
            });
          }
        }
      );
    });

  } catch (error: any) {
    console.error('Print Execution Error:', error);
    return {
      success: false,
      message: `Print Error: ${error?.message || 'Failed to initialize print job.'}`
    };
  }
}

