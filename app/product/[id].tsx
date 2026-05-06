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
import { useToggleHelpful } from '@/features/products/useToggleHelpful';
import { useReportReview } from '@/features/products/useReportReview';
import type {
  ConcernLevel,
  Ingredient,
  ProductDetail,
  ReportReason,
} from '@/features/products/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getScoreInfo(score: number) {
  if (score <= 3) return { color: '#16a34a', label: 'Low Hazard' };
  if (score <= 6) return { color: '#f59e0b', label: 'Moderate Hazard' };
  return { color: '#ef4444', label: 'High Hazard' };
}

function concernVariant(level: ConcernLevel): 'safe' | 'caution' | 'danger' {
  if (level === 'LOW') return 'safe';
  if (level === 'MODERATE') return 'caution';
  if (level === 'HIGH') return 'danger';
  return 'safe';
}

const HAZARD_COLORS: Record<string, string> = {
  high: '#ef4444',
  moderate: '#f59e0b',
  low: '#16a34a',
};

// ─── Layout primitives ────────────────────────────────────────────────────────

function Divider() {
  return <View className="h-px bg-gray-100" />;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-3">
      <AppText variant="heading">{title}</AppText>
      {children}
    </View>
  );
}

// ─── Score ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const { color, label } = getScoreInfo(score);
  const tint = score <= 3 ? '#f0fdf4' : score <= 6 ? '#fffbeb' : '#fef2f2';
  return (
    <View style={{ backgroundColor: tint, borderRadius: 20, padding: 20 }}>
      <View className="flex-row items-center gap-6">
        <View style={[styles.ring, { borderColor: color }]}>
          <Text style={{ fontSize: 44, fontWeight: '900', color, lineHeight: 50 }}>{score}</Text>
          <Text style={{ fontSize: 11, color: '#9ca3af' }}>/ 10</Text>
        </View>
        <View className="flex-1 gap-1">
          <Text style={{ fontSize: 22, fontWeight: '800', color }}>{label}</Text>
          <Text style={{ fontSize: 13, color: '#6b7280' }}>Hazard Score</Text>
          <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
            Higher = more hazardous
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Concern card ─────────────────────────────────────────────────────────────

const CONCERN_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  cancer: 'ribbon-outline',
  dev_rep: 'body-outline',
  allergy: 'leaf-outline',
  use_res_level: 'lock-closed-outline',
};

const CONCERN_LABELS: Record<string, string> = {
  cancer: 'Cancer',
  dev_rep: 'Dev. & Reproductive',
  allergy: 'Allergies',
  use_res_level: 'Use Restrictions',
};

const VARIANT_COLORS = {
  safe: { bg: '#f0fdf4', icon: '#16a34a' },
  caution: { bg: '#fffbeb', icon: '#f59e0b' },
  danger: { bg: '#fef2f2', icon: '#ef4444' },
};

function ConcernCard({ field, level }: { field: string; level: ConcernLevel }) {
  const variant = concernVariant(level);
  const { bg, icon: iconColor } = level ? VARIANT_COLORS[variant] : { bg: '#f9fafb', icon: '#d1d5db' };
  return (
    <View className="flex-1 rounded-2xl p-3.5 gap-2.5" style={{ backgroundColor: bg }}>
      <Ionicons name={CONCERN_ICONS[field]} size={20} color={iconColor} />
      <AppText variant="caption" className="font-semibold text-gray-700">
        {CONCERN_LABELS[field]}
      </AppText>
      {level
        ? <AppBadge label={level} variant={variant} />
        : <AppText variant="caption" className="text-gray-400">No data</AppText>
      }
    </View>
  );
}

// ─── Concern tag group ────────────────────────────────────────────────────────

