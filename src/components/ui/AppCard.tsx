import { View, type ViewProps } from 'react-native';

interface AppCardProps extends ViewProps {
  className?: string;
}

export function AppCard({ className = '', children, ...props }: AppCardProps) {
  return (
    <View className={`rounded-2xl bg-white p-4 shadow-sm border border-gray-100 ${className}`} {...props}>
      {children}
    </View>
  );
}
