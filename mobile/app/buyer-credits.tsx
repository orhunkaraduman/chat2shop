import { router } from 'expo-router';
import { ArrowLeft, CheckCircle2, Coins, Gift, ShoppingBag, Sparkles, Star } from 'lucide-react-native';
import { ReactNode, useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScrollScreen } from '@/components/Screen';
import { useAppState } from '@/state/AppContext';
import { colors } from '@/theme';
import { BuyerCreditTask, SellerRewardCampaign } from '@/types';

export default function BuyerCreditsScreen() {
  const {
    buyerCreditAccount,
    buyerCreditCenter,
    buyerCreditLoading,
    refreshBuyerCreditCenter,
    claimBuyerCampaignReward,
    selectProduct,
  } = useAppState();
  const account = buyerCreditCenter?.account ?? buyerCreditAccount;
  const balance = account ? account.freeCredits + account.paidCredits : 0;

  useEffect(() => {
    void refreshBuyerCreditCenter();
  }, []);

  return (
    <ScrollScreen>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Buyer jetonları</Text>
          <Text style={styles.title}>Jeton Merkezi</Text>
          <Text style={styles.subtitle}>Kabin denemeleri için jetonlarını görev ve kampanyalardan kazan.</Text>
        </View>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.inkStrong} />
        </Pressable>
      </View>

      <View style={styles.balanceCard}>
        <View style={styles.balanceIcon}>
          <Coins size={26} color={colors.credit} />
        </View>
        <View style={styles.balanceCopy}>
          <Text style={styles.balanceLabel}>Mevcut bakiye</Text>
          <Text style={styles.balanceValue}>{buyerCreditLoading ? '...' : balance} jeton</Text>
          <Text style={styles.balanceMeta}>Kabin’de 1 deneme 2 jeton kullanır.</Text>
        </View>
      </View>

      <Section title="Nasıl kazanılır?">
        <View style={styles.ruleList}>
          {(buyerCreditCenter?.earningRules ?? defaultRules).map((rule) => (
            <View key={rule.id} style={styles.ruleCard}>
              <View style={styles.ruleIcon}>
                {rule.id === 'purchase' ? <ShoppingBag size={17} color={colors.credit} /> : null}
                {rule.id === 'review' ? <Star size={17} color={colors.warningStrong} /> : null}
                {rule.id === 'fit_feedback' ? <CheckCircle2 size={17} color={colors.ai} /> : null}
                {rule.id === 'campaign' ? <Gift size={17} color={colors.ai} /> : null}
                {rule.id === 'sponsored_try_on' ? <Sparkles size={17} color={colors.credit} /> : null}
              </View>
              <View style={styles.ruleCopy}>
                <Text style={styles.ruleTitle}>{rule.title}</Text>
                <Text style={styles.ruleText}>{rule.description}</Text>
              </View>
              <View style={styles.ruleRewardPill}>
                <Text style={styles.ruleReward}>+{rule.rewardCredits}</Text>
                <Text style={styles.ruleRewardUnit}>jeton</Text>
              </View>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Jeton kazan">
        {(buyerCreditCenter?.tasks ?? []).length > 0 ? (
          <View style={styles.stack}>
            {buyerCreditCenter?.tasks.map((task) => (
              <TaskCard key={task.id} task={task} onClaim={claimBuyerCampaignReward} onSelectProduct={selectProduct} />
            ))}
          </View>
        ) : (
          <EmptyCard title="Şu an açık görev yok" text="Yeni alışveriş, yorum ve mağaza kampanyaları burada görünür." />
        )}
      </Section>

      <Section title="Mağaza kampanyaları">
        {(buyerCreditCenter?.campaigns ?? []).length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.campaignRail}>
            {buyerCreditCenter?.campaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} onClaim={claimBuyerCampaignReward} />
            ))}
          </ScrollView>
        ) : (
          <EmptyCard title="Kampanya bekleniyor" text="Mağazalar sponsorlu jeton kampanyası açtığında burada görünür." />
        )}
      </Section>

      <Section title="Son hareketler">
        {(buyerCreditCenter?.ledger ?? []).length > 0 ? (
          <View style={styles.stack}>
            {buyerCreditCenter?.ledger.slice(0, 8).map((entry) => (
              <View key={entry.id} style={styles.ledgerRow}>
                <View style={styles.ledgerIcon}>
                  {entry.creditAmount >= 0 ? <CheckCircle2 size={16} color={colors.ai} /> : <Sparkles size={16} color={colors.credit} />}
                </View>
                <View style={styles.flex}>
                  <Text style={styles.ledgerTitle}>{entry.note}</Text>
                  <Text style={styles.ledgerDate}>{formatDate(entry.createdAt)}</Text>
                </View>
                <Text style={[styles.ledgerAmount, entry.creditAmount < 0 && styles.ledgerSpend]}>
                  {entry.creditAmount > 0 ? '+' : ''}{entry.creditAmount}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <EmptyCard title="Henüz hareket yok" text="Jeton kazandığında veya Kabin’de kullandığında burada görünür." />
        )}
      </Section>
    </ScrollScreen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function TaskCard({
  task,
  onClaim,
  onSelectProduct,
}: {
  task: BuyerCreditTask;
  onClaim: (sellerId: string, campaignId: string) => Promise<void>;
  onSelectProduct: (productId: string) => void;
}) {
  const canClaim = task.type === 'campaign' && task.sellerId && task.campaignId;
  return (
    <Pressable
      style={styles.taskCard}
      onPress={() => {
        if (canClaim) void onClaim(task.sellerId!, task.campaignId!);
        if ((task.type === 'review' || task.type === 'fit_feedback') && task.productId) router.push({ pathname: '/product/[id]', params: { id: task.productId } });
        if (task.type === 'sponsored_try_on') {
          if (task.productId) onSelectProduct(task.productId);
          router.push('/try-on');
        }
      }}
    >
      <View style={styles.taskIcon}>
        {task.type === 'review' ? <Star size={18} color={colors.warningStrong} /> : null}
        {task.type === 'fit_feedback' ? <CheckCircle2 size={18} color={colors.ai} /> : null}
        {task.type === 'sponsored_try_on' ? <Sparkles size={18} color={colors.credit} /> : null}
        {task.type === 'campaign' || task.type === 'purchase' ? <Gift size={18} color={colors.credit} /> : null}
      </View>
      <View style={styles.flex}>
        <Text style={styles.taskTitle}>{task.title}</Text>
        <Text style={styles.taskText}>{task.description}</Text>
      </View>
      <View style={styles.rewardPill}>
        <Text style={styles.rewardText}>+{task.rewardCredits}</Text>
      </View>
    </Pressable>
  );
}

function CampaignCard({
  campaign,
  onClaim,
}: {
  campaign: SellerRewardCampaign;
  onClaim: (sellerId: string, campaignId: string) => Promise<void>;
}) {
  return (
    <Pressable style={styles.campaignCard} onPress={() => void onClaim(campaign.sellerId, campaign.id)}>
      <Text style={styles.campaignTitle}>{campaign.title}</Text>
      <Text style={styles.campaignText}>{campaign.description}</Text>
      <Text style={styles.campaignReward}>+{campaign.rewardCredits} jeton</Text>
    </Pressable>
  );
}

function EmptyCard({ title, text }: { title: string; text: string }) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const defaultRules = [
  { id: 'purchase', title: 'Alışveriş yap', description: 'Her 100 TL alışveriş için jeton kazan.', rewardCredits: 10 },
  { id: 'review', title: 'Yorum yaz', description: 'Satın aldığın ürünü değerlendir.', rewardCredits: 3 },
  { id: 'fit_feedback', title: 'Fit bilgisi paylaş', description: 'Beden deneyimini paylaş.', rewardCredits: 2 },
  { id: 'campaign', title: 'Kampanya al', description: 'Mağaza promosyonlarından jeton kazan.', rewardCredits: 5 },
  { id: 'sponsored_try_on', title: 'Sponsorlu Kabin', description: 'Mağazanın karşıladığı denemeleri kullan.', rewardCredits: 2 },
];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 20,
  },
  eyebrow: {
    color: colors.ai,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.inkStrong,
    fontSize: 38,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.mutedSoft,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
    maxWidth: 300,
  },
  backButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    borderRadius: 28,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  balanceIcon: {
    width: 64,
    height: 64,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.creditSoft,
  },
  balanceCopy: { flex: 1 },
  balanceLabel: { color: colors.mutedSoft, fontWeight: '800', fontSize: 14 },
  balanceValue: { color: colors.inkStrong, fontWeight: '900', fontSize: 36 },
  balanceMeta: { color: colors.mutedSoft, fontWeight: '700', fontSize: 13 },
  section: { marginTop: 24 },
  sectionTitle: { color: colors.inkStrong, fontSize: 24, fontWeight: '900', marginBottom: 12 },
  ruleList: { gap: 10 },
  ruleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ruleIcon: {
    width: 42,
    height: 42,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSubtle,
  },
  ruleCopy: { flex: 1 },
  ruleTitle: { color: colors.inkStrong, fontWeight: '900', fontSize: 15 },
  ruleText: { color: colors.mutedSoft, fontWeight: '700', fontSize: 12, lineHeight: 17, marginTop: 3 },
  ruleRewardPill: {
    minWidth: 58,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: colors.creditSoft,
  },
  ruleReward: { color: colors.credit, fontWeight: '900', fontSize: 16 },
  ruleRewardUnit: { color: colors.credit, fontWeight: '900', fontSize: 11, marginTop: -2 },
  stack: { gap: 10 },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  taskIcon: {
    width: 42,
    height: 42,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSubtle,
  },
  flex: { flex: 1 },
  taskTitle: { color: colors.inkStrong, fontWeight: '900', fontSize: 15 },
  taskText: { color: colors.mutedSoft, fontWeight: '700', fontSize: 12, lineHeight: 17 },
  rewardPill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.creditSoft,
  },
  rewardText: { color: colors.credit, fontWeight: '900', fontSize: 13 },
  campaignRail: { gap: 12, paddingRight: 24 },
  campaignCard: {
    width: 210,
    minHeight: 138,
    padding: 16,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  campaignTitle: { color: colors.inkStrong, fontWeight: '900', fontSize: 16 },
  campaignText: { color: colors.mutedSoft, fontWeight: '700', fontSize: 12, lineHeight: 17, marginTop: 5 },
  campaignReward: { color: colors.ai, fontWeight: '900', fontSize: 15, marginTop: 'auto' },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  ledgerIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSubtle,
  },
  ledgerTitle: { color: colors.inkStrong, fontWeight: '900', fontSize: 14 },
  ledgerDate: { color: colors.mutedSoft, fontWeight: '700', fontSize: 12 },
  ledgerAmount: { color: colors.ai, fontWeight: '900', fontSize: 16 },
  ledgerSpend: { color: colors.credit },
  emptyCard: {
    padding: 18,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: { color: colors.inkStrong, fontWeight: '900', fontSize: 16 },
  emptyText: { color: colors.mutedSoft, fontWeight: '700', lineHeight: 20, marginTop: 4 },
});
