import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppScreen, AppText } from '@/components/ui';
import { AppToast, useToast } from '@/components/ui/AppToast';
import { StarRating } from '@/components/product/StarRating';
import { ReviewSheet } from '@/components/product/ReviewSheet';
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
    <View style={{ flex: 1 }}>
      <AppScreen className="gap-0 px-0 py-0">
        <FlatList
          data={allReviews}
          keyExtractor={(item) => String(item.review_id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 24, gap: 12 }}
          showsVerticalScrollIndicator={false}
          refreshing={isRefetching}
          onRefresh={refetch}
          onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={
            <View className="flex-row items-center gap-3 mb-4">
              <Pressable onPress={() => router.back()} hitSlop={8}>
                <Ionicons name="arrow-back" size={22} color="#111827" />
              </Pressable>
              <AppText variant="heading">My Reviews</AppText>
            </View>
          }
          ListEmptyComponent={
            isLoading ? (
              <View className="items-center justify-center py-20">
                <ActivityIndicator size="large" color="#7c3aed" />
              </View>
            ) : (
              <View className="items-center justify-center gap-4 py-20">
                <View className="w-16 h-16 rounded-3xl bg-blue-50 items-center justify-center">
                  <Ionicons name="star-outline" size={32} color="#2563eb" />
                </View>
                <View className="items-center gap-1">
                  <AppText variant="heading">No reviews yet</AppText>
                  <AppText variant="body" className="text-gray-400 text-center">
                    Write a review from any product page.
                  </AppText>
                </View>
              </View>
            )
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color="#9ca3af" />
              </View>
            ) : null
          }
        />
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

// ─── Review card ──────────────────────────────────────────────────────────────

interface MyReviewCardProps {
  review: MyReview;
  onEdit: () => void;
  onProductPress: () => void;
}

function MyReviewCard({ review, onEdit, onProductPress }: MyReviewCardProps) {
  return (
    <View className={`bg-white rounded-2xl border overflow-hidden ${review.hidden ? 'border-amber-200' : 'border-gray-100'}`}>
      {review.hidden && (
        <View className="flex-row items-center gap-1.5 bg-amber-50 px-4 py-2.5">
          <Ionicons name="eye-off-outline" size={13} color="#d97706" />
          <AppText variant="caption" className="text-amber-700 font-medium">
            Under review — visible only to you
          </AppText>
        </View>
      )}

      {/* Product row */}
      <Pressable
        onPress={onProductPress}
        className="flex-row items-center gap-3 px-4 pt-4 pb-3 active:opacity-75"
      >
        {review.product_image_url ? (
          <Image
            source={{ uri: review.product_image_url }}
            style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: '#f9fafb' }}
            resizeMode="contain"
          />
        ) : (
          <View className="w-11 h-11 rounded-lg bg-gray-100 items-center justify-center">
            <Ionicons name="cube-outline" size={20} color="#d1d5db" />
          </View>
        )}
        <View className="flex-1">
          <AppText variant="label" numberOfLines={1}>{review.product_name ?? 'Product'}</AppText>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <StarRating score={review.overall_score} size={11} />
            <AppText variant="caption" className="text-gray-400">
              {new Date(review.created_at).toLocaleDateString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric',
              })}
            </AppText>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={14} color="#d1d5db" />
      </Pressable>

      {/* Review preview */}
      <View className="px-4 pb-3">
        <AppText variant="body" className="text-gray-700" numberOfLines={3}>
          {review.review_text}
        </AppText>
      </View>

      {/* Footer */}
      <View className="flex-row items-center justify-between px-4 py-3 border-t border-gray-50">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="thumbs-up-outline" size={13} color="#9ca3af" />
          <AppText variant="caption" className="text-gray-400">
            {review.helpful_count} {review.helpful_count === 1 ? 'person' : 'people'} found this helpful
          </AppText>
        </View>
        {!review.locked ? (
          <Pressable onPress={onEdit} className="flex-row items-center gap-1 active:opacity-70" hitSlop={8}>
            <Ionicons name="create-outline" size={14} color="#7c3aed" />
            <AppText variant="caption" style={{ color: '#7c3aed', fontWeight: '500' }}>Edit</AppText>
          </Pressable>
        ) : (
          <View className="flex-row items-center gap-1">
            <Ionicons name="lock-closed-outline" size={12} color="#9ca3af" />
            <AppText variant="caption" className="text-gray-400">Locked</AppText>
          </View>
        )}
      </View>
    </View>
  );
}
