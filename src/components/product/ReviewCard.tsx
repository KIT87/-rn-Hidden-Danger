import { Image, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui';
import { StarRating } from './StarRating';
import type { Review } from '@/features/products/types';

interface ReviewCardProps {
  review: Review;
  onHelpful: () => void;
  onReport: () => void;
}

const AVATAR_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];

function avatarColor(nickname: string | null) {
  const sum = (nickname ?? '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

const DETAIL_SCORES = [
  { key: 'performance_score',        label: 'Performance' },
  { key: 'ease_of_use_score',        label: 'Ease of Use' },
  { key: 'accuracy_of_claims_score', label: 'Accuracy' },
  { key: 'value_for_money_score',    label: 'Value' },
  { key: 'packaging_score',          label: 'Packaging' },
];

export function ReviewCard({ review, onHelpful, onReport }: ReviewCardProps) {
  const date = new Date(review.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
  const nickname = review.user_nickname ?? 'Anonymous';
  const initial = nickname.charAt(0).toUpperCase();
  const color = avatarColor(nickname);

  return (
    <View className={`rounded-2xl overflow-hidden ${review.hidden ? 'border border-amber-200' : 'border border-gray-100'}`}
      style={{ backgroundColor: '#fff' }}
    >
      {review.hidden && (
        <View className="flex-row items-center gap-1.5 bg-amber-50 px-4 py-2.5">
          <Ionicons name="eye-off-outline" size={13} color="#d97706" />
          <AppText variant="caption" className="text-amber-700 font-medium">
            Under review — visible only to you
          </AppText>
        </View>
      )}

      {/* Header */}
      <View className="flex-row items-start gap-3 px-4 pt-4 pb-3">
        {/* Avatar */}
        <View
          className="w-10 h-10 rounded-full items-center justify-center shrink-0"
          style={{ backgroundColor: color }}
        >
          <AppText variant="label" className="text-white font-bold">{initial}</AppText>
        </View>

        <View className="flex-1 gap-0.5">
          <View className="flex-row items-center justify-between">
            <AppText variant="label">{nickname}</AppText>
            {!review.user_is_owner && (
              <Pressable onPress={onReport} hitSlop={10} className="p-1 -mr-1">
                <Ionicons name="flag-outline" size={14} color="#d1d5db" />
              </Pressable>
            )}
          </View>
          <View className="flex-row items-center gap-2">
            <StarRating score={review.overall_score} size={14} />
            <AppText variant="caption" className="text-gray-400">{date}</AppText>
          </View>
        </View>
      </View>

      {/* Review text */}
      <View className="mx-4 mb-3 bg-gray-50 rounded-xl px-3.5 py-3">
        <AppText variant="body" className="text-gray-700 leading-relaxed italic">
          "{review.review_text}"
        </AppText>
      </View>

      {/* Pros / Cons */}
      {(review.advantages || review.disadvantages) && (
        <View className="mx-4 mb-3 gap-2">
          {review.advantages ? (
            <View className="flex-row items-start gap-2 bg-green-50 rounded-xl px-3 py-2.5">
              <Ionicons name="checkmark-circle" size={15} color="#16a34a" style={{ marginTop: 1 }} />
              <AppText variant="caption" className="text-green-800 flex-1 leading-relaxed">
                {review.advantages}
              </AppText>
            </View>
          ) : null}
          {review.disadvantages ? (
            <View className="flex-row items-start gap-2 bg-red-50 rounded-xl px-3 py-2.5">
              <Ionicons name="close-circle" size={15} color="#ef4444" style={{ marginTop: 1 }} />
              <AppText variant="caption" className="text-red-800 flex-1 leading-relaxed">
                {review.disadvantages}
              </AppText>
            </View>
          ) : null}
        </View>
      )}

      {/* Detailed scores */}
      <View className="mx-4 mb-3 gap-2">
        {DETAIL_SCORES.map(({ key, label }) => {
          const val = review[key as keyof Review] as number;
          const pct = (val / 5) * 100;
          const barColor = val >= 4 ? '#16a34a' : val >= 3 ? '#f59e0b' : '#ef4444';
          return (
            <View key={key} className="flex-row items-center gap-2">
              <AppText variant="caption" className="text-gray-400" style={{ width: 82 }}>{label}</AppText>
              <View className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <View
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: barColor }}
                />
              </View>
              <AppText variant="caption" className="font-semibold text-gray-600" style={{ width: 18, textAlign: 'right' }}>
                {val}
              </AppText>
            </View>
          );
        })}
      </View>

      {/* Review photo */}
      {review.image_url && (
        <Image
          source={{ uri: review.image_url }}
          style={{ marginHorizontal: 16, marginBottom: 12, height: 160, borderRadius: 12, backgroundColor: '#f9fafb' }}
          resizeMode="cover"
        />
      )}

      {/* Helpful footer */}
      {!review.user_is_owner && (
        <View
          className="flex-row items-center gap-3 px-4 py-3"
          style={{ borderTopWidth: 1, borderTopColor: '#f3f4f6' }}
        >
          <Pressable
            onPress={onHelpful}
            className={`flex-row items-center gap-1.5 rounded-full px-3 py-1.5 active:opacity-70 ${
              review.user_marked_helpful ? 'bg-green-100' : 'bg-gray-100'
            }`}
          >
            <Ionicons
              name={review.user_marked_helpful ? 'thumbs-up' : 'thumbs-up-outline'}
              size={13}
              color={review.user_marked_helpful ? '#16a34a' : '#6b7280'}
            />
            <AppText
              variant="caption"
              className={`font-semibold ${review.user_marked_helpful ? 'text-green-700' : 'text-gray-500'}`}
            >
              Helpful
            </AppText>
          </Pressable>
          {review.helpful_count > 0 && (
            <AppText variant="caption" className="text-gray-400 flex-1">
              {review.helpful_count} {review.helpful_count === 1 ? 'person' : 'people'} found this helpful
            </AppText>
          )}
        </View>
      )}
    </View>
  );
}
