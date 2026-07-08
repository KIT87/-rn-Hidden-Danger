import { KeyboardAvoidingView, Platform, ScrollView, View, type ScrollViewProps, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenGradient } from './ScreenGradient';

interface AppScreenProps extends ViewProps {
  scroll?: boolean;
  keyboardAware?: boolean;
  /** Render the purple→violet glass gradient behind the screen (transparent surfaces). */
  gradient?: boolean;
  className?: string;
  refreshControl?: ScrollViewProps['refreshControl'];
}

export function AppScreen({ scroll = false, keyboardAware = false, gradient = false, className = '', children, refreshControl, ...props }: AppScreenProps) {
  const inner = scroll ? (
    <ScrollView
      className="flex-1"
      contentContainerClassName={`px-4 py-6 ${className}`}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
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

  const body = keyboardAware ? (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {inner}
    </KeyboardAvoidingView>
  ) : (
    inner
  );

  if (gradient) {
    return (
      <View className="flex-1">
        <ScreenGradient />
        <SafeAreaView className="flex-1">{body}</SafeAreaView>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {body}
    </SafeAreaView>
  );
}
