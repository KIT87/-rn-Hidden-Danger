import { Image, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui';
import { StarRating } from './StarRating';
import type { Review, UsageDuration } from '@/features/products/types';

interface ReviewCardProps {
  review: Review;
  onReport: () => void;
}

const AVATAR_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];

function avatarColor(nickname: string | null) {
  const sum = (nickname ?? '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

const USAGE_LABELS: Record<UsageDuration, string> = {
  sample_one:       'Tried a sample',
  one_week:         'Used for one week',
  two_weeks:        'Used for two weeks',
  one_month:        'Used for one month',
  several_months:   'Used for several months',
  one_year_plus:    'Used for over a year',
};

const DETAIL_SCORES = [
  { key: 'performance_score',        label: 'Perf.' },
  { key: 'ease_of_use_score',        label: 'Use' },
  { key: 'accuracy_of_claims_score', label: 'Acc.' },
  { key: 'value_for_money_score',    label: 'Value' },
  { key: 'packaging_score',          label: 'Pack.' },
];

export function ReviewCard({ review, onReport }: ReviewCardProps) {
  const nickname = review.user_nickname ?? 'Anonymous';
  const initial = nickname.charAt(0).toUpperCase();
  const color = avatarColor(nickname);

  return (
    <View className={`rounded-2xl overflow-hidden ${review.hidden ? 'border border-amber-200' : 'border border-gray-100'}`}>
      {review.hidden && (
        <View className="flex-row items-center gap-1.5 bg-amber-50 px-4 py-2.5">
          <Ionicons name="eye-off-outline" size={13} color="#d97706" />
          <AppText variant="caption" className="text-amber-700 font-medium">
            Under review — visible only to you
          </AppText>
        </View>
      )}

      <View className="p-4 gap-3">
        {/* Avatar + name/duration + stars */}
        <View className="flex-row items-start gap-3">
          <View className="w-10 h-10 rounded-full items-center justify-center shrink-0" style={{ backgroundColor: color }}>
            <AppText variant="label" className="text-white font-bold">{initial}</AppText>
          </View>
          <View className="flex-1 gap-0.5">
            <View className="flex-row items-center justify-between">
              <AppText variant="label">{nickname}</AppText>
              {!review.user_is_owner && (
                <Pressable onPress={onReport} hitSlop={10} className="p-1 -mr-1">
                  <Ionicons name="flag-outline" size={13} color="#d1d5db" />
                </Pressable>
              )}
            </View>
            <AppText variant="caption" className="text-gray-400">
              {USAGE_LABELS[review.usage_duration]}
            </AppText>
          </View>
          <StarRating score={review.overall_score} size={14} />
        </View>

        {/* Review text */}
        <View className="bg-gray-50 rounded-xl px-3.5 py-3">
          <AppText variant="body" className="text-gray-700 leading-relaxed italic">
            "{review.review_text}"
          </AppText>
        </View>

        {/* Photo thumbnail */}
        {review.image_url && (
          <Image
            source={{ uri: review.image_url }}
            style={{ width: 80, height: 80, borderRadius: 10, backgroundColor: '#f9fafb' }}
            resizeMode="cover"
          />
        )}

        {/* Sub-scores */}
        <View className="flex-row justify-between">
          {DETAIL_SCORES.map(({ key, label }) => {
            const val = review[key as keyof Review] as number;
            return (
              <View key={key} className="items-center gap-0.5">
                <AppText variant="caption" className="text-gray-400" style={{ fontSize: 10 }}>
                  {label}
                </AppText>
                <View className="flex-row items-end gap-px">
                  <AppText variant="caption" className="font-bold text-gray-700">{val}</AppText>
                  <AppText variant="caption" className="text-gray-400" style={{ fontSize: 9, marginBottom: 0.5 }}>/5</AppText>
                </View>
              </View>
            );
          })}
        </View>

        {/* Would buy again */}
        {review.buy_again === 'yes' && (
          <View className="flex-row items-center gap-1.5 flex-wrap">
            <Ionicons name="checkmark-circle" size={15} color="#16a34a" />
            <AppText variant="caption" className="text-green-700 font-semibold">Would buy again</AppText>
            {review.advantages ? (
              <>
                <AppText variant="caption" className="text-gray-300">·</AppText>
                <AppText variant="caption" className="text-gray-500">{review.advantages}</AppText>
              </>
            ) : null}
          </View>
        )}
        {review.buy_again === 'no' && (
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="close-circle" size={15} color="#ef4444" />
            <AppText variant="caption" className="text-red-700 font-semibold">Would not buy again</AppText>
          </View>
        )}
        {review.buy_again === 'not_sure' && (
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="help-circle" size={15} color="#f59e0b" />
            <AppText variant="caption" className="text-amber-700 font-semibold">Not sure</AppText>
          </View>
        )}
      </View>
    </View>
  );
}
