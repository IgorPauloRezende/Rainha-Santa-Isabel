import type { PublicOverviewData } from '../components/PublicSite';

export const FALLBACK_OVERVIEW_DATA: PublicOverviewData = {
  settings: {
    churchName: 'Paróquia Rainha Santa Isabel',
    city: 'Casa Verde, São Paulo',
    address: 'Rua Elias Gannam, 331 · Vila Bandeirantes, São Paulo — SP',
    serviceTimes: `Igreja Matriz
Primeira sexta-feira do mês: 15h
Quarta-feira: 19h30
Domingo: 8h, 10h e 18h

Capela Maranata
Domingo: 11h30`,
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
  activeBanner: null,
  recentNotifications: [],
  folders: [
    {
      id: 'folder-liturgia',
      name: 'Liturgia & Folhetos',
      description: 'Folhetos de missa, cantos e roteiros celebrativos.',
      art: 'verdant',
      seed: 3,
      published: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'folder-catequese',
      name: 'Catequese & Formação',
      description: 'Apostilas, cronogramas e materiais das turmas.',
      art: 'aurora',
      seed: 7,
      published: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'folder-secretaria',
      name: 'Documentos & Secretaria',
      description: 'Formulários, avisos oficiais e documentos paroquiais.',
      art: 'glacier',
      seed: 11,
      published: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  files: [],
  stats: {
    activeMembersCount: 0,
    subscriberCount: 0,
  },
};
