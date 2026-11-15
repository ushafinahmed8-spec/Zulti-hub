import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import express, { type NextFunction, type Request, type Response } from 'express';

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, 'zulti.db');

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    saved_username TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    bonus_balance INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS referrals (
    id TEXT PRIMARY KEY,
    submitter_id TEXT NOT NULL,
    submitter_username TEXT NOT NULL,
    submitter_name TEXT NOT NULL,
    referrer_username TEXT NOT NULL,
    referred_username TEXT NOT NULL,
    referral_code TEXT NOT NULL,
    referral_link TEXT NOT NULL,
    share_channel TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    admin_note TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS withdrawals (
    id TEXT PRIMARY KEY,
    submitter_id TEXT NOT NULL,
    submitter_username TEXT NOT NULL,
    submitter_name TEXT NOT NULL,
    bkash_number TEXT NOT NULL,
    account_type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    trx_id TEXT NOT NULL DEFAULT '',
    admin_note TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hex] = stored.split(':');
  if (!salt || !hex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hex, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  return row ? row.value : null;
}

function setSetting(key: string, value: string): void {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, value);
}

// Bootstrap persistent secret, default admin password (shafin101), and campaign config
if (!getSetting('session_secret')) {
  setSetting('session_secret', crypto.randomBytes(32).toString('hex'));
}
if (!getSetting('admin_password_hash')) {
  setSetting('admin_password_hash', hashPassword('shafin101'));
}
if (!getSetting('campaign_config')) {
  setSetting(
    'campaign_config',
    JSON.stringify({
      referralCode: 'N3GGHT6E6F',
      referralLink: 'https://zulti.com/?r=N3GGHT6E6F',
      campaignTitle: 'Zulti Partner Referral Program',
      instructions:
        'Share the link below with your contacts, submit their username, and withdraw your earnings via bKash.',
      rewardPerReferral: 50,
      minWithdrawAmount: 50,
      updatedAt: Date.now(),
    })
  );
}

const SESSION_SECRET = getSetting('session_secret')!;
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface TokenPayload {
  sub: string;
  role: 'admin' | 'user';
  username: string;
  exp: number;
}

function signToken(payload: Omit<TokenPayload, 'exp'>): string {
  const fullPayload: TokenPayload = {
    ...payload,
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const data = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(data)
    .digest('base64url');
  return `${data}.${sig}`;
}

function verifyToken(token: string): TokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(data)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(data, 'base64url').toString('utf8')
    ) as TokenPayload;
    if (!parsed.exp || parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

interface AuthedRequest extends Request {
  auth?: TokenPayload;
}

function extractBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim();
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const token = extractBearer(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Session expired. Please sign in again.' });
    return;
  }
  req.auth = payload;
  next();
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.auth?.role !== 'admin') {
      res.status(403).json({ error: 'Administrator access required.' });
      return;
    }
    next();
  });
}

function requireUser(req: AuthedRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.auth?.role !== 'user') {
      res.status(403).json({ error: 'Member account required.' });
      return;
    }
    next();
  });
}

interface UserRow {
  id: string;
  username: string;
  display_name: string;
  saved_username: string;
  password_hash: string;
  status: 'active' | 'suspended';
  bonus_balance: number;
  created_at: number;
  updated_at: number;
}

interface ReferralRow {
  id: string;
  submitter_id: string;
  submitter_username: string;
  submitter_name: string;
  referrer_username: string;
  referred_username: string;
  referral_code: string;
  referral_link: string;
  share_channel: string;
  note: string;
  status: 'pending' | 'verified' | 'rejected';
  admin_note: string;
  created_at: number;
  updated_at: number;
}

interface WithdrawalRow {
  id: string;
  submitter_id: string;
  submitter_username: string;
  submitter_name: string;
  bkash_number: string;
  account_type: 'Personal' | 'Agent';
  amount: number;
  status: 'pending' | 'paid' | 'rejected';
  trx_id: string;
  admin_note: string;
  created_at: number;
  updated_at: number;
}

function mapUser(u: UserRow) {
  return {
    uid: u.id,
    username: u.username,
    displayName: u.display_name,
    savedUsername: u.saved_username,
    role: 'user' as const,
    status: u.status,
    bonusBalance: u.bonus_balance,
    createdAt: u.created_at,
    updatedAt: u.updated_at,
  };
}

