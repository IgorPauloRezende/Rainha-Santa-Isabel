import type { PublicEvent } from '../components/PublicSite';

export interface ServiceTimeBlock {
  heading: string;
  rows: Array<{ label: string; time?: string }>;
}

export interface RecurringCelebrationRule {
  place: string;
  dayOfWeek: number | null; // 0 (Dom) - 6 (Sáb), null = todos os dias
  nthOfMonth?: number; // 1 = primeira ocorrência do mês, etc.
  times: string[]; // '08:00', '19:30'
  title: string;
  dayShortLabel: string;
}

export interface CalendarCelebrationItem {
  time: string;
  place: string;
  type: 'regular' | 'special';
  title: string;
}

export interface HeroScheduleSummary {
  addressLine: string;
  primaryLabel: string;
  primarySummary: string;
  secondaryLabel: string;
  secondarySummary: string;
}

export const DEFAULT_SERVICE_TIMES = [
  'Igreja Matriz',
  'Primeira sexta-feira do mês: 15h',
  'Quarta-feira: 19h30',
  'Domingo: 8h, 10h e 18h',
  '',
  'Capela Maranata',
  'Domingo: 11h30',
].join('\n');

const DAY_SHORT_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const WEEKDAY_TOKEN_MAP: Array<{ pattern: RegExp; day: number }> = [
  { pattern: /\b(?:domingos?|dom)\b/i, day: 0 },
  { pattern: /\b(?:segundas?(?:-feiras?)?|seg)\b/i, day: 1 },
  { pattern: /\b(?:tercas?(?:-feiras?)?|ter)\b/i, day: 2 },
  { pattern: /\b(?:quartas?(?:-feiras?)?|qua)\b/i, day: 3 },
  { pattern: /\b(?:quintas?(?:-feiras?)?|qui)\b/i, day: 4 },
  { pattern: /\b(?:sextas?(?:-feiras?)?|sex)\b/i, day: 5 },
  { pattern: /\b(?:sabados?|sab)\b/i, day: 6 },
];

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function normalizeTelHref(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return 'tel:1138575051';
  return `tel:${digits}`;
}

export function buildWhatsappUrl(rawNumber: string, text?: string): string | null {
  let digits = (rawNumber || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 10 || digits.length === 11) {
    digits = `55${digits}`;
  }
  if (digits.length < 10 || digits.length > 15) return null;
  const base = `https://wa.me/${digits}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function parseServiceTimesBlocks(raw: string): ServiceTimeBlock[] {
  const source = raw.trim() || DEFAULT_SERVICE_TIMES;
  const blocks: ServiceTimeBlock[] = [];
  let current: ServiceTimeBlock | null = null;

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      if (current && current.rows.length > 0) {
        blocks.push(current);
        current = null;
      }
      continue;
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) {
      if (current && current.rows.length > 0) {
        blocks.push(current);
        current = null;
      }
      if (!current) {
        current = { heading: line, rows: [] };
      } else {
        current.rows.push({ label: line });
      }
    } else {
      const label = line.slice(0, colonIdx).trim();
      const time = line.slice(colonIdx + 1).trim();
      if (!current) {
        current = { heading: 'Programação semanal', rows: [] };
      }
      current.rows.push({ label, time });
    }
  }

  if (current && (current.rows.length > 0 || current.heading)) {
    blocks.push(current);
  }

  return blocks;
}

function extractTimesFromValue(value: string): string[] {
  const matches = Array.from(value.matchAll(/(\d{1,2})\s*(?:h|:)\s*(\d{2})?/gi));
  const results: string[] = [];

  for (const match of matches) {
    const hh = Number(match[1]);
    const mm = match[2] !== undefined ? Number(match[2]) : 0;
    if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
      results.push(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`);
    }
  }

  return results;
}

