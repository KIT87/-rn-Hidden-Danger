import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { AppCard, AppScreen, AppText } from '@/components/ui';
import { AppToast, useToast } from '@/components/ui/AppToast';
import { RiskScore, SearchHistoryRow } from '@/components/product';
import { StarRating } from '@/components/product/StarRating';
import { ReviewSheet } from '@/components/product/ReviewSheet';
import { GLASS } from '@/theme/glass';
import { authApi } from '@/features/auth/api';
import { useAuth } from '@/features/auth/AuthContext';
import { useTopPicks } from '@/features/products/useTopPicks';
import { useMyReviews } from '@/features/products/useMyReviews';
import { useSearchHistory } from '@/features/products/useSearchHistory';
import type { MyReview, ProductSummary } from '@/features/products/types';

const INITIAL = 3;
const MAX = 10;

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type Tab = 'picks' | 'reviews' | 'leaderboard';

const TABS: { key: Tab; label: string }[] = [
  { key: 'picks', label: 'My Top Picks' },
  { key: 'reviews', label: 'My Reviews' },
  { key: 'leaderboard', label: 'Leaderboard' },
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
        <RiskScore riskScore={product.risk_score} size="sm" />
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

// ─── Leaderboard (mocked) ─────────────────────────────────────────────────────

interface LeaderEntry {
  rank: number;
  name: string;
  initial: string;
  color: string;
  picks: number;
  reviews: number;
  medal?: string;
  you?: boolean;
}

const LEADERBOARD: LeaderEntry[] = [
  { rank: 1, name: 'glowqueen', initial: 'G', color: '#f59e0b', picks: 142, reviews: 38, medal: '🥇' },
  { rank: 2, name: 'skinnerds', initial: 'S', color: '#64748b', picks: 118, reviews: 51, medal: '🥈' },
  { rank: 3, name: 'kitios',    initial: 'K', color: '#f97316', picks: 97,  reviews: 29, medal: '🥉', you: true },
  { rank: 4, name: 'beautylab', initial: 'B', color: '#8b5cf6', picks: 84,  reviews: 44 },
  { rank: 5, name: 'pureglow',  initial: 'P', color: '#22c55e', picks: 73,  reviews: 21 },
];

function PodiumColumn({ entry, avatarSize, pedestalH }: { entry: LeaderEntry; avatarSize: number; pedestalH: number }) {
  return (
    <View className="items-center gap-2" style={{ width: 96 }}>
      <Avatar size={avatarSize} color={entry.color} initial={entry.initial} />
      <View className="items-center">
        <AppText variant="label" className="text-white font-bold" numberOfLines={1}>{entry.name}</AppText>
        <AppText variant="caption" className="text-white/55">{entry.picks} picks</AppText>
      </View>
      <View
        className="w-full items-center"
        style={{ height: pedestalH, backgroundColor: 'rgba(255,255,255,0.12)', borderTopLeftRadius: 14, borderTopRightRadius: 14, borderWidth: 1, borderColor: GLASS.cardBorder, paddingTop: 8 }}
      >
        <Text style={{ fontSize: 24 }}>{entry.medal}</Text>
      </View>
    </View>
  );
}

function LeaderboardTab() {
  const [first, second, third] = LEADERBOARD;
  return (
    <View className="gap-4">
      <SectionHeading icon="stats-chart" iconColor="#ffffff" title="Leaderboard" subtitle="See who's leading the community" />

      {/* Podium */}
      <View className="flex-row items-end justify-center gap-2 pt-2">
        <PodiumColumn entry={second} avatarSize={58} pedestalH={46} />
        <PodiumColumn entry={first} avatarSize={74} pedestalH={64} />
        <PodiumColumn entry={third} avatarSize={52} pedestalH={32} />
      </View>

      {/* Ranked list */}
      <View className="rounded-3xl overflow-hidden" style={glassCard}>
        {LEADERBOARD.map((e, i) => (
          <View key={e.rank}>
            {i > 0 && <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.10)' }} />}
            <View
              className="flex-row items-center gap-3 px-4 py-3"
              style={e.you ? { backgroundColor: 'rgba(255,255,255,0.10)' } : undefined}
            >
              <AppText variant="caption" className="text-white/50 font-semibold" style={{ width: 16, textAlign: 'center' }}>{e.rank}</AppText>
              <Avatar size={34} color={e.color} initial={e.initial} />
              <View className="flex-1 gap-0.5">
                <View className="flex-row items-center gap-2">
                  <AppText variant="label" className="text-white">{e.name}</AppText>
                  {e.you && (
                    <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}>
                      <AppText variant="caption" className="text-white font-bold" style={{ fontSize: 10 }}>You</AppText>
                    </View>
                  )}
                </View>
                <AppText variant="caption" className="text-white/55">{e.picks} picks · {e.reviews} reviews</AppText>
              </View>
              {e.medal ? <Text style={{ fontSize: 18 }}>{e.medal}</Text> : null}
            </View>
          </View>
        ))}
      </View>
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

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function HubScreen() {
  const router = useRouter();
  const { toastConfig, showToast } = useToast();
  const { signOut } = useAuth();
  const [tab, setTab] = useState<Tab>('picks');
  const [editingReview, setEditingReview] = useState<MyReview | null>(null);

  const { mutate: logout, isPending: signingOut } = useMutation({ mutationFn: () => authApi.logout() });
  function handleSignOut() {
    logout(undefined, {
      onSettled: async () => {
        await signOut();
        router.replace('/(auth)/login');
      },
    });
  }

  // Recent activity (shared across tabs)
  const [nameOpen, setNameOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [moreSearches, setMoreSearches] = useState(false);
  const [moreScans, setMoreScans] = useState(false);
  const historyEnabled = nameOpen || scanOpen;
  const { data: history, isFetching: loadingHistory } = useSearchHistory(historyEnabled);

  const nameSearches = history?.filter((h) => h.query_type === 'name') ?? [];
  const eanScans = history?.filter((h) => h.query_type === 'ean') ?? [];
  const visibleSearches = nameSearches.slice(0, moreSearches ? MAX : INITIAL);
  const visibleScans = eanScans.slice(0, moreScans ? MAX : INITIAL);

  const goProduct = (id: number) => router.push(`/product/${id}` as never);

  return (
    <View className="flex-1">
    <AppScreen gradient scroll className="gap-5 pb-8 pt-2">
      <StatusBar style="light" />

      {/* Header */}
      <View className="gap-1">
        <AppText variant="title" className="text-white">The Hub</AppText>
        <AppText variant="body" className="text-white/70">Your community space</AppText>
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
      {tab === 'leaderboard' && <LeaderboardTab />}

      {/* Recent searches */}
      <AppCard glass>
        <CollapsibleHeader
          icon="time-outline"
          title="Recent searches"
          open={nameOpen}
          loading={nameOpen && loadingHistory}
          count={history ? nameSearches.length : undefined}
          onToggle={() => setNameOpen((v) => !v)}
        />
        {nameOpen && (
          <View className="mt-2">
            {!history ? (
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
          loading={scanOpen && loadingHistory}
          count={history ? eanScans.length : undefined}
          onToggle={() => setScanOpen((v) => !v)}
        />
        {scanOpen && (
          <View className="mt-2">
            {!history ? (
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

      {/* Sign out */}
      <Pressable
        onPress={handleSignOut}
        disabled={signingOut}
        className="flex-row items-center justify-center gap-1.5 py-2 active:opacity-50"
      >
        <Ionicons name="log-out-outline" size={15} color="rgba(255,255,255,0.6)" />
        <AppText variant="caption" className="text-white/60">
          {signingOut ? 'Signing out…' : 'Sign out'}
        </AppText>
      </Pressable>
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