function mapReferral(r: ReferralRow) {
  return {
    id: r.id,
    submitterUid: r.submitter_id,
    submitterEmail: r.submitter_username,
    submitterName: r.submitter_name,
    referrerUsername: r.referrer_username,
    referredUsername: r.referred_username,
    referralCode: r.referral_code,
    referralLink: r.referral_link,
    shareChannel: r.share_channel,
    note: r.note,
    status: r.status,
    adminNote: r.admin_note,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapWithdrawal(w: WithdrawalRow) {
  return {
    id: w.id,
    submitterUid: w.submitter_id,
    submitterUsername: w.submitter_username,
    submitterName: w.submitter_name,
    bkashNumber: w.bkash_number,
    accountType: w.account_type,
    amount: w.amount,
    status: w.status,
    trxId: w.trx_id,
    adminNote: w.admin_note,
    createdAt: w.created_at,
    updatedAt: w.updated_at,
  };
}

function getCampaignConfig() {
  const raw = getSetting('campaign_config');
  if (!raw) {
    return {
      referralCode: 'N3GGHT6E6F',
      referralLink: 'https://zulti.com/?r=N3GGHT6E6F',
      campaignTitle: 'Zulti Partner Referral Program',
      instructions:
        'Share the link below with your contacts, submit their username, and withdraw your earnings via bKash.',
      rewardPerReferral: 50,
      minWithdrawAmount: 50,
      updatedAt: Date.now(),
    };
  }
  return JSON.parse(raw) as {
    referralCode: string;
    referralLink: string;
    campaignTitle: string;
    instructions: string;
    rewardPerReferral: number;
    minWithdrawAmount: number;
    updatedAt: number;
  };
}

function getUserAvailableBalance(userId: string): number {
  const userRow = db
    .prepare('SELECT bonus_balance FROM users WHERE id = ?')
    .get(userId) as { bonus_balance: number } | undefined;
  if (!userRow) return 0;

  const campaign = getCampaignConfig();
  const verifiedCountRow = db
    .prepare(
      "SELECT COUNT(*) as cnt FROM referrals WHERE submitter_id = ? AND status = 'verified'"
    )
    .get(userId) as { cnt: number };

  const withdrawnRow = db
    .prepare(
      "SELECT COALESCE(SUM(amount), 0) as total FROM withdrawals WHERE submitter_id = ? AND status IN ('pending', 'paid')"
    )
    .get(userId) as { total: number };

  const earned =
    verifiedCountRow.cnt * campaign.rewardPerReferral + userRow.bonus_balance;
  return Math.max(0, earned - withdrawnRow.total);
}

const app = express();
app.use(express.json({ limit: '1mb' }));

// Public campaign settings
app.get('/api/campaign', (_req: Request, res: Response) => {
  res.json(getCampaignConfig());
});

// Admin password login (default: shafin101)
app.post('/api/auth/admin-login', (req: Request, res: Response) => {
  const { password } = req.body as { password?: string };
  if (typeof password !== 'string' || password.length < 1) {
    res.status(400).json({ error: 'Password is required.' });
    return;
  }

  const storedHash = getSetting('admin_password_hash');
  if (!storedHash || !verifyPassword(password, storedHash)) {
    res.status(401).json({ error: 'Incorrect admin password.' });
    return;
  }

  const token = signToken({
    sub: 'admin',
    role: 'admin',
    username: 'admin',
  });
  res.json({ token, role: 'admin' });
});

// Member username + password login
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body as {
    username?: string;
    password?: string;
  };

  if (typeof username !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: 'Username and password are required.' });
    return;
  }

  const cleanUsername = username.trim().toLowerCase();
  const userRow = db
    .prepare('SELECT * FROM users WHERE username = ?')
    .get(cleanUsername) as UserRow | undefined;

  if (!userRow || !verifyPassword(password, userRow.password_hash)) {
    res.status(401).json({ error: 'Invalid username or password.' });
    return;
  }

  const token = signToken({
    sub: userRow.id,
    role: 'user',
    username: userRow.username,
  });
  res.json({
    token,
    role: 'user',
    user: mapUser(userRow),
  });
});

// Verify current session
app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res: Response) => {
  if (req.auth?.role === 'admin') {
    res.json({ role: 'admin' });
    return;
  }

  const userRow = db
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(req.auth!.sub) as UserRow | undefined;
  if (!userRow) {
    res.status(401).json({ error: 'Account no longer exists.' });
    return;
  }

  res.json({ role: 'user', user: mapUser(userRow) });
});

