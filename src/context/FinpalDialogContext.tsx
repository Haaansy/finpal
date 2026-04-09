import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { useFinpalTheme } from '@/context/FinpalThemeContext';

export type FinpalDialogButton = {
  label: string;
  onPress: () => void;
  variant?: 'default' | 'cancel' | 'destructive';
};

type DialogState = {
  title: string;
  message?: string;
  actions: FinpalDialogButton[];
} | null;

type Pending = { kind: 'alert'; resolve: () => void } | { kind: 'confirm'; resolve: (v: boolean) => void };

type FinpalDialogApi = {
  alert: (title: string, message?: string) => Promise<void>;
  confirm: (
    title: string,
    message?: string,
    options?: { cancelLabel?: string; confirmLabel?: string; destructive?: boolean }
  ) => Promise<boolean>;
};

const FinpalDialogContext = createContext<FinpalDialogApi | null>(null);

export function FinpalDialogProvider({ children }: { children: React.ReactNode }) {
  const { colors, isDark } = useFinpalTheme();
  const { height } = useWindowDimensions();
  const [state, setState] = useState<DialogState>(null);
  const pendingRef = useRef<Pending | null>(null);

  const finish = useCallback(() => {
    const p = pendingRef.current;
    pendingRef.current = null;
    setState(null);
    if (!p) return;
    if (p.kind === 'alert') p.resolve();
    else p.resolve(false);
  }, []);

  const api = useMemo<FinpalDialogApi>(
    () => ({
      alert: (title, message) =>
        new Promise<void>((resolve) => {
          pendingRef.current = { kind: 'alert', resolve };
          setState({
            title,
            message,
            actions: [
              {
                label: 'OK',
                variant: 'default',
                onPress: () => {
                  pendingRef.current = null;
                  setState(null);
                  resolve();
                },
              },
            ],
          });
        }),
      confirm: (title, message, options) =>
        new Promise<boolean>((resolve) => {
          pendingRef.current = { kind: 'confirm', resolve };
          setState({
            title,
            message,
            actions: [
              {
                label: options?.cancelLabel ?? 'Cancel',
                variant: 'cancel',
                onPress: () => {
                  pendingRef.current = null;
                  setState(null);
                  resolve(false);
                },
              },
              {
                label: options?.confirmLabel ?? 'OK',
                variant: options?.destructive ? 'destructive' : 'default',
                onPress: () => {
                  pendingRef.current = null;
                  setState(null);
                  resolve(true);
                },
              },
            ],
          });
        }),
    }),
    []
  );

  const dangerOnLight = '#fff';

  return (
    <FinpalDialogContext.Provider value={api}>
      {children}
      <Modal visible={state !== null} transparent animationType="fade" onRequestClose={finish}>
        <Pressable style={[styles.backdrop, { minHeight: height }]} onPress={finish}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={(e) => e.stopPropagation()}>
            {state ? (
              <>
                <Text style={[styles.title, { color: colors.text }]}>{state.title}</Text>
                {state.message ? (
                  <Text style={[styles.message, { color: colors.textMuted }]}>{state.message}</Text>
                ) : null}
                <View style={styles.actions}>
                  {state.actions.map((a, i) => {
                    const destructive = a.variant === 'destructive';
                    const cancel = a.variant === 'cancel';
                    const bg = destructive
                      ? colors.danger
                      : cancel
                        ? colors.surfaceSecondary
                        : colors.primary;
                    const fg = destructive ? dangerOnLight : cancel ? colors.text : isDark ? colors.background : '#fff';
                    const border = cancel ? colors.border : 'transparent';
                    return (
                      <Pressable
                        key={`${a.label}-${i}`}
                        onPress={a.onPress}
                        style={({ pressed }) => [
                          styles.btn,
                          {
                            backgroundColor: bg,
                            borderColor: border,
                            borderWidth: cancel ? StyleSheet.hairlineWidth : 0,
                            opacity: pressed ? 0.88 : 1,
                          },
                        ]}
                        accessibilityRole="button">
                        <Text style={[styles.btnText, { color: fg }]}>{a.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </FinpalDialogContext.Provider>
  );
}

export function useFinpalDialog(): FinpalDialogApi {
  const ctx = useContext(FinpalDialogContext);
  if (!ctx) throw new Error('useFinpalDialog must be used within FinpalDialogProvider');
  return ctx;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  sheet: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  title: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  message: { fontSize: 14, lineHeight: 20, marginBottom: 18 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-end' },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    minWidth: 96,
    alignItems: 'center',
  },
  btnText: { fontSize: 15, fontWeight: '700' },
});
