import { getDb } from './admin';
import { reverseRewardsForReturnRequest } from './buyerCredits';
import { HttpError } from './security';

type ReturnRequestStatus = 'requested' | 'approved' | 'rejected' | 'received' | 'refunded-mock';

type ReturnRequestRecord = {
  id: string;
  buyerId: string;
  sellerId: string;
  buyerOrderId: string;
  sellerOrderId: string;
  productId: string;
  status: ReturnRequestStatus;
  decisionNote?: string;
  updatedAt: string;
};

export async function updateReturnRequestStatus(
  sellerId: string,
  body: unknown,
): Promise<{ returnRequest: ReturnRequestRecord; reversal?: { reversedCount: number } }> {
  await assertSellerAccount(sellerId);
  if (!isRecord(body)) throw new HttpError(400, 'Request body must be an object.');

  const buyerId = getNonEmptyString(body.buyerId, 'buyerId');
  const requestId = getNonEmptyString(body.requestId, 'requestId');
  const status = getReturnStatus(body.status);
  const decisionNote = typeof body.decisionNote === 'string' ? body.decisionNote.trim() : undefined;
  const db = getDb();
  const requestRef = db.collection('returnRequests').doc(buyerId).collection('items').doc(requestId);
  const updatedAt = new Date().toISOString();

  const returnRequest = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(requestRef);
    if (!snapshot.exists) throw new HttpError(404, 'return_request_not_found');

    const request = normalizeReturnRequest(snapshot.data(), snapshot.id);
    if (request.sellerId !== sellerId) throw new HttpError(403, 'return_request_not_owned');

    const nextRequest: ReturnRequestRecord = {
      ...request,
      status,
      decisionNote: decisionNote || request.decisionNote,
      updatedAt,
    };
    transaction.set(requestRef, stripUndefined(nextRequest), { merge: true });
    return nextRequest;
  });

  if (status !== 'refunded-mock') {
    return { returnRequest };
  }

  const reversal = await reverseRewardsForReturnRequest({
    id: returnRequest.id,
    buyerId: returnRequest.buyerId,
    sellerId: returnRequest.sellerId,
    buyerOrderId: returnRequest.buyerOrderId,
    sellerOrderId: returnRequest.sellerOrderId,
    productId: returnRequest.productId,
  });
  return { returnRequest, reversal: { reversedCount: reversal.reversedCount } };
}

async function assertSellerAccount(uid: string) {
  const snapshot = await getDb().collection('users').doc(uid).get();
  if (snapshot.data()?.role !== 'seller') {
    throw new HttpError(403, 'return_update_requires_seller');
  }
}

function normalizeReturnRequest(value: FirebaseFirestore.DocumentData | undefined, id: string): ReturnRequestRecord {
  return {
    id: String(value?.id || id),
    buyerId: String(value?.buyerId || ''),
    sellerId: String(value?.sellerId || ''),
    buyerOrderId: String(value?.buyerOrderId || ''),
    sellerOrderId: String(value?.sellerOrderId || ''),
    productId: String(value?.productId || ''),
    status: getReturnStatus(value?.status),
    decisionNote: typeof value?.decisionNote === 'string' ? value.decisionNote : undefined,
    updatedAt: typeof value?.updatedAt === 'string' ? value.updatedAt : new Date().toISOString(),
  };
}

function getReturnStatus(value: unknown): ReturnRequestStatus {
  if (['requested', 'approved', 'rejected', 'received', 'refunded-mock'].includes(String(value))) {
    return String(value) as ReturnRequestStatus;
  }
  throw new HttpError(400, 'invalid_return_status');
}

function getNonEmptyString(value: unknown, field: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new HttpError(400, `${field} is required.`);
  }
  return value.trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}
