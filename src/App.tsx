import { useEffect, useState } from 'react';
import {
  fetchCampaign,
  fetchSession,
  getStoredToken,
  setStoredToken,
  type AuthSession,
} from './api';
import { AdminPanel } from './components/AdminPanel';
import { Header } from './components/Header';
import { UserPortal } from './components/UserPortal';
import {
  DEFAULT_REFERRAL_CODE,
  DEFAULT_REFERRAL_LINK,
  type CampaignSetting,
  type Language,
} from './types';

const DEFAULT_CAMPAIGN: CampaignSetting = {
  referralCode: DEFAULT_REFERRAL_CODE,
  referralLink: DEFAULT_REFERRAL_LINK,
  campaignTitle: 'Zulti Partner Referral Program',
  instructions:
    'Share the link below with your contacts, submit their username, and withdraw your earnings via bKash.',
  rewardPerReferral: 50,
  minWithdrawAmount: 50,
  updatedAt: Date.now(),
};

export default function App() {
  const [lang, setLang] = useState<Language>('en');
  const [activeView, setActiveView] = useState<'portal' | 'admin'>(() =>
    window.location.hash === '#admin' ? 'admin' : 'portal'
  );

  const [session, setSession] = useState<AuthSession | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [campaign, setCampaign] = useState<CampaignSetting>(DEFAULT_CAMPAIGN);

  useEffect(() => {
    const boot = async () => {
      try {
        const cfg = await fetchCampaign();
        setCampaign(cfg);
      } catch {
        // Fallback to default campaign config
      }

      if (getStoredToken()) {
        try {
          const me = await fetchSession();
          setSession(me);
        } catch {
          setStoredToken(null);
          setSession(null);
        }
      }
      setAuthReady(true);
    };

    void boot();
  }, []);

  const handleSignOut = () => {
    setStoredToken(null);
    setSession(null);
  };

  const handleNavigate = (view: 'portal' | 'admin', sectionId?: string) => {
    setActiveView(view);
    if (view === 'admin') {
      window.location.hash = 'admin';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (window.location.hash === '#admin') {
      window.history.replaceState(null, '', '#top');
    }

    if (sectionId) {
      requestAnimationFrame(() => {
        const el = document.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header
        lang={lang}
        activeView={activeView}
        onNavigate={handleNavigate}
        session={session}
        onSignOut={handleSignOut}
        authLoading={!authReady}
      />

      <div className="flex-1">
        {activeView === 'admin' ? (
          <AdminPanel
            lang={lang}
            onChangeLang={setLang}
            session={session}
            onSessionChange={setSession}
            campaign={campaign}
            onCampaignUpdate={setCampaign}
            onBackToPortal={() => handleNavigate('portal', 'top')}
          />
        ) : (
          <UserPortal
            lang={lang}
            onChangeLang={setLang}
            session={session}
            onSessionChange={setSession}
            campaign={campaign}
            onCampaignUpdate={setCampaign}
            onOpenAdmin={() => handleNavigate('admin')}
          />
        )}
      </div>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6 text-xs text-slate-500">
          <span>Zulti Referral Hub</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => handleNavigate('portal', 'share-link')}
              className="cursor-pointer hover:text-slate-900"
            >
              Share Link
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('portal', 'bkash-withdraw')}
              className="cursor-pointer hover:text-slate-900"
            >
              bKash Withdraw
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('admin')}
              className="cursor-pointer hover:text-slate-900"
            >
              Admin Panel
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
