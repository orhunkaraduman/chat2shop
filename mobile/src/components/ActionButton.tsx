import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '@/theme';

type Props = {
  label: string;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary';
  tone?: 'brand' | 'commerce' | 'ai' | 'tryOn' | 'reward' | 'trust';
  onPress?: () => void;
  disabled?: boolean;
};

export function ActionButton({ label, icon, variant = 'primary', tone = 'commerce', onPress, disabled = false }: Props) {
  const primary = variant === 'primary';

  return (
    <Pressable
      style={[styles.button, primary ? toneStyles[tone] : styles.secondary, disabled && styles.disabled]}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
    >
      {icon}
      <Text style={[styles.label, primary ? styles.primaryLabel : styles.secondaryLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 42,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  secondary: {
    backgroundColor: colors.tile,
    borderWidth: 1,
    borderColor: colors.tile,
  },
  disabled: {
    opacity: 0.48,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
  },
  primaryLabel: {
    color: colors.surface,
  },
  secondaryLabel: {
    color: colors.ink,
  },
});

const toneStyles = StyleSheet.create({
  brand: {
    backgroundColor: colors.brand,
  },
  commerce: {
    backgroundColor: colors.commerce,
  },
  ai: {
    backgroundColor: colors.ai,
  },
  tryOn: {
    backgroundColor: colors.tryOn,
  },
  reward: {
    backgroundColor: colors.reward,
  },
  trust: {
    backgroundColor: colors.trust,
  },
});
