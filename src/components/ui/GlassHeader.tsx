import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GLASS } from '@/theme/glass';
import { AppText } from './AppText';

interface GlassHeaderProps {
  title: string;
  /** Show a glass circular back button that calls this on press. */
  onBack?: () => void;
}

// Header for gradient/glass screens: a frosted circular back button + white title.
export function GlassHeader({ title, onBack }: GlassHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + 8 }} className="px-4 pb-3">
      <View className="flex-row items-center gap-3">
        {onBack && (
          <Pressable
            onPress={onBack}
            hitSlop={8}
            className="w-10 h-10 rounded-full items-center justify-center active:opacity-70"
            style={{ backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: GLASS.cardBorder }}
          >
            <Ionicons name="chevron-back" size={20} color="#ffffff" />
          </Pressable>
        )}
        <AppText variant="title" className="text-white" style={{ fontSize: 24 }} numberOfLines={1}>
          {title}
        </AppText>
      </View>
    </View>
  );
}
