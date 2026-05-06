import { useEffect, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';

type ToastVariant = 'error' | 'success' | 'info';

interface ToastConfig {
  message: string;
  variant: ToastVariant;
  key: number;
}

const VARIANT_STYLES: Record<ToastVariant, {
  bg: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}> = {
  error:   { bg: '#dc2626', icon: 'alert-circle-outline' },
  success: { bg: '#16a34a', icon: 'checkmark-circle-outline' },
  info:    { bg: '#1f2937', icon: 'information-circle-outline' },
};

const DURATION_MS = 3000;

export function useToast() {
  const [config, setConfig] = useState<ToastConfig | null>(null);

  function showToast(message: string, variant: ToastVariant = 'error') {
    setConfig({ message, variant, key: Date.now() });
  }

  return { toastConfig: config, showToast };
}

export function AppToast({ config }: { config: ToastConfig | null }) {
  const insets = useSafeAreaInsets();
  const slideY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [displayed, setDisplayed] = useState<ToastConfig | null>(null);

  useEffect(() => {
    if (!config) return;

    setDisplayed(config);
    slideY.setValue(80);
    opacity.setValue(0);

    Animated.parallel([
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(slideY, { toValue: 80, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }, DURATION_MS);

    return () => clearTimeout(timer);
  }, [config?.key]);

  if (!displayed) return null;

  const s = VARIANT_STYLES[displayed.variant];

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: insets.bottom + 12,
        left: 16,
        right: 16,
        transform: [{ translateY: slideY }],
        opacity,
        zIndex: 999,
      }}
      pointerEvents="none"
    >
      <View
        className="flex-row items-center gap-3 rounded-2xl px-4 py-3.5"
        style={{
          backgroundColor: s.bg,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 12,
          elevation: 8,
        }}
      >
        <Ionicons name={s.icon} size={18} color="#fff" />
        <AppText variant="label" className="flex-1 text-white">{displayed.message}</AppText>
      </View>
    </Animated.View>
  );
}
