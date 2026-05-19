import { logger } from 'firebase-functions';

import { getDb } from './admin';
import { HttpError } from './security';
import type {
  SellerCreditAccount,
  SellerCreditLedgerEntry,
  SellerCreditPackage,
  SellerCreditPackageId,
} from './types';

type UserRecord = {
  email?: string;
  role?: string;
};

const DEFAULT_WELCOME_CREDITS = 20;
const DEFAULT_PRODUCT_AI_CREDIT_COST = 1;
const DEFAULT_PRODUCT_IMAGE_ENHANCE_CREDIT_COST = 5;
const DEFAULT_SELLER_CREDIT_LIMIT_AMOUNT = 1000;

export const SELLER_CREDIT_PACKAGES: SellerCreditPackage[] = [
  {
    id: 'credits_100',
    credits: 100,
    amountTRY: 200,
    label: '100 jeton',
    description: '200 TL satıcı kredisi',
  },
  {
    id: 'credits_200',
    credits: 200,
    amountTRY: 400,
    label: '200 jeton',
    description: '400 TL satıcı kredisi',
  },
  {
    id: 'credits_500',
    credits: 500,
    amountTRY: 800,
    label: '500 jeton',
    description: '800 TL satıcı kredisi',
  },
];

export function getWelcomeCreditAmount() {
  return getPositiveNumberEnv('SELLER_WELCOME_AI_CREDITS', DEFAULT_WELCOME_CREDITS);
}

export function getProductAICreditCost() {
  return getPositiveNumberEnv('PRODUCT_AI_CREDIT_COST', DEFAULT_PRODUCT_AI_CREDIT_COST);
}

export function getProductImageEnhanceCreditCost() {
  return getPositiveNumberEnv('PRODUCT_IMAGE_ENHANCE_CREDIT_COST', DEFAULT_PRODUCT_IMAGE_ENHANCE_CREDIT_COST);
}

export function getSellerCreditLimitAmount() {
  return getPositiveNumberEnv('SELLER_CREDIT_LIMIT_AMOUNT', DEFAULT_SELLER_CREDIT_LIMIT_AMOUNT);
}

export function getSellerCreditPackages() {
  return SELLER_CREDIT_PACKAGES;
}

export async function getSellerCreditSummary(uid: string): Promise<SellerCreditAccount> {
  await assertSellerAccount(uid);
  return ensureSellerCreditAccount(uid);
}

export async function assertProductAICreditAvailable(uid: string): Promise<SellerCreditAccount> {
  const account = await getSellerCreditSummary(uid);
  const cost = getProductAICreditCost();
  if (getAvailableCredits(account) < cost) {
    throw new HttpError(402, 'insufficient_ai_credits');
  }
  return account;
}

export async function assertProductImageEnhanceCreditAvailable(uid: string): Promise<SellerCreditAccount> {
  const account = await getSellerCreditSummary(uid);
  const cost = getProductImageEnhanceCreditCost();
  if (getAvailableCredits(account) < cost) {
    throw new HttpError(402, 'insufficient_ai_credits');
  }
  return account;
}

