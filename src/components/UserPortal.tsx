import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Lock,
  Pencil,
  Send,
  Share2,
  Trash2,
  Wallet,
  XCircle,
} from 'lucide-react';
import {
  cancelMyWithdrawal,
  deleteMyReferral,
  fetchMyData,
  memberLogin,
  requestBkashWithdrawal,
  setStoredToken,
  submitReferral,
  updateMyReferral,
  type AuthSession,
} from '../api';
import { COPY } from '../i18n';
import {
  BKASH_ACCOUNT_TYPES,
  SHARE_CHANNELS,
  VALIDATION_LIMITS,
  type BkashAccountType,
  type BkashWithdrawal,
  type CampaignSetting,
  type Language,
  type ReferralSubmission,
  type ShareChannel,
  type UserProfile,
} from '../types';

interface UserPortalProps {
  lang: Language;
  onChangeLang: (lang: Language) => void;
  session: AuthSession | null;
  onSessionChange: (session: AuthSession | null) => void;
  campaign: CampaignSetting;
  onCampaignUpdate: (campaign: CampaignSetting) => void;
  onOpenAdmin: () => void;
}

function validateReferralUsername(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length < VALIDATION_LIMITS.usernameMin) {
    return `Must be at least ${VALIDATION_LIMITS.usernameMin} characters.`;
  }
  if (trimmed.length > VALIDATION_LIMITS.referralUsernameMax) {
    return `Must be at most ${VALIDATION_LIMITS.referralUsernameMax} characters.`;
  }
  if (!VALIDATION_LIMITS.referralUsernameRegex.test(trimmed)) {
    return 'Use only letters, numbers, underscores, dots, @, or hyphens.';
  }
  return null;
}

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