// Member Portal Data
app.get('/api/my/data', requireUser, (req: AuthedRequest, res: Response) => {
  const userRow = db
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(req.auth!.sub) as UserRow | undefined;
  if (!userRow) {
    res.status(401).json({ error: 'Account not found.' });
    return;
  }

  const referralRows = db
    .prepare(
      'SELECT * FROM referrals WHERE submitter_id = ? ORDER BY created_at DESC'
    )
    .all(userRow.id) as unknown as ReferralRow[];

  const withdrawalRows = db
    .prepare(
      'SELECT * FROM withdrawals WHERE submitter_id = ? ORDER BY created_at DESC'
    )
    .all(userRow.id) as unknown as WithdrawalRow[];

  res.json({
    user: mapUser(userRow),
    referrals: referralRows.map(mapReferral),
    withdrawals: withdrawalRows.map(mapWithdrawal),
    campaign: getCampaignConfig(),
  });
});

// Submit Referred Username
app.post('/api/my/referrals', requireUser, (req: AuthedRequest, res: Response) => {
  const userRow = db
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(req.auth!.sub) as UserRow | undefined;
  if (!userRow) {
    res.status(401).json({ error: 'Account not found.' });
    return;
  }
  if (userRow.status !== 'active') {
    res.status(403).json({ error: 'Your account is currently suspended.' });
    return;
  }

  const { referrerUsername, referredUsername, shareChannel, note } = req.body as {
    referrerUsername?: string;
    referredUsername?: string;
    shareChannel?: string;
    note?: string;
  };

  const cleanReferrer = (referrerUsername || '').trim();
  const cleanReferred = (referredUsername || '').trim();
  const cleanNote = (note || '').trim().slice(0, 300);
  const allowedChannels = [
    'WhatsApp',
    'Telegram',
    'Facebook',
    'Direct Link',
    'Other',
  ];
  const channel = allowedChannels.includes(shareChannel || '')
    ? shareChannel!
    : 'Other';

  const usernamePattern = /^[a-zA-Z0-9_.@-]+$/;
  if (
    cleanReferrer.length < 2 ||
    cleanReferrer.length > 64 ||
    !usernamePattern.test(cleanReferrer)
  ) {
    res.status(400).json({ error: 'Enter a valid referrer username (2-64 chars).' });
    return;
  }
  if (
    cleanReferred.length < 2 ||
    cleanReferred.length > 64 ||
    !usernamePattern.test(cleanReferred)
  ) {
    res.status(400).json({ error: 'Enter a valid referred username (2-64 chars).' });
    return;
  }

  const campaign = getCampaignConfig();
  const now = Date.now();
  const id = `ref_${now}_${crypto.randomBytes(3).toString('hex')}`;

  db.prepare(
    `INSERT INTO referrals (
      id, submitter_id, submitter_username, submitter_name,
      referrer_username, referred_username, referral_code, referral_link,
      share_channel, note, status, admin_note, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', '', ?, ?)`
  ).run(
    id,
    userRow.id,
    userRow.username,
    userRow.display_name,
    cleanReferrer,
    cleanReferred,
    campaign.referralCode,
    campaign.referralLink,
    channel,
    cleanNote,
    now,
    now
  );

  db.prepare(
    'UPDATE users SET saved_username = ?, updated_at = ? WHERE id = ?'
  ).run(cleanReferrer, now, userRow.id);

  const created = db
    .prepare('SELECT * FROM referrals WHERE id = ?')
    .get(id) as unknown as ReferralRow;
  res.status(201).json(mapReferral(created));
});

// Edit Pending Referral
app.patch(
  '/api/my/referrals/:id',
  requireUser,
  (req: AuthedRequest, res: Response) => {
    const existing = db
      .prepare('SELECT * FROM referrals WHERE id = ?')
      .get(req.params.id) as unknown as ReferralRow | undefined;

    if (!existing || existing.submitter_id !== req.auth!.sub) {
      res.status(404).json({ error: 'Referral not found.' });
      return;
    }
    if (existing.status !== 'pending') {
      res.status(400).json({ error: 'Reviewed referrals cannot be edited.' });
      return;
    }

    const { referredUsername, note } = req.body as {
      referredUsername?: string;
      note?: string;
    };
    const cleanReferred = (referredUsername ?? existing.referred_username).trim();
    const cleanNote = (note ?? existing.note).trim().slice(0, 300);

    if (
      cleanReferred.length < 2 ||
      cleanReferred.length > 64 ||
      !/^[a-zA-Z0-9_.@-]+$/.test(cleanReferred)
    ) {
      res.status(400).json({ error: 'Invalid referred username.' });
      return;
    }

    const now = Date.now();
    db.prepare(
      'UPDATE referrals SET referred_username = ?, note = ?, updated_at = ? WHERE id = ?'
    ).run(cleanReferred, cleanNote, now, existing.id);

    const updated = db
      .prepare('SELECT * FROM referrals WHERE id = ?')
      .get(existing.id) as unknown as ReferralRow;
    res.json(mapReferral(updated));
  }
);

