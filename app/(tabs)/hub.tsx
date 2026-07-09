import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppCard, AppScreen, AppText } from '@/components/ui';
import { AppToast, useToast } from '@/components/ui/AppToast';
import { RiskScore, SearchHistoryRow } from '@/components/product';
import { StarRating } from '@/components/product/StarRating';
import { ReviewSheet } from '@/components/product/ReviewSheet';
import { GLASS } from '@/theme/glass';
import { useAuth } from '@/features/auth/AuthContext';
import { useTopPicks } from '@/features/products/useTopPicks';
import { useMyReviews } from '@/features/products/useMyReviews';
import { useSearchHistory } from '@/features/products/useSearchHistory';
import { useLeaderboardMe, useProfile } from '@/features/products/useProfile';
import { LeaderRow } from '@/components/leaderboard/parts';
import type { MyReview, ProductSummary, UserProfile } from '@/features/products/types';

const INITIAL = 3;
const MAX = 10;

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type Tab = 'picks' | 'reviews' | 'leaderboard' | 'activity';

// Short labels so all four fit the segmented control; full names live in each
// tab's SectionHeading.
const TABS: { key: Tab; label: string }[] = [
  { key: 'picks', label: 'Picks' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'leaderboard', label: 'Leaderboard' },
  { key: 'activity', label: 'Activity' },
];

const glassCard = {
  backgroundColor: GLASS.cardBg,
  borderWidth: 1,
  borderColor: GLASS.cardBorder,
} as const;

// ─── Shared bits ────────────────────────────────────────────────────────────

function SectionHeading({ icon, iconColor, title, subtitle }: {
  icon: IconName;
  iconColor: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View className="gap-1">
      <View className="flex-row items-center gap-2.5">
        <View className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <AppText variant="title" className="text-white" style={{ fontSize: 22 }}>{title}</AppText>
      </View>
      <AppText variant="body" className="text-white/60">{subtitle}</AppText>
    </View>
  );
}

function Avatar({ size, color, initial }: { size: number; color: string; initial: string }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <AppText className="text-white font-bold" style={{ fontSize: Math.round(size * 0.42) }}>{initial}</AppText>
    </View>
  );
}

// ─── Header profile card ──────────────────────────────────────────────────────

function ProfileCard({ nickname, profile, onPress }: {
  nickname: string | null;
  profile: UserProfile | null | undefined;
  onPress: () => void;
}) {
  const name = nickname ?? profile?.nickname ?? null;
  const initial = (name ?? '?').charAt(0).toUpperCase();
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-2.5 rounded-2xl py-2 pl-2 pr-2.5 active:opacity-80 shrink"
      style={{ backgroundColor: GLASS.cardBg, borderWidth: 1, borderColor: GLASS.cardBorder, maxWidth: 210 }}
    >
      <Avatar size={40} color="#a78bfa" initial={initial} />
      <View className="gap-0.5 shrink">
        <AppText variant="label" className="text-white font-bold" numberOfLines={1}>
          {name ?? '—'}
        </AppText>
        <View className="flex-row items-center gap-1">
          <Ionicons name="trophy" size={12} color="#fbbf24" />
          <AppText variant="caption" style={{ color: '#fcd34d', fontWeight: '800' }}>
            {profile ? profile.points_total.toLocaleString() : '—'}
          </AppText>
          {profile ? (
            <AppText variant="caption" className="text-white/45">· #{profile.rank}</AppText>
          ) : null}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.6)" />
    </Pressable>
  );
}

// ─── My Top Picks ─────────────────────────────────────────────────────────────

