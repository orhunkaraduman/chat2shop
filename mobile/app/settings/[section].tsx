import { router, useLocalSearchParams } from 'expo-router';
import {
  Bell,
  Camera,
  ChevronDown,
  ChevronLeft,
  CircleHelp,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Truck,
} from 'lucide-react-native';
import { ReactNode, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppState } from '@/state/AppContext';
import { colors } from '@/theme';

type SettingsSection = 'notifications' | 'help' | 'privacy';

const sectionMeta: Record<
  SettingsSection,
  {
    title: string;
    subtitle: string;
    icon: ReactNode;
  }
> = {
  notifications: {
    title: 'Bildirim tercihleri',
    subtitle: 'Sipariş ve öneri bildirimlerini yönet.',
    icon: <Bell size={18} color={colors.info} />,
  },
  help: {
    title: 'Yardım merkezi',
    subtitle: 'Sık sorular ve hızlı yönlendirmeler.',
    icon: <CircleHelp size={18} color={colors.ai} />,
  },
  privacy: {
    title: 'Gizlilik ve güvenlik',
    subtitle: 'Kişiselleştirme ve veri tercihleri.',
    icon: <ShieldCheck size={18} color={colors.info} />,
  },
};

const helpItems = [
  {
    id: 'orders',
    icon: <Truck size={17} color={colors.info} />,
    title: 'Siparişim nerede?',
    body: 'Siparişlerim ekranında satıcı hazırlık, kargo ve teslimat durumlarını takip edebilirsin.',
    actionLabel: 'Siparişlerime git',
    action: () => router.push('/orders'),
  },
  {
    id: 'returns',
    icon: <CircleHelp size={17} color={colors.ai} />,
    title: 'İade nasıl başlatılır?',
    body: 'İade talebini sipariş detayından başlatabilirsin. Talep satıcıya iletilir ve durumunu aynı ekrandan izlersin.',
    actionLabel: 'Siparişlerden başlat',
    action: () => router.push('/orders'),
  },
  {
    id: 'try-on',
    icon: <Camera size={17} color={colors.tryOn} />,
    title: 'Kabin fotoğrafı nasıl çalışır?',
    body: 'Kabin ekranında fotoğrafını yükleyip sepetteki veya favorideki ürünleri stil önizlemesi olarak deneyebilirsin.',
    actionLabel: 'Kabin’e git',
    action: () => router.push('/try-on'),
  },
  {
    id: 'support',
    icon: <Mail size={17} color={colors.coral} />,
    title: 'Destek',
    body: 'Hesap, sipariş veya ürünle ilgili destek almak için bize e-posta gönderebilirsin.',
    actionLabel: 'E-posta gönder',
    action: () => void Linking.openURL('mailto:support@chat2shop.dev'),
  },
];

export default function SettingsSectionScreen() {
  const params = useLocalSearchParams<{ section?: string }>();
  const section = normalizeSection(params.section);
  const meta = sectionMeta[section];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
            <ChevronLeft size={20} color={colors.inkStrong} />
          </Pressable>
          <View style={styles.headerCopy}>
            <View style={styles.heroIcon}>{meta.icon}</View>
            <View style={styles.flex}>
              <Text style={styles.title}>{meta.title}</Text>
              <Text style={styles.subtitle}>{meta.subtitle}</Text>
            </View>
          </View>
        </View>

        {section === 'notifications' ? <NotificationSettings /> : null}
        {section === 'help' ? <HelpCenter /> : null}
        {section === 'privacy' ? <PrivacySettings /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function NotificationSettings() {
  const { userSettings, updateNotificationSettings } = useAppState();
  const enabledCount = Object.values(userSettings.notifications).filter(Boolean).length;

  return (
    <>
      <SummaryCard
        icon={<Bell size={18} color={colors.info} />}
        title={`${enabledCount}/3 bildirim açık`}
        body="Bu tercihler push entegrasyonuna hazır kalıcı kullanıcı ayarlarıdır."
      />
      <View style={styles.section}>
        <SettingToggle
          title="Sipariş güncellemeleri"
          subtitle="Kargo, teslimat ve iade durumları"
          value={userSettings.notifications.orderUpdates}
          onValueChange={(orderUpdates) => updateNotificationSettings({ orderUpdates })}
        />
        <SettingToggle
          title="AI stil önerileri"
          subtitle="Favori ve son baktığın ürünlere göre öneriler"
          value={userSettings.notifications.styleSuggestions}
          onValueChange={(styleSuggestions) => updateNotificationSettings({ styleSuggestions })}
        />
        <SettingToggle
          title="Kampanya bildirimleri"
          subtitle="İndirim ve yeni koleksiyon haberleri"
          value={userSettings.notifications.campaigns}
          onValueChange={(campaigns) => updateNotificationSettings({ campaigns })}
        />
      </View>
    </>
  );
}

function HelpCenter() {
  const [expandedId, setExpandedId] = useState(helpItems[0].id);

  return (
    <>
      <SummaryCard
        icon={<CircleHelp size={18} color={colors.ai} />}
        title="Hızlı yardım"
        body="Sık soruları açıp ilgili ekrana tek dokunuşla geçebilirsin."
      />
      <View style={styles.section}>
        {helpItems.map((item) => (
          <FaqRow
            key={item.id}
            icon={item.icon}
            title={item.title}
            body={item.body}
            actionLabel={item.actionLabel}
            expanded={expandedId === item.id}
            onToggle={() => setExpandedId((current) => (current === item.id ? '' : item.id))}
            onAction={item.action}
          />
        ))}
      </View>
    </>
  );
}

function PrivacySettings() {
  const { userSettings, updatePrivacySettings } = useAppState();
  const enabledCount = Object.values(userSettings.privacy).filter(Boolean).length;

  return (
    <>
      <SummaryCard
        icon={<ShieldCheck size={18} color={colors.info} />}
        title={`${enabledCount}/3 güvenli ayar açık`}
        body="Bu tercihler kişiselleştirme, analitik ve Kabin geçmişi davranışını doğrudan etkiler."
      />
      <View style={styles.section}>
        <SettingToggle
          title="Kişiselleştirme"
          subtitle="Son arama ve görüntüleme sinyalleri önerilerde kullanılır."
          value={userSettings.privacy.personalizationEnabled}
          onValueChange={(personalizationEnabled) => updatePrivacySettings({ personalizationEnabled })}
        />
        <SettingToggle
          title="Kullanım analitiği"
          subtitle="Arama, detay ve sepet event’leri deneyimi iyileştirmek için kaydedilir."
          value={userSettings.privacy.usageAnalyticsEnabled}
          onValueChange={(usageAnalyticsEnabled) => updatePrivacySettings({ usageAnalyticsEnabled })}
        />
        <SettingToggle
          title="Kabin geçmişi"
          subtitle="Yeni try-on sonuçları son denemeler listesinde saklanır."
          value={userSettings.privacy.tryOnHistoryEnabled}
          onValueChange={(tryOnHistoryEnabled) => updatePrivacySettings({ tryOnHistoryEnabled })}
        />
      </View>
      <View style={styles.privacyNote}>
        <Lock size={16} color={colors.mutedSoft} />
        <Text style={styles.privacyNoteText}>Hesap silme ve veri dışa aktarma ayrı bir güvenlik akışında ele alınacak.</Text>
      </View>
    </>
  );
}

function SummaryCard({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryIcon}>{icon}</View>
      <View style={styles.flex}>
        <Text style={styles.summaryTitle}>{title}</Text>
        <Text style={styles.summaryBody}>{body}</Text>
      </View>
    </View>
  );
}

function SettingToggle({
  title,
  subtitle,
  value,
  onValueChange,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.flex}>
        <View style={styles.rowTitleLine}>
          <Text style={styles.rowTitle}>{title}</Text>
          <View style={[styles.statusPill, value ? styles.statusPillOn : styles.statusPillOff]}>
            <Text style={[styles.statusPillText, value ? styles.statusPillTextOn : styles.statusPillTextOff]}>
              {value ? 'Açık' : 'Kapalı'}
            </Text>
          </View>
        </View>
        <Text style={styles.rowBody}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.infoSoft }}
        thumbColor={value ? colors.info : colors.surface}
      />
    </View>
  );
}