export async function purchaseSellerCreditPackage(
  uid: string,
  input: { packageId?: unknown },
): Promise<{ sellerCredits: SellerCreditAccount; package: SellerCreditPackage }> {
  await assertSellerAccount(uid);

  const selectedPackage = getCreditPackage(input.packageId);
  if (!selectedPackage) {
    throw new HttpError(400, 'invalid_seller_credit_package');
  }

  const db = getDb();
  const accountRef = db.collection('sellerCredits').doc(uid);
  const grantLedgerRef = accountRef.collection('ledger').doc();
  const debtLedgerRef = accountRef.collection('ledger').doc();

  const sellerCredits = await db.runTransaction(async (transaction) => {
    const now = new Date().toISOString();
    const snapshot = await transaction.get(accountRef);
    const account = snapshot.exists
      ? normalizeAccount(snapshot.data(), uid)
      : createWelcomeAccount(uid, now);

    const nextDebt = roundCurrency(account.creditDebtAmount + selectedPackage.amountTRY);
    const limit = normalizeNumber(account.creditLimitAmount, getSellerCreditLimitAmount());
    if (nextDebt > limit) {
      throw new HttpError(402, 'seller_credit_limit_exceeded');
    }

    const nextAccount: SellerCreditAccount = {
      ...account,
      paidCredits: roundCredit(account.paidCredits + selectedPackage.credits),
      totalGrantedCredits: roundCredit(account.totalGrantedCredits + selectedPackage.credits),
      creditDebtAmount: nextDebt,
      creditLimitAmount: limit,
      updatedAt: now,
    };

    if (!snapshot.exists) {
      writeWelcomeGrantLedger(transaction, accountRef, uid, now, account);
    }

    const balanceAfter = {
      freeCredits: nextAccount.freeCredits,
      paidCredits: nextAccount.paidCredits,
    };

    const grantEntry: SellerCreditLedgerEntry = {
      id: grantLedgerRef.id,
      sellerId: uid,
      type: 'package_credit_grant',
      creditAmount: selectedPackage.credits,
      amountTRY: selectedPackage.amountTRY,
      balanceAfter,
      note: `${selectedPackage.label} AI credit package granted`,
      metadata: {
        packageId: selectedPackage.id,
        creditLimitAmount: limit,
        creditDebtAmount: nextDebt,
      },
      createdAt: now,
    };

    const debtEntry: SellerCreditLedgerEntry = {
      id: debtLedgerRef.id,
      sellerId: uid,
      type: 'credit_debt_created',
      creditAmount: 0,
      amountTRY: selectedPackage.amountTRY,
      balanceAfter,
      note: `${selectedPackage.description} added to seller credit balance`,
      metadata: {
        packageId: selectedPackage.id,
        creditLimitAmount: limit,
        creditDebtAmount: nextDebt,
      },
      createdAt: now,
    };

    transaction.set(accountRef, stripUndefined(nextAccount), { merge: true });
    transaction.set(grantLedgerRef, stripUndefined(grantEntry));
    transaction.set(debtLedgerRef, stripUndefined(debtEntry));

    logger.info('Granted seller AI credit package.', {
      uid,
      packageId: selectedPackage.id,
      credits: selectedPackage.credits,
      amountTRY: selectedPackage.amountTRY,
      creditDebtAmount: nextDebt,
      creditLimitAmount: limit,
    });

    return nextAccount;
  });

  return {
    sellerCredits,
    package: selectedPackage,
  };
}

export async function spendProductAICredit(
  uid: string,
  metadata: Record<string, unknown> = {},
): Promise<SellerCreditAccount> {
  return spendSellerAICredits(
    uid,
    getProductAICreditCost(),
    'ai_generation_spent',
    'AI product metadata generation',
    metadata,
  );
}

export async function spendProductImageEnhanceCredit(
  uid: string,
  metadata: Record<string, unknown> = {},
): Promise<SellerCreditAccount> {
  return spendSellerAICredits(
    uid,
    getProductImageEnhanceCreditCost(),
    'product_image_enhance_spent',
    'AI product image enhancement',
    metadata,
  );
}

async function spendSellerAICredits(
  uid: string,
  cost: number,
  type: SellerCreditLedgerEntry['type'],
  note: string,
  metadata: Record<string, unknown> = {},
): Promise<SellerCreditAccount> {
  await assertSellerAccount(uid);

  const db = getDb();
  const accountRef = db.collection('sellerCredits').doc(uid);
  const ledgerRef = accountRef.collection('ledger').doc();

  return db.runTransaction(async (transaction) => {
    const now = new Date().toISOString();
    const snapshot = await transaction.get(accountRef);
    const account = snapshot.exists
      ? normalizeAccount(snapshot.data(), uid)
      : createWelcomeAccount(uid, now);

    if (getAvailableCredits(account) < cost) {
      throw new HttpError(402, 'insufficient_ai_credits');
    }

    let remainingCost = cost;
    const freeSpend = Math.min(account.freeCredits, remainingCost);
    remainingCost -= freeSpend;
    const paidSpend = Math.min(account.paidCredits, remainingCost);
    remainingCost -= paidSpend;

    if (remainingCost > 0) {
      throw new HttpError(402, 'insufficient_ai_credits');
    }

    const nextAccount: SellerCreditAccount = {
      ...account,
      freeCredits: roundCredit(account.freeCredits - freeSpend),
      paidCredits: roundCredit(account.paidCredits - paidSpend),
      totalUsedCredits: roundCredit(account.totalUsedCredits + cost),
      updatedAt: now,
    };

    if (!snapshot.exists) {
      writeWelcomeGrantLedger(transaction, accountRef, uid, now, account);
    }

    const ledgerEntry: SellerCreditLedgerEntry = {
      id: ledgerRef.id,
      sellerId: uid,
      type,
      creditAmount: -cost,
      amountTRY: 0,
      balanceAfter: {
        freeCredits: nextAccount.freeCredits,
        paidCredits: nextAccount.paidCredits,
      },
      note,
      metadata: stripUndefined(metadata),
      createdAt: now,
    };

    transaction.set(accountRef, stripUndefined(nextAccount), { merge: true });
    transaction.set(ledgerRef, stripUndefined(ledgerEntry));

    logger.info('Spent seller AI credit.', {
      uid,
      type,
      cost,
      freeCredits: nextAccount.freeCredits,
      paidCredits: nextAccount.paidCredits,
    });

    return nextAccount;
  });
}