// Delete Pending Referral
app.delete(
  '/api/my/referrals/:id',
  requireUser,
  (req: AuthedRequest, res: Response) => {
    const existing = db
      .prepare('SELECT * FROM referrals WHERE id = ?')
      .get(req.params.id) as unknown as ReferralRow | undefined;
    if (!existing || existing.submitter_id !== req.auth!.sub) {
      res.status(404).json({ error: 'Referral not found.' });
      return;
    }
    if (existing.status !== 'pending') {
      res.status(400).json({ error: 'Reviewed referrals cannot be deleted.' });
      return;
    }
    db.prepare('DELETE FROM referrals WHERE id = ?').run(existing.id);
    res.json({ deleted: true });
  }
);

// Request bKash Withdrawal
app.post('/api/my/withdrawals', requireUser, (req: AuthedRequest, res: Response) => {
  const userRow = db
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(req.auth!.sub) as UserRow | undefined;
  if (!userRow) {
    res.status(401).json({ error: 'Account not found.' });
    return;
  }
  if (userRow.status !== 'active') {
    res.status(403).json({ error: 'Your account is currently suspended.' });
    return;
  }

  const { bkashNumber, accountType, amount } = req.body as {
    bkashNumber?: string;
    accountType?: string;
    amount?: number;
  };

  const cleanNumber = (bkashNumber || '').trim();
  if (!/^01[3-9][0-9]{8}$/.test(cleanNumber)) {
    res.status(400).json({ error: 'Enter a valid 11-digit bKash number.' });
    return;
  }

  const cleanType = accountType === 'Agent' ? 'Agent' : 'Personal';
  const parsedAmount = Math.round(Number(amount));
  const campaign = getCampaignConfig();
  const minRequired = Math.max(10, campaign.minWithdrawAmount);

  if (!Number.isFinite(parsedAmount) || parsedAmount < minRequired) {
    res.status(400).json({ error: `Minimum withdrawal is ৳${minRequired}.` });
    return;
  }

  const available = getUserAvailableBalance(userRow.id);
  if (parsedAmount > available) {
    res
      .status(400)
      .json({ error: `Insufficient available balance (৳${available}).` });
    return;
  }

  const now = Date.now();
  const id = `wd_${now}_${crypto.randomBytes(3).toString('hex')}`;

  db.prepare(
    `INSERT INTO withdrawals (
      id, submitter_id, submitter_username, submitter_name,
      bkash_number, account_type, amount, status, trx_id, admin_note,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', '', '', ?, ?)`
  ).run(
    id,
    userRow.id,
    userRow.username,
    userRow.display_name,
    cleanNumber,
    cleanType,
    parsedAmount,
    now,
    now
  );

  const created = db
    .prepare('SELECT * FROM withdrawals WHERE id = ?')
    .get(id) as unknown as WithdrawalRow;
  res.status(201).json(mapWithdrawal(created));
});

// Cancel Pending Withdrawal
app.delete(
  '/api/my/withdrawals/:id',
  requireUser,
  (req: AuthedRequest, res: Response) => {
    const existing = db
      .prepare('SELECT * FROM withdrawals WHERE id = ?')
      .get(req.params.id) as unknown as WithdrawalRow | undefined;
    if (!existing || existing.submitter_id !== req.auth!.sub) {
      res.status(404).json({ error: 'Withdrawal request not found.' });
      return;
    }
    if (existing.status !== 'pending') {
      res.status(400).json({ error: 'Processed withdrawals cannot be cancelled.' });
      return;
    }
    db.prepare('DELETE FROM withdrawals WHERE id = ?').run(existing.id);
    res.json({ deleted: true });
  }
);

