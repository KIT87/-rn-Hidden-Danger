import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui';
import { GLASS } from '@/theme/glass';
import { SUBMIT_MAX_POINTS } from '@/features/submissions/points';

// CTA shown on "product not found" screens — launches the submit-new-product
// wizard, prefilling the barcode the user just tried when there is one.
export function AddProductButton({ barcode }: { barcode?: string }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/submit', params: barcode ? { barcode } : {} } as never)}
      className="rounded-2xl p-4 gap-1 active:opacity-80"
      style={{ backgroundColor: GLASS.cardBg, borderWidth: 1, borderColor: GLASS.cardBorder }}
    >
      <View className="flex-row items-center justify-center gap-2">
        <Ionicons name="add-circle-outline" size={20} color="#c4b5fd" />
        <AppText variant="label" className="text-white" style={{ fontWeight: '700', fontSize: 15 }}>
          Add this product
        </AppText>
      </View>
      <AppText variant="caption" className="text-white/60 text-center">
        Not in our catalog? Add it and earn up to {SUBMIT_MAX_POINTS} points
      </AppText>
    </Pressable>
  );
}
