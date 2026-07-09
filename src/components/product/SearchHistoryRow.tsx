import { ActivityIndicator, Image, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui';
import { timeAgo } from '@/utils/time';
import type { SearchHistoryItem } from '@/features/products/types';

interface SearchHistoryRowProps {
  item: SearchHistoryItem;
  loading?: boolean;
  tone?: 'light' | 'glass';
  onPress?: () => void;
}

export function SearchHistoryRow({ item, loading = false, tone = 'light', onPress }: SearchHistoryRowProps) {
  const isEan = item.type === 'scan';
  const glass = tone === 'glass';

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 py-3 active:opacity-70"
    >
      <View
        className="w-9 h-9 rounded-full items-center justify-center shrink-0"
        style={{ backgroundColor: glass ? 'rgba(255,255,255,0.16)' : '#f3f4f6' }}
      >
        <Ionicons
          name={isEan ? 'barcode-outline' : 'search-outline'}
          size={16}
          color={glass ? 'rgba(255,255,255,0.85)' : '#6b7280'}
        />
      </View>

      <View className="flex-1 gap-0.5">
        <AppText variant="label" numberOfLines={1} className={glass ? 'text-white' : ''}>
          {item.product_name ?? item.query}
        </AppText>
        <AppText variant="caption" numberOfLines={1} className={glass ? 'text-white/55' : 'text-gray-400'}>
          {item.product_name
            ? item.query
            : isEan ? 'EAN scan' : 'Name search'}
        </AppText>
      </View>

      {item.product_image_url ? (
        <Image
          source={{ uri: item.product_image_url }}
          style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: glass ? '#ffffff' : '#f9fafb' }}
          resizeMode="contain"
        />
      ) : null}

      {loading ? (
        <ActivityIndicator size="small" color={glass ? '#ffffff' : '#7c3aed'} />
      ) : (
        <AppText variant="caption" className={`shrink-0 ${glass ? 'text-white/55' : 'text-gray-400'}`}>
          {timeAgo(item.searched_at)}
        </AppText>
      )}
    </Pressable>
  );
}