const TAG_STYLES = {
  high: { dot: '#ef4444', bg: 'bg-red-50', text: 'text-red-700', label: 'High' },
  moderate: { dot: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-700', label: 'Moderate' },
  low: { dot: '#16a34a', bg: 'bg-green-50', text: 'text-green-700', label: 'Low' },
};

function ConcernTagGroup({ items, level }: { items: string[]; level: 'high' | 'moderate' | 'low' }) {
  if (items.length === 0) return null;
  const s = TAG_STYLES[level];
  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-1.5">
        <View className="w-2 h-2 rounded-full" style={{ backgroundColor: s.dot }} />
        <AppText variant="caption" className={`font-semibold ${s.text}`}>{s.label}</AppText>
      </View>
      <View className="flex-row flex-wrap gap-2">
        {items.map((item) => (
          <View key={item} className={`rounded-full px-2.5 py-1 ${s.bg}`}>
            <AppText variant="caption" className={s.text}>{item}</AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Ingredient row ───────────────────────────────────────────────────────────

const HAZARD_DISPLAY_COLORS: Record<string, string> = {
  LOW: '#16a34a', MODERATE: '#f59e0b', HIGH: '#ef4444',
};
const HAZARD_DISPLAY_BG: Record<string, string> = {
  LOW: '#f0fdf4', MODERATE: '#fffbeb', HIGH: '#fef2f2',
};

function IngredientRow({ ingredient }: { ingredient: Ingredient }) {
  const [expanded, setExpanded] = useState(false);
  const hasHazards = ingredient.hazards.length > 0;
  const rating = typeof ingredient.hazard_rating_display === 'string' ? ingredient.hazard_rating_display.toUpperCase() : null;

  return (
    <Pressable onPress={() => hasHazards && setExpanded((v) => !v)} className="py-3 gap-2">
      <View className="flex-row items-center gap-2">
        <AppText variant="label" className="flex-1 capitalize" numberOfLines={expanded ? undefined : 1}>
          {ingredient.name.toLowerCase()}
        </AppText>
        {rating ? (
          <View
            className="rounded-full px-2 py-0.5"
            style={{ backgroundColor: HAZARD_DISPLAY_BG[rating] ?? '#f3f4f6' }}
          >
            <AppText variant="caption" style={{ color: HAZARD_DISPLAY_COLORS[rating] ?? '#6b7280', fontWeight: '600' }}>
              {rating.charAt(0) + rating.slice(1).toLowerCase()}
            </AppText>
          </View>
        ) : null}
        {hasHazards && (
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={13} color="#9ca3af" />
        )}
      </View>

      {expanded && (
        <View className="gap-1.5 pl-0.5">
          {ingredient.hazards.map((h, i) => (
            <View key={i} className="flex-row items-center gap-2">
              <View
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: HAZARD_COLORS[h.rating] ?? '#d1d5db' }}
              />
              <AppText variant="caption" className="text-gray-600 flex-1">{h.name}</AppText>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}

// ─── Pick button ──────────────────────────────────────────────────────────────

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
      <AppText
        variant="caption"
        className={`font-semibold ${userPicked ? 'text-amber-700' : 'text-gray-500'}`}
      >
        {userPicked ? 'Top Pick' : 'Add Pick'}
      </AppText>
    </Pressable>
  );
}

// ─── Community ratings ────────────────────────────────────────────────────────

const AVG_SCORE_ROWS = [
  { key: 'avg_performance_score',        label: 'Performance' },
  { key: 'avg_ease_of_use_score',        label: 'Ease of Use' },
  { key: 'avg_accuracy_of_claims_score', label: 'Accuracy of Claims' },
  { key: 'avg_value_for_money_score',    label: 'Value for Money' },
  { key: 'avg_packaging_score',          label: 'Packaging' },
] as const;

function CommunityRatings({
  product,
  userReviewed,
  onWriteReview,
}: {
  product: ProductDetail;
  userReviewed: boolean;
  onWriteReview: () => void;
}) {
  const hasReviews = product.reviews_count > 0 && product.average_score !== null;

  return (
    <View className="bg-gray-50 rounded-2xl p-4 gap-4">
      {/* Header row */}
      <View className="flex-row items-center justify-between">
        <View className="gap-0.5">
          <AppText variant="label" className="text-gray-700">Community Reviews</AppText>
          {hasReviews ? (
            <View className="flex-row items-center gap-1.5">
              <StarRating score={Math.round(Number(product.average_score))} size={13} />
              <AppText variant="caption" className="font-semibold text-gray-700">
                {Number(product.average_score).toFixed(1)}
              </AppText>
              <AppText variant="caption" className="text-gray-400">
                ({product.reviews_count} {product.reviews_count === 1 ? 'review' : 'reviews'})
              </AppText>
            </View>
          ) : (
            <AppText variant="caption" className="text-gray-400">No reviews yet</AppText>
          )}
        </View>
        <Pressable
          onPress={onWriteReview}
          className="flex-row items-center gap-1.5 bg-white rounded-xl px-3 py-2 border border-gray-200 active:opacity-70"
        >
          <Ionicons name={userReviewed ? 'create-outline' : 'add'} size={14} color="#16a34a" />
          <AppText variant="caption" className="font-semibold text-green-700">
            {userReviewed ? 'Edit Review' : 'Write Review'}
          </AppText>
        </Pressable>
      </View>

      {/* Detailed score bars */}
      {hasReviews && (
        <View className="gap-2.5">
          {AVG_SCORE_ROWS.map(({ key, label }) => {
            const raw = product[key];
            if (raw === null) return null;
            const val = Number(raw);
            const pct = (val / 5) * 100;
            const barColor = val >= 4 ? '#16a34a' : val >= 3 ? '#f59e0b' : '#ef4444';
            return (
              <View key={key} className="flex-row items-center gap-3">
                <AppText variant="caption" className="text-gray-500" style={{ width: 120 }}>
                  {label}
                </AppText>
                <View className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <View
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: barColor }}
                  />
                </View>
                <AppText variant="caption" className="font-semibold text-gray-600" style={{ width: 28, textAlign: 'right' }}>
                  {val.toFixed(1)}
                </AppText>
              </View>
            );
          })}
        </View>
      )}
    </View>
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

  const {
    data: reviewPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useProductReviews(productId);

  const { mutate: toggleHelpful } = useToggleHelpful(productId);
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

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  if (isError || !product) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-gray-50 px-8">
        <Ionicons name="alert-circle-outline" size={52} color="#d1d5db" />
        <AppText variant="body" className="text-gray-400 text-center">Product not found</AppText>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <AppText variant="label" className="text-primary-600">Go back</AppText>
        </Pressable>
      </View>
    );
  }

  const imageUrl = product.image_url;
  const hasIngredients = product.ingredients.length > 0;
  const hasConcernDetails =
    product.concerns.other_high.length > 0 ||
    product.concerns.other_moderate.length > 0 ||
    product.concerns.other_low.length > 0;

  return (
    <View className="flex-1">
      <ScrollView
        className="flex-1 bg-white"
        showsVerticalScrollIndicator={false}
        bounces
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#16a34a"
            colors={['#16a34a']}
          />
        }
      >
        {/* ── Hero image ────────────────────────────────── */}
        <View style={{ height: 300, backgroundColor: '#f9fafb' }}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} resizeMode="contain" />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Ionicons name="cube-outline" size={72} color="#e5e7eb" />
            </View>
          )}
          <Pressable
            onPress={() => router.back()}
            style={{ position: 'absolute', top: insets.top + 8, left: 16 }}
            className="w-10 h-10 rounded-full bg-white/85 items-center justify-center"
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </Pressable>
          <View style={{ position: 'absolute', bottom: 20, right: 16 }}>
            <View className="bg-white/90 rounded-full px-3 py-1">
              <Text style={{ fontSize: 15, fontWeight: '800', color: getScoreInfo(product.score).color }}>
                {product.score}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Content card (overlaps image) ─────────────── */}
        <View className="bg-white rounded-t-3xl px-5 py-6 gap-6" style={{ marginTop: -24 }}>

          {/* Product identity */}
          <View className="gap-3">
            <AppText variant="title" className="leading-tight">{product.name}</AppText>

            <View className="flex-row flex-wrap items-center gap-x-1.5 gap-y-1">
              <AppText variant="body" className="text-gray-500">
                {product.brand_name}
              </AppText>
              {product.product_type ? (
                <>
                  <AppText variant="body" className="text-gray-300">·</AppText>
                  <AppText variant="caption" className="text-gray-400 capitalize">{product.product_type}</AppText>
                </>
              ) : null}
            </View>

            {product.categories.length > 0 && (
              <View className="flex-row flex-wrap gap-2">
                {product.categories.map((cat) => (
                  <View key={cat} className="bg-gray-100 rounded-full px-3 py-1">
                    <AppText variant="caption" className="text-gray-600 capitalize">{cat}</AppText>
                  </View>
                ))}
              </View>
            )}

            {/* Picks row */}
            <View className="flex-row items-center justify-between pt-0.5">
              <View className="flex-row items-center gap-1.5">
                <MaterialCommunityIcons name="crown" size={13} color="#f59e0b" />
                <AppText variant="caption" className="text-gray-500">
                  {product.picks_count} {product.picks_count === 1 ? 'pick' : 'picks'}
                </AppText>
              </View>
              <PickButton
                productId={product.product_id}
                userPicked={product.user_picked}
                onError={showToast}
              />
            </View>

            {/* Community ratings card */}
            <CommunityRatings
              product={product}
              userReviewed={product.user_reviewed}
              onWriteReview={() => setReviewSheetVisible(true)}
            />
          </View>

          <Divider />

          {/* ── Safety score ─────────────────────────────── */}
          <Section title="Safety Score">
            <ScoreRing score={product.score} />
          </Section>

          <Divider />

          {/* ── Key concerns 2×2 grid ─────────────────────── */}
          <Section title="Key Concerns">
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
          </Section>

          {hasConcernDetails && (
            <>
              <Divider />
              <Section title="Concern Details">
                <View className="gap-4">
                  <ConcernTagGroup items={product.concerns.other_high} level="high" />
                  <ConcernTagGroup items={product.concerns.other_moderate} level="moderate" />
                  <ConcernTagGroup items={product.concerns.other_low} level="low" />
                </View>
              </Section>
            </>
          )}

          {product.certifiers.length > 0 && (
            <>
              <Divider />
              <Section title="Certifications">
                {product.certifiers.map((cert) => (
                  <View
                    key={cert.certifier_id}
                    className="flex-row gap-3 bg-gray-50 rounded-2xl p-3.5"
                  >
                    <Image
                      source={{ uri: cert.image_url }}
                      style={{ width: 48, height: 48 }}
                      resizeMode="contain"
                    />
                    <View className="flex-1 gap-1">
                      <View className="flex-row items-center gap-2">
                        <AppText variant="label">{cert.name}</AppText>
                        {cert.jurisdiction && (
                          <View className="bg-gray-200 rounded-full px-2 py-0.5">
                            <AppText variant="caption" className="text-gray-500">{cert.jurisdiction}</AppText>
                          </View>
                        )}
                      </View>
                      <AppText variant="caption" className="text-gray-500 leading-relaxed" numberOfLines={4}>
                        {cert.description}
                      </AppText>
                    </View>
                  </View>
                ))}
              </Section>
            </>
          )}

          {hasIngredients && (
            <>
              <Divider />
              <Section title={`Ingredients (${product.ingredients.length})`}>
                <AppText variant="caption" className="text-gray-400">
                  Tap an ingredient to see its hazards
                </AppText>
                <View className="divide-y divide-gray-100">
                  {[...product.ingredients]
                    .sort((a, b) => a.position - b.position)
                    .map((ingredient) => (
                      <IngredientRow key={ingredient.ingredient_id} ingredient={ingredient} />
                    ))}
                </View>
              </Section>
            </>
          )}

          {!hasIngredients && product.label_ingredients && (
            <>
              <Divider />
              <Section title="Ingredients">
                <AppText variant="caption" className="text-gray-600 leading-relaxed">
                  {product.label_ingredients}
                </AppText>
              </Section>
            </>
          )}

          {/* ── Community reviews ─────────────────────────── */}
          {allReviews.length > 0 && (
            <>
              <Divider />
              <View className="gap-4">
                {/* Section header */}
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <View className="w-8 h-8 rounded-xl bg-amber-50 items-center justify-center">
                      <Ionicons name="star" size={15} color="#f59e0b" />
                    </View>
                    <View>
                      <AppText variant="heading">Reviews</AppText>
                    </View>
                  </View>
                  <View className="bg-gray-100 rounded-full px-3 py-1">
                    <AppText variant="caption" className="font-semibold text-gray-600">
                      {reviewPages?.pages[0]?.total_count ?? 0} total
                    </AppText>
                  </View>
                </View>

                {/* Cards */}
                <View className="gap-4">
                  {allReviews.map((review) => (
                    <ReviewCard
                      key={review.review_id}
                      review={review}
                      onHelpful={() =>
                        toggleHelpful({ reviewId: review.review_id, marked: review.user_marked_helpful })
                      }
                      onReport={() => setReportTarget(review.review_id)}
                    />
                  ))}
                </View>

                {/* Load more */}
                {hasNextPage && (
                  <Pressable
                    onPress={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="flex-row items-center justify-center gap-2 bg-gray-50 rounded-2xl py-3.5 active:bg-gray-100"
                  >
                    {isFetchingNextPage ? (
                      <ActivityIndicator size="small" color="#16a34a" />
                    ) : (
                      <>
                        <Ionicons name="chevron-down" size={15} color="#16a34a" />
                        <AppText variant="caption" className="text-green-600 font-semibold">
                          Load more reviews
                        </AppText>
                      </>
                    )}
                  </Pressable>
                )}
              </View>
            </>
          )}

          <View style={{ height: insets.bottom + 8 }} />
        </View>
      </ScrollView>

      {/* ── Overlays ──────────────────────────────────────── */}
      <AppToast config={toastConfig} />

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
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
