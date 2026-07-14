import { ActivityIndicator, Image, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppCard, AppText } from '@/components/ui';
import { RiskScore } from '@/components/product';
import { StarRating } from '@/components/product/StarRating';
import { GLASS } from '@/theme/glass';
import { timeAgo } from '@/utils/time';
import type { ProductSummary, ProfileReviewSummary, UserProfile } from '@/features/products/types';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const glassCard = {
  backgroundColor: GLASS.cardBg,
  borderWidth: 1,
  borderColor: GLASS.cardBorder,
} as const;

// ─── Header pieces ────────────────────────────────────────────────────────────

export function AvatarLarge({ initial, showDot = false }: { initial: string; showDot?: boolean }) {
  return (
    <View style={{ width: 96, height: 96 }}>
      <View
        className="items-center justify-center"
        style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: '#a78bfa', borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)' }}
      >
        <AppText
          className="text-white font-bold"
          style={{ fontSize: 40, lineHeight: 48, textAlign: 'center', textAlignVertical: 'center', includeFontPadding: false }}
        >
          {initial}
        </AppText>
      </View>
      {showDot && (
        <View
          style={{ position: 'absolute', right: 4, bottom: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: '#22c55e', borderWidth: 3, borderColor: '#6d28d9' }}
        />
      )}
    </View>
  );
}

function StatPill({ icon, iconColor, tint, value, label }: {
  icon: IconName;
  iconColor: string;
  tint: { bg: string; border: string };
  value: string;
  label: string;
}) {
  return (
    <View
      className="flex-1 flex-row items-center gap-2 rounded-2xl px-3 py-2.5"
      style={{ backgroundColor: tint.bg, borderWidth: 1, borderColor: tint.border }}
    >
      <Ionicons name={icon} size={18} color={iconColor} />
      <View className="shrink">
        <AppText className="font-extrabold" numberOfLines={1} style={{ color: iconColor, fontSize: 15 }}>{value}</AppText>
        <AppText variant="caption" className="text-white/55" numberOfLines={1} style={{ fontSize: 11 }}>{label}</AppText>
      </View>
    </View>
  );
}

function StatCard({ icon, iconColor, value, label }: {
  icon: IconName;
  iconColor: string;
  value: string;
  label: string;
}) {
  return (
    <View className="flex-1 items-center gap-1 rounded-2xl px-1 py-4" style={glassCard}>
      <Ionicons name={icon} size={22} color={iconColor} />
      <AppText className="text-white font-extrabold" style={{ fontSize: 22 }} numberOfLines={1} adjustsFontSizeToFit>{value}</AppText>
      <AppText variant="caption" className="text-white/55" numberOfLines={1}>{label}</AppText>
    </View>
  );
}

function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  return (
    <View className="flex-row items-center justify-between">
      <AppText variant="heading" className="text-white" style={{ fontSize: 18 }}>{title}</AppText>
      {onSeeAll && (
        <Pressable onPress={onSeeAll} hitSlop={8} className="active:opacity-60">
          <AppText variant="caption" className="text-white/70 font-semibold">See all</AppText>
        </Pressable>
      )}
    </View>
  );
}

// ─── Preview cards ────────────────────────────────────────────────────────────

function PickPreviewCard({ product, onPress }: { product: ProductSummary; onPress: () => void }) {
  const img = product.image_url ?? product.images?.[0];
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-2xl p-3 active:opacity-70"
      style={glassCard}
    >
      <View className="rounded-xl overflow-hidden shrink-0" style={{ width: 56, height: 56, backgroundColor: 'rgba(255,255,255,0.9)' }}>
        {img ? (
          <Image source={{ uri: img }} style={{ width: 56, height: 56 }} resizeMode="contain" />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="cube-outline" size={22} color="#c4b5fd" />
          </View>
        )}
      </View>
      <View className="flex-1 gap-0.5">
        <AppText variant="label" className="text-white" numberOfLines={1}>{product.name}</AppText>
        <AppText variant="caption" className="text-white/55" numberOfLines={1}>{product.brand_name}</AppText>
      </View>
      <RiskScore riskScore={product.risk_score} size="sm" />
    </Pressable>
  );
}

