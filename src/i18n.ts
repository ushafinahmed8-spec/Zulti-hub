import type { Language } from './types';

export const COPY: Record<
  Language,
  {
    brand: string;
    navShare: string;
    navWithdraw: string;
    navRecords: string;
    navAdmin: string;
    userLoginBtn: string;
    signOut: string;
    heroHeadline: string;
    heroSubhead: string;
    referralLinkLabel: string;
    referralCodeLabel: string;
    copyLink: string;
    copied: string;
    openLink: string;
    shareVia: string;
    shareMessagePrefix: string;
    loginTitle: string;
    loginSubtitle: string;
    loginUsernameLabel: string;
    loginUsernamePlaceholder: string;
    loginPasswordLabel: string;
    loginPasswordPlaceholder: string;
    loginSubmitBtn: string;
    loginLoadingBtn: string;
    loginHelper: string;
    formTitle: string;
    formSubtitle: string;
    yourUsernameLabel: string;
    yourUsernamePlaceholder: string;
    referredUsernameLabel: string;
    referredUsernamePlaceholder: string;
    channelLabel: string;
    noteLabel: string;
    notePlaceholder: string;
    submitBtn: string;
    submittingBtn: string;
    submitSuccess: string;
    balanceTitle: string;
    statVerified: string;
    statEarned: string;
    statWithdrawn: string;
    statAvailable: string;
    bkashTitle: string;
    bkashSubtitle: string;
    bkashNumberLabel: string;
    bkashNumberPlaceholder: string;
    bkashTypeLabel: string;
    bkashAmountLabel: string;
    bkashSubmitBtn: string;
    bkashSubmittingBtn: string;
    bkashSuccess: string;
    myReferralsTitle: string;
    myWithdrawalsTitle: string;
    emptyReferrals: string;
    emptyWithdrawals: string;
    statusPending: string;
    statusVerified: string;
    statusPaid: string;
    statusRejected: string;
    editBtn: string;
    deleteBtn: string;
    saveBtn: string;
    cancelBtn: string;
    adminTitle: string;
    adminSubtitle: string;
    adminLoginTitle: string;
    adminLoginSubtitle: string;
    adminSetupTitle: string;
    adminSetupSubtitle: string;
    adminPasswordLabel: string;
    adminConfirmPasswordLabel: string;
    adminLoginBtn: string;
    adminSetupBtn: string;
    backToPortal: string;
    tabReferrals: string;
    tabWithdrawals: string;
    tabUsers: string;
    tabSettings: string;
    exportCsv: string;
    verifyBtn: string;
    rejectBtn: string;
    markPaidBtn: string;
    noteBtn: string;
    createUserTitle: string;
    createUserBtn: string;
    generatePwBtn: string;
    copyCredsBtn: string;
    campaignSettingsTitle: string;
    saveSettingsBtn: string;
    settingsSaved: string;
  }
