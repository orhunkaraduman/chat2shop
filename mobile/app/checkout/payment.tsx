import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  CheckoutFooter,
  CheckoutGuard,
  CheckoutSection,
  CheckoutStepLayout,
  FormInput,
  SelectableRow,
  SummaryLine,
  getCheckoutItems,
} from '@/components/CheckoutFlow';
import { useAppState } from '@/state/AppContext';
import { colors, formatPrice } from '@/theme';

export default function CheckoutPaymentScreen() {
  const {
    cartItems,
    catalog,
    cartTotal,
    checkoutDetails,
    paymentMethods,
    deliveryOptions,
    updateCheckoutDetails,
    savePaymentMethod,
    removePaymentMethod,
  } = useAppState();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    label: '',
    holderName: '',
    brand: 'Visa',
    last4: '',
    expiryMonth: '',
    expiryYear: '',
  });

  const items = getCheckoutItems(cartItems, catalog);
  const selectedDeliveryOption =
    deliveryOptions.find((option) => option.id === checkoutDetails.deliveryOptionId) ?? deliveryOptions[0];
  const selectedPaymentMethod = paymentMethods.find((paymentMethod) => paymentMethod.id === checkoutDetails.paymentMethodId);
  const total = cartTotal + (items.length > 0 ? selectedDeliveryOption.price : 0);
  const canSavePayment = useMemo(
    () =>
      paymentForm.label.trim() &&
      paymentForm.holderName.trim() &&
      paymentForm.brand.trim() &&
      paymentForm.last4.trim().length === 4 &&
      paymentForm.expiryMonth.trim() &&
      paymentForm.expiryYear.trim(),
    [paymentForm],
  );

  if (items.length === 0) {
    return (
      <CheckoutStepLayout step={3} title="Ödeme" onBack={() => router.push('/checkout/delivery')}>
        <CheckoutGuard onAction={() => router.push('/checkout')} />
      </CheckoutStepLayout>
    );
  }

  return (
    <CheckoutStepLayout
      step={3}
      title="Ödeme"
      subtitle="Kayıtlı ödeme yöntemini seç veya yeni kart ekle."
      onBack={() => router.push('/checkout/delivery')}
      footer={
        <CheckoutFooter
          caption="Toplam"
          total={formatPrice(total)}
          primaryLabel="Onaya geç"
          disabled={!selectedPaymentMethod}
          onPrimaryPress={() => router.push('/checkout/review')}
        />
      }
    >
      <CheckoutSection
        title="Ödeme yöntemi"
        subtitle={selectedPaymentMethod ? `${selectedPaymentMethod.brand} •••• ${selectedPaymentMethod.last4}` : 'Bir ödeme yöntemi seç'}
        actionLabel={showPaymentForm ? 'Kapat' : 'Yeni kart'}
        onAction={() => setShowPaymentForm((current) => !current)}
      >
        <View style={styles.stack}>
          {paymentMethods.map((paymentMethod) => (
            <SelectableRow
              key={paymentMethod.id}
              active={checkoutDetails.paymentMethodId === paymentMethod.id}
              title={paymentMethod.label}
              subtitle={
                paymentMethod.type === 'cash'
                  ? 'Kapıda ödeme'
                  : `${paymentMethod.brand} •••• ${paymentMethod.last4}`
              }
              meta={
                paymentMethod.type === 'card'
                  ? `${paymentMethod.holderName} · ${paymentMethod.expiryMonth}/${paymentMethod.expiryYear}`
                  : undefined
              }
              onPress={() => updateCheckoutDetails({ paymentMethodId: paymentMethod.id })}
              onRemove={paymentMethods.length > 1 ? () => removePaymentMethod(paymentMethod.id) : undefined}
            />
          ))}
        </View>

        {showPaymentForm ? (
          <View style={styles.formCard}>
            <FormInput
              label="Kart etiketi"
              value={paymentForm.label}
              onChangeText={(label) => setPaymentForm((current) => ({ ...current, label }))}
              placeholder="Kişisel kart"
            />
            <FormInput
              label="Kart sahibi"
              value={paymentForm.holderName}
              onChangeText={(holderName) => setPaymentForm((current) => ({ ...current, holderName }))}
            />
            <View style={styles.formRow}>
              <View style={styles.flex}>
                <FormInput
                  label="Marka"
                  value={paymentForm.brand}
                  onChangeText={(brand) => setPaymentForm((current) => ({ ...current, brand }))}
                />
              </View>
              <View style={styles.flex}>
                <FormInput
                  label="Son 4 hane"
                  value={paymentForm.last4}
                  onChangeText={(last4) =>
                    setPaymentForm((current) => ({ ...current, last4: last4.replace(/[^0-9]/g, '').slice(0, 4) }))
                  }
                  placeholder="4187"
                />
              </View>
            </View>
            <View style={styles.formRow}>
              <View style={styles.flex}>
                <FormInput
                  label="Ay"
                  value={paymentForm.expiryMonth}
                  onChangeText={(expiryMonth) =>
                    setPaymentForm((current) => ({ ...current, expiryMonth: expiryMonth.replace(/[^0-9]/g, '').slice(0, 2) }))
                  }
                  placeholder="12"
                />
              </View>
              <View style={styles.flex}>
                <FormInput
                  label="Yıl"
                  value={paymentForm.expiryYear}
                  onChangeText={(expiryYear) =>
                    setPaymentForm((current) => ({ ...current, expiryYear: expiryYear.replace(/[^0-9]/g, '').slice(0, 2) }))
                  }
                  placeholder="28"
                />
              </View>
            </View>
            <Pressable
              style={[styles.inlineButton, !canSavePayment && styles.inlineButtonDisabled]}
              disabled={!canSavePayment}
              onPress={() => {
                savePaymentMethod({ ...paymentForm, type: 'card' });
                setPaymentForm({ label: '', holderName: '', brand: 'Visa', last4: '', expiryMonth: '', expiryYear: '' });
                setShowPaymentForm(false);
              }}
            >
              <Text style={styles.inlineButtonText}>Kartı kaydet</Text>
            </Pressable>
          </View>
        ) : null}
      </CheckoutSection>

      <CheckoutSection title="Sipariş özeti">
        <View style={styles.stack}>
          <SummaryLine label="Ara toplam" value={formatPrice(cartTotal)} />
          <SummaryLine label="Teslimat" value={formatPrice(selectedDeliveryOption.price)} />
          <SummaryLine label="Toplam" value={formatPrice(total)} strong />
        </View>
      </CheckoutSection>
    </CheckoutStepLayout>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 10,
  },
  formCard: {
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 10,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
  },
  flex: {
    flex: 1,
  },
  inlineButton: {
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: colors.inkStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineButtonDisabled: {
    opacity: 0.42,
  },
  inlineButtonText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '900',
  },
});
