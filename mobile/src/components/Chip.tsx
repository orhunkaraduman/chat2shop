import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

export function Chip({ label, selected = false, onPress }: Props) {
  const Component = onPress ? Pressable : View;

  return (
    <Component style={[styles.chip, selected && styles.selected]} onPress={onPress}>
      <Text style={[styles.text, selected && styles.selectedText]}>{label}</Text>
    </Component>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  selected: {
    borderColor: colors.tryOn,
    backgroundColor: colors.tryOnSoft,
  },
  text: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '800',
  },
  selectedText: {
    color: colors.tryOn,
  },
});
