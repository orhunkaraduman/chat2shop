import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  CheckoutFooter,
  CheckoutGuard,
  CheckoutSection,
  CheckoutStepLayout,
  MiniOrderItem,
  SummaryLine,
  getCheckoutItems,
} from '@/components/CheckoutFlow';
import { useAppState } from '@/state/AppContext';
import { colors, formatPrice } from '@/theme';

export default function CheckoutReviewScreen() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();
  const {
    cartItems,
    catalog,
    cartTotal,
    checkoutDetails,
    addressBook,
    paymentMethods,
    deliveryOptions,
    completePurchase,
    getCheckoutValidationErrors,
  } = useAppState();

  const items = getCheckoutItems(cartItems, catalog);
  const selectedAddress = addressBook.find((address) => address.id === checkoutDetails.addressId);
  const selectedPaymentMethod = paymentMethods.find((paymentMethod) => paymentMethod.id === checkoutDetails.paymentMethodId);
  const selectedDeliveryOption =
    deliveryOptions.find((option) => option.id === checkoutDetails.deliveryOptionId) ?? deliveryOptions[0];
  const total = cartTotal + (items.length > 0 ? selectedDeliveryOption.price : 0);
  const validationErrors = getCheckoutValidationErrors();

  if (items.length === 0) {
    return (
      <CheckoutStepLayout step={4} title="Onay" onBack={() => router.push('/checkout/payment')}>
        <CheckoutGuard onAction={() => router.push('/checkout')} />
      </CheckoutStepLayout>
    );
  }

  return (
    <CheckoutStepLayout
      step={4}
      title="Onay"
      subtitle="Siparişini tamamlamadan önce son kez kontrol et."
      onBack={() => router.push('/checkout/payment')}
      footer={
        <CheckoutFooter
          caption="Toplam"
          total={formatPrice(total)}
          primaryLabel={isSubmitting ? 'Sipariş oluşturuluyor' : 'Siparişi oluştur'}
          disabled={validationErrors.length > 0 || isSubmitting}
          onPrimaryPress={async () => {
            if (isSubmitting) return;
            setSubmitError(undefined);
            setIsSubmitting(true);
            try {
              const order = await completePurchase();
              if (order) {
                router.replace({ pathname: '/checkout/success', params: { id: order.id } });
              } else {
                setSubmitError('Sipariş oluşturulamadı. Bilgileri kontrol edip tekrar dene.');
              }
            } finally {
              setIsSubmitting(false);
            }
          }}
        />
      }
    >
      <CheckoutSection title="Ürünler" subtitle={`${items.length} ürün`}>
        <View style={styles.stack}>
          {items.map((item) => (
            <MiniOrderItem key={`${item.productId}-${item.size}`} item={item} />
          ))}
        </View>
      </CheckoutSection>

      <CheckoutSection title="Teslimat">
        <View style={styles.stack}>
          <InfoRow label="Adres" value={selectedAddress ? `${selectedAddress.label} · ${selectedAddress.district}, ${selectedAddress.city}` : 'Seçilmedi'} />
          <InfoRow label="Alıcı" value={selectedAddress ? `${selectedAddress.recipient} · ${selectedAddress.phone}` : 'Seçilmedi'} />
          <InfoRow label="Kargo" value={`${selectedDeliveryOption.label} · ${selectedDeliveryOption.eta}`} />
          {checkoutDetails.note ? <InfoRow label="Not" value={checkoutDetails.note} /> : null}
        </View>
      </CheckoutSection>

      <CheckoutSection title="Ödeme">
        <InfoRow
          label="Yöntem"
          value={
            selectedPaymentMethod
              ? selectedPaymentMethod.type === 'cash'
                ? `${selectedPaymentMethod.label} · Kapıda ödeme`
                : `${selectedPaymentMethod.brand} •••• ${selectedPaymentMethod.last4}`
              : 'Seçilmedi'
          }
        />
      </CheckoutSection>

      {validationErrors.length > 0 ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Eksik bilgiler</Text>
          {validationErrors.map((error) => (
            <Text key={error} style={styles.errorText}>
              {`\u2022 ${error}`}
            </Text>
          ))}
        </View>
      ) : null}
      {submitError ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Sipariş tamamlanamadı</Text>
          <Text style={styles.errorText}>{submitError}</Text>
        </View>
      ) : null}

      <CheckoutSection title="Toplam">
        <View style={styles.stack}>
          <SummaryLine label="Ara toplam" value={formatPrice(cartTotal)} />
          <SummaryLine label="Teslimat" value={formatPrice(selectedDeliveryOption.price)} />
          <SummaryLine label="Tahmini teslimat" value={selectedDeliveryOption.eta} />
          <View style={styles.divider} />
          <SummaryLine label="Ödenecek toplam" value={formatPrice(total)} strong />
        </View>
      </CheckoutSection>
    </CheckoutStepLayout>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 10,
  },
  infoRow: {
    gap: 4,
  },
  infoLabel: {
    color: colors.mutedSoft,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  infoValue: {
    color: colors.inkStrong,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  errorCard: {
    borderRadius: 18,
    backgroundColor: colors.warning,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    padding: 12,
    gap: 5,
  },
  errorTitle: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '900',
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
});
