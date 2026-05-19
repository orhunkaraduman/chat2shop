import { logger } from 'firebase-functions';

import { getDb } from './admin';
import { grantPurchaseReward, grantSellerPurchaseRewards } from './buyerCredits';
import { HttpError } from './security';

type CheckoutCartItem = {
  productId: string;
  size: string;
  quantity: number;
  [key: string]: unknown;
};

type CheckoutSellerOrderItem = {
  productId: string;
  title: string;
  imageUrl: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  total: number;
  [key: string]: unknown;
};

type CheckoutOrder = {
  id: string;
  buyerId?: string;
  items: CheckoutCartItem[];
  subtotal: number;
  shipping: number;
  total: number;
  addressLabel: string;
  paymentLabel: string;
  deliveryOptionId: string;
  deliveryLabel: string;
  deliveryEta: string;
  sellerOrderIds?: string[];
  createdAt: string;
  updatedAt?: string;
  [key: string]: unknown;
};

type CheckoutSellerOrder = {
  id: string;
  sellerId: string;
  buyerId?: string;
  buyerOrderId: string;
  items: CheckoutSellerOrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  status: string;
  addressLabel: string;
  paymentLabel: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
};

type CommitCheckoutInput = {
  order: CheckoutOrder;
  sellerOrders: CheckoutSellerOrder[];
};

type ProductSnapshot = {
  id?: string;
  sellerId?: string;
  status?: string;
  stock?: number;
  price?: number;
};

