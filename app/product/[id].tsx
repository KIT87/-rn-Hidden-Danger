import { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppModal, AppText, AppToast, useToast } from '@/components/ui';
import { RiskScore } from '@/components/product/RiskScore';
import { StarRating } from '@/components/product/StarRating';
import { ReviewCard } from '@/components/product/ReviewCard';
import { ReviewSheet } from '@/components/product/ReviewSheet';
import { useProduct } from '@/features/products/useProduct';
import { useTogglePick } from '@/features/products/useTogglePick';
import { useProductReviews } from '@/features/products/useProductReviews';
import { useReportReview } from '@/features/products/useReportReview';
import type {
  HazardCategories,
  HazardSeverity,
  Ingredient,
  ReportReason,
} from '@/features/products/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Hero image + its bottom-up dark fade (for white brand/title legibility).
// The fade spans at most the bottom 25% of the hero image, transparent at the
// top edge of the fade down to a soft black at the very bottom.
const { width: SCREEN_W } = Dimensions.get('window');
const HERO_H = 260;
const HERO_FADE_H = Math.round(HERO_H * 0.4);
const HERO_PAD = 20; // breathing room above/below the product image

// Product-level concerns not provided right now — commented out until reinstated.
// function concernVariant(level: ConcernLevel): 'safe' | 'caution' | 'danger' {
//   if (level === 'LOW') return 'safe';
//   if (level === 'MODERATE') return 'caution';
//   if (level === 'HIGH') return 'danger';
//   return 'safe';
// }

type LevelKey = 'low' | 'moderate' | 'high' | 'critical';

const LEVEL_COLORS: Record<LevelKey, { dot: string; bg: string; text: string }> = {
  low:      { dot: '#eab308', bg: '#fefce8', text: '#a16207' },
  moderate: { dot: '#f59e0b', bg: '#fffbeb', text: '#b45309' },
  high:     { dot: '#f97316', bg: '#fff7ed', text: '#ea580c' },
  critical: { dot: '#ef4444', bg: '#fef2f2', text: '#dc2626' },
};

const SAFE_COLORS = { dot: '#16a34a', bg: '#f0fdf4', text: '#15803d' };

function getLevelColors(level: string | null | undefined) {
  if (!level || typeof level !== 'string') return SAFE_COLORS;
  return LEVEL_COLORS[level.toLowerCase() as LevelKey] ?? { dot: '#9ca3af', bg: '#f9fafb', text: '#6b7280' };
}

const LEGEND_ITEMS: { label: string; color: string }[] = [
  { label: 'Safe',     color: '#16a34a' },
  { label: 'Low',      color: '#eab308' },
  { label: 'Moderate', color: '#f59e0b' },
  { label: 'High',     color: '#f97316' },
  { label: 'Critical', color: '#ef4444' },
];


// ─── Hazard category card ─────────────────────────────────────────────────────
// Per-category hazard breakdown from the product-detail `hazard_categories`
// (allergy / irritation / cancer / endocrine / environmental / other), each a
// severity 1–3. Only flagged (non-null) categories are rendered.

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const HAZARD_CATEGORY_META: { key: keyof HazardCategories; label: string; icon: IconName }[] = [
  { key: 'allergy',       label: 'Allergy',       icon: 'leaf-outline' },
  { key: 'irritation',    label: 'Irritation',    icon: 'water-outline' },
  { key: 'cancer',        label: 'Cancer',        icon: 'ribbon-outline' },
  { key: 'endocrine',     label: 'Endocrine',     icon: 'flash-outline' },
  { key: 'environmental', label: 'Environmental', icon: 'earth-outline' },
  { key: 'other',         label: 'Other',         icon: 'alert-circle-outline' },
];

const SEVERITY_META: Record<HazardSeverity, { label: string; colors: typeof SAFE_COLORS }> = {
  1: { label: 'Low',      colors: LEVEL_COLORS.low },
  2: { label: 'Moderate', colors: LEVEL_COLORS.moderate },
  3: { label: 'High',     colors: LEVEL_COLORS.high },
};

