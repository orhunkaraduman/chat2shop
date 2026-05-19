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

export default function CheckoutDeliveryScreen() {
  const {
    cartItems,
    catalog,
    cartTotal,
    checkoutDetails,
    addressBook,
    deliveryOptions,
    updateCheckoutDetails,
    saveAddress,
    removeAddress,
  } = useAppState();
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({
    label: '',
    recipient: '',
    phone: '',
    line1: '',
    city: 'Istanbul',
    district: '',
  });

  const items = getCheckoutItems(cartItems, catalog);
  const selectedAddress = addressBook.find((address) => address.id === checkoutDetails.addressId);
  const selectedDeliveryOption =
    deliveryOptions.find((option) => option.id === checkoutDetails.deliveryOptionId) ?? deliveryOptions[0];
  const canSaveAddress = useMemo(
    () =>
      addressForm.label.trim() &&
      addressForm.recipient.trim() &&
      addressForm.phone.trim() &&
      addressForm.line1.trim() &&
      addressForm.city.trim() &&
      addressForm.district.trim(),
    [addressForm],
  );
  const canContinue = Boolean(selectedAddress && selectedDeliveryOption);
  const total = cartTotal + (items.length > 0 ? selectedDeliveryOption.price : 0);

  if (items.length === 0) {
    return (
      <CheckoutStepLayout step={2} title="Teslimat" onBack={() => router.push('/checkout')}>
        <CheckoutGuard onAction={() => router.push('/checkout')} />
      </CheckoutStepLayout>
    );
  }

  return (
    <CheckoutStepLayout
      step={2}
      title="Teslimat"
      subtitle="Adresini ve kargo tercihini seç."
      onBack={() => router.push('/checkout')}
      footer={
        <CheckoutFooter
          caption="Toplam"
          total={formatPrice(total)}
          primaryLabel="Ödemeye geç"
          disabled={!canContinue}
          onPrimaryPress={() => router.push('/checkout/payment')}
        />
      }
    >
      <CheckoutSection
        title="Teslimat adresi"
        subtitle={selectedAddress ? `${selectedAddress.district}, ${selectedAddress.city}` : 'Bir adres seç'}
        actionLabel={showAddressForm ? 'Kapat' : 'Yeni adres'}
        onAction={() => setShowAddressForm((current) => !current)}
      >
        <View style={styles.stack}>
          {addressBook.map((address) => (
            <SelectableRow
              key={address.id}
              active={checkoutDetails.addressId === address.id}
              title={address.label}
              subtitle={`${address.recipient} · ${address.phone}`}
              meta={`${address.line1}, ${address.district}/${address.city}`}
              onPress={() => updateCheckoutDetails({ addressId: address.id })}
              onRemove={addressBook.length > 1 ? () => removeAddress(address.id) : undefined}
            />
          ))}
        </View>

        {showAddressForm ? (
          <View style={styles.formCard}>
            <FormInput
              label="Adres etiketi"
              value={addressForm.label}
              onChangeText={(label) => setAddressForm((current) => ({ ...current, label }))}
              placeholder="Ev / Ofis"
            />
            <FormInput
              label="Alıcı"
              value={addressForm.recipient}
              onChangeText={(recipient) => setAddressForm((current) => ({ ...current, recipient }))}
            />
            <FormInput
              label="Telefon"
              value={addressForm.phone}
              onChangeText={(phone) => setAddressForm((current) => ({ ...current, phone }))}
            />
            <FormInput
              label="Adres"
              value={addressForm.line1}
              onChangeText={(line1) => setAddressForm((current) => ({ ...current, line1 }))}
            />
            <View style={styles.formRow}>
              <View style={styles.flex}>
                <FormInput
                  label="Şehir"
                  value={addressForm.city}
                  onChangeText={(city) => setAddressForm((current) => ({ ...current, city }))}
                />
              </View>
              <View style={styles.flex}>
                <FormInput
                  label="İlçe"
                  value={addressForm.district}
                  onChangeText={(district) => setAddressForm((current) => ({ ...current, district }))}
                />
              </View>
            </View>
            <Pressable
              style={[styles.inlineButton, !canSaveAddress && styles.inlineButtonDisabled]}
              disabled={!canSaveAddress}
              onPress={() => {
                saveAddress(addressForm);
                setAddressForm({ label: '', recipient: '', phone: '', line1: '', city: 'Istanbul', district: '' });
                setShowAddressForm(false);
              }}
            >
              <Text style={styles.inlineButtonText}>Adresi kaydet</Text>
            </Pressable>
          </View>
        ) : null}
      </CheckoutSection>

      <CheckoutSection title="Kargo seçeneği" subtitle={selectedDeliveryOption.label}>
        <View style={styles.stack}>
          {deliveryOptions.map((option) => (
            <SelectableRow
              key={option.id}
              active={checkoutDetails.deliveryOptionId === option.id}
              title={option.label}
              subtitle={option.description}
              meta={`${option.eta} · ${formatPrice(option.price)}`}
              onPress={() => updateCheckoutDetails({ deliveryOptionId: option.id })}
            />
          ))}
        </View>
      </CheckoutSection>

      <CheckoutSection title="Sipariş notu" subtitle="Kargo görevlisi veya teslimat için kısa not ekleyebilirsin.">
        <FormInput
          label="Not"
          value={checkoutDetails.note ?? ''}
          onChangeText={(note) => updateCheckoutDetails({ note })}
          placeholder="Kapıya bırakılabilir."
          multiline
        />
      </CheckoutSection>

      <CheckoutSection title="Özet">
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
