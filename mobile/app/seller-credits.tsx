import { router } from 'expo-router';
import { ArrowLeft, Check, Coins, CreditCard, Sparkles } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { sellerCreditPackages } from '@/data/sellerCredits';
import { useAppState } from '@/state/AppContext';
import { colors, formatPrice } from '@/theme';
import { SellerCreditPackage } from '@/types';

const flowSteps = ['Kullan', 'Ödeme yok', 'Satıştan düşülür'];

export default function SellerCreditsScreen() {
  const {
    canManageSeller,
    sellerCreditAccount,
    sellerCreditLoading,
    sellerCreditPurchaseStatus,
    sellerCreditPurchaseError,
    purchaseSellerCreditPackage,
  } = useAppState();
  const { height } = useWindowDimensions();
  const compact = height < 780;
  const [selectedPackageId, setSelectedPackageId] = useState<SellerCreditPackage['id']>('credits_200');
  const walletEntrance = useRef(new Animated.Value(0)).current;
  const packageEntrance = useRef(sellerCreditPackages.map(() => new Animated.Value(0))).current;
  const ctaOpacity = useRef(new Animated.Value(1)).current;
  const packageScales = useRef<Record<SellerCreditPackage['id'], Animated.Value>>({
    credits_100: new Animated.Value(1),
    credits_200: new Animated.Value(1),
    credits_500: new Animated.Value(1),
  }).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(walletEntrance, {
        toValue: 1,
        duration: 340,
        useNativeDriver: true,
      }),
      Animated.stagger(
        60,
        packageEntrance.map((value) =>
          Animated.timing(value, {
            toValue: 1,
            duration: 280,
            useNativeDriver: true,
          }),
        ),
      ),
    ]).start();
  }, [packageEntrance, walletEntrance]);

  useEffect(() => {
    ctaOpacity.setValue(0.35);
    Animated.timing(ctaOpacity, {
      toValue: 1,
      duration: 170,
      useNativeDriver: true,
    }).start();
  }, [ctaOpacity, selectedPackageId]);

  const selectedPackage = useMemo(
    () => sellerCreditPackages.find((item) => item.id === selectedPackageId) ?? sellerCreditPackages[0],
    [selectedPackageId],
  );
  const availableCredits = sellerCreditAccount
    ? sellerCreditAccount.freeCredits + sellerCreditAccount.paidCredits
    : 0;
  const creditLimitAmount = sellerCreditAccount?.creditLimitAmount ?? 1000;
  const creditDebtAmount = sellerCreditAccount?.creditDebtAmount ?? 0;
  const remainingCreditLimit = Math.max(0, creditLimitAmount - creditDebtAmount);
  const purchaseLoading = sellerCreditPurchaseStatus === 'loading';
  const selectedExceedsLimit = selectedPackage.amountTRY > remainingCreditLimit;

  function selectPackage(item: SellerCreditPackage, disabled: boolean) {
    if (disabled) return;
    setSelectedPackageId(item.id);
    Animated.sequence([
      Animated.timing(packageScales[item.id], {
        toValue: 0.97,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.spring(packageScales[item.id], {
        toValue: 1,
        friction: 5,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }

  async function handlePurchase() {
    if (!canManageSeller || selectedExceedsLimit || purchaseLoading) return;

    Alert.alert(
      'Kredi paketini ekle',
      `${selectedPackage.label} hesabına eklenecek. ${formatPrice(selectedPackage.amountTRY)} tutarındaki kredi borcu satış bakiyenden düşülmek üzere kaydedilecek.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Onayla',
          onPress: () => {
            void purchaseSellerCreditPackage(selectedPackage.id);
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.screen, compact && styles.screenCompact]}>
        <View style={[styles.topCluster, compact && styles.topClusterCompact]}>
          <Header onBack={() => router.back()} compact={compact} />
          {!canManageSeller ? (
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>Satıcı oturumu gerekli</Text>
              <Text style={styles.warningText}>AI kredi paketlerini yalnızca seller hesabıyla kullanabilirsin.</Text>
            </View>
          ) : null}
          <WalletHero
            animatedValue={walletEntrance}
            compact={compact}
            availableCredits={sellerCreditLoading ? '...' : String(availableCredits)}
            remainingLimit={formatPrice(remainingCreditLimit)}
            creditDebt={formatPrice(creditDebtAmount)}
          />
          <PackageDeck
            compact={compact}
            selectedPackageId={selectedPackage.id}
            remainingCreditLimit={remainingCreditLimit}
            entranceValues={packageEntrance}
            scaleValues={packageScales}
            onSelect={selectPackage}
          />
          <CreditFlow compact={compact} />
          {sellerCreditPurchaseError ? <Text style={styles.error}>{sellerCreditPurchaseError}</Text> : null}
        </View>

        <BottomPurchaseBar
          selectedPackage={selectedPackage}
          loading={purchaseLoading}
          disabled={!canManageSeller || selectedExceedsLimit || purchaseLoading}
          opacityValue={ctaOpacity}
          compact={compact}
          onPress={handlePurchase}
        />
      </View>
    </SafeAreaView>
  );
}

function Header({ onBack, compact }: { onBack: () => void; compact: boolean }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <Text style={styles.eyebrow}>AI kredi</Text>
        <Text style={[styles.title, compact && styles.titleCompact]}>Jeton Cüzdanı</Text>
        <Text style={styles.subtitle}>AI ürün listeleme için jetonlarını yönet.</Text>
      </View>
      <Pressable style={[styles.backButton, compact && styles.backButtonCompact]} onPress={onBack}>
        <ArrowLeft size={compact ? 17 : 19} color={colors.inkStrong} />
      </Pressable>
    </View>
  );
}

function WalletHero({
  animatedValue,
  compact,
  availableCredits,
  remainingLimit,
  creditDebt,
}: {
  animatedValue: Animated.Value;
  compact: boolean;
  availableCredits: string;
  remainingLimit: string;
  creditDebt: string;
}) {
  return (
    <Animated.View
      style={[
        styles.walletHero,
        compact && styles.walletHeroCompact,
        {
          opacity: animatedValue,
          transform: [
            {
              translateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [12, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.coinAura}>
        <View style={styles.coinRing}>
          <Coins size={compact ? 20 : 24} color={colors.credit} />
        </View>
      </View>
      <View style={styles.walletCenter}>
        <View style={styles.walletValueRow}>
          <Text style={[styles.walletValue, compact && styles.walletValueCompact]}>{availableCredits}</Text>
          <Text style={styles.walletUnit}>jeton</Text>
        </View>
        <Text style={styles.walletRule}>1 ürün listeleme = 1 jeton</Text>
      </View>
      <View style={styles.walletMetrics}>
        <MiniMetric label="Kalan limit" value={remainingLimit} />
        <MiniMetric label="Kredi borcu" value={creditDebt} />
      </View>
    </Animated.View>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniMetric}>
      <Text style={styles.miniMetricLabel}>{label}</Text>
      <Text style={styles.miniMetricValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function PackageDeck({
  compact,
  selectedPackageId,
  remainingCreditLimit,
  entranceValues,
  scaleValues,
  onSelect,
}: {
  compact: boolean;
  selectedPackageId: SellerCreditPackage['id'];
  remainingCreditLimit: number;
  entranceValues: Animated.Value[];
  scaleValues: Record<SellerCreditPackage['id'], Animated.Value>;
  onSelect: (item: SellerCreditPackage, disabled: boolean) => void;
}) {
  return (
    <View style={styles.packageArea}>
      <View style={styles.deckHeader}>
        <Text style={styles.deckTitle}>Paket seç</Text>
        <Text style={styles.deckSubtitle}>Tutar şimdi tahsil edilmez</Text>
      </View>
      <View style={styles.deckRow}>
        {sellerCreditPackages.map((item, index) => {
          const selected = item.id === selectedPackageId;
          const disabled = item.amountTRY > remainingCreditLimit;
          return (
            <PackageTile
              key={item.id}
              item={item}
              compact={compact}
              selected={selected}
              disabled={disabled}
              entranceValue={entranceValues[index]}
              scaleValue={scaleValues[item.id]}
              onPress={() => onSelect(item, disabled)}
            />
          );
        })}
      </View>
    </View>
  );
}

function PackageTile({
  item,
  compact,
  selected,
  disabled,
  entranceValue,
  scaleValue,
  onPress,
}: {
  item: SellerCreditPackage;
  compact: boolean;
  selected: boolean;
  disabled: boolean;
  entranceValue: Animated.Value;
  scaleValue: Animated.Value;
  onPress: () => void;
}) {
  const badge = item.id === 'credits_200' ? 'Önerilen' : item.id === 'credits_500' ? 'En iyi oran' : undefined;

  return (
    <Animated.View
      style={[
        styles.tileAnimated,
        {
          opacity: entranceValue,
          transform: [
            {
              translateY: entranceValue.interpolate({
                inputRange: [0, 1],
                outputRange: [10, 0],
              }),
            },
            { scale: scaleValue },
          ],
        },
      ]}
    >
      <Pressable
        style={[
          styles.packageTile,
          compact && styles.packageTileCompact,
          selected && styles.packageTileSelected,
          disabled && styles.packageTileDisabled,
        ]}
        onPress={onPress}
        disabled={disabled}
      >
        <View style={styles.tileTop}>
          {badge ? <Text style={[styles.tileBadge, item.id === 'credits_500' && styles.tileBadgeAlt]}>{badge}</Text> : <View />}
          <View style={[styles.tileCheck, selected && styles.tileCheckSelected]}>
            {selected ? <Check size={11} color={colors.surface} /> : null}
          </View>
        </View>
        <Text style={[styles.tileCredits, compact && styles.tileCreditsCompact]}>{item.credits}</Text>
        <Text style={styles.tileUnit}>jeton</Text>
        <View style={styles.tileDivider} />
        <Text style={styles.tilePrice}>{formatPrice(item.amountTRY)}</Text>
        <Text style={[styles.tileCaption, disabled && styles.tileCaptionDisabled]}>
          {disabled ? 'Limit yok' : 'kredi'}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function CreditFlow({ compact }: { compact: boolean }) {
  return (
    <View style={[styles.flowCard, compact && styles.flowCardCompact]}>
      <CreditCard size={compact ? 14 : 16} color={colors.credit} />
      <View style={styles.flowSteps}>
        {flowSteps.map((step, index) => (
          <View key={step} style={styles.flowStepGroup}>
            <Text style={styles.flowStep}>{step}</Text>
            {index < flowSteps.length - 1 ? <View style={styles.flowDot} /> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

function BottomPurchaseBar({
  selectedPackage,
  loading,
  disabled,
  opacityValue,
  compact,
  onPress,
}: {
  selectedPackage: SellerCreditPackage;
  loading: boolean;
  disabled: boolean;
  opacityValue: Animated.Value;
  compact: boolean;
  onPress: () => void;
}) {
  return (
    <View style={[styles.bottomBar, compact && styles.bottomBarCompact]}>
      <Animated.View style={[styles.purchaseSummary, { opacity: opacityValue }]}>
        <Sparkles size={15} color={colors.credit} />
        <Text style={styles.purchaseSummaryText} numberOfLines={1}>
          {selectedPackage.label} · {formatPrice(selectedPackage.amountTRY)} kredi
        </Text>
      </Animated.View>
      <Pressable
        style={[styles.primaryButton, compact && styles.primaryButtonCompact, disabled && styles.primaryButtonDisabled]}
        onPress={onPress}
        disabled={disabled}
      >
        <Text style={styles.primaryButtonText}>{loading ? 'Kredi ekleniyor...' : 'Kredi olarak ekle'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  screen: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
    justifyContent: 'space-between',
  },
  screenCompact: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
  },
  topCluster: {
    gap: 13,
  },
  topClusterCompact: {
    gap: 8,
  },
  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    color: colors.ai,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.inkStrong,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
  },
  titleCompact: {
    fontSize: 25,
    lineHeight: 29,
  },
  subtitle: {
    color: colors.mutedSoft,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonCompact: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  warningBox: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    backgroundColor: colors.warning,
    padding: 10,
    gap: 3,
  },
  warningTitle: {
    color: colors.inkStrong,
    fontSize: 13,
    fontWeight: '900',
  },
  warningText: {
    color: colors.inkSoft,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  walletHero: {
    position: 'relative',
    borderRadius: 30,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 15,
    minHeight: 170,
    overflow: 'hidden',
  },
  walletHeroCompact: {
    minHeight: 140,
    borderRadius: 24,
    padding: 12,
  },
  coinAura: {
    position: 'absolute',
    top: 15,
    right: 16,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.creditSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletCenter: {
    gap: 2,
  },
  walletValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  walletValue: {
    color: colors.inkStrong,
    fontSize: 50,
    lineHeight: 54,
    fontWeight: '900',
  },
  walletValueCompact: {
    fontSize: 40,
    lineHeight: 43,
  },
  walletUnit: {
    color: colors.inkSoft,
    fontSize: 16,
    lineHeight: 29,
    fontWeight: '900',
  },
  walletRule: {
    color: colors.mutedSoft,
    fontSize: 12,
    fontWeight: '800',
  },
  walletMetrics: {
    position: 'absolute',
    left: 15,
    right: 15,
    bottom: 14,
    flexDirection: 'row',
    gap: 9,
  },
  miniMetric: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 11,
    paddingVertical: 8,
    gap: 2,
  },
  miniMetricLabel: {
    color: colors.mutedSoft,
    fontSize: 10,
    fontWeight: '800',
  },
  miniMetricValue: {
    color: colors.inkStrong,
    fontSize: 13,
    fontWeight: '900',
  },
  packageArea: {
    gap: 8,
  },
  deckHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
  },
  deckTitle: {
    color: colors.inkStrong,
    fontSize: 17,
    fontWeight: '900',
  },
  deckSubtitle: {
    color: colors.mutedSoft,
    fontSize: 11,
    fontWeight: '800',
  },
  deckRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tileAnimated: {
    flex: 1,
  },
  packageTile: {
    minHeight: 126,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 10,
  },
  packageTileCompact: {
    minHeight: 108,
    borderRadius: 18,
    padding: 8,
  },
  packageTileSelected: {
    borderColor: colors.credit,
    backgroundColor: colors.creditSoft,
  },
  packageTileDisabled: {
    opacity: 0.5,
  },
  tileTop: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  tileBadge: {
    overflow: 'hidden',
    borderRadius: 9,
    backgroundColor: colors.creditSoft,
    color: colors.credit,
    paddingHorizontal: 5,
    paddingVertical: 2,
    fontSize: 8,
    fontWeight: '900',
  },
  tileBadgeAlt: {
    backgroundColor: colors.aiSoft,
    color: colors.ai,
  },
  tileCheck: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileCheckSelected: {
    borderColor: colors.credit,
    backgroundColor: colors.credit,
  },
  tileCredits: {
    marginTop: 6,
    color: colors.inkStrong,
    fontSize: 24,
    lineHeight: 27,
    fontWeight: '900',
  },
  tileCreditsCompact: {
    fontSize: 21,
    lineHeight: 23,
  },
  tileUnit: {
    color: colors.inkSoft,
    fontSize: 11,
    fontWeight: '900',
  },
  tileDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  tilePrice: {
    color: colors.inkStrong,
    fontSize: 13,
    fontWeight: '900',
  },
  tileCaption: {
    color: colors.mutedSoft,
    fontSize: 9,
    fontWeight: '800',
  },
  tileCaptionDisabled: {
    color: colors.warningStrong,
  },
  flowCard: {
    minHeight: 50,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  flowCardCompact: {
    minHeight: 44,
    borderRadius: 16,
  },
  flowSteps: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  flowStepGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flowStep: {
    color: colors.inkSoft,
    fontSize: 11,
    fontWeight: '900',
  },
  flowDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.lineStrong,
  },
  error: {
    color: colors.danger,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
  },
  bottomBar: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 10,
  },
  bottomBarCompact: {
    borderRadius: 20,
    padding: 10,
    gap: 8,
  },
  purchaseSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  purchaseSummaryText: {
    flex: 1,
    color: colors.inkStrong,
    fontSize: 13,
    fontWeight: '900',
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 20,
    backgroundColor: colors.reward,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonCompact: {
    minHeight: 46,
    borderRadius: 18,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '900',
  },
});
