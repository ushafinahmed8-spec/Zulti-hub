# Security Specification

## 1. Data Invariants
1. **Admin Bootstrap Lock**: Once `/settings/adminLock` is created during initial admin password setup, it is immutable (`update, delete: if false`). Only the `admin@zulti.app` account listed in `/admins/{uid}` has admin privileges.
2. **Admin-Provisioned Users**: Only the admin can create `/users/{userId}` profiles (`role == 'user'`, `status == 'active'`). Users cannot self-elevate `role`, `status`, or `bonusBalance`.
3. **Active User Gate**: Only active users (`users/{uid}.status == 'active'`) or the admin can create `/referrals` or `/withdrawals` documents.
4. **Initial State Enforcement**: Both `/referrals` and `/withdrawals` must start with `status == 'pending'` and `adminNote == ''` (and `trxId == ''` for withdrawals). Only the admin can mark referrals `'verified'`/`'rejected'` or withdrawals `'paid'`/`'rejected'`.
5. **bKash Number & Amount Validation**: `bkashNumber` must match `^01[3-9][0-9]{8}$` (11 digits) and `amount` must be numeric between `10` and `500000`.
6. **Terminal State Locking**: Users can only edit/delete their own `'pending'` referrals or delete `'pending'` withdrawals. Once reviewed (`verified`/`paid`/`rejected`), user edits/deletes are blocked.
7. **Query Enforcement without Read Explosions**: Every `allow list` rule validates `resource.data.submitterUid == request.auth.uid || request.auth.token.email == 'admin@zulti.app'` directly without `get()`/`exists()`.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Unauthenticated Write**: Create `/referrals/ref_001` or `/withdrawals/wd_001` with `request.auth == null`.
2. **Duplicate Admin Bootstrap**: Attempt to create `/admins/{attackerUid}` after `/settings/adminLock` already exists.
3. **Self-Registration Escalation**: User attempts to create their own `/users/{uid}` document with `role: 'admin'` or `bonusBalance: 99999`.
4. **Suspended User Write**: User with `users/{uid}.status == 'suspended'` attempts to create a referral or bKash withdrawal.
5. **Self-Payout Forge**: User creates `/withdrawals/wd_002` with `status: 'paid'` or `trxId: 'FAKE123'`.
6. **Invalid bKash Number**: User creates `/withdrawals/wd_003` with `bkashNumber: '12345'` or a 500-char string.
7. **Negative Withdrawal Amount**: User submits `amount: -500` on `/withdrawals/wd_004`.
8. **Shadow Ghost Field Injection**: User submits `isApproved: true` inside `/referrals` or `/withdrawals`.
9. **Client Timestamp Forgery**: Payload provides a past timestamp instead of `request.time`.
10. **Bonus Tampering**: Regular user updates `/users/{uid}` attempting to modify `bonusBalance` or `status`.
11. **Terminal State Mutation**: User edits or deletes a withdrawal after admin marked it `'paid'`.
12. **Cross-User PII Read / List**: Regular user attempts `get` on another user's `/withdrawals/{otherId}` or unfiltered `list` on `/users`.