// ADMIN OVERVIEW
app.get('/api/admin/overview', requireAdmin, (_req: Request, res: Response) => {
  const referralRows = db
    .prepare('SELECT * FROM referrals ORDER BY created_at DESC')
    .all() as unknown as ReferralRow[];
  const withdrawalRows = db
    .prepare('SELECT * FROM withdrawals ORDER BY created_at DESC')
    .all() as unknown as WithdrawalRow[];
  const userRows = db
    .prepare('SELECT * FROM users ORDER BY created_at DESC')
    .all() as unknown as UserRow[];

  res.json({
    referrals: referralRows.map(mapReferral),
    withdrawals: withdrawalRows.map(mapWithdrawal),
    users: userRows.map(mapUser),
    campaign: getCampaignConfig(),
  });
});

// ADMIN: Review Referral
app.patch(
  '/api/admin/referrals/:id',
  requireAdmin,
  (req: Request, res: Response) => {
    const existing = db
      .prepare('SELECT * FROM referrals WHERE id = ?')
      .get(req.params.id) as unknown as ReferralRow | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Referral not found.' });
      return;
    }

    const { status, adminNote } = req.body as {
      status?: 'pending' | 'verified' | 'rejected';
      adminNote?: string;
    };

    const nextStatus =
      status && ['pending', 'verified', 'rejected'].includes(status)
        ? status
        : existing.status;
    const nextNote =
      typeof adminNote === 'string'
        ? adminNote.trim().slice(0, 300)
        : existing.admin_note;

    db.prepare(
      'UPDATE referrals SET status = ?, admin_note = ?, updated_at = ? WHERE id = ?'
    ).run(nextStatus, nextNote, Date.now(), existing.id);

    const updated = db
      .prepare('SELECT * FROM referrals WHERE id = ?')
      .get(existing.id) as unknown as ReferralRow;
    res.json(mapReferral(updated));
  }
);

app.delete(
  '/api/admin/referrals/:id',
  requireAdmin,
  (req: Request, res: Response) => {
    db.prepare('DELETE FROM referrals WHERE id = ?').run(req.params.id);
    res.json({ deleted: true });
  }
);

// ADMIN: Process bKash Withdrawal
app.patch(
  '/api/admin/withdrawals/:id',
  requireAdmin,
  (req: Request, res: Response) => {
    const existing = db
      .prepare('SELECT * FROM withdrawals WHERE id = ?')
      .get(req.params.id) as unknown as WithdrawalRow | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Withdrawal not found.' });
      return;
    }

    const { status, trxId, adminNote } = req.body as {
      status?: 'pending' | 'paid' | 'rejected';
      trxId?: string;
      adminNote?: string;
    };

    const nextStatus =
      status && ['pending', 'paid', 'rejected'].includes(status)
        ? status
        : existing.status;
    const nextTrxId =
      typeof trxId === 'string' ? trxId.trim().slice(0, 64) : existing.trx_id;
    const nextNote =
      typeof adminNote === 'string'
        ? adminNote.trim().slice(0, 300)
        : existing.admin_note;

    db.prepare(
      'UPDATE withdrawals SET status = ?, trx_id = ?, admin_note = ?, updated_at = ? WHERE id = ?'
    ).run(nextStatus, nextTrxId, nextNote, Date.now(), existing.id);

    const updated = db
      .prepare('SELECT * FROM withdrawals WHERE id = ?')
      .get(existing.id) as unknown as WithdrawalRow;
    res.json(mapWithdrawal(updated));
  }
);

app.delete(
  '/api/admin/withdrawals/:id',
  requireAdmin,
  (req: Request, res: Response) => {
    db.prepare('DELETE FROM withdrawals WHERE id = ?').run(req.params.id);
    res.json({ deleted: true });
  }
);

// ADMIN: Create User & Password
app.post('/api/admin/users', requireAdmin, (req: Request, res: Response) => {
  const { username, displayName, password, bonusBalance } = req.body as {
    username?: string;
    displayName?: string;
    password?: string;
    bonusBalance?: number;
  };

  const cleanUsername = (username || '').trim().toLowerCase();
  const cleanName = (displayName || '').trim().slice(0, 80);
  const cleanBonus = Math.max(0, Math.round(Number(bonusBalance) || 0));

  if (
    cleanUsername.length < 2 ||
    cleanUsername.length > 40 ||
    !/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)
  ) {
    res.status(400).json({
      error: 'Username must be 2-40 characters (letters, numbers, _, ., -).',
    });
    return;
  }
  if (!cleanName) {
    res.status(400).json({ error: 'Full name is required.' });
    return;
  }
  if (typeof password !== 'string' || password.length < 4) {
    res.status(400).json({ error: 'Password must be at least 4 characters.' });
    return;
  }

  const dup = db
    .prepare('SELECT id FROM users WHERE username = ?')
    .get(cleanUsername);
  if (dup) {
    res.status(409).json({ error: `Username "${cleanUsername}" already exists.` });
    return;
  }

  const now = Date.now();
  const id = `usr_${now}_${crypto.randomBytes(3).toString('hex')}`;
  const passwordHash = hashPassword(password);

  db.prepare(
    `INSERT INTO users (
      id, username, display_name, saved_username, password_hash,
      status, bonus_balance, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)`
  ).run(
    id,
    cleanUsername,
    cleanName,
    cleanUsername,
    passwordHash,
    cleanBonus,
    now,
    now
  );

  const created = db
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(id) as unknown as UserRow;
  res.status(201).json(mapUser(created));
});