function PickRow({ product, rank, onPress }: { product: ProductSummary; rank: number; onPress: () => void }) {
  const img = product.image_url ?? product.images?.[0];
  const avg = product.average_score !== null ? Number(product.average_score) : null;
  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-3 py-3.5 active:opacity-70">
      <View className="w-8 h-8 rounded-full items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.14)' }}>
        <AppText variant="caption" className="text-white/80 font-bold">#{rank}</AppText>
      </View>
      <View className="rounded-xl overflow-hidden shrink-0" style={{ width: 52, height: 52, backgroundColor: 'rgba(255,255,255,0.9)' }}>
        {img ? (
          <Image source={{ uri: img }} style={{ width: 52, height: 52 }} resizeMode="contain" />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="cube-outline" size={20} color="#c4b5fd" />
          </View>
        )}
      </View>
      <View className="flex-1 gap-0.5">
        <AppText variant="label" className="text-white" numberOfLines={1}>{product.name}</AppText>
        <AppText variant="caption" className="text-white/55" numberOfLines={1}>{product.brand_name}</AppText>
      </View>
      <View className="items-end gap-1 shrink-0">
        <View>
          <RiskScore riskScore={product.risk_score} size="sm" />
        </View>
        <View className="flex-row items-center gap-1">
          <StarRating score={avg !== null ? Math.round(avg) : 0} size={11} />
          {avg !== null && (
            <AppText variant="caption" style={{ color: '#fcd34d', fontWeight: '700' }}>{avg.toFixed(1)}</AppText>
          )}
        </View>
        <AppText variant="caption" className="text-white/45" style={{ fontSize: 11 }}>
          {product.reviews_count} {product.reviews_count === 1 ? 'review' : 'reviews'}
        </AppText>
      </View>
    </Pressable>
  );
}

function PicksTab({ onProduct }: { onProduct: (id: number) => void }) {
  const { data, isLoading } = useTopPicks();
  const picks = data?.picks ?? [];

  return (
    <View className="gap-4">
      <SectionHeading icon="star" iconColor="#fbbf24" title="My Top Picks" subtitle="Your curated list of favourite products" />

      {isLoading ? (
        <ActivityIndicator color="#ffffff" className="py-6" />
      ) : picks.length > 0 ? (
        <AppCard glass className="py-1">
          <View className="divide-y divide-white/10">
            {picks.map((product, i) => (
              <PickRow key={product.product_id} product={product} rank={i + 1} onPress={() => onProduct(product.product_id)} />
            ))}
          </View>
        </AppCard>
      ) : (
        <AppCard glass>
          <AppText variant="body" className="text-white/70">No picks yet.</AppText>
        </AppCard>
      )}

      {/* Instructions */}
      <View className="flex-row items-start gap-2.5 rounded-2xl px-4 py-3.5" style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: GLASS.cardBorder }}>
        <Ionicons name="information-circle-outline" size={18} color="rgba(255,255,255,0.7)" style={{ marginTop: 1 }} />
        <AppText variant="caption" className="text-white/70 flex-1 leading-relaxed">
          To add a product, search or scan it and mark it as a pick from the product page.
        </AppText>
      </View>
    </View>
  );
}

// ─── My Reviews ─────────────────────────────────────────────────────────────

function shortDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function MyReviewCard({ review, onEdit, onProduct }: { review: MyReview; onEdit: () => void; onProduct: () => void }) {
  return (
    <View className="rounded-2xl overflow-hidden" style={glassCard}>
      {review.hidden && (
        <View className="flex-row items-center gap-1.5 px-4 py-2.5" style={{ backgroundColor: 'rgba(251,191,36,0.18)' }}>
          <Ionicons name="eye-off-outline" size={13} color="#fde68a" />
          <AppText variant="caption" className="font-medium" style={{ color: '#fde68a' }}>
            Under review — visible only to you
          </AppText>
        </View>
      )}

      {/* Product header */}
      <Pressable onPress={onProduct} className="flex-row items-center gap-3 px-4 pt-4 pb-3 active:opacity-70">
        {review.product_images?.[0] ? (
          <Image source={{ uri: review.product_images[0] }} style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.9)' }} resizeMode="contain" />
        ) : null}
        <AppText variant="label" className="flex-1 text-white" numberOfLines={1}>{review.product_name ?? 'Product'}</AppText>
        <View className="flex-row items-center gap-1.5">
          <StarRating score={review.overall_score} size={13} />
          <AppText variant="caption" style={{ color: '#fcd34d', fontWeight: '700' }}>
            {review.overall_score.toFixed(1)}
          </AppText>
        </View>
      </Pressable>

      {/* Your review */}
      <View className="px-4 pb-4 pt-3" style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.10)' }}>
        <View className="flex-row items-center justify-between mb-1.5">
          <AppText variant="caption" className="text-white/55">Your review · {shortDate(review.created_at)}</AppText>
          {review.locked ? (
            <View className="flex-row items-center gap-1">
              <Ionicons name="lock-closed-outline" size={12} color="rgba(255,255,255,0.5)" />
              <AppText variant="caption" className="text-white/50">Locked</AppText>
            </View>
          ) : (
            <Pressable onPress={onEdit} hitSlop={8} className="flex-row items-center gap-1 active:opacity-60">
              <Ionicons name="create-outline" size={13} color="#ffffff" />
              <AppText variant="caption" className="text-white font-semibold">Edit</AppText>
            </Pressable>
          )}
        </View>
        <AppText variant="body" className="text-white/90 italic leading-relaxed" numberOfLines={4}>
          "{review.review_text}"
        </AppText>
      </View>
    </View>
  );
}