function HazardCategoryCard({ label, icon, severity }: {
  label: string;
  icon: IconName;
  severity: HazardSeverity;
}) {
  const { label: sevLabel, colors } = SEVERITY_META[severity];
  return (
    <View className="flex-1 rounded-2xl p-3.5 gap-3" style={{ backgroundColor: colors.bg }}>
      <View className="flex-row items-center justify-between">
        <Ionicons name={icon} size={18} color={colors.text} />
        <View className="flex-row items-center gap-1 rounded-full px-2 py-0.5" style={{ backgroundColor: 'rgba(255,255,255,0.65)' }}>
          <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors.dot }} />
          <AppText variant="caption" style={{ color: colors.text, fontWeight: '600' }}>{sevLabel}</AppText>
        </View>
      </View>
      <AppText variant="caption" className="font-semibold text-gray-700">{label}</AppText>
    </View>
  );
}

// ─── Ingredient row ───────────────────────────────────────────────────────────

function IngredientRow({ ingredient }: { ingredient: Ingredient }) {
  const lc = getLevelColors(ingredient.hazard_level);
  // Only HIGH/MODERATE/LOW carry a meaningful badge; UNKNOWN stays unlabelled.
  const displayLabel =
    ingredient.hazard_level === 'UNKNOWN'
      ? null
      : ingredient.hazard_level.charAt(0) + ingredient.hazard_level.slice(1).toLowerCase();

  return (
    <View className="flex-row items-center gap-3 px-4 py-3.5">
      <View className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: lc.dot }} />
      <AppText variant="label" className="flex-1 capitalize" numberOfLines={2}>
        {ingredient.name.toLowerCase()}
      </AppText>
      {displayLabel ? (
        <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: lc.bg }}>
          <AppText variant="caption" style={{ color: lc.text, fontWeight: '600' }}>{displayLabel}</AppText>
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
    <View className="bg-white rounded-3xl overflow-hidden" style={styles.card}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        className="flex-row items-center justify-between px-5 py-4 active:bg-gray-50"
      >
        <View className="gap-0.5">
          <AppText variant="heading">{title}</AppText>
          {subtitle ? <AppText variant="caption" className="text-gray-400">{subtitle}</AppText> : null}
        </View>
        <View className="flex-row items-center gap-2.5">
          {badge ? (
            <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: '#fce7f3' }}>
              <AppText variant="caption" style={{ color: '#be185d', fontWeight: '600' }}>{badge}</AppText>
            </View>
          ) : null}
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#9ca3af" />
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
    <View className="bg-white rounded-3xl overflow-hidden" style={styles.card}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        className="flex-row items-center justify-between px-5 py-4 active:bg-gray-50"
      >
        <View className="gap-0.5">
          <AppText variant="heading">Ingredients</AppText>
          <AppText variant="caption" className="text-gray-400">
            {ingredients.length} total · {flaggedCount} flagged
          </AppText>
        </View>
        <View className="flex-row items-center gap-2.5">
          {flaggedCount > 0 && (
            <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: '#fce7f3' }}>
              <AppText variant="caption" style={{ color: '#be185d', fontWeight: '600' }}>
                {flaggedCount} risks
              </AppText>
            </View>
          )}
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#9ca3af" />
        </View>
      </Pressable>

      {open && (
        <View className="px-4 pb-5 gap-4">
          {/* Tab switcher */}
          <View className="flex-row bg-gray-100 rounded-full p-1">
            {(['flagged', 'all'] as const).map((t) => (
              <Pressable
                key={t}
                onPress={() => setTab(t)}
                className={`flex-1 items-center py-2 rounded-full ${tab === t ? 'bg-white' : ''}`}
                style={tab === t ? { shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 1 }, shadowRadius: 2, elevation: 1 } : undefined}
              >
                <AppText variant="caption" className={`font-semibold ${tab === t ? 'text-gray-900' : 'text-gray-500'}`}>
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
                <AppText variant="caption" className="text-gray-500" style={{ fontSize: 11 }}>{label}</AppText>
              </View>
            ))}
          </View>

          {/* List */}
          <View className="rounded-2xl overflow-hidden border border-gray-100">
            {visible.map((ingredient, i) => (
              <View key={ingredient.ingredient_id}>
                {i > 0 && <View className="h-px bg-gray-100" />}
                <IngredientRow ingredient={ingredient} />
              </View>
            ))}
            {visible.length === 0 && (
              <View className="py-8 items-center">
                <AppText variant="caption" className="text-gray-400">No ingredients to show</AppText>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Pick button ──────────────────────────────────────────────────────────────

function PickButton({
  productId,
  userPicked,
  onError,
  variant = 'default',
}: {
  productId: number;
  userPicked: boolean;
  onError: (msg: string) => void;
  variant?: 'default' | 'header';
}) {
  const { mutate, isPending } = useTogglePick(productId, { onError });

  if (variant === 'header') {
    return (
      <Pressable
        onPress={() => !isPending && mutate(userPicked)}
        className="flex-row items-center gap-1 active:opacity-60"
        hitSlop={8}
      >
        <Ionicons
          name={userPicked ? 'star' : 'star-outline'}
          size={17}
          color={userPicked ? '#d97706' : '#374151'}
        />
        <AppText variant="caption" className={`font-semibold ${userPicked ? 'text-amber-700' : 'text-gray-700'}`}>
          Pick
        </AppText>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => !isPending && mutate(userPicked)}
      className={`flex-row items-center gap-1.5 rounded-full px-3 py-1.5 active:opacity-70 ${
        userPicked ? 'bg-amber-100' : 'bg-gray-100'
      }`}
      hitSlop={8}
    >
      <MaterialCommunityIcons
        name={userPicked ? 'crown' : 'crown-outline'}
        size={14}
        color={userPicked ? '#d97706' : '#6b7280'}
      />
      <AppText variant="caption" className={`font-semibold ${userPicked ? 'text-amber-700' : 'text-gray-500'}`}>
        {userPicked ? 'Top Pick' : 'Add Pick'}
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
  // buy-again counts come back on the reviews-list response (page 1 holds the
  // totals across all pages); not_sure/unset are excluded server-side.
  const firstReviewPage = reviewPages?.pages?.[0] ?? null;
  const buyYes = firstReviewPage?.buy_again_yes ?? 0;
  const buyNo = firstReviewPage?.buy_again_no ?? 0;
  const buyAgainPct = buyYes + buyNo > 0 ? Math.round((buyYes / (buyYes + buyNo)) * 100) : null;

  // The user's own review (if it's on a loaded page) tells us whether it's locked.
  const ownReview = allReviews.find((r) => r.user_is_owner) ?? null;
  // Not reviewed → "Write"; reviewed & not locked → "Edit"; reviewed & locked → no button.
  // If we haven't loaded their review yet, optimistically allow (the sheet re-checks lock).
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

  // Per-category hazard breakdown, flagged (non-null) categories only.
  const hazardCategories = product?.hazard_categories ?? null;
  const flaggedCategories = hazardCategories
    ? HAZARD_CATEGORY_META
        .map((m) => ({ ...m, severity: hazardCategories[m.key] }))
        .filter((c): c is typeof c & { severity: HazardSeverity } => c.severity != null)
    : [];
  // Chunk into rows of 2 for the grid.
  const hazardRows: (typeof flaggedCategories)[] = [];
  for (let i = 0; i < flaggedCategories.length; i += 2) {
    hazardRows.push(flaggedCategories.slice(i, i + 2));
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Custom header */}
      <View
        style={{
          paddingTop: insets.top,
          backgroundColor: 'white',
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: '#e5e7eb',
        }}
      >
        <View className="flex-row items-center gap-3 px-4" style={{ height: 48 }}>
          <Pressable onPress={() => router.back()} hitSlop={8} className="flex-row items-center gap-0.5">
            <Ionicons name="chevron-back" size={20} color="#111827" />
            <AppText variant="caption" className="font-semibold text-gray-800">Products</AppText>
          </Pressable>
          <AppText variant="label" className="flex-1 text-center text-gray-900" numberOfLines={1}>
            {product?.name ?? ''}
          </AppText>
          {product ? (
            <PickButton productId={productId} userPicked={product.user_picked} onError={showToast} variant="header" />
          ) : (
            <View style={{ width: 44 }} />
          )}
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#7c3aed" />
        </View>
      ) : isError || !product ? (
        <View className="flex-1 items-center justify-center gap-4 px-8">
          <Ionicons name="alert-circle-outline" size={52} color="#d1d5db" />
          <AppText variant="body" className="text-gray-400 text-center">Product not found</AppText>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <AppText variant="label" className="text-primary-600">Go back</AppText>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          bounces
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" colors={['#7c3aed']} />
          }
        >
          {/* Hero */}
          <View style={{ height: HERO_H, backgroundColor: '#ffffff' }}>
            {heroImageUrl ? (
              <Image source={{ uri: heroImageUrl }} style={{ position: 'absolute', top: HERO_PAD, bottom: HERO_PAD, left: 0, right: 0 }} resizeMode="contain" />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Ionicons name="cube-outline" size={72} color="#e5e7eb" />
              </View>
            )}
            {/* Smooth bottom-up dark fade (transparent at top → soft black at bottom) */}
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
                <Stop offset="1" stopColor="#000000" stopOpacity={0.62} />
                </SvgLinearGradient>
              </Defs>
              <Rect x="0" y="0" width={SCREEN_W} height={HERO_FADE_H} fill="url(#heroFade)" />
            </Svg>
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingBottom: 14 }} pointerEvents="none">
              <Text style={{ fontSize: 11, letterSpacing: 1.5, color: 'rgba(255,255,255,0.75)', fontWeight: '600', textTransform: 'uppercase', marginBottom: 3 }}>
                {product.brand_name}
              </Text>
              <Text style={{ fontSize: 22, fontWeight: '900', color: 'white', lineHeight: 28 }} numberOfLines={2}>
                {product.name}
              </Text>
            </View>
          </View>

          {/* Tags row */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ backgroundColor: '#f9fafb', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
          >
            {product.volume && product.volume_units ? (
              <View className="rounded-full px-3 py-1.5 bg-white border border-gray-200">
                <AppText variant="caption" className="text-gray-600">{product.volume} {product.volume_units}</AppText>
              </View>
            ) : null}
            {product.has_high_hazard ? (
              <View className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5 bg-white border border-red-200">
                <Ionicons name="warning" size={12} color="#ef4444" />
                <AppText variant="caption" style={{ color: '#dc2626' }}>High hazard</AppText>
              </View>
            ) : null}
          </ScrollView>

          {/* Content cards */}
          <View className="px-4 pt-4 pb-8 gap-3">

            {/* Risk level card */}
            <View className="bg-white rounded-3xl p-5 gap-4" style={styles.card}>
              <Text style={{ fontSize: 11, letterSpacing: 1.5, color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase' }}>
                Risk level
              </Text>
              <View className="items-center gap-1 pt-1">
                <RiskScore riskScore={product.risk_score} size="lg" />
                <AppText variant="caption" className="text-gray-400">
                  {flaggedCount} high risk {flaggedCount === 1 ? 'ingredient' : 'ingredients'}
                </AppText>
              </View>

              {/* Per-category hazard breakdown (flagged categories only) */}
              {flaggedCategories.length > 0 && (
                <View className="gap-3">
                  <Text style={{ fontSize: 11, letterSpacing: 1.2, color: '#9ca3af', fontWeight: '700', textTransform: 'uppercase' }}>
                    Hazard breakdown
                  </Text>
                  {hazardRows.map((row, i) => (
                    <View key={i} className="flex-row gap-3">
                      {row.map((c) => (
                        <HazardCategoryCard key={c.key} label={c.label} icon={c.icon} severity={c.severity} />
                      ))}
                      {row.length === 1 && <View className="flex-1" />}
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Ingredients */}
            {ingredients.length > 0 ? (
              <IngredientsSection ingredients={ingredients} />
            ) : product.label_ingredients ? (
              <CollapsibleCard title="Ingredients">
                <AppText variant="caption" className="text-gray-600 leading-relaxed">
                  {product.label_ingredients}
                </AppText>
              </CollapsibleCard>
            ) : null}

            {/* "About this product" removed — `description` is no longer in the API. */}

            {/* Reviews */}
            <View className="bg-white rounded-3xl p-5 gap-4" style={styles.card}>
              <AppText variant="heading">Reviews</AppText>

              {product.reviews_count > 0 && product.average_score !== null ? (
                <View className="gap-4">
                  {/* 4.6  ★★★★★ (128 reviews)  /  👍 85% would buy again — all left-aligned */}
                  <View className="flex-row items-center gap-3">
                    <Text style={{ fontSize: 40, fontWeight: '900', color: '#111827', lineHeight: 42 }}>
                      {Number(product.average_score).toFixed(1)}
                    </Text>
                    <View className="gap-1">
                      <View className="flex-row items-center gap-2">
                        <StarRating score={Math.round(Number(product.average_score))} size={16} />
                        <AppText variant="caption" className="text-gray-400">
                          ({product.reviews_count} {product.reviews_count === 1 ? 'review' : 'reviews'})
                        </AppText>
                      </View>
                      {buyAgainPct !== null && (
                        <View className="flex-row items-center gap-1">
                          <Ionicons name="thumbs-up" size={13} color="#16a34a" />
                          <AppText variant="caption" className="text-gray-600">
                            <AppText variant="caption" style={{ fontWeight: '700', color: '#15803d' }}>{buyAgainPct}%</AppText>
                            {' '}would buy again
                          </AppText>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Write / Edit review */}
                  {showReviewButton && (
                    <Pressable
                      onPress={() => setReviewSheetVisible(true)}
                      className="flex-row items-center justify-center gap-2 rounded-2xl py-3.5 active:opacity-80"
                      style={{ backgroundColor: '#7c3aed' }}
                    >
                      <Ionicons name={product.user_reviewed ? 'create-outline' : 'add'} size={16} color="white" />
                      <AppText variant="label" style={{ color: 'white', fontWeight: '700' }}>
                        {product.user_reviewed ? 'Edit review' : 'Write review'}
                      </AppText>
                    </Pressable>
                  )}

                  {/* Review highlights (per-category averages) */}
                  <View className="gap-2.5">
                    <Text style={{ fontSize: 11, letterSpacing: 1.2, color: '#9ca3af', fontWeight: '700', textTransform: 'uppercase' }}>
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
                        <AppText variant="caption" className="text-gray-600">{label}</AppText>
                        <View className="flex-row items-center gap-2">
                          <StarRating score={value !== null ? Math.round(Number(value)) : 0} size={13} />
                          <AppText variant="caption" className="font-semibold text-gray-700" style={{ width: 24, textAlign: 'right' }}>
                            {value !== null ? Number(value).toFixed(1) : '—'}
                          </AppText>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <View className="gap-3">
                  <AppText variant="body" className="text-gray-500">
                    No reviews yet. Be the first to review this product.
                  </AppText>
                  {showReviewButton && (
                    <Pressable
                      onPress={() => setReviewSheetVisible(true)}
                      className="flex-row items-center justify-center gap-2 rounded-2xl py-3.5 active:opacity-80"
                      style={{ backgroundColor: '#7c3aed' }}
                    >
                      <Ionicons name="add" size={16} color="white" />
                      <AppText variant="label" style={{ color: 'white', fontWeight: '700' }}>Write review</AppText>
                    </Pressable>
                  )}
                </View>
              )}

              {allReviews.length > 0 && (
                <View className="gap-4">
                  {allReviews.map((review) => (
                    <ReviewCard
                      key={review.review_id}
                      review={review}
                      onReport={() => setReportTarget(review.review_id)}
                    />
                  ))}
                </View>
              )}

              {hasNextPage && (
                <Pressable
                  onPress={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="flex-row items-center justify-center gap-2 bg-gray-50 rounded-2xl py-3.5 active:bg-gray-100"
                >
                  {isFetchingNextPage ? (
                    <ActivityIndicator size="small" color="#7c3aed" />
                  ) : (
                    <>
                      <Ionicons name="chevron-down" size={15} color="#7c3aed" />
                      <AppText variant="caption" style={{ color: '#7c3aed', fontWeight: '600' }}>
                        Load more reviews
                      </AppText>
                    </>
                  )}
                </Pressable>
              )}

            </View>

            <AppText variant="caption" className="text-gray-400 text-center leading-relaxed px-2">
              Safety data sourced from ingredient hazard databases. Not medical advice.
            </AppText>
          </View>
        </ScrollView>
      )}

      <AppToast config={toastConfig} />

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
            <AppText variant="body" className="text-gray-500">
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
                  className="py-3.5 px-4 bg-gray-50 rounded-xl active:bg-gray-100"
                >
                  <AppText variant="label">{reason.label}</AppText>
                </Pressable>
              ))}
            </View>
          </AppModal>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
});
