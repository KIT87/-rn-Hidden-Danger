import { View, type ViewProps } from 'react-native';
import { AppText } from './AppText';

interface AppHeaderProps extends ViewProps {
  title: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

export function AppHeader({ title, left, right, className = '', ...props }: AppHeaderProps) {
  return (
    <View
      className={`flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-100 ${className}`}
      {...props}
    >
      <View className="w-10">{left}</View>
      <AppText variant="heading" className="flex-1 text-center">{title}</AppText>
      <View className="w-10 items-end">{right}</View>
    </View>
  );
}
