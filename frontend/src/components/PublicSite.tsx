import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  ArrowUp,
  Bell,
  BellRing,
  BookOpen,
  Calendar,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Heart,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Mic2,
  Phone,
  Play,
  User,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { TubelightNavLinks } from '../../components/ui/tubelight-navbar';
import instagramIcon from '../assets/images/instagram.svg';
import whatsappIcon from '../assets/images/whatsapp.svg';
import { formatDatePt, formatDateTimePt } from '../lib/format';
import {
  buildWhatsappUrl,
  DEFAULT_SERVICE_TIMES,
  extractHeroScheduleSummary,
  normalizeTelHref,
  parseServiceTimesBlocks,
} from '../lib/serviceTimes';
import type {
  ChurchEvent,
  ChurchFolder,
  ChurchNotification,
  ChurchSettings,
  PublicChurchFile,
  SafeParishioner,
  Sermon,
} from '../types/church';
import { GlassSurface } from './GlassSurface';
import { HandsDotMatrixHero } from './HandsDotMatrixHero';
import { MediaFrame } from './MediaFrame';
import { ParishEmblem } from './ParishEmblem';
import { SchedulePopover } from './SchedulePopover';

export interface PublicEvent extends Omit<ChurchEvent, 'rsvps'> {
  rsvpCount: number;
}

export interface PublicOverviewData {
  settings: ChurchSettings;
  events: PublicEvent[];
  sermons: Sermon[];
  activeBanner: ChurchNotification | null;
  recentNotifications: ChurchNotification[];
  folders?: ChurchFolder[];
  files?: PublicChurchFile[];
  stats: {
    activeMembersCount: number;
    subscriberCount: number;
  };
}

interface PublicSiteProps {
  data: PublicOverviewData;
  parishioner: SafeParishioner | null;
  onOpenAdmin: () => void;
  onOpenAccount: (mode?: 'register' | 'login') => void;
  onLogoutParishioner: () => Promise<void>;
  onRefresh: () => Promise<void>;
}

type TabKey = 'quemsomos' | 'comunidade' | 'brasao' | 'padroeira' | 'decanato';

function InstagramIcon({ className = 'h-4 w-4 shrink-0' }: { className?: string }) {
  return (
    <img
      src={instagramIcon}
      alt=""
      aria-hidden="true"
      className={`${className} dark:brightness-0 dark:invert`}
    />
  );
}

function WhatsAppIcon() {
  return (
    <img
      src={whatsappIcon}
      alt=""
      aria-hidden="true"
      className="h-4 w-4 shrink-0"
    />
  );
}

const TAB_DATA: Record<TabKey, { title: string; text: string }> = {
  quemsomos: {
    title: 'Paróquia Rainha Santa Isabel',
    text: 'Criada em 2 de outubro de 1967, a Paróquia Rainha Santa Isabel está localizada na Vila Bandeirantes, na região da Casa Verde, em São Paulo.',
  },
  comunidade: {
    title: 'Uma comunidade de fé',
    text: 'Integrante da Arquidiocese de São Paulo, nossa paróquia reúne famílias, crianças, jovens e idosos em torno da Eucaristia, dos sacramentos, da catequese e da vida pastoral na Casa Verde.',
  },
  brasao: {
    title: 'Identidade paroquial',
    text: 'O brasão oficial identifica a Paróquia Rainha Santa Isabel desde a sua fundação, em 1967, expressando a fé e a tradição católica da comunidade na Casa Verde.',
  },
  padroeira: {
    title: 'Nossa padroeira',
    text: 'A paróquia é dedicada a Rainha Santa Isabel de Portugal (1271–1336), celebrada pela Igreja em 4 de julho como modelo de oração, reconciliação e caridade junto aos mais necessitados.',
  },
  decanato: {
    title: 'Arquidiocese de São Paulo',
    text: 'A Paróquia Rainha Santa Isabel integra o Decanato São Judas Tadeu, na Região Episcopal Santana da Arquidiocese de São Paulo.',
  },
};

const CATECHESIS_PROGRAMS = [
  {
    id: 'pre-catequese',
    title: 'Pré-Catequese',
    audience: 'A partir de 5 anos',
    schedule: 'Sábados, das 14h às 15h30',
  },
  {
    id: 'catequese-infantil',
    title: 'Catequese infantil',
    audience: 'A partir de 8 anos',
    schedule: 'Sábados, das 14h às 15h30',
  },
  {
    id: 'catequese-familiar',
    title: 'Catequese familiar',
    audience: 'Crianças a partir de 8 anos, acompanhadas por um responsável',
    schedule: 'Quartas-feiras, das 20h às 21h30',
  },
  {
    id: 'perseveranca',
    title: 'Perseverança',
    audience: 'Até 11 anos, para quem já fez a Primeira Eucaristia',
    schedule: 'Sábados, das 14h às 15h30',
  },
  {
    id: 'crisma',
    title: 'Crisma',
    audience: 'Adolescentes a partir de 12 anos',
    schedule: 'Domingos, das 8h às 9h40',
  },
  {
    id: 'catequese-adultos',
    title: 'Catequese de adultos',
    audience: 'A partir de 18 anos; preparação para Batismo, Eucaristia e Crisma',
    schedule: 'Domingos, quinzenalmente, das 8h às 9h40',
  },
];

const NAV_ITEMS = [
  { name: 'Paróquia', url: '#a-paroquia' },
  { name: 'Catequese', url: '#catequese' },
  { name: 'Pastorais', url: '#pastorais' },
  { name: 'Juventude', url: '#juventude' },
  { name: 'Secretaria', url: '#secretaria' },
];

