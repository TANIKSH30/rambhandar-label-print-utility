export interface ProductMasterItem {
  id?: string | number;
  productName: string;
  netWeight: string;
  mrp: string;
  barcodeNumber: string;
  defaultBatchNumber?: string;
  defaultBestBefore?: string;
  createdAt?: string;
  updatedAt?: string;
}

const STORAGE_KEY = 'matadin_product_master_v1';

const INITIAL_DEFAULT_PRODUCTS: ProductMasterItem[] = [
  {
    productName: 'Falhari Chiwda',
    netWeight: '250GM',
    mrp: '80/-',
    barcodeNumber: '12345678',
    defaultBatchNumber: 'sep2026',
    defaultBestBefore: '15 - 12 - 2026'
  },
  {
    productName: 'Desi Ghee Soan Papdi',
    netWeight: '500GM',
    mrp: '220/-',
    barcodeNumber: '87654321',
    defaultBatchNumber: 'sep2026',
    defaultBestBefore: '30 - 11 - 2026'
  },
  {
    productName: 'Kaju Katli Special',
    netWeight: '400GM',
    mrp: '450/-',
    barcodeNumber: '99887766',
    defaultBatchNumber: 'sep2026',
    defaultBestBefore: '15 - 10 - 2026'
  }
];

export const getProductMasterSync = (): ProductMasterItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DEFAULT_PRODUCTS));
      return INITIAL_DEFAULT_PRODUCTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_DEFAULT_PRODUCTS;
  } catch (_) {
    return INITIAL_DEFAULT_PRODUCTS;
  }
};

export const saveProductMasterSync = (items: ProductMasterItem[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to save Product Master to localStorage:', err);
  }
};

export const getProductMasterAsync = async (query?: string): Promise<ProductMasterItem[]> => {
  if (window.electronAPI?.getProductMaster) {
    try {
      const records = await window.electronAPI.getProductMaster(query);
      if (records && Array.isArray(records) && records.length > 0) {
        return records;
      }
    } catch (err) {
      console.warn('SQLite Product Master fetch warning:', err);
    }
  }
  const local = getProductMasterSync();
  if (!query || !query.trim()) return local;
  const q = query.trim().toLowerCase();
  return local.filter(
    (p) => p.productName.toLowerCase().includes(q) || p.barcodeNumber.toLowerCase().includes(q)
  );
};

export const addOrUpdateProductMasterItem = async (item: Partial<ProductMasterItem>): Promise<ProductMasterItem[]> => {
  if (!item.productName || !item.productName.trim()) return await getProductMasterAsync();

  const trimmedName = item.productName.trim();
  const now = new Date().toISOString();

  const formatted: ProductMasterItem = {
    productName: trimmedName,
    netWeight: item.netWeight || '',
    mrp: item.mrp || '',
    barcodeNumber: item.barcodeNumber || '',
    defaultBatchNumber: item.defaultBatchNumber || '',
    defaultBestBefore: item.defaultBestBefore || '',
    createdAt: now,
    updatedAt: now
  };

  // SQLite Electron Async Persistence
  if (window.electronAPI?.saveProductMaster) {
    try {
      await window.electronAPI.saveProductMaster(formatted);
    } catch (err) {
      console.warn('SQLite Product Master save warning:', err);
    }
  }

  // Web localStorage Fallback Persistence
  const current = getProductMasterSync();
  const existingIndex = current.findIndex(
    (p) => p.productName.toLowerCase() === trimmedName.toLowerCase() ||
           (formatted.barcodeNumber && p.barcodeNumber === formatted.barcodeNumber)
  );

  if (existingIndex >= 0) {
    current[existingIndex] = {
      ...current[existingIndex],
      ...formatted,
      updatedAt: now
    };
  } else {
    current.push({
      ...formatted,
      id: String(Date.now() + Math.random())
    });
  }

  saveProductMasterSync(current);
  return await getProductMasterAsync();
};

export const syncExcelRowsToProductMaster = async (rows: Array<Record<string, any>>): Promise<ProductMasterItem[]> => {
  const formattedItems: ProductMasterItem[] = [];

  rows.forEach((r) => {
    const pName = r.productName || r['Product Name'] || r['product_name'] || r['Name'];
    if (pName && String(pName).trim()) {
      formattedItems.push({
        productName: String(pName).trim(),
        netWeight: String(r.netWeight || r['Net Weight'] || r['net_weight'] || r['Weight'] || ''),
        mrp: String(r.mrp || r['MRP'] || r['mrp'] || ''),
        barcodeNumber: String(r.barcodeNumber || r['Barcode'] || r['barcode_number'] || r['Barcode Number'] || ''),
        defaultBatchNumber: String(r.batchNumber || r['Batch'] || r['batch_number'] || ''),
        defaultBestBefore: String(r.bestBefore || r['Best Before'] || r['best_before'] || '')
      });
    }
  });

  if (formattedItems.length === 0) return await getProductMasterAsync();

  // SQLite Electron Async Sync
  if (window.electronAPI?.syncProductMaster) {
    try {
      await window.electronAPI.syncProductMaster(formattedItems);
    } catch (err) {
      console.warn('SQLite Product Master bulk sync warning:', err);
    }
  }

  // Web Sync
  for (const item of formattedItems) {
    await addOrUpdateProductMasterItem(item);
  }

  return await getProductMasterAsync();
};

export const searchProductMasterAsync = async (query: string): Promise<ProductMasterItem[]> => {
  return await getProductMasterAsync(query);
};
