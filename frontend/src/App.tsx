import { useCallback, useEffect, useState } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { BlindPullToggle } from './components/BlindPullToggle';
import {
  ParishionerAuthPage,
  type ParishionerAuthMode,
} from './components/ParishionerAuthPage';
import { PublicSite, type PublicOverviewData } from './components/PublicSite';
import { FALLBACK_OVERVIEW_DATA } from './lib/fallbackData';
import type { SafeParishioner } from './types/church';

type AppView = 'public' | 'admin' | 'account';

function resolveViewFromHash(hash: string): AppView {
  if (hash === '#admin') return 'admin';
  if (hash === '#conta' || hash === '#login' || hash === '#cadastro') return 'account';
  return 'public';
}

export default function App() {
  const [view, setView] = useState<AppView>(() => resolveViewFromHash(window.location.hash));
  const [authMode, setAuthMode] = useState<ParishionerAuthMode>(() =>
    window.location.hash === '#login' ? 'login' : 'register',
  );
  const [parishioner, setParishioner] = useState<SafeParishioner | null>(null);
  const [overview, setOverview] = useState<PublicOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch('/api/public/overview');
      if (!res.ok) throw new Error('Falha ao conectar com o servidor.');
      const data = (await res.json()) as PublicOverviewData;
      setOverview(data);
      setError('');
    } catch {
      // Quando a API estiver indisponível (ex: GitHub Pages sem backend),
      // usamos os dados padrão da paróquia para o site funcionar perfeitamente
      setOverview(FALLBACK_OVERVIEW_DATA);
      setError('');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchParishionerSession = useCallback(async () => {
    try {
      const res = await fetch('/api/parishioner/me');
      if (!res.ok) return;
      const json = (await res.json()) as {
        authenticated?: boolean;
        account?: SafeParishioner | null;
      };
      setParishioner(json.authenticated && json.account ? json.account : null);
    } catch {
      // ignore session check network errors
    }
  }, []);

  useEffect(() => {
    fetchOverview();
    fetchParishionerSession();
  }, [fetchOverview, fetchParishionerSession]);

  useEffect(() => {
    function onHashChange() {
      const nextHash = window.location.hash;
      if (nextHash === '#login') setAuthMode('login');
      else if (nextHash === '#cadastro') setAuthMode('register');
      setView(resolveViewFromHash(nextHash));
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  function openAdmin() {
    window.location.hash = 'admin';
    setView('admin');
    window.scrollTo({ top: 0 });
  }

  function exitAdmin() {
    window.location.hash = '';
    setView('public');
    window.scrollTo({ top: 0 });
  }

  function openAccount(mode: ParishionerAuthMode = 'register') {
    setAuthMode(mode);
    window.location.hash = 'conta';
    setView('account');
    window.scrollTo({ top: 0 });
  }

  function exitAccount(sectionHash?: string) {
    window.location.hash = sectionHash ? sectionHash.replace(/^#/, '') : '';
    setView('public');
    if (sectionHash) {
      const targetId = sectionHash.replace(/^#/, '');
      setTimeout(() => {
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } else {
      window.scrollTo({ top: 0 });
    }
  }

  async function handleLogoutParishioner() {
    try {
      await fetch('/api/parishioner/logout', { method: 'POST' });
    } finally {
      setParishioner(null);
    }
  }

  const togglePositionClass =
    view === 'admin'
      ? 'fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40'
      : 'fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-40';

  return (
    <>
      {view === 'admin' ? (
        <AdminDashboard onExitAdmin={exitAdmin} onPublicDataChanged={fetchOverview} />
      ) : view === 'account' ? (
        <ParishionerAuthPage
          initialMode={authMode}
          account={parishioner}
          onAuthenticated={(account) => {
            setParishioner(account);
            fetchOverview();
          }}
          onLoggedOut={() => setParishioner(null)}
          onBackToSite={exitAccount}
        />
      ) : loading ? (
        <div className="min-h-screen bg-white flex items-center justify-center p-6">
          <div className="text-center space-y-2">
            <p className="text-[17px] font-semibold tracking-tight text-[#1D1D1F]">
              Paróquia Rainha Santa Isabel
            </p>
            <p className="text-[13px] text-[#6E6E73]">Carregando...</p>
          </div>
        </div>
      ) : error || !overview ? (
        <div className="min-h-screen bg-white flex items-center justify-center p-6">
          <div className="max-w-sm text-center space-y-4">
            <p className="text-[16px] font-semibold text-[#1D1D1F]">
              Não foi possível conectar ao servidor
            </p>
            <p className="text-[13px] text-[#6E6E73]">{error}</p>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                fetchOverview();
              }}
              className="px-5 py-2.5 rounded-full bg-[#218838] text-white text-[13px] font-medium hover:bg-[#196C2E] cursor-pointer"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      ) : (
        <PublicSite
          data={overview}
          parishioner={parishioner}
          onOpenAdmin={openAdmin}
          onOpenAccount={openAccount}
          onLogoutParishioner={handleLogoutParishioner}
          onRefresh={fetchOverview}
        />
      )}

      <BlindPullToggle className={togglePositionClass} />
    </>
  );
}