function ReviewPreviewCard({ review, onPress }: { review: ProfileReviewSummary; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="rounded-2xl p-4 gap-2 active:opacity-70" style={glassCard}>
      <View className="flex-row items-start justify-between gap-2">
        <AppText variant="label" className="text-white flex-1" numberOfLines={1}>{review.product_name}</AppText>
        <AppText variant="caption" className="text-white/45">{timeAgo(review.created_at)}</AppText>
      </View>
      <StarRating score={Math.round(review.overall_score)} size={14} />
      <AppText variant="body" className="text-white/80 leading-relaxed" numberOfLines={3}>
        {review.review_text}
      </AppText>
    </Pressable>
  );
}

// ─── Body ─────────────────────────────────────────────────────────────────────
// Everything below the screen header: identity, gamification pills, activity
// stat cards, and the picked-products / reviews previews. Shared by the signed-in
// user's own profile and any other user's public profile.

export function ProfileBody({
  profile,
  name,
  showDot = false,
  picks,
  picksLoading,
  reviews,
  reviewsLoading,
  picksTitle,
  reviewsTitle,
  onProduct,
  onSeeAllPicks,
  onSeeAllReviews,
}: {
  profile: UserProfile | null | undefined;
  name: string | null;
  showDot?: boolean;
  picks: ProductSummary[];
  picksLoading: boolean;
  reviews: ProfileReviewSummary[];
  reviewsLoading: boolean;
  picksTitle: string;
  reviewsTitle: string;
  onProduct: (id: number) => void;
  onSeeAllPicks?: () => void;
  onSeeAllReviews?: () => void;
}) {
  const initial = (name ?? '?').charAt(0).toUpperCase();
  return (
    <>
      {/* Identity */}
      <View className="items-center gap-3 pt-1">
        <AvatarLarge initial={initial} showDot={showDot} />
        <AppText variant="title" className="text-white" style={{ fontSize: 26 }} numberOfLines={1}>
          {name ?? '—'}
        </AppText>
      </View>

      {/* Gamification pills */}
      <View className="flex-row gap-2.5">
        <StatPill
          icon="trophy" iconColor="#fbbf24"
          tint={{ bg: 'rgba(251,191,36,0.14)', border: 'rgba(251,191,36,0.35)' }}
          value={profile ? profile.points_total.toLocaleString() : '—'} label="points"
        />
        <StatPill
          icon="medal" iconColor="#cbd5e1"
          tint={{ bg: 'rgba(203,213,225,0.12)', border: 'rgba(203,213,225,0.30)' }}
          value={profile ? `#${profile.rank}` : '—'} label="leaderboard"
        />
        <StatPill
          icon="flame" iconColor="#fb923c"
          tint={{ bg: 'rgba(251,146,60,0.14)', border: 'rgba(251,146,60,0.35)' }}
          value={profile ? `${profile.current_streak}` : '—'} label="day streak"
        />
      </View>

      {/* Activity stat cards */}
      <View className="flex-row gap-2">
        <StatCard icon="camera" iconColor="#c4b5fd" value={profile ? `${profile.total_scans}` : '—'} label="Scans" />
        <StatCard icon="search" iconColor="#93c5fd" value={profile ? `${profile.total_searches}` : '—'} label="Searches" />
        <StatCard icon="brush" iconColor="#f0abfc" value={profile ? `${profile.total_reviews}` : '—'} label="Reviews" />
        <StatCard icon="star" iconColor="#fbbf24" value={profile ? `${profile.total_picks}` : '—'} label="Products" />
      </View>

      {/* Picked products */}
      <View className="gap-3">
        <SectionHeader title={picksTitle} onSeeAll={onSeeAllPicks} />
        {picksLoading ? (
          <ActivityIndicator color="#ffffff" className="py-4" />
        ) : picks.length > 0 ? (
          picks.map((p) => (
            <PickPreviewCard key={p.product_id} product={p} onPress={() => onProduct(p.product_id)} />
          ))
        ) : (
          <AppCard glass>
            <AppText variant="body" className="text-white/70">No picked products yet.</AppText>
          </AppCard>
        )}
      </View>

      {/* Reviews */}
      <View className="gap-3">
        <SectionHeader title={reviewsTitle} onSeeAll={onSeeAllReviews} />
        {reviewsLoading ? (
          <ActivityIndicator color="#ffffff" className="py-4" />
        ) : reviews.length > 0 ? (
          reviews.map((r) => (
            <ReviewPreviewCard key={r.review_id} review={r} onPress={() => onProduct(r.product_id)} />
          ))
        ) : (
          <AppCard glass>
            <AppText variant="body" className="text-white/70">No reviews yet.</AppText>
          </AppCard>
        )}
      </View>
    </>
  );
}