export function PublicSite({
  data,
  parishioner,
  onOpenAdmin,
  onOpenAccount,
  onLogoutParishioner,
  onRefresh,
}: PublicSiteProps) {
  const {
    settings,
    events,
    sermons,
    activeBanner,
    recentNotifications,
  } = data;
  const serviceTimes = settings.serviceTimes.trim() || DEFAULT_SERVICE_TIMES;
  const contactPhone = settings.contactPhone?.trim() || '(11) 3857-5051';
  const telHref = normalizeTelHref(contactPhone);
  const officeHoursWeekdays = settings.officeHoursWeekdays?.trim() || '8h às 18h';
  const officeHoursWeekdaysNote =
    settings.officeHoursWeekdaysNote !== undefined
      ? settings.officeHoursWeekdaysNote.trim()
      : 'fechada durante o almoço';
  const officeHoursSaturday = settings.officeHoursSaturday?.trim() || '9h às 12h';
  const whatsappUrl = buildWhatsappUrl(settings.whatsappNumber);
  const heroSummary = extractHeroScheduleSummary(settings.address, serviceTimes);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeNav, setActiveNav] = useState<string>('#a-paroquia');
  const navLockUntilRef = useRef<number>(0);
  const [activeTab, setActiveTab] = useState<TabKey>('quemsomos');
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Notification Badge state
  const [notifPopoverOpen, setNotifPopoverOpen] = useState(false);
  const [badgeDismissed, setBadgeDismissed] = useState(false);
  const notifRef = useRef<HTMLDivElement | null>(null);

  // Profile Popover state
  const [profilePopoverOpen, setProfilePopoverOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);

  // Schedule Popover state
  const [schedulePopoverOpen, setSchedulePopoverOpen] = useState(false);
  const scheduleRef = useRef<HTMLDivElement | null>(null);
  const [savedProfile, setSavedProfile] = useState<{ name: string; email?: string } | null>(() => {
    try {
      const raw = localStorage.getItem('paroquia_member_profile');
      return raw ? (JSON.parse(raw) as { name: string; email?: string }) : null;
    } catch {
      return null;
    }
  });

  const notificationCount = recentNotifications.length;
  const displayBadgeCount = notificationCount > 0 ? notificationCount : 1;
  const badgeOpen = !badgeDismissed && notificationCount > 0;

  // Modals
  const [inscriptionModalOpen, setInscriptionModalOpen] = useState(false);
  const [pastoralModalOpen, setPastoralModalOpen] = useState(false);
  const [rsvpEvent, setRsvpEvent] = useState<PublicEvent | null>(null);
  const [activeSermon, setActiveSermon] = useState<Sermon | null>(null);

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Event RSVP Form (when admin publishes events)
  const [rsvpName, setRsvpName] = useState('');
  const [rsvpEmail, setRsvpEmail] = useState('');
  const [rsvpPhone, setRsvpPhone] = useState('');
  const [rsvpGuests, setRsvpGuests] = useState(1);
  const [rsvpSubmitting, setRsvpSubmitting] = useState(false);
  const [rsvpFeedback, setRsvpFeedback] = useState<string>('');
  const [rsvpError, setRsvpError] = useState<string>('');

  // Notificar Subscription Form
  const [subName, setSubName] = useState('');
  const [subEmail, setSubEmail] = useState('');
  const [subPhone, setSubPhone] = useState('');
  const [subTopics, setSubTopics] = useState<string[]>(['missas', 'catequese', 'avisos']);
  const [subLoading, setSubLoading] = useState(false);
  const [subFeedback, setSubFeedback] = useState('');
  const [subError, setSubError] = useState('');

  // Prayer Request / Pastoral Contact Form
  const [prayName, setPrayName] = useState('');
  const [prayEmail, setPrayEmail] = useState('');
  const [prayPhone, setPrayPhone] = useState('');
  const [prayType, setPrayType] = useState<'Oração' | 'Visita'>('Oração');
  const [prayMessage, setPrayMessage] = useState('');
  const [prayLoading, setPrayLoading] = useState(false);
  const [prayFeedback, setPrayFeedback] = useState('');
  const [prayError, setPrayError] = useState('');

  useEffect(() => {
    if (parishioner) {
      setRsvpName((prev) => prev || parishioner.fullName);
      setRsvpEmail((prev) => prev || parishioner.email);
      setRsvpPhone((prev) => prev || parishioner.phone || '');
      setSubName((prev) => prev || parishioner.fullName);
      setSubEmail((prev) => prev || parishioner.email);
      setSubPhone((prev) => prev || parishioner.phone || '');
      setPrayName((prev) => prev || parishioner.fullName);
      setPrayEmail((prev) => prev || parishioner.email);
      setPrayPhone((prev) => prev || parishioner.phone || '');
    }
  }, [parishioner]);

  function handleNavSelect(url: string) {
    setActiveNav(url);
    navLockUntilRef.current = Date.now() + 700;
  }

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      setScrolled(y > 24);
      setShowScrollTop(y > 450);

      if (Date.now() < navLockUntilRef.current) return;

      const anchorY = y + 160;
      let matched = NAV_ITEMS[0].url;
      for (const item of NAV_ITEMS) {
        const el = document.getElementById(item.url.slice(1));
        if (el && el.offsetTop <= anchorY) {
          matched = item.url;
        }
      }
      setActiveNav((prev) => (prev === matched ? prev : matched));
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setInscriptionModalOpen(false);
        setPastoralModalOpen(false);
        setRsvpEvent(null);
        setActiveSermon(null);
        setNotifPopoverOpen(false);
        setProfilePopoverOpen(false);
        setSchedulePopoverOpen(false);
      }
    }
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (notifRef.current && !notifRef.current.contains(target)) {
        setNotifPopoverOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfilePopoverOpen(false);
      }
      if (scheduleRef.current && !scheduleRef.current.contains(target)) {
        setSchedulePopoverOpen(false);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  function openInscriptionModal() {
    setInscriptionModalOpen(true);
  }

  function copyAddress(text: string, id: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  async function handleRsvpSubmit(e: FormEvent) {
    e.preventDefault();
    if (!rsvpEvent) return;
    setRsvpSubmitting(true);
    setRsvpFeedback('');
    setRsvpError('');
    try {
      const res = await fetch('/api/public/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: rsvpEvent.id,
          name: rsvpName,
          email: rsvpEmail,
          phone: rsvpPhone,
          guests: rsvpGuests,
        }),
      });
      const json = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) throw new Error(json.error || 'Não foi possível confirmar sua presença.');
      setRsvpFeedback(json.message || 'Presença confirmada com sucesso!');
      setRsvpName(parishioner?.fullName || '');
      setRsvpEmail(parishioner?.email || '');
      setRsvpPhone(parishioner?.phone || '');
      setRsvpGuests(1);
      await onRefresh();
    } catch (err) {
      setRsvpError(
        err instanceof Error
          ? err.message
          : 'Não foi possível enviar agora. Tente novamente ou ligue para a secretaria.'
      );
    } finally {
      setRsvpSubmitting(false);
    }
  }

  function toggleTopic(topic: string) {
    setSubTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  }

  async function handleSubscribe(e: FormEvent) {
    e.preventDefault();
    setSubLoading(true);
    setSubFeedback('');
    setSubError('');
    try {
      const res = await fetch('/api/public/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: subName,
          email: subEmail,
          phone: subPhone,
          pushEnabled: false,
          topics: subTopics,
        }),
      });
      const json = (await res.json()) as { error?: string; updated?: boolean };
      if (!res.ok) throw new Error(json.error || 'Não foi possível concluir o cadastro.');
      setSubFeedback(
        json.updated
          ? 'Seus dados e preferências de avisos foram atualizados.'
          : 'Cadastro realizado! Você passará a receber os avisos paroquiais nos assuntos escolhidos.'
      );
      if (subName.trim()) {
        const nextProfile = { name: subName.trim(), email: subEmail.trim() || undefined };
        setSavedProfile(nextProfile);
        try {
          localStorage.setItem('paroquia_member_profile', JSON.stringify(nextProfile));
        } catch {
          // ignore storage errors
        }
      }
      setSubName(parishioner?.fullName || '');
      setSubEmail(parishioner?.email || '');
      setSubPhone(parishioner?.phone || '');
      await onRefresh();
    } catch (err) {
      setSubError(
        err instanceof Error
          ? err.message
          : 'Não foi possível concluir o cadastro agora. Tente novamente em instantes.'
      );
    } finally {
      setSubLoading(false);
    }
  }

  async function handlePrayerSubmit(e: FormEvent) {
    e.preventDefault();
    setPrayLoading(true);
    setPrayFeedback('');
    setPrayError('');
    try {
      const res = await fetch('/api/public/prayer-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: prayName,
          email: prayEmail,
          phone: prayPhone,
          requestType: prayType,
          message: prayMessage,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || 'Não foi possível registrar seu pedido.');
      setPrayFeedback(
        prayType === 'Visita'
          ? 'Solicitação de visita recebida! A equipe pastoral ou a secretaria entrará em contato.'
          : 'Pedido de oração recebido! A comunidade estará unida em oração pela sua intenção.'
      );
      setPrayName(parishioner?.fullName || '');
      setPrayEmail(parishioner?.email || '');
      setPrayPhone(parishioner?.phone || '');
      setPrayMessage('');
    } catch (err) {
      setPrayError(
        err instanceof Error
          ? err.message
          : 'Não foi possível enviar seu pedido agora. Tente novamente ou ligue para a secretaria.'
      );
    } finally {
      setPrayLoading(false);
    }
  }

  const currentTab = TAB_DATA[activeTab];
  const serviceBlocks = parseServiceTimesBlocks(serviceTimes);

  return (
    <div className="public-site-background min-h-screen bg-white text-[#1D1D1F]">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:px-4 focus:py-2.5 focus:rounded-xl focus:bg-[#1D1D1F] focus:text-white focus:text-[13px] focus:font-medium focus:shadow-lg"
      >
        Pular para o conteúdo
      </a>

      {/* Floating Glass Top Bar */}
      <header className="fixed top-2.5 sm:top-4 left-0 right-0 z-50 w-full px-3 sm:px-6 max-w-[1160px] mx-auto">
        <GlassSurface
          width="100%"
          height={scrolled ? 56 : 60}
          borderRadius={20}
          distortionScale={-120}
          displace={0.45}
          backgroundOpacity={scrolled ? 0.86 : 0.76}
          saturation={1.25}
          className="px-3 sm:px-5 border border-black/[0.08] bg-white/80 text-[#1D1D1F]"
        >
          <div className="w-full flex items-center justify-between gap-2 sm:gap-4 min-w-0">
            <a href="#inicio" className="flex items-center gap-2.5 min-w-0 flex-1 lg:flex-initial min-h-[44px]">
              <div className="w-8 h-8 shrink-0">
                <ParishEmblem alt="Brasão Paróquia Rainha Santa Isabel" className="w-full h-full object-contain" />
              </div>
              <span className="text-[13.5px] sm:text-[14px] font-semibold tracking-tight text-[#1D1D1F] truncate whitespace-nowrap">
                {settings.churchName || 'Paróquia Rainha Santa Isabel'}
              </span>
            </a>

            <TubelightNavLinks
              items={NAV_ITEMS}
              activeUrl={activeNav}
              onSelect={handleNavSelect}
            />

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Profile Icon */}
              <div ref={profileRef} className="relative">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  aria-label="Área do Paroquiano e perfil"
                  aria-expanded={profilePopoverOpen}
                  onClick={() => {
                    setProfilePopoverOpen((prev) => !prev);
                    setNotifPopoverOpen(false);
                    setSchedulePopoverOpen(false);
                  }}
                  className={`relative inline-flex items-center justify-center h-9 w-9 rounded-xl transition-colors cursor-pointer ${
                    parishioner
                      ? 'bg-[#1D1D1F] text-white hover:bg-black'
                      : 'bg-black/[0.05] hover:bg-black/[0.09] text-[#1D1D1F]'
                  }`}
                >
                  {parishioner ? (
                    <span className="text-[12px] font-semibold">
                      {parishioner.fullName.trim().charAt(0).toUpperCase()}
                    </span>
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </motion.button>

                <AnimatePresence>
                  {profilePopoverOpen && (
                    <motion.div
                      role="dialog"
                      aria-label="Área do Paroquiano"
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                      className="fixed inset-x-3 top-[74px] sm:inset-x-auto sm:top-full sm:right-0 sm:absolute sm:mt-3 sm:w-[310px] rounded-2xl bg-white border border-black/[0.08] shadow-xl p-4 text-left z-50 origin-top-right"
                    >
                      <div className="flex items-center gap-3 pb-3.5 border-b border-black/[0.06]">
                        <div className="w-10 h-10 rounded-xl bg-[#1D1D1F] text-white flex items-center justify-center shrink-0 text-[13px] font-semibold">
                          {parishioner ? (
                            parishioner.fullName.trim().charAt(0).toUpperCase()
                          ) : savedProfile?.name ? (
                            savedProfile.name.trim().charAt(0).toUpperCase()
                          ) : (
                            <User className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-[#1D1D1F] truncate">
                            {parishioner?.fullName || savedProfile?.name || 'Área do Paroquiano'}
                          </p>
                          <p className="text-[12px] text-[#6E6E73] truncate">
                            {parishioner?.email || savedProfile?.email || 'Paróquia Rainha Santa Isabel'}
                          </p>
                        </div>
                      </div>

                      {!parishioner ? (
                        <div className="my-3 rounded-xl bg-[#F5F5F7] p-3.5 border border-black/[0.05]">
                          <p className="text-[13px] font-semibold text-[#1D1D1F]">
                            Crie sua conta de paroquiano
                          </p>
                          <p className="mt-1 text-[12px] text-[#6E6E73] leading-relaxed">
                            Salve seus dados de contato e acompanhe sua participação na comunidade.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setProfilePopoverOpen(false);
                              onOpenAccount('register');
                            }}
                            className="mt-3 w-full min-h-[38px] px-4 rounded-xl bg-[#218838] hover:bg-[#196C2E] text-white text-[12.5px] font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Criar conta ou Entrar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setProfilePopoverOpen(false);
                              onOpenAccount('login');
                            }}
                            className="mt-2 w-full text-center text-[12px] font-medium text-[#218838] hover:underline py-0.5 cursor-pointer"
                          >
                            Já tenho conta · Fazer login
                          </button>
                        </div>
                      ) : (
                        <div className="my-2.5 flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#218838]/[0.08]">
                          <span className="text-[12px] font-medium text-[#218838] truncate">
                            Vínculo: {parishioner.pastoral}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setProfilePopoverOpen(false);
                              onOpenAccount('register');
                            }}
                            className="text-[12px] font-semibold text-[#218838] hover:underline shrink-0 cursor-pointer"
                          >
                            Minha conta
                          </button>
                        </div>
                      )}

                      <div className="py-1 space-y-0.5">
                        <a
                          href="#missas"
                          onClick={() => {
                            handleNavSelect('#missas');
                            setProfilePopoverOpen(false);
                          }}
                          className="flex items-center justify-between px-3 min-h-[38px] rounded-xl text-[13px] font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors"
                        >
                          <span>Horários das Missas</span>
                          <Calendar className="w-3.5 h-3.5 text-[#6E6E73]" />
                        </a>
                        <a
                          href="#notificar"
                          onClick={() => setProfilePopoverOpen(false)}
                          className="flex items-center justify-between px-3 min-h-[38px] rounded-xl text-[13px] font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors"
                        >
                          <span>Avisos &amp; Oração</span>
                          <BellRing className="w-3.5 h-3.5 text-[#6E6E73]" />
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            setProfilePopoverOpen(false);
                            openInscriptionModal();
                          }}
                          className="w-full flex items-center justify-between px-3 min-h-[38px] rounded-xl text-[13px] font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors cursor-pointer"
                        >
                          <span>Informações sobre Catequese</span>
                          <BookOpen className="w-3.5 h-3.5 text-[#6E6E73]" />
                        </button>
                      </div>

                      <div className="pt-2 border-t border-black/[0.06] space-y-1.5">
                        {parishioner && (
                          <button
                            type="button"
                            onClick={async () => {
                              setProfilePopoverOpen(false);
                              await onLogoutParishioner();
                            }}
                            className="w-full flex items-center justify-between px-3 min-h-[38px] rounded-xl text-[13px] font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <span>Sair da conta</span>
                            <LogOut className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setProfilePopoverOpen(false);
                            onOpenAdmin();
                          }}
                          className="w-full flex items-center justify-between px-3 min-h-[40px] rounded-xl bg-[#F5F5F7] hover:bg-neutral-200 text-[13px] font-medium text-[#1D1D1F] transition-colors cursor-pointer"
                        >
                          <span>Acessar Painel Pastoral</span>
                          <Lock className="w-3.5 h-3.5 text-[#218838]" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Notification Bell Trigger */}
              <div ref={notifRef} className="relative">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  aria-label="Avisos e notificações da paróquia"
                  aria-expanded={notifPopoverOpen}
                  onClick={() => {
                    setNotifPopoverOpen((prev) => !prev);
                    setProfilePopoverOpen(false);
                    setSchedulePopoverOpen(false);
                  }}
                  className="relative inline-flex items-center justify-center h-9 w-9 rounded-xl bg-black/[0.05] hover:bg-black/[0.09] text-[#1D1D1F] transition-colors cursor-pointer"
                >
                  <Bell className="w-4 h-4" />
                  <span className="t-badge" data-open={badgeOpen ? 'true' : 'false'}>
                    <span className="t-badge-dot">{displayBadgeCount}</span>
                  </span>
                </motion.button>

                <AnimatePresence>
                  {notifPopoverOpen && (
                    <motion.div
                      role="dialog"
                      aria-label="Central de Avisos"
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                      className="fixed inset-x-3 top-[74px] sm:inset-x-auto sm:top-full sm:right-0 sm:absolute sm:mt-3 sm:w-[320px] rounded-2xl bg-white border border-black/[0.08] shadow-xl p-5 text-left z-50 origin-top-right"
                    >
                      <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
                        <span className="text-[13px] font-semibold text-[#1D1D1F]">
                          Avisos da Paróquia
                        </span>
                        {notificationCount > 0 &&
                          (badgeOpen ? (
                            <button
                              type="button"
                              onClick={() => setBadgeDismissed(true)}
                              className="text-[12px] font-medium text-[#218838] hover:underline cursor-pointer"
                            >
                              Ocultar contador
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setBadgeDismissed(false)}
                              className="text-[12px] font-medium text-[#6E6E73] hover:text-[#1D1D1F] cursor-pointer"
                            >
                              Mostrar contador
                            </button>
                          ))}
                      </div>

                      <div className="py-3 space-y-2.5 max-h-60 overflow-y-auto">
                        {recentNotifications.length > 0 ? (
                          recentNotifications.slice(0, 3).map((item) => (
                            <div
                              key={item.id}
                              className="rounded-xl bg-[#F5F5F7] p-3 text-[12px] text-[#424245]"
                            >
                              <div className="flex items-baseline justify-between gap-2">
                                <p className="font-semibold text-[#1D1D1F]">{item.title}</p>
                                <span className="text-[10.5px] text-[#6E6E73] shrink-0 tabular-nums">
                                  {formatDateTimePt(item.createdAt)}
                                </span>
                              </div>
                              <p className="mt-0.5 leading-relaxed">{item.message}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-[13px] text-[#6E6E73] leading-relaxed">
                            Nenhum aviso publicado no momento.
                          </p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-black/[0.06] flex items-center justify-between gap-2">
                        <a
                          href="#notificar"
                          onClick={() => setNotifPopoverOpen(false)}
                          className="text-[12px] font-medium text-[#218838] hover:underline py-1"
                        >
                          Cadastrar interesse em avisos
                        </a>
                        <a
                          href="#missas"
                          onClick={() => {
                            handleNavSelect('#missas');
                            setNotifPopoverOpen(false);
                          }}
                          className="text-[12px] font-medium text-[#1D1D1F] hover:underline py-1"
                        >
                          Ver Missas
                        </a>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Schedule / Calendário Popover Trigger */}
              <div ref={scheduleRef} className="relative">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  aria-label="Ver horários e calendário das missas"
                  aria-expanded={schedulePopoverOpen}
                  onClick={() => {
                    setSchedulePopoverOpen((prev) => !prev);
                    setNotifPopoverOpen(false);
                    setProfilePopoverOpen(false);
                  }}
                  className={`nav-schedule-link inline-flex items-center justify-center gap-1.5 h-9 px-2.5 sm:px-3.5 rounded-xl text-[12px] font-medium transition-all whitespace-nowrap cursor-pointer shadow-sm ${
                    schedulePopoverOpen ? 'ring-2 ring-[#218838]' : ''
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Calendário</span>
                </motion.button>

                <SchedulePopover
                  isOpen={schedulePopoverOpen}
                  onClose={() => setSchedulePopoverOpen(false)}
                  events={events}
                  serviceTimes={serviceTimes}
                  onViewAllMasses={() => handleNavSelect('#missas')}
                />
              </div>

              <button
                type="button"
                onClick={onOpenAdmin}
                className="hidden md:inline-flex items-center gap-1.5 px-3 min-h-[36px] rounded-xl bg-black/[0.05] hover:bg-black/[0.09] text-[#1D1D1F] text-[12px] font-medium transition-colors whitespace-nowrap cursor-pointer"
                title="Painel Administrativo"
              >
                <Lock className="w-3 h-3 text-[#6E6E73]" />
                <span>Painel</span>
              </button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                aria-label="Abrir menu"
                aria-expanded={mobileMenuOpen}
                onClick={() => {
                  setNotifPopoverOpen(false);
                  setProfilePopoverOpen(false);
                  setSchedulePopoverOpen(false);
                  setMobileMenuOpen(true);
                }}
                className="lg:hidden inline-flex items-center justify-center h-9 w-9 rounded-xl bg-black/[0.05] hover:bg-black/[0.09] text-[#1D1D1F] transition-colors cursor-pointer"
              >
                <Menu className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </GlassSurface>
      </header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Menu de Navegação"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-black/35 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ x: '100%', opacity: 0.7 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.7 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-y-2.5 right-2.5 w-[calc(100%-1.25rem)] max-w-sm p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] rounded-2xl bg-white/95 backdrop-blur-xl border border-black/[0.08] shadow-2xl flex flex-col justify-between overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-black/[0.06]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 shrink-0">
                      <ParishEmblem alt="Logo Paróquia" className="w-full h-full object-contain" />
                    </div>
                    <span className="text-[14px] font-semibold text-[#1D1D1F] truncate">
                      Paróquia Rainha Santa Isabel
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label="Fechar menu"
                    onClick={() => setMobileMenuOpen(false)}
                    className="h-9 w-9 rounded-xl bg-[#F5F5F7] text-[#1D1D1F] flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="pt-4 pb-1 px-3 text-[12px] font-medium text-[#6E6E73]">
                  Seções do site
                </p>
                <div className="py-1 flex flex-col gap-0.5">
                  {[
                    { href: '#inicio', label: 'Início' },
                    { href: '#missas', label: 'Horários das Missas' },
                    { href: '#a-paroquia', label: 'Conheça Nossa Paróquia' },
                    { href: '#catequese', label: 'Catequese e Formação' },
                    { href: '#pastorais', label: 'Pastorais' },
                    { href: '#juventude', label: 'Juventude' },
                    { href: '#secretaria', label: 'Secretaria Paroquial' },
                    { href: '#como-chegar', label: 'Como Chegar' },
                    { href: '#notificar', label: 'Notificar & Oração' },
                  ].map((item) => {
                    const isActive = activeNav === item.href;
                    return (
                      <a
                        key={item.href}
                        href={item.href}
                        onClick={(e) => {
                          if (item.href === '#missas') {
                            e.preventDefault();
                            setMobileMenuOpen(false);
                            setSchedulePopoverOpen(true);
                            return;
                          }
                          if (NAV_ITEMS.some((n) => n.url === item.href)) {
                            handleNavSelect(item.href);
                          }
                          setMobileMenuOpen(false);
                        }}
                        className={`px-3 min-h-[44px] flex items-center justify-between rounded-xl text-[15px] font-medium transition-colors ${
                          isActive
                            ? 'bg-black/[0.06] text-[#1D1D1F] font-semibold'
                            : 'text-[#424245] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]'
                        }`}
                      >
                        <span>{item.label}</span>
                        <ArrowRight className={`w-3.5 h-3.5 ${isActive ? 'text-[#218838]' : 'text-[#86868B]'}`} />
                      </a>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2.5 pt-4 mt-4 border-t border-black/[0.06]">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAccount(parishioner ? 'login' : 'register');
                  }}
                  className="w-full min-h-[44px] px-4 rounded-xl bg-[#1D1D1F] text-white text-[14px] font-medium inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{parishioner ? 'Minha Área do Paroquiano' : 'Criar Conta / Entrar'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAdmin();
                  }}
                  className="w-full min-h-[44px] px-4 rounded-xl bg-[#F5F5F7] text-[#1D1D1F] text-[14px] font-medium inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5 text-[#6E6E73]" />
                  <span>Acessar Painel Pastoral</span>
                </button>
                <a
                  href={telHref}
                  className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 rounded-xl bg-[#218838] text-white text-[14px] font-medium tabular-nums"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Ligar ({contactPhone})</span>
                </a>
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 rounded-xl bg-[#25D366] text-[#123B25] text-[14px] font-medium"
                  >
                    <WhatsAppIcon />
                    <span>WhatsApp da Secretaria</span>
                  </a>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Notification Banner (from Backend Notificar) */}
      {activeBanner && !bannerDismissed && (
        <div className="pt-20 px-4 max-w-[1120px] mx-auto">
          <div className="rounded-xl bg-[#F5F5F7] border border-black/[0.08] px-4 py-2.5 flex items-center justify-between gap-3 text-[13px]">
            <div className="flex items-center gap-2.5 min-w-0">
              <Bell className="w-4 h-4 text-[#218838] shrink-0" />
              <p className="truncate text-[#1D1D1F]">
                <span className="font-semibold">{activeBanner.title}</span> — {activeBanner.message}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {activeBanner.linkLabel && (
                <a
                  href={`#${activeBanner.linkSection || 'missas'}`}
                  className="text-[#218838] font-medium hover:underline"
                >
                  {activeBanner.linkLabel}
                </a>
              )}
              <button
                type="button"
                onClick={() => setBannerDismissed(true)}
                aria-label="Dispensar aviso"
                className="text-[#6E6E73] hover:text-[#1D1D1F] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <main id="conteudo">
        {/* Hero */}
        <section
          id="inicio"
          className={`min-h-[86vh] flex flex-col justify-between ${
            activeBanner && !bannerDismissed ? 'pt-8 sm:pt-12' : 'pt-28 sm:pt-36'
          } pb-8 sm:pb-12 px-4 sm:px-6 relative isolate`}
        >
          <HandsDotMatrixHero />
          <div className="hero-enter relative z-30 text-center max-w-3xl mx-auto my-auto py-8 sm:py-12">
            <p className="text-[13px] sm:text-[14px] font-medium text-[#6E6E73] mb-3 sm:mb-4 tabular-nums">
              Casa Verde · Arquidiocese de São Paulo · Fundada em 1967
            </p>

            <h1 className="font-display hero-title font-semibold tracking-[-0.03em] leading-[1.06] text-[#1D1D1F]">
              {settings.heroTitle || 'Paróquia Rainha Santa Isabel'}
            </h1>

            <p className="hero-subtitle mt-3 sm:mt-4 font-normal tracking-[-0.01em] text-[#424245]">
              {settings.heroSubtitle || '“Uma comunidade de fé, oração e acolhimento.”'}
            </p>

            <div className="mt-7 sm:mt-8 flex items-center justify-center">
              <a
                href="#a-paroquia"
                className="min-h-[46px] inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-black/[0.12] bg-white/90 text-[#1D1D1F] text-[14.5px] font-medium hover:bg-[#F5F5F7] transition-colors"
              >
                <span>Conhecer a paróquia</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </a>
            </div>
          </div>

          {/* Grounded 4-column parish info strip */}
          <div className="relative z-30 max-w-[1120px] w-full mx-auto pt-4">
            <div className="rounded-2xl bg-white/85 backdrop-blur-md border border-black/[0.08] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-black/[0.08]">
              <a href="#como-chegar" className="hero-info-item p-4 sm:px-5 sm:py-4 hover:bg-[#F5F5F7]/70 transition-colors rounded-t-2xl sm:rounded-l-2xl sm:rounded-tr-none">
                <p className="hero-info-label text-[12px] font-medium text-[#6E6E73] transition-colors">Igreja Matriz</p>
                <p className="hero-info-value text-[14px] font-semibold text-[#1D1D1F] mt-0.5 tabular-nums transition-colors">
                  {heroSummary.addressLine}
                </p>
              </a>
              <a href="#missas" className="hero-info-item p-4 sm:px-5 sm:py-4 hover:bg-[#F5F5F7]/70 transition-colors">
                <p className="hero-info-label text-[12px] font-medium text-[#6E6E73] transition-colors">{heroSummary.primaryLabel}</p>
                <p className="hero-info-value text-[14px] font-semibold text-[#1D1D1F] mt-0.5 tabular-nums transition-colors">
                  {heroSummary.primarySummary}
                </p>
              </a>
              <a href="#missas" className="hero-info-item p-4 sm:px-5 sm:py-4 hover:bg-[#F5F5F7]/70 transition-colors">
                <p className="hero-info-label text-[12px] font-medium text-[#6E6E73] transition-colors">{heroSummary.secondaryLabel}</p>
                <p className="hero-info-value text-[14px] font-semibold text-[#1D1D1F] mt-0.5 tabular-nums transition-colors">
                  {heroSummary.secondarySummary}
                </p>
              </a>
              <a href={telHref} className="hero-info-item p-4 sm:px-5 sm:py-4 hover:bg-[#F5F5F7]/70 transition-colors rounded-b-2xl sm:rounded-r-2xl sm:rounded-bl-none">
                <p className="hero-info-label text-[12px] font-medium text-[#6E6E73] transition-colors">Secretaria Paroquial</p>
                <p className="hero-info-phone text-[14px] font-semibold text-[#218838] mt-0.5 tabular-nums transition-colors">
                  {contactPhone}
                </p>
              </a>
            </div>
          </div>
        </section>

        {/* Guia da Paróquia */}
        <section id="guia" aria-labelledby="guia-title" className="bg-white py-14 sm:py-24 lg:py-28 px-4 sm:px-6 border-t border-black/[0.06]">
          <div className="max-w-[1120px] mx-auto">
            <div className="max-w-2xl mb-8 sm:mb-12">
              <p className="text-[13px] font-medium text-[#218838] mb-2">
                Guia da comunidade
              </p>
              <h2
                id="guia-title"
                className="font-display text-[clamp(1.75rem,3.2vw,2.625rem)] font-semibold tracking-[-0.025em] leading-[1.1] text-[#1D1D1F]"
              >
                Acesso rápido à paróquia
              </h2>
              <p className="mt-3 text-[15px] sm:text-[16px] text-[#1D1D1F]/80 leading-relaxed">
                Encontre horários, atividades, atendimento e informações para chegar até nós.
              </p>
            </div>

            <div className="guide-card-grid w-full grid gap-4">
              {[
                {
                  num: '01',
                  href: '#missas',
                  title: 'Horários das Missas',
                  desc: 'Veja os horários e locais das celebrações semanais.',
                  cta: 'Ver horários',
                  icon: Calendar,
                },
                {
                  num: '02',
                  href: '#catequese',
                  title: 'Catequese',
                  desc: 'Etapas, faixas etárias e informações para as turmas.',
                  cta: 'Ver catequese',
                  icon: BookOpen,
                },
                {
                  num: '03',
                  href: '#secretaria',
                  title: 'Secretaria Paroquial',
                  desc: 'Telefone, e-mail e expediente da secretaria.',
                  cta: 'Ver contato',
                  icon: Clock,
                },
                {
                  num: '04',
                  href: '#como-chegar',
                  title: 'Como Chegar',
                  desc: 'Endereços e rotas para a Igreja Matriz e a Capela.',
                  cta: 'Como chegar',
                  icon: MapPin,
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className="card-link group rounded-2xl bg-[#F5F5F7] hover:bg-[#EFEFF2] border border-black/[0.06] p-5 sm:p-6 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="font-mono-tabular text-[12px] font-medium text-[#6E6E73]">
                          {item.num}
                        </span>
                        <Icon className="w-4 h-4 text-[#218838]" strokeWidth={1.75} />
                      </div>
                      <h3 className="text-[18px] font-semibold tracking-tight text-[#1D1D1F] mb-1.5">
                        {item.title}
                      </h3>
                      <p className="text-[14px] text-[#424245] leading-relaxed">{item.desc}</p>
                    </div>
                    <div className="mt-5 inline-flex items-center gap-1 text-[13px] font-medium text-[#218838]">
                      <span>{item.cta}</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        </section>

        {/* Horários das Missas */}
        <section id="missas" className="bg-[#F5F5F7] py-14 sm:py-24 lg:py-28 px-4 sm:px-6">
          <div className="max-w-[1120px] mx-auto">
            <div className="max-w-2xl mb-8 sm:mb-12">
              <p className="text-[13px] font-medium text-[#218838] mb-2">
                Liturgia e comunhão
              </p>
              <h2 className="font-display text-[clamp(1.75rem,3.2vw,2.625rem)] font-semibold tracking-[-0.025em] leading-[1.1] text-[#1D1D1F]">
                Horários das Missas
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
              <div className="lg:col-span-7 bg-white rounded-2xl border border-black/[0.08] p-5 sm:p-8 flex flex-col justify-between">
                <div>
                  <span className="text-[12.5px] font-medium text-[#218838]">
                    Programação semanal
                  </span>
                  <h3 className="font-display text-[22px] sm:text-[24px] font-semibold tracking-tight text-[#1D1D1F] mt-1">
                    Missas e locais
                  </h3>

                  <div className="mt-5 space-y-6">
                    {serviceBlocks.map((block, bIdx) => (
                      <div key={bIdx}>
                        {block.heading && (
                          <p className="text-[13.5px] font-semibold text-[#1D1D1F] pb-2 border-b border-black/[0.08]">
                            {block.heading}
                          </p>
                        )}
                        <div className="divide-y divide-black/[0.06]">
                          {block.rows.map((row, rIdx) => (
                            <div
                              key={rIdx}
                              className="py-3 flex flex-col min-[420px]:flex-row min-[420px]:items-center justify-between gap-1 text-[14px]"
                            >
                              <span className="text-[#424245]">{row.label}</span>
                              {row.time && (
                                <strong className="font-semibold text-[#1D1D1F] tabular-nums">
                                  {row.time}
                                </strong>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 bg-white rounded-2xl border border-black/[0.08] p-5 sm:p-8 flex flex-col justify-between">
                <div>
                  <span className="text-[12.5px] font-medium text-[#218838]">
                    Aviso litúrgico
                  </span>
                  <h3 className="font-display text-[22px] sm:text-[24px] font-semibold tracking-tight text-[#1D1D1F] mt-1">
                    Solenidades e calendário
                  </h3>
                  <p className="mt-3 text-[14px] text-[#424245] leading-relaxed">
                    Em solenidades, festas da padroeira e datas especiais do ano litúrgico, os
                    horários das celebrações podem receber alterações pontuais.
                  </p>
                </div>
                <div className="mt-6 flex flex-col sm:flex-row lg:flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSchedulePopoverOpen(true)}
                    className="min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#1D1D1F] text-white text-[13px] font-medium hover:bg-black transition-colors cursor-pointer"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Abrir calendário do mês</span>
                  </button>
                  <a
                    href="#secretaria"
                    className="min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#F5F5F7] text-[#1D1D1F] text-[13px] font-medium hover:bg-neutral-200 transition-colors"
                  >
                    <span>Ver contato e expediente</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Conheça Nossa Paróquia */}
        <section id="a-paroquia" className="py-14 sm:py-24 lg:py-28 px-4 sm:px-6 bg-white">
          <div className="max-w-[1120px] mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
              <p className="text-[13px] font-medium text-[#218838] mb-2">
                Identidade e tradição católica
              </p>
              <h2 className="font-display text-[clamp(1.75rem,3.2vw,2.625rem)] font-semibold tracking-[-0.025em] leading-[1.1] text-[#1D1D1F]">
                Conheça Nossa Paróquia
              </h2>
              <p className="mt-3 text-[15px] sm:text-[16px] text-[#1D1D1F]/80 leading-relaxed">
                Conheça a história, a missão e as comunidades que formam a paróquia.
              </p>
            </div>

            {/* Segmented Tab Controls */}
            <div
              role="tablist"
              aria-label="Seções institucionais da paróquia"
              className="no-scrollbar mb-8 sm:mb-10 flex overflow-x-auto justify-start sm:justify-center"
            >
              <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#EBEBF0] dark:bg-[#202026] border border-black/[0.05]">
                {(
                  [
                    { id: 'quemsomos', label: 'Quem Somos' },
                    { id: 'comunidade', label: 'Comunidade' },
                    { id: 'brasao', label: 'Brasão' },
                    { id: 'padroeira', label: 'Padroeira' },
                    { id: 'decanato', label: 'Decanato' },
                  ] as const
                ).map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActiveTab(tab.id)}
                      className={`shrink-0 whitespace-nowrap min-h-[38px] px-4 py-1.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-white text-[#1D1D1F] shadow-sm'
                          : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Tab Panel (single-elevation asymmetric split) */}
            <div
              key={activeTab}
              role="tabpanel"
              className="rounded-2xl bg-[#F5F5F7] border border-black/[0.06] overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch"
            >
              <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <span className="text-[12.5px] font-medium text-[#218838] block">
                    Casa Verde · São Paulo
                  </span>
                  <h3 className="font-display text-[26px] sm:text-[32px] font-semibold tracking-tight leading-[1.15] text-[#1D1D1F]">
                    {currentTab.title}
                  </h3>
                  <p className="text-[16px] text-[#1D1D1F]/85 leading-relaxed">{currentTab.text}</p>
                </div>

                <div className="pt-5 border-t border-black/[0.08] space-y-2.5 text-[14px] text-[#1D1D1F]/85">
                  <div className="flex items-start gap-2.5">
                    <Users className="w-4 h-4 text-[#218838] shrink-0 mt-0.5" />
                    <span>
                      Integra o <strong>Decanato São Judas Tadeu</strong> da{' '}
                      <strong>Arquidiocese de São Paulo (Região Santana)</strong>.
                    </span>
                  </div>
                  <div className="pt-1">
                    <a
                      href="https://arquisp.org.br/regiao-santana/paroquia-rainha-santa-isabel-casa-verde/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#218838] hover:underline"
                    >
                      <span>Ficha paroquial oficial da Arquidiocese</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 bg-white border-t lg:border-t-0 lg:border-l border-black/[0.08] flex flex-col justify-between">
                <MediaFrame
                  mediaKey="hero_sanctuary"
                  className="aspect-[4/3] lg:aspect-auto lg:flex-1 w-full min-h-[220px]"
                />
                <div className="p-4 sm:p-5 border-t border-black/[0.06] flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-[#F5F5F7] dark:!bg-white border border-black/[0.07] flex items-center justify-center p-1 shrink-0">
                    <ParishEmblem
                      alt="Brasão Oficial da Paróquia Rainha Santa Isabel"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <h4 className="text-[14px] font-semibold text-[#1D1D1F]">
                      Brasão Oficial Paroquial
                    </h4>
                    <p className="text-[12px] text-[#6E6E73]">
                      Paróquia Rainha Santa Isabel · Casa Verde
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 3 Pillars in unified hairline band */}
            <div className="mt-8 sm:mt-10 rounded-2xl border border-black/[0.08] bg-white grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-black/[0.08]">
              <div className="p-6 sm:p-7">
                <div className="flex items-center gap-2 text-[#1D1D1F] mb-2.5">
                  <span className="text-[17px] font-semibold text-[#218838]">†</span>
                  <h4 className="text-[17px] font-semibold">Liturgia &amp; Sacramentos</h4>
                </div>
                <p className="text-[14.5px] text-[#424245] leading-relaxed">
                  A vida paroquial reúne celebrações, sacramentos e momentos de oração.
                </p>
              </div>
              <div className="p-6 sm:p-7">
                <div className="flex items-center gap-2 text-[#1D1D1F] mb-2.5">
                  <BookOpen className="w-4 h-4 text-[#218838] shrink-0" />
                  <h4 className="text-[17px] font-semibold">Formação &amp; Catequese</h4>
                </div>
                <p className="text-[14.5px] text-[#424245] leading-relaxed">
                  Itinerários de iniciação cristã para crianças, jovens e adultos — da Pré-Catequese
                  ao Batismo, Primeira Eucaristia e Crisma.
                </p>
              </div>
              <div className="p-6 sm:p-7">
                <div className="flex items-center gap-2 text-[#1D1D1F] mb-2.5">
                  <Heart className="w-4 h-4 text-[#218838] shrink-0" />
                  <h4 className="text-[17px] font-semibold">Fraternidade &amp; Juventude</h4>
                </div>
                <p className="text-[14.5px] text-[#424245] leading-relaxed">
                  Encontros pastorais semanais às sextas-feiras e convivência juvenil através do
                  grupo Juventude Acutis.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Catequese e Formação Cristã */}
        <section id="catequese" className="bg-[#F5F5F7] py-14 sm:py-24 lg:py-28 px-4 sm:px-6">
          <div className="max-w-[1120px] mx-auto">
            <div className="max-w-2xl mb-8 sm:mb-12">
              <p className="text-[13px] font-medium text-[#218838] mb-2">
                Iniciação cristã
              </p>
              <h2 className="font-display text-[clamp(1.75rem,3.2vw,2.625rem)] font-semibold tracking-[-0.025em] leading-[1.1] text-[#1D1D1F]">
                Catequese e Formação Cristã
              </h2>
              <p className="mt-3 text-[15px] sm:text-[16px] text-[#1D1D1F]/80 leading-relaxed">
                Inscrições abertas. Confira as etapas, faixas etárias e horários abaixo.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mb-8 sm:mb-10">
              {CATECHESIS_PROGRAMS.map((program) => (
                <div
                  key={program.id}
                  className="bg-white rounded-2xl border border-black/[0.08] p-5 sm:p-6 flex flex-col justify-between"
                >
                  <div>
                    <h3 className="text-[19px] font-semibold tracking-tight text-[#1D1D1F] mb-2">
                      {program.title}
                    </h3>
                    <div className="text-[14px] text-[#424245] leading-relaxed mb-5 space-y-1.5">
                      <p>{program.audience}</p>
                      <p className="font-medium text-[#1D1D1F] tabular-nums">{program.schedule}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-black/[0.06]">
                    <button
                      type="button"
                      onClick={openInscriptionModal}
                      className="w-full min-h-[42px] px-4 rounded-xl bg-[#F5F5F7] text-[#1D1D1F] text-[13px] font-medium hover:bg-neutral-200 transition-colors cursor-pointer"
                    >
                      Dúvidas e inscrição
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Enrollment Dark Banner */}
            <div className="rounded-2xl bg-[#1D1D1F] text-white p-6 sm:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="max-w-xl">
                <span className="text-[12.5px] font-medium text-[#30D158] block mb-1.5">
                  Inscrições abertas
                </span>
                <h3 className="font-display text-[24px] sm:text-[28px] font-semibold tracking-tight leading-tight">
                  Quer se inscrever na catequese?
                </h3>
                <p className="mt-2 text-[14.5px] sm:text-[15px] text-white/75 leading-relaxed">
                  Entre em contato com a secretaria paroquial para receber orientações sobre a
                  inscrição.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                <button
                  type="button"
                  onClick={openInscriptionModal}
                  className="min-h-[44px] px-6 py-2.5 rounded-xl bg-white text-[#1D1D1F] text-[14px] font-medium hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  Consultar secretaria
                </button>
                <a
                  href={telHref}
                  className="min-h-[44px] inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[14px] font-medium transition-colors tabular-nums"
                >
                  Ligar ({contactPhone})
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Pastorais e Juventude (asymmetric 7/5 split) */}
        <section id="pastorais" className="py-14 sm:py-24 lg:py-28 px-4 sm:px-6 bg-white">
          <div className="max-w-[1120px] mx-auto">
            <div className="max-w-2xl mb-8 sm:mb-10">
              <p className="text-[13px] font-medium text-[#218838] mb-2">
                Serviço e evangelização
              </p>
              <h2 className="font-display text-[clamp(1.75rem,3.2vw,2.625rem)] font-semibold tracking-[-0.025em] leading-[1.1] text-[#1D1D1F]">
                Pastorais e Juventude
              </h2>
              <p className="mt-3 text-[15px] sm:text-[16px] text-[#1D1D1F]/80 leading-relaxed tabular-nums">
                Reuniões pastorais todas as sextas-feiras, às 19h30, na Capela Maranata.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
              <div className="lg:col-span-7 rounded-2xl bg-[#F5F5F7] border border-black/[0.06] p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-black/[0.08]">
                    <div>
                      <span className="text-[12.5px] font-medium text-[#218838]">
                        Vida comunitária
                      </span>
                      <h3 className="font-display text-[22px] sm:text-[24px] font-semibold text-[#1D1D1F] mt-0.5">
                        Participe das Pastorais
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPastoralModalOpen(true)}
                      className="self-start sm:self-auto min-h-[42px] px-5 py-2 rounded-xl bg-[#1D1D1F] text-white text-[13px] font-medium hover:bg-black transition-colors cursor-pointer"
                    >
                      Consultar secretaria
                    </button>
                  </div>

                  <div className="pt-5 space-y-2">
                    <p className="text-[14px] text-[#424245] leading-relaxed">
                      <strong className="text-[#1D1D1F]">Local dos encontros:</strong> Capela
                      Maranata · Rua Brigadeiro Xavier de Brito, 577.
                    </p>
                    <p className="text-[14px] text-[#424245] leading-relaxed tabular-nums">
                      <strong className="text-[#1D1D1F]">Horário:</strong> Sextas-feiras, às 19h30.
                    </p>
                  </div>
                </div>

                <div className="pt-5">
                  <a
                    href="https://www.google.com/maps/search/?api=1&query=Capela+Maranata+Rua+Brigadeiro+Xavier+de+Brito+577+Sao+Paulo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#218838] hover:underline"
                  >
                    <span>Ver Capela Maranata no mapa</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              <div
                id="juventude"
                className="lg:col-span-5 rounded-2xl bg-[#F5F5F7] border border-black/[0.06] p-6 sm:p-8 flex flex-col justify-between"
              >
                <div>
                  <span className="text-[12.5px] font-medium text-[#218838] block mb-1">
                    Juventude Acutis
                  </span>
                  <h3 className="font-display text-[22px] sm:text-[26px] font-semibold tracking-tight text-[#1D1D1F]">
                    Grupo de jovens da paróquia
                  </h3>
                  <p className="mt-3 text-[14.5px] text-[#424245] leading-relaxed">
                    Encontros, momentos de oração e convivência juvenil. Acompanhe a agenda e as
                    atividades pelo Instagram oficial.
                  </p>
                </div>

                <a
                  href="https://www.instagram.com/juventude.acutis/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#218838] hover:bg-[#196C2E] text-white text-[13.5px] font-medium transition-colors"
                >
                  <InstagramIcon />
                  <span>@juventude.acutis</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Eventos & Homilias Dinâmicos */}
        {(events.length > 0 || sermons.length > 0) && (
          <section id="eventos" className="bg-[#F5F5F7] py-14 sm:py-24 lg:py-28 px-4 sm:px-6">
            <div className="max-w-[1120px] mx-auto space-y-12 sm:space-y-16">
              {events.length > 0 && (
                <div>
                  <div className="mb-8">
                    <p className="text-[13px] font-medium text-[#218838] mb-2">
                      Programação especial
                    </p>
                    <h2 className="font-display text-[clamp(1.75rem,3.2vw,2.625rem)] font-semibold tracking-[-0.025em] leading-[1.1] text-[#1D1D1F]">
                      Próximos Eventos
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map((evt) => (
                      <article
                        key={evt.id}
                        className="bg-white rounded-2xl border border-black/[0.08] overflow-hidden flex flex-col justify-between"
                      >
                        <div>
                          <MediaFrame
                            mediaKey={evt.coverKey}
                            className="aspect-[16/10] w-full"
                          />
                          <div className="p-6">
                            <span className="text-[12px] font-medium text-[#218838]">
                              {evt.category}
                            </span>
                            <h3 className="text-[19px] font-semibold text-[#1D1D1F] mt-1">
                              {evt.title}
                            </h3>
                            <p className="text-[14px] text-[#424245] mt-2 leading-relaxed">
                              {evt.subtitle || evt.description}
                            </p>
                          </div>
                        </div>
                        <div className="px-6 pb-6 pt-4 border-t border-black/[0.06] flex items-center justify-between gap-2 text-[13px]">
                          <span className="text-[#424245] tabular-nums">
                            {formatDatePt(evt.date)} · {evt.time}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setRsvpEvent(evt);
                              if (parishioner) {
                                setRsvpName((prev) => prev || parishioner.fullName);
                                setRsvpEmail((prev) => prev || parishioner.email);
                                setRsvpPhone((prev) => prev || parishioner.phone || '');
                              }
                              setRsvpFeedback('');
                              setRsvpError('');
                            }}
                            className="min-h-[38px] px-4 py-1.5 rounded-xl bg-[#218838] text-white font-medium hover:bg-[#196C2E] cursor-pointer"
                          >
                            Confirmar
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              {sermons.length > 0 && (
                <div id="homilias">
                  <div className="mb-8">
                    <p className="text-[13px] font-medium text-[#218838] mb-2">
                      Palavra e formação
                    </p>
                    <h2 className="font-display text-[clamp(1.75rem,3.2vw,2.625rem)] font-semibold tracking-[-0.025em] leading-[1.1] text-[#1D1D1F]">
                      Homilias &amp; Mensagens
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sermons.map((sermon) => (
                      <article
                        key={sermon.id}
                        className="bg-white rounded-2xl border border-black/[0.08] p-6 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2 text-[12px] text-[#218838] font-medium mb-2">
                            <Mic2 className="w-3.5 h-3.5" />
                            <span>{sermon.series || 'Mensagem'}</span>
                          </div>
                          <h3 className="text-[19px] font-semibold text-[#1D1D1F]">
                            {sermon.title}
                          </h3>
                          <p className="text-[13px] text-[#6E6E73] mt-1.5 tabular-nums">
                            {sermon.preacher} · {sermon.duration}
                          </p>
                          {sermon.summary && (
                            <p className="text-[14px] text-[#424245] mt-3 line-clamp-2">
                              {sermon.summary}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveSermon(sermon)}
                          className="mt-5 inline-flex items-center gap-2 text-[13px] font-medium text-[#218838] hover:underline cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Ouvir e ler anotações</span>
                        </button>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Secretaria Paroquial & Como Chegar */}
        <section id="secretaria" className="bg-[#F5F5F7] py-14 sm:py-24 lg:py-28 px-4 sm:px-6">
          <div className="max-w-[1120px] mx-auto space-y-14 sm:space-y-20">
            {/* Secretaria Card */}
            <div>
              <div className="max-w-2xl mb-8 sm:mb-10">
                <p className="text-[13px] font-medium text-[#218838] mb-2">
                  Atendimento pastoral
                </p>
                <h2 className="font-display text-[clamp(1.75rem,3.2vw,2.625rem)] font-semibold tracking-[-0.025em] leading-[1.1] text-[#1D1D1F]">
                  Secretaria Paroquial
                </h2>
              </div>

              <div className="bg-white rounded-2xl border border-black/[0.08] p-5 sm:p-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 pb-6 sm:pb-8 border-b border-black/[0.06]">
                  <div className="space-y-5 sm:space-y-6">
                    <div>
                      <span className="text-[12.5px] font-medium text-[#6E6E73] block">
                        Telefone da Secretaria
                      </span>
                      <a
                        href={telHref}
                        className="font-display text-[28px] sm:text-[34px] font-semibold tracking-tight text-[#1D1D1F] hover:text-[#218838] transition-colors block mt-1 tabular-nums"
                      >
                        {contactPhone}
                      </a>
                    </div>

                    <div>
                      <span className="text-[12.5px] font-medium text-[#6E6E73] block">
                        E-mail
                      </span>
                      <a
                        href={`mailto:${settings.contactEmail || 'rainha_santaisabel@hotmail.com'}`}
                        className="mt-1 block break-all text-[14px] font-medium text-[#218838] hover:underline"
                      >
                        {settings.contactEmail || 'rainha_santaisabel@hotmail.com'}
                      </a>
                    </div>

                    {whatsappUrl && (
                      <div>
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 min-h-[40px] px-4 py-2 rounded-xl bg-[#25D366] text-[#123B25] hover:bg-[#20BD5A] text-[13px] font-semibold transition-colors"
                        >
                          <WhatsAppIcon />
                          <span>Atendimento via WhatsApp</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="divide-y divide-black/[0.06]">
                    <div className="pb-3">
                      <span className="text-[12.5px] font-medium text-[#6E6E73] block">
                        Horários de Atendimento
                      </span>
                    </div>
                    <div className="py-3.5 flex items-center justify-between gap-4 text-[14px]">
                      <span className="font-semibold text-[#1D1D1F]">Terça a sexta-feira</span>
                      <div className="text-right tabular-nums shrink-0">
                        <strong className="text-[#1D1D1F]">{officeHoursWeekdays}</strong>
                        {officeHoursWeekdaysNote && (
                          <span className="block text-[12px] text-[#6E6E73]">
                            {officeHoursWeekdaysNote}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="py-3.5 flex items-center justify-between gap-4 text-[14px]">
                      <span className="font-semibold text-[#1D1D1F]">Sábados</span>
                      <strong className="text-[#1D1D1F] tabular-nums shrink-0">
                        {officeHoursSaturday}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="pt-5 sm:pt-6 flex justify-end">
                  <a
                    href="#como-chegar"
                    className="min-h-[42px] inline-flex items-center justify-center px-5 py-2 rounded-xl bg-[#F5F5F7] text-[#1D1D1F] text-[13px] font-medium hover:bg-neutral-200 transition-colors"
                  >
                    Ver endereços e rotas
                  </a>
                </div>
              </div>
            </div>

            {/* Como Chegar (asymmetric 5/7 split) */}
            <div id="como-chegar">
              <div className="max-w-2xl mb-6 sm:mb-8">
                <p className="text-[13px] font-medium text-[#218838] mb-2">
                  Acesso e localização
                </p>
                <h2 className="font-display text-[clamp(1.75rem,3.2vw,2.625rem)] font-semibold tracking-[-0.025em] leading-[1.1] text-[#1D1D1F]">
                  Localização e Como Chegar
                </h2>
                <p className="mt-2 text-[15px] sm:text-[16px] text-[#1D1D1F]/80">
                  Endereços e rotas para a Igreja Matriz e a Capela Maranata.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
                <div className="lg:col-span-5 bg-white rounded-2xl border border-black/[0.08] divide-y divide-black/[0.08] flex flex-col justify-between">
                  <div className="p-5 sm:p-7 space-y-4">
                    <div>
                      <span className="text-[12px] font-medium text-[#218838]">
                        Igreja Matriz e Secretaria
                      </span>
                      <h3 className="font-display text-[21px] font-semibold text-[#1D1D1F] mt-0.5">
                        Paróquia Rainha Santa Isabel
                      </h3>
                      <p className="text-[15px] font-semibold text-[#1D1D1F] mt-2 tabular-nums">
                        Rua Elias Gannam, 331
                      </p>
                      <p className="text-[13px] text-[#6E6E73]">
                        Vila Bandeirantes / Casa Verde · São Paulo, SP
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          copyAddress(
                            'Rua Elias Gannam, 331, Vila Bandeirantes, São Paulo - SP',
                            'matriz'
                          )
                        }
                        className={`min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-black/[0.08] text-[12.5px] font-medium cursor-pointer transition-colors ${
                          copiedId === 'matriz'
                            ? 'text-[#218838] bg-[#218838]/10'
                            : 'text-[#424245] hover:bg-[#F5F5F7]'
                        }`}
                      >
                        {copiedId === 'matriz' ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {copiedId === 'matriz' ? 'Endereço copiado' : 'Copiar endereço'}
                        </span>
                      </button>
                      <a
                        href="https://www.google.com/maps/search/?api=1&query=Rua+Elias+Gannam+331+Vila+Bandeirantes+Sao+Paulo"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[40px] inline-flex items-center justify-center px-4 py-2 rounded-xl bg-[#1D1D1F] text-white text-[12.5px] font-medium hover:bg-black transition-colors"
                      >
                        Abrir no Maps
                      </a>
                    </div>
                  </div>

                  <div className="p-5 sm:p-7 space-y-4">
                    <div>
                      <span className="text-[12px] font-medium text-[#218838]">
                        Capela da comunidade
                      </span>
                      <h3 className="font-display text-[21px] font-semibold text-[#1D1D1F] mt-0.5">
                        Capela Maranata
                      </h3>
                      <p className="text-[15px] font-semibold text-[#1D1D1F] mt-2 tabular-nums">
                        Rua Brigadeiro Xavier de Brito, 577
                      </p>
                      <p className="text-[13px] text-[#6E6E73]">Casa Verde · São Paulo, SP</p>
                    </div>
                    <a
                      href="https://www.google.com/maps/search/?api=1&query=Capela+Maranata+Rua+Brigadeiro+Xavier+de+Brito+577+Sao+Paulo"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[40px] inline-flex items-center justify-center px-4 py-2 rounded-xl bg-[#F5F5F7] text-[#1D1D1F] text-[12.5px] font-medium hover:bg-neutral-200 transition-colors"
                    >
                      Abrir Capela no Maps
                    </a>
                  </div>
                </div>

                <div className="lg:col-span-7 bg-white rounded-2xl border border-black/[0.08] p-4 sm:p-6 flex flex-col justify-between">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-black/[0.06]">
                    <h4 className="text-[16px] font-semibold text-[#1D1D1F]">
                      Mapa da Igreja Matriz
                    </h4>
                    <span className="text-[12.5px] text-[#6E6E73] tabular-nums">
                      Rua Elias Gannam, 331
                    </span>
                  </div>
                  <div className="rounded-xl overflow-hidden border border-black/[0.08] flex-1 min-h-[300px] sm:min-h-[380px] w-full bg-[#F5F5F7]">
                    <iframe
                      title="Mapa da Paróquia Rainha Santa Isabel"
                      width="100%"
                      height="100%"
                      style={{ border: 0, minHeight: '320px' }}
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                      src="https://maps.google.com/maps?q=Rua+Elias+Gannam+331+Vila+Bandeirantes+Sao+Paulo&t=&z=16&ie=UTF8&iwloc=&output=embed"
                    />
                  </div>
                  <p className="text-[12px] text-[#6E6E73] mt-3">
                    Igreja Matriz localizada na Vila Bandeirantes / Casa Verde, Zona Norte de São
                    Paulo.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Central Notificar & Pedido de Oração */}
        <section id="notificar" className="py-14 sm:py-24 lg:py-28 px-4 sm:px-6 bg-white">
          <div className="max-w-[1120px] mx-auto">
            <div className="max-w-2xl mb-8 sm:mb-10">
              <p className="text-[13px] font-medium text-[#218838] mb-2">
                Comunicação direta
              </p>
              <h2 className="font-display text-[clamp(1.75rem,3.2vw,2.625rem)] font-semibold tracking-[-0.025em] leading-[1.1] text-[#1D1D1F]">
                Avisos &amp; Intenções de Oração
              </h2>
              <p className="mt-3 text-[15px] sm:text-[16px] text-[#1D1D1F]/80 leading-relaxed">
                Acompanhe os comunicados da paróquia, cadastre seu contato para receber avisos ou
                envie sua intenção de oração e pedido de visita pastoral.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-start">
              {/* Notificar Opt-in */}
              <form
                onSubmit={handleSubscribe}
                className="rounded-2xl bg-[#F5F5F7] border border-black/[0.06] p-5 sm:p-8 space-y-4"
              >
                <div className="flex items-center gap-2.5">
                  <BellRing className="w-5 h-5 text-[#218838]" />
                  <h3 className="text-[19px] sm:text-[20px] font-semibold text-[#1D1D1F]">
                    Receber avisos paroquiais
                  </h3>
                </div>
                <p className="text-[13px] text-[#6E6E73] leading-relaxed">
                  Deixe seu contato para receber novidades sobre solenidades, catequese e eventos da
                  comunidade.
                </p>
                {parishioner && (
                  <p className="text-[12px] text-[#218838] font-medium">
                    Preenchido com sua conta ({parishioner.fullName}).{' '}
                    <button
                      type="button"
                      onClick={() => onOpenAccount('login')}
                      className="underline cursor-pointer"
                    >
                      Ver Área do Paroquiano
                    </button>
                  </p>
                )}

                <div>
                  <label htmlFor="sub-name" className="block text-[12px] font-medium text-[#424245] mb-1">
                    Nome completo
                  </label>
                  <input
                    id="sub-name"
                    type="text"
                    required
                    value={subName}
                    onChange={(e) => setSubName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-black/[0.08] text-[16px] sm:text-[14px]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="sub-email" className="block text-[12px] font-medium text-[#424245] mb-1">
                      E-mail
                    </label>
                    <input
                      id="sub-email"
                      type="email"
                      value={subEmail}
                      onChange={(e) => setSubEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-black/[0.08] text-[16px] sm:text-[14px]"
                    />
                  </div>
                  <div>
                    <label htmlFor="sub-phone" className="block text-[12px] font-medium text-[#424245] mb-1">
                      Telefone / WhatsApp
                    </label>
                    <input
                      id="sub-phone"
                      type="tel"
                      value={subPhone}
                      onChange={(e) => setSubPhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-black/[0.08] text-[16px] sm:text-[14px] tabular-nums"
                    />
                  </div>
                </div>

                <p className="text-[12px] text-[#6E6E73]">
                  Selecione os assuntos sobre os quais deseja ser avisado:
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'missas', label: 'Horários & Solenidades' },
                    { id: 'catequese', label: 'Catequese' },
                    { id: 'avisos', label: 'Avisos Pastorais' },
                  ].map((topic) => {
                    const checked = subTopics.includes(topic.id);
                    return (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => toggleTopic(topic.id)}
                        className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-[12.5px] font-medium transition-colors cursor-pointer ${
                          checked
                            ? 'bg-[#1D1D1F] text-white'
                            : 'bg-white text-[#424245] border border-black/[0.08]'
                        }`}
                      >
                        {topic.label}
                      </button>
                    );
                  })}
                </div>

                {subError && (
                  <p className="text-[13px] font-medium text-red-600 dark:text-red-400">{subError}</p>
                )}
                {subFeedback && (
                  <p className="text-[13px] font-medium text-[#218838]">{subFeedback}</p>
                )}

                <button
                  type="submit"
                  disabled={subLoading}
                  className="w-full min-h-[46px] py-3 rounded-xl bg-[#218838] text-white text-[14px] font-medium hover:bg-[#196C2E] disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {subLoading ? 'Registrando...' : 'Cadastrar para avisos'}
                </button>

                {recentNotifications.length > 0 && (
                  <div className="pt-4 border-t border-black/[0.06] space-y-2">
                    <p className="text-[12px] font-medium text-[#6E6E73]">
                      Últimos avisos da comunidade
                    </p>
                    {recentNotifications.slice(0, 2).map((n) => (
                      <div key={n.id} className="text-[13px] text-[#424245]">
                        <strong className="text-[#1D1D1F]">{n.title}:</strong> {n.message}
                      </div>
                    ))}
                  </div>
                )}
              </form>

              {/* Prayer & Pastoral Visit Request */}
              <form
                onSubmit={handlePrayerSubmit}
                className="rounded-2xl bg-[#F5F5F7] border border-black/[0.06] p-5 sm:p-8 space-y-4"
              >
                <h3 className="text-[19px] sm:text-[20px] font-semibold text-[#1D1D1F]">
                  Pedido de Oração ou Visita Pastoral
                </h3>
                <p className="text-[13px] text-[#6E6E73] leading-relaxed">
                  Compartilhe sua intenção de oração para as celebrações ou solicite uma visita
                  pastoral da comunidade.
                </p>
                {parishioner && (
                  <p className="text-[12px] text-[#218838] font-medium">
                    Preenchido com sua conta · Acompanhe o status na{' '}
                    <button
                      type="button"
                      onClick={() => onOpenAccount('login')}
                      className="underline cursor-pointer"
                    >
                      Área do Paroquiano
                    </button>
                    .
                  </p>
                )}

                <div className="p-1 rounded-xl bg-[#EBEBF0] dark:bg-[#202026] grid grid-cols-2 gap-1">
                  {(['Oração', 'Visita'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setPrayType(type)}
                      className={`min-h-[38px] py-1.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer ${
                        prayType === type
                          ? 'bg-white text-[#1D1D1F] shadow-sm'
                          : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                      }`}
                    >
                      Pedido de {type}
                    </button>
                  ))}
                </div>

                <div>
                  <label htmlFor="pray-name" className="block text-[12px] font-medium text-[#424245] mb-1">
                    Seu nome
                  </label>
                  <input
                    id="pray-name"
                    type="text"
                    required
                    value={prayName}
                    onChange={(e) => setPrayName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-black/[0.08] text-[16px] sm:text-[14px]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="pray-email" className="block text-[12px] font-medium text-[#424245] mb-1">
                      E-mail (opcional)
                    </label>
                    <input
                      id="pray-email"
                      type="email"
                      value={prayEmail}
                      onChange={(e) => setPrayEmail(e.target.value)}
                      placeholder="E-mail"
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-black/[0.08] text-[16px] sm:text-[14px]"
                    />
                  </div>
                  <div>
                    <label htmlFor="pray-phone" className="block text-[12px] font-medium text-[#424245] mb-1">
                      Telefone (opcional)
                    </label>
                    <input
                      id="pray-phone"
                      type="tel"
                      value={prayPhone}
                      onChange={(e) => setPrayPhone(e.target.value)}
                      placeholder="Telefone"
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-black/[0.08] text-[16px] sm:text-[14px] tabular-nums"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="pray-message" className="block text-[12px] font-medium text-[#424245] mb-1">
                    Intenção ou mensagem
                  </label>
                  <textarea
                    id="pray-message"
                    rows={3}
                    required
                    value={prayMessage}
                    onChange={(e) => setPrayMessage(e.target.value)}
                    placeholder="Escreva sua intenção de oração ou solicitação à secretaria paroquial..."
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-black/[0.08] text-[16px] sm:text-[14px] resize-none"
                  />
                </div>

                {prayError && (
                  <p className="text-[13px] font-medium text-red-600 dark:text-red-400">{prayError}</p>
                )}
                {prayFeedback && (
                  <p className="text-[13px] font-medium text-[#218838]">{prayFeedback}</p>
                )}

                <button
                  type="submit"
                  disabled={prayLoading}
                  className="w-full min-h-[46px] py-3 rounded-xl bg-[#1D1D1F] text-white text-[14px] font-medium hover:bg-black disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {prayLoading ? 'Enviando...' : 'Enviar pedido'}
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* Redes Sociais e Comunicação */}
        <section id="redes-sociais" className="bg-[#1D1D1F] text-white py-14 sm:py-24 lg:py-28 px-4 sm:px-6">
          <div className="max-w-[1120px] mx-auto">
            <div className="max-w-2xl mb-8 sm:mb-10">
              <p className="text-[13px] font-medium text-[#30D158] mb-2">
                Canais digitais
              </p>
              <h2 className="font-display text-[clamp(1.75rem,3.2vw,2.625rem)] font-semibold tracking-[-0.025em] leading-[1.1]">
                Redes Sociais e Comunicação
              </h2>
              <p className="mt-3 text-[15px] sm:text-[16px] text-white/75 leading-relaxed">
                Canais de contato e perfis oficiais da Igreja e da Região Santana.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <div className="rounded-2xl bg-white text-[#1D1D1F] p-5 sm:p-7 flex flex-col justify-between">
                <div>
                  <span className="text-[12px] font-medium text-[#218838] block mb-1">
                    Fonte oficial
                  </span>
                  <h3 className="text-[19px] sm:text-[20px] font-semibold tracking-tight">
                    Arquidiocese de São Paulo
                  </h3>
                  <p className="text-[14px] text-[#424245] leading-relaxed mt-2 mb-5">
                    Confira a ficha paroquial para consultar informações institucionais atualizadas.
                  </p>
                </div>
                <a
                  href="https://arquisp.org.br/regiao-santana/paroquia-rainha-santa-isabel-casa-verde/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#1D1D1F] text-white hover:bg-black text-[13px] font-medium transition-colors"
                >
                  <span>Abrir ficha paroquial</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <div className="rounded-2xl bg-white text-[#1D1D1F] p-5 sm:p-7 flex flex-col justify-between">
                <div>
                  <span className="text-[12px] font-medium text-[#218838] block mb-1">
                    Atendimento
                  </span>
                  <h3 className="text-[19px] sm:text-[20px] font-semibold tracking-tight">
                    Secretaria paroquial
                  </h3>
                  <p className="text-[14px] text-[#424245] leading-relaxed mt-2 mb-5">
                    Fale diretamente com a secretaria para dúvidas sobre missas, catequese e
                    documentos.
                  </p>
                </div>
                <div className="space-y-2.5">
                  <a
                    href="#secretaria"
                    className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#1D1D1F] text-white hover:bg-black text-[13px] font-medium transition-colors"
                  >
                    <span>Ver contatos e expediente</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                  {whatsappUrl && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#25D366] text-[#123B25] hover:bg-[#20BD5A] text-[13px] font-medium transition-colors"
                    >
                      <WhatsAppIcon />
                      <span>Conversar pelo WhatsApp</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
              <div className="rounded-2xl bg-white text-[#1D1D1F] p-5 sm:p-7 flex flex-col justify-between">
                <div>
                  <span className="text-[12px] font-medium text-[#218838] block mb-1">
                    Instagram
                  </span>
                  <h3 className="text-[19px] sm:text-[20px] font-semibold tracking-tight">
                    Arquidiocese e Região Santana
                  </h3>
                  <p className="text-[14px] text-[#424245] leading-relaxed mt-2">
                    Acompanhe as publicações da arquidiocese e da região episcopal.
                  </p>
                </div>
                <div className="mt-5 flex flex-col gap-2.5 text-[14px]">
                  <a
                    href="https://www.instagram.com/arquisp/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 font-medium text-[#218838] hover:underline"
                  >
                    <InstagramIcon />
                    <span>@arquisp</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href="https://www.instagram.com/regiaosantana/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 font-medium text-[#218838] hover:underline"
                  >
                    <InstagramIcon />
                    <span>@regiaosantana</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#F5F5F7] text-[#424245] border-t border-black/[0.08]">
        <div className="max-w-[1120px] mx-auto px-4 sm:px-6 py-12 sm:py-14">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 pb-8 sm:pb-10 border-b border-black/[0.08]">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 shrink-0">
                  <ParishEmblem alt="Logo Paróquia" className="w-full h-full object-contain" />
                </div>
                <span className="text-[15px] font-semibold text-[#1D1D1F]">
                  Paróquia Rainha Santa Isabel
                </span>
              </div>
              <p className="text-[13px] text-[#6E6E73] leading-relaxed">
                Comunidade católica da Casa Verde, dedicada à fé, aos sacramentos e à caridade.
              </p>
            </div>

            <div>
              <h4 className="text-[13px] font-semibold text-[#1D1D1F] mb-3">
                Navegação rápida
              </h4>
              <ul className="space-y-2 text-[13px]">
                <li>
                  <a href="#inicio" className="hover:text-[#1D1D1F]">
                    Início
                  </a>
                </li>
                <li>
                  <a href="#a-paroquia" className="hover:text-[#1D1D1F]">
                    Paróquia
                  </a>
                </li>
                <li>
                  <a href="#missas" className="hover:text-[#1D1D1F]">
                    Horários das Missas
                  </a>
                </li>
                <li>
                  <a href="#catequese" className="hover:text-[#1D1D1F]">
                    Catequese e Formação
                  </a>
                </li>
                <li>
                  <a href="#pastorais" className="hover:text-[#1D1D1F]">
                    Pastorais
                  </a>
                </li>
                <li>
                  <a href="#juventude" className="hover:text-[#1D1D1F]">
                    Juventude
                  </a>
                </li>
                <li>
                  <a href="#secretaria" className="hover:text-[#1D1D1F]">
                    Secretaria e Contato
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-3 text-[13px]">
              <h4 className="text-[13px] font-semibold text-[#1D1D1F]">
                Contato e endereços
              </h4>
              <a href="#secretaria" className="block hover:text-[#1D1D1F]">
                Telefone, e-mail e expediente
              </a>
              <a href="#como-chegar" className="block hover:text-[#1D1D1F]">
                Endereços e rotas
              </a>
            </div>

            <div className="space-y-2.5 text-[13px]">
              <h4 className="text-[13px] font-semibold text-[#1D1D1F] mb-3">
                Informações oficiais
              </h4>
              <a
                href="https://arquisp.org.br/regiao-santana/paroquia-rainha-santa-isabel-casa-verde/"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-[#424245] hover:text-[#1D1D1F]"
              >
                Ficha da Arquidiocese
              </a>
              <button
                type="button"
                onClick={onOpenAdmin}
                className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#218838] hover:underline cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Área Administrativa</span>
              </button>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left text-[12px] text-[#6E6E73]">
            <p className="tabular-nums">
              © {new Date().getFullYear()} Paróquia Rainha Santa Isabel. Todos os direitos
              reservados.
            </p>
            <p>Arquidiocese de São Paulo · Região Santana · Decanato São Judas Tadeu</p>
          </div>
        </div>
      </footer>

      {/* Modal Inscrições Catequese */}
      {inscriptionModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Informações sobre catequese"
          className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex p-3 sm:p-4"
          onClick={() => setInscriptionModalOpen(false)}
        >
          <div
            className="relative bg-white rounded-2xl max-w-lg w-full m-auto p-5 sm:p-8 shadow-2xl border border-black/[0.08]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setInscriptionModalOpen(false)}
              aria-label="Fechar modal de inscrições"
              className="absolute top-4 right-4 sm:top-5 sm:right-5 h-9 w-9 rounded-xl bg-[#F5F5F7] text-[#1D1D1F] flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mb-5 sm:mb-6 pr-11">
              <span className="text-[12px] text-[#218838] font-medium block mb-1">
                Formação Cristã · Paróquia Rainha Santa Isabel
              </span>
              <h3 className="font-display text-[22px] sm:text-[24px] font-semibold tracking-tight text-[#1D1D1F]">
                Informações sobre catequese
              </h3>
              <p className="text-[13.5px] text-[#6E6E73] mt-1.5 leading-relaxed">
                As inscrições estão abertas. Entre em contato com a secretaria paroquial para
                receber orientações e confirmar a etapa adequada.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={telHref}
                className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#218838] hover:bg-[#196C2E] text-white text-[13px] font-medium transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span>Ligar ({contactPhone})</span>
              </a>
              <a
                href={`mailto:${settings.contactEmail || 'rainha_santaisabel@hotmail.com'}`}
                className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#F5F5F7] text-[#1D1D1F] text-[13px] font-medium hover:bg-neutral-200 transition-colors"
              >
                <Mail className="w-4 h-4" />
                <span>Enviar e-mail</span>
              </a>
            </div>
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 w-full min-h-[42px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#25D366] text-[#123B25] hover:bg-[#20BD5A] text-[13px] font-medium transition-colors"
              >
                <WhatsAppIcon />
                <span>Falar pelo WhatsApp</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Modal Pastorais */}
      {pastoralModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Como participar das pastorais"
          className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex p-3 sm:p-4"
          onClick={() => setPastoralModalOpen(false)}
        >
          <div
            className="relative bg-white rounded-2xl max-w-lg w-full m-auto p-5 sm:p-8 shadow-2xl border border-black/[0.08] max-h-[92dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPastoralModalOpen(false)}
              aria-label="Fechar modal de pastorais"
              className="absolute top-4 right-4 sm:top-5 sm:right-5 h-9 w-9 rounded-xl bg-[#F5F5F7] text-[#1D1D1F] flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mb-5 pr-11">
              <span className="text-[12px] text-[#218838] font-medium block mb-1">
                Vida pastoral comunitária
              </span>
              <h3 className="font-display text-[21px] sm:text-[23px] font-semibold text-[#1D1D1F]">
                Como Participar das Pastorais
              </h3>
            </div>

            <div className="space-y-4 text-[14px] text-[#424245]">
              <p className="leading-relaxed tabular-nums">
                As reuniões pastorais acontecem às sextas-feiras, às 19h30, na Capela Maranata.
                Para saber como participar, consulte a secretaria.
              </p>
            </div>

            <div className="mt-6 pt-5 border-t border-black/[0.06] flex flex-col sm:flex-row gap-3">
              <a
                href={telHref}
                className="flex-1 min-h-[44px] inline-flex items-center justify-center py-2.5 px-4 rounded-xl bg-[#218838] text-white text-[13px] font-medium hover:bg-[#196C2E] transition-colors"
              >
                <Phone className="w-4 h-4 mr-2" />
                <span>Ligar ({contactPhone})</span>
              </a>
              <a
                href={`mailto:${settings.contactEmail || 'rainha_santaisabel@hotmail.com'}`}
                className="flex-1 min-h-[44px] inline-flex items-center justify-center py-2.5 px-4 rounded-xl bg-[#F5F5F7] text-[#1D1D1F] text-[13px] font-medium hover:bg-neutral-200 transition-colors"
              >
                <Mail className="w-4 h-4 mr-2" />
                <span>Enviar e-mail</span>
              </a>
              <button
                type="button"
                onClick={() => setPastoralModalOpen(false)}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#F5F5F7] text-[#1D1D1F] text-[13px] font-medium cursor-pointer"
              >
                Fechar
              </button>
            </div>
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 w-full min-h-[42px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#25D366] text-[#123B25] hover:bg-[#20BD5A] text-[13px] font-medium transition-colors"
              >
                <WhatsAppIcon />
                <span>Falar pelo WhatsApp</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Modal RSVP */}
      {rsvpEvent && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
          onClick={() => setRsvpEvent(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-7 border border-black/[0.08] shadow-2xl max-h-[90dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <span className="text-[12px] font-medium text-[#218838] block">
                  Confirmação de presença
                </span>
                <h3 className="font-display text-[20px] font-semibold text-[#1D1D1F]">
                  {rsvpEvent.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRsvpEvent(null)}
                aria-label="Fechar modal"
                className="h-9 w-9 rounded-xl bg-[#F5F5F7] flex items-center justify-center shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleRsvpSubmit} className="space-y-3">
              {parishioner && (
                <p className="text-[12px] text-[#218838] font-medium">
                  Preenchido com sua Área do Paroquiano ({parishioner.fullName}).
                </p>
              )}
              <div>
                <label htmlFor="rsvp-name" className="block text-[12px] font-medium text-[#424245] mb-1">
                  Nome completo
                </label>
                <input
                  id="rsvp-name"
                  type="text"
                  required
                  value={rsvpName}
                  onChange={(e) => setRsvpName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] border border-black/[0.08] text-[16px] sm:text-[13px]"
                />
              </div>
              <div>
                <label htmlFor="rsvp-email" className="block text-[12px] font-medium text-[#424245] mb-1">
                  E-mail
                </label>
                <input
                  id="rsvp-email"
                  type="email"
                  required
                  value={rsvpEmail}
                  onChange={(e) => setRsvpEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] border border-black/[0.08] text-[16px] sm:text-[13px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="rsvp-phone" className="block text-[12px] font-medium text-[#424245] mb-1">
                    Telefone
                  </label>
                  <input
                    id="rsvp-phone"
                    type="tel"
                    value={rsvpPhone}
                    onChange={(e) => setRsvpPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] border border-black/[0.08] text-[16px] sm:text-[13px] tabular-nums"
                  />
                </div>
                <div>
                  <label htmlFor="rsvp-guests" className="block text-[12px] font-medium text-[#424245] mb-1">
                    Pessoas
                  </label>
                  <input
                    id="rsvp-guests"
                    type="number"
                    min={1}
                    max={10}
                    value={rsvpGuests}
                    onChange={(e) => setRsvpGuests(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] border border-black/[0.08] text-[16px] sm:text-[13px] tabular-nums"
                  />
                </div>
              </div>
              {rsvpError && (
                <p className="text-[13px] font-medium text-red-600 dark:text-red-400">{rsvpError}</p>
              )}
              {rsvpFeedback && (
                <p className="text-[13px] font-medium text-[#218838]">{rsvpFeedback}</p>
              )}
              <button
                type="submit"
                disabled={rsvpSubmitting}
                className="w-full min-h-[46px] py-3 rounded-xl bg-[#218838] hover:bg-[#196C2E] text-white text-[14px] font-medium cursor-pointer transition-colors"
              >
                {rsvpSubmitting ? 'Confirmando...' : 'Confirmar presença'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Homilia */}
      {activeSermon && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
          onClick={() => setActiveSermon(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-7 border border-black/[0.08] shadow-2xl max-h-[88dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <span className="text-[12px] font-medium text-[#218838]">{activeSermon.series}</span>
                <h3 className="font-display text-[21px] sm:text-[23px] font-semibold text-[#1D1D1F] mt-0.5">
                  {activeSermon.title}
                </h3>
                <p className="text-[13px] text-[#6E6E73] mt-1 tabular-nums">
                  {activeSermon.preacher} · {formatDatePt(activeSermon.date)} · {activeSermon.duration}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveSermon(null)}
                aria-label="Fechar homilia"
                className="h-9 w-9 rounded-xl bg-[#F5F5F7] flex items-center justify-center shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {activeSermon.summary && (
              <p className="text-[14px] text-[#424245] leading-relaxed mb-4">
                {activeSermon.summary}
              </p>
            )}
            {activeSermon.keyTakeaways.length > 0 && (
              <ul className="space-y-1.5 mb-5 text-[13px] text-[#424245] list-disc pl-5">
                {activeSermon.keyTakeaways.map((point, idx) => (
                  <li key={idx}>{point}</li>
                ))}
              </ul>
            )}
            {activeSermon.mediaUrl && (
              <a
                href={activeSermon.mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#218838] hover:bg-[#196C2E] text-white text-[13px] font-medium transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Ouvir ou assistir mídia</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Floating Call & Scroll Top */}
      <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 sm:bottom-6 sm:right-6 z-30 flex flex-col gap-2.5">
        {showScrollTop && (
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Voltar ao topo"
            className="w-11 h-11 rounded-xl bg-white text-[#1D1D1F] shadow-lg border border-black/[0.08] flex items-center justify-center hover:bg-[#F5F5F7] transition-colors cursor-pointer"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        )}
        <a
          href={telHref}
          aria-label={`Ligar para a Secretaria Paroquial (${contactPhone})`}
          title={`Ligar para a Secretaria Paroquial (${contactPhone})`}
          className="w-11 h-11 rounded-xl bg-[#218838] text-white shadow-lg flex items-center justify-center hover:bg-[#196C2E] transition-colors"
        >
          <Phone className="w-5 h-5" />
        </a>
      </div>
    </div>
  );
}
