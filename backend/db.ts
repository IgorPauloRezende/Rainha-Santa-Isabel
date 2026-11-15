import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ChurchDatabase, ChurchFolder } from '../shared/types/church.ts';

const DATA_FILE_PATH = process.env.DATA_FILE
  ? path.resolve(process.env.DATA_FILE)
  : fileURLToPath(new URL('./data/church.json', import.meta.url));

export const UPLOADS_DIR = path.join(path.dirname(DATA_FILE_PATH), 'uploads');

export function createDefaultFolders(): ChurchFolder[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'folder-liturgia',
      name: 'Liturgia & Folhetos',
      description: 'Folhetos de missa, cantos e roteiros celebrativos.',
      art: 'verdant',
      seed: 3,
      published: true,
      createdAt: now,
    },
    {
      id: 'folder-catequese',
      name: 'Catequese & Formação',
      description: 'Apostilas, cronogramas e materiais das turmas.',
      art: 'aurora',
      seed: 7,
      published: true,
      createdAt: now,
    },
    {
      id: 'folder-secretaria',
      name: 'Documentos & Secretaria',
      description: 'Formulários, avisos oficiais e documentos paroquiais.',
      art: 'glacier',
      seed: 11,
      published: true,
      createdAt: now,
    },
  ];
}

function createInitialSeed(): ChurchDatabase {
  return {
    settings: {
      churchName: 'Paróquia Rainha Santa Isabel',
      city: 'Casa Verde, São Paulo',
      address: 'Rua Elias Gannam, 331 · Vila Bandeirantes, São Paulo — SP',
      serviceTimes:
        'Igreja Matriz\nPrimeira sexta-feira do mês: 15h\nQuarta-feira: 19h30\nDomingo: 8h, 10h e 18h\n\nCapela Maranata\nDomingo: 11h30',
      contactEmail: 'rainha_santaisabel@hotmail.com',
      contactPhone: '(11) 3857-5051',
      officeHoursWeekdays: '8h às 18h',
      officeHoursWeekdaysNote: 'fechada durante o almoço',
      officeHoursSaturday: '9h às 12h',
      whatsappNumber: '',
      liveStreamUrl: '',
      heroTitle: 'Paróquia Rainha Santa Isabel',
      heroSubtitle: '“Uma comunidade de fé, oração e acolhimento.”',
    },
    events: [],
    sermons: [],
    members: [],
    notifications: [],
    subscribers: [],
    prayerRequests: [],
    parishioners: [],
    folders: createDefaultFolders(),
    files: [],
  };
}

let cachedDb: ChurchDatabase | null = null;

function ensureDirectoryExists(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

export function readDb(): ChurchDatabase {
  if (cachedDb) return cachedDb;

  ensureDirectoryExists(DATA_FILE_PATH);

  if (!fs.existsSync(DATA_FILE_PATH)) {
    const seed = createInitialSeed();
    writeDb(seed);
    return seed;
  }

  try {
    const raw = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as ChurchDatabase;
    parsed.settings = {
      ...createInitialSeed().settings,
      ...(parsed.settings || {}),
    };
    parsed.parishioners = Array.isArray(parsed.parishioners) ? parsed.parishioners : [];
    parsed.folders =
      Array.isArray(parsed.folders) && parsed.folders.length > 0
        ? parsed.folders
        : createDefaultFolders();
    parsed.files = Array.isArray(parsed.files) ? parsed.files : [];
    cachedDb = parsed;
    return cachedDb;
  } catch {
    const seed = createInitialSeed();
    writeDb(seed);
    return seed;
  }
}

export function writeDb(nextDb: ChurchDatabase): ChurchDatabase {
  ensureDirectoryExists(DATA_FILE_PATH);
  const tempPath = `${DATA_FILE_PATH}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(nextDb, null, 2), 'utf-8');
  fs.renameSync(tempPath, DATA_FILE_PATH);
  cachedDb = nextDb;
  return nextDb;
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