// ADMIN: Update User Status, Bonus, or Reset Password
app.patch('/api/admin/users/:id', requireAdmin, (req: Request, res: Response) => {
  const existing = db
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(req.params.id) as unknown as UserRow | undefined;
  if (!existing) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const { status, bonusBalance, newPassword } = req.body as {
    status?: 'active' | 'suspended';
    bonusBalance?: number;
    newPassword?: string;
  };

  const nextStatus =
    status && ['active', 'suspended'].includes(status) ? status : existing.status;
  const nextBonus =
    typeof bonusBalance === 'number' && Number.isFinite(bonusBalance)
      ? Math.max(0, Math.round(bonusBalance))
      : existing.bonus_balance;

  let nextHash = existing.password_hash;
  if (typeof newPassword === 'string' && newPassword.length > 0) {
    if (newPassword.length < 4) {
      res.status(400).json({ error: 'Password must be at least 4 characters.' });
      return;
    }
    nextHash = hashPassword(newPassword);
  }

  db.prepare(
    'UPDATE users SET status = ?, bonus_balance = ?, password_hash = ?, updated_at = ? WHERE id = ?'
  ).run(nextStatus, nextBonus, nextHash, Date.now(), existing.id);

  const updated = db
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(existing.id) as unknown as UserRow;
  res.json(mapUser(updated));
});

app.delete('/api/admin/users/:id', requireAdmin, (req: Request, res: Response) => {
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ deleted: true });
});

// ADMIN: Update Campaign & bKash Settings
app.put('/api/admin/campaign', requireAdmin, (req: Request, res: Response) => {
  const {
    referralCode,
    referralLink,
    campaignTitle,
    instructions,
    rewardPerReferral,
    minWithdrawAmount,
  } = req.body as {
    referralCode?: string;
    referralLink?: string;
    campaignTitle?: string;
    instructions?: string;
    rewardPerReferral?: number;
    minWithdrawAmount?: number;
  };

  const cleanCode = (referralCode || '').trim();
  const cleanLink = (referralLink || '').trim();
  const cleanTitle = (campaignTitle || '').trim();
  const cleanInstructions = (instructions || '').trim();
  const reward = Math.max(0, Math.round(Number(rewardPerReferral) || 0));
  const minWd = Math.max(10, Math.round(Number(minWithdrawAmount) || 50));

  if (cleanCode.length < 3 || !/^[a-zA-Z0-9_-]+$/.test(cleanCode)) {
    res.status(400).json({ error: 'Invalid referral code.' });
    return;
  }
  if (cleanLink.length < 10) {
    res.status(400).json({ error: 'Invalid referral link.' });
    return;
  }

  const nextConfig = {
    referralCode: cleanCode,
    referralLink: cleanLink,
    campaignTitle: cleanTitle || 'Zulti Partner Referral Program',
    instructions: cleanInstructions || 'Share the referral link and submit usernames.',
    rewardPerReferral: reward,
    minWithdrawAmount: minWd,
    updatedAt: Date.now(),
  };

  setSetting('campaign_config', JSON.stringify(nextConfig));
  res.json(nextConfig);
});

// ADMIN: Change Admin Password
app.post(
  '/api/admin/change-password',
  requireAdmin,
  (req: Request, res: Response) => {
    const { newPassword } = req.body as { newPassword?: string };
    if (typeof newPassword !== 'string' || newPassword.length < 4) {
      res
        .status(400)
        .json({ error: 'New admin password must be at least 4 characters.' });
      return;
    }
    setSetting('admin_password_hash', hashPassword(newPassword));
    res.json({ updated: true });
  }
);

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/api/')) {
        next();
        return;
      }
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Zulti Referral Hub server running on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