async function ensureSellerCreditAccount(uid: string): Promise<SellerCreditAccount> {
  const db = getDb();
  const accountRef = db.collection('sellerCredits').doc(uid);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(accountRef);
    if (snapshot.exists) {
      return normalizeAccount(snapshot.data(), uid);
    }

    const now = new Date().toISOString();
    const account = createWelcomeAccount(uid, now);
    writeWelcomeGrantLedger(transaction, accountRef, uid, now, account);
    transaction.set(accountRef, stripUndefined(account), { merge: true });

    logger.info('Granted welcome seller AI credits.', {
      uid,
      credits: account.freeCredits,
    });

    return account;
  });
}

async function assertSellerAccount(uid: string) {
  const userSnapshot = await getDb().collection('users').doc(uid).get();
  const user = userSnapshot.data() as UserRecord | undefined;
  if (user?.role !== 'seller') {
    throw new HttpError(403, 'seller_credit_requires_seller');
  }
}

function createWelcomeAccount(uid: string, now: string): SellerCreditAccount {
  const welcomeCredits = getWelcomeCreditAmount();
  return {
    sellerId: uid,
    freeCredits: welcomeCredits,
    paidCredits: 0,
    totalGrantedCredits: welcomeCredits,
    totalUsedCredits: 0,
    creditDebtAmount: 0,
    creditLimitAmount: getSellerCreditLimitAmount(),
    welcomeGrantApplied: true,
    createdAt: now,
    updatedAt: now,
  };
}

function writeWelcomeGrantLedger(
  transaction: FirebaseFirestore.Transaction,
  accountRef: FirebaseFirestore.DocumentReference,
  uid: string,
  now: string,
  account: SellerCreditAccount,
) {
  const ledgerRef = accountRef.collection('ledger').doc();
  const entry: SellerCreditLedgerEntry = {
    id: ledgerRef.id,
    sellerId: uid,
    type: 'welcome_grant',
    creditAmount: account.freeCredits,
    amountTRY: 0,
    balanceAfter: {
      freeCredits: account.freeCredits,
      paidCredits: account.paidCredits,
    },
    note: 'Seller welcome AI credit grant',
    createdAt: now,
  };
  transaction.set(ledgerRef, stripUndefined(entry));
}

function normalizeAccount(value: FirebaseFirestore.DocumentData | undefined, uid: string): SellerCreditAccount {
  const now = new Date().toISOString();
  return {
    sellerId: String(value?.sellerId || uid),
    freeCredits: normalizeNumber(value?.freeCredits),
    paidCredits: normalizeNumber(value?.paidCredits),
    totalGrantedCredits: normalizeNumber(value?.totalGrantedCredits),
    totalUsedCredits: normalizeNumber(value?.totalUsedCredits),
    creditDebtAmount: normalizeNumber(value?.creditDebtAmount),
    creditLimitAmount: normalizeNumber(value?.creditLimitAmount, getSellerCreditLimitAmount()),
    welcomeGrantApplied: value?.welcomeGrantApplied !== false,
    createdAt: typeof value?.createdAt === 'string' ? value.createdAt : now,
    updatedAt: typeof value?.updatedAt === 'string' ? value.updatedAt : now,
  };
}

function getAvailableCredits(account: SellerCreditAccount) {
  return roundCredit(account.freeCredits + account.paidCredits);
}

function getCreditPackage(packageId: unknown): SellerCreditPackage | undefined {
  const id = String(packageId) as SellerCreditPackageId;
  return SELLER_CREDIT_PACKAGES.find((item) => item.id === id);
}

function normalizeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundCredit(value: number) {
  return Math.max(0, Math.round(value * 100) / 100);
}

function roundCurrency(value: number) {
  return Math.max(0, Math.round(value * 100) / 100);
}

function getPositiveNumberEnv(key: string, fallback: number) {
  const value = Number(process.env[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as T;
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => typeof item !== 'undefined')
        .map(([key, item]) => [key, stripUndefined(item)]),
    ) as T;
  }
  return value;
}
