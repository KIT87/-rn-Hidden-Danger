import { ScrollView, View, type ScrollViewProps, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface AppScreenProps extends ViewProps {
  scroll?: boolean;
  className?: string;
  refreshControl?: ScrollViewProps['refreshControl'];
}

export function AppScreen({ scroll = false, className = '', children, refreshControl, ...props }: AppScreenProps) {
  const inner = scroll ? (
    <ScrollView
      className="flex-1"
      contentContainerClassName={`px-4 py-6 ${className}`}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
      {...props}
    >
      {children}
    </ScrollView>
  ) : (
    <View className={`flex-1 px-4 py-6 ${className}`} {...props}>
      {children}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {inner}
    </SafeAreaView>
  );
}