export function UserPortal({
  lang,
  onChangeLang,
  session,
  onSessionChange,
  campaign,
  onCampaignUpdate,
  onOpenAdmin,
}: UserPortalProps) {
  const t = COPY[lang];
  const isAdminSession = session?.role === 'admin';
  const isMemberSignedIn = session?.role === 'user' && Boolean(session.user);
  const profile: UserProfile | null = session?.user ?? null;
  const isSuspended = profile?.status === 'suspended';

  // Login state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Share & Referral Submission state
  const [copied, setCopied] = useState(false);
  const [referrerUsername, setReferrerUsername] = useState('');
  const [referredUsername, setReferredUsername] = useState('');
  const [shareChannel, setShareChannel] = useState<ShareChannel>('WhatsApp');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // bKash Withdrawal state
  const [bkashNumber, setBkashNumber] = useState('');
  const [accountType, setAccountType] = useState<BkashAccountType>('Personal');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);

  // Saved lists
  const [submissions, setSubmissions] = useState<ReferralSubmission[]>([]);
  const [withdrawals, setWithdrawals] = useState<BkashWithdrawal[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);

  // Inline edit for pending referrals
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editReferredUsername, setEditReferredUsername] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    if (profile?.savedUsername || profile?.username) {
      setReferrerUsername(profile.savedUsername || profile.username);
    }
  }, [profile?.savedUsername, profile?.username]);

  const loadMyData = useCallback(async () => {
    if (!isMemberSignedIn) return;
    try {
      const data = await fetchMyData();
      setSubmissions(data.referrals);
      setWithdrawals(data.withdrawals);
      onCampaignUpdate(data.campaign);
      onSessionChange({ role: 'user', user: data.user });
    } catch {
      // Ignore transient refresh failure
    } finally {
      setLoadingLists(false);
    }
  }, [isMemberSignedIn, onCampaignUpdate, onSessionChange]);

  useEffect(() => {
    if (!isMemberSignedIn) {
      setSubmissions([]);
      setWithdrawals([]);
      return;
    }

    setLoadingLists(true);
    void loadMyData();

    const interval = window.setInterval(() => {
      void loadMyData();
    }, 15000);

    return () => window.clearInterval(interval);
  }, [isMemberSignedIn]);

  const balance = useMemo(() => {
    const verifiedCount = submissions.filter((s) => s.status === 'verified').length;
    const referralEarnings = verifiedCount * campaign.rewardPerReferral;
    const bonus = profile?.bonusBalance ?? 0;
    const totalEarned = referralEarnings + bonus;
    const withdrawnOrPending = withdrawals
      .filter((w) => w.status === 'paid' || w.status === 'pending')
      .reduce((acc, item) => acc + Number(item.amount || 0), 0);
    const available = Math.max(0, totalEarned - withdrawnOrPending);
    return {
      verifiedCount,
      totalEarned,
      withdrawnOrPending,
      available,
    };
  }, [submissions, withdrawals, campaign.rewardPerReferral, profile?.bonusBalance]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(campaign.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleNativeShare = async () => {
    const shareText = `${t.shareMessagePrefix} ${campaign.referralLink}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: campaign.campaignTitle,
          text: shareText,
          url: campaign.referralLink,
        });
        return;
      } catch {
        // Fallback to copy
      }
    }
    await handleCopyLink();
  };

  const shareTextEncoded = encodeURIComponent(
    `${t.shareMessagePrefix} ${campaign.referralLink}`
  );
  const shareUrlEncoded = encodeURIComponent(campaign.referralLink);

  const handleMemberLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const cleanUsername = loginUsername.trim().toLowerCase();
    if (
      cleanUsername.length < VALIDATION_LIMITS.usernameMin ||
      cleanUsername.length > VALIDATION_LIMITS.usernameMax
    ) {
      setLoginError('Enter a valid username.');
      return;
    }
    if (loginPassword.length < VALIDATION_LIMITS.passwordMin) {
      setLoginError('Enter your password.');
      return;
    }

    setLoginLoading(true);
    try {
      const res = await memberLogin(cleanUsername, loginPassword);
      setStoredToken(res.token);
      setLoginPassword('');
      onSessionChange({ role: 'user', user: res.user });
    } catch (error) {
      setLoginError(
        error instanceof Error
          ? error.message
          : 'Invalid username or password.'
      );
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSubmitReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMemberSignedIn || isSuspended) return;
    setFormError(null);
    setFormSuccess(null);

    const cleanReferrer = referrerUsername.trim();
    const cleanReferred = referredUsername.trim();
    const cleanNote = note.trim().slice(0, VALIDATION_LIMITS.noteMax);

    const referrerErr = validateReferralUsername(cleanReferrer);
    if (referrerErr) {
      setFormError(`Your Username: ${referrerErr}`);
      return;
    }
    const referredErr = validateReferralUsername(cleanReferred);
    if (referredErr) {
      setFormError(`Referred Username: ${referredErr}`);
      return;
    }

    setSubmitting(true);
    try {
      const created = await submitReferral({
        referrerUsername: cleanReferrer,
        referredUsername: cleanReferred,
        shareChannel,
        note: cleanNote,
      });
      setSubmissions((prev) => [created, ...prev]);
      setReferredUsername('');
      setNote('');
      setFormSuccess(t.submitSuccess);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to submit.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitBkash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMemberSignedIn || isSuspended) return;
    setWithdrawError(null);
    setWithdrawSuccess(null);

    const cleanNumber = bkashNumber.trim();
    const parsedAmount = Number(withdrawAmount);

    if (!VALIDATION_LIMITS.bkashRegex.test(cleanNumber)) {
      setWithdrawError(
        lang === 'bn'
          ? 'সঠিক ১১ ডিজিটের বিকাশ নম্বর দিন (যেমন: 017XXXXXXXX)।'
          : 'Enter a valid 11-digit bKash number starting with 01.'
      );
      return;
    }

    if (
      !Number.isFinite(parsedAmount) ||
      parsedAmount < campaign.minWithdrawAmount ||
      parsedAmount < VALIDATION_LIMITS.minWithdrawalHard
    ) {
      setWithdrawError(
        lang === 'bn'
          ? `সর্বনিম্ন ৳${Math.max(campaign.minWithdrawAmount, VALIDATION_LIMITS.minWithdrawalHard)} টাকা তুলতে পারবেন।`
          : `Minimum withdrawal is ৳${Math.max(campaign.minWithdrawAmount, VALIDATION_LIMITS.minWithdrawalHard)}.`
      );
      return;
    }

    if (parsedAmount > balance.available) {
      setWithdrawError(
        lang === 'bn'
          ? `আপনার উত্তোলনযোগ্য ব্যালেন্স ৳${balance.available}। এর বেশি তোলা যাবে না।`
          : `Insufficient available balance (৳${balance.available}).`
      );
      return;
    }

    setWithdrawing(true);
    try {
      const created = await requestBkashWithdrawal({
        bkashNumber: cleanNumber,
        accountType,
        amount: Math.round(parsedAmount),
      });
      setWithdrawals((prev) => [created, ...prev]);
      setBkashNumber('');
      setWithdrawAmount('');
      setWithdrawSuccess(t.bkashSuccess);
    } catch (err) {
      setWithdrawError(
        err instanceof Error ? err.message : 'Unable to send bKash request.'
      );
    } finally {
      setWithdrawing(false);
    }
  };

  const handleStartEdit = (row: ReferralSubmission) => {
    setEditingId(row.id);
    setEditReferredUsername(row.referredUsername);
    setEditNote(row.note);
  };

  const handleSaveEdit = async (row: ReferralSubmission) => {
    const err = validateReferralUsername(editReferredUsername);
    if (err) {
      setFormError(`Referred Username: ${err}`);
      return;
    }
    setEditSaving(true);
    try {
      const updated = await updateMyReferral(row.id, {
        referredUsername: editReferredUsername.trim(),
        note: editNote.trim().slice(0, VALIDATION_LIMITS.noteMax),
      });
      setSubmissions((prev) =>
        prev.map((item) => (item.id === row.id ? updated : item))
      );
      setEditingId(null);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Unable to update referral.'
      );
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeletePendingReferral = async (row: ReferralSubmission) => {
    try {
      await deleteMyReferral(row.id);
      setSubmissions((prev) => prev.filter((item) => item.id !== row.id));
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Unable to delete referral.'
      );
    }
  };

  const handleDeletePendingWithdrawal = async (row: BkashWithdrawal) => {
    try {
      await cancelMyWithdrawal(row.id);
      setWithdrawals((prev) => prev.filter((item) => item.id !== row.id));
    } catch (error) {
      setWithdrawError(
        error instanceof Error ? error.message : 'Unable to cancel withdrawal.'
      );
    }
  };

  return (
    <main id="top" className="mx-auto max-w-6xl px-6 py-10 space-y-12">
      {/* Workspace Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="font-medium text-slate-700">{campaign.campaignTitle}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono text-slate-700">{campaign.referralCode}</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">
            ৳{campaign.rewardPerReferral} / verified referral
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenAdmin}
            className="md:hidden cursor-pointer text-xs font-medium text-blue-700 hover:underline whitespace-nowrap shrink-0"
          >
            {t.navAdmin}
          </button>

          <div
            role="group"
            aria-label="Language selection"
            className="flex items-center gap-1 rounded-lg bg-slate-100 p-1"
          >
            <button
              type="button"
              onClick={() => onChangeLang('en')}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                lang === 'en'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => onChangeLang('bn')}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                lang === 'bn'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              বাংলা
            </button>
          </div>
        </div>
      </div>

      {/* Notice if signed in as Admin */}
      {isAdminSession && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-950">
          <span>
            {lang === 'bn'
              ? 'আপনি এখন অ্যাডমিন অ্যাকাউন্টে লগইন আছেন। রেফারেল, বিকাশ পেমেন্ট ও ইউজার পাসওয়ার্ড দেখতে অ্যাডমিন প্যানেল খুলুন।'
              : 'You are signed in as Admin. Open the Admin Panel to review referrals, pay bKash requests, and create user passwords.'}
          </span>
          <button
            type="button"
            onClick={onOpenAdmin}
            className="cursor-pointer rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
          >
            {t.navAdmin}
          </button>
        </div>
      )}

      {/* Suspended Account Warning */}
      {isMemberSignedIn && isSuspended && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-800"
        >
          {lang === 'bn'
            ? 'আপনার অ্যাকাউন্টটি অ্যাডমিন কর্তৃক সাময়িকভাবে স্থগিত করা হয়েছে।'
            : 'Your account is currently suspended. Contact your administrator to reactivate access.'}
        </div>
      )}

      {/* Hero: Referral Sharing Box + Member Login OR Member Dashboard */}
      {!isMemberSignedIn ? (
        <section
          id="share-link"
          className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-stretch"
        >
          <div className="lg:col-span-7 flex flex-col justify-between space-y-8">
            <div className="space-y-4">
              <h1
                className="font-display font-bold tracking-tight text-slate-900 leading-[1.12]"
                style={{
                  fontSize: 'clamp(2.1rem, 3.8vw, 3.15rem)',
                  textWrap: 'balance',
                }}
              >
                {t.heroHeadline}
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-slate-600">
                {t.heroSubhead}
              </p>
              <p className="text-sm text-slate-500">{campaign.instructions}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span className="font-medium text-slate-700">
                  {t.referralLinkLabel}
                </span>
                <span>
                  {t.referralCodeLabel}:{' '}
                  <strong className="font-mono font-semibold text-slate-900">
                    {campaign.referralCode}
                  </strong>
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="truncate font-mono text-sm font-medium text-slate-900 select-all">
                    {campaign.referralLink}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 min-h-[44px]"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>{t.copied}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span>{t.copyLink}</span>
                    </>
                  )}
                </button>
              </div>

              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-medium text-slate-500">
                  {t.shareVia}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={`https://wa.me/?text=${shareTextEncoded}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 min-h-[40px]"
                  >
                    WhatsApp
                  </a>
                  <a
                    href={`https://t.me/share/url?url=${shareUrlEncoded}&text=${shareTextEncoded}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 min-h-[40px]"
                  >
                    Telegram
                  </a>
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrlEncoded}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 min-h-[40px]"
                  >
                    Facebook
                  </a>
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 min-h-[40px]"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span>Share</span>
                  </button>
                  <a
                    href={campaign.referralLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 min-h-[40px]"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>{t.openLink}</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Username & Password Login Card */}
          <div
            id="user-login"
            className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2 text-slate-900">
                <Lock className="h-5 w-5 text-blue-700" />
                <h2 className="font-display text-xl font-bold tracking-tight">
                  {t.loginTitle}
                </h2>
              </div>
              <p className="mt-1.5 text-sm text-slate-600">{t.loginSubtitle}</p>

              <form onSubmit={handleMemberLogin} className="mt-6 space-y-4">
                <div>
                  <label
                    htmlFor="login-username"
                    className="block text-sm font-medium text-slate-800"
                  >
                    {t.loginUsernameLabel}
                  </label>
                  <input
                    id="login-username"
                    type="text"
                    required
                    autoComplete="username"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder={t.loginUsernamePlaceholder}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-mono text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/15"
                  />
                </div>

                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-sm font-medium text-slate-800"
                  >
                    {t.loginPasswordLabel}
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder={t.loginPasswordPlaceholder}
                      className="w-full rounded-lg border border-slate-300 bg-white pl-3.5 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/15"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="cursor-pointer absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {loginError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700"
                  >
                    {loginError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="cursor-pointer inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 transition-colors min-h-[44px]"
                >
                  <span>
                    {loginLoading ? t.loginLoadingBtn : t.loginSubmitBtn}
                  </span>
                </button>
              </form>
            </div>

            <p className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500">
              {t.loginHelper}
            </p>
          </div>
        </section>
      ) : (
        <>
          {/* Member Balance & bKash Summary Strip */}
          <section aria-label={t.balanceTitle} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <span>Signed in as</span>
                <strong className="font-mono font-semibold text-slate-900">
                  {profile?.username}
                </strong>
                <span aria-hidden="true">·</span>
                <span className="text-slate-500">{profile?.displayName}</span>
              </div>
              <span className="text-xs text-slate-500 tabular-nums">
                Rate: ৳{campaign.rewardPerReferral} per verified referral · Min bKash: ৳
                {campaign.minWithdrawAmount}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-medium text-slate-500">{t.statVerified}</p>
                <p className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
                  {balance.verifiedCount}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-medium text-slate-500">{t.statEarned}</p>
                <p className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
                  ৳{balance.totalEarned}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-medium text-slate-500">
                  {t.statWithdrawn}
                </p>
                <p className="mt-2 font-mono text-2xl font-semibold text-slate-700 tabular-nums">
                  ৳{balance.withdrawnOrPending}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5">
                <p className="text-xs font-medium text-emerald-800">
                  {t.statAvailable}
                </p>
                <p className="mt-2 font-mono text-2xl font-semibold text-emerald-800 tabular-nums">
                  ৳{balance.available}
                </p>
              </div>
            </div>
          </section>

          {/* Signed-in Workspace Grid: Share & Referral Form + bKash Withdrawal Form */}
          <section className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
            {/* Left Column: Share Link & Submit Referred Username */}
            <div id="share-link" className="lg:col-span-7 space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span className="font-medium text-slate-700">
                    {t.referralLinkLabel}
                  </span>
                  <span>
                    {t.referralCodeLabel}:{' '}
                    <strong className="font-mono font-semibold text-slate-900">
                      {campaign.referralCode}
                    </strong>
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex-1 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="truncate font-mono text-sm font-medium text-slate-900 select-all">
                      {campaign.referralLink}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 min-h-[44px]"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        <span>{t.copied}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span>{t.copyLink}</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-medium text-slate-500">
                    {t.shareVia}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={`https://wa.me/?text=${shareTextEncoded}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 min-h-[40px]"
                    >
                      WhatsApp
                    </a>
                    <a
                      href={`https://t.me/share/url?url=${shareUrlEncoded}&text=${shareTextEncoded}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 min-h-[40px]"
                    >
                      Telegram
                    </a>
                    <a
                      href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrlEncoded}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 min-h-[40px]"
                    >
                      Facebook
                    </a>
                    <button
                      type="button"
                      onClick={handleNativeShare}
                      className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 min-h-[40px]"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      <span>Share</span>
                    </button>
                    <a
                      href={campaign.referralLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 min-h-[40px]"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>{t.openLink}</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Submit Referred Username Form */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="font-display text-xl font-bold tracking-tight text-slate-900">
                  {t.formTitle}
                </h2>
                <p className="mt-1 text-sm text-slate-600">{t.formSubtitle}</p>

                <form onSubmit={handleSubmitReferral} className="mt-5 space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="referrer-username"
                        className="block text-sm font-medium text-slate-800"
                      >
                        {t.yourUsernameLabel}
                      </label>
                      <input
                        id="referrer-username"
                        type="text"
                        required
                        disabled={isSuspended}
                        minLength={VALIDATION_LIMITS.usernameMin}
                        maxLength={VALIDATION_LIMITS.referralUsernameMax}
                        value={referrerUsername}
                        onChange={(e) => setReferrerUsername(e.target.value)}
                        placeholder={t.yourUsernamePlaceholder}
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:border-blue-700 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="referred-username"
                        className="block text-sm font-medium text-slate-800"
                      >
                        {t.referredUsernameLabel}
                      </label>
                      <input
                        id="referred-username"
                        type="text"
                        required
                        disabled={isSuspended}
                        minLength={VALIDATION_LIMITS.usernameMin}
                        maxLength={VALIDATION_LIMITS.referralUsernameMax}
                        value={referredUsername}
                        onChange={(e) => setReferredUsername(e.target.value)}
                        placeholder={t.referredUsernamePlaceholder}
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:border-blue-700 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="share-channel"
                        className="block text-sm font-medium text-slate-800"
                      >
                        {t.channelLabel}
                      </label>
                      <select
                        id="share-channel"
                        disabled={isSuspended}
                        value={shareChannel}
                        onChange={(e) =>
                          setShareChannel(e.target.value as ShareChannel)
                        }
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
                      >
                        {SHARE_CHANNELS.map((ch) => (
                          <option key={ch} value={ch}>
                            {ch}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="submission-note"
                        className="block text-sm font-medium text-slate-800"
                      >
                        {t.noteLabel}
                      </label>
                      <input
                        id="submission-note"
                        type="text"
                        disabled={isSuspended}
                        maxLength={VALIDATION_LIMITS.noteMax}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder={t.notePlaceholder}
                        className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
                      />
                    </div>
                  </div>

                  {formError && (
                    <div
                      role="alert"
                      className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700"
                    >
                      {formError}
                    </div>
                  )}

                  {formSuccess && (
                    <div
                      role="status"
                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800"
                    >
                      {formSuccess}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || isSuspended}
                    className="cursor-pointer inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors min-h-[44px]"
                  >
                    <Send className="h-4 w-4" />
                    <span>{submitting ? t.submittingBtn : t.submitBtn}</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column: bKash Withdrawal ("tk tular") Card */}
            <div
              id="bkash-withdraw"
              className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 space-y-5"
            >
              <div>
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-pink-600" />
                  <h2 className="font-display text-xl font-bold tracking-tight text-slate-900">
                    {t.bkashTitle}
                  </h2>
                </div>
                <p className="mt-1 text-sm text-slate-600">{t.bkashSubtitle}</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">
                  {t.statAvailable}
                </span>
                <span className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                  ৳{balance.available}
                </span>
              </div>

              <form onSubmit={handleSubmitBkash} className="space-y-4">
                <div>
                  <label
                    htmlFor="bkash-number"
                    className="block text-sm font-medium text-slate-800"
                  >
                    {t.bkashNumberLabel}
                  </label>
                  <input
                    id="bkash-number"
                    type="tel"
                    inputMode="numeric"
                    required
                    disabled={isSuspended}
                    maxLength={11}
                    value={bkashNumber}
                    onChange={(e) =>
                      setBkashNumber(e.target.value.replace(/[^0-9]/g, ''))
                    }
                    placeholder={t.bkashNumberPlaceholder}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:border-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-600/15"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="bkash-type"
                      className="block text-sm font-medium text-slate-800"
                    >
                      {t.bkashTypeLabel}
                    </label>
                    <select
                      id="bkash-type"
                      disabled={isSuspended}
                      value={accountType}
                      onChange={(e) =>
                        setAccountType(e.target.value as BkashAccountType)
                      }
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-pink-600 focus:outline-none"
                    >
                      {BKASH_ACCOUNT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="bkash-amount"
                      className="block text-sm font-medium text-slate-800"
                    >
                      {t.bkashAmountLabel}
                    </label>
                    <input
                      id="bkash-amount"
                      type="number"
                      required
                      disabled={isSuspended}
                      min={Math.max(
                        campaign.minWithdrawAmount,
                        VALIDATION_LIMITS.minWithdrawalHard
                      )}
                      max={Math.max(
                        balance.available,
                        campaign.minWithdrawAmount
                      )}
                      step="1"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder={`${campaign.minWithdrawAmount}`}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-mono text-slate-900 tabular-nums focus:border-pink-600 focus:outline-none"
                    />
                  </div>
                </div>

                {withdrawError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700"
                  >
                    {withdrawError}
                  </div>
                )}

                {withdrawSuccess && (
                  <div
                    role="status"
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800"
                  >
                    {withdrawSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={withdrawing || isSuspended}
                  className="cursor-pointer inline-flex w-full items-center justify-center gap-2 rounded-lg bg-pink-600 px-5 py-3 text-sm font-semibold text-white hover:bg-pink-700 disabled:opacity-50 transition-colors min-h-[44px]"
                >
                  <Wallet className="h-4 w-4" />
                  <span>
                    {withdrawing ? t.bkashSubmittingBtn : t.bkashSubmitBtn}
                  </span>
                </button>
              </form>
            </div>
          </section>

          {/* Saved History: Referrals + bKash Withdrawals */}
          <section id="my-records" className="space-y-10 pt-2">
            {/* My Referrals Table */}
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-display text-xl font-bold tracking-tight text-slate-900">
                  {t.myReferralsTitle}
                </h2>
                <span className="text-xs text-slate-500 tabular-nums">
                  {submissions.length} records
                </span>
              </div>

              {loadingLists ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
                  <div className="h-10 w-full animate-pulse rounded bg-slate-100" />
                  <div className="h-10 w-full animate-pulse rounded bg-slate-100" />
                </div>
              ) : submissions.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
                  {t.emptyReferrals}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                        <th className="px-4 py-3">{t.referredUsernameLabel}</th>
                        <th className="px-4 py-3">{t.channelLabel}</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {submissions.map((row) => {
                        const isEditing = editingId === row.id;
                        return (
                          <tr key={row.id} className="hover:bg-slate-50/70">
                            <td className="px-4 py-3 font-mono font-medium text-slate-900">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editReferredUsername}
                                  onChange={(e) =>
                                    setEditReferredUsername(e.target.value)
                                  }
                                  className="w-40 rounded border border-slate-300 px-2 py-1 text-xs font-mono"
                                />
                              ) : (
                                row.referredUsername
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-600">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editNote}
                                  onChange={(e) => setEditNote(e.target.value)}
                                  className="w-44 rounded border border-slate-300 px-2 py-1 text-xs"
                                />
                              ) : (
                                <div className="space-y-0.5">
                                  <span className="font-medium text-slate-700">
                                    {row.shareChannel}
                                  </span>
                                  {row.note && (
                                    <p className="text-slate-500">{row.note}</p>
                                  )}
                                  {row.adminNote && (
                                    <p className="text-blue-700">
                                      Admin: {row.adminNote}
                                    </p>
                                  )}
                                </div>
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
                              {row.status === 'pending' ? (
                                isEditing ? (
                                  <div className="inline-flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => void handleSaveEdit(row)}
                                      disabled={editSaving}
                                      className="cursor-pointer rounded bg-slate-900 px-2.5 py-1 text-xs font-medium text-white"
                                    >
                                      {t.saveBtn}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingId(null)}
                                      className="cursor-pointer rounded border border-slate-200 px-2.5 py-1 text-xs text-slate-600"
                                    >
                                      {t.cancelBtn}
                                    </button>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleStartEdit(row)}
                                      className="cursor-pointer inline-flex items-center gap-1 rounded border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                                    >
                                      <Pencil className="h-3 w-3" />
                                      <span>{t.editBtn}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleDeletePendingReferral(row)
                                      }
                                      className="cursor-pointer inline-flex items-center gap-1 rounded border border-slate-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      <span>{t.deleteBtn}</span>
                                    </button>
                                  </div>
                                )
                              ) : (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* My bKash Withdrawals Table */}
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-display text-xl font-bold tracking-tight text-slate-900">
                  {t.myWithdrawalsTitle}
                </h2>
                <span className="text-xs text-slate-500 tabular-nums">
                  {withdrawals.length} requests
                </span>
              </div>

              {withdrawals.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
                  {t.emptyWithdrawals}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                        <th className="px-4 py-3">bKash Number</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">TrxID / Note</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {withdrawals.map((wd) => (
                        <tr key={wd.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3">
                            <span className="font-mono font-medium text-slate-900">
                              {wd.bkashNumber}
                            </span>
                            <span className="ml-2 text-xs text-slate-500">
                              · {wd.accountType}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono font-semibold text-slate-900 tabular-nums">
                            ৳{wd.amount}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600">
                            {wd.trxId && (
                              <p className="font-mono font-medium text-emerald-700">
                                TrxID: {wd.trxId}
                              </p>
                            )}
                            {wd.adminNote && (
                              <p className="text-slate-600">{wd.adminNote}</p>
                            )}
                            {!wd.trxId && !wd.adminNote && (
                              <span className="text-slate-400">—</span>
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
                            {wd.status === 'pending' ? (
                              <button
                                type="button"
                                onClick={() => void handleDeletePendingWithdrawal(wd)}
                                className="cursor-pointer inline-flex items-center gap-1 rounded border border-slate-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>{t.cancelBtn}</span>
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
