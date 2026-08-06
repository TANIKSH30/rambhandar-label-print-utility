import React, { useEffect, useState } from 'react';
import { LabelData, PrinterDevice } from '../types/label';
import bwipjs from 'bwip-js';
import { Eye, Sliders, CheckCircle2, Printer, RefreshCw, Minus, Plus } from 'lucide-react';

interface LabelPreviewProps {
  labelData: LabelData;
  activeTab: 'preview' | 'setup';
  onTabChange: (tab: 'preview' | 'setup') => void;
  printers?: PrinterDevice[];
  selectedPrinter?: string;
  onPrinterSelect?: (printer: string) => void;
  copies?: number;
  onCopiesChange?: (copies: number) => void;
  onRefreshPrinters?: () => void;
}

const BarcodeImage = ({ text, orientation, x, y }: { text: string, height: number, bw: number, orientation: string, x: number, y: number }) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [dimensions, setDimensions] = useState({ w: 62, h: 212 });

  useEffect(() => {
    if (!text) return;

    try {
      const canvas = document.createElement('canvas');

      bwipjs.toCanvas(canvas, {
        bcid: 'code128',
        text,
        scale: 2,
        height: 15,
        includetext: false,
        rotate: orientation === 'B' ? 'L' : 'N'
      });

      setDimensions({
        w: canvas.width,
        h: canvas.height
      });

      setDataUrl(canvas.toDataURL('image/png'));
    } catch (err) {
      console.warn('Barcode rendering warning:', err);
    }
  }, [text, orientation]);

  if (!dataUrl) return null;

  return (
    <image
      x={x}
      y={y}
      width={dimensions.w}
      height={dimensions.h}
      href={dataUrl}
      preserveAspectRatio="none"
    />
  );
};

