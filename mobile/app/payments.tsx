import { router } from 'expo-router';
import { ChevronLeft, CreditCard, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppState } from '@/state/AppContext';
import { colors } from '@/theme';

export default function PaymentsScreen() {
  const { paymentMethods, checkoutDetails, updateCheckoutDetails, savePaymentMethod, removePaymentMethod } = useAppState();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    label: '',
    holderName: '',
    brand: 'Visa',
    last4: '',
    expiryMonth: '',
    expiryYear: '',
  });
  const canSave = useMemo(
    () =>
      form.label.trim() &&
      form.holderName.trim() &&
      form.brand.trim() &&
      form.last4.trim().length === 4 &&
      form.expiryMonth.trim() &&
      form.expiryYear.trim(),
    [form],
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header title="Ödeme" subtitle="Checkout sırasında kullanacağın ödeme yöntemlerini yönet." />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Kayıtlı yöntemler</Text>
            <Pressable onPress={() => setShowForm((current) => !current)}>
              <Text style={styles.sectionAction}>{showForm ? 'Kapat' : 'Yeni kart'}</Text>
            </Pressable>
          </View>

          {paymentMethods.length > 0 ? (
            <View style={styles.stack}>
              {paymentMethods.map((paymentMethod) => (
                <Pressable
                  key={paymentMethod.id}
                  style={[styles.rowCard, checkoutDetails.paymentMethodId === paymentMethod.id && styles.rowCardActive]}
                  onPress={() => updateCheckoutDetails({ paymentMethodId: paymentMethod.id })}
                >
                  <View style={styles.iconBox}>
                    <CreditCard size={17} color={colors.info} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.rowTitle}>{paymentMethod.label}</Text>
                    <Text style={styles.rowMeta}>
                      {paymentMethod.type === 'cash' ? 'Kapıda ödeme' : `${paymentMethod.brand} •••• ${paymentMethod.last4}`}
                    </Text>
                    {paymentMethod.type === 'card' ? (
                      <Text style={styles.rowMeta}>{paymentMethod.holderName} · {paymentMethod.expiryMonth}/{paymentMethod.expiryYear}</Text>
                    ) : null}
                  </View>
                  {paymentMethods.length > 1 ? (
                    <Pressable onPress={() => removePaymentMethod(paymentMethod.id)} hitSlop={8}>
                      <Trash2 size={15} color={colors.mutedSoft} />
                    </Pressable>
                  ) : null}
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>Kayıtlı ödeme yöntemin yok. Yeni kart ekleyerek checkout akışını hızlandırabilirsin.</Text>
          )}
        </View>

        {showForm ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Yeni kart</Text>
            <FormInput label="Kart etiketi" value={form.label} onChangeText={(label) => setForm((current) => ({ ...current, label }))} placeholder="Kişisel kart" />
            <FormInput label="Kart sahibi" value={form.holderName} onChangeText={(holderName) => setForm((current) => ({ ...current, holderName }))} />
            <View style={styles.formRow}>
              <View style={styles.flex}>
                <FormInput label="Marka" value={form.brand} onChangeText={(brand) => setForm((current) => ({ ...current, brand }))} />
              </View>
              <View style={styles.flex}>
                <FormInput
                  label="Son 4 hane"
                  value={form.last4}
                  onChangeText={(last4) => setForm((current) => ({ ...current, last4: last4.replace(/[^0-9]/g, '').slice(0, 4) }))}
                  placeholder="4187"
                />
              </View>
            </View>
            <View style={styles.formRow}>
              <View style={styles.flex}>
                <FormInput
                  label="Ay"
                  value={form.expiryMonth}
                  onChangeText={(expiryMonth) =>
                    setForm((current) => ({ ...current, expiryMonth: expiryMonth.replace(/[^0-9]/g, '').slice(0, 2) }))
                  }
                  placeholder="12"
                />
              </View>
              <View style={styles.flex}>
                <FormInput
                  label="Yıl"
                  value={form.expiryYear}
                  onChangeText={(expiryYear) =>
                    setForm((current) => ({ ...current, expiryYear: expiryYear.replace(/[^0-9]/g, '').slice(0, 2) }))
                  }
                  placeholder="28"
                />
              </View>
            </View>
            <Pressable
              style={[styles.primaryButton, !canSave && styles.disabledButton]}
              disabled={!canSave}
              onPress={() => {
                const id = `payment-${Date.now()}`;
                savePaymentMethod({ ...form, id, type: 'card' });
                updateCheckoutDetails({ paymentMethodId: id });
                setForm({ label: '', holderName: '', brand: 'Visa', last4: '', expiryMonth: '', expiryYear: '' });
                setShowForm(false);
              }}
            >
              <Text style={styles.primaryButtonText}>Kartı kaydet</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.header}>
      <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
        <ChevronLeft size={20} color={colors.inkStrong} />
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.mutedSoft} style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, gap: 14 },
  header: { gap: 8 },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: colors.inkStrong, fontSize: 30, lineHeight: 36, fontWeight: '900' },
  subtitle: { color: colors.mutedSoft, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  section: {
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 15,
    gap: 12,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { color: colors.inkStrong, fontSize: 17, fontWeight: '900' },
  sectionAction: { color: colors.info, fontSize: 12, fontWeight: '900' },
  stack: { gap: 10 },
  rowCard: {
    minHeight: 82,
    borderRadius: 18,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowCardActive: { borderColor: colors.info, backgroundColor: colors.infoSoft },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 15,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  rowTitle: { color: colors.inkStrong, fontSize: 14, fontWeight: '900' },
  rowMeta: { color: colors.mutedSoft, fontSize: 11, lineHeight: 16, fontWeight: '700', marginTop: 3 },
  emptyText: { color: colors.mutedSoft, fontSize: 13, lineHeight: 19, fontWeight: '700' },
  formRow: { flexDirection: 'row', gap: 10 },
  inputGroup: { gap: 6 },
  inputLabel: { color: colors.inkStrong, fontSize: 12, fontWeight: '900' },
  input: {
    minHeight: 48,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 13,
    color: colors.inkStrong,
    fontWeight: '800',
  },
  primaryButton: { minHeight: 48, borderRadius: 16, backgroundColor: colors.info, alignItems: 'center', justifyContent: 'center' },
  disabledButton: { opacity: 0.42 },
  primaryButtonText: { color: colors.surface, fontSize: 13, fontWeight: '900' },
});