function ReviewsTab({ onProduct, onEdit }: { onProduct: (id: number) => void; onEdit: (r: MyReview) => void }) {
  const router = useRouter();
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useMyReviews();
  const reviews = data?.pages.flatMap((p) => p?.reviews ?? []) ?? [];

  return (
    <View className="gap-4">
      <SectionHeading icon="chatbubble-ellipses" iconColor="#ffffff" title="Product Reviews" subtitle="Share your experience with products" />

      {isLoading ? (
        <ActivityIndicator color="#ffffff" className="py-6" />
      ) : reviews.length > 0 ? (
        <View className="gap-3">
          {reviews.map((review) => (
            <MyReviewCard
              key={review.review_id}
              review={review}
              onEdit={() => onEdit(review)}
              onProduct={() => onProduct(review.product_id)}
            />
          ))}
          {hasNextPage && (
            <Pressable
              onPress={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="flex-row items-center justify-center gap-2 rounded-2xl py-3 active:opacity-80"
              style={{ backgroundColor: 'rgba(255,255,255,0.10)' }}
            >
              {isFetchingNextPage
                ? <ActivityIndicator size="small" color="#ffffff" />
                : <AppText variant="caption" className="text-white font-semibold">Load more</AppText>}
            </Pressable>
          )}
        </View>
      ) : (
        <AppCard glass>
          <AppText variant="body" className="text-white/70">No reviews yet.</AppText>
        </AppCard>
      )}

      {/* Write a new review → pick a product first */}
      <Pressable
        onPress={() => router.push('/search/name' as never)}
        className="flex-row items-center justify-center gap-2 rounded-2xl py-4 active:opacity-70"
        style={{ borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)', borderStyle: 'dashed' }}
      >
        <Ionicons name="add" size={16} color="rgba(255,255,255,0.85)" />
        <AppText variant="label" className="text-white/85 font-semibold">Write a new review</AppText>
      </Pressable>
    </View>
  );
}

// ─── Leaderboard (your position window) ───────────────────────────────────────

function LeaderboardTab({ onUser, onShowFull }: { onUser: (id: number) => void; onShowFull: () => void }) {
  const { data, isLoading } = useLeaderboardMe();
  const rows = data ?? [];

  return (
    <View className="gap-4">
      <SectionHeading icon="stats-chart" iconColor="#ffffff" title="Leaderboard" subtitle="Your position in the community" />

      {isLoading ? (
        <ActivityIndicator color="#ffffff" className="py-6" />
      ) : rows.length === 0 ? (
        <AppCard glass>
          <AppText variant="body" className="text-white/70">No leaderboard data yet.</AppText>
        </AppCard>
      ) : (
        <View className="rounded-3xl overflow-hidden" style={glassCard}>
          {rows.map((e, i) => (
            <View key={e.user_id}>
              {i > 0 && <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.10)' }} />}
              <LeaderRow entry={e} you={e.is_me} onPress={() => onUser(e.user_id)} />
            </View>
          ))}
        </View>
      )}

      {/* Full leaderboard */}
      <Pressable
        onPress={onShowFull}
        className="flex-row items-center justify-center gap-2 rounded-2xl py-3.5 active:opacity-80"
        style={{ backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: GLASS.cardBorder }}
      >
        <Ionicons name="podium-outline" size={16} color="#ffffff" />
        <AppText variant="label" className="text-white font-semibold">Show full leaderboard</AppText>
        <Ionicons name="chevron-forward" size={15} color="rgba(255,255,255,0.7)" />
      </Pressable>
    </View>
  );
}

// ─── Recent activity collapsibles (shared across tabs) ─────────────────────────

function CollapsibleHeader({ icon, title, open, loading, count, onToggle }: {
  icon: IconName;
  title: string;
  open: boolean;
  loading: boolean;
  count?: number;
  onToggle: () => void;
}) {
  return (
    <Pressable className="flex-row items-center justify-between" onPress={onToggle} hitSlop={8}>
      <View className="flex-row items-center gap-2">
        <Ionicons name={icon} size={16} color="rgba(255,255,255,0.85)" />
        <AppText variant="heading" className="text-white">{title}</AppText>
      </View>
      <View className="flex-row items-center gap-2">
        {count !== undefined && (
          <View className="rounded-full px-2.5 py-0.5 min-w-[24px] items-center" style={{ backgroundColor: GLASS.chipBg }}>
            <AppText variant="caption" className="text-white font-semibold">{count}</AppText>
          </View>
        )}
        {loading
          ? <ActivityIndicator size="small" color="#ffffff" />
          : <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="rgba(255,255,255,0.7)" />}
      </View>
    </Pressable>
  );
}

// ─── My Activity (recent searches & scans) ────────────────────────────────────

function ActivityTab() {
  const router = useRouter();
  const [nameOpen, setNameOpen] = useState(true); // recent searches expanded by default
  const [scanOpen, setScanOpen] = useState(false);
  const [moreSearches, setMoreSearches] = useState(false);
  const [moreScans, setMoreScans] = useState(false);
  const { data: searchHistory, isFetching: loadingSearches } = useSearchHistory('search', nameOpen);
  const { data: scanHistory, isFetching: loadingScans } = useSearchHistory('scan', scanOpen);

  const nameSearches = searchHistory ?? [];
  const eanScans = scanHistory ?? [];
  const visibleSearches = nameSearches.slice(0, moreSearches ? MAX : INITIAL);
  const visibleScans = eanScans.slice(0, moreScans ? MAX : INITIAL);

  return (
    <View className="gap-4">
      <SectionHeading icon="pulse" iconColor="#ffffff" title="My Activity" subtitle="Your recent searches and scans" />

      {/* Recent searches */}
      <AppCard glass>
        <CollapsibleHeader
          icon="time-outline"
          title="Recent searches"
          open={nameOpen}
          loading={nameOpen && loadingSearches}
          count={searchHistory ? nameSearches.length : undefined}
          onToggle={() => setNameOpen((v) => !v)}
        />
        {nameOpen && (
          <View className="mt-2">
            {!searchHistory ? (
              <ActivityIndicator color="#ffffff" className="py-4" />
            ) : nameSearches.length === 0 ? (
              <AppText variant="caption" className="text-white/50 py-3">No recent searches</AppText>
            ) : (
              <>
                <View className="divide-y divide-white/10">
                  {visibleSearches.map((item, i) => (
                    <SearchHistoryRow
                      key={i}
                      item={item}
                      tone="glass"
                      onPress={() => router.push(`/search/name?query=${encodeURIComponent(item.query)}` as never)}
                    />
                  ))}
                </View>
                {nameSearches.length > INITIAL && (
                  <Pressable onPress={() => setMoreSearches((v) => !v)} hitSlop={8} className="pt-2">
                    <AppText variant="caption" className="text-white/90 font-semibold">
                      {moreSearches ? 'Show less' : `${nameSearches.length - INITIAL} more`}
                    </AppText>
                  </Pressable>
                )}
              </>
            )}
          </View>
        )}
      </AppCard>

      {/* Recently scanned */}
      <AppCard glass>
        <CollapsibleHeader
          icon="barcode-outline"
          title="Recently scanned"
          open={scanOpen}
          loading={scanOpen && loadingScans}
          count={scanHistory ? eanScans.length : undefined}
          onToggle={() => setScanOpen((v) => !v)}
        />
        {scanOpen && (
          <View className="mt-2">
            {!scanHistory ? (
              <ActivityIndicator color="#ffffff" className="py-4" />
            ) : eanScans.length === 0 ? (
              <AppText variant="caption" className="text-white/50 py-3">No recent scans</AppText>
            ) : (
              <>
                <View className="divide-y divide-white/10">
                  {visibleScans.map((item, i) => (
                    <SearchHistoryRow
                      key={i}
                      item={item}
                      tone="glass"
                      onPress={() => router.push({ pathname: '/search/ean', params: { code: item.query } })}
                    />
                  ))}
                </View>
                {eanScans.length > INITIAL && (
                  <Pressable onPress={() => setMoreScans((v) => !v)} hitSlop={8} className="pt-2">
                    <AppText variant="caption" className="text-white/90 font-semibold">
                      {moreScans ? 'Show less' : `${eanScans.length - INITIAL} more`}
                    </AppText>
                  </Pressable>
                )}
              </>
            )}
          </View>
        )}
      </AppCard>
    </View>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function HubScreen() {
  const router = useRouter();
  const { toastConfig, showToast } = useToast();
  const { token, nickname } = useAuth();
  const { data: profile } = useProfile(!!token);
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>('picks');
  const [editingReview, setEditingReview] = useState<MyReview | null>(null);

  // Deep-link the active tab (e.g. "See all" from the Profile screen).
  useEffect(() => {
    if (params.tab === 'picks' || params.tab === 'reviews' || params.tab === 'leaderboard' || params.tab === 'activity') {
      setTab(params.tab);
    }
  }, [params.tab]);

  const goProduct = (id: number) => router.push(`/product/${id}` as never);
  const goUser = (id: number) => router.push(`/user/${id}` as never);

  return (
    <View className="flex-1">
    <AppScreen gradient scroll className="gap-5 pb-8 pt-2">
      <StatusBar style="light" />

      {/* Header + profile card */}
      <View className="flex-row items-center justify-between gap-3">
        <View className="gap-1 shrink">
          <AppText variant="title" className="text-white">The Hub</AppText>
          <AppText variant="body" className="text-white/70">Your community space</AppText>
        </View>
        <ProfileCard
          nickname={nickname}
          profile={profile}
          onPress={() => router.push('/(tabs)/profile' as never)}
        />
      </View>

      {/* Segmented tabs */}
      <View className="flex-row rounded-full p-1" style={{ backgroundColor: 'rgba(255,255,255,0.10)' }}>
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => setTab(t.key)}
            className="flex-1 items-center py-2.5 rounded-full"
            style={tab === t.key ? { backgroundColor: 'rgba(255,255,255,0.22)' } : undefined}
          >
            <AppText variant="caption" numberOfLines={1} className={`font-semibold ${tab === t.key ? 'text-white' : 'text-white/55'}`}>
              {t.label}
            </AppText>
          </Pressable>
        ))}
      </View>

      {/* Tab content */}
      {tab === 'picks' && <PicksTab onProduct={goProduct} />}
      {tab === 'reviews' && <ReviewsTab onProduct={goProduct} onEdit={setEditingReview} />}
      {tab === 'leaderboard' && (
        <LeaderboardTab onUser={goUser} onShowFull={() => router.push('/leaderboard' as never)} />
      )}
      {tab === 'activity' && <ActivityTab />}

    </AppScreen>

      {editingReview !== null && (
        <ReviewSheet
          visible
          productId={editingReview.product_id}
          userReviewed
          initialReview={editingReview}
          onClose={() => setEditingReview(null)}
          onSuccess={() => {
            showToast('Review updated!', 'success');
            setEditingReview(null);
          }}
        />
      )}

      <AppToast config={toastConfig} />
    </View>
  );
}