export async function commitCheckout(uid: string, body: unknown) {
  const input = validateCommitCheckoutInput(uid, body);
  const now = new Date().toISOString();
  const db = getDb();
  const productQuantities = getProductQuantities(input.sellerOrders);
  const productRefs = Array.from(productQuantities.keys()).map((productId) => ({
    productId,
    ref: db.collection('products').doc(productId),
  }));

  const order: CheckoutOrder = {
    ...input.order,
    buyerId: uid,
    updatedAt: now,
    sellerOrderIds: input.sellerOrders.map((sellerOrder) => sellerOrder.id),
  };
  const sellerOrders = input.sellerOrders.map((sellerOrder) => ({
    ...sellerOrder,
    buyerId: uid,
    buyerOrderId: order.id,
    status: 'new',
    updatedAt: now,
  }));

  await db.runTransaction(async (transaction) => {
    const productDocs = await Promise.all(productRefs.map(({ ref }) => transaction.get(ref)));

    productDocs.forEach((snapshot, index) => {
      const productId = productRefs[index].productId;
      if (!snapshot.exists) {
        throw new HttpError(409, `Ürün bulunamadı: ${productId}`);
      }

      const product = snapshot.data() as ProductSnapshot;
      const quantity = productQuantities.get(productId) ?? 0;
      const sellerOrder = sellerOrders.find((item) => item.items.some((orderItem) => orderItem.productId === productId));
      const sellerOrderItem = sellerOrder?.items.find((item) => item.productId === productId);

      if (product.status !== 'active') {
        throw new HttpError(409, `Ürün artık satışta değil: ${productId}`);
      }
      if (!sellerOrder || product.sellerId !== sellerOrder.sellerId) {
        throw new HttpError(409, `Ürün satıcı eşleşmesi geçersiz: ${productId}`);
      }
      if (!Number.isFinite(product.stock) || (product.stock ?? 0) < quantity) {
        throw new HttpError(409, `Stok yetersiz: ${sellerOrderItem?.title ?? productId}`);
      }
      if (
        sellerOrderItem &&
        Number.isFinite(product.price) &&
        Math.abs((product.price ?? 0) - sellerOrderItem.unitPrice) > 0.01
      ) {
        throw new HttpError(409, `Ürün fiyatı değişti: ${sellerOrderItem.title}`);
      }
    });

    transaction.set(db.collection('orders').doc(uid).collection('items').doc(order.id), stripUndefined(order));
    sellerOrders.forEach((sellerOrder) => {
      transaction.set(
        db.collection('sellerOrders').doc(sellerOrder.sellerId).collection('items').doc(sellerOrder.id),
        stripUndefined(sellerOrder),
      );
    });
    productRefs.forEach(({ productId, ref }) => {
      const quantity = productQuantities.get(productId) ?? 0;
      const snapshot = productDocs[productRefs.findIndex((item) => item.productId === productId)];
      const stock = ((snapshot.data() as ProductSnapshot | undefined)?.stock ?? 0) - quantity;
      transaction.update(ref, { stock, updatedAt: now });
    });
    transaction.set(db.collection('users').doc(uid), { cartItems: [], updatedAt: now }, { merge: true });
  });

  let buyerCredits = await grantPurchaseReward(uid, order.id, {
    orderId: order.id,
    sellerOrderIds: order.sellerOrderIds,
    subtotal: order.subtotal,
    shipping: order.shipping,
    total: order.total,
  }).catch((error) => {
    logger.warn('Checkout committed but purchase reward could not be granted.', {
      uid,
      orderId: order.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  });
  const sponsoredBuyerCredits = await grantSellerPurchaseRewards(uid, sellerOrders).catch((error) => {
    logger.warn('Checkout committed but seller purchase reward could not be granted.', {
      uid,
      orderId: order.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  });
  if (sponsoredBuyerCredits) {
    buyerCredits = sponsoredBuyerCredits;
  }

  logger.info('Committed checkout transaction.', {
    uid,
    orderId: order.id,
    sellerOrderCount: sellerOrders.length,
    productCount: productRefs.length,
  });

  return { order, sellerOrders, buyerCredits };
}

function validateCommitCheckoutInput(uid: string, value: unknown): CommitCheckoutInput {
  if (!uid) {
    throw new HttpError(401, 'Checkout requires an authenticated user.');
  }
  if (!isRecord(value)) {
    throw new HttpError(400, 'Request body must be a JSON object.');
  }

  const order = value.order;
  const sellerOrders = value.sellerOrders;
  if (!isRecord(order)) {
    throw new HttpError(400, 'order is required.');
  }
  if (!Array.isArray(sellerOrders)) {
    throw new HttpError(400, 'sellerOrders must be an array.');
  }

  const normalizedOrder = order as CheckoutOrder;
  if (!isNonEmptyString(normalizedOrder.id)) throw new HttpError(400, 'order.id is required.');
  if (normalizedOrder.buyerId && normalizedOrder.buyerId !== uid) {
    throw new HttpError(403, 'Order buyer does not match authenticated user.');
  }
  if (!Array.isArray(normalizedOrder.items) || normalizedOrder.items.length === 0) {
    throw new HttpError(400, 'order.items must not be empty.');
  }
  normalizedOrder.items.forEach((item) => validateCartItem(item));
  if (!isValidMoney(normalizedOrder.subtotal) || !isValidMoney(normalizedOrder.shipping) || !isValidMoney(normalizedOrder.total)) {
    throw new HttpError(400, 'Order totals are invalid.');
  }
  if (!isNonEmptyString(normalizedOrder.addressLabel) || !isNonEmptyString(normalizedOrder.paymentLabel)) {
    throw new HttpError(400, 'Order address and payment snapshots are required.');
  }
  if (!isNonEmptyString(normalizedOrder.deliveryOptionId) || !isNonEmptyString(normalizedOrder.deliveryLabel)) {
    throw new HttpError(400, 'Order delivery selection is required.');
  }

  const normalizedSellerOrders = sellerOrders.map((sellerOrder) => {
    if (!isRecord(sellerOrder)) {
      throw new HttpError(400, 'sellerOrders entries must be objects.');
    }
    const normalized = sellerOrder as CheckoutSellerOrder;
    validateSellerOrder(uid, normalized, normalizedOrder.id);
    return normalized;
  });

  const sellerProductIds = new Set(
    normalizedSellerOrders.flatMap((sellerOrder) => sellerOrder.items.map((item) => item.productId)),
  );
  normalizedOrder.items.forEach((item) => {
    if (!sellerProductIds.has(item.productId)) {
      throw new HttpError(400, `Cart item is missing seller order snapshot: ${item.productId}`);
    }
  });

  return { order: normalizedOrder, sellerOrders: normalizedSellerOrders };
}

function validateCartItem(item: unknown): asserts item is CheckoutCartItem {
  if (!isRecord(item)) {
    throw new HttpError(400, 'Cart item must be an object.');
  }
  if (!isNonEmptyString(item.productId)) throw new HttpError(400, 'Cart item productId is required.');
  if (!isNonEmptyString(item.size)) throw new HttpError(400, 'Cart item size is required.');
  if (typeof item.quantity !== 'number' || !Number.isInteger(item.quantity) || item.quantity <= 0) {
    throw new HttpError(400, 'Cart item quantity must be a positive integer.');
  }
}

function validateSellerOrder(uid: string, order: CheckoutSellerOrder, buyerOrderId: string) {
  if (!isNonEmptyString(order.id)) throw new HttpError(400, 'sellerOrder.id is required.');
  if (!isNonEmptyString(order.sellerId)) throw new HttpError(400, 'sellerOrder.sellerId is required.');
  if (order.buyerId && order.buyerId !== uid) throw new HttpError(403, 'Seller order buyer mismatch.');
  if (order.buyerOrderId !== buyerOrderId) throw new HttpError(400, 'Seller order buyerOrderId mismatch.');
  if (!Array.isArray(order.items) || order.items.length === 0) throw new HttpError(400, 'sellerOrder.items must not be empty.');
  if (order.status !== 'new') throw new HttpError(400, 'Seller order status must be new during checkout.');
  if (!isValidMoney(order.subtotal) || !isValidMoney(order.shipping) || !isValidMoney(order.total)) {
    throw new HttpError(400, 'Seller order totals are invalid.');
  }
  order.items.forEach((item) => validateSellerOrderItem(item));
}

function validateSellerOrderItem(item: unknown): asserts item is CheckoutSellerOrderItem {
  if (!isRecord(item)) throw new HttpError(400, 'Seller order item must be an object.');
  if (!isNonEmptyString(item.productId)) throw new HttpError(400, 'Seller item productId is required.');
  if (!isNonEmptyString(item.title)) throw new HttpError(400, 'Seller item title is required.');
  if (typeof item.quantity !== 'number' || !Number.isInteger(item.quantity) || item.quantity <= 0) {
    throw new HttpError(400, 'Seller item quantity must be a positive integer.');
  }
  if (!isValidMoney(item.unitPrice) || !isValidMoney(item.total)) {
    throw new HttpError(400, 'Seller item pricing is invalid.');
  }
}

function getProductQuantities(sellerOrders: CheckoutSellerOrder[]) {
  const quantities = new Map<string, number>();
  sellerOrders.forEach((sellerOrder) => {
    sellerOrder.items.forEach((item) => {
      quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
    });
  });
  if (quantities.size === 0) {
    throw new HttpError(400, 'Checkout must include at least one seller-backed product.');
  }
  return quantities;
}

function isValidMoney(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
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