> = {
  en: {
    brand: 'Zulti Referral Hub',
    navShare: 'Share & Submit',
    navWithdraw: 'bKash Withdraw',
    navRecords: 'My History',
    navAdmin: 'Admin Panel',
    userLoginBtn: 'User Login',
    signOut: 'Sign Out',
    heroHeadline: 'Share your Zulti link, submit referred usernames, and withdraw via bKash.',
    heroSubhead:
      'Log in with the username and password provided by your admin, share the referral link below, submit each referred username, and withdraw your earnings to bKash.',
    referralLinkLabel: 'Official Referral Link',
    referralCodeLabel: 'Referral Code',
    copyLink: 'Copy Link',
    copied: 'Copied',
    openLink: 'Open Link',
    shareVia: 'Share directly',
    shareMessagePrefix: 'Join using my Zulti referral link:',
    loginTitle: 'Member Sign In',
    loginSubtitle: 'Enter the username and password created for you by the admin.',
    loginUsernameLabel: 'Username',
    loginUsernamePlaceholder: 'e.g. rafiq_bd',
    loginPasswordLabel: 'Password',
    loginPasswordPlaceholder: 'Enter your password',
    loginSubmitBtn: 'Sign In to Workspace',
    loginLoadingBtn: 'Signing In...',
    loginHelper: 'Only accounts created by the Admin Panel can sign in here.',
    formTitle: 'Submit Referred Username',
    formSubtitle: 'Enter the username of the person you shared the link with.',
    yourUsernameLabel: 'Your Username',
    yourUsernamePlaceholder: 'e.g. rafiq_bd',
    referredUsernameLabel: 'Referred Person Username',
    referredUsernamePlaceholder: 'e.g. sadia_99',
    channelLabel: 'Where You Shared',
    noteLabel: 'Note (Optional)',
    notePlaceholder: 'Optional note',
    submitBtn: 'Submit to Admin Panel',
    submittingBtn: 'Submitting...',
    submitSuccess: 'Referred username submitted and saved.',
    balanceTitle: 'Earnings & bKash Balance',
    statVerified: 'Verified Referrals',
    statEarned: 'Total Earned',
    statWithdrawn: 'Withdrawn / Pending',
    statAvailable: 'Available for bKash',
    bkashTitle: 'Withdraw via bKash',
    bkashSubtitle: 'Request a payout directly to your Personal or Agent bKash wallet.',
    bkashNumberLabel: 'bKash Number (11 digits)',
    bkashNumberPlaceholder: '017XXXXXXXX',
    bkashTypeLabel: 'Account Type',
    bkashAmountLabel: 'Amount (BDT)',
    bkashSubmitBtn: 'Request bKash Withdrawal',
    bkashSubmittingBtn: 'Sending Request...',
    bkashSuccess: 'bKash withdrawal request sent to Admin Panel.',
    myReferralsTitle: 'My Saved Referrals',
    myWithdrawalsTitle: 'My bKash Withdrawals',
    emptyReferrals: 'No referral submissions yet. Submit your first referred username above.',
    emptyWithdrawals: 'No bKash withdrawal requests yet.',
    statusPending: 'Pending',
    statusVerified: 'Verified',
    statusPaid: 'Paid',
    statusRejected: 'Rejected',
    editBtn: 'Edit',
    deleteBtn: 'Delete',
    saveBtn: 'Save',
    cancelBtn: 'Cancel',
    adminTitle: 'Admin Panel',
    adminSubtitle: 'Verify referrals, send bKash payouts, create user passwords, and configure payout rules.',
    adminLoginTitle: 'Admin Panel Login',
    adminLoginSubtitle: 'Enter your Admin Password to open the management console.',
    adminSetupTitle: 'Set Up Admin Password',
    adminSetupSubtitle: 'Create the password that protects your Admin Panel. You will use this password instead of Google.',
    adminPasswordLabel: 'Admin Password',
    adminConfirmPasswordLabel: 'Confirm Password',
    adminLoginBtn: 'Unlock Admin Panel',
    adminSetupBtn: 'Save Admin Password & Enter',
    backToPortal: 'Back to Portal',
    tabReferrals: 'Referrals',
    tabWithdrawals: 'bKash Withdrawals',
    tabUsers: 'Users & Passwords',
    tabSettings: 'Settings',
    exportCsv: 'Export CSV',
    verifyBtn: 'Verify',
    rejectBtn: 'Reject',
    markPaidBtn: 'Mark Paid',
    noteBtn: 'Note',
    createUserTitle: 'Create User Account & Password',
    createUserBtn: 'Create User',
    generatePwBtn: 'Generate',
    copyCredsBtn: 'Copy Login Info',
    campaignSettingsTitle: 'Referral Link & bKash Payout Settings',
    saveSettingsBtn: 'Save Settings',
    settingsSaved: 'Settings updated successfully.',
  },
  bn: {
    brand: 'Zulti Referral Hub',
    navShare: 'লিংক ও সাবমিট',
    navWithdraw: 'বিকাশ উত্তোলন',
    navRecords: 'আমার হিসাব',
    navAdmin: 'অ্যাডমিন প্যানেল',
    userLoginBtn: 'ইউজার লগইন',
    signOut: 'লগআউট',
    heroHeadline: 'রেফারেল লিংক শেয়ার করুন, ইউজারনেম দিন এবং বিকাশে টাকা তুলুন।',
    heroSubhead:
      'অ্যাডমিনের দেওয়া ইউজারনেম ও পাসওয়ার্ড দিয়ে লগইন করুন, নিচের লিংক শেয়ার করে রেফার করা ইউজারনেম সাবমিট করুন এবং আয় বিকাশে উত্তোলন করুন।',
    referralLinkLabel: 'অফিশিয়াল রেফারেল লিংক',
    referralCodeLabel: 'রেফারেল কোড',
    copyLink: 'লিংক কপি করুন',
    copied: 'কপি হয়েছে',
    openLink: 'লিংক খুলুন',
    shareVia: 'সরাসরি শেয়ার করুন',
    shareMessagePrefix: 'আমার Zulti রেফারেল লিংক দিয়ে জয়েন করুন:',
    loginTitle: 'ইউজার লগইন',
    loginSubtitle: 'অ্যাডমিনের দেওয়া আপনার ইউজারনেম ও পাসওয়ার্ড দিয়ে লগইন করুন।',
    loginUsernameLabel: 'ইউজারনেম',
    loginUsernamePlaceholder: 'যেমন: rafiq_bd',
    loginPasswordLabel: 'পাসওয়ার্ড',
    loginPasswordPlaceholder: 'আপনার পাসওয়ার্ড দিন',
    loginSubmitBtn: 'লগইন করুন',
    loginLoadingBtn: 'লগইন হচ্ছে...',
    loginHelper: 'শুধুমাত্র অ্যাডমিন প্যানেল থেকে তৈরি করা ইউজাররা এখানে লগইন করতে পারবেন।',
    formTitle: 'রেফার করা ইউজারনেম সাবমিট করুন',
    formSubtitle: 'আপনি যাকে লিংক শেয়ার করেছেন তার ইউজারনেম লিখুন।',
    yourUsernameLabel: 'আপনার ইউজারনেম',
    yourUsernamePlaceholder: 'যেমন: rafiq_bd',
    referredUsernameLabel: 'যাকে শেয়ার করেছেন তার ইউজারনেম',
    referredUsernamePlaceholder: 'যেমন: sadia_99',
    channelLabel: 'কোথায় শেয়ার করেছেন',
    noteLabel: 'নোট (ঐচ্ছিক)',
    notePlaceholder: 'প্রয়োজনীয় নোট থাকলে লিখুন',
    submitBtn: 'অ্যাডমিন প্যানেলে সাবমিট করুন',
    submittingBtn: 'সাবমিট হচ্ছে...',
    submitSuccess: 'সফলভাবে সাবমিট ও সেভ হয়েছে!',
    balanceTitle: 'আয় ও বিকাশ ব্যালেন্স',
    statVerified: 'ভেরিফাইড রেফারেল',
    statEarned: 'মোট আয়',
    statWithdrawn: 'উত্তোলন / পেন্ডিং',
    statAvailable: 'উত্তোলনযোগ্য ব্যালেন্স',
    bkashTitle: 'বিকাশ টাকা উত্তোলন',
    bkashSubtitle: 'আপনার পার্সোনাল বা এজেন্ট বিকাশ নম্বরে টাকা তুলতে অনুরোধ পাঠান।',
    bkashNumberLabel: 'বিকাশ নম্বর (১১ ডিজিট)',
    bkashNumberPlaceholder: '017XXXXXXXX',
    bkashTypeLabel: 'অ্যাকাউন্টের ধরন',
    bkashAmountLabel: 'টাকার পরিমাণ (৳)',
    bkashSubmitBtn: 'বিকাশ উত্তোলন অনুরোধ পাঠান',
    bkashSubmittingBtn: 'পাঠানো হচ্ছে...',
    bkashSuccess: 'বিকাশ টাকা তোলার অনুরোধ অ্যাডমিন প্যানেলে পাঠানো হয়েছে!',
    myReferralsTitle: 'আমার সাবমিট করা রেফারেল',
    myWithdrawalsTitle: 'আমার বিকাশ উত্তোলন হিস্ট্রি',
    emptyReferrals: 'এখনো কোনো রেফারেল সাবমিট করা হয়নি।',
    emptyWithdrawals: 'এখনো কোনো বিকাশ উত্তোলন অনুরোধ নেই।',
    statusPending: 'পেন্ডিং',
    statusVerified: 'ভেরিফাইড',
    statusPaid: 'পেইড',
    statusRejected: 'বাতিল',
    editBtn: 'এডিট',
    deleteBtn: 'ডিলিট',
    saveBtn: 'সেভ',
    cancelBtn: 'বাতিল',
    adminTitle: 'অ্যাডমিন প্যানেল',
    adminSubtitle: 'রেফারেল ভেরিফাই করুন, বিকাশ পেমেন্ট দিন এবং ইউজারদের পাসওয়ার্ড তৈরি করুন।',
    adminLoginTitle: 'অ্যাডমিন প্যানেল লগইন',
    adminLoginSubtitle: 'অ্যাডমিন প্যানেলে ঢুকতে আপনার অ্যাডমিন পাসওয়ার্ড দিন।',
    adminSetupTitle: 'অ্যাডমিন পাসওয়ার্ড সেট করুন',
    adminSetupSubtitle: 'আপনার অ্যাডমিন প্যানেলের জন্য একটি গোপন পাসওয়ার্ড তৈরি করুন। গুগল ছাড়াই এটি দিয়ে লগইন করবেন।',
    adminPasswordLabel: 'অ্যাডমিন পাসওয়ার্ড',
    adminConfirmPasswordLabel: 'পাসওয়ার্ড নিশ্চিত করুন',
    adminLoginBtn: 'অ্যাডমিন প্যানেলে ঢুকুন',
    adminSetupBtn: 'পাসওয়ার্ড সেভ করে ঢুকুন',
    backToPortal: 'পোর্টালে ফিরুন',
    tabReferrals: 'রেফারেল সমূহ',
    tabWithdrawals: 'বিকাশ উত্তোলন',
    tabUsers: 'ইউজার ও পাসওয়ার্ড',
    tabSettings: 'সেটিংস',
    exportCsv: 'CSV ডাউনলোড',
    verifyBtn: 'ভেরিফাই',
    rejectBtn: 'রিজেক্ট',
    markPaidBtn: 'পেইড করুন',
    noteBtn: 'নোট',
    createUserTitle: 'নতুন ইউজার ও পাসওয়ার্ড তৈরি করুন',
    createUserBtn: 'ইউজার তৈরি করুন',
    generatePwBtn: 'অটো পাসওয়ার্ড',
    copyCredsBtn: 'লগইন তথ্য কপি করুন',
    campaignSettingsTitle: 'রেফারেল লিংক ও বিকাশ সেটিংস',
    saveSettingsBtn: 'সেটিংস সেভ করুন',
    settingsSaved: 'সেটিংস আপডেট হয়েছে।',
  },
};
