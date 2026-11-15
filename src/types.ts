export type ShareChannel = 'WhatsApp' | 'Telegram' | 'Facebook' | 'Direct Link' | 'Other';
export type ReferralStatus = 'pending' | 'verified' | 'rejected';
export type WithdrawalStatus = 'pending' | 'paid' | 'rejected';
export type BkashAccountType = 'Personal' | 'Agent';
export type UserAccountStatus = 'active' | 'suspended';
export type Language = 'en' | 'bn';

export const DEFAULT_REFERRAL_CODE = 'N3GGHT6E6F';
export const DEFAULT_REFERRAL_LINK = 'https://zulti.com/?r=N3GGHT6E6F';

export const VALIDATION_LIMITS = {
  usernameMin: 2,
  usernameMax: 40,
  loginUsernameRegex: /^[a-zA-Z0-9_.-]+$/,
  referralUsernameMax: 64,
  referralUsernameRegex: /^[a-zA-Z0-9_.@-]+$/,
  passwordMin: 4,
  codeMin: 3,
  codeMax: 32,
  codeRegex: /^[a-zA-Z0-9_-]+$/,
  linkMin: 10,
  linkMax: 200,
  noteMax: 300,
  adminNoteMax: 300,
  nameMin: 1,
  nameMax: 80,
  titleMin: 3,
  titleMax: 120,
  instructionsMin: 5,
  instructionsMax: 500,
  bkashRegex: /^01[3-9][0-9]{8}$/,
  minWithdrawalHard: 10,
  maxWithdrawalHard: 500000,
  trxIdMax: 64,
} as const;

export const SHARE_CHANNELS: ShareChannel[] = [
  'WhatsApp',
  'Telegram',
  'Facebook',
  'Direct Link',
  'Other',
];

export const BKASH_ACCOUNT_TYPES: BkashAccountType[] = ['Personal', 'Agent'];

export interface ReferralSubmission {
  id: string;
  submitterUid: string;
  submitterEmail: string;
  submitterName: string;
  referrerUsername: string;
  referredUsername: string;
  referralCode: string;
  referralLink: string;
  shareChannel: ShareChannel;
  note: string;
  status: ReferralStatus;
  adminNote: string;
  createdAt: number;
  updatedAt: number;
}

export interface BkashWithdrawal {
  id: string;
  submitterUid: string;
  submitterUsername: string;
  submitterName: string;
  bkashNumber: string;
  accountType: BkashAccountType;
  amount: number;
  status: WithdrawalStatus;
  trxId: string;
  adminNote: string;
  createdAt: number;
  updatedAt: number;
}

export interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
  savedUsername: string;
  role: 'user';
  status: UserAccountStatus;
  bonusBalance: number;
  createdAt: number;
  updatedAt: number;
}

export interface CampaignSetting {
  referralCode: string;
  referralLink: string;
  campaignTitle: string;
  instructions: string;
  rewardPerReferral: number;
  minWithdrawAmount: number;
  updatedAt: number;
}
