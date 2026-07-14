import { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppModal, AppText, AppToast, ScreenGradient, useToast } from '@/components/ui';
import { RiskScore } from '@/components/product/RiskScore';
import { StarRating } from '@/components/product/StarRating';
import { ReviewCard } from '@/components/product/ReviewCard';
import { ReviewSheet } from '@/components/product/ReviewSheet';
import { GLASS } from '@/theme/glass';
import { useProduct } from '@/features/products/useProduct';
import { useTogglePick } from '@/features/products/useTogglePick';
import { useProductReviews } from '@/features/products/useProductReviews';
import { useReportReview } from '@/features/products/useReportReview';
import { useHazardCategory } from '@/features/products/useHazardCategory';
import type {
  HazardCategories,
  HazardCategoryIngredient,
  HazardCategoryKey,
  HazardSeverity,
  Ingredient,
  Publication,
  ReportReason,
} from '@/features/products/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Hero image + its bottom-up dark fade (for white brand/title legibility) over
// the app gradient background.
const { width: SCREEN_W } = Dimensions.get('window');
const HERO_H = 260;
const HERO_FADE_H = Math.round(HERO_H * 0.55);
const HERO_PAD = 20; // breathing room above/below the product image

// Fixed two-column width for hazard-breakdown cards so they stay equal-sized
// regardless of how many are shown (a lone trailing card left-aligns, same
// width as the rest). Available = SCREEN_W − px-4 (16·2) − card p-5 (20·2) − 12 gap.
// The −2 is a safety margin so subpixel rounding never wraps a row to one card.
const HAZARD_GAP = 12;
const HAZARD_CARD_W = Math.floor((SCREEN_W - 32 - 40 - HAZARD_GAP) / 2) - 2;

// Frosted-glass surface for content cards over the gradient.
const glassCard = {
  backgroundColor: GLASS.cardBg,
  borderWidth: 1,
  borderColor: GLASS.cardBorder,
} as const;

type IconName = React.ComponentProps<typeof Ionicons>['name'];

// Bright, legible level colors for the dark/glass theme.
const HAZARD_COLORS: Record<string, string> = {
  HIGH: '#f87171',
  CRITICAL: '#ef4444',
  MODERATE: '#fbbf24',
  LOW: '#a3e635',
  SAFE: '#4ade80',
  UNKNOWN: '#cbd5e1',
};

function hazardColor(level?: string | null) {
  if (!level || typeof level !== 'string') return HAZARD_COLORS.UNKNOWN;
  return HAZARD_COLORS[level.toUpperCase()] ?? HAZARD_COLORS.UNKNOWN;
}

const LEGEND_ITEMS: { label: string; color: string }[] = [
  { label: 'Low',      color: HAZARD_COLORS.LOW },
  { label: 'Moderate', color: HAZARD_COLORS.MODERATE },
  { label: 'High',     color: HAZARD_COLORS.HIGH },
  { label: 'Unknown',  color: HAZARD_COLORS.UNKNOWN },
];

// ─── Hazard category card ─────────────────────────────────────────────────────

const HAZARD_CATEGORY_META: { key: keyof HazardCategories; label: string; icon: IconName }[] = [
  { key: 'allergy',       label: 'Allergy',       icon: 'leaf-outline' },
  { key: 'irritation',    label: 'Irritation',    icon: 'water-outline' },
  { key: 'cancer',        label: 'Cancer',        icon: 'ribbon-outline' },
  { key: 'endocrine',     label: 'Endocrine',     icon: 'flash-outline' },
  { key: 'environmental', label: 'Environmental', icon: 'earth-outline' },
  { key: 'other',         label: 'Other',         icon: 'alert-circle-outline' },
];

