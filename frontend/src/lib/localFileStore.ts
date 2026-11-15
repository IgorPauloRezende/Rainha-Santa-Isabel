import type { FolderArtPreset } from '../types/church';

export interface LocalSavedFile {
  id: string;
  folderId: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  notes: string;
  externalUrl: string;
  art?: FolderArtPreset;
  createdAt: string;
  isLocal: true;
}

const META_STORAGE_KEY = 'paroquia_local_saved_files_v1';
const DB_NAME = 'paroquia_local_files_db';
const STORE_NAME = 'blobs';

function openBlobDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponível'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Erro ao abrir IndexedDB'));
  });
}

export function loadLocalFilesMeta(): LocalSavedFile[] {
  try {
    const raw = localStorage.getItem(META_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalFilesMeta(files: LocalSavedFile[]) {
  try {
    localStorage.setItem(META_STORAGE_KEY, JSON.stringify(files));
  } catch {
    // ignore quota errors
  }
}

export async function saveLocalFile(params: {
  folderId: string;
  name: string;
  file?: File | null;
  notes?: string;
  externalUrl?: string;
  art?: FolderArtPreset;
}): Promise<LocalSavedFile> {
  const id = `loc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const file = params.file || null;
  const mimeType = file?.type || (params.notes ? 'text/plain; charset=utf-8' : 'application/octet-stream');
  const originalName = file?.name || (params.externalUrl ? params.name : `${params.name}.txt`);
  const size = file ? file.size : params.notes ? new Blob([params.notes]).size : 0;

  if (file) {
    try {
      const db = await openBlobDb();
      const buffer = await file.arrayBuffer();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put({ buffer, mimeType }, id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    } catch {
      // Fallback: if IndexedDB is blocked, metadata + notes still save
    }
  }

  const entry: LocalSavedFile = {
    id,
    folderId: params.folderId,
    name: params.name.trim(),
    originalName,
    mimeType,
    size,
    notes: (params.notes || '').trim(),
    externalUrl: (params.externalUrl || '').trim(),
    art: params.art,
    createdAt: new Date().toISOString(),
    isLocal: true,
  };

  const current = loadLocalFilesMeta();
  saveLocalFilesMeta([...current, entry]);
  return entry;
}

export async function getLocalFileBlob(id: string): Promise<Blob | null> {
  try {
    const db = await openBlobDb();
    const record = await new Promise<{ buffer: ArrayBuffer; mimeType: string } | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => resolve(req.result as { buffer: ArrayBuffer; mimeType: string } | undefined);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (!record) return null;
    return new Blob([record.buffer], { type: record.mimeType || 'application/octet-stream' });
  } catch {
    return null;
  }
}

export async function deleteLocalFile(id: string): Promise<void> {
  const next = loadLocalFilesMeta().filter((f) => f.id !== id);
  saveLocalFilesMeta(next);
  try {
    const db = await openBlobDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
    db.close();
  } catch {
    // ignore
  }
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileShortExt(originalName: string, mimeType: string, externalUrl?: string): string {
  if (externalUrl && !mimeType.startsWith('text/') && !mimeType.startsWith('image/') && !mimeType.includes('pdf')) {
    return 'LINK';
  }
  const dotIdx = originalName.lastIndexOf('.');
  if (dotIdx > -1 && dotIdx < originalName.length - 1) {
    return originalName.slice(dotIdx + 1).toUpperCase().slice(0, 5);
  }
  if (mimeType.includes('pdf')) return 'PDF';
  if (mimeType.startsWith('image/')) return mimeType.split('/')[1]?.toUpperCase() || 'IMG';
  if (mimeType.startsWith('text/')) return 'TXT';
  return 'ARQ';
}

export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo selecionado.'));
    reader.readAsDataURL(file);
  });
}
