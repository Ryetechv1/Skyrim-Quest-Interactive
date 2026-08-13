export type GuidePdfSlot = "prima" | "strategy";

export type StoredGuidePdfMeta = {
  slot: GuidePdfSlot;
  name: string;
  size: number;
  type: string;
  importedAt: string;
  importedBy: string;
};

export type StoredGuidePdf = StoredGuidePdfMeta & {
  blob: Blob;
};

const DATABASE_NAME = "davinci-guide-archive";
const DATABASE_VERSION = 1;
const STORE_NAME = "guide-pdfs";

function openGuideArchive() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("Browser archive storage is unavailable."));
      return;
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "slot" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Guide archive failed to open."));
  });
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Guide archive request failed."));
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Guide archive transaction failed."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Guide archive transaction aborted."));
  });
}

export function storedGuidePdfMeta(record: StoredGuidePdf): StoredGuidePdfMeta {
  return {
    slot: record.slot,
    name: record.name,
    size: record.size,
    type: record.type,
    importedAt: record.importedAt,
    importedBy: record.importedBy,
  };
}

export async function readStoredGuidePdf(slot: GuidePdfSlot) {
  const database = await openGuideArchive();

  try {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const record = await requestResult<StoredGuidePdf | undefined>(store.get(slot));
    await transactionDone(transaction);
    return record ?? null;
  } finally {
    database.close();
  }
}

export async function importStoredGuidePdf(slot: GuidePdfSlot, file: File, importedBy: string) {
  const database = await openGuideArchive();
  const record: StoredGuidePdf = {
    slot,
    name: file.name,
    size: file.size,
    type: file.type || "application/pdf",
    importedAt: new Date().toISOString(),
    importedBy,
    blob: file,
  };

  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    await requestResult(store.add(record));
    await transactionDone(transaction);
    return record;
  } finally {
    database.close();
  }
}
