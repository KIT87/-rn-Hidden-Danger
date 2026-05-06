import { ActivityIndicator, Image, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui';
import { timeAgo } from '@/utils/time';
import type { SearchHistoryItem } from '@/features/products/types';

interface SearchHistoryRowProps {
  item: SearchHistoryItem;
  loading?: boolean;
  onPress?: () => void;
}

export function SearchHistoryRow({ item, loading = false, onPress }: SearchHistoryRowProps) {
  const isEan = item.query_type === 'ean';

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 py-3 active:opacity-70"
    >
      <View className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center shrink-0">
        <Ionicons
          name={isEan ? 'barcode-outline' : 'search-outline'}
          size={16}
          color="#6b7280"
        />
      </View>

      <View className="flex-1 gap-0.5">
        <AppText variant="label" numberOfLines={1}>
          {item.product_name ?? item.query}
        </AppText>
        <AppText variant="caption" numberOfLines={1} className="text-gray-400">
          {item.product_name
            ? item.query
            : isEan ? 'EAN scan' : 'Name search'}
        </AppText>
      </View>

      {item.product_image_url ? (
        <Image
          source={{ uri: item.product_image_url }}
          style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#f9fafb' }}
          resizeMode="contain"
        />
      ) : null}

      {loading ? (
        <ActivityIndicator size="small" color="#16a34a" />
      ) : (
        <AppText variant="caption" className="text-gray-400 shrink-0">
          {timeAgo(item.searched_at)}
        </AppText>
      )}
    </Pressable>
  );
}
