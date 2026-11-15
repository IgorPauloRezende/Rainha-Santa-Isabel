import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  BarChart3,
  Bell,
  Calendar,
  Check,
  CloudLightning,
  Download,
  Edit3,
  ExternalLink,
  FileText,
  FolderOpen,
  HeartHandshake,
  LayoutDashboard,
  Lock,
  LogOut,
  Mic2,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import AdvancedStats from '@/components/ui/advanced-stats';
import whatsappIcon from '../assets/images/whatsapp.svg';
import { AdminFilesTab } from './AdminFilesTab';
import { WeatherForecastSection } from './WeatherForecastSection';
import { formatDatePt, formatDateTimePt, triggerBrowserNotification } from '../lib/format';
import type {
  ChurchDatabase,
  ChurchEvent,
  ChurchNotification,
  ChurchSettings,
  EventCategory,
  MediaKey,
  Member,
  MemberStatus,
  MinistryName,
  NotificationChannel,
  PrayerRequest,
  PrayerStatus,
  Sermon,
} from '../types/church';

type AdminTab =
  | 'overview'
  | 'stats'
  | 'weather'
  | 'events'
  | 'sermons'
  | 'members'
  | 'files'
  | 'notifications'
  | 'settings';

interface AdminDashboardProps {
  onExitAdmin: () => void;
  onPublicDataChanged: () => Promise<void>;
}

const TOKEN_STORAGE_KEY = 'paroquia_admin_token';

const TAB_LABELS: Record<AdminTab, string> = {
  overview: 'Visão geral',
  stats: 'Estatísticas',
  weather: 'Tempo e Clima',
  events: 'Eventos',
  sermons: 'Homilias e mensagens',
  members: 'Paroquianos',
  files: 'Pastas e arquivos',
  notifications: 'Central de avisos',
  settings: 'Configurações',
};

const MINISTRIES: MinistryName[] = [
  'Comunidade',
  'Liturgia',
  'Música',
  'Catequese',
  'Juventude Acutis',
  'Acolhimento',
  'Caridade',
  'Dízimo',
  'Pascom',
];

const MEMBER_STATUSES: MemberStatus[] = ['Ativo', 'Coordenador', 'Visitante', 'Inativo'];
const EVENT_CATEGORIES: EventCategory[] = [
  'Celebrações',
  'Retiros & Formação',
  'Pastorais & Grupos',
  'Ação Social',
];
const MEDIA_KEYS: Array<{ value: MediaKey; label: string }> = [
  { value: 'hero_sanctuary', label: 'Igreja Matriz' },
  { value: 'sermon_series_cover', label: 'Homilias e Formação' },
  { value: 'event_worship_night', label: 'Celebrações' },
  { value: 'community_fellowship', label: 'Comunidade Paroquial' },
];

