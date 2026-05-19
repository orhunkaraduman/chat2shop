import { Plus, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from '@/theme';

type Props = {
  title: string;
  values: string[];
  onChange: (values: string[]) => void;
};

export function TagEditor({ title, values, onChange }: Props) {
  const [draft, setDraft] = useState('');

  function addTag() {
    const next = draft.trim();
    if (!next || values.includes(next)) {
      return;
    }

    onChange([...values, next]);
    setDraft('');
  }

  return (
    <View style={styles.group}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.tags}>
        {values.map((value) => (
          <Pressable key={value} style={styles.tag} onPress={() => onChange(values.filter((item) => item !== value))}>
            <Text style={styles.tagText}>{value}</Text>
            <X size={12} color={colors.ink} />
          </Pressable>
        ))}
      </View>
      <View style={styles.inputRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Yeni etiket"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        <Pressable style={styles.addButton} onPress={addTag}>
          <Plus size={16} color={colors.surface} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 8,
  },
  title: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  tagText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '800',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    color: colors.ink,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
