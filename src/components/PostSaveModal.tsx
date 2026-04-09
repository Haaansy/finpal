import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { useFinpalTheme } from '@/context/FinpalThemeContext';
import { PrimaryButton } from '@/components/PrimaryButton';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  addAnotherLabel?: string;
  doneLabel?: string;
  onAddAnother: () => void;
  onDone: () => void;
};

export function PostSaveModal({
  visible,
  title,
  message,
  addAnotherLabel = 'Add another',
  doneLabel = 'Done',
  onAddAnother,
  onDone,
}: Props) {
  const { colors } = useFinpalTheme();
  const { height } = useWindowDimensions();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDone}>
      <Pressable style={[styles.backdrop, { minHeight: height }]} onPress={onDone}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={(e) => e.stopPropagation()}>
          <View style={[styles.accent, { backgroundColor: colors.primary }]} />
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>
          <PrimaryButton title={addAnotherLabel} onPress={onAddAnother} style={styles.btn} />
          <PrimaryButton title={doneLabel} onPress={onDone} variant="outline" style={styles.btn} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingBottom: 22,
    paddingTop: 0,
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  accent: {
    alignSelf: 'stretch',
    height: 4,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginHorizontal: -22,
    marginBottom: 18,
  },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 10 },
  message: { fontSize: 14, lineHeight: 21, marginBottom: 20 },
  btn: { marginTop: 10 },
});