export function AdminDashboard({ onExitAdmin, onPublicDataChanged }: AdminDashboardProps) {
  const [token, setToken] = useState<string>(() => localStorage.getItem(TOKEN_STORAGE_KEY) || '');
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [loginLoading, setLoginLoading] = useState<boolean>(false);
  const [backendUnavailable, setBackendUnavailable] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [db, setDb] = useState<ChurchDatabase | null>(null);
  const [loadingDb, setLoadingDb] = useState<boolean>(false);
  const [toast, setToast] = useState<string>('');

  // Events filters
  const [eventSearch, setEventSearch] = useState('');
  const [eventCategoryFilter, setEventCategoryFilter] = useState<'Todas' | EventCategory>('Todas');

  // Sermons filters
  const [sermonSearch, setSermonSearch] = useState('');
  const [sermonFilter, setSermonFilter] = useState<'Todas' | 'Destaque' | 'Publicadas' | 'Rascunhos'>(
    'Todas'
  );

  // Members filters
  const [memberSearch, setMemberSearch] = useState('');
  const [memberStatusFilter, setMemberStatusFilter] = useState<'Todos' | MemberStatus>('Todos');
  const [memberMinistryFilter, setMemberMinistryFilter] = useState<'Todos' | MinistryName>('Todos');

  // Prayer requests filter
  const [prayerStatusFilter, setPrayerStatusFilter] = useState<'Todos' | PrayerStatus>('Todos');

  // Modals
  const [eventModal, setEventModal] = useState<{ open: boolean; editing: ChurchEvent | null }>({
    open: false,
    editing: null,
  });
  const [rsvpInspectEvent, setRsvpInspectEvent] = useState<ChurchEvent | null>(null);
  const [sermonModal, setSermonModal] = useState<{ open: boolean; editing: Sermon | null }>({
    open: false,
    editing: null,
  });
  const [memberModal, setMemberModal] = useState<{ open: boolean; editing: Member | null }>({
    open: false,
    editing: null,
  });

  // Event form state
  const [evtForm, setEvtForm] = useState({
    title: '',
    subtitle: '',
    category: 'Celebrações' as EventCategory,
    date: '',
    time: '19:30',
    location: 'Igreja Matriz',
    description: '',
    capacity: 200,
    coverKey: 'event_worship_night' as MediaKey,
    featured: false,
    published: true,
    notifyMembers: true,
  });

  // Sermon form state
  const [serForm, setSerForm] = useState({
    title: '',
    series: '',
    preacher: '',
    date: new Date().toISOString().slice(0, 10),
    duration: '30 min',
    scripture: '',
    summary: '',
    keyTakeawaysText: '',
    mediaUrl: '',
    coverKey: 'sermon_series_cover' as MediaKey,
    featured: false,
    published: true,
    notifyMembers: false,
  });

  // Member form state
  const [memForm, setMemForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    status: 'Ativo' as MemberStatus,
    ministry: 'Comunidade' as MinistryName,
    baptismDate: '',
    birthDate: '',
    joinedAt: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  // Notification composer form
  const [notForm, setNotForm] = useState({
    title: '',
    message: '',
    channel: 'banner' as NotificationChannel,
    targetGroup: 'Todos',
    activeBanner: true,
    linkLabel: 'Ver detalhes',
    linkSection: 'eventos',
  });

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<ChurchSettings | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 3500);
  }, []);

  const authHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }, [token]);

  const loadDashboard = useCallback(async () => {
    setLoadingDb(true);
    try {
      const res = await fetch('/api/admin/dashboard', {
        headers: authHeaders(),
      });
      if (res.status === 401) {
        setAuthenticated(false);
        return;
      }
      if (!res.ok) throw new Error('Falha ao carregar dados');
      const data = (await res.json()) as ChurchDatabase;
      setDb(data);
      setSettingsForm(data.settings);
      setAuthenticated(true);
    } catch {
      showToast('Erro ao carregar dados do servidor.');
    } finally {
      setLoadingDb(false);
    }
  }, [authHeaders, showToast]);

  useEffect(() => {
    async function verifySession() {
      try {
        const res = await fetch('/api/auth/session', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const contentType = res.headers.get('content-type') || '';
        if (!res.ok || !contentType.includes('application/json')) {
          setBackendUnavailable(true);
          setAuthenticated(false);
          return;
        }
        setBackendUnavailable(false);
        const json = (await res.json()) as { authenticated: boolean };
        if (json.authenticated) {
          setAuthenticated(true);
          await loadDashboard();
        } else {
          setAuthenticated(false);
        }
      } catch {
        setBackendUnavailable(true);
        setAuthenticated(false);
      } finally {
        setCheckingAuth(false);
      }
    }
    verifySession();
  }, [token, loadDashboard]);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        setBackendUnavailable(true);
        throw new Error(
          'Servidor administrativo indisponível neste endereço. O GitHub Pages hospeda apenas arquivos estáticos e não executa a API de autenticação.'
        );
      }
      setBackendUnavailable(false);
      const json = (await res.json()) as { authenticated?: boolean; token?: string; error?: string };
      if (!res.ok || !json.authenticated) {
        throw new Error(json.error || 'Senha inválida.');
      }
      if (json.token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, json.token);
        setToken(json.token);
      }
      setAuthenticated(true);
      setPasswordInput('');
      await loadDashboard();
    } catch (err) {
      if (err instanceof TypeError) {
        setBackendUnavailable(true);
        setLoginError('Não foi possível conectar ao servidor backend (/api/auth/login).');
      } else {
        setLoginError(err instanceof Error ? err.message : 'Erro ao autenticar.');
      }
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken('');
    setAuthenticated(false);
    setDb(null);
  }

  // Event CRUD handlers
  function openNewEvent() {
    setEvtForm({
      title: '',
      subtitle: '',
      category: 'Celebrações',
      date: new Date().toISOString().slice(0, 10),
      time: '19:30',
      location: 'Igreja Matriz',
      description: '',
      capacity: 200,
      coverKey: 'event_worship_night',
      featured: false,
      published: true,
      notifyMembers: true,
    });
    setEventModal({ open: true, editing: null });
  }

  function openEditEvent(evt: ChurchEvent) {
    setEvtForm({
      title: evt.title,
      subtitle: evt.subtitle,
      category: evt.category,
      date: evt.date,
      time: evt.time,
      location: evt.location,
      description: evt.description,
      capacity: evt.capacity,
      coverKey: evt.coverKey,
      featured: evt.featured,
      published: evt.published,
      notifyMembers: false,
    });
    setEventModal({ open: true, editing: evt });
  }

  async function saveEvent(e: FormEvent) {
    e.preventDefault();
    const isEdit = Boolean(eventModal.editing);
    const url = isEdit
      ? `/api/admin/events/${eventModal.editing!.id}`
      : '/api/admin/events';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: authHeaders(),
      body: JSON.stringify(evtForm),
    });
    if (!res.ok) {
      showToast('Erro ao salvar evento.');
      return;
    }
    setEventModal({ open: false, editing: null });
    await loadDashboard();
    await onPublicDataChanged();
    showToast(isEdit ? 'Evento atualizado.' : 'Evento criado com sucesso.');
  }

  async function deleteEvent(id: string) {
    const res = await fetch(`/api/admin/events/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (res.ok) {
      await loadDashboard();
      await onPublicDataChanged();
      showToast('Evento removido.');
    }
  }

  // Sermon CRUD handlers
  function openNewSermon() {
    setSerForm({
      title: '',
      series: '',
      preacher: '',
      date: new Date().toISOString().slice(0, 10),
      duration: '30 min',
      scripture: '',
      summary: '',
      keyTakeawaysText: '',
      mediaUrl: '',
      coverKey: 'sermon_series_cover',
      featured: false,
      published: true,
      notifyMembers: true,
    });
    setSermonModal({ open: true, editing: null });
  }

  function openEditSermon(sermon: Sermon) {
    setSerForm({
      title: sermon.title,
      series: sermon.series,
      preacher: sermon.preacher,
      date: sermon.date,
      duration: sermon.duration,
      scripture: sermon.scripture,
      summary: sermon.summary,
      keyTakeawaysText: sermon.keyTakeaways.join('\n'),
      mediaUrl: sermon.mediaUrl,
      coverKey: sermon.coverKey,
      featured: sermon.featured,
      published: sermon.published,
      notifyMembers: false,
    });
    setSermonModal({ open: true, editing: sermon });
  }

  async function saveSermon(e: FormEvent) {
    e.preventDefault();
    const isEdit = Boolean(sermonModal.editing);
    const url = isEdit
      ? `/api/admin/sermons/${sermonModal.editing!.id}`
      : '/api/admin/sermons';
    const method = isEdit ? 'PUT' : 'POST';

    const payload = {
      ...serForm,
      keyTakeaways: serForm.keyTakeawaysText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    };

    const res = await fetch(url, {
      method,
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      showToast('Erro ao salvar homilia.');
      return;
    }
    setSermonModal({ open: false, editing: null });
    await loadDashboard();
    await onPublicDataChanged();
    showToast(isEdit ? 'Homilia atualizada.' : 'Homilia publicada.');
  }

  async function deleteSermon(id: string) {
    const res = await fetch(`/api/admin/sermons/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (res.ok) {
      await loadDashboard();
      await onPublicDataChanged();
      showToast('Homilia removida.');
    }
  }

  // Member CRUD handlers
  function openNewMember() {
    setMemForm({
      fullName: '',
      email: '',
      phone: '',
      status: 'Ativo',
      ministry: 'Comunidade',
      baptismDate: '',
      birthDate: '',
      joinedAt: new Date().toISOString().slice(0, 10),
      notes: '',
    });
    setMemberModal({ open: true, editing: null });
  }

  function openEditMember(member: Member) {
    setMemForm({
      fullName: member.fullName,
      email: member.email,
      phone: member.phone,
      status: member.status,
      ministry: member.ministry,
      baptismDate: member.baptismDate,
      birthDate: member.birthDate,
      joinedAt: member.joinedAt,
      notes: member.notes,
    });
    setMemberModal({ open: true, editing: member });
  }

  async function saveMember(e: FormEvent) {
    e.preventDefault();
    const isEdit = Boolean(memberModal.editing);
    const url = isEdit
      ? `/api/admin/members/${memberModal.editing!.id}`
      : '/api/admin/members';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: authHeaders(),
      body: JSON.stringify(memForm),
    });
    if (!res.ok) {
      showToast('Erro ao salvar cadastro.');
      return;
    }
    setMemberModal({ open: false, editing: null });
    await loadDashboard();
    await onPublicDataChanged();
    showToast(isEdit ? 'Cadastro atualizado.' : 'Paroquiano adicionado ao cadastro.');
  }

  async function deleteMember(id: string) {
    const res = await fetch(`/api/admin/members/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (res.ok) {
      await loadDashboard();
      await onPublicDataChanged();
      showToast('Membro removido do banco.');
    }
  }

  async function downloadProtectedFile(url: string, filename: string) {
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) {
      showToast('Erro ao baixar arquivo.');
      return;
    }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }

  // Notification handlers
  async function sendNotification(e: FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/admin/notifications', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(notForm),
    });
    if (!res.ok) {
      showToast('Erro ao registrar aviso.');
      return;
    }
    if (notForm.channel === 'push') {
      await triggerBrowserNotification(notForm.title, notForm.message);
    }
    setNotForm({
      title: '',
      message: '',
      channel: 'banner',
      targetGroup: 'Todos',
      activeBanner: true,
      linkLabel: 'Ver detalhes',
      linkSection: 'eventos',
    });
    await loadDashboard();
    await onPublicDataChanged();
    showToast(
      notForm.channel === 'push'
        ? notForm.activeBanner
          ? 'Aviso publicado no site. Push de teste exibido apenas neste navegador.'
          : 'Aviso registrado. Push de teste exibido apenas neste navegador.'
        : notForm.activeBanner
          ? 'Aviso publicado no site.'
          : 'Aviso registrado na central do site.'
    );
  }

  async function toggleBanner(notification: ChurchNotification) {
    const res = await fetch(`/api/admin/notifications/${notification.id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ activeBanner: !notification.activeBanner }),
    });
    if (res.ok) {
      await loadDashboard();
      await onPublicDataChanged();
      showToast(!notification.activeBanner ? 'Banner ativado no site.' : 'Banner desativado.');
    }
  }

  async function deleteNotification(id: string) {
    const res = await fetch(`/api/admin/notifications/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (res.ok) {
      await loadDashboard();
      await onPublicDataChanged();
      showToast('Notificação removida.');
    }
  }

  async function updatePrayerStatus(id: string, status: PrayerRequest['status']) {
    const res = await fetch(`/api/admin/prayer-requests/${id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      await loadDashboard();
      showToast('Status atualizado.');
    }
  }

  async function saveSettings(e: FormEvent) {
    e.preventDefault();
    if (!settingsForm) return;
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(settingsForm),
    });
    if (res.ok) {
      await loadDashboard();
      await onPublicDataChanged();
      showToast('Configurações da paróquia salvas.');
    }
  }

  const filteredEvents = useMemo(() => {
    if (!db) return [];
    const q = eventSearch.trim().toLowerCase();
    return db.events.filter((evt) => {
      const matchesCat =
        eventCategoryFilter === 'Todas' || evt.category === eventCategoryFilter;
      const matchesQuery =
        !q ||
        evt.title.toLowerCase().includes(q) ||
        evt.location.toLowerCase().includes(q) ||
        evt.subtitle.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [db, eventCategoryFilter, eventSearch]);

  const filteredSermons = useMemo(() => {
    if (!db) return [];
    const q = sermonSearch.trim().toLowerCase();
    return db.sermons.filter((sermon) => {
      const matchesFilter =
        sermonFilter === 'Todas' ||
        (sermonFilter === 'Destaque' && sermon.featured) ||
        (sermonFilter === 'Publicadas' && sermon.published) ||
        (sermonFilter === 'Rascunhos' && !sermon.published);
      const matchesQuery =
        !q ||
        sermon.title.toLowerCase().includes(q) ||
        sermon.preacher.toLowerCase().includes(q) ||
        sermon.series.toLowerCase().includes(q) ||
        sermon.scripture.toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [db, sermonFilter, sermonSearch]);

  const filteredMembers = useMemo(() => {
    if (!db) return [];
    const q = memberSearch.trim().toLowerCase();
    return db.members.filter((m) => {
      const matchesQuery =
        !q ||
        m.fullName.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.phone.toLowerCase().includes(q);
      const matchesStatus = memberStatusFilter === 'Todos' || m.status === memberStatusFilter;
      const matchesMinistry =
        memberMinistryFilter === 'Todos' || m.ministry === memberMinistryFilter;
      return matchesQuery && matchesStatus && matchesMinistry;
    });
  }, [db, memberSearch, memberStatusFilter, memberMinistryFilter]);

  const filteredPrayerRequests = useMemo(() => {
    if (!db) return [];
    return db.prayerRequests.filter(
      (req) => prayerStatusFilter === 'Todos' || req.status === prayerStatusFilter
    );
  }, [db, prayerStatusFilter]);

  const overviewSummary = useMemo(() => {
    if (!db) return null;
    const totalRsvps = db.events.reduce(
      (acc, e) => acc + e.rsvps.reduce((s, r) => s + r.guests, 0),
      0
    );
    const totalCapacity = db.events.reduce((acc, e) => acc + (e.capacity || 0), 0);
    const publishedEvents = db.events.filter((e) => e.published).length;
    const publishedSermons = db.sermons.filter((s) => s.published).length;
    const coordinatorsCount = db.members.filter((m) => m.status === 'Coordenador').length;
    const activeMembers = db.members.filter(
      (m) => m.status === 'Ativo' || m.status === 'Coordenador'
    ).length;
    const pendingPrayers = db.prayerRequests.filter((p) => p.status === 'Pendente').length;
    const activeBanners = db.notifications.filter((n) => n.activeBanner).length;
    const foldersCount = db.folders?.length ?? 0;
    const filesCount = db.files?.length ?? 0;

    return {
      totalRsvps,
      totalCapacity,
      publishedEvents,
      publishedSermons,
      coordinatorsCount,
      activeMembers,
      pendingPrayers,
      activeBanners,
      foldersCount,
      filesCount,
    };
  }, [db]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-6">
        <p className="text-[14px] text-[#6E6E73]">Verificando sessão pastoral...</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl border border-black/[0.08] p-8 md:p-10">
          <div className="flex items-center justify-between mb-6">
            <button
              type="button"
              onClick={onExitAdmin}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#218838] hover:underline cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar ao site
            </button>
            <Lock className="w-4 h-4 text-[#6E6E73]" />
          </div>

          <h1 className="text-[24px] font-semibold tracking-tight text-[#1D1D1F]">
            Painel pastoral e gestão
          </h1>
          <p className="mt-2 text-[14px] text-[#6E6E73] leading-relaxed">
            Gerencie eventos, homilias, cadastro de paroquianos, pastas e comunicados oficiais.
          </p>

          {backendUnavailable && (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-[13px] leading-relaxed text-amber-900">
              <p className="font-semibold">Servidor backend não detectado neste endereço</p>
              <p className="mt-1">
                O GitHub Pages publica apenas arquivos estáticos e não executa o servidor{' '}
                <code className="font-mono-tabular">Express</code>. Para entrar no painel administrativo,
                execute ou hospede o projeto em um servidor Node.js (como AI Studio, Render, Railway ou VPS) com{' '}
                <code className="font-mono-tabular">npm start</code>.
              </p>
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-[#424245] mb-1.5">
                Senha administrativa
              </label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Digite a senha do painel"
                className="w-full px-4 py-2.5 rounded-xl bg-[#F5F5F7] border border-transparent text-[14px] focus:bg-white focus:outline-none focus:border-[#218838]"
              />
            </div>

            {loginError && <p className="text-[13px] font-medium text-red-600">{loginError}</p>}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#1D1D1F] text-white text-[14px] font-medium hover:bg-black disabled:opacity-50 transition-colors cursor-pointer"
            >
              {loginLoading ? 'Entrando...' : 'Entrar no painel'}
            </button>
          </form>

          <p className="mt-5 pt-5 border-t border-black/[0.06] text-[12px] text-[#6E6E73] leading-relaxed">
            Acesso restrito à equipe da secretaria paroquial. Configure uma senha segura em{' '}
            <code className="font-mono-tabular text-[#1D1D1F]">ADMIN_PASSWORD</code> no ambiente.
          </p>
        </div>
      </div>
    );
  }

  const navItems: Array<{
    id: AdminTab;
    label: string;
    icon: typeof LayoutDashboard;
    count?: number;
  }> = [
    { id: 'overview', label: 'Visão geral', icon: LayoutDashboard },
    { id: 'stats', label: 'Estatísticas', icon: BarChart3 },
    { id: 'weather', label: 'Tempo e Clima', icon: CloudLightning },
    { id: 'events', label: 'Eventos', icon: Calendar, count: db?.events.length },
    { id: 'sermons', label: 'Homilias', icon: Mic2, count: db?.sermons.length },
    { id: 'members', label: 'Paroquianos', icon: Users, count: db?.members.length },
    { id: 'files', label: 'Arquivos', icon: FolderOpen, count: db?.files?.length },
    {
      id: 'notifications',
      label: 'Notificar',
      icon: Bell,
      count: overviewSummary?.pendingPrayers || undefined,
    },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] flex flex-col lg:flex-row">
      {/* Left Sidebar (256px sticky on desktop) */}
      <aside className="w-full lg:w-[256px] lg:sticky lg:top-0 lg:h-screen bg-white border-b lg:border-b-0 lg:border-r border-black/[0.08] shrink-0 flex flex-col justify-between">
        <div className="p-5 overflow-y-auto">
          <div className="flex items-center justify-between lg:block pb-4 border-b border-black/[0.06]">
            <div>
              <p className="text-[15px] font-semibold tracking-tight text-[#1D1D1F] truncate">
                {db?.settings.churchName || 'Paróquia Rainha Santa Isabel'}
              </p>
              <p className="text-[12px] text-[#6E6E73] mt-0.5">Secretaria e gestão</p>
            </div>
            <div className="lg:hidden flex items-center gap-3">
              <button
                type="button"
                onClick={onExitAdmin}
                className="text-[13px] font-medium text-[#218838] whitespace-nowrap shrink-0"
              >
                Ver site
              </button>
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Encerrar sessão"
                className="p-1.5 rounded-lg text-[#6E6E73] hover:text-red-600"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          <nav className="mt-4 flex lg:flex-col gap-1 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#1D1D1F] text-white'
                      : 'text-[#424245] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]'
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5 min-w-0">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {typeof item.count === 'number' && item.count > 0 && (
                    <span
                      className={`text-[11px] font-medium tabular-nums ${
                        isActive
                          ? 'text-white/75'
                          : item.id === 'notifications'
                            ? 'text-[#B45309]'
                            : 'text-[#86868B]'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="hidden lg:block p-5 border-t border-black/[0.06] space-y-1.5">
          <button
            type="button"
            onClick={onExitAdmin}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] font-medium text-[#218838] hover:bg-[#F5F5F7] transition-colors cursor-pointer"
          >
            <span>Visualizar site público</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-medium text-[#6E6E73] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Encerrar sessão</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Breadcrumb Bar */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-xs border-b border-black/[0.08] px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[13px] min-w-0">
            <span className="text-[#6E6E73] whitespace-nowrap">Painel</span>
            <span className="text-[#86868B]" aria-hidden="true">
              /
            </span>
            <span className="font-semibold text-[#1D1D1F] truncate">
              {TAB_LABELS[activeTab]}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {toast && (
              <span className="text-[12px] font-medium text-[#218838] hidden sm:inline">
                {toast}
              </span>
            )}
            <button
              type="button"
              onClick={() => loadDashboard()}
              disabled={loadingDb}
              aria-label="Atualizar dados"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-black/[0.08] text-[12px] font-medium text-[#424245] hover:border-black/20 hover:text-[#1D1D1F] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingDb ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
            <button
              type="button"
              onClick={onExitAdmin}
              className="px-3.5 py-1.5 rounded-xl bg-[#1D1D1F] text-white text-[12px] font-medium hover:bg-black transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Ver site
            </button>
          </div>
        </header>

        <main className="p-6 md:p-8 max-w-[1360px] w-full mx-auto">
          {loadingDb && !db ? (
            <div className="bg-white rounded-2xl border border-black/[0.08] p-10 text-center text-[14px] text-[#6E6E73]">
              Carregando banco de dados paroquial...
            </div>
          ) : db && overviewSummary ? (
            <>
              {/* 1. OVERVIEW TAB */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h1 className="text-[22px] font-semibold tracking-tight text-[#1D1D1F]">
                        Visão geral paroquial
                      </h1>
                      <p className="text-[13px] text-[#6E6E73] mt-0.5 tabular-nums">
                        Resumo operacional de membros, celebrações, pedidos de oração e documentos.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={openNewMember}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-black/[0.08] hover:border-black/20 text-[12px] font-medium text-[#1D1D1F] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#6E6E73]" />
                        Novo paroquiano
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('notifications')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-black/[0.08] hover:border-black/20 text-[12px] font-medium text-[#1D1D1F] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5 text-[#6E6E73]" />
                        Novo aviso
                      </button>
                      <button
                        type="button"
                        onClick={openNewEvent}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#218838] text-white text-[12px] font-medium hover:bg-[#196C2E] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Novo evento
                      </button>
                    </div>
                  </div>

                  {/* Unified 4-col KPI Strip */}
                  <div className="rounded-2xl bg-white border border-black/[0.08] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-black/[0.06]">
                    <div className="p-5 sm:p-6">
                      <p className="text-[13px] font-medium text-[#6E6E73]">
                        Paroquianos cadastrados
                      </p>
                      <p className="mt-2 text-[30px] font-semibold tracking-tight text-[#1D1D1F] tabular-nums leading-none">
                        {db.members.length.toLocaleString('pt-BR')}
                      </p>
                      <p className="mt-2.5 text-[12px] text-[#218838] font-medium tabular-nums">
                        {overviewSummary.activeMembers} ativos · {overviewSummary.coordinatorsCount}{' '}
                        coord.
                      </p>
                    </div>

                    <div className="p-5 sm:p-6">
                      <p className="text-[13px] font-medium text-[#6E6E73]">Eventos publicados</p>
                      <p className="mt-2 text-[30px] font-semibold tracking-tight text-[#1D1D1F] tabular-nums leading-none">
                        {overviewSummary.publishedEvents.toLocaleString('pt-BR')}
                      </p>
                      <p className="mt-2.5 text-[12px] text-[#6E6E73] tabular-nums">
                        {overviewSummary.totalRsvps} de {overviewSummary.totalCapacity} vagas
                        confirmadas
                      </p>
                    </div>

                    <div className="p-5 sm:p-6">
                      <p className="text-[13px] font-medium text-[#6E6E73]">Acervo e arquivos</p>
                      <p className="mt-2 text-[30px] font-semibold tracking-tight text-[#1D1D1F] tabular-nums leading-none">
                        {(overviewSummary.publishedSermons + overviewSummary.filesCount).toLocaleString(
                          'pt-BR'
                        )}
                      </p>
                      <p className="mt-2.5 text-[12px] text-[#6E6E73] tabular-nums">
                        {overviewSummary.publishedSermons} homilias · {overviewSummary.filesCount}{' '}
                        arquivos em {overviewSummary.foldersCount} pastas
                      </p>
                    </div>

                    <div className="p-5 sm:p-6">
                      <p className="text-[13px] font-medium text-[#6E6E73]">
                        Cuidado pastoral e avisos
                      </p>
                      <p className="mt-2 text-[30px] font-semibold tracking-tight text-[#1D1D1F] tabular-nums leading-none">
                        {overviewSummary.pendingPrayers.toLocaleString('pt-BR')}
                      </p>
                      <p
                        className={`mt-2.5 text-[12px] tabular-nums ${
                          overviewSummary.pendingPrayers > 0
                            ? 'text-[#B45309] font-medium'
                            : 'text-[#6E6E73]'
                        }`}
                      >
                        pedidos pendentes · {db.subscribers.length} inscritos em avisos
                      </p>
                    </div>
                  </div>

                  {/* Events & Prayer Queue */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-7 bg-white rounded-2xl border border-black/[0.08] p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-[15px] font-semibold text-[#1D1D1F]">
                          Próximos eventos e ocupação
                        </h2>
                        <button
                          type="button"
                          onClick={() => setActiveTab('events')}
                          className="text-[12px] font-medium text-[#218838] hover:underline cursor-pointer"
                        >
                          Gerenciar todos
                        </button>
                      </div>
                      {db.events.length === 0 ? (
                        <div className="py-8 text-center space-y-2.5">
                          <p className="text-[13px] text-[#6E6E73]">
                            Nenhum evento cadastrado no momento.
                          </p>
                          <button
                            type="button"
                            onClick={openNewEvent}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#218838] text-white text-[12px] font-medium hover:bg-[#196C2E] cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Criar primeiro evento
                          </button>
                        </div>
                      ) : (
                        <div className="divide-y divide-black/[0.06]">
                          {db.events.slice(0, 5).map((evt) => {
                            const total = evt.rsvps.reduce((s, r) => s + r.guests, 0);
                            const pct =
                              evt.capacity > 0
                                ? Math.min(100, Math.round((total / evt.capacity) * 100))
                                : 0;
                            return (
                              <div
                                key={evt.id}
                                className="py-3 flex items-center justify-between gap-4"
                              >
                                <div className="min-w-0">
                                  <p className="text-[14px] font-medium text-[#1D1D1F] truncate">
                                    {evt.title}
                                  </p>
                                  <p className="text-[12px] text-[#6E6E73] tabular-nums truncate">
                                    {formatDatePt(evt.date)} · {evt.time} · {evt.location}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <div className="hidden sm:block w-20 h-1.5 rounded-full bg-[#F0F0F3] overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-[#218838]"
                                      style={{ width: `${Math.max(pct, total > 0 ? 6 : 0)}%` }}
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setRsvpInspectEvent(evt)}
                                    className="text-[13px] font-mono-tabular font-medium text-[#218838] hover:underline cursor-pointer"
                                  >
                                    {total}/{evt.capacity}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="lg:col-span-5 bg-white rounded-2xl border border-black/[0.08] p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-[15px] font-semibold text-[#1D1D1F]">
                          Pedidos de oração e visitas
                        </h2>
                        <button
                          type="button"
                          onClick={() => setActiveTab('notifications')}
                          className="text-[12px] font-medium text-[#218838] hover:underline cursor-pointer"
                        >
                          Ver fila completa
                        </button>
                      </div>
                      {db.prayerRequests.length === 0 ? (
                        <div className="py-8 text-center">
                          <p className="text-[13px] text-[#6E6E73]">
                            Nenhum pedido de oração ou visita pastoral recebido.
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-black/[0.06]">
                          {db.prayerRequests.slice(0, 5).map((req) => (
                            <div
                              key={req.id}
                              className="py-3 flex items-start justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <p className="text-[13px] font-medium text-[#1D1D1F] truncate">
                                  {req.name}{' '}
                                  <span className="text-[12px] font-normal text-[#6E6E73]">
                                    · {req.requestType}
                                  </span>
                                </p>
                                <p className="text-[12px] text-[#6E6E73] line-clamp-1 mt-0.5">
                                  {req.message}
                                </p>
                              </div>
                              <select
                                value={req.status}
                                aria-label={`Alterar status de ${req.name}`}
                                onChange={(e) =>
                                  updatePrayerStatus(
                                    req.id,
                                    e.target.value as PrayerRequest['status']
                                  )
                                }
                                className={`px-2.5 py-1 rounded-lg bg-[#F5F5F7] text-[12px] font-medium shrink-0 cursor-pointer ${
                                  req.status === 'Pendente'
                                    ? 'text-[#B45309]'
                                    : req.status === 'Em Oração'
                                      ? 'text-[#0066CC]'
                                      : 'text-[#218838]'
                                }`}
                              >
                                <option value="Pendente">Pendente</option>
                                <option value="Em Oração">Em Oração</option>
                                <option value="Atendido">Atendido</option>
                              </select>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Secondary Operational Strip: Recent Notices & Recent Files */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-6 bg-white rounded-2xl border border-black/[0.08] p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-[15px] font-semibold text-[#1D1D1F]">
                          Últimos comunicados no site
                        </h2>
                        <button
                          type="button"
                          onClick={() => setActiveTab('notifications')}
                          className="text-[12px] font-medium text-[#218838] hover:underline cursor-pointer"
                        >
                          Gerenciar avisos
                        </button>
                      </div>
                      {db.notifications.length === 0 ? (
                        <p className="text-[13px] text-[#6E6E73] py-4">
                          Nenhum comunicado publicado até o momento.
                        </p>
                      ) : (
                        <div className="divide-y divide-black/[0.06]">
                          {db.notifications.slice(0, 4).map((item) => (
                            <div
                              key={item.id}
                              className="py-2.5 flex items-center justify-between gap-3 text-[13px]"
                            >
                              <div className="min-w-0">
                                <p className="font-medium text-[#1D1D1F] truncate">{item.title}</p>
                                <p className="text-[12px] text-[#6E6E73] tabular-nums truncate">
                                  {item.targetGroup} · {formatDateTimePt(item.createdAt)}
                                </p>
                              </div>
                              <span
                                className={`text-[12px] font-medium shrink-0 ${
                                  item.activeBanner ? 'text-[#218838]' : 'text-[#6E6E73]'
                                }`}
                              >
                                {item.activeBanner ? 'Banner ativo' : 'Arquivado'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="lg:col-span-6 bg-white rounded-2xl border border-black/[0.08] p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-[15px] font-semibold text-[#1D1D1F]">
                          Arquivos recentes nas pastas
                        </h2>
                        <button
                          type="button"
                          onClick={() => setActiveTab('files')}
                          className="text-[12px] font-medium text-[#218838] hover:underline cursor-pointer"
                        >
                          Abrir pastas
                        </button>
                      </div>
                      {!db.files || db.files.length === 0 ? (
                        <p className="text-[13px] text-[#6E6E73] py-4">
                          Nenhum arquivo salvo nas pastas da paróquia ainda.
                        </p>
                      ) : (
                        <div className="divide-y divide-black/[0.06]">
                          {db.files.slice(0, 4).map((file) => {
                            const folder = db.folders?.find((f) => f.id === file.folderId);
                            return (
                              <div
                                key={file.id}
                                className="py-2.5 flex items-center justify-between gap-3 text-[13px]"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <FileText className="w-4 h-4 text-[#6E6E73] shrink-0" />
                                  <div className="min-w-0">
                                    <p className="font-medium text-[#1D1D1F] truncate">
                                      {file.name}
                                    </p>
                                    <p className="text-[12px] text-[#6E6E73] tabular-nums truncate">
                                      {folder?.name || 'Sem pasta'} ·{' '}
                                      {formatDatePt(file.createdAt.slice(0, 10))}
                                    </p>
                                  </div>
                                </div>
                                <span
                                  className={`text-[12px] font-medium shrink-0 ${
                                    file.published ? 'text-[#218838]' : 'text-[#6E6E73]'
                                  }`}
                                >
                                  {file.published ? 'Público' : 'Oculto'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 1B. STATS TAB */}
              {activeTab === 'stats' && <AdvancedStats db={db} />}

              {/* 1C. WEATHER TAB */}
              {activeTab === 'weather' && <WeatherForecastSection events={db.events} />}

              {/* 2. EVENTS TAB */}
              {activeTab === 'events' && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h1 className="text-[22px] font-semibold tracking-tight text-[#1D1D1F]">
                        Gerenciamento de eventos
                      </h1>
                      <p className="text-[13px] text-[#6E6E73] mt-0.5">
                        Publique celebrações especiais, encontros paroquiais e acompanhe inscrições.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={openNewEvent}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#218838] text-white text-[13px] font-medium hover:bg-[#196C2E] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      Novo evento
                    </button>
                  </div>

                  {/* Filter Bar */}
                  <div className="bg-white rounded-2xl border border-black/[0.08] p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="relative flex-1 min-w-[220px]">
                      <Search className="w-4 h-4 text-[#6E6E73] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={eventSearch}
                        onChange={(e) => setEventSearch(e.target.value)}
                        placeholder="Buscar por título ou local..."
                        className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#F5F5F7] text-[13px] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#218838]/25"
                      />
                    </div>
                    <div
                      role="group"
                      aria-label="Filtrar eventos por categoria"
                      className="inline-flex flex-wrap items-center gap-1 rounded-xl bg-[#EBEBF0] p-1"
                    >
                      {(['Todas', ...EVENT_CATEGORIES] as const).map((category) => {
                        const active = eventCategoryFilter === category;
                        return (
                          <button
                            key={category}
                            type="button"
                            onClick={() => setEventCategoryFilter(category)}
                            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                              active
                                ? 'bg-white text-[#1D1D1F] shadow-2xs'
                                : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                            }`}
                          >
                            {category}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-black/[0.08] overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-black/[0.06] bg-[#FAFAFB] text-[12px] font-medium text-[#6E6E73]">
                            <th className="py-2.5 px-5">Evento</th>
                            <th className="py-2.5 px-4">Categoria</th>
                            <th className="py-2.5 px-4">Data e horário</th>
                            <th className="py-2.5 px-4 text-right">Confirmados</th>
                            <th className="py-2.5 px-4">Status</th>
                            <th className="py-2.5 px-5 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/[0.06] text-[13px]">
                          {filteredEvents.map((evt) => {
                            const rsvpTotal = evt.rsvps.reduce((sum, r) => sum + r.guests, 0);
                            return (
                              <tr key={evt.id} className="hover:bg-[#F5F5F7]/70 transition-colors">
                                <td className="py-3 px-5">
                                  <p className="font-medium text-[#1D1D1F]">{evt.title}</p>
                                  <p className="text-[12px] text-[#6E6E73]">{evt.location}</p>
                                </td>
                                <td className="py-3 px-4 text-[#424245] whitespace-nowrap">
                                  {evt.category}
                                </td>
                                <td className="py-3 px-4 tabular-nums text-[#424245] whitespace-nowrap">
                                  {formatDatePt(evt.date)} · {evt.time}
                                </td>
                                <td className="py-3 px-4 text-right font-mono-tabular whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => setRsvpInspectEvent(evt)}
                                    className="text-[#218838] font-medium hover:underline cursor-pointer"
                                  >
                                    {rsvpTotal} / {evt.capacity}
                                  </button>
                                </td>
                                <td className="py-3 px-4 whitespace-nowrap">
                                  <span
                                    className={
                                      evt.published
                                        ? 'text-[#218838] font-medium'
                                        : 'text-[#6E6E73]'
                                    }
                                  >
                                    {evt.published ? 'Publicado' : 'Rascunho'}
                                  </span>
                                </td>
                                <td className="py-3 px-5 text-right">
                                  <div className="inline-flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => openEditEvent(evt)}
                                      aria-label={`Editar ${evt.title}`}
                                      className="p-1.5 rounded-lg hover:bg-black/[0.06] text-[#424245] transition-colors cursor-pointer"
                                      title="Editar"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deleteEvent(evt.id)}
                                      aria-label={`Excluir ${evt.title}`}
                                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors cursor-pointer"
                                      title="Excluir"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {filteredEvents.length === 0 && (
                            <tr>
                              <td colSpan={6} className="py-10 px-6 text-center text-[#6E6E73]">
                                <p>
                                  {db.events.length === 0
                                    ? 'Nenhum evento cadastrado ainda.'
                                    : 'Nenhum evento encontrado para os filtros selecionados.'}
                                </p>
                                {db.events.length === 0 && (
                                  <button
                                    type="button"
                                    onClick={openNewEvent}
                                    className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#218838] text-white text-[12px] font-medium hover:bg-[#196C2E] cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    Criar primeiro evento
                                  </button>
                                )}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. SERMONS TAB */}
              {activeTab === 'sermons' && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h1 className="text-[22px] font-semibold tracking-tight text-[#1D1D1F]">
                        Acervo de homilias e mensagens
                      </h1>
                      <p className="text-[13px] text-[#6E6E73] mt-0.5">
                        Organize ciclos litúrgicos, links de áudio/vídeo e reflexões pastorais.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={openNewSermon}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#218838] text-white text-[13px] font-medium hover:bg-[#196C2E] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      Nova homilia
                    </button>
                  </div>

                  {/* Filter Bar */}
                  <div className="bg-white rounded-2xl border border-black/[0.08] p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="relative flex-1 min-w-[220px]">
                      <Search className="w-4 h-4 text-[#6E6E73] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={sermonSearch}
                        onChange={(e) => setSermonSearch(e.target.value)}
                        placeholder="Buscar por título, celebrante ou evangelho..."
                        className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#F5F5F7] text-[13px] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#218838]/25"
                      />
                    </div>
                    <div
                      role="group"
                      aria-label="Filtrar homilias"
                      className="inline-flex flex-wrap items-center gap-1 rounded-xl bg-[#EBEBF0] p-1"
                    >
                      {(['Todas', 'Destaque', 'Publicadas', 'Rascunhos'] as const).map(
                        (option) => {
                          const active = sermonFilter === option;
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => setSermonFilter(option)}
                              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                active
                                  ? 'bg-white text-[#1D1D1F] shadow-2xs'
                                  : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                              }`}
                            >
                              {option}
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-black/[0.08] overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-black/[0.06] bg-[#FAFAFB] text-[12px] font-medium text-[#6E6E73]">
                            <th className="py-2.5 px-5">Título e ciclo</th>
                            <th className="py-2.5 px-4">Celebrante</th>
                            <th className="py-2.5 px-4">Liturgia / Evangelho</th>
                            <th className="py-2.5 px-4">Data · Duração</th>
                            <th className="py-2.5 px-4">Exibição</th>
                            <th className="py-2.5 px-5 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/[0.06] text-[13px]">
                          {filteredSermons.map((sermon) => (
                            <tr key={sermon.id} className="hover:bg-[#F5F5F7]/70 transition-colors">
                              <td className="py-3 px-5">
                                <p className="font-medium text-[#1D1D1F]">{sermon.title}</p>
                                <p className="text-[12px] text-[#6E6E73]">{sermon.series}</p>
                              </td>
                              <td className="py-3 px-4 text-[#424245] whitespace-nowrap">
                                {sermon.preacher}
                              </td>
                              <td className="py-3 px-4 text-[#424245]">{sermon.scripture}</td>
                              <td className="py-3 px-4 tabular-nums text-[#424245] whitespace-nowrap">
                                {formatDatePt(sermon.date)} · {sermon.duration}
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap text-[12px]">
                                <span
                                  className={
                                    sermon.featured
                                      ? 'text-[#218838] font-medium'
                                      : 'text-[#424245]'
                                  }
                                >
                                  {sermon.featured ? 'Principal' : 'Acervo'}
                                </span>
                                <span className="text-[#86868B]" aria-hidden="true">
                                  {' '}
                                  ·{' '}
                                </span>
                                <span className="text-[#6E6E73]">
                                  {sermon.published ? 'Publicado' : 'Rascunho'}
                                </span>
                              </td>
                              <td className="py-3 px-5 text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => openEditSermon(sermon)}
                                    aria-label={`Editar ${sermon.title}`}
                                    className="p-1.5 rounded-lg hover:bg-black/[0.06] text-[#424245] transition-colors cursor-pointer"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteSermon(sermon.id)}
                                    aria-label={`Excluir ${sermon.title}`}
                                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {filteredSermons.length === 0 && (
                            <tr>
                              <td colSpan={6} className="py-10 px-6 text-center text-[#6E6E73]">
                                <p>
                                  {db.sermons.length === 0
                                    ? 'Nenhuma homilia ou mensagem cadastrada ainda.'
                                    : 'Nenhuma homilia encontrada para os filtros aplicados.'}
                                </p>
                                {db.sermons.length === 0 && (
                                  <button
                                    type="button"
                                    onClick={openNewSermon}
                                    className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#218838] text-white text-[12px] font-medium hover:bg-[#196C2E] cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    Adicionar primeira homilia
                                  </button>
                                )}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. MEMBERS DATABASE TAB */}
              {activeTab === 'members' && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h1 className="text-[22px] font-semibold tracking-tight text-[#1D1D1F]">
                        Cadastro de paroquianos
                      </h1>
                      <p className="text-[13px] text-[#6E6E73] mt-0.5 tabular-nums">
                        {filteredMembers.length} de {db.members.length} registros exibidos ·
                        pastorais, coordenadores e datas sacramentais.
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          downloadProtectedFile(
                            '/api/admin/members/export',
                            'paroquianos-santa-isabel.csv'
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-black/[0.08] text-[#1D1D1F] text-[13px] font-medium hover:border-black/20 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Download className="w-4 h-4 text-[#6E6E73]" />
                        Exportar CSV
                      </button>
                      <button
                        type="button"
                        onClick={openNewMember}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#218838] text-white text-[13px] font-medium hover:bg-[#196C2E] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                        Novo paroquiano
                      </button>
                    </div>
                  </div>

                  {/* Filter Bar */}
                  <div className="bg-white rounded-2xl border border-black/[0.08] p-4 flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[220px]">
                      <Search className="w-4 h-4 text-[#6E6E73] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        placeholder="Buscar por nome, e-mail ou telefone..."
                        className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#F5F5F7] text-[13px] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#218838]/25"
                      />
                    </div>
                    <div
                      role="group"
                      aria-label="Filtrar por status"
                      className="inline-flex flex-wrap items-center gap-1 rounded-xl bg-[#EBEBF0] p-1"
                    >
                      {(['Todos', ...MEMBER_STATUSES] as const).map((status) => {
                        const active = memberStatusFilter === status;
                        return (
                          <button
                            key={status}
                            type="button"
                            onClick={() => setMemberStatusFilter(status)}
                            className={`px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                              active
                                ? 'bg-white text-[#1D1D1F] shadow-2xs'
                                : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                            }`}
                          >
                            {status}
                          </button>
                        );
                      })}
                    </div>
                    <select
                      value={memberMinistryFilter}
                      onChange={(e) =>
                        setMemberMinistryFilter(e.target.value as 'Todos' | MinistryName)
                      }
                      aria-label="Filtrar por pastoral"
                      className="px-3.5 py-2 rounded-xl bg-[#F5F5F7] text-[13px] font-medium"
                    >
                      <option value="Todos">Todas as pastorais</option>
                      {MINISTRIES.map((min) => (
                        <option key={min} value={min}>
                          {min}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-white rounded-2xl border border-black/[0.08] overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-black/[0.06] bg-[#FAFAFB] text-[12px] font-medium text-[#6E6E73]">
                            <th className="py-2.5 px-5">Nome e contato</th>
                            <th className="py-2.5 px-4">Pastoral</th>
                            <th className="py-2.5 px-4">Status</th>
                            <th className="py-2.5 px-4">Batismo</th>
                            <th className="py-2.5 px-4">Desde</th>
                            <th className="py-2.5 px-5 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/[0.06] text-[13px]">
                          {filteredMembers.map((member) => (
                            <tr
                              key={member.id}
                              className="hover:bg-[#F5F5F7]/70 transition-colors"
                            >
                              <td className="py-3 px-5">
                                <p className="font-medium text-[#1D1D1F]">{member.fullName}</p>
                                <p className="text-[12px] text-[#6E6E73]">
                                  {member.email || '—'} · {member.phone || '—'}
                                </p>
                              </td>
                              <td className="py-3 px-4 text-[#424245] whitespace-nowrap">
                                {member.ministry}
                              </td>
                              <td className="py-3 px-4 font-medium whitespace-nowrap">
                                <span
                                  className={
                                    member.status === 'Coordenador'
                                      ? 'text-[#0066CC]'
                                      : member.status === 'Ativo'
                                        ? 'text-[#218838]'
                                        : 'text-[#6E6E73]'
                                  }
                                >
                                  {member.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 tabular-nums text-[#424245] whitespace-nowrap">
                                {formatDatePt(member.baptismDate)}
                              </td>
                              <td className="py-3 px-4 tabular-nums text-[#424245] whitespace-nowrap">
                                {formatDatePt(member.joinedAt)}
                              </td>
                              <td className="py-3 px-5 text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => openEditMember(member)}
                                    aria-label={`Editar ${member.fullName}`}
                                    className="p-1.5 rounded-lg hover:bg-black/[0.06] text-[#424245] transition-colors cursor-pointer"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteMember(member.id)}
                                    aria-label={`Excluir ${member.fullName}`}
                                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {filteredMembers.length === 0 && (
                            <tr>
                              <td colSpan={6} className="py-10 px-6 text-center text-[#6E6E73]">
                                <p>Nenhum paroquiano encontrado com os filtros atuais.</p>
                                {(memberSearch ||
                                  memberStatusFilter !== 'Todos' ||
                                  memberMinistryFilter !== 'Todos') && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMemberSearch('');
                                      setMemberStatusFilter('Todos');
                                      setMemberMinistryFilter('Todos');
                                    }}
                                    className="mt-2.5 text-[12px] font-medium text-[#218838] hover:underline cursor-pointer"
                                  >
                                    Limpar filtros
                                  </button>
                                )}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. NOTIFICATIONS CENTER ("Notificar") */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-[22px] font-semibold tracking-tight text-[#1D1D1F]">
                      Central de avisos e cuidado pastoral
                    </h1>
                    <p className="text-[13px] text-[#6E6E73] mt-0.5">
                      Publique avisos no site e acompanhe pedidos de oração, visitas pastorais e
                      cadastros de interesse.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Composer */}
                    <form
                      onSubmit={sendNotification}
                      className="lg:col-span-5 bg-white rounded-2xl border border-black/[0.08] p-6 space-y-4"
                    >
                      <h2 className="text-[16px] font-semibold text-[#1D1D1F]">Novo comunicado</h2>

                      <div>
                        <label className="block text-[12px] font-medium text-[#424245] mb-1">
                          Título do aviso
                        </label>
                        <input
                          type="text"
                          required
                          value={notForm.title}
                          onChange={(e) => setNotForm({ ...notForm, title: e.target.value })}
                          placeholder="Ex.: Missa Solene de Ação de Graças neste Domingo"
                          className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F7] text-[13px] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#218838]/25"
                        />
                      </div>

                      <div>
                        <label className="block text-[12px] font-medium text-[#424245] mb-1">
                          Mensagem
                        </label>
                        <textarea
                          rows={3}
                          required
                          value={notForm.message}
                          onChange={(e) => setNotForm({ ...notForm, message: e.target.value })}
                          placeholder="Detalhes curtos e claros para a comunidade paroquial..."
                          className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F7] text-[13px] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#218838]/25 resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[12px] font-medium text-[#424245] mb-1">
                            Exibição
                          </label>
                          <select
                            value={notForm.channel}
                            onChange={(e) =>
                              setNotForm({
                                ...notForm,
                                channel: e.target.value as NotificationChannel,
                              })
                            }
                            className="w-full px-3 py-2 rounded-xl bg-[#F5F5F7] text-[13px]"
                          >
                            <option value="banner">Aviso no site</option>
                            <option value="push">Push de teste (neste navegador)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[12px] font-medium text-[#424245] mb-1">
                            Segmento de referência
                          </label>
                          <select
                            value={notForm.targetGroup}
                            onChange={(e) =>
                              setNotForm({ ...notForm, targetGroup: e.target.value })
                            }
                            className="w-full px-3 py-2 rounded-xl bg-[#F5F5F7] text-[13px]"
                          >
                            <option value="Todos">Toda a Comunidade</option>
                            <option value="Membros Ativos">Paroquianos Ativos</option>
                            <option value="Coordenadores">Coordenadores</option>
                            <option value="Visitantes">Visitantes</option>
                            {MINISTRIES.map((m) => (
                              <option key={m} value={m}>
                                {m === 'Comunidade' ? m : `Pastoral ${m}`}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[12px] font-medium text-[#424245] mb-1">
                            Texto do link
                          </label>
                          <input
                            type="text"
                            value={notForm.linkLabel}
                            onChange={(e) => setNotForm({ ...notForm, linkLabel: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-[#F5F5F7] text-[13px] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#218838]/25"
                          />
                        </div>
                        <div>
                          <label className="block text-[12px] font-medium text-[#424245] mb-1">
                            Seção destino
                          </label>
                          <select
                            value={notForm.linkSection}
                            onChange={(e) =>
                              setNotForm({ ...notForm, linkSection: e.target.value })
                            }
                            className="w-full px-3 py-2 rounded-xl bg-[#F5F5F7] text-[13px]"
                          >
                            <option value="missas">Horários das Missas</option>
                            <option value="catequese">Catequese</option>
                            <option value="pastorais">Pastorais</option>
                            <option value="eventos">Eventos</option>
                            <option value="homilias">Homilias &amp; Mensagens</option>
                            <option value="notificar">Notificar</option>
                          </select>
                        </div>
                      </div>

                      <label className="flex items-center gap-2 text-[13px] text-[#424245] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notForm.activeBanner}
                          onChange={(e) =>
                            setNotForm({ ...notForm, activeBanner: e.target.checked })
                          }
                          className="rounded"
                        />
                        Exibir imediatamente como banner no topo do site
                      </label>

                      <div className="flex flex-wrap gap-2.5 pt-2">
                        <button
                          type="submit"
                          className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#218838] text-white text-[13px] font-medium hover:bg-[#196C2E] transition-colors cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Registrar aviso
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const ok = await triggerBrowserNotification(
                              notForm.title || db.settings.churchName,
                              notForm.message || 'Prévia de notificação push da paróquia.'
                            );
                            showToast(
                              ok
                                ? 'Push de teste exibido neste navegador.'
                                : 'Permita notificações neste navegador para testar.'
                            );
                          }}
                          className="py-2.5 px-4 rounded-xl bg-[#F5F5F7] text-[#1D1D1F] text-[13px] font-medium hover:bg-neutral-200 transition-colors cursor-pointer"
                        >
                          Testar push
                        </button>
                      </div>
                    </form>

                    {/* History & Subscribers */}
                    <div className="lg:col-span-7 space-y-6">
                      <div className="bg-white rounded-2xl border border-black/[0.08] p-6">
                        <div className="flex items-baseline justify-between gap-2 mb-4">
                          <h2 className="text-[16px] font-semibold text-[#1D1D1F]">
                            Histórico de avisos
                          </h2>
                          <span className="text-[12px] text-[#6E6E73] tabular-nums">
                            {db.notifications.length} registros
                          </span>
                        </div>
                        {db.notifications.length === 0 ? (
                          <p className="text-[13px] text-[#6E6E73] py-4">
                            Nenhum aviso registrado até o momento.
                          </p>
                        ) : (
                          <div className="divide-y divide-black/[0.06]">
                            {db.notifications.map((item) => (
                              <div
                                key={item.id}
                                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                              >
                                <div className="min-w-0">
                                  <p className="text-[14px] font-medium text-[#1D1D1F]">
                                    {item.title}
                                  </p>
                                  <p className="text-[13px] text-[#6E6E73]">{item.message}</p>
                                  <p className="mt-1 text-[12px] text-[#86868B] tabular-nums">
                                    {item.targetGroup} · {item.recipientCount} cadastros ·{' '}
                                    {formatDateTimePt(item.createdAt)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => toggleBanner(item)}
                                    className={`px-3 py-1.5 rounded-xl text-[12px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                                      item.activeBanner
                                        ? 'bg-[#1D1D1F] text-white'
                                        : 'bg-[#F5F5F7] text-[#424245] hover:bg-neutral-200'
                                    }`}
                                  >
                                    {item.activeBanner ? 'Banner ativo' : 'Fixar banner'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteNotification(item.id)}
                                    aria-label={`Excluir aviso ${item.title}`}
                                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Prayer Requests & Visits */}
                      <div className="bg-white rounded-2xl border border-black/[0.08] p-6">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                          <div className="flex items-center gap-2">
                            <HeartHandshake className="w-4 h-4 text-[#218838]" />
                            <h2 className="text-[16px] font-semibold text-[#1D1D1F]">
                              Pedidos de oração e visitas ({filteredPrayerRequests.length})
                            </h2>
                          </div>
                          <div
                            role="group"
                            aria-label="Filtrar pedidos de oração"
                            className="inline-flex items-center gap-1 rounded-xl bg-[#EBEBF0] p-1"
                          >
                            {(['Todos', 'Pendente', 'Em Oração', 'Atendido'] as const).map(
                              (st) => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => setPrayerStatusFilter(st)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                    prayerStatusFilter === st
                                      ? 'bg-white text-[#1D1D1F] shadow-2xs'
                                      : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                                  }`}
                                >
                                  {st}
                                </button>
                              )
                            )}
                          </div>
                        </div>

                        {filteredPrayerRequests.length === 0 ? (
                          <p className="text-[13px] text-[#6E6E73] py-4">
                            {db.prayerRequests.length === 0
                              ? 'Nenhum pedido de oração ou visita pastoral recebido.'
                              : 'Nenhum pedido encontrado com esse status.'}
                          </p>
                        ) : (
                          <div className="divide-y divide-black/[0.06]">
                            {filteredPrayerRequests.map((req) => (
                              <div key={req.id} className="py-3.5 space-y-1.5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-[14px] font-medium text-[#1D1D1F]">
                                    {req.name}{' '}
                                    <span className="text-[12px] font-normal text-[#6E6E73]">
                                      · {req.requestType} · {req.phone || req.email || 'Sem contato'}
                                    </span>
                                  </p>
                                  <select
                                    value={req.status}
                                    onChange={(e) =>
                                      updatePrayerStatus(
                                        req.id,
                                        e.target.value as PrayerRequest['status']
                                      )
                                    }
                                    className={`px-2.5 py-1 rounded-lg bg-[#F5F5F7] text-[12px] font-medium cursor-pointer ${
                                      req.status === 'Pendente'
                                        ? 'text-[#B45309]'
                                        : req.status === 'Em Oração'
                                          ? 'text-[#0066CC]'
                                          : 'text-[#218838]'
                                    }`}
                                  >
                                    <option value="Pendente">Pendente</option>
                                    <option value="Em Oração">Em Oração</option>
                                    <option value="Atendido">Atendido</option>
                                  </select>
                                </div>
                                <p className="text-[13px] text-[#424245]">{req.message}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Opt-in Subscribers */}
                      <div className="bg-white rounded-2xl border border-black/[0.08] p-6">
                        <div className="flex items-baseline justify-between gap-2 mb-3">
                          <h2 className="text-[16px] font-semibold text-[#1D1D1F]">
                            Cadastros de interesse em avisos
                          </h2>
                          <span className="text-[12px] text-[#6E6E73] tabular-nums">
                            {db.subscribers.length} inscritos
                          </span>
                        </div>
                        {db.subscribers.length === 0 ? (
                          <p className="text-[13px] text-[#6E6E73] py-3">
                            Nenhum cadastro de interesse em avisos até o momento.
                          </p>
                        ) : (
                          <div className="divide-y divide-black/[0.06] text-[13px]">
                            {db.subscribers.map((sub) => (
                              <div
                                key={sub.id}
                                className="py-2.5 flex flex-wrap items-center justify-between gap-2"
                              >
                                <div>
                                  <span className="font-medium text-[#1D1D1F]">{sub.name}</span>
                                  <span className="text-[#6E6E73]">
                                    {' '}
                                    · {sub.email || sub.phone}
                                  </span>
                                </div>
                                <span className="text-[12px] text-[#6E6E73]">
                                  {sub.topics.join(', ')}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* FILES TAB (GLASS FOLDER) */}
              {activeTab === 'files' && (
                <AdminFilesTab
                  folders={db.folders || []}
                  files={db.files || []}
                  authHeaders={authHeaders}
                  onChanged={async () => {
                    await loadDashboard();
                    await onPublicDataChanged();
                  }}
                  showToast={showToast}
                />
              )}

              {/* 6. SETTINGS & SELF-HOSTING TAB */}
              {activeTab === 'settings' && settingsForm && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-[22px] font-semibold tracking-tight text-[#1D1D1F]">
                      Configurações e publicação
                    </h1>
                    <p className="text-[13px] text-[#6E6E73] mt-0.5">
                      Atualize dados públicos da paróquia, horários de missas, canais de contato e
                      backups.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    <form
                      onSubmit={saveSettings}
                      className="lg:col-span-7 bg-white rounded-2xl border border-black/[0.08] p-6 space-y-4"
                    >
                      <h2 className="text-[16px] font-semibold text-[#1D1D1F]">
                        Identidade e horários da paróquia
                      </h2>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[12px] font-medium text-[#424245] mb-1">
                            Nome da Paróquia
                          </label>
                          <input
                            type="text"
                            value={settingsForm.churchName}
                            onChange={(e) =>
                              setSettingsForm({ ...settingsForm, churchName: e.target.value })
                            }
                            className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F7] text-[13px] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#218838]/25"
                          />
                        </div>
                        <div>
                          <label className="block text-[12px] font-medium text-[#424245] mb-1">
                            Bairro / Cidade
                          </label>
                          <input
                            type="text"
                            value={settingsForm.city}
                            onChange={(e) =>
                              setSettingsForm({ ...settingsForm, city: e.target.value })
                            }
                            className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F7] text-[13px] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#218838]/25"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[12px] font-medium text-[#424245] mb-1">
                          Endereço completo
                        </label>
                        <input
                          type="text"
                          value={settingsForm.address}
                          onChange={(e) =>
                            setSettingsForm({ ...settingsForm, address: e.target.value })
                          }
                          className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F7] text-[13px] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#218838]/25"
                        />
                      </div>

                      <div>
                        <label className="block text-[12px] font-medium text-[#424245] mb-1">
                          Horários das Missas (uma linha por informação)
                        </label>
                        <textarea
                          rows={6}
                          value={settingsForm.serviceTimes}
                          onChange={(e) =>
                            setSettingsForm({ ...settingsForm, serviceTimes: e.target.value })
                          }
                          placeholder={
                            'Igreja Matriz\nPrimeira sexta-feira do mês: 15h\nQuarta-feira: 19h30\nDomingo: 8h, 10h e 18h\n\nCapela Maranata\nDomingo: 11h30'
                          }
                          className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F7] text-[13px] resize-y focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#218838]/25"
                        />
                        <p className="mt-1 text-[11px] text-[#6E6E73]">
                          Sincronizado automaticamente com o resumo inicial (Hero), a seção de
                          Horários e o Calendário do site.
                        </p>
                      </div>

                      <div>
                        <label className="block text-[12px] font-medium text-[#424245] mb-1">
                          Título principal (Hero)
                        </label>
                        <input
                          type="text"
                          value={settingsForm.heroTitle}
                          onChange={(e) =>
                            setSettingsForm({ ...settingsForm, heroTitle: e.target.value })
                          }
                          className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F7] text-[13px] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#218838]/25"
                        />
                      </div>

                      <div>
                        <label className="block text-[12px] font-medium text-[#424245] mb-1">
                          Subtítulo (Hero)
                        </label>
                        <textarea
                          rows={2}
                          value={settingsForm.heroSubtitle}
                          onChange={(e) =>
                            setSettingsForm({ ...settingsForm, heroSubtitle: e.target.value })
                          }
                          className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F7] text-[13px] resize-none focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#218838]/25"
                        />
                      </div>

                      <div className="pt-2 border-t border-black/[0.06] space-y-4">
                        <h3 className="text-[14px] font-semibold text-[#1D1D1F]">
                          Secretaria e canais de atendimento
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label
                              htmlFor="settings-phone"
                              className="block text-[12px] font-medium text-[#424245] mb-1"
                            >
                              Telefone da Secretaria
                            </label>
                            <input
                              id="settings-phone"
                              type="tel"
                              value={settingsForm.contactPhone || ''}
                              onChange={(e) =>
                                setSettingsForm({ ...settingsForm, contactPhone: e.target.value })
                              }
                              placeholder="(11) 3857-5051"
                              className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F7] text-[13px] tabular-nums focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#218838]/25"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor="settings-whatsapp"
                              className="mb-1 flex w-fit items-center gap-2 text-[12px] font-medium text-[#424245]"
                            >
                              <img
                                src={whatsappIcon}
                                alt=""
                                aria-hidden="true"
                                className="h-4 w-4"
                              />
                              WhatsApp da Secretaria
                            </label>
                            <input
                              id="settings-whatsapp"
                              type="tel"
                              value={settingsForm.whatsappNumber}
                              onChange={(e) =>
                                setSettingsForm({ ...settingsForm, whatsappNumber: e.target.value })
                              }
                              placeholder="(11) 99999-9999"
                              className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F7] text-[13px] tabular-nums focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#218838]/25"
                            />
                            <p className="mt-1 text-[11px] text-[#6E6E73]">
                              DDD + número (ex: 11 99999-9999). Deixe vazio para ocultar.
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label
                              htmlFor="settings-hours-weekdays"
                              className="block text-[12px] font-medium text-[#424245] mb-1"
                            >
                              Expediente (Terça a Sexta)
                            </label>
                            <input
                              id="settings-hours-weekdays"
                              type="text"
                              value={settingsForm.officeHoursWeekdays || ''}
                              onChange={(e) =>
                                setSettingsForm({
                                  ...settingsForm,
                                  officeHoursWeekdays: e.target.value,
                                })
                              }
                              placeholder="8h às 18h"
                              className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F7] text-[13px] tabular-nums focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#218838]/25"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor="settings-hours-note"
                              className="block text-[12px] font-medium text-[#424245] mb-1"
                            >
                              Observação do expediente
                            </label>
                            <input
                              id="settings-hours-note"
                              type="text"
                              value={settingsForm.officeHoursWeekdaysNote ?? ''}
                              onChange={(e) =>
                                setSettingsForm({
                                  ...settingsForm,
                                  officeHoursWeekdaysNote: e.target.value,
                                })
                              }
                              placeholder="fechada durante o almoço"
                              className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F7] text-[13px] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#218838]/25"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor="settings-hours-saturday"
                              className="block text-[12px] font-medium text-[#424245] mb-1"
                            >
                              Expediente (Sábados)
                            </label>
                            <input
                              id="settings-hours-saturday"
                              type="text"
                              value={settingsForm.officeHoursSaturday || ''}
                              onChange={(e) =>
                                setSettingsForm({
                                  ...settingsForm,
                                  officeHoursSaturday: e.target.value,
                                })
                              }
                              placeholder="9h às 12h"
                              className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F7] text-[13px] tabular-nums focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#218838]/25"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[12px] font-medium text-[#424245] mb-1">
                              E-mail da Secretaria
                            </label>
                            <input
                              type="email"
                              value={settingsForm.contactEmail}
                              onChange={(e) =>
                                setSettingsForm({ ...settingsForm, contactEmail: e.target.value })
                              }
                              className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F7] text-[13px] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#218838]/25"
                            />
                          </div>
                          <div>
                            <label className="block text-[12px] font-medium text-[#424245] mb-1">
                              Link Canal / Transmissão
                            </label>
                            <input
                              type="url"
                              value={settingsForm.liveStreamUrl}
                              onChange={(e) =>
                                setSettingsForm({ ...settingsForm, liveStreamUrl: e.target.value })
                              }
                              className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F7] text-[13px] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#218838]/25"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          className="px-5 py-2.5 rounded-xl bg-[#218838] text-white text-[13px] font-medium hover:bg-[#196C2E] transition-colors cursor-pointer"
                        >
                          Salvar configurações
                        </button>
                      </div>
                    </form>

                    <div className="lg:col-span-5 space-y-5">
                      <div className="bg-white rounded-2xl border border-black/[0.08] p-6">
                        <h3 className="text-[16px] font-semibold text-[#1D1D1F]">
                          Backup do banco de dados
                        </h3>
                        <p className="mt-1.5 text-[13px] text-[#6E6E73] leading-relaxed">
                          Todos os paroquianos, eventos, homilias e comunicados ficam salvos em
                          arquivo persistente no servidor. Baixe uma cópia completa em JSON a
                          qualquer momento.
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            downloadProtectedFile(
                              '/api/admin/backup',
                              'paroquia-santa-isabel-backup.json'
                            )
                          }
                          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1D1D1F] text-white text-[13px] font-medium hover:bg-black transition-colors cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                          Baixar backup JSON
                        </button>
                      </div>

                      <div className="bg-white rounded-2xl border border-black/[0.08] p-6">
                        <h3 className="text-[16px] font-semibold text-[#1D1D1F]">
                          Publicação e ambiente
                        </h3>
                        <p className="mt-1.5 text-[13px] text-[#6E6E73] leading-relaxed">
                          Comandos padrão de execução para implantação em servidor Node.js 22+:
                        </p>
                        <div className="mt-3 pt-3 border-t border-black/[0.06] font-mono-tabular text-[12px] text-[#1D1D1F] space-y-1">
                          <p>Build: npm install &amp;&amp; npm run build</p>
                          <p>Start: npm start</p>
                          <p>Healthcheck: /api/health</p>
                        </div>
                        <p className="mt-3 text-[12px] text-[#6E6E73] leading-relaxed">
                          Configure as variáveis{' '}
                          <code className="text-[#1D1D1F]">ADMIN_PASSWORD</code>,{' '}
                          <code className="text-[#1D1D1F]">SESSION_SECRET</code> e monte um volume
                          persistente no caminho definido em{' '}
                          <code className="text-[#1D1D1F]">DATA_FILE</code>.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </main>
      </div>

      {/* Event Modal */}
      {eventModal.open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setEventModal({ open: false, editing: null })}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 border border-black/[0.08] max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[18px] font-semibold text-[#1D1D1F]">
                {eventModal.editing ? 'Editar evento' : 'Novo evento'}
              </h3>
              <button
                type="button"
                onClick={() => setEventModal({ open: false, editing: null })}
                aria-label="Fechar"
                className="p-1.5 rounded-xl bg-[#F5F5F7] hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={saveEvent} className="space-y-3.5">
              <div>
                <label className="block text-[12px] font-medium text-[#424245] mb-1">
                  Título do evento
                </label>
                <input
                  type="text"
                  required
                  value={evtForm.title}
                  onChange={(e) => setEvtForm({ ...evtForm, title: e.target.value })}
                  placeholder="Ex.: Missa da Juventude"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F7] text-[13px] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#218838]/25"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#424245] mb-1">
                  Subtítulo curto
                </label>
                <input
                  type="text"
                  value={evtForm.subtitle}
                  onChange={(e) => setEvtForm({ ...evtForm, subtitle: e.target.value })}
                  placeholder="Resumo em uma linha"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F7] text-[13px] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#218838]/25"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#424245] mb-1">
                    Categoria
                  </label>
                  <select
                    value={evtForm.category}
                    onChange={(e) =>
                      setEvtForm({ ...evtForm, category: e.target.value as EventCategory })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#F5F5F7] text-[13px]"
                  >
                    {EVENT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#424245] mb-1">Data</label>
                  <input
                    type="date"
                    required
                    value={evtForm.date}
                    onChange={(e) => setEvtForm({ ...evtForm, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#F5F5F7] text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#424245] mb-1">
                    Horário
                  </label>
                  <input
                    type="time"
                    required
                    value={evtForm.time}
                    onChange={(e) => setEvtForm({ ...evtForm, time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#F5F5F7] text-[13px]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#424245] mb-1">
                    Local
                  </label>
                  <input
                    type="text"
                    value={evtForm.location}
                    onChange={(e) => setEvtForm({ ...evtForm, location: e.target.value })}
                    placeholder="Local"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F7] text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#424245] mb-1">
                    Capacidade (vagas)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={evtForm.capacity}
                    onChange={(e) => setEvtForm({ ...evtForm, capacity: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F7] text-[13px] tabular-nums"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#424245] mb-1">
                  Capa do evento
                </label>
                <select
                  value={evtForm.coverKey}
                  onChange={(e) => setEvtForm({ ...evtForm, coverKey: e.target.value as MediaKey })}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F7] text-[13px]"
                >
                  {MEDIA_KEYS.map((m) => (
                    <option key={m.value} value={m.value}>
                      Imagem: {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#424245] mb-1">
                  Descrição completa
                </label>
                <textarea
                  rows={3}
                  value={evtForm.description}
                  onChange={(e) => setEvtForm({ ...evtForm, description: e.target.value })}
                  placeholder="Informações sobre o evento"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F7] text-[13px] resize-none"
                />
              </div>
              <div className="flex flex-wrap gap-4 text-[13px] text-[#424245]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={evtForm.published}
                    onChange={(e) => setEvtForm({ ...evtForm, published: e.target.checked })}
                  />
                  Publicado no site
                </label>
                {!eventModal.editing && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={evtForm.notifyMembers}
                      onChange={(e) => setEvtForm({ ...evtForm, notifyMembers: e.target.checked })}
                    />
                    Publicar aviso no site ao criar
                  </label>
                )}
              </div>
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-[#218838] text-white text-[14px] font-medium hover:bg-[#196C2E] transition-colors cursor-pointer"
              >
                Salvar evento
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Event RSVP Inspector Modal */}
      {rsvpInspectEvent && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setRsvpInspectEvent(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 border border-black/[0.08] max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[18px] font-semibold text-[#1D1D1F]">
                  {rsvpInspectEvent.title}
                </h3>
                <p className="text-[12px] text-[#6E6E73] tabular-nums">
                  Lista de presenças confirmadas ({rsvpInspectEvent.rsvps.length} registros)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRsvpInspectEvent(null)}
                aria-label="Fechar"
                className="p-1.5 rounded-xl bg-[#F5F5F7] hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {rsvpInspectEvent.rsvps.length === 0 ? (
              <p className="text-[13px] text-[#6E6E73] py-6 text-center">
                Nenhuma confirmação recebida até o momento.
              </p>
            ) : (
              <div className="divide-y divide-black/[0.06] text-[13px]">
                {rsvpInspectEvent.rsvps.map((r) => (
                  <div key={r.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-[#1D1D1F]">{r.name}</p>
                      <p className="text-[12px] text-[#6E6E73]">
                        {r.email} · {r.phone || 'Sem telefone'}
                      </p>
                    </div>
                    <span className="font-mono-tabular text-[12px] font-medium text-[#1D1D1F]">
                      {r.guests} {r.guests === 1 ? 'vaga' : 'vagas'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Homily / Sermon Modal */}
      {sermonModal.open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSermonModal({ open: false, editing: null })}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 border border-black/[0.08] max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[18px] font-semibold text-[#1D1D1F]">
                {sermonModal.editing ? 'Editar homilia' : 'Nova homilia ou mensagem'}
              </h3>
              <button
                type="button"
                onClick={() => setSermonModal({ open: false, editing: null })}
                aria-label="Fechar"
                className="p-1.5 rounded-xl bg-[#F5F5F7] hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={saveSermon} className="space-y-3.5">
              <div>
                <label className="block text-[12px] font-medium text-[#424245] mb-1">
                  Título da homilia ou mensagem
                </label>
                <input
                  type="text"
                  required
                  value={serForm.title}
                  onChange={(e) => setSerForm({ ...serForm, title: e.target.value })}
                  placeholder="Ex.: Esperança e Comunhão"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F7] text-[13px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#424245] mb-1">
                    Ciclo litúrgico / Tema
                  </label>
                  <input
                    type="text"
                    value={serForm.series}
                    onChange={(e) => setSerForm({ ...serForm, series: e.target.value })}
                    placeholder="Tempo Comum"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F7] text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#424245] mb-1">
                    Celebrante / Sacerdote
                  </label>
                  <input
                    type="text"
                    required
                    value={serForm.preacher}
                    onChange={(e) => setSerForm({ ...serForm, preacher: e.target.value })}
                    placeholder="Nome do celebrante"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F7] text-[13px]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#424245] mb-1">Data</label>
                  <input
                    type="date"
                    value={serForm.date}
                    onChange={(e) => setSerForm({ ...serForm, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#F5F5F7] text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#424245] mb-1">
                    Duração
                  </label>
                  <input
                    type="text"
                    value={serForm.duration}
                    onChange={(e) => setSerForm({ ...serForm, duration: e.target.value })}
                    placeholder="Ex.: 20 min"
                    className="w-full px-3 py-2 rounded-xl bg-[#F5F5F7] text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#424245] mb-1">
                    Evangelho
                  </label>
                  <input
                    type="text"
                    value={serForm.scripture}
                    onChange={(e) => setSerForm({ ...serForm, scripture: e.target.value })}
                    placeholder="Ex.: Lc 10, 1-12"
                    className="w-full px-3 py-2 rounded-xl bg-[#F5F5F7] text-[13px]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#424245] mb-1">
                  URL de áudio ou vídeo
                </label>
                <input
                  type="url"
                  value={serForm.mediaUrl}
                  onChange={(e) => setSerForm({ ...serForm, mediaUrl: e.target.value })}
                  placeholder="YouTube, Spotify ou link externo"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F7] text-[13px]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#424245] mb-1">Resumo</label>
                <textarea
                  rows={2}
                  value={serForm.summary}
                  onChange={(e) => setSerForm({ ...serForm, summary: e.target.value })}
                  placeholder="Resumo da homilia"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F7] text-[13px] resize-none"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#424245] mb-1">
                  Pontos de reflexão (um por linha)
                </label>
                <textarea
                  rows={3}
                  value={serForm.keyTakeawaysText}
                  onChange={(e) => setSerForm({ ...serForm, keyTakeawaysText: e.target.value })}
                  placeholder="Um ponto por linha"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F7] text-[13px] resize-none"
                />
              </div>
              <div className="flex flex-wrap gap-4 text-[13px] text-[#424245]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={serForm.featured}
                    onChange={(e) => setSerForm({ ...serForm, featured: e.target.checked })}
                  />
                  Destaque principal
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={serForm.published}
                    onChange={(e) => setSerForm({ ...serForm, published: e.target.checked })}
                  />
                  Publicado
                </label>
                {!sermonModal.editing && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={serForm.notifyMembers}
                      onChange={(e) => setSerForm({ ...serForm, notifyMembers: e.target.checked })}
                    />
                    Publicar aviso no site ao criar
                  </label>
                )}
              </div>
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-[#218838] text-white text-[14px] font-medium hover:bg-[#196C2E] transition-colors cursor-pointer"
              >
                Salvar homilia
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Member Modal */}
      {memberModal.open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setMemberModal({ open: false, editing: null })}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 border border-black/[0.08] max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[18px] font-semibold text-[#1D1D1F]">
                {memberModal.editing ? 'Editar cadastro' : 'Novo paroquiano'}
              </h3>
              <button
                type="button"
                onClick={() => setMemberModal({ open: false, editing: null })}
                aria-label="Fechar"
                className="p-1.5 rounded-xl bg-[#F5F5F7] hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={saveMember} className="space-y-3.5">
              <div>
                <label className="block text-[12px] font-medium text-[#424245] mb-1">
                  Nome completo
                </label>
                <input
                  type="text"
                  required
                  value={memForm.fullName}
                  onChange={(e) => setMemForm({ ...memForm, fullName: e.target.value })}
                  placeholder="Nome completo"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F7] text-[13px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#424245] mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={memForm.email}
                    onChange={(e) => setMemForm({ ...memForm, email: e.target.value })}
                    placeholder="email@exemplo.com"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F7] text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#424245] mb-1">
                    WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={memForm.phone}
                    onChange={(e) => setMemForm({ ...memForm, phone: e.target.value })}
                    placeholder="(11) 99999-9999"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F7] text-[13px]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[#424245] mb-1">
                    Status
                  </label>
                  <select
                    value={memForm.status}
                    onChange={(e) =>
                      setMemForm({ ...memForm, status: e.target.value as MemberStatus })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F7] text-[13px]"
                  >
                    {MEMBER_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[#424245] mb-1">
                    Pastoral
                  </label>
                  <select
                    value={memForm.ministry}
                    onChange={(e) =>
                      setMemForm({ ...memForm, ministry: e.target.value as MinistryName })
                    }
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F7] text-[13px]"
                  >
                    {!MINISTRIES.includes(memForm.ministry) && (
                      <option value={memForm.ministry}>
                        Categoria cadastrada: {memForm.ministry} (a confirmar)
                      </option>
                    )}
                    {MINISTRIES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#6E6E73] mb-1">
                    Nascimento
                  </label>
                  <input
                    type="date"
                    value={memForm.birthDate}
                    onChange={(e) => setMemForm({ ...memForm, birthDate: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl bg-[#F5F5F7] text-[12px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#6E6E73] mb-1">
                    Batismo
                  </label>
                  <input
                    type="date"
                    value={memForm.baptismDate}
                    onChange={(e) => setMemForm({ ...memForm, baptismDate: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl bg-[#F5F5F7] text-[12px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#6E6E73] mb-1">
                    Participa desde
                  </label>
                  <input
                    type="date"
                    value={memForm.joinedAt}
                    onChange={(e) => setMemForm({ ...memForm, joinedAt: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl bg-[#F5F5F7] text-[12px]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#424245] mb-1">
                  Observações pastorais
                </label>
                <textarea
                  rows={2}
                  value={memForm.notes}
                  onChange={(e) => setMemForm({ ...memForm, notes: e.target.value })}
                  placeholder="Anotações internas da secretaria"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F5F5F7] text-[13px] resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-[#218838] text-white text-[14px] font-medium hover:bg-[#196C2E] transition-colors cursor-pointer"
              >
                <Check className="w-4 h-4 inline mr-1.5" />
                Salvar cadastro
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
