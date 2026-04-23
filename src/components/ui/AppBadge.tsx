import { View } from 'react-native';
import { AppText } from './AppText';

type BadgeVariant = 'safe' | 'caution' | 'danger' | 'default';

interface AppBadgeProps {
  label: string;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, { container: string; text: string }> = {
  safe:    { container: 'bg-green-100',  text: 'text-green-800' },
  caution: { container: 'bg-amber-100',  text: 'text-amber-800' },
  danger:  { container: 'bg-red-100',    text: 'text-red-700' },
  default: { container: 'bg-gray-100',   text: 'text-gray-700' },
};

export function AppBadge({ label, variant = 'default', className = '' }: AppBadgeProps) {
  const { container, text } = variantStyles[variant];
  return (
    <View className={`self-start rounded-full px-3 py-1 ${container} ${className}`}>
      <AppText variant="caption" className={`font-semibold ${text}`}>{label}</AppText>
    </View>
  );
}
