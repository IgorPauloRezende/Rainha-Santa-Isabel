import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  X,
} from 'lucide-react';
import {
  checkHasCelebrationFromSettings,
  getCelebrationsForDateFromSettings,
  getRegularWeekdaysSet,
  getScheduleFooterSummary,
  parseRecurringCelebrations,
} from '../lib/serviceTimes';
import type { PublicEvent } from './PublicSite';

interface SchedulePopoverProps {
  isOpen: boolean;
  onClose: () => void;
  events: PublicEvent[];
  serviceTimes: string;
  onViewAllMasses: () => void;
}

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const WEEKDAY_NAMES = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function SchedulePopover({
  isOpen,
  onClose,
  events,
  serviceTimes,
  onViewAllMasses,
}: SchedulePopoverProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const recurringRules = useMemo(
    () => parseRecurringCelebrations(serviceTimes),
    [serviceTimes],
  );
  const regularWeekdays = useMemo(
    () => getRegularWeekdaysSet(recurringRules),
    [recurringRules],
  );
  const footerSummary = useMemo(
    () => getScheduleFooterSummary(recurringRules),
    [recurringRules],
  );

  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days: Array<{
      date: Date;
      dayNumber: number;
      isCurrentMonth: boolean;
      hasCelebration: boolean;
    }> = [];

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1, daysInPrevMonth - i);
      days.push({
        date: d,
        dayNumber: daysInPrevMonth - i,
        isCurrentMonth: false,
        hasCelebration: checkHasCelebrationFromSettings(d, recurringRules, events),
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(currentYear, currentMonth, i);
      days.push({
        date: d,
        dayNumber: i,
        isCurrentMonth: true,
        hasCelebration: checkHasCelebrationFromSettings(d, recurringRules, events),
      });
    }

    const remainingDays = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remainingDays; i++) {
      const d = new Date(currentYear, currentMonth + 1, i);
      days.push({
        date: d,
        dayNumber: i,
        isCurrentMonth: false,
        hasCelebration: checkHasCelebrationFromSettings(d, recurringRules, events),
      });
    }

    return days;
  }, [currentYear, currentMonth, recurringRules, events]);

  function handlePrevMonth() {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  }

  function handleNextMonth() {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  }

  function handleToday() {
    const today = new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
  }

  const selectedCelebrations = useMemo(() => {
    return getCelebrationsForDateFromSettings(selectedDate, recurringRules, events);
  }, [selectedDate, recurringRules, events]);

  const isTodaySelected = isSameDay(selectedDate, new Date());

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-label="Calendário de Horários e Missas"
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="schedule-calendar-popover fixed inset-x-3 top-[74px] sm:inset-x-auto sm:top-full sm:right-0 sm:absolute sm:mt-3 sm:w-[356px] rounded-2xl border shadow-2xl p-4 sm:p-5 text-left z-50 origin-top-right overflow-hidden"
        >
          {/* Header com Mês e Navegação */}
          <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.1]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#218838]/10 text-[#218838] dark:bg-[#30D158]/15 dark:text-[#30D158] flex items-center justify-center">
                <CalendarIcon className="w-3.5 h-3.5" />
              </div>
              <p className="text-[13.5px] font-semibold text-[#1D1D1F] dark:text-white capitalize">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleToday}
                className="px-2.5 py-1 rounded-lg text-[11.5px] font-medium text-[#218838] dark:text-[#30D158] hover:bg-[#218838]/10 transition-colors cursor-pointer"
                title="Ir para hoje"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="Mês anterior"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#1D1D1F] dark:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.1] transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="Próximo mês"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#1D1D1F] dark:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.1] transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar calendário"
                className="w-7 h-7 ml-1 rounded-lg flex items-center justify-center text-[#6E6E73] hover:text-[#1D1D1F] dark:text-[#8E8E93] dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.1] transition-colors cursor-pointer sm:hidden"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Dias da semana */}
          <div className="grid grid-cols-7 gap-1 pt-3 pb-1 text-center">
            {WEEKDAY_NAMES.map((day, idx) => (
              <span
                key={idx}
                className={`text-[11px] font-semibold ${
                  idx === 0
                    ? 'text-[#DC2626] dark:text-[#FF453A]'
                    : regularWeekdays.has(idx)
                      ? 'text-[#218838] dark:text-[#30D158]'
                      : 'text-[#86868B] dark:text-[#98989D]'
                }`}
              >
                {day}
              </span>
            ))}
          </div>

          {/* Grid de Dias do Mês */}
          <div className="grid grid-cols-7 gap-1 text-center py-1 tabular-nums">
            {calendarDays.map((item, idx) => {
              const isSelected = isSameDay(item.date, selectedDate);
              const isToday = isSameDay(item.date, new Date());

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedDate(item.date)}
                  className={`relative flex flex-col items-center justify-center h-8 rounded-xl text-[12px] font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'schedule-day-selected shadow-sm font-semibold'
                      : item.isCurrentMonth
                        ? 'text-inherit hover:bg-black/[0.05] dark:hover:bg-white/[0.1]'
                        : 'text-[#C7C7CC] dark:text-white/25 hover:bg-black/[0.02]'
                  } ${
                    isToday && !isSelected
                      ? 'ring-1 ring-[#218838] dark:ring-[#30D158] font-bold text-[#218838] dark:text-[#30D158]'
                      : ''
                  }`}
                >
                  <span>{item.dayNumber}</span>
                  {item.hasCelebration && (
                    <span
                      className={`absolute bottom-1 w-1 h-1 rounded-full ${
                        isSelected
                          ? 'bg-[#30D158]'
                          : item.date.getDay() === 0
                            ? 'bg-[#218838] dark:bg-[#30D158]'
                            : 'bg-[#6E6E73] dark:bg-[#A1A1A6]'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Detalhes do dia selecionado */}
          <div className="mt-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.1]">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[12.5px] font-semibold text-[#1D1D1F] dark:text-white tabular-nums">
                {formatDateLabel(selectedDate)}
              </span>
              {isTodaySelected && (
                <span className="text-[11px] font-semibold text-[#218838] dark:text-[#30D158]">
                  Hoje
                </span>
              )}
            </div>

            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {selectedCelebrations.length > 0 ? (
                selectedCelebrations.map((c, i) => (
                  <div
                    key={i}
                    className="schedule-celebration-card flex items-start gap-2.5 p-2.5 rounded-xl text-[12px]"
                  >
                    <div className="schedule-time-badge px-2 py-0.5 rounded-md text-[11px] font-mono-tabular font-medium shrink-0 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{c.time}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-inherit leading-tight truncate">
                        {c.title}
                      </p>
                      <p className="text-[11px] text-[#6E6E73] dark:text-[#98989D] flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span>{c.place}</span>
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="schedule-celebration-card py-2.5 px-3 rounded-xl text-center">
                  <p className="text-[12px] text-[#6E6E73] dark:text-[#98989D] leading-relaxed">
                    Sem celebrações comunitárias regulares neste dia. Igreja aberta para oração e
                    secretaria.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Rodapé */}
          <div className="mt-3 pt-2.5 border-t border-black/[0.06] dark:border-white/[0.1] flex items-center justify-between gap-2 text-[11.5px]">
            <span className="text-[#6E6E73] dark:text-[#98989D] truncate">
              {footerSummary}
            </span>
            <button
              type="button"
              onClick={() => {
                onClose();
                onViewAllMasses();
                document.getElementById('missas')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="font-semibold text-[#218838] dark:text-[#30D158] hover:underline shrink-0 cursor-pointer"
            >
              Ver tabela completa &rarr;
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function formatDateLabel(date: Date): string {
  const weekdayNames = [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
  ];
  return `${weekdayNames[date.getDay()]}, ${date.getDate()} de ${MONTH_NAMES[date.getMonth()]}`;
}
