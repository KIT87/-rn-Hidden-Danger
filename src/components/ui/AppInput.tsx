import { TextInput, View, type TextInputProps } from 'react-native';
import { AppText } from './AppText';

interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
  /** 'glass' = translucent field with white text, for gradient screens. */
  tone?: 'light' | 'glass';
  className?: string;
}

export function AppInput({ label, error, tone = 'light', className = '', style, ...props }: AppInputProps) {
  const glass = tone === 'glass';
  return (
    <View className="gap-1">
      {label && <AppText variant="label" className={glass ? 'text-white/70' : ''}>{label}</AppText>}
      <TextInput
        className={`rounded-xl border px-4 py-3.5 text-base ${
          glass ? '' : error ? 'border-red-400 bg-red-50 text-gray-900' : 'border-gray-300 bg-white text-gray-900'
        } ${className}`}
        placeholderTextColor={glass ? 'rgba(255,255,255,0.45)' : '#9ca3af'}
        style={
          glass
            ? [
                {
                  color: '#ffffff',
                  borderColor: error ? 'rgba(248,113,113,0.6)' : 'rgba(255,255,255,0.22)',
                  backgroundColor: error ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.12)',
                },
                style,
              ]
            : style
        }
        {...props}
      />
      {error && (
        <AppText variant="caption" className={glass ? '' : 'text-red-500'} style={glass ? { color: '#fca5a5' } : undefined}>
          {error}
        </AppText>
      )}
    </View>
  );
}
