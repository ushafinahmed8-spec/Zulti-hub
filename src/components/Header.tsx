import type { AuthSession } from '../api';
import { COPY } from '../i18n';
import type { Language } from '../types';

interface HeaderProps {
  lang: Language;
  activeView: 'portal' | 'admin';
  onNavigate: (view: 'portal' | 'admin', sectionId?: string) => void;
  session: AuthSession | null;
  onSignOut: () => void;
  authLoading: boolean;
}

export function Header({
  lang,
  activeView,
  onNavigate,
  session,
  onSignOut,
  authLoading,
}: HeaderProps) {
  const t = COPY[lang];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-6 py-4">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('portal', 'top');
          }}
          className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700"
        >
          {t.brand}
        </a>

        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
        >
          <a
            href="#share-link"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('portal', 'share-link');
            }}
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            {t.navShare}
          </a>
          <a
            href="#bkash-withdraw"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('portal', 'bkash-withdraw');
            }}
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            {t.navWithdraw}
          </a>
          <a
            href="#my-records"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('portal', 'my-records');
            }}
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            {t.navRecords}
          </a>
          <button
            type="button"
            onClick={() => onNavigate('admin')}
            className={`cursor-pointer transition-colors whitespace-nowrap shrink-0 hover:underline underline-offset-4 ${
              activeView === 'admin'
                ? 'font-semibold text-blue-700 underline'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.navAdmin}
          </button>
        </nav>

        <div className="flex items-center shrink-0">
          {session ? (
            <button
              type="button"
              onClick={onSignOut}
              disabled={authLoading}
              className="cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 min-h-[40px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              {t.signOut}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('portal', 'user-login')}
              disabled={authLoading}
              className="cursor-pointer rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 min-h-[40px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              {t.userLoginBtn}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
