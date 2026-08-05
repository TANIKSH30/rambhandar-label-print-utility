export interface LabelData {
  productName: string;
  netWeight: string;
  mrp: string;
  batchNumber: string;
  barcodeNumber: string;
  packedDate: string;
  bestBefore: string;
  gstin?: string;
  fssaiNo?: string;
}

/**
 * Generate Zebra ZPL II string internally matching reference label image.
 * Sub-50ms execution speed.
 */
export function generateZPL(data: LabelData, copies: number = 1): string {
  const gstin = data.gstin || "GST NO.27ABFFM5946H1ZY";
  const fssai = data.fssaiNo || "FSSAI – 11517055001007";
  const mrpVal = data.mrp || "80/-";

  const zpl = [
    "^XA",
    "^SZ2^JMA",
    "^MCY^PMN",
    "^PW590",
    "~JSN",
    "^JZY",
    "^LH0,0^LRN",
    "^XZ",
    "^XA",
    "^FT27,329",
    "^CI0",
    "^A0B,34,65^FDMATADIN^FS",
    "^FT64,326",
    "^A0B,34,40^FDRAM BHANDAR^FS",
    "^FT106,368",
    `^A0B,34,31^FD${gstin}^FS`,
    "^FT147,360",
    `^A0B,34,33^FD${fssai}^FS`,
    "^FT175,360",
    "^A0B,28,16^FD15,income tex colony, rana pratap nagar, 440022^FS",
    "^FO187,0",
    "^GB0,397,3^FS",
    "^FT227,314",
    "^A0B,34,29^FDPRODUCT NAME^FS",
    "^FT260,372",
    `^A0B,34,37^FD${data.productName}^FS`,
    "^FT294,372",
    `^A0B,34,29^FDNET  WEIGHT : ${data.netWeight}^FS`,
    "^FT328,368",
    `^A0B,34,31^FDMRP. ${mrpVal}^FS`,
    "^FT365,368",
    `^A0B,34,29^FDBATCH NO. ${data.batchNumber}^FS`,
    "^FT405,368",
    `^A0B,34,24^FDPACKED DATE: ${data.packedDate}^FS`,
    "^FT441,368",
    `^A0B,34,24^FDBEST BEFORE : ${data.bestBefore}^FS`,
    "^FO485,53",
    `^BY4^BCB,62,N,N^FD>;1${data.barcodeNumber}^FS`,
    "^FT565,298",
    `^A0B,34,46^FD${data.barcodeNumber}^FS`,
    `^PQ${copies},0,1,Y`,
    "^XZ"
  ].join("\n");

  return zpl;
}

/**
 * Generate Honeywell Fingerprint command internally
 */
export function generateFingerprint(data: LabelData, copies: number = 1): string {
  return [
    'NEW',
    'CLIP ON',
    'FONT "CG Times",12',
    'PRPOS 27,329',
    'PRTXT "MATADIN RAM BHANDAR"',
    `PRPOS 260,372`,
    `PRTXT "PRODUCT: ${data.productName}"`,
    `PRPOS 294,372`,
    `PRTXT "NET WEIGHT: ${data.netWeight} | MRP: ${data.mrp}"`,
    `PRPOS 365,368`,
    `PRTXT "BATCH NO: ${data.batchNumber} | PKD: ${data.packedDate}"`,
    `PRBARCODE "${data.barcodeNumber}", "CODE128", 270`,
    `PRINT ${copies}`,
    'END'
  ].join("\n");
}

/**
 * Generate Toshiba TPCL command internally
 */
export function generateTPCL(data: LabelData, copies: number = 1): string {
  const copiesPadded = String(copies).padStart(4, '0');
  return [
    '{D0590,0400,0600|}',
    '{C|}',
    `{PC000;0027,0329,1,1,J,00,B=MATADIN RAM BHANDAR|}`,
    `{PC001;0260,0372,1,1,G,00,B=${data.productName}|}`,
    `{XB00;0455,0053,3,3,02,1,0062,+0000000000|${data.barcodeNumber}|}`,
    `{XS;I,${copiesPadded},0002|}`
  ].join("\n");
}