// Each severity tints the whole card + border so it stays legible on the purple
// gradient (a faint translucent-white fill made red/amber text wash out).
const SEVERITY_STYLE: Record<HazardSeverity, { label: string; solid: string; cardBg: string; border: string; onSolid: string }> = {
  1: { label: 'LOW',      solid: '#22c55e', cardBg: 'rgba(34,197,94,0.20)',  border: 'rgba(74,222,128,0.60)',  onSolid: '#06230f' },
  2: { label: 'MODERATE', solid: '#f59e0b', cardBg: 'rgba(245,158,11,0.22)', border: 'rgba(251,191,36,0.65)',  onSolid: '#3a2900' },
  3: { label: 'HIGH',     solid: '#ef4444', cardBg: 'rgba(239,68,68,0.30)',  border: 'rgba(248,113,113,0.85)', onSolid: '#ffffff' },
};

// A flagged hazard category resolved for display (severity narrowed to non-null).
type FlaggedCategory = {
  key: HazardCategoryKey;
  label: string;
  icon: IconName;
  severity: HazardSeverity;
  prof: boolean;
};

function HazardCategoryCard({ label, icon, severity, prof, onPress }: {
  label: string;
  icon: IconName;
  severity: HazardSeverity;
  prof: boolean;
  onPress?: () => void;
}) {
  const s = SEVERITY_STYLE[severity];
  const Container = prof ? Pressable : View;
  return (
    <Container
      onPress={prof ? onPress : undefined}
      className="rounded-2xl p-3.5 gap-3 active:opacity-80"
      style={{ width: HAZARD_CARD_W, minHeight: 92, backgroundColor: s.cardBg, borderWidth: 1.5, borderColor: s.border }}
    >
      <View className="flex-row items-center justify-between">
        <Ionicons name={icon} size={18} color="#ffffff" />
        <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: s.solid }}>
          <AppText variant="caption" style={{ color: s.onSolid, fontWeight: '800', fontSize: 10, letterSpacing: 0.5 }}>
            {s.label}
          </AppText>
        </View>
      </View>
      <View className="flex-row items-center justify-between">
        <AppText variant="caption" className="font-semibold text-white">{label}</AppText>
        {/* Publication-backed: book icon + chevron signal a tappable drill-down. */}
        {prof ? (
          <View className="flex-row items-center gap-1">
            <Ionicons name="book" size={13} color="rgba(255,255,255,0.9)" />
            <Ionicons name="chevron-forward" size={13} color="rgba(255,255,255,0.7)" />
          </View>
        ) : null}
      </View>
    </Container>
  );
}

// ─── Publication proof modal (endpoint 5c) ──────────────────────────────────

function PublicationCard({ pub }: { pub: Publication }) {
  const href = pub.url;
  const displayUrl = href ? href.replace(/^https?:\/\/(www\.)?/, '') : null;

  return (
    <Pressable
      onPress={href ? () => Linking.openURL(href).catch(() => {}) : undefined}
      className="rounded-2xl p-3.5 gap-2.5 active:opacity-80"
      style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}
    >
      {(pub.authority || pub.year) ? (
        <View className="flex-row items-center gap-2 flex-wrap">
          {pub.authority ? (
            <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: 'rgba(167,139,250,0.28)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.5)' }}>
              <AppText variant="caption" className="text-white" style={{ fontWeight: '700', fontSize: 11 }}>{pub.authority}</AppText>
            </View>
          ) : null}
          {pub.year ? (
            <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: 'rgba(255,255,255,0.10)' }}>
              <AppText variant="caption" className="text-white/70" style={{ fontSize: 11 }}>{pub.year}</AppText>
            </View>
          ) : null}
        </View>
      ) : null}
      {pub.label ? (
        <AppText variant="label" className="text-white font-semibold" style={{ lineHeight: 20 }}>{pub.label}</AppText>
      ) : null}
      {displayUrl ? (
        <View className="flex-row items-center gap-2 rounded-xl px-3 py-2" style={{ backgroundColor: 'rgba(0,0,0,0.22)' }}>
          <Ionicons name="link" size={13} color="#c4b5fd" />
          <AppText variant="caption" className="flex-1 text-white/60" numberOfLines={1} style={{ fontSize: 12 }}>{displayUrl}</AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

function IngredientPublications({ ingredient }: { ingredient: HazardCategoryIngredient }) {
  const s = ingredient.severity != null ? SEVERITY_STYLE[ingredient.severity] : null;
  return (
    <View className="rounded-2xl p-4 gap-3" style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
      <View className="flex-row items-center justify-between gap-2">
        <AppText variant="label" className="flex-1 capitalize text-white font-semibold" numberOfLines={2}>
          {ingredient.name.toLowerCase()}
        </AppText>
        {s ? (
          <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: s.solid }}>
            <AppText variant="caption" style={{ color: s.onSolid, fontWeight: '800', fontSize: 10, letterSpacing: 0.5 }}>{s.label}</AppText>
          </View>
        ) : null}
      </View>
      {ingredient.publications.length > 0 ? (
        <View className="gap-2.5">
          {ingredient.publications.map((pub, i) => (
            <PublicationCard key={pub.url ?? pub.label ?? i} pub={pub} />
          ))}
        </View>
      ) : (
        <AppText variant="caption" className="text-white/40 italic">No published sources listed.</AppText>
      )}
    </View>
  );
}

