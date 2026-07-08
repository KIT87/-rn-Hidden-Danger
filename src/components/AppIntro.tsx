import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText, ScreenGradient } from '@/components/ui';
import { GLASS } from '@/theme/glass';
import { productsApi } from '@/features/products/api';
import { useAuth } from '@/features/auth/AuthContext';
import type { AppStats } from '@/features/products/types';

const IDLE_MS = 10000;     // auto-continue if the user doesn't tap
const COUNT_MS = 1600;     // count-up animation duration

// Documented defaults — shown when logged out (stats needs auth) or if the
// request fails, so the intro always looks complete.
const FALLBACK: AppStats = {
  products: 400000,
  brands: 24000,
  scans_performed: 1200000,
  cancer_risk_products: 85324,
  allergy_risk_products: 15782,
  irritation_risk_products: 13675,
  endocrine_risk_products: 13876,
  other_risk_products: 71346,
};

type IconName = React.ComponentProps<typeof Ionicons>['name'];

// ── Formatters ────────────────────────────────────────────────────────────────
const withCommas = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const compactPlus = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M+`;
  if (n >= 1000) return `${Math.round(n / 1000)}k+`;
  return `${Math.round(n)}`;
};

// ── Count-up number ─────────────────────────────────────────────────────────
function CountUp({ to, format, style }: { to: number; format: (n: number) => string; style?: object }) {
  const [val, setVal] = useState(0);
  const valRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = valRef.current;
    let start: number | null = null;
    const tick = (t: number) => {
      if (start === null) start = t;
      const p = Math.min(1, (t - start) / COUNT_MS);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = from + (to - from) * eased;
      valRef.current = next;
      setVal(next);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [to]);

  return <Text style={style}>{format(val)}</Text>;
}

// ── Pieces ────────────────────────────────────────────────────────────────────
function FeaturePill({ icon, color, text }: { icon: IconName; color: string; text: string }) {
  return (
    <View
      className="flex-row items-center gap-2 rounded-full px-4 py-2.5 self-center"
      style={{ backgroundColor: GLASS.cardBg, borderWidth: 1, borderColor: GLASS.cardBorder }}
    >
      <Ionicons name={icon} size={15} color={color} />
      <AppText variant="caption" className="text-white/90 font-medium">{text}</AppText>
    </View>
  );
}

const RISK_ROWS: { key: keyof AppStats; label: string; color: string }[] = [
  { key: 'cancer_risk_products',     label: 'Cancer',               color: '#f59e0b' },
  { key: 'allergy_risk_products',    label: 'Allergy',              color: '#fbbf24' },
  { key: 'irritation_risk_products', label: 'Irritation',           color: '#fb923c' },
  { key: 'endocrine_risk_products',  label: 'Endocrine disruption', color: '#a78bfa' },
];

export function AppIntro() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [stats, setStats] = useState<AppStats>(FALLBACK);
  const [gone, setGone] = useState(false);
  const opacity = useRef(new Animated.Value(1)).current;

  // Fetch live stats when authenticated (endpoint requires auth); otherwise keep fallback.
  useEffect(() => {
    if (!token) return;
    let active = true;
    productsApi.stats().then((d) => { if (active && d) setStats(d); }).catch(() => {});
    return () => { active = false; };
  }, [token]);

  // Tap anywhere to continue; auto-continue after IDLE_MS if untouched.
  const dismissing = useRef(false);
  const dismiss = useCallback(() => {
    if (dismissing.current) return;
    dismissing.current = true;
    Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => setGone(true));
  }, [opacity]);

  useEffect(() => {
    const t = setTimeout(dismiss, IDLE_MS);
    return () => clearTimeout(t);
  }, [dismiss]);

  if (gone) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity, zIndex: 1000 }]}>
      <ScreenGradient />
      <StatusBar style="light" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 36, paddingBottom: insets.bottom + 24, paddingHorizontal: 20, gap: 22, flexGrow: 1 }}
      >
        {/* Brand */}
        <View className="items-center gap-4">
          <View
            className="w-20 h-20 rounded-3xl items-center justify-center"
            style={{ backgroundColor: GLASS.cardBgStrong, borderWidth: 1, borderColor: GLASS.cardBorder }}
          >
            <Ionicons name="eye" size={38} color="#ffffff" />
          </View>
          <View className="items-center">
            <Text style={{ fontSize: 11, letterSpacing: 2.5, color: 'rgba(255,255,255,0.5)', fontWeight: '700' }}>
              KNOW WHAT'S IN YOUR PRODUCTS
            </Text>
            <Text style={{ fontSize: 34, lineHeight: 38, fontWeight: '900', color: '#ffffff', marginTop: 8 }}>hidden</Text>
            <Text style={{ fontSize: 34, lineHeight: 36, fontWeight: '900', color: 'rgba(255,255,255,0.35)' }}>danger</Text>
          </View>
        </View>

        {/* Feature pills */}
        <View className="gap-2.5">
          <FeaturePill icon="scan-outline" color="#c4b5fd" text="Scan & analyse ingredients" />
          <FeaturePill icon="warning-outline" color="#fbbf24" text="Detect hidden risks instantly" />
          <FeaturePill icon="people-outline" color="#93c5fd" text="Community reviews & picks" />
        </View>

        {/* Stats card */}
        <View className="rounded-3xl p-5 gap-4" style={{ backgroundColor: GLASS.cardBg, borderWidth: 1, borderColor: GLASS.cardBorder }}>
          <View className="flex-row items-start justify-between">
            <View className="flex-1">
              <CountUp to={stats.products} format={compactPlus} style={{ fontSize: 40, lineHeight: 44, fontWeight: '900', color: '#ffffff' }} />
              <AppText variant="caption" className="text-white/60">products analysed</AppText>
              <AppText variant="caption" className="text-white/60">
                across{' '}
                <CountUp to={stats.brands} format={withCommas} style={{ color: '#ffffff', fontWeight: '700' }} />
                {' '}brands
              </AppText>
            </View>
            <View className="items-end pt-1">
              <CountUp to={stats.scans_performed} format={compactPlus} style={{ fontSize: 28, lineHeight: 32, fontWeight: '800', color: 'rgba(255,255,255,0.45)' }} />
              <AppText variant="caption" className="text-white/40">scans performed</AppText>
            </View>
          </View>

          <View className="flex-row items-center gap-2 rounded-full px-3.5 py-2 self-start" style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}>
            <Ionicons name="sparkles" size={13} color="#ffffff" />
            <AppText variant="caption" className="text-white/90 font-semibold">Powered by AI & community intelligence</AppText>
          </View>
        </View>

        {/* Risk categories card */}
        <View className="rounded-3xl p-5 gap-3" style={{ backgroundColor: GLASS.cardBg, borderWidth: 1, borderColor: GLASS.cardBorder }}>
          <Text style={{ fontSize: 11, letterSpacing: 1.2, color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase' }}>
            Products carrying risk of
          </Text>
          {RISK_ROWS.map((r) => (
            <View key={r.key} className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2.5">
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: r.color }} />
                <AppText variant="body" className="text-white/85">{r.label}</AppText>
              </View>
              <CountUp to={stats[r.key]} format={withCommas} style={{ color: '#ffffff', fontWeight: '800', fontSize: 15 }} />
            </View>
          ))}
          <View className="flex-row items-center justify-between pt-2" style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.10)' }}>
            <AppText variant="caption" className="text-white/45 italic">+ many more concern categories</AppText>
            <CountUp to={stats.other_risk_products} format={compactPlus} style={{ color: 'rgba(255,255,255,0.6)', fontWeight: '800', fontSize: 14 }} />
          </View>
        </View>
      </ScrollView>

      {/* Tap anywhere to continue */}
      <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 14, alignItems: 'center' }} pointerEvents="none">
        <AppText variant="caption" className="text-white/40">Tap anywhere to continue</AppText>
      </View>
    </Animated.View>
  );
}