function FaqRow({
  icon,
  title,
  body,
  actionLabel,
  expanded,
  onToggle,
  onAction,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  actionLabel: string;
  expanded: boolean;
  onToggle: () => void;
  onAction: () => void;
}) {
  return (
    <View style={[styles.faqRow, expanded && styles.faqRowExpanded]}>
      <Pressable style={styles.faqHeader} onPress={onToggle}>
        <View style={styles.rowIcon}>{icon}</View>
        <View style={styles.flex}>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={styles.rowBody} numberOfLines={expanded ? undefined : 1}>
            {body}
          </Text>
        </View>
        <ChevronDown
          size={17}
          color={colors.mutedSoft}
          style={[styles.chevron, expanded && styles.chevronExpanded]}
        />
      </Pressable>
      {expanded ? (
        <Pressable style={styles.faqAction} onPress={onAction}>
          <Sparkles size={15} color={colors.ai} />
          <Text style={styles.faqActionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function normalizeSection(section?: string | string[]): SettingsSection {
  const value = Array.isArray(section) ? section[0] : section;
  if (value === 'help' || value === 'privacy' || value === 'notifications') return value;
  return 'notifications';
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 30,
    gap: 14,
  },
  header: {
    gap: 12,
  },
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
  headerCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroIcon: {
    width: 46,
    height: 46,
    borderRadius: 17,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.inkStrong,
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.mutedSoft,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  summaryCard: {
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    color: colors.inkStrong,
    fontSize: 14,
    fontWeight: '900',
  },
  summaryBody: {
    color: colors.mutedSoft,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    marginTop: 3,
  },
  section: {
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 8,
  },
  toggleRow: {
    minHeight: 78,
    borderRadius: 18,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  rowTitle: {
    color: colors.inkStrong,
    fontSize: 14,
    fontWeight: '900',
  },
  rowBody: {
    color: colors.mutedSoft,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    marginTop: 3,
  },
  statusPill: {
    minHeight: 22,
    borderRadius: 11,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPillOn: {
    backgroundColor: colors.infoSoft,
  },
  statusPillOff: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '900',
  },
  statusPillTextOn: {
    color: colors.info,
  },
  statusPillTextOff: {
    color: colors.mutedSoft,
  },
  faqRow: {
    borderRadius: 18,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  faqRowExpanded: {
    backgroundColor: colors.surface,
  },
  faqHeader: {
    minHeight: 78,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 15,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    transform: [{ rotate: '0deg' }],
  },
  chevronExpanded: {
    transform: [{ rotate: '180deg' }],
  },
  faqAction: {
    minHeight: 42,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 15,
    backgroundColor: colors.aiSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  faqActionText: {
    color: colors.ai,
    fontSize: 12,
    fontWeight: '900',
  },
  privacyNote: {
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  privacyNoteText: {
    flex: 1,
    color: colors.mutedSoft,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  flex: {
    flex: 1,
  },
});
