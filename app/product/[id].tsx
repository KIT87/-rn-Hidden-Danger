import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppBadge, AppModal, AppText, AppToast, useToast } from '@/components/ui';
import { StarRating } from '@/components/product/StarRating';
import { ReviewCard } from '@/components/product/ReviewCard';
import { ReviewSheet } from '@/components/product/ReviewSheet';
import { useProduct } from '@/features/products/useProduct';
import { useTogglePick } from '@/features/products/useTogglePick';
import { useProductReviews } from '@/features/products/useProductReviews';
import { useReportReview } from '@/features/products/useReportReview';
import type {
  ConcernLevel,
  Ingredient,
  ReportReason,
} from '@/features/products/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

// 1–3 = High concern (red), 4–7 = Moderate (amber), 8–10 = Low concern (green)
function getScoreInfo(score: number) {
  if (score < 4) return { color: '#ef4444', label: 'High' };
  if (score < 8) return { color: '#f59e0b', label: 'Moderate' };
  return { color: '#16a34a', label: 'Low' };
}

function concernVariant(level: ConcernLevel): 'safe' | 'caution' | 'danger' {
  if (level === 'LOW') return 'safe';
  if (level === 'MODERATE') return 'caution';
  if (level === 'HIGH') return 'danger';
  return 'safe';
}

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

// ─── Score arc ────────────────────────────────────────────────────────────────

function ScoreArc({ score }: { score: number }) {
  const SIZE = 88;
  const STROKE = 9;
  const R = (SIZE - STROKE) / 2;
  const C = 2 * Math.PI * R;
  const arcLen = C * 0.75;
  const filled = arcLen * (score / 10);
  const { color, label } = getScoreInfo(score);

  return (
    <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
        <Circle
          cx={SIZE / 2} cy={SIZE / 2} r={R}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={STROKE}
          strokeDasharray={`${arcLen} ${C - arcLen}`}
          strokeLinecap="round"
          transform={`rotate(135 ${SIZE / 2} ${SIZE / 2})`}
        />
        <Circle
          cx={SIZE / 2} cy={SIZE / 2} r={R}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeDasharray={`${filled} ${C - filled}`}
          strokeLinecap="round"
          transform={`rotate(135 ${SIZE / 2} ${SIZE / 2})`}
        />
      </Svg>
      <AppText variant="caption" style={{ fontWeight: '600', color: '#6b7280', fontSize: 12 }}>
        {label}
      </AppText>
    </View>
  );
}

// ─── Concern card ─────────────────────────────────────────────────────────────

const CONCERN_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  cancer: 'ribbon-outline',
  dev_rep: 'body-outline',
  allergy: 'leaf-outline',
  use_res_level: 'warning-outline',
};

const CONCERN_LABELS: Record<string, string> = {
  cancer: 'Cancer Risk',
  dev_rep: 'Dev. & Repro.',
  allergy: 'Allergy Risk',
  use_res_level: 'Use Restrictions',
};

const VARIANT_COLORS = {
  safe:    { bg: '#f0fdf4', icon: '#16a34a' },
  caution: { bg: '#fffbeb', icon: '#f59e0b' },
  danger:  { bg: '#fef2f2', icon: '#ef4444' },
};

function ConcernCard({ field, level }: { field: string; level: ConcernLevel }) {
  const variant = concernVariant(level);
  const { bg, icon: iconColor } = level ? VARIANT_COLORS[variant] : { bg: '#f9fafb', icon: '#d1d5db' };
  return (
    <View className="flex-1 rounded-2xl p-3.5 gap-3" style={{ backgroundColor: bg }}>
      <View className="flex-row items-center justify-between">
        <Ionicons name={CONCERN_ICONS[field]} size={18} color={iconColor} />
        {level && <AppBadge label={level} variant={variant} />}
      </View>
      <AppText variant="caption" className="font-semibold text-gray-700">
        {CONCERN_LABELS[field]}
      </AppText>
    </View>
  );
}

// ─── Ingredient row ───────────────────────────────────────────────────────────