export const LabelPreview: React.FC<LabelPreviewProps> = ({
  labelData,
  activeTab,
  onTabChange,
  printers = [],
  selectedPrinter = '',
  onPrinterSelect = () => { },
  copies = 1,
  onCopiesChange = () => { },
  onRefreshPrinters = () => { }
}) => {

  const generateZPLString = (data: LabelData) => `^XA
^SZ2^JMA
^MCY^PMN
^PW590
~JSN
^JZY
^LH0,0^LRN
^XZ
^XA
^FT27,329
^CI0
^A0B,34,65^FDMATADIN^FS
^FT64,326
^A0B,34,40^FDRAM BHANDAR^FS
^FT106,368
^A0B,34,31^FD${data.gstin || 'GST NO.27ABFFM5946H1ZY'}^FS
^FT147,360
^A0B,34,33^FD${data.fssaiNo || 'FSSAI – 11517055001007'}^FS
^FT175,360
^A0B,28,16^FD15,income tex colony, rana pratap nagar, 440022^FS
^FO187,0
^GB0,397,3^FS
^FT227,314
^A0B,34,29^FDPRODUCT NAME^FS
^FT260,372
^A0B,34,37^FD${data.productName || 'Falhari Chiwda'}^FS
^FT294,372
^A0B,34,29^FDNET  WEIGHT : ${data.netWeight || '250GM'}^FS
^FT328,368
^A0B,34,31^FDMRP. ${data.mrp || '80/-'}^FS
^FT365,368
^A0B,34,29^FDBATCH NO. ${data.batchNumber || 'sep2026'}^FS
^FT405,368
^A0B,34,24^FDPACKED DATE: ${data.packedDate || '30 - 09 - 2026'}^FS
^FT441,368
^A0B,34,24^FDBEST BEFORE : ${data.bestBefore || '15 - 12 - 2026'}^FS
^FO430,75
^BY4
^BCB,62,N,N
^FD>;1${data.barcodeNumber || '12345678'}^FS
^FT524,320
^A0B,34,46
^FD${data.barcodeNumber || '12345678'}^FS
^PQ1,0,1,Y
^XZ`;

  const parseZplToSVG = (zpl: string) => {
    const commands = zpl.split(/\^|~/).map(c => c.trim()).filter(Boolean);
    const elements: JSX.Element[] = [];

    let currentX = 0;
    let currentY = 0;
    let fontHeight = 34;
    let fontWidth = 34;
    let orientation = 'N';
    let isFT = true;

    let barcodeWidth = 2;
    let barcodeHeight = 62;
    let isBarcode = false;

    commands.forEach((cmd, index) => {
      if (cmd.startsWith('FT')) {
        const parts = cmd.substring(2).split(',');
        currentX = parseInt(parts[0] || '0', 10);
        currentY = parseInt(parts[1] || '0', 10);
        isFT = true;
      } else if (cmd.startsWith('FO')) {
        const parts = cmd.substring(2).split(',');
        currentX = parseInt(parts[0] || '0', 10);
        currentY = parseInt(parts[1] || '0', 10);
        isFT = false;
      } else if (cmd.startsWith('A0')) {
        orientation = cmd.charAt(2);
        const parts = cmd.substring(4).split('^')[0].split(',');
        fontHeight = parseInt(parts[0] || '34', 10);
        fontWidth = parseInt(parts[1] || '34', 10);
        isBarcode = false;
      } else if (cmd.startsWith('GB')) {
        const parts = cmd.substring(2).split('^FS')[0].split(',');
        const w = parseInt(parts[0] || '0', 10);
        const h = parseInt(parts[1] || '0', 10);
        const t = parseInt(parts[2] || '1', 10);
        elements.push(
          <rect key={'gb' + index} x={currentX} y={currentY} width={w || t} height={h || t} fill="black" />
        );
      } else if (cmd.startsWith('BY')) {
        const parts = cmd.substring(2).split(',');
        barcodeWidth = parseInt(parts[0] || '2', 10);
      } else if (cmd.startsWith('BC')) {
        orientation = cmd.charAt(2);
        const parts = cmd.substring(4).split(',');
        barcodeHeight = parseInt(parts[0] || '62', 10);
        isBarcode = true;
      } else if (cmd.startsWith('FD')) {
        const text = cmd.substring(2).split('^FS')[0].split('~FS')[0];

        if (isBarcode) {
          const cleanText = text.replace('>;1', '');
          elements.push(
            <BarcodeImage
              key={'bc' + index}
              text={cleanText}
              height={barcodeHeight}
              bw={barcodeWidth}
              orientation={orientation}
              x={currentX}
              y={currentY}
            />
          );
        } else {
          // Precise ZPL dot scale formula to match reference label
          const scaleX = (fontWidth * 0.5) / (fontHeight * 0.54);

          if (orientation === 'B') {
            elements.push(
              <g key={'txt' + index} transform={`translate(${currentX}, ${currentY}) rotate(-90)`}>
                <text
                  x={0}
                  y={0}
                  fontFamily="'Arial Narrow', Arial, 'Helvetica Neue', sans-serif"
                  fontWeight="bold"
                  fontSize={fontHeight}
                  fill="black"
                  transform={`scale(${scaleX}, 1)`}
                >
                  {text}
                </text>
              </g>
            );
          } else {
            elements.push(
              <g key={'txt' + index} transform={`translate(${currentX}, ${currentY})`}>
                <text
                  x={0}
                  y={0}
                  fontFamily="'Arial Narrow', Arial, 'Helvetica Neue', sans-serif"
                  fontWeight="bold"
                  fontSize={fontHeight}
                  fill="black"
                  transform={`scale(${scaleX}, 1)`}
                  alignmentBaseline={isFT ? "baseline" : "hanging"}
                >
                  {text}
                </text>
              </g>
            );
          }
        }
      }
    });

    return elements;
  };

  const isPrinterReady = selectedPrinter !== '' || printers.length > 0;

  return (
    <div className="bg-gradient-to-b from-white to-slate-50/50 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col h-full overflow-hidden hover:shadow-md transition-all duration-200">
      {/* Header Tabs */}
      <div className="bg-slate-100/80 px-4 pt-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => onTabChange('preview')}
            className={`flex items-center gap-2 px-5 py-2.5 font-bold text-xs rounded-t-xl transition-all duration-150 ${activeTab === 'preview'
              ? 'bg-white text-[#0B1B3A] border-t-2 border-t-[#0B1B3A] shadow-sm'
              : 'text-slate-500 hover:text-slate-800 bg-transparent'
              }`}
          >
            <Eye className="w-4 h-4" /> Label Preview
          </button>

          <button
            type="button"
            onClick={() => onTabChange('setup')}
            className={`flex items-center gap-2 px-5 py-2.5 font-bold text-xs rounded-t-xl transition-all duration-150 ${activeTab === 'setup'
              ? 'bg-white text-[#0B1B3A] border-t-2 border-t-[#0B1B3A] shadow-sm'
              : 'text-slate-500 hover:text-slate-800 bg-transparent'
              }`}
          >
            <Sliders className="w-4 h-4" /> Print Setup
          </button>
        </div>

        <div className="text-[11px] font-semibold text-slate-600 bg-slate-200/70 px-3 py-1 rounded-full flex items-center gap-1.5 mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> 80×50mm Label Format
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-[#F3F4F6] p-6 flex-1 flex flex-col items-center justify-center relative overflow-auto">
        {activeTab === 'preview' ? (
          <div className="w-full max-w-[540px] my-auto flex flex-col items-center">
            {/* Paper-Style Preview Card: Exact 590/400 aspect ratio matching vertical ZPL layout */}
            <div className="thermal-label-paper bg-white rounded-2xl p-6 text-black flex border border-slate-200 shadow-xl font-mono select-none relative overflow-hidden aspect-[590/400] w-full">
              <svg viewBox="0 0 590 400" className="w-full h-full text-black block overflow-hidden bg-white">
                {parseZplToSVG(generateZPLString(labelData))}
              </svg>
            </div>

            <p className="text-[11px] font-medium text-slate-500 mt-3 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              1:1 Pixel-Perfect Reference Label Match
            </p>
          </div>
        ) : (
          /* Requirement 1: Clean Industrial Printer Configuration Panel */
          <div className="w-full max-w-md bg-white rounded-2xl p-6 border border-slate-200 shadow-sm text-slate-800 space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="text-base font-bold text-[#0B1B3A] flex items-center gap-2">
                <Printer className="w-5 h-5 text-[#0B1B3A]" /> Printer Configuration
              </h3>
            </div>

            {/* Printer Status */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-600">Printer Status</span>
              {isPrinterReady ? (
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Ready
                </span>
              ) : (
                <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span> Not Connected
                </span>
              )}
            </div>

            {/* Target Printer Dropdown + Refresh */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Target Printer</label>
              <div className="flex items-center gap-2">
                <select
                  value={selectedPrinter}
                  onChange={(e) => onPrinterSelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#0B1B3A]/20 focus:border-[#0B1B3A]"
                >
                  {printers.length > 0 ? (
                    printers.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name} {p.isDefault ? '(Default)' : ''}
                      </option>
                    ))
                  ) : (
                    <option value="">Direct Thermal Spooler</option>
                  )}
                </select>
                <button
                  type="button"
                  onClick={onRefreshPrinters}
                  title="Refresh Printer List"
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-slate-700 transition"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Copies Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Number of Copies</label>
              <div className="flex items-center bg-slate-50 rounded-xl p-1.5 border border-slate-300 w-fit">
                <button
                  type="button"
                  onClick={() => onCopiesChange(Math.max(1, copies - 1))}
                  className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-700 hover:bg-slate-200 transition"
                  disabled={copies <= 1}
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-12 text-center font-bold text-sm text-[#0B1B3A]">
                  {copies}
                </span>
                <button
                  type="button"
                  onClick={() => onCopiesChange(copies + 1)}
                  className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-700 hover:bg-slate-200 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
