import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors } from '@/theme';

type ScreenProps = {
  children: ReactNode;
  includeBottomInset?: boolean;
};

function screenEdges(includeBottomInset: boolean): Edge[] {
  return includeBottomInset ? ['top', 'right', 'bottom', 'left'] : ['top', 'right', 'left'];
}

export function Screen({ children, includeBottomInset = true }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={screenEdges(includeBottomInset)}>
      {children}
    </SafeAreaView>
  );
}

export function ScrollScreen({ children, includeBottomInset = true }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={screenEdges(includeBottomInset)}>
      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
    </SafeAreaView>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
    gap: 14,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
    gap: 10,
  },
});
