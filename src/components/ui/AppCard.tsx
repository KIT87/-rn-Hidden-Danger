import { View, type ViewProps } from 'react-native';
import { GLASS } from '@/theme/glass';

interface AppCardProps extends ViewProps {
  className?: string;
  /** Frosted translucent card for use over the gradient background. */
  glass?: boolean;
}

export function AppCard({ className = '', glass = false, style, children, ...props }: AppCardProps) {
  if (glass) {
    return (
      <View
        className={`rounded-2xl p-4 ${className}`}
        style={[{ backgroundColor: GLASS.cardBg, borderWidth: 1, borderColor: GLASS.cardBorder }, style]}
        {...props}
      >
        {children}
      </View>
    );
  }

  return (
    <View className={`rounded-2xl bg-white p-4 shadow-sm border border-gray-100 ${className}`} style={style} {...props}>
      {children}
    </View>
  );
}
