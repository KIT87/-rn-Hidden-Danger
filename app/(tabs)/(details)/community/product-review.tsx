import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppText, GlassHeader, ScreenGradient } from '@/components/ui';
import { AppToast, useToast } from '@/components/ui/AppToast';
import { StarRating } from '@/components/product/StarRating';
import { ReviewSheet } from '@/components/product/ReviewSheet';
import { GLASS } from '@/theme/glass';
import { useMyReviews } from '@/features/products/useMyReviews';
import type { MyReview } from '@/features/products/types';

export default function MyReviewsScreen() {
  const router = useRouter();
  const { toastConfig, showToast } = useToast();
  const [editingReview, setEditingReview] = useState<MyReview | null>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching,
  } = useMyReviews();

  const allReviews = data?.pages.flatMap((p) => p?.reviews ?? []) ?? [];

  const renderItem = useCallback(
    ({ item }: { item: MyReview }) => (
      <MyReviewCard
        review={item}
        onEdit={() => setEditingReview(item)}
        onProductPress={() => router.push(`/product/${item.product_id}`)}
      />
    ),
    [router],
  );

  return (
    <View className="flex-1">
      <ScreenGradient />
      <StatusBar style="light" />
      <GlassHeader title="My Reviews" onBack={() => router.back()} />

      <FlatList
        data={allReviews}
        keyExtractor={(item) => String(item.review_id)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, paddingTop: 4, gap: 12 }}
        showsVerticalScrollIndicator={false}
        refreshing={isRefetching}
        onRefresh={refetch}
        onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          isLoading ? (
            <View className="items-center justify-center py-20">
              <ActivityIndicator size="large" color="#ffffff" />
            </View>
          ) : (
            <View className="items-center justify-center gap-4 py-20">
              <View className="w-16 h-16 rounded-3xl items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.14)' }}>
                <Ionicons name="star-outline" size={32} color="#ffffff" />
              </View>
              <View className="items-center gap-1">
                <AppText variant="heading" className="text-white">No reviews yet</AppText>
                <AppText variant="body" className="text-white/60 text-center">
                  Write a review from any product page.
                </AppText>
              </View>
            </View>
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="py-4 items-center">
              <ActivityIndicator size="small" color="#ffffff" />
            </View>
          ) : null
        }
      />

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

// ─── Review card ──────────────────────────────────────────────────────────────

interface MyReviewCardProps {
  review: MyReview;
  onEdit: () => void;
  onProductPress: () => void;
}

function MyReviewCard({ review, onEdit, onProductPress }: MyReviewCardProps) {
  return (
    <View
      className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: GLASS.cardBg, borderWidth: 1, borderColor: review.hidden ? 'rgba(251,191,36,0.5)' : GLASS.cardBorder }}
    >
      {review.hidden && (
        <View className="flex-row items-center gap-1.5 px-4 py-2.5" style={{ backgroundColor: 'rgba(251,191,36,0.18)' }}>
          <Ionicons name="eye-off-outline" size={13} color="#fde68a" />
          <AppText variant="caption" className="font-medium" style={{ color: '#fde68a' }}>
            Under review — visible only to you
          </AppText>
        </View>
      )}

      {/* Product row */}
      <Pressable
        onPress={onProductPress}
        className="flex-row items-center gap-3 px-4 pt-4 pb-3 active:opacity-75"
      >
        {review.product_images?.[0] ? (
          <Image
            source={{ uri: review.product_images[0] }}
            style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.9)' }}
            resizeMode="contain"
          />
        ) : (
          <View className="w-11 h-11 rounded-lg items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
            <Ionicons name="cube-outline" size={20} color="#c4b5fd" />
          </View>
        )}
        <View className="flex-1">
          <AppText variant="label" className="text-white" numberOfLines={1}>{review.product_name ?? 'Product'}</AppText>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <StarRating score={review.overall_score} size={11} />
            <AppText variant="caption" className="text-white/55">
              {new Date(review.created_at).toLocaleDateString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric',
              })}
            </AppText>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.5)" />
      </Pressable>

      {/* Review preview */}
      <View className="px-4 pb-3">
        <AppText variant="body" className="text-white/90 italic" numberOfLines={3}>
          "{review.review_text}"
        </AppText>
      </View>

      {/* Footer */}
      <View className="flex-row items-center justify-between px-4 py-3" style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.10)' }}>
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="thumbs-up-outline" size={13} color="rgba(255,255,255,0.5)" />
          <AppText variant="caption" className="text-white/50">
            {review.helpful_count} {review.helpful_count === 1 ? 'person' : 'people'} found this helpful
          </AppText>
        </View>
        {!review.locked ? (
          <Pressable onPress={onEdit} className="flex-row items-center gap-1 active:opacity-70" hitSlop={8}>
            <Ionicons name="create-outline" size={14} color="#ffffff" />
            <AppText variant="caption" className="text-white font-semibold">Edit</AppText>
          </Pressable>
        ) : (
          <View className="flex-row items-center gap-1">
            <Ionicons name="lock-closed-outline" size={12} color="rgba(255,255,255,0.5)" />
            <AppText variant="caption" className="text-white/50">Locked</AppText>
          </View>
        )}
      </View>
    </View>
  );
}
