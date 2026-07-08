import { Image, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui';
import { StarRating } from './StarRating';
import { timeAgo } from '@/utils/time';
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
  { key: 'performance_score',        label: 'Performance' },
  { key: 'ease_of_use_score',        label: 'Ease of use' },
  { key: 'accuracy_of_claims_score', label: 'Accuracy of claims' },
  { key: 'value_for_money_score',    label: 'Value for money' },
  { key: 'packaging_score',          label: 'Packaging' },
] as const;

// Score → fill color for the sub-score bars.
function scoreColor(v: number) {
  if (v >= 4) return '#22c55e';
  if (v === 3) return '#f5a623';
  return '#ef4444';
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(1, value / 5));
  return (
    <View className="flex-row items-center gap-2.5">
      <AppText variant="caption" className="text-white/60" numberOfLines={1} style={{ width: 108 }}>
        {label}
      </AppText>
      <View className="flex-1 rounded-full overflow-hidden" style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.15)' }}>
        <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: 999, backgroundColor: scoreColor(value) }} />
      </View>
      <AppText variant="caption" className="text-white font-bold" style={{ width: 14, textAlign: 'right' }}>
        {value}
      </AppText>
    </View>
  );
}

export function ReviewCard({ review, onReport }: ReviewCardProps) {
  const nickname = review.user_nickname ?? 'Anonymous';
  const initial = nickname.charAt(0).toUpperCase();
  const color = avatarColor(nickname);

  return (
    <View
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: 'rgba(255,255,255,0.10)',
        borderWidth: 1,
        borderColor: review.hidden ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.18)',
      }}
    >
      {review.hidden && (
        <View className="flex-row items-center gap-1.5 px-4 py-2.5" style={{ backgroundColor: 'rgba(251,191,36,0.18)' }}>
          <Ionicons name="eye-off-outline" size={13} color="#fde68a" />
          <AppText variant="caption" className="font-medium" style={{ color: '#fde68a' }}>
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
              <AppText variant="label" className="text-white">{nickname}</AppText>
              {!review.user_is_owner && (
                <Pressable onPress={onReport} hitSlop={10} className="p-1 -mr-1">
                  <Ionicons name="flag-outline" size={13} color="rgba(255,255,255,0.4)" />
                </Pressable>
              )}
            </View>
            <AppText variant="caption" className="text-white/50">
              {USAGE_LABELS[review.usage_duration]}
            </AppText>
          </View>
          <View className="items-end gap-0.5 shrink-0">
            <StarRating score={review.overall_score} size={14} />
            <AppText variant="caption" className="text-white/50" style={{ fontSize: 11 }}>
              {timeAgo(review.created_at)}
            </AppText>
          </View>
        </View>

        {/* Buy again */}
        {review.buy_again === 'yes' && (
          <View className="flex-row items-center gap-2 flex-wrap">
            <View className="flex-row items-center gap-1 rounded-full px-2.5 py-1" style={{ backgroundColor: 'rgba(34,197,94,0.22)' }}>
              <Ionicons name="checkmark-circle" size={13} color="#4ade80" />
              <AppText variant="caption" style={{ color: '#4ade80', fontWeight: '700' }}>WOULD BUY AGAIN</AppText>
            </View>
            {review.advantages ? (
              <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
                <AppText variant="caption" className="text-white/70" numberOfLines={1}>{review.advantages}</AppText>
              </View>
            ) : null}
          </View>
        )}
        {review.buy_again === 'no' && (
          <View className="flex-row items-center gap-1 self-start rounded-full px-2.5 py-1" style={{ backgroundColor: 'rgba(239,68,68,0.22)' }}>
            <Ionicons name="close-circle" size={13} color="#f87171" />
            <AppText variant="caption" style={{ color: '#f87171', fontWeight: '700' }}>WOULD NOT BUY AGAIN</AppText>
          </View>
        )}
        {review.buy_again === 'not_sure' && (
          <View className="flex-row items-center gap-1 self-start rounded-full px-2.5 py-1" style={{ backgroundColor: 'rgba(245,166,35,0.22)' }}>
            <Ionicons name="help-circle" size={13} color="#fbbf24" />
            <AppText variant="caption" style={{ color: '#fbbf24', fontWeight: '700' }}>NOT SURE</AppText>
          </View>
        )}

        {/* Review text */}
        <View className="rounded-xl px-3.5 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
          <AppText variant="body" className="text-white/90 leading-relaxed italic">
            "{review.review_text}"
          </AppText>
        </View>

        {/* Photo thumbnail */}
        {review.image_url && (
          <Image
            source={{ uri: review.image_url }}
            style={{ width: 80, height: 80, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)' }}
            resizeMode="cover"
          />
        )}

        {/* Sub-scores as progress bars */}
        <View className="gap-2 pt-0.5">
          {DETAIL_SCORES.map(({ key, label }) => (
            <ScoreBar key={key} label={label} value={review[key] as number} />
          ))}
        </View>
      </View>
    </View>
  );
}