function IngredientRow({ ingredient }: { ingredient: Ingredient }) {
  const [expanded, setExpanded] = useState(false);
  const hasHazards = ingredient.hazards.length > 0;
  const lc = getLevelColors(ingredient.hazard_rating_display);
  const displayLabel = ingredient.hazard_rating_display
    ? ingredient.hazard_rating_display.charAt(0).toUpperCase() + ingredient.hazard_rating_display.slice(1).toLowerCase()
    : null;

  return (
    <View>
      <Pressable
        onPress={() => hasHazards && setExpanded((v) => !v)}
        className="flex-row items-center gap-3 px-4 py-3.5"
        style={expanded ? { backgroundColor: '#fff8f1' } : undefined}
      >
        <View className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: lc.dot }} />
        <AppText variant="label" className="flex-1 capitalize" numberOfLines={expanded ? undefined : 2}>
          {ingredient.name.toLowerCase()}
        </AppText>
        {displayLabel ? (
          <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: lc.bg }}>
            <AppText variant="caption" style={{ color: lc.text, fontWeight: '600' }}>{displayLabel}</AppText>
          </View>
        ) : null}
        {hasHazards && (
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color="#9ca3af" />
        )}
      </Pressable>
      {expanded && (
        <View style={{ backgroundColor: '#fff8f1' }}>
          {ingredient.hazards.map((h, i) => {
            const hc = getLevelColors(h.rating);
            const hlabel = typeof h.rating === 'string'
              ? h.rating.charAt(0).toUpperCase() + h.rating.slice(1)
              : '';
            return (
              <View
                key={i}
                className="flex-row items-center gap-3 px-4 py-2.5"
                style={i < ingredient.hazards.length - 1
                  ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#fed7aa' }
                  : undefined
                }
              >
                <View className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: hc.dot }} />
                <AppText variant="caption" className="flex-1 text-gray-600">{h.name}</AppText>
                <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: hc.bg }}>
                  <AppText variant="caption" style={{ color: hc.text, fontWeight: '600' }}>{hlabel}</AppText>
                </View>
              </View>
            );
          })}
        </View>
      )}
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