function extractDaysAndOrdinal(label: string): {
  days: Array<number | null>;
  nthOfMonth?: number;
} {
  let clean = stripAccents(label.toLowerCase());
  let nthOfMonth: number | undefined;

  const weekdayLookahead = '(?=\\s+(?:domingo|segunda|terca|quarta|quinta|sexta|sabado|dom|seg|ter|qua|qui|sex|sab))';
  const ordinalPatterns: Array<{ re: RegExp; nth: number }> = [
    { re: new RegExp(`\\b(?:primeira|primeiro|1a|1o|1)\\s*${weekdayLookahead}`, 'i'), nth: 1 },
    { re: new RegExp(`\\b(?:segunda|segundo|2a|2o|2)\\s*${weekdayLookahead}`, 'i'), nth: 2 },
    { re: new RegExp(`\\b(?:terceira|terceiro|3a|3o|3)\\s*${weekdayLookahead}`, 'i'), nth: 3 },
    { re: new RegExp(`\\b(?:quarta|quarto|4a|4o|4)\\s*${weekdayLookahead}`, 'i'), nth: 4 },
  ];

  for (const item of ordinalPatterns) {
    if (item.re.test(clean)) {
      nthOfMonth = item.nth;
      clean = clean.replace(item.re, ' ');
      break;
    }
  }

  // Day ranges like "terca a sexta" or "segunda a sabado"
  const rangeMatch = clean.match(
    /\b(domingo|segunda|terca|quarta|quinta|sexta|sabado)(?:-feira)?\s+(?:a|ate)\s+(domingo|segunda|terca|quarta|quinta|sexta|sabado)(?:-feira)?\b/i,
  );
  if (rangeMatch) {
    const startIdx = WEEKDAY_TOKEN_MAP.find((w) => w.pattern.test(rangeMatch[1]))?.day;
    const endIdx = WEEKDAY_TOKEN_MAP.find((w) => w.pattern.test(rangeMatch[2]))?.day;
    if (startIdx !== undefined && endIdx !== undefined) {
      const rangeDays: number[] = [];
      let cursor = startIdx;
      for (let guard = 0; guard < 7; guard++) {
        rangeDays.push(cursor);
        if (cursor === endIdx) break;
        cursor = (cursor + 1) % 7;
      }
      return { days: rangeDays, nthOfMonth };
    }
  }

  if (/\b(?:todos os dias|diario|diariamente)\b/i.test(clean)) {
    return { days: [null], nthOfMonth };
  }

  const matchedDays: number[] = [];
  for (const entry of WEEKDAY_TOKEN_MAP) {
    if (entry.pattern.test(clean) && !matchedDays.includes(entry.day)) {
      matchedDays.push(entry.day);
    }
  }

  return { days: matchedDays, nthOfMonth };
}

function resolveCelebrationTitle(
  label: string,
  dayOfWeek: number | null,
  nthOfMonth?: number,
): string {
  const clean = stripAccents(label.toLowerCase());
  if (clean.includes('adorac')) return 'Adoração ao Santíssimo';
  if (clean.includes('confiss')) return 'Atendimento de Confissões';
  if (clean.includes('terco')) return 'Oração do Terço';
  if (clean.includes('novena')) return 'Santa Missa e Novena';
  if (dayOfWeek === 5 && nthOfMonth === 1) return 'Missa do Sagrado Coração de Jesus';
  if (dayOfWeek === 0) return 'Santa Missa Dominical';
  if (dayOfWeek === 3) return 'Santa Missa e Novena';
  return 'Santa Missa';
}

export function parseRecurringCelebrations(serviceTimes: string): RecurringCelebrationRule[] {
  const blocks = parseServiceTimesBlocks(serviceTimes);
  const rules: RecurringCelebrationRule[] = [];

  for (const block of blocks) {
    const place = block.heading || 'Igreja Matriz';
    for (const row of block.rows) {
      if (!row.time) continue;
      const times = extractTimesFromValue(row.time);
      if (times.length === 0) continue;

      const { days, nthOfMonth } = extractDaysAndOrdinal(row.label);
      for (const dayOfWeek of days) {
        const dayShortLabel =
          dayOfWeek === null
            ? 'Diário'
            : nthOfMonth
              ? `${nthOfMonth}ª ${DAY_SHORT_NAMES[dayOfWeek]}`
              : DAY_SHORT_NAMES[dayOfWeek];

        rules.push({
          place,
          dayOfWeek,
          nthOfMonth,
          times,
          title: resolveCelebrationTitle(row.label, dayOfWeek, nthOfMonth),
          dayShortLabel,
        });
      }
    }
  }

  return rules;
}

function matchesRecurringRule(date: Date, rule: RecurringCelebrationRule): boolean {
  if (rule.dayOfWeek !== null && date.getDay() !== rule.dayOfWeek) {
    return false;
  }
  if (rule.nthOfMonth !== undefined) {
    const occurrence = Math.ceil(date.getDate() / 7);
    if (occurrence !== rule.nthOfMonth) return false;
  }
  return true;
}

function toIsoDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function checkHasCelebrationFromSettings(
  date: Date,
  rules: RecurringCelebrationRule[],
  events: PublicEvent[],
): boolean {
  if (rules.some((rule) => matchesRecurringRule(date, rule))) {
    return true;
  }
  const dateStr = toIsoDate(date);
  return events.some((e) => e.date === dateStr);
}

