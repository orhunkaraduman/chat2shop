import { router } from 'expo-router';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Apple, ArrowLeft, ShoppingBag, Store } from 'lucide-react-native';
import { ReactNode, useMemo, useState } from 'react';

import { BrandLogo } from '@/components/BrandLogo';
import { Screen } from '@/components/Screen';
import { useAppState } from '@/state/AppContext';
import { colors } from '@/theme';
import { UserRole } from '@/types';

type AuthMode = 'signIn' | 'signUp' | 'buyerProfile';
type FieldName = 'email' | 'password';
type FieldErrors = Partial<Record<FieldName, string>>;

const ageRanges = ['18-24', '25-34', '35-44', '45+'];

export default function AuthScreen() {
  const { authError, syncError, signIn, signUp, updateProfile, profile, repositoryMode } = useAppState();
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('buyer');
  const [shopFor, setShopFor] = useState(profile.audience === 'Erkek' ? 'Erkek' : 'Kadın');
  const [ageRange, setAgeRange] = useState('25-34');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<FieldName | undefined>();

  const surfaceError = authError || syncError;
  const showDebugCaption = __DEV__ && repositoryMode !== 'firebase';
  const authSubtitle = useMemo(() => {
    if (mode === 'signUp') {
      return 'Müşteri veya satıcı hesabını hızlıca oluştur ve alışveriş akışına geç.';
    }
    if (mode === 'buyerProfile') {
      return 'Önerileri daha isabetli hale getirmek için iki kısa seçim yap.';
    }
    return 'Hesabına giriş yap ve kişiselleştirilmiş alışveriş akışına devam et.';
  }, [mode]);

  async function handleSignIn() {
    if (!validateCredentials()) return;

    try {
      setSubmitting(true);
      const user = await signIn(email.trim(), password);
      router.replace(user.role === 'seller' ? '/profile' : '/explore');
    } catch {
      return;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateAccount() {
    if (!validateCredentials()) return;

    try {
      setSubmitting(true);
      const user = await signUp(email.trim(), password, role);
      if (user.role === 'seller') {
        router.replace('/profile');
        return;
      }
      setMode('buyerProfile');
    } catch {
      return;
    } finally {
      setSubmitting(false);
    }
  }

  function finishBuyerProfile() {
    updateProfile({
      ...profile,
      audience: shopFor,
      age: ageRange,
    });
    router.replace('/explore');
  }

  function validateCredentials() {
    const trimmedEmail = email.trim();
    const nextErrors: FieldErrors = {};

    if (!trimmedEmail) {
      nextErrors.email = 'E-posta gerekli.';
    } else if (!trimmedEmail.includes('@')) {
      nextErrors.email = 'Geçerli bir e-posta adresi gir.';
    }

    if (!password) {
      nextErrors.password = 'Şifre gerekli.';
    } else if (password.length < 6) {
      nextErrors.password = 'Şifre en az 6 karakter olmalı.';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function clearFieldError(field: FieldName, value: string) {
    if (field === 'email') setEmail(value);
    else setPassword(value);

    setFieldErrors((current) => {
      if (!current[field]) return current;
      return { ...current, [field]: undefined };
    });
  }

  function goBack() {
    if (mode === 'signUp') {
      setMode('signIn');
      return;
    }
    if (mode === 'buyerProfile') {
      setMode('signUp');
      return;
    }
    router.replace('/');
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AuthShell showBack={mode !== 'signIn'} onBack={goBack}>
            {mode === 'signIn' ? (
              <View style={styles.section}>
                <AuthHeader title="Giriş yap" subtitle={authSubtitle} />

                <View style={styles.fieldStack}>
                  <LabeledField
                    label="E-posta"
                    placeholder="ornek@mail.com"
                    value={email}
                    onChangeText={(value) => clearFieldError('email', value)}
                    error={fieldErrors.email}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    autoComplete="email"
                    focused={focusedField === 'email'}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(undefined)}
                  />
                  <LabeledField
                    label="Şifre"
                    placeholder="Şifreni gir"
                    value={password}
                    onChangeText={(value) => clearFieldError('password', value)}
                    error={fieldErrors.password}
                    secureTextEntry
                    textContentType="password"
                    autoComplete="password"
                    focused={focusedField === 'password'}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(undefined)}
                  />
                </View>

                <View style={styles.controlStack}>
                  <PrimaryButton label="Giriş yap" loading={isSubmitting} onPress={handleSignIn} />
                  <InlineError error={surfaceError} />
                  {showDebugCaption ? <Text style={styles.debugCaption}>Firebase config yok; local auth fallback ile çalışıyor.</Text> : null}
                </View>

                <View style={styles.dividerRow}>
                  <View style={styles.divider} />
                  <Text style={styles.dividerText}>veya</Text>
                  <View style={styles.divider} />
                </View>

                <View style={styles.socialStack}>
                  <SecondaryButton icon={<Apple size={16} color={colors.inkStrong} />} label="Apple ile devam et" />
                  <SecondaryButton icon={<Text style={styles.googleIcon}>G</Text>} label="Google ile devam et" />
                  <SecondaryButton icon={<Text style={styles.facebookIcon}>f</Text>} label="Facebook ile devam et" />
                </View>

                <Pressable onPress={() => setMode('signUp')} hitSlop={8}>
                  <Text style={styles.footerLink}>Hesabın yok mu? Üye ol</Text>
                </Pressable>
              </View>
            ) : null}

            {mode === 'signUp' ? (
              <View style={styles.section}>
                <AuthHeader title="Üye ol" subtitle={authSubtitle} />

                <RoleSelector role={role} onChange={setRole} />

                <View style={styles.fieldStack}>
                  <LabeledField
                    label="E-posta"
                    placeholder="ornek@mail.com"
                    value={email}
                    onChangeText={(value) => clearFieldError('email', value)}
                    error={fieldErrors.email}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    autoComplete="email"
                    focused={focusedField === 'email'}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(undefined)}
                  />
                  <LabeledField
                    label="Şifre"
                    placeholder="En az 6 karakter"
                    value={password}
                    onChangeText={(value) => clearFieldError('password', value)}
                    error={fieldErrors.password}
                    secureTextEntry
                    textContentType="newPassword"
                    autoComplete="password-new"
                    focused={focusedField === 'password'}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(undefined)}
                  />
                </View>

                <View style={styles.controlStack}>
                  <PrimaryButton label="Hesap oluştur" loading={isSubmitting} onPress={handleCreateAccount} />
                  <InlineError error={surfaceError} />
                </View>

                <Pressable onPress={() => setMode('signIn')} hitSlop={8}>
                  <Text style={styles.footerLink}>Zaten hesabın var mı? Giriş yap</Text>
                </Pressable>
              </View>
            ) : null}

            {mode === 'buyerProfile' ? (
              <View style={styles.section}>
                <AuthHeader eyebrow="Son adım" title="Profilini tamamla" subtitle={authSubtitle} />

                <View style={styles.fieldBlock}>
                  <Text style={styles.blockLabel}>Kimin için alışveriş yapıyorsun?</Text>
                  <View style={styles.segmented}>
                    {['Erkek', 'Kadın'].map((item) => {
                      const active = shopFor === item;
                      return (
                        <Pressable
                          key={item}
                          style={[styles.segment, active && styles.segmentActive]}
                          onPress={() => setShopFor(item)}
                        >
                          <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{item}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.fieldBlock}>
                  <Text style={styles.blockLabel}>Yaş aralığın</Text>
                  <View style={styles.ageGrid}>
                    {ageRanges.map((item) => {
                      const active = ageRange === item;
                      return (
                        <Pressable
                          key={item}
                          style={[styles.ageChip, active && styles.ageChipActive]}
                          onPress={() => setAgeRange(item)}
                        >
                          <Text style={[styles.ageChipText, active && styles.ageChipTextActive]}>{item}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.controlStack}>
                  <PrimaryButton label="Alışverişe başla" onPress={finishBuyerProfile} />
                </View>
              </View>
            ) : null}
          </AuthShell>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function AuthShell({
  showBack,
  onBack,
  children,
}: {
  showBack: boolean;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <View style={styles.shell}>
      <View style={styles.topBar}>
        {showBack ? (
          <Pressable style={styles.backButton} onPress={onBack}>
            <ArrowLeft size={18} color={colors.inkStrong} />
          </Pressable>
        ) : (
          <View style={styles.backButtonSpacer} />
        )}
      </View>

      <View style={styles.brandRail}>
        <View style={styles.brandMark}>
          <BrandLogo size={34} />
        </View>
        <View style={styles.brandDivider} />
        <View style={styles.brandCopy}>
          <Text style={styles.brandTitle}>Chat2Shop</Text>
          <Text style={styles.brandSubtitle}>Yeni nesil alışveriş deneyimi</Text>
        </View>
      </View>

      {children}
    </View>
  );
}

function AuthHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.headerBlock}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

function LabeledField({
  label,
  error,
  focused,
  onFocus,
  onBlur,
  ...inputProps
}: {
  label: string;
  error?: string;
  focused?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...inputProps}
        placeholderTextColor={colors.mutedSoft}
        style={[
          styles.input,
          focused && styles.inputFocused,
          error && styles.inputError,
          inputProps.style,
        ]}
        onFocus={onFocus}
        onBlur={onBlur}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  loading = false,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <Pressable
      style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? <ActivityIndicator size="small" color={colors.surface} /> : <Text style={styles.primaryText}>{label}</Text>}
    </Pressable>
  );
}

function SecondaryButton({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <Pressable style={styles.secondaryButton} onPress={() => undefined}>
      <View style={styles.secondaryIcon}>{icon}</View>
      <Text style={styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

function InlineError({ error }: { error?: string }) {
  if (!error) return null;

  return (
    <View style={styles.inlineError}>
      <Text style={styles.inlineErrorText}>{error}</Text>
    </View>
  );
}

function RoleSelector({
  role,
  onChange,
}: {
  role: UserRole;
  onChange: (role: UserRole) => void;
}) {
  return (
    <View style={styles.roleSelector}>
      <RoleTile
        label="Müşteri"
        description="Ürün keşfet ve alışverişini yönet."
        icon={<ShoppingBag size={16} color={role === 'buyer' ? colors.commerce : colors.inkStrong} />}
        selected={role === 'buyer'}
        onPress={() => onChange('buyer')}
      />
      <RoleTile
        label="Satıcı"
        description="Mağazanı yönet ve ürün yayınla."
        icon={<Store size={16} color={role === 'seller' ? colors.trust : colors.inkStrong} />}
        selected={role === 'seller'}
        onPress={() => onChange('seller')}
      />
    </View>
  );
}

function RoleTile({
  label,
  description,
  icon,
  selected,
  onPress,
}: {
  label: string;
  description: string;
  icon: ReactNode;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.roleTile, selected && styles.roleTileActive]} onPress={onPress}>
      <View style={[styles.roleIcon, selected && styles.roleIconActive]}>{icon}</View>
      <View style={styles.roleCopy}>
        <Text style={[styles.roleLabel, selected && styles.roleLabelActive]}>{label}</Text>
        <Text style={[styles.roleDescription, selected && styles.roleDescriptionActive]}>{description}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 28,
  },
  shell: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    gap: 24,
  },
  topBar: {
    minHeight: 44,
    justifyContent: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonSpacer: {
    width: 40,
    height: 40,
  },
  brandRail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'flex-start',
  },
  brandMark: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.lineStrong,
  },
  brandCopy: {
    gap: 1,
  },
  brandTitle: {
    color: colors.inkStrong,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '800',
  },
  brandSubtitle: {
    color: colors.mutedSoft,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
  section: {
    gap: 22,
  },
  headerBlock: {
    gap: 8,
  },
  eyebrow: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  title: {
    color: colors.inkStrong,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.mutedSoft,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  fieldStack: {
    gap: 12,
  },
  fieldGroup: {
    gap: 7,
  },
  fieldLabel: {
    color: colors.inkSoft,
    fontSize: 12,
    fontWeight: '800',
  },
  input: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    color: colors.inkStrong,
    fontSize: 15,
    fontWeight: '700',
  },
  inputFocused: {
    borderColor: colors.brand,
    backgroundColor: colors.surface,
  },
  inputError: {
    borderColor: colors.danger,
  },
  fieldError: {
    color: colors.danger,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  controlStack: {
    gap: 10,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primaryButtonDisabled: {
    opacity: 0.8,
  },
  primaryText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '900',
  },
  inlineError: {
    borderRadius: 14,
    backgroundColor: colors.commerceSoft,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  inlineErrorText: {
    color: colors.danger,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  debugCaption: {
    color: colors.mutedSoft,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.lineStrong,
  },
  dividerText: {
    color: colors.mutedSoft,
    fontSize: 11,
    fontWeight: '800',
  },
  socialStack: {
    gap: 10,
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  secondaryIcon: {
    width: 18,
    alignItems: 'center',
  },
  secondaryText: {
    color: colors.inkStrong,
    fontSize: 14,
    fontWeight: '800',
  },
  footerLink: {
    color: colors.inkStrong,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  googleIcon: {
    color: '#4285F4',
    fontSize: 17,
    fontWeight: '900',
  },
  facebookIcon: {
    color: '#1877F2',
    fontSize: 19,
    fontWeight: '900',
  },
  roleSelector: {
    gap: 10,
  },
  roleTile: {
    minHeight: 88,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  roleTileActive: {
    backgroundColor: colors.trustSoft,
    borderColor: colors.trust,
  },
  roleIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleIconActive: {
    backgroundColor: colors.surface,
  },
  roleCopy: {
    flex: 1,
    gap: 2,
  },
  roleLabel: {
    color: colors.inkStrong,
    fontSize: 14,
    fontWeight: '900',
  },
  roleLabelActive: {
    color: colors.trust,
  },
  roleDescription: {
    color: colors.mutedSoft,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  roleDescriptionActive: {
    color: colors.inkSoft,
  },
  fieldBlock: {
    gap: 10,
  },
  blockLabel: {
    color: colors.inkSoft,
    fontSize: 12,
    fontWeight: '800',
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: colors.infoSoft,
  },
  segmentText: {
    color: colors.mutedSoft,
    fontSize: 14,
    fontWeight: '800',
  },
  segmentTextActive: {
    color: colors.info,
  },
  ageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  ageChip: {
    minWidth: 82,
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ageChipActive: {
    backgroundColor: colors.infoSoft,
    borderColor: colors.info,
  },
  ageChipText: {
    color: colors.inkSoft,
    fontSize: 13,
    fontWeight: '800',
  },
  ageChipTextActive: {
    color: colors.info,
  },
});
