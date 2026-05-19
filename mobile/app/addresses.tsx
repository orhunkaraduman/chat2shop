import { router } from 'expo-router';
import { ChevronLeft, MapPin, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppState } from '@/state/AppContext';
import { colors } from '@/theme';

export default function AddressesScreen() {
  const { addressBook, checkoutDetails, updateCheckoutDetails, saveAddress, removeAddress } = useAppState();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    label: '',
    recipient: '',
    phone: '',
    line1: '',
    city: 'Istanbul',
    district: '',
  });
  const canSave = useMemo(
    () => form.label.trim() && form.recipient.trim() && form.phone.trim() && form.line1.trim() && form.city.trim() && form.district.trim(),
    [form],
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Header title="Adreslerim" subtitle="Checkout sırasında kullanacağın teslimat adreslerini yönet." />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Kayıtlı adresler</Text>
            <Pressable onPress={() => setShowForm((current) => !current)}>
              <Text style={styles.sectionAction}>{showForm ? 'Kapat' : 'Yeni adres'}</Text>
            </Pressable>
          </View>

          {addressBook.length > 0 ? (
            <View style={styles.stack}>
              {addressBook.map((address) => (
                <Pressable
                  key={address.id}
                  style={[styles.rowCard, checkoutDetails.addressId === address.id && styles.rowCardActive]}
                  onPress={() => updateCheckoutDetails({ addressId: address.id })}
                >
                  <View style={styles.iconBox}>
                    <MapPin size={17} color={colors.ai} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.rowTitle}>{address.label}</Text>
                    <Text style={styles.rowMeta}>{address.recipient} · {address.phone}</Text>
                    <Text style={styles.rowMeta}>{address.line1}, {address.district}/{address.city}</Text>
                  </View>
                  {addressBook.length > 1 ? (
                    <Pressable onPress={() => removeAddress(address.id)} hitSlop={8}>
                      <Trash2 size={15} color={colors.mutedSoft} />
                    </Pressable>
                  ) : null}
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>Kayıtlı adresin yok. Yeni adres ekleyerek checkout akışını hızlandırabilirsin.</Text>
          )}
        </View>

        {showForm ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Yeni adres</Text>
            <FormInput label="Adres etiketi" value={form.label} onChangeText={(label) => setForm((current) => ({ ...current, label }))} placeholder="Ev / Ofis" />
            <FormInput label="Alıcı" value={form.recipient} onChangeText={(recipient) => setForm((current) => ({ ...current, recipient }))} />
            <FormInput label="Telefon" value={form.phone} onChangeText={(phone) => setForm((current) => ({ ...current, phone }))} />
            <FormInput label="Adres" value={form.line1} onChangeText={(line1) => setForm((current) => ({ ...current, line1 }))} />
            <View style={styles.formRow}>
              <View style={styles.flex}>
                <FormInput label="Şehir" value={form.city} onChangeText={(city) => setForm((current) => ({ ...current, city }))} />
              </View>
              <View style={styles.flex}>
                <FormInput label="İlçe" value={form.district} onChangeText={(district) => setForm((current) => ({ ...current, district }))} />
              </View>
            </View>
            <Pressable
              style={[styles.primaryButton, !canSave && styles.disabledButton]}
              disabled={!canSave}
              onPress={() => {
                const id = `address-${Date.now()}`;
                saveAddress({ ...form, id });
                updateCheckoutDetails({ addressId: id });
                setForm({ label: '', recipient: '', phone: '', line1: '', city: 'Istanbul', district: '' });
                setShowForm(false);
              }}
            >
              <Text style={styles.primaryButtonText}>Adresi kaydet</Text>
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
  sectionAction: { color: colors.trust, fontSize: 12, fontWeight: '900' },
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
  rowCardActive: { borderColor: colors.trust, backgroundColor: colors.trustSoft },
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
  primaryButton: { minHeight: 48, borderRadius: 16, backgroundColor: colors.trust, alignItems: 'center', justifyContent: 'center' },
  disabledButton: { opacity: 0.42 },
  primaryButtonText: { color: colors.surface, fontSize: 13, fontWeight: '900' },
});
