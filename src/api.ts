import type {
  BkashAccountType,
  BkashWithdrawal,
  CampaignSetting,
  ReferralStatus,
  ReferralSubmission,
  ShareChannel,
  UserAccountStatus,
  UserProfile,
  WithdrawalStatus,
} from './types';

const TOKEN_STORAGE_KEY = 'zulti_auth_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

async function apiFetch<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
  } & T;

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  return data;
}

export interface AuthSession {
  role: 'admin' | 'user';
  user?: UserProfile;
}

export async function fetchCampaign(): Promise<CampaignSetting> {
  return apiFetch<CampaignSetting>('/api/campaign');
}

export async function fetchSession(): Promise<AuthSession> {
  return apiFetch<AuthSession>('/api/auth/me');
}

export async function adminLogin(password: string): Promise<{ token: string }> {
  return apiFetch<{ token: string }>('/api/auth/admin-login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export async function memberLogin(
  username: string,
  password: string
): Promise<{ token: string; user: UserProfile }> {
  return apiFetch<{ token: string; user: UserProfile }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function fetchMyData(): Promise<{
  user: UserProfile;
  referrals: ReferralSubmission[];
  withdrawals: BkashWithdrawal[];
  campaign: CampaignSetting;
}> {
  return apiFetch('/api/my/data');
}

export async function submitReferral(payload: {
  referrerUsername: string;
  referredUsername: string;
  shareChannel: ShareChannel;
  note: string;
}): Promise<ReferralSubmission> {
  return apiFetch('/api/my/referrals', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateMyReferral(
  id: string,
  payload: { referredUsername: string; note: string }
): Promise<ReferralSubmission> {
  return apiFetch(`/api/my/referrals/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteMyReferral(id: string): Promise<void> {
  await apiFetch(`/api/my/referrals/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function requestBkashWithdrawal(payload: {
  bkashNumber: string;
  accountType: BkashAccountType;
  amount: number;
}): Promise<BkashWithdrawal> {
  return apiFetch('/api/my/withdrawals', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function cancelMyWithdrawal(id: string): Promise<void> {
  await apiFetch(`/api/my/withdrawals/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function fetchAdminOverview(): Promise<{
  referrals: ReferralSubmission[];
  withdrawals: BkashWithdrawal[];
  users: UserProfile[];
  campaign: CampaignSetting;
}> {
  return apiFetch('/api/admin/overview');
}

export async function adminUpdateReferral(
  id: string,
  payload: { status?: ReferralStatus; adminNote?: string }
): Promise<ReferralSubmission> {
  return apiFetch(`/api/admin/referrals/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function adminDeleteReferral(id: string): Promise<void> {
  await apiFetch(`/api/admin/referrals/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function adminUpdateWithdrawal(
  id: string,
  payload: { status?: WithdrawalStatus; trxId?: string; adminNote?: string }
): Promise<BkashWithdrawal> {
  return apiFetch(`/api/admin/withdrawals/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function adminDeleteWithdrawal(id: string): Promise<void> {
  await apiFetch(`/api/admin/withdrawals/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function adminCreateUser(payload: {
  username: string;
  displayName: string;
  password: string;
  bonusBalance: number;
}): Promise<UserProfile> {
  return apiFetch('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function adminUpdateUser(
  id: string,
  payload: {
    status?: UserAccountStatus;
    bonusBalance?: number;
    newPassword?: string;
  }
): Promise<UserProfile> {
  return apiFetch(`/api/admin/users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function adminDeleteUser(id: string): Promise<void> {
  await apiFetch(`/api/admin/users/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function adminUpdateCampaign(payload: {
  referralCode: string;
  referralLink: string;
  campaignTitle: string;
  instructions: string;
  rewardPerReferral: number;
  minWithdrawAmount: number;
}): Promise<CampaignSetting> {
  return apiFetch('/api/admin/campaign', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function adminChangePassword(newPassword: string): Promise<void> {
  await apiFetch('/api/admin/change-password', {
    method: 'POST',
    body: JSON.stringify({ newPassword }),
  });
}
