import { TextInput, View, type TextInputProps } from 'react-native';
import { AppText } from './AppText';

interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
  className?: string;
}

export function AppInput({ label, error, className = '', ...props }: AppInputProps) {
  return (
    <View className="gap-1">
      {label && <AppText variant="label">{label}</AppText>}
      <TextInput
        className={`rounded-xl border px-4 py-3.5 text-base text-gray-900 ${
          error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
        } ${className}`}
        placeholderTextColor="#9ca3af"
        {...props}
      />
      {error && <AppText variant="caption" className="text-red-500">{error}</AppText>}
    </View>
  );
}