function HazardPublicationsModal({ productId, category, onClose }: {
  productId: number;
  category: FlaggedCategory | null;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError } = useHazardCategory(productId, category?.key ?? null);
  const risk = category ? SEVERITY_STYLE[category.severity] : null;

  return (
    <Modal
      visible={category !== null}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }} onPress={onClose}>
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: '#2e1b58',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            borderTopWidth: 1,
            borderColor: 'rgba(255,255,255,0.14)',
            maxHeight: '85%',
          }}
        >
          {/* Drag handle */}
          <View className="items-center pt-3 pb-1">
            <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)' }} />
          </View>

          {/* Header */}
          <View className="flex-row items-start justify-between px-5 pt-3 gap-3">
            <View className="flex-row items-center gap-3 flex-1">
              {category ? <Ionicons name={category.icon} size={26} color="#c4b5fd" /> : null}
              <View className="gap-1.5 flex-1">
                <Text style={{ fontSize: 22, fontWeight: '900', color: '#ffffff' }}>
                  {category?.label} Risk
                </Text>
                {risk ? (
                  <View className="rounded-full px-2.5 py-0.5 self-start" style={{ backgroundColor: risk.solid }}>
                    <AppText variant="caption" style={{ color: risk.onSolid, fontWeight: '800', fontSize: 10, letterSpacing: 0.5 }}>
                      {risk.label} RISK
                    </AppText>
                  </View>
                ) : null}
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={8} className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.14)' }}>
              <Ionicons name="close" size={18} color="#ffffff" />
            </Pressable>
          </View>

          <AppText variant="caption" className="text-white/55 px-5 pt-2">
            Scientific publications supporting this risk classification
          </AppText>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 20, paddingTop: 16, gap: 14, paddingBottom: insets.bottom + 20 }}
          >
            {isLoading ? (
              <View className="py-12 items-center"><ActivityIndicator color="#ffffff" /></View>
            ) : isError || !data ? (
              <AppText variant="body" className="text-white/60 text-center py-10">Couldn't load sources. Pull to retry.</AppText>
            ) : data.ingredients.length === 0 ? (
              <AppText variant="body" className="text-white/60 text-center py-10">No publications available for this category.</AppText>
            ) : (
              <>
                {data.ingredients.map((ing) => (
                  <IngredientPublications key={ing.ingredient_id} ingredient={ing} />
                ))}
                <AppText variant="caption" className="text-white/40 text-center italic pt-2">
                  Sources are provided for transparency. Not medical advice.
                </AppText>
              </>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Ingredient row ───────────────────────────────────────────────────────────

function IngredientRow({ ingredient }: { ingredient: Ingredient }) {
  const color = hazardColor(ingredient.hazard_level);
  const displayLabel =
    ingredient.hazard_level === 'UNKNOWN'
      ? null
      : ingredient.hazard_level.charAt(0) + ingredient.hazard_level.slice(1).toLowerCase();

  return (
    <View className="flex-row items-center gap-3 px-4 py-3.5">
      <View className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <AppText variant="label" className="flex-1 capitalize text-white/90" numberOfLines={2}>
        {ingredient.name.toLowerCase()}
      </AppText>
      {displayLabel ? (
        <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: color + '2e' }}>
          <AppText variant="caption" style={{ color, fontWeight: '700' }}>{displayLabel}</AppText>
        </View>
      ) : null}
    </View>
  );
}