function IngredientsSection({ ingredients, flaggedCount }: {
  ingredients: Ingredient[];
  flaggedCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'flagged' | 'all'>('flagged');

  const sorted = [...ingredients].sort((a, b) => a.position - b.position);
  const flagged = sorted.filter((i) => i.hazards.length > 0);
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

          <AppText variant="caption" className="text-gray-400 text-center" style={{ fontSize: 11 }}>
            Tap any flagged ingredient to see detailed hazard breakdown
          </AppText>
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

  const allReviews = reviewPages?.pages.flatMap((p) => p?.reviews ?? []) ?? [];

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  const flaggedCount = product
    ? product.ingredients.filter((i) => i.hazards.length > 0).length
    : 0;

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
          <View style={{ height: 260, backgroundColor: '#f3f4f6' }}>
            {product.image_url ? (
              <Image source={{ uri: product.image_url }} style={StyleSheet.absoluteFill} resizeMode="contain" />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Ionicons name="cube-outline" size={72} color="#e5e7eb" />
              </View>
            )}
            {/* Pseudo-gradient overlay */}
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120 }} pointerEvents="none">
              <View style={{ flex: 1, backgroundColor: 'transparent' }} />
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.10)' }} />
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.28)' }} />
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.48)' }} />
            </View>
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
            {product.product_type ? (
              <View className="rounded-full px-3 py-1.5 bg-white border border-gray-200">
                <AppText variant="caption" className="text-gray-600">{product.product_type}</AppText>
              </View>
            ) : null}
            {product.certifiers.map((cert) => (
              <View key={cert.certifier_id} className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5 bg-white border border-green-300">
                <Ionicons name="checkmark-circle" size={12} color="#16a34a" />
                <AppText variant="caption" style={{ color: '#15803d' }}>{cert.name}</AppText>
              </View>
            ))}
          </ScrollView>

          {/* Content cards */}
          <View className="px-4 pt-4 pb-8 gap-3">

            {/* Safety Score card */}
            <View className="bg-white rounded-3xl p-5 gap-4" style={styles.card}>
              <Text style={{ fontSize: 11, letterSpacing: 1.5, color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase' }}>
                Safety Score
              </Text>
              <View className="flex-row items-start justify-between">
                <View className="gap-1">
                  <View className="flex-row items-end gap-1">
                    <Text style={{ fontSize: 52, fontWeight: '900', color: getScoreInfo(product.score).color, lineHeight: 56 }}>
                      {product.score}
                    </Text>
                    <Text style={{ fontSize: 16, color: '#9ca3af', marginBottom: 6 }}>/10</Text>
                  </View>
                  <AppText variant="caption" className="text-gray-400">
                    {flaggedCount} flagged ingredients
                  </AppText>
                </View>
                <ScoreArc score={product.score} />
              </View>

              {/* 2×2 concern grid */}
              <View className="gap-3">
                <View className="flex-row gap-3">
                  <ConcernCard field="cancer" level={product.concerns.cancer} />
                  <ConcernCard field="dev_rep" level={product.concerns.dev_rep} />
                </View>
                <View className="flex-row gap-3">
                  <ConcernCard field="allergy" level={product.concerns.allergy} />
                  <ConcernCard field="use_res_level" level={product.concerns.use_res_level} />
                </View>
              </View>

              {/* High concern areas */}
              {product.concerns.other_high.length > 0 && (
                <View className="gap-2">
                  <View className="flex-row items-center gap-1.5">
                    <Ionicons name="alert-circle" size={14} color="#ef4444" />
                    <Text style={{ fontSize: 11, letterSpacing: 1.2, color: '#ef4444', fontWeight: '700', textTransform: 'uppercase' }}>
                      High Concern Areas
                    </Text>
                  </View>
                  <View className="flex-row flex-wrap gap-2">
                    {product.concerns.other_high.map((item) => (
                      <View key={item} className="rounded-full px-2.5 py-1 border border-red-200 bg-red-50">
                        <AppText variant="caption" className="text-red-700">{item}</AppText>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* Ingredients */}
            {product.ingredients.length > 0 ? (
              <IngredientsSection ingredients={product.ingredients} flaggedCount={flaggedCount} />
            ) : product.label_ingredients ? (
              <CollapsibleCard title="Ingredients">
                <AppText variant="caption" className="text-gray-600 leading-relaxed">
                  {product.label_ingredients}
                </AppText>
              </CollapsibleCard>
            ) : null}

            {/* About this product */}
            {product.description ? (
              <CollapsibleCard title="About this product">
                <AppText variant="body" className="text-gray-600 leading-relaxed">
                  {product.description}
                </AppText>
              </CollapsibleCard>
            ) : null}

            {/* Reviews */}
            <View className="bg-white rounded-3xl p-5 gap-4" style={styles.card}>
              <View className="flex-row items-center justify-between">
                <View className="gap-0.5">
                  <AppText variant="heading">Reviews</AppText>
                  {product.reviews_count > 0 && product.average_score !== null && (
                    <View className="flex-row items-center gap-1.5 mt-0.5">
                      <StarRating score={Math.round(Number(product.average_score))} size={13} />
                      <AppText variant="caption" className="font-semibold text-gray-700">
                        {Number(product.average_score).toFixed(1)}
                      </AppText>
                      <AppText variant="caption" className="text-gray-400">
                        · {product.reviews_count} {product.reviews_count === 1 ? 'review' : 'reviews'}
                      </AppText>
                    </View>
                  )}
                </View>
                <Pressable
                  onPress={() => setReviewSheetVisible(true)}
                  className="flex-row items-center gap-1.5 rounded-full px-4 py-2.5 active:opacity-80"
                  style={{ backgroundColor: '#7c3aed' }}
                >
                  <Ionicons name="add" size={14} color="white" />
                  <AppText variant="caption" style={{ color: 'white', fontWeight: '600' }}>Add Review</AppText>
                </Pressable>
              </View>

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

              {!product.user_reviewed && (
                <Pressable
                  onPress={() => setReviewSheetVisible(true)}
                  className="border-2 border-dashed border-gray-200 rounded-2xl py-4 items-center gap-1.5 active:bg-gray-50"
                >
                  <Ionicons name="add-circle-outline" size={20} color="#9ca3af" />
                  <AppText variant="caption" className="text-gray-400 font-medium">
                    Share your experience
                  </AppText>
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
