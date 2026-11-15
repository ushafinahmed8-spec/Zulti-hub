import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  MessageSquare,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Wallet,
  XCircle,
} from 'lucide-react';
import {
  adminChangePassword,
  adminCreateUser,
  adminDeleteReferral,
  adminDeleteWithdrawal,
  adminLogin,
  adminUpdateCampaign,
  adminUpdateReferral,
  adminUpdateUser,
  adminUpdateWithdrawal,
  fetchAdminOverview,
  setStoredToken,
  type AuthSession,
} from '../api';
import { COPY } from '../i18n';
import {
  VALIDATION_LIMITS,
  type BkashWithdrawal,
  type CampaignSetting,
  type Language,
  type ReferralStatus,
  type ReferralSubmission,
  type UserProfile,
  type WithdrawalStatus,
} from '../types';

interface AdminPanelProps {
  lang: Language;
  onChangeLang: (lang: Language) => void;
  session: AuthSession | null;
  onSessionChange: (session: AuthSession | null) => void;
  campaign: CampaignSetting;
  onCampaignUpdate: (campaign: CampaignSetting) => void;
  onBackToPortal: () => void;
}

type AdminTab = 'referrals' | 'withdrawals' | 'users' | 'settings';

function formatDate(ts: number): string {
  if (!ts) return 'Just now';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ts));
  } catch {
    return 'Just now';
  }
}

function generateStrongPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 8; i += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function AdminPanel({
  lang,
  onChangeLang,
  session,
  onSessionChange,
  campaign,
  onCampaignUpdate,
  onBackToPortal,
}: AdminPanelProps) {
  const t = COPY[lang];
  const isAuthorizedAdmin = session?.role === 'admin';

  // Admin Login Form state
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPw, setShowAdminPw] = useState(false);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Admin workspace state
  const [activeTab, setActiveTab] = useState<AdminTab>('referrals');
  const [referrals, setReferrals] = useState<ReferralSubmission[]>([]);
  const [withdrawals, setWithdrawals] = useState<BkashWithdrawal[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Referrals filters & note edit
  const [refSearch, setRefSearch] = useState('');
  const [refFilter, setRefFilter] = useState<'all' | ReferralStatus>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [noteEditingId, setNoteEditingId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

  // Withdrawals filters & payout editor
  const [wdSearch, setWdSearch] = useState('');
  const [wdFilter, setWdFilter] = useState<'all' | WithdrawalStatus>('all');
  const [payingId, setPayingId] = useState<string | null>(null);
  const [trxIdDraft, setTrxIdDraft] = useState('');
  const [wdNoteDraft, setWdNoteDraft] = useState('');

  // User Provisioning form
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newBonus, setNewBonus] = useState('0');
  const [showNewUserPw, setShowNewUserPw] = useState(true);
  const [creatingUser, setCreatingUser] = useState(false);
  const [userFormError, setUserFormError] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{
    username: string;
    password: string;
  } | null>(null);
  const [copiedCreds, setCopiedCreds] = useState(false);

  // Bonus & Password reset per user
  const [editingBonusUid, setEditingBonusUid] = useState<string | null>(null);
  const [bonusDraft, setBonusDraft] = useState('');
  const [resettingPwUid, setResettingPwUid] = useState<string | null>(null);
  const [resetPwDraft, setResetPwDraft] = useState('');
  const [userActionMsg, setUserActionMsg] = useState<string | null>(null);

  // Settings & Change Admin Password
  const [referralCode, setReferralCode] = useState(campaign.referralCode);
  const [referralLink, setReferralLink] = useState(campaign.referralLink);
  const [campaignTitle, setCampaignTitle] = useState(campaign.campaignTitle);
  const [instructions, setInstructions] = useState(campaign.instructions);
  const [rewardPerReferral, setRewardPerReferral] = useState(
    String(campaign.rewardPerReferral)
  );
  const [minWithdrawAmount, setMinWithdrawAmount] = useState(
    String(campaign.minWithdrawAmount)
  );
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const [nextAdminPw, setNextAdminPw] = useState('');
  const [confirmNextAdminPw, setConfirmNextAdminPw] = useState('');
  const [pwChangeMsg, setPwChangeMsg] = useState<string | null>(null);
  const [pwChangeErr, setPwChangeErr] = useState<string | null>(null);

  useEffect(() => {
    setReferralCode(campaign.referralCode);
    setReferralLink(campaign.referralLink);
    setCampaignTitle(campaign.campaignTitle);
    setInstructions(campaign.instructions);
    setRewardPerReferral(String(campaign.rewardPerReferral));
    setMinWithdrawAmount(String(campaign.minWithdrawAmount));
  }, [campaign]);

  const loadOverview = useCallback(async () => {
    if (!isAuthorizedAdmin) return;
    try {
      const data = await fetchAdminOverview();
      setReferrals(data.referrals);
      setWithdrawals(data.withdrawals);
      setUsersList(data.users);
      onCampaignUpdate(data.campaign);
    } catch {
      // Ignore transient error
    } finally {
      setLoadingData(false);
    }
  }, [isAuthorizedAdmin, onCampaignUpdate]);

  useEffect(() => {
    if (!isAuthorizedAdmin) {
      setReferrals([]);
      setWithdrawals([]);
      setUsersList([]);
      return;
    }

    setLoadingData(true);
    void loadOverview();

    const interval = window.setInterval(() => {
      void loadOverview();
    }, 10000);
    return () => window.clearInterval(interval);
  }, [isAuthorizedAdmin]);

  const stats = useMemo(() => {
    const totalRefs = referrals.length;
    const pendingRefs = referrals.filter((r) => r.status === 'pending').length;
    const pendingBkashAmount = withdrawals
      .filter((w) => w.status === 'pending')
      .reduce((acc, w) => acc + Number(w.amount || 0), 0);
    const totalUsers = usersList.length;
    return { totalRefs, pendingRefs, pendingBkashAmount, totalUsers };
  }, [referrals, withdrawals, usersList]);

  const filteredReferrals = useMemo(() => {
    const q = refSearch.trim().toLowerCase();
    return referrals.filter((row) => {
      if (refFilter !== 'all' && row.status !== refFilter) return false;
      if (!q) return true;
      return (
        row.referredUsername.toLowerCase().includes(q) ||
        row.referrerUsername.toLowerCase().includes(q) ||
        row.submitterName.toLowerCase().includes(q) ||
        row.note.toLowerCase().includes(q)
      );
    });
  }, [referrals, refSearch, refFilter]);

  const filteredWithdrawals = useMemo(() => {
    const q = wdSearch.trim().toLowerCase();
    return withdrawals.filter((row) => {
      if (wdFilter !== 'all' && row.status !== wdFilter) return false;
      if (!q) return true;
      return (
        row.bkashNumber.toLowerCase().includes(q) ||
        row.submitterUsername.toLowerCase().includes(q) ||
        row.submitterName.toLowerCase().includes(q) ||
        row.trxId.toLowerCase().includes(q)
      );
    });
  }, [withdrawals, wdSearch, wdFilter]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!adminPassword.trim()) {
      setAuthError('Enter admin password.');
      return;
    }

    setAuthSubmitting(true);
    try {
      const res = await adminLogin(adminPassword);
      setStoredToken(res.token);
      setAdminPassword('');
      onSessionChange({ role: 'admin' });
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : lang === 'bn'
          ? 'ভুল অ্যাডমিন পাসওয়ার্ড।'
          : 'Incorrect admin password.'
      );
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleCopyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // Ignore clipboard error
    }
  };

  // Referral Actions
  const handleReferralStatus = async (
    row: ReferralSubmission,
    status: ReferralStatus
  ) => {
    const updated = await adminUpdateReferral(row.id, { status });
    setReferrals((prev) => prev.map((r) => (r.id === row.id ? updated : r)));
  };

  const handleSaveRefNote = async (row: ReferralSubmission) => {
    const updated = await adminUpdateReferral(row.id, {
      adminNote: noteDraft.trim().slice(0, VALIDATION_LIMITS.adminNoteMax),
    });
    setReferrals((prev) => prev.map((r) => (r.id === row.id ? updated : r)));
    setNoteEditingId(null);
  };

  const handleDeleteReferral = async (row: ReferralSubmission) => {
    await adminDeleteReferral(row.id);
    setReferrals((prev) => prev.filter((r) => r.id !== row.id));
  };

  // bKash Withdrawal Actions
  const handleMarkWithdrawalPaid = async (wd: BkashWithdrawal) => {
    const updated = await adminUpdateWithdrawal(wd.id, {
      status: 'paid',
      trxId: trxIdDraft.trim().slice(0, VALIDATION_LIMITS.trxIdMax),
      adminNote: wdNoteDraft.trim().slice(0, VALIDATION_LIMITS.adminNoteMax),
    });
    setWithdrawals((prev) => prev.map((w) => (w.id === wd.id ? updated : w)));
    setPayingId(null);
    setTrxIdDraft('');
    setWdNoteDraft('');
  };

  const handleRejectWithdrawal = async (wd: BkashWithdrawal) => {
    const updated = await adminUpdateWithdrawal(wd.id, {
      status: 'rejected',
      adminNote: wd.adminNote || 'Rejected by admin',
    });
    setWithdrawals((prev) => prev.map((w) => (w.id === wd.id ? updated : w)));
  };

  const handleDeleteWithdrawal = async (wd: BkashWithdrawal) => {
    await adminDeleteWithdrawal(wd.id);
    setWithdrawals((prev) => prev.filter((w) => w.id !== wd.id));
  };

  // Create User + Password
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserFormError(null);
    setCreatedCredentials(null);

    const cleanUsername = newUsername.trim().toLowerCase();
    const cleanName = newDisplayName.trim();
    const cleanBonus = Math.max(0, Number(newBonus) || 0);

    if (
      cleanUsername.length < VALIDATION_LIMITS.usernameMin ||
      cleanUsername.length > VALIDATION_LIMITS.usernameMax ||
      !VALIDATION_LIMITS.loginUsernameRegex.test(cleanUsername)
    ) {
      setUserFormError(
        'Username must be 2–40 chars (letters, numbers, _, ., or -).'
      );
      return;
    }
    if (!cleanName || cleanName.length > VALIDATION_LIMITS.nameMax) {
      setUserFormError('Enter a valid full name.');
      return;
    }
    if (newPassword.length < VALIDATION_LIMITS.passwordMin) {
      setUserFormError(
        `Password must be at least ${VALIDATION_LIMITS.passwordMin} characters.`
      );
      return;
    }

    setCreatingUser(true);
    try {
      const created = await adminCreateUser({
        username: cleanUsername,
        displayName: cleanName,
        password: newPassword,
        bonusBalance: cleanBonus,
      });
      setUsersList((prev) => [created, ...prev]);
      setCreatedCredentials({ username: cleanUsername, password: newPassword });
      setNewUsername('');
      setNewDisplayName('');
      setNewPassword('');
      setNewBonus('0');
    } catch (error) {
      setUserFormError(
        error instanceof Error ? error.message : 'Unable to create user.'
      );
    } finally {
      setCreatingUser(false);
    }
  };

  const handleToggleUserStatus = async (u: UserProfile) => {
    const nextStatus = u.status === 'active' ? 'suspended' : 'active';
    const updated = await adminUpdateUser(u.uid, { status: nextStatus });
    setUsersList((prev) => prev.map((x) => (x.uid === u.uid ? updated : x)));
  };

  const handleSaveUserBonus = async (u: UserProfile) => {
    const amount = Math.max(0, Number(bonusDraft) || 0);
    const updated = await adminUpdateUser(u.uid, { bonusBalance: amount });
    setUsersList((prev) => prev.map((x) => (x.uid === u.uid ? updated : x)));
    setEditingBonusUid(null);
  };

  const handleResetUserPassword = async (u: UserProfile) => {
    setUserActionMsg(null);
    if (resetPwDraft.length < VALIDATION_LIMITS.passwordMin) {
      setUserActionMsg(
        `Password must be at least ${VALIDATION_LIMITS.passwordMin} characters.`
      );
      return;
    }
    await adminUpdateUser(u.uid, { newPassword: resetPwDraft });
    setUserActionMsg(
      `Password updated for @${u.username} (new password: ${resetPwDraft})`
    );
    setResettingPwUid(null);
    setResetPwDraft('');
  };

  // CSV Exports
  const handleExportReferralsCsv = () => {
    const headers = [
      'Referred Username',
      'Referrer Username',
      'Submitter Name',
      'Share Channel',
      'Status',
      'User Note',
      'Admin Note',
      'Submitted At',
    ];
    const esc = (v: string) => `"${(v || '').replace(/"/g, '""')}"`;
    const lines = [
      headers.join(','),
      ...filteredReferrals.map((r) =>
        [
          esc(r.referredUsername),
          esc(r.referrerUsername),
          esc(r.submitterName),
          esc(r.shareChannel),
          esc(r.status),
          esc(r.note),
          esc(r.adminNote),
          esc(formatDate(r.createdAt)),
        ].join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zulti-referrals-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportWithdrawalsCsv = () => {
    const headers = [
      'Username',
      'Name',
      'bKash Number',
      'Account Type',
      'Amount (BDT)',
      'Status',
      'TrxID',
      'Admin Note',
      'Requested At',
    ];
    const esc = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [
      headers.join(','),
      ...filteredWithdrawals.map((w) =>
        [
          esc(w.submitterUsername),
          esc(w.submitterName),
          esc(w.bkashNumber),
          esc(w.accountType),
          esc(w.amount),
          esc(w.status),
          esc(w.trxId),
          esc(w.adminNote),
          esc(formatDate(w.createdAt)),
        ].join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zulti-bkash-withdrawals-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsMessage(null);
    setSettingsError(null);

    const cleanCode = referralCode.trim();
    const cleanLink = referralLink.trim();
    const cleanTitle = campaignTitle.trim();
    const cleanInstructions = instructions.trim();
    const reward = Number(rewardPerReferral);
    const minWd = Number(minWithdrawAmount);

    if (
      cleanCode.length < VALIDATION_LIMITS.codeMin ||
      !VALIDATION_LIMITS.codeRegex.test(cleanCode)
    ) {
      setSettingsError('Invalid referral code.');
      return;
    }
    if (cleanLink.length < VALIDATION_LIMITS.linkMin) {
      setSettingsError('Invalid referral link.');
      return;
    }
    if (!Number.isFinite(reward) || reward < 0) {
      setSettingsError('Invalid reward per referral.');
      return;
    }
    if (!Number.isFinite(minWd) || minWd < VALIDATION_LIMITS.minWithdrawalHard) {
      setSettingsError('Minimum bKash withdrawal must be at least ৳10.');
      return;
    }

    setSavingSettings(true);
    try {
      const updated = await adminUpdateCampaign({
        referralCode: cleanCode,
        referralLink: cleanLink,
        campaignTitle: cleanTitle,
        instructions: cleanInstructions,
        rewardPerReferral: Math.round(reward),
        minWithdrawAmount: Math.round(minWd),
      });
      onCampaignUpdate(updated);
      setSettingsMessage(t.settingsSaved);
    } catch (error) {
      setSettingsError(
        error instanceof Error ? error.message : 'Unable to save settings.'
      );
    } finally {
      setSavingSettings(false);
    }
  };

  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwChangeErr(null);
    setPwChangeMsg(null);

    if (nextAdminPw.length < VALIDATION_LIMITS.passwordMin) {
      setPwChangeErr(
        `New password must be at least ${VALIDATION_LIMITS.passwordMin} characters.`
      );
      return;
    }
    if (nextAdminPw !== confirmNextAdminPw) {
      setPwChangeErr('Passwords do not match.');
      return;
    }

    try {
      await adminChangePassword(nextAdminPw);
      setNextAdminPw('');
      setConfirmNextAdminPw('');
      setPwChangeMsg('Admin password updated.');
    } catch (error) {
      setPwChangeErr(
        error instanceof Error ? error.message : 'Unable to update password.'
      );
    }
  };

  // Password Gate when not signed in as Admin
  if (!isAuthorizedAdmin) {
    return (
      <main className="mx-auto max-w-lg px-6 py-14">
        <div className="rounded-2xl border border-slate-200 bg-white p-7 space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-slate-900">
              <ShieldCheck className="h-6 w-6 text-blue-700" />
              <h1 className="font-display text-xl font-bold tracking-tight">
                {t.adminLoginTitle}
              </h1>
            </div>

            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => onChangeLang('en')}
                className={`cursor-pointer rounded px-2 py-1 text-xs font-medium ${
                  lang === 'en' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => onChangeLang('bn')}
                className={`cursor-pointer rounded px-2 py-1 text-xs font-medium ${
                  lang === 'bn' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                বাংলা
              </button>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-slate-600">
            {t.adminLoginSubtitle}
          </p>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label
                htmlFor="admin-password-input"
                className="block text-sm font-medium text-slate-800"
              >
                {t.adminPasswordLabel}
              </label>
              <div className="relative mt-1.5">
                <input
                  id="admin-password-input"
                  type={showAdminPw ? 'text' : 'password'}
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-300 bg-white pl-3.5 pr-10 py-2.5 text-sm text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/15"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPw((p) => !p)}
                  aria-label={showAdminPw ? 'Hide password' : 'Show password'}
                  className="cursor-pointer absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                >
                  {showAdminPw ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {authError && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700"
              >
                {authError}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={authSubmitting}
                className="cursor-pointer flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 min-h-[44px]"
              >
                <KeyRound className="h-4 w-4" />
                <span>{authSubmitting ? 'Please wait...' : t.adminLoginBtn}</span>
              </button>
              <button
                type="button"
                onClick={onBackToPortal}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 min-h-[44px]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>{t.backToPortal}</span>
              </button>
            </div>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 space-y-8">
      {/* Header & Language Switch */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <button
              type="button"
              onClick={onBackToPortal}
              className="cursor-pointer inline-flex items-center gap-1 hover:text-slate-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{t.backToPortal}</span>
            </button>
            <span aria-hidden="true">/</span>
            <span className="font-medium text-slate-800">{t.adminTitle}</span>
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-900">
            {t.adminTitle}
          </h1>
          <p className="mt-1 text-sm text-slate-600">{t.adminSubtitle}</p>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => onChangeLang('en')}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium ${
              lang === 'en' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => onChangeLang('bn')}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium ${
              lang === 'bn' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            বাংলা
          </button>
        </div>
      </div>

      {/* 4-Column KPI Summary */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Total Referrals</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {stats.totalRefs}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Pending Referrals</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-amber-700 tabular-nums">
            {stats.pendingRefs}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Pending bKash</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-pink-700 tabular-nums">
            ৳{stats.pendingBkashAmount}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Registered Users</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {stats.totalUsers}
          </p>
        </div>
      </section>

      {/* Segmented Navigation Tabs */}
      <div
        role="tablist"
        aria-label="Admin sections"
        className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1 w-fit"
      >
        {(
          [
            ['referrals', `${t.tabReferrals} (${referrals.length})`],
            ['withdrawals', `${t.tabWithdrawals} (${withdrawals.length})`],
            ['users', `${t.tabUsers} (${usersList.length})`],
            ['settings', t.tabSettings],
          ] as const
        ).map(([tabKey, label]) => (
          <button
            key={tabKey}
            type="button"
            role="tab"
            aria-selected={activeTab === tabKey}
            onClick={() => setActiveTab(tabKey)}
            className={`cursor-pointer rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
              activeTab === tabKey
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* TAB 1: REFERRALS */}
      {activeTab === 'referrals' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={refSearch}
                onChange={(e) => setRefSearch(e.target.value)}
                placeholder="Search referred username or user..."
                className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                {(['all', 'pending', 'verified', 'rejected'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setRefFilter(f)}
                    className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium capitalize ${
                      refFilter === f
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleExportReferralsCsv}
                disabled={filteredReferrals.length === 0}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{t.exportCsv}</span>
              </button>
            </div>
          </div>

          {loadingData ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
              <div className="h-10 w-full animate-pulse rounded bg-slate-100" />
              <div className="h-10 w-full animate-pulse rounded bg-slate-100" />
            </div>
          ) : filteredReferrals.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
              No referral submissions found.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="px-4 py-3">Referred Username</th>
                    <th className="px-4 py-3">Submitted By</th>
                    <th className="px-4 py-3">Channel & Note</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredReferrals.map((row) => {
                    const isEditingNote = noteEditingId === row.id;
                    return (
                      <tr key={row.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-slate-900">
                              {row.referredUsername}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                void handleCopyText(row.id, row.referredUsername)
                              }
                              aria-label={`Copy ${row.referredUsername}`}
                              className="cursor-pointer rounded p-1 text-slate-400 hover:text-slate-700"
                            >
                              {copiedId === row.id ? (
                                <Check className="h-3.5 w-3.5 text-emerald-700" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-mono text-xs font-medium text-slate-900">
                            {row.referrerUsername}
                          </p>
                          <p className="text-xs text-slate-500">
                            {row.submitterName}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          <span className="font-medium text-slate-700">
                            {row.shareChannel}
                          </span>
                          {row.note && <p className="text-slate-500">{row.note}</p>}
                          {isEditingNote ? (
                            <div className="flex items-center gap-1.5 pt-1">
                              <input
                                type="text"
                                value={noteDraft}
                                onChange={(e) => setNoteDraft(e.target.value)}
                                maxLength={VALIDATION_LIMITS.adminNoteMax}
                                placeholder="Admin note..."
                                className="w-40 rounded border border-slate-300 px-2 py-1 text-xs"
                              />
                              <button
                                type="button"
                                onClick={() => void handleSaveRefNote(row)}
                                className="cursor-pointer rounded bg-slate-900 px-2 py-1 text-xs text-white"
                              >
                                {t.saveBtn}
                              </button>
                              <button
                                type="button"
                                onClick={() => setNoteEditingId(null)}
                                className="cursor-pointer rounded border border-slate-200 px-2 py-1 text-xs"
                              >
                                {t.cancelBtn}
                              </button>
                            </div>
                          ) : (
                            row.adminNote && (
                              <p className="text-blue-700 font-medium">
                                Note: {row.adminNote}
                              </p>
                            )
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 tabular-nums whitespace-nowrap">
                          {formatDate(row.createdAt)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {row.status === 'verified' && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {t.statusVerified}
                            </span>
                          )}
                          {row.status === 'rejected' && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700">
                              <XCircle className="h-3.5 w-3.5" />
                              {t.statusRejected}
                            </span>
                          )}
                          {row.status === 'pending' && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                              <Clock className="h-3.5 w-3.5" />
                              {t.statusPending}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => void handleReferralStatus(row, 'verified')}
                              disabled={row.status === 'verified'}
                              className="cursor-pointer rounded border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-40"
                            >
                              {t.verifyBtn}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleReferralStatus(row, 'rejected')}
                              disabled={row.status === 'rejected'}
                              className="cursor-pointer rounded border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-800 hover:bg-red-100 disabled:opacity-40"
                            >
                              {t.rejectBtn}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setNoteEditingId(row.id);
                                setNoteDraft(row.adminNote || '');
                              }}
                              className="cursor-pointer inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                            >
                              <MessageSquare className="h-3 w-3" />
                              <span>{t.noteBtn}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteReferral(row)}
                              aria-label="Delete"
                              className="cursor-pointer rounded border border-slate-200 p-1.5 text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* TAB 2: bKash WITHDRAWALS */}
      {activeTab === 'withdrawals' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={wdSearch}
                onChange={(e) => setWdSearch(e.target.value)}
                placeholder="Search bKash number, username, or TrxID..."
                className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                {(['all', 'pending', 'paid', 'rejected'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setWdFilter(f)}
                    className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium capitalize ${
                      wdFilter === f
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleExportWithdrawalsCsv}
                disabled={filteredWithdrawals.length === 0}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{t.exportCsv}</span>
              </button>
            </div>
          </div>

          {filteredWithdrawals.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
              No bKash withdrawal requests match the current filter.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">bKash Number</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">TrxID & Note</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredWithdrawals.map((wd) => {
                    const isPaying = payingId === wd.id;
                    return (
                      <tr key={wd.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3">
                          <p className="font-mono text-xs font-semibold text-slate-900">
                            {wd.submitterUsername}
                          </p>
                          <p className="text-xs text-slate-500">
                            {wd.submitterName}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-slate-900">
                              {wd.bkashNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                void handleCopyText(wd.id, wd.bkashNumber)
                              }
                              aria-label={`Copy ${wd.bkashNumber}`}
                              className="cursor-pointer rounded p-1 text-slate-400 hover:text-slate-700"
                            >
                              {copiedId === wd.id ? (
                                <Check className="h-3.5 w-3.5 text-emerald-700" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                          <span className="text-xs text-slate-500">
                            {wd.accountType}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 tabular-nums">
                          ৳{wd.amount}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {isPaying ? (
                            <div className="space-y-1.5">
                              <input
                                type="text"
                                value={trxIdDraft}
                                onChange={(e) => setTrxIdDraft(e.target.value)}
                                placeholder="bKash TrxID (optional)"
                                maxLength={VALIDATION_LIMITS.trxIdMax}
                                className="w-44 rounded border border-slate-300 px-2 py-1 text-xs font-mono"
                              />
                              <input
                                type="text"
                                value={wdNoteDraft}
                                onChange={(e) => setWdNoteDraft(e.target.value)}
                                placeholder="Admin note (optional)"
                                maxLength={VALIDATION_LIMITS.adminNoteMax}
                                className="block w-44 rounded border border-slate-300 px-2 py-1 text-xs"
                              />
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => void handleMarkWithdrawalPaid(wd)}
                                  className="cursor-pointer rounded bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white"
                                >
                                  Confirm Paid
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPayingId(null)}
                                  className="cursor-pointer rounded border border-slate-200 px-2 py-1 text-xs"
                                >
                                  {t.cancelBtn}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              {wd.trxId && (
                                <p className="font-mono font-medium text-emerald-700">
                                  TrxID: {wd.trxId}
                                </p>
                              )}
                              {wd.adminNote && <p>{wd.adminNote}</p>}
                              {!wd.trxId && !wd.adminNote && (
                                <span className="text-slate-400">—</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 tabular-nums whitespace-nowrap">
                          {formatDate(wd.createdAt)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {wd.status === 'paid' && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {t.statusPaid}
                            </span>
                          )}
                          {wd.status === 'rejected' && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700">
                              <XCircle className="h-3.5 w-3.5" />
                              {t.statusRejected}
                            </span>
                          )}
                          {wd.status === 'pending' && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                              <Clock className="h-3.5 w-3.5" />
                              {t.statusPending}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setPayingId(wd.id);
                                setTrxIdDraft(wd.trxId || '');
                                setWdNoteDraft(wd.adminNote || '');
                              }}
                              disabled={wd.status === 'paid'}
                              className="cursor-pointer inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-40"
                            >
                              <Wallet className="h-3 w-3" />
                              <span>{t.markPaidBtn}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleRejectWithdrawal(wd)}
                              disabled={wd.status === 'rejected'}
                              className="cursor-pointer rounded border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-800 hover:bg-red-100 disabled:opacity-40"
                            >
                              {t.rejectBtn}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteWithdrawal(wd)}
                              aria-label="Delete"
                              className="cursor-pointer rounded border border-slate-200 p-1.5 text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* TAB 3: USERS & PASSWORDS */}
      {activeTab === 'users' && (
        <section className="space-y-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-700" />
              <h2 className="font-display text-lg font-bold tracking-tight text-slate-900">
                {t.createUserTitle}
              </h2>
            </div>

            <form
              onSubmit={handleCreateUser}
              className="grid grid-cols-1 gap-4 md:grid-cols-4"
            >
              <div>
                <label
                  htmlFor="new-user-username"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Username
                </label>
                <input
                  id="new-user-username"
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. rafiq_bd"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="new-user-name"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Full Name
                </label>
                <input
                  id="new-user-name"
                  type="text"
                  required
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="e.g. Rafiqul Islam"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="new-user-password"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Password (min 4 chars)
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewPassword(generateStrongPassword())}
                    className="cursor-pointer text-xs font-semibold text-blue-700 hover:underline"
                  >
                    {t.generatePwBtn}
                  </button>
                </div>
                <div className="relative mt-1.5">
                  <input
                    id="new-user-password"
                    type={showNewUserPw ? 'text' : 'password'}
                    required
                    minLength={VALIDATION_LIMITS.passwordMin}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Create password"
                    className="w-full rounded-lg border border-slate-300 pl-3 pr-9 py-2 text-sm font-mono text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewUserPw((p) => !p)}
                    aria-label="Toggle password visibility"
                    className="cursor-pointer absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400"
                  >
                    {showNewUserPw ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="new-user-bonus"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Starting Bonus (৳)
                </label>
                <input
                  id="new-user-bonus"
                  type="number"
                  min={0}
                  value={newBonus}
                  onChange={(e) => setNewBonus(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900 tabular-nums"
                />
              </div>

              <div className="md:col-span-4 flex flex-wrap items-center justify-between gap-3 pt-1">
                <div>
                  {userFormError && (
                    <p className="text-xs font-medium text-red-700">
                      {userFormError}
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60 min-h-[40px]"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>{creatingUser ? 'Creating...' : t.createUserBtn}</span>
                </button>
              </div>
            </form>

            {createdCredentials && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1 text-xs text-emerald-950">
                  <p className="font-semibold">
                    Account created! Send these login details to the user:
                  </p>
                  <p className="font-mono">
                    Username: <strong>{createdCredentials.username}</strong> ·
                    Password: <strong>{createdCredentials.password}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const text = `Website: ${window.location.origin}\nUsername: ${createdCredentials.username}\nPassword: ${createdCredentials.password}`;
                    void navigator.clipboard.writeText(text);
                    setCopiedCreds(true);
                    setTimeout(() => setCopiedCreds(false), 2000);
                  }}
                  className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-emerald-800 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-900"
                >
                  {copiedCreds ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>{t.copyCredsBtn}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {userActionMsg && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-900">
              {userActionMsg}
            </div>
          )}

          {/* Registered Users Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Full Name</th>
                  <th className="px-4 py-3">Verified Referrals</th>
                  <th className="px-4 py-3">Bonus (৳)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {usersList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-sm text-slate-500"
                    >
                      No users created yet. Use the form above to create your first user login.
                    </td>
                  </tr>
                ) : (
                  usersList.map((u) => {
                    const userVerifiedCount = referrals.filter(
                      (r) => r.submitterUid === u.uid && r.status === 'verified'
                    ).length;
                    const isEditingBonus = editingBonusUid === u.uid;
                    const isResettingPw = resettingPwUid === u.uid;

                    return (
                      <tr key={u.uid} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                          {u.username}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {u.displayName}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-800 tabular-nums">
                          {userVerifiedCount} (৳
                          {userVerifiedCount * campaign.rewardPerReferral})
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-900 tabular-nums">
                          {isEditingBonus ? (
                            <div className="inline-flex items-center gap-1.5">
                              <input
                                type="number"
                                min={0}
                                value={bonusDraft}
                                onChange={(e) => setBonusDraft(e.target.value)}
                                className="w-20 rounded border border-slate-300 px-2 py-1 text-xs font-mono"
                              />
                              <button
                                type="button"
                                onClick={() => void handleSaveUserBonus(u)}
                                className="cursor-pointer rounded bg-slate-900 px-2 py-1 text-xs text-white"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingBonusUid(u.uid);
                                setBonusDraft(String(u.bonusBalance ?? 0));
                              }}
                              className="cursor-pointer underline decoration-slate-300 underline-offset-4 hover:text-blue-700"
                            >
                              ৳{u.bonusBalance ?? 0}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {u.status === 'active' ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700">
                              <XCircle className="h-3.5 w-3.5" />
                              Suspended
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {isResettingPw ? (
                            <div className="inline-flex items-center gap-1.5">
                              <input
                                type="text"
                                value={resetPwDraft}
                                onChange={(e) => setResetPwDraft(e.target.value)}
                                placeholder="New password"
                                className="w-32 rounded border border-slate-300 px-2 py-1 text-xs font-mono"
                              />
                              <button
                                type="button"
                                onClick={() => void handleResetUserPassword(u)}
                                className="cursor-pointer rounded bg-slate-900 px-2.5 py-1 text-xs font-medium text-white"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setResettingPwUid(null)}
                                className="cursor-pointer rounded border border-slate-200 px-2 py-1 text-xs text-slate-600"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setResettingPwUid(u.uid);
                                  setResetPwDraft('');
                                }}
                                className="cursor-pointer rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                              >
                                Reset Password
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleToggleUserStatus(u)}
                                className="cursor-pointer rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                              >
                                {u.status === 'active' ? 'Suspend' : 'Activate'}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 4: SETTINGS & ADMIN PASSWORD */}
      {activeTab === 'settings' && (
        <section className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
            <h2 className="font-display text-lg font-bold tracking-tight text-slate-900">
              {t.campaignSettingsTitle}
            </h2>

            <form
              onSubmit={handleSaveSettings}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              <div className="sm:col-span-2">
                <label
                  htmlFor="cfg-link"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Referral Link
                </label>
                <input
                  id="cfg-link"
                  type="url"
                  required
                  value={referralLink}
                  onChange={(e) => setReferralLink(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-mono text-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="cfg-code"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Referral Code
                </label>
                <input
                  id="cfg-code"
                  type="text"
                  required
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-mono text-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="cfg-title"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Campaign Title
                </label>
                <input
                  id="cfg-title"
                  type="text"
                  required
                  value={campaignTitle}
                  onChange={(e) => setCampaignTitle(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="cfg-reward"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Reward Per Verified Referral (৳)
                </label>
                <input
                  id="cfg-reward"
                  type="number"
                  min={0}
                  required
                  value={rewardPerReferral}
                  onChange={(e) => setRewardPerReferral(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-mono text-slate-900 tabular-nums"
                />
              </div>

              <div>
                <label
                  htmlFor="cfg-min-wd"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Minimum bKash Withdrawal (৳)
                </label>
                <input
                  id="cfg-min-wd"
                  type="number"
                  min={10}
                  required
                  value={minWithdrawAmount}
                  onChange={(e) => setMinWithdrawAmount(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-mono text-slate-900 tabular-nums"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="cfg-instructions"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Portal Instructions
                </label>
                <input
                  id="cfg-instructions"
                  type="text"
                  required
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
                />
              </div>

              <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-2">
                <div>
                  {settingsError && (
                    <p className="text-xs font-medium text-red-700">
                      {settingsError}
                    </p>
                  )}
                  {settingsMessage && (
                    <p className="text-xs font-medium text-emerald-700">
                      {settingsMessage}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={savingSettings}
                  className="cursor-pointer rounded-lg bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {savingSettings ? 'Saving...' : t.saveSettingsBtn}
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 space-y-5 h-fit">
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-blue-700" />
              <h2 className="font-display text-lg font-bold tracking-tight text-slate-900">
                Change Admin Password
              </h2>
            </div>

            <form onSubmit={handleChangeAdminPassword} className="space-y-4">
              <div>
                <label
                  htmlFor="next-admin-pw"
                  className="block text-xs font-semibold text-slate-700"
                >
                  New Admin Password
                </label>
                <input
                  id="next-admin-pw"
                  type="password"
                  required
                  minLength={VALIDATION_LIMITS.passwordMin}
                  value={nextAdminPw}
                  onChange={(e) => setNextAdminPw(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="confirm-next-admin-pw"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Confirm New Password
                </label>
                <input
                  id="confirm-next-admin-pw"
                  type="password"
                  required
                  minLength={VALIDATION_LIMITS.passwordMin}
                  value={confirmNextAdminPw}
                  onChange={(e) => setConfirmNextAdminPw(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
                />
              </div>

              {pwChangeErr && (
                <p className="text-xs font-medium text-red-700">{pwChangeErr}</p>
              )}
              {pwChangeMsg && (
                <p className="text-xs font-medium text-emerald-700">
                  {pwChangeMsg}
                </p>
              )}

              <button
                type="submit"
                className="cursor-pointer w-full rounded-lg bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 min-h-[40px]"
              >
                Update Admin Password
              </button>
            </form>
          </div>
        </section>
      )}
    </main>
  );
}
