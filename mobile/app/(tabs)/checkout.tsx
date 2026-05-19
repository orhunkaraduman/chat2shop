import { router } from 'expo-router';
import { Minus, Plus, Trash2 } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  CheckoutFooter,
  CheckoutGuard,
  CheckoutSection,
  CheckoutStepLayout,
  SummaryLine,
  getCheckoutItems,
} from '@/components/CheckoutFlow';
import { useAppState } from '@/state/AppContext';
import { colors, formatPrice } from '@/theme';

export default function CartScreen() {
  const {
    cartItems,
    catalog,
    cartTotal,
    checkoutDetails,
    deliveryOptions,
    clearCart,
    incrementCartItem,
    decrementCartItem,
    removeCartItem,
    updateCartItemSize,
  } = useAppState();

  const items = getCheckoutItems(cartItems, catalog);
  const selectedDeliveryOption =
    deliveryOptions.find((option) => option.id === checkoutDetails.deliveryOptionId) ?? deliveryOptions[0];
  const total = cartTotal + (items.length > 0 ? selectedDeliveryOption.price : 0);

  if (items.length === 0) {
    return (
      <CheckoutStepLayout
        step={1}
        title="Sepet"
        subtitle="Satın almak istediğin parçalar burada görünür."
        includeBottomInset={false}
      >
        <CheckoutGuard
          title="Sepetin boş"
          body="Ürünleri keşfet, favorilerinden seç veya Chat2Shop asistanından öneri iste."
          actionLabel="Keşfet'e git"
          onAction={() => router.push('/explore')}
        />
      </CheckoutStepLayout>
    );
  }

  return (
    <CheckoutStepLayout
      step={1}
      title="Sepet"
      subtitle={`${items.length} ürün satın alma için hazır.`}
      includeBottomInset={false}
      footer={
        <CheckoutFooter
          caption="Tahmini toplam"
          total={formatPrice(total)}
          primaryLabel="Satın almaya geç"
          onPrimaryPress={() => router.push('/checkout/delivery')}
        />
      }
    >
      <CheckoutSection title="Ürünler" subtitle="Beden, adet ve ürünleri buradan düzenle." actionLabel="Sepeti temizle" onAction={clearCart}>
        <View style={styles.itemList}>
          {items.map(({ product, size, quantity }) => (
            <View key={`${product.id}-${size}`} style={styles.cartItem}>
              <Image source={{ uri: product.imageUrl }} style={styles.cartImage} resizeMode="cover" />
              <View style={styles.cartBody}>
                <View style={styles.rowBetween}>
                  <Text style={styles.itemTitle} numberOfLines={2}>
                    {product.title}
                  </Text>
                  <Pressable onPress={() => removeCartItem(product.id, size)} hitSlop={8}>
                    <Trash2 size={16} color={colors.mutedSoft} />
                  </Pressable>
                </View>
                <Text style={styles.itemMeta}>Renk {product.color}</Text>
                <View style={styles.sizeRail}>
                  {product.sizes.map((option) => (
                    <Pressable
                      key={option}
                      style={[styles.sizeChip, option === size && styles.sizeChipActive]}
                      onPress={() => updateCartItemSize(product.id, size, option)}
                    >
                      <Text style={[styles.sizeChipText, option === size && styles.sizeChipTextActive]}>{option}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.rowBetween}>
                  <Text style={styles.itemPrice}>{formatPrice(product.price * quantity)}</Text>
                  <View style={styles.stepper}>
                    <Pressable style={styles.stepperButton} onPress={() => decrementCartItem(product.id, size)}>
                      <Minus size={13} color={colors.inkStrong} />
                    </Pressable>
                    <Text style={styles.quantity}>{quantity}</Text>
                    <Pressable style={styles.stepperButton} onPress={() => incrementCartItem(product.id, size)}>
                      <Plus size={13} color={colors.inkStrong} />
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      </CheckoutSection>

      <CheckoutSection title="Özet" subtitle="Teslimat bir sonraki adımda değiştirilebilir.">
        <View style={styles.summary}>
          <SummaryLine label="Ara toplam" value={formatPrice(cartTotal)} />
          <SummaryLine label="Teslimat" value={formatPrice(selectedDeliveryOption.price)} />
          <View style={styles.divider} />
          <SummaryLine label="Toplam" value={formatPrice(total)} strong />
        </View>
      </CheckoutSection>
    </CheckoutStepLayout>
  );
}

const styles = StyleSheet.create({
  itemList: {
    gap: 12,
  },
  cartItem: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 18,
    backgroundColor: colors.surfaceSubtle,
    padding: 10,
  },
  cartImage: {
    width: 82,
    height: 108,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  cartBody: {
    flex: 1,
    gap: 7,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  itemTitle: {
    flex: 1,
    color: colors.inkStrong,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
  },
  itemMeta: {
    color: colors.mutedSoft,
    fontSize: 12,
    fontWeight: '700',
  },
  sizeRail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  sizeChip: {
    minHeight: 26,
    borderRadius: 13,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeChipActive: {
    borderColor: colors.commerce,
    backgroundColor: colors.commerceSoft,
  },
  sizeChipText: {
    color: colors.mutedSoft,
    fontSize: 11,
    fontWeight: '900',
  },
  sizeChipTextActive: {
    color: colors.commerce,
  },
  itemPrice: {
    color: colors.inkStrong,
    fontSize: 14,
    fontWeight: '900',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantity: {
    minWidth: 18,
    color: colors.inkStrong,
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '900',
  },
  summary: {
    gap: 10,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
});
