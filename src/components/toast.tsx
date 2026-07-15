import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLeaveStore } from '../storage/store';
import { Colors, BorderRadius, Spacing } from '../constants/theme';
import { fs } from '../constants/layout';

type ToastType = 'success' | 'error' | 'info' | 'warning';

const TOAST_CONFIGS: Record<ToastType, { icon: string; bg: string; border: string }> = {
  success: { icon: 'checkmark-circle', bg: '#10b981', border: '#059669' },
  error:   { icon: 'alert-circle',     bg: '#ef4444', border: '#dc2626' },
  warning: { icon: 'warning',          bg: '#f59e0b', border: '#d97706' },
  info:    { icon: 'information-circle', bg: '#6366f1', border: '#4f46e5' },
};

export function ToastRenderer() {
  const systemScheme = useColorScheme();
  const toast = useLeaveStore((s) => s.toast);
  const hideToast = useLeaveStore((s) => s.hideToast);
  const themeSetting = useLeaveStore((s) => s.settings.theme);

  const activeTheme: 'light' | 'dark' = themeSetting === 'system'
    ? (systemScheme === 'dark' ? 'dark' : 'light')
    : (themeSetting === 'dark' ? 'dark' : 'light');
  const colors = Colors[activeTheme];

  const slideAnim = useRef(new Animated.Value(-120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (toast.visible) {
      setIsVisible(true);
      // Cancel any pending timer
      if (timerRef.current) clearTimeout(timerRef.current);

      // Slide in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-dismiss after 2.8s
      timerRef.current = setTimeout(() => {
        dismissToast();
      }, 2800);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.visible, toast.message]);

  const dismissToast = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -120,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      hideToast();
      setIsVisible(false);
      slideAnim.setValue(-120);
      opacityAnim.setValue(0);
    });
  };

  if (!isVisible) return null;

  const config = TOAST_CONFIGS[toast.type] || TOAST_CONFIGS.info;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
          backgroundColor: colors.card,
          borderColor: config.border + '40',
          shadowColor: config.bg,
        },
      ]}
      pointerEvents="none"
    >
      {/* Colored left bar */}
      <View style={[styles.colorBar, { backgroundColor: config.bg }]} />

      {/* Icon */}
      <View style={[styles.iconWrap, { backgroundColor: config.bg + '18' }]}>
        <Ionicons name={config.icon as any} size={20} color={config.bg} />
      </View>

      {/* Text content */}
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {toast.title}
        </Text>
        {!!toast.message && (
          <Text style={[styles.message, { color: colors.textSecondary }]} numberOfLines={2}>
            {toast.message}
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 9999,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 14,
    minHeight: 60,
  },
  colorBar: {
    width: 5,
    alignSelf: 'stretch',
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.md,
    flexShrink: 0,
  },
  textWrap: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingRight: Spacing.md,
  },
  title: {
    fontSize: fs(13),
    fontWeight: '700',
    marginBottom: 1,
  },
  message: {
    fontSize: fs(12),
    lineHeight: 16,
  },
});