export function getCelebrationsForDateFromSettings(
  date: Date,
  rules: RecurringCelebrationRule[],
  events: PublicEvent[],
): CalendarCelebrationItem[] {
  const list: CalendarCelebrationItem[] = [];

  for (const rule of rules) {
    if (!matchesRecurringRule(date, rule)) continue;
    for (const time of rule.times) {
      list.push({
        time,
        place: rule.place,
        type: 'regular',
        title: rule.title,
      });
    }
  }

  const dateStr = toIsoDate(date);
  for (const evt of events) {
    if (evt.date !== dateStr) continue;
    list.push({
      time: evt.time || '19:00',
      place: evt.location || 'Igreja Matriz',
      type: 'special',
      title: evt.title,
    });
  }

  return list.sort((a, b) => a.time.localeCompare(b.time));
}

export function getScheduleFooterSummary(rules: RecurringCelebrationRule[]): string {
  const labels: string[] = [];
  for (const rule of rules) {
    if (!labels.includes(rule.dayShortLabel)) {
      labels.push(rule.dayShortLabel);
    }
  }
  // Prefer Domingo first if present
  labels.sort((a, b) => {
    if (a === 'Dom') return -1;
    if (b === 'Dom') return 1;
    return 0;
  });
  if (labels.length === 0) return 'Ver programação';
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} e ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')} e ${labels[labels.length - 1]}`;
}

export function getRegularWeekdaysSet(rules: RecurringCelebrationRule[]): Set<number> {
  const set = new Set<number>();
  for (const rule of rules) {
    if (rule.dayOfWeek === null) {
      for (let d = 0; d < 7; d++) set.add(d);
    } else {
      set.add(rule.dayOfWeek);
    }
  }
  return set;
}

function compactDayLabel(label: string): string {
  const clean = stripAccents(label.toLowerCase());
  if (clean.includes('domingo')) return 'Dom';
  if (clean.includes('primeira sexta') || clean.includes('1a sexta')) return '1ª Sex';
  if (clean.includes('segunda')) return 'Seg';
  if (clean.includes('terca')) return 'Ter';
  if (clean.includes('quarta')) return 'Qua';
  if (clean.includes('quinta')) return 'Qui';
  if (clean.includes('sexta')) return 'Sex';
  if (clean.includes('sabado')) return 'Sáb';
  return label;
}

function formatBlockSummaryRow(row: { label: string; time?: string }, omitSundayPrefix = false): string {
  if (!row.time) return row.label;
  const shortDay = compactDayLabel(row.label);
  if (omitSundayPrefix && shortDay === 'Dom') {
    return row.time;
  }
  if (shortDay === 'Dom' && !row.time.includes(',') && !row.time.includes(' e ')) {
    return `Domingos às ${row.time}`;
  }
  return `${shortDay} ${row.time}`;
}

export function extractHeroScheduleSummary(
  address: string,
  serviceTimes: string,
): HeroScheduleSummary {
  const shortAddress =
    address.split(/[·\n]/)[0]?.trim() || 'Rua Elias Gannam, 331';

  const blocks = parseServiceTimesBlocks(serviceTimes);
  const firstBlock = blocks[0];
  const secondBlock = blocks[1];

  let primaryLabel = firstBlock?.heading || 'Missas na Matriz';
  if (stripAccents(primaryLabel.toLowerCase()) === 'igreja matriz') {
    primaryLabel = 'Missas na Matriz';
  }

  let primarySummary = '8h, 10h e 18h · Qua 19h30';
  if (firstBlock && firstBlock.rows.length > 0) {
    const sundayRows = firstBlock.rows.filter((r) =>
      stripAccents(r.label.toLowerCase()).includes('domingo'),
    );
    const otherRows = firstBlock.rows.filter(
      (r) => !stripAccents(r.label.toLowerCase()).includes('domingo'),
    );
    const prioritized = [...sundayRows, ...otherRows.slice(-1)].slice(0, 2);
    primarySummary = prioritized
      .map((row) => formatBlockSummaryRow(row, sundayRows.length > 0 && otherRows.length > 0))
      .join(' · ');
  }

  let secondaryLabel = secondBlock?.heading || 'Capela Maranata';
  let secondarySummary = 'Domingos às 11h30';

  if (secondBlock && secondBlock.rows.length > 0) {
    secondarySummary = secondBlock.rows
      .slice(0, 2)
      .map((row) => formatBlockSummaryRow(row, false))
      .join(' · ');
  } else if (firstBlock && firstBlock.rows.length > 2) {
    secondaryLabel = 'Outras celebrações';
    secondarySummary = firstBlock.rows
      .slice(0, -2)
      .slice(0, 2)
      .map((row) => formatBlockSummaryRow(row, false))
      .join(' · ');
  }

  return {
    addressLine: shortAddress,
    primaryLabel,
    primarySummary,
    secondaryLabel,
    secondarySummary,
  };
}