// ─── Collapsible card ─────────────────────────────────────────────────────────

function CollapsibleCard({
  title,
  subtitle,
  badge,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View className="rounded-3xl overflow-hidden" style={glassCard}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        className="flex-row items-center justify-between px-5 py-4"
      >
        <View className="gap-0.5">
          <AppText variant="heading" className="text-white">{title}</AppText>
          {subtitle ? <AppText variant="caption" className="text-white/50">{subtitle}</AppText> : null}
        </View>
        <View className="flex-row items-center gap-2.5">
          {badge ? (
            <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: 'rgba(244,114,182,0.25)' }}>
              <AppText variant="caption" style={{ color: '#fbcfe8', fontWeight: '700' }}>{badge}</AppText>
            </View>
          ) : null}
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="rgba(255,255,255,0.7)" />
        </View>
      </Pressable>
      {open && <View className="px-5 pb-5">{children}</View>}
    </View>
  );
}

// ─── Ingredients section ──────────────────────────────────────────────────────

function IngredientsSection({ ingredients }: {
  ingredients: Ingredient[];
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'flagged' | 'all'>('flagged');

  const sorted = [...ingredients].sort((a, b) => a.position - b.position);
  const flagged = sorted.filter((i) => i.hazard_level === 'HIGH' || i.hazard_level === 'MODERATE');
  const flaggedCount = flagged.length;
  const visible = tab === 'flagged' ? flagged : sorted;

  return (
    <View className="rounded-3xl overflow-hidden" style={glassCard}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        className="flex-row items-center justify-between px-5 py-4"
      >
        <View className="gap-0.5">
          <AppText variant="heading" className="text-white">Ingredients</AppText>
          <AppText variant="caption" className="text-white/50">
            {ingredients.length} total · {flaggedCount} flagged
          </AppText>
        </View>
        <View className="flex-row items-center gap-2.5">
          {flaggedCount > 0 && (
            <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: 'rgba(244,114,182,0.25)' }}>
              <AppText variant="caption" style={{ color: '#fbcfe8', fontWeight: '700' }}>
                {flaggedCount} risks
              </AppText>
            </View>
          )}
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="rgba(255,255,255,0.7)" />
        </View>
      </Pressable>

      {open && (
        <View className="px-4 pb-5 gap-4">
          {/* Tab switcher */}
          <View className="flex-row rounded-full p-1" style={{ backgroundColor: 'rgba(255,255,255,0.10)' }}>
            {(['flagged', 'all'] as const).map((t) => (
              <Pressable
                key={t}
                onPress={() => setTab(t)}
                className="flex-1 items-center py-2 rounded-full"
                style={tab === t ? { backgroundColor: 'rgba(255,255,255,0.22)' } : undefined}
              >
                <AppText variant="caption" className={`font-semibold ${tab === t ? 'text-white' : 'text-white/55'}`}>
                  {t === 'flagged' ? `Flagged (${flaggedCount})` : `All (${ingredients.length})`}
                </AppText>
              </Pressable>
            ))}
          </View>

          {/* Legend */}
          <View className="flex-row items-center gap-3 flex-wrap">
            {LEGEND_ITEMS.map(({ label, color }) => (
              <View key={label} className="flex-row items-center gap-1">
                <View className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <AppText variant="caption" className="text-white/55" style={{ fontSize: 11 }}>{label}</AppText>
              </View>
            ))}
          </View>

          {/* List */}
          <View className="rounded-2xl overflow-hidden" style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
            {visible.map((ingredient, i) => (
              <View key={ingredient.ingredient_id}>
                {i > 0 && <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.10)' }} />}
                <IngredientRow ingredient={ingredient} />
              </View>
            ))}
            {visible.length === 0 && (
              <View className="py-8 items-center">
                <AppText variant="caption" className="text-white/50">No ingredients to show</AppText>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Pick button (header) ─────────────────────────────────────────────────────

function PickButton({
  productId,
  userPicked,
  onError,
}: {
  productId: number;
  userPicked: boolean;
  onError: (msg: string) => void;
}) {
  const { mutate, isPending } = useTogglePick(productId, { onError });

  return (
    <Pressable
      onPress={() => !isPending && mutate(userPicked)}
      className="flex-row items-center gap-1 rounded-full px-3 py-1.5 active:opacity-70"
      style={{
        backgroundColor: userPicked ? 'rgba(251,191,36,0.22)' : 'rgba(255,255,255,0.14)',
        borderWidth: 1,
        borderColor: userPicked ? 'rgba(251,191,36,0.5)' : GLASS.cardBorder,
      }}
      hitSlop={8}
    >
      <Ionicons
        name={userPicked ? 'star' : 'star-outline'}
        size={15}
        color={userPicked ? '#fbbf24' : '#ffffff'}
      />
      <AppText variant="caption" className="font-semibold" style={{ color: userPicked ? '#fbbf24' : '#ffffff' }}>
        Pick
      </AppText>
    </Pressable>
  );
}

// ─── Report modal ─────────────────────────────────────────────────────────────

const REPORT_REASONS: { label: string; value: ReportReason }[] = [
  { label: 'Spam', value: 'spam' },
  { label: 'Offensive content', value: 'offensive' },
  { label: 'Fake review', value: 'fake_review' },
];

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const productId = Number(id);

  const { data: product, isLoading, isError, refetch } = useProduct(productId);
  const { toastConfig, showToast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [reviewSheetVisible, setReviewSheetVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState<number | null>(null);
  const [hazardProof, setHazardProof] = useState<FlaggedCategory | null>(null);

  const { data: reviewPages, fetchNextPage, hasNextPage, isFetchingNextPage } = useProductReviews(productId);
  const { mutate: report } = useReportReview({
    onSuccess: () => {
      setReportTarget(null);
      showToast('Report submitted. Thank you.', 'info');
    },
    onError: showToast,
  });

  // Newest first (fresh on top), regardless of the API's helpful-first ordering.
  const allReviews = [...(reviewPages?.pages.flatMap((p) => p?.reviews ?? []) ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  // ── Review summary ──
  const firstReviewPage = reviewPages?.pages?.[0] ?? null;
  const buyYes = firstReviewPage?.buy_again_yes ?? 0;
  const buyNo = firstReviewPage?.buy_again_no ?? 0;
  const buyAgainPct = buyYes + buyNo > 0 ? Math.round((buyYes / (buyYes + buyNo)) * 100) : null;

  const ownReview = allReviews.find((r) => r.user_is_owner) ?? null;
  const reviewLocked = ownReview?.locked ?? false;
  const showReviewButton = !product?.user_reviewed || !reviewLocked;

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  const ingredients = product?.ingredients ?? [];
  const heroImageUrl = product ? product.image_url ?? product.images[0] ?? null : null;

  // Catalog's own count of high-severity ingredients.
  const flaggedCount = product?.hazard_ingredients ?? 0;

  // Tint the inner risk-meter block by the product's overall risk (neutral glass when unknown).
  const riskSeverity = product?.risk_score ?? null;
  const riskMeterStyle = riskSeverity != null
    ? { backgroundColor: SEVERITY_STYLE[riskSeverity].cardBg, borderWidth: 1.5, borderColor: SEVERITY_STYLE[riskSeverity].border }
    : { backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: GLASS.cardBorder };

  // Per-category hazard breakdown, flagged (non-null) categories only.
  const hazardCategories = product?.hazard_categories ?? null;
  const flaggedCategories: FlaggedCategory[] = hazardCategories
    ? HAZARD_CATEGORY_META
        .map((m) => {
          const cat = hazardCategories[m.key];
          return { ...m, severity: cat?.severity ?? null, prof: cat?.prof ?? false };
        })
        .filter((c): c is FlaggedCategory => c.severity != null)
    : [];

  const writeButton = (label: string, icon: IconName) => (
    <Pressable
      onPress={() => setReviewSheetVisible(true)}
      className="flex-row items-center justify-center gap-2 rounded-2xl py-3.5 active:opacity-80"
      style={{ backgroundColor: GLASS.cardBgStrong, borderWidth: 1, borderColor: GLASS.cardBorder }}
    >
      <Ionicons name={icon} size={16} color="white" />
      <AppText variant="label" style={{ color: 'white', fontWeight: '700' }}>{label}</AppText>
    </Pressable>
  );

  return (
    <View className="flex-1">
      <ScreenGradient />
      <StatusBar style="light" />

      {/* Custom header */}
      <View
        style={{
          paddingTop: insets.top,
          backgroundColor: 'rgba(63,34,115,0.55)',
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: 'rgba(255,255,255,0.15)',
        }}
      >
        <View className="flex-row items-center gap-3 px-4" style={{ height: 48 }}>
          <Pressable onPress={() => router.back()} hitSlop={8} className="flex-row items-center gap-0.5">
            <Ionicons name="chevron-back" size={20} color="#ffffff" />
            <AppText variant="caption" className="font-semibold text-white">Products</AppText>
          </Pressable>
          <AppText variant="label" className="flex-1 text-center text-white" numberOfLines={1}>
            {product?.name ?? ''}
          </AppText>
          {product ? (
            <PickButton productId={productId} userPicked={product.user_picked} onError={showToast} />
          ) : (
            <View style={{ width: 44 }} />
          )}
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      ) : isError || !product ? (
        <View className="flex-1 items-center justify-center gap-4 px-8">
          <Ionicons name="alert-circle-outline" size={52} color="rgba(255,255,255,0.5)" />
          <AppText variant="body" className="text-white/70 text-center">Product not found</AppText>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <AppText variant="label" className="text-white font-semibold">Go back</AppText>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          bounces
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" colors={['#ffffff']} />
          }
        >
          {/* Hero (blends into the gradient) */}
          <View style={{ height: HERO_H }}>
            {heroImageUrl ? (
              <Image source={{ uri: heroImageUrl }} style={{ position: 'absolute', top: HERO_PAD, bottom: HERO_PAD, left: 0, right: 0 }} resizeMode="contain" />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Ionicons name="cube-outline" size={72} color="rgba(255,255,255,0.4)" />
              </View>
            )}
            {/* Bottom-up dark fade for brand/title legibility */}
            <Svg
              width={SCREEN_W}
              height={HERO_FADE_H}
              style={{ position: 'absolute', bottom: 0, left: 0 }}
              pointerEvents="none"
            >
              <Defs>
                <SvgLinearGradient id="heroFade" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#000000" stopOpacity={0} />
                  <Stop offset="0.55" stopColor="#000000" stopOpacity={0.18} />
                  <Stop offset="1" stopColor="#000000" stopOpacity={0.55} />
                </SvgLinearGradient>
              </Defs>
              <Rect x="0" y="0" width={SCREEN_W} height={HERO_FADE_H} fill="url(#heroFade)" />
            </Svg>
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingBottom: 14 }} pointerEvents="none">
              <Text style={{ fontSize: 11, letterSpacing: 1.5, color: 'rgba(255,255,255,0.8)', fontWeight: '600', textTransform: 'uppercase', marginBottom: 3 }}>
                {product.brand_name}
              </Text>
              <Text style={{ fontSize: 22, fontWeight: '900', color: 'white', lineHeight: 28 }} numberOfLines={2}>
                {product.name}
              </Text>
            </View>
          </View>

          {/* Content cards */}
          <View className="px-4 pt-4 pb-8 gap-3">

            {/* Info chips */}
            {(product.volume && product.volume_units) || product.has_high_hazard ? (
              <View className="flex-row items-center gap-2 flex-wrap">
                {product.volume && product.volume_units ? (
                  <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: GLASS.cardBg, borderWidth: 1, borderColor: GLASS.cardBorder }}>
                    <AppText variant="caption" className="text-white/80">{product.volume} {product.volume_units}</AppText>
                  </View>
                ) : null}
                {product.has_high_hazard ? (
                  <View className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5" style={{ backgroundColor: 'rgba(239,68,68,0.22)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.5)' }}>
                    <Ionicons name="warning" size={12} color="#fca5a5" />
                    <AppText variant="caption" style={{ color: '#fca5a5' }}>High hazard</AppText>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Risk level card */}
            <View className="rounded-3xl p-5 gap-4" style={glassCard}>
              <Text style={{ fontSize: 11, letterSpacing: 1.5, color: 'rgba(255,255,255,0.6)', fontWeight: '700', textTransform: 'uppercase' }}>
                Risk level
              </Text>
              <View className="rounded-2xl p-4 gap-2" style={riskMeterStyle}>
                <RiskScore riskScore={product.risk_score} size="bar" />
                <AppText variant="caption" className="text-white/70 text-center">
                  {flaggedCount} high risk {flaggedCount === 1 ? 'ingredient' : 'ingredients'}
                </AppText>
              </View>

              {/* Per-category hazard breakdown (flagged categories only) */}
              {flaggedCategories.length > 0 && (
                <View className="gap-3">
                  <Text style={{ fontSize: 11, letterSpacing: 1.2, color: 'rgba(255,255,255,0.6)', fontWeight: '700', textTransform: 'uppercase' }}>
                    Hazard breakdown
                  </Text>
                  <View className="flex-row flex-wrap" style={{ gap: HAZARD_GAP }}>
                    {flaggedCategories.map((c) => (
                      <HazardCategoryCard
                        key={c.key}
                        label={c.label}
                        icon={c.icon}
                        severity={c.severity}
                        prof={c.prof}
                        onPress={() => setHazardProof(c)}
                      />
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* Ingredients */}
            {ingredients.length > 0 ? (
              <IngredientsSection ingredients={ingredients} />
            ) : product.label_ingredients ? (
              <CollapsibleCard title="Ingredients">
                <AppText variant="caption" className="text-white/80 leading-relaxed">
                  {product.label_ingredients}
                </AppText>
              </CollapsibleCard>
            ) : null}

            {/* Report wrong data */}
            <Pressable
              onPress={() => router.push(`/report/${productId}` as never)}
              className="flex-row items-center justify-center gap-2 rounded-2xl py-3.5 active:opacity-80"
              style={{ backgroundColor: GLASS.cardBg, borderWidth: 1, borderColor: GLASS.cardBorder }}
            >
              <Ionicons name="flag-outline" size={16} color="#ffffff" />
              <AppText variant="label" className="text-white font-semibold">Report wrong data</AppText>
            </Pressable>

            {/* Reviews */}
            <View className="rounded-3xl p-5 gap-4" style={glassCard}>
              <AppText variant="heading" className="text-white">Reviews</AppText>

              {product.reviews_count > 0 && product.average_score !== null ? (
                <View className="gap-4">
                  {/* Big score + stars + count */}
                  <View className="gap-2">
                    <View className="flex-row items-center gap-3">
                      <Text style={{ fontSize: 40, fontWeight: '900', color: '#ffffff', lineHeight: 42 }}>
                        {Number(product.average_score).toFixed(1)}
                      </Text>
                      <View className="gap-1">
                        <StarRating score={Math.round(Number(product.average_score))} size={16} />
                        <AppText variant="caption" className="text-white/55">
                          {product.reviews_count} {product.reviews_count === 1 ? 'review' : 'reviews'}
                        </AppText>
                      </View>
                    </View>
                    {buyAgainPct !== null && (
                      <View className="flex-row items-center gap-1.5 self-start rounded-full px-3 py-1" style={{ backgroundColor: 'rgba(34,197,94,0.22)' }}>
                        <Ionicons name="thumbs-up" size={13} color="#4ade80" />
                        <AppText variant="caption" style={{ color: '#4ade80', fontWeight: '700' }}>
                          {buyAgainPct}% would buy again
                        </AppText>
                      </View>
                    )}
                  </View>

                  {/* Review highlights (per-category averages) */}
                  <View className="gap-2.5">
                    <Text style={{ fontSize: 11, letterSpacing: 1.2, color: 'rgba(255,255,255,0.6)', fontWeight: '700', textTransform: 'uppercase' }}>
                      Review highlights
                    </Text>
                    {[
                      { label: 'Performance', value: product.avg_performance_score },
                      { label: 'Ease of use', value: product.avg_ease_of_use_score },
                      { label: 'Accuracy of claims', value: product.avg_accuracy_of_claims_score },
                      { label: 'Value for money', value: product.avg_value_for_money_score },
                      { label: 'Packaging', value: product.avg_packaging_score },
                    ].map(({ label, value }) => (
                      <View key={label} className="flex-row items-center justify-between">
                        <AppText variant="caption" className="text-white/70">{label}</AppText>
                        <View className="flex-row items-center gap-2">
                          <StarRating score={value !== null ? Math.round(Number(value)) : 0} size={13} />
                          <AppText variant="caption" className="font-semibold text-white" style={{ width: 24, textAlign: 'right' }}>
                            {value !== null ? Number(value).toFixed(1) : '—'}
                          </AppText>
                        </View>
                      </View>
                    ))}
                  </View>

                  {/* Write / Edit review */}
                  {showReviewButton && writeButton(
                    product.user_reviewed ? 'Edit review' : 'Write a review',
                    product.user_reviewed ? 'create-outline' : 'add',
                  )}
                </View>
              ) : (
                <View className="gap-3">
                  <AppText variant="body" className="text-white/70">
                    No reviews yet. Be the first to review this product.
                  </AppText>
                  {showReviewButton && writeButton('Write a review', 'add')}
                </View>
              )}

              {allReviews.length > 0 && (
                <View className="gap-4">
                  {allReviews.map((review) => (
                    <ReviewCard
                      key={review.review_id}
                      review={review}
                      onReport={() => setReportTarget(review.review_id)}
                      onOpenProfile={(userId) => router.push(`/user/${userId}` as never)}
                    />
                  ))}
                </View>
              )}

              {hasNextPage && (
                <Pressable
                  onPress={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="flex-row items-center justify-center gap-2 rounded-2xl py-3.5 active:opacity-80"
                  style={{ backgroundColor: 'rgba(255,255,255,0.10)' }}
                >
                  {isFetchingNextPage ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="chevron-down" size={15} color="#ffffff" />
                      <AppText variant="caption" className="text-white font-semibold">
                        Load more reviews
                      </AppText>
                    </>
                  )}
                </Pressable>
              )}

            </View>

            <AppText variant="caption" className="text-white/50 text-center leading-relaxed px-2">
              Safety data sourced from ingredient hazard databases. Not medical advice.
            </AppText>
          </View>
        </ScrollView>
      )}

      <AppToast config={toastConfig} />

      <HazardPublicationsModal
        productId={productId}
        category={hazardProof}
        onClose={() => setHazardProof(null)}
      />

      {product && (
        <>
          <ReviewSheet
            visible={reviewSheetVisible}
            productId={productId}
            userReviewed={product.user_reviewed}
            onClose={() => setReviewSheetVisible(false)}
            onSuccess={() => showToast(
              product.user_reviewed ? 'Review updated!' : 'Review submitted!',
              'success',
            )}
          />
          <AppModal
            visible={reportTarget !== null}
            title="Report Review"
            onClose={() => setReportTarget(null)}
          >
            <AppText variant="body" className="text-white/70">
              Why are you reporting this review?
            </AppText>
            <View className="gap-2">
              {REPORT_REASONS.map((reason) => (
                <Pressable
                  key={reason.value}
                  onPress={() => {
                    if (reportTarget !== null) {
                      report({ reviewId: reportTarget, reason: reason.value });
                    }
                  }}
                  className="py-3.5 px-4 rounded-xl active:opacity-70"
                  style={{ backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: GLASS.cardBorder }}
                >
                  <AppText variant="label" className="text-white">{reason.label}</AppText>
                </Pressable>
              ))}
            </View>
          </AppModal>
        </>
      )}
    </View>
  );
}
