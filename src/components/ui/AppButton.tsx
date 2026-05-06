import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';
import { AppText } from './AppText';

interface AppButtonProps extends PressableProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  className?: string;
}

const variantStyles: Record<NonNullable<AppButtonProps['variant']>, { button: string; text: string }> = {
  primary:   { button: 'bg-primary-600 active:bg-primary-700', text: 'text-white font-semibold' },
  secondary: { button: 'bg-gray-100 active:bg-gray-200 border border-gray-300', text: 'text-gray-800 font-semibold' },
  ghost:     { button: 'active:bg-gray-100', text: 'text-primary-600 font-semibold' },
};

export function AppButton({ label, variant = 'primary', loading = false, disabled, className = '', ...props }: AppButtonProps) {
  const { button, text } = variantStyles[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      className={`flex-row items-center justify-center rounded-xl px-5 py-3.5 ${button} ${isDisabled ? 'opacity-50' : ''} ${className}`}
      disabled={isDisabled}
      {...props}
    >
      {loading
        ? <ActivityIndicator size="small" color={variant === 'primary' ? '#fff' : '#7c3aed'} />
        : <AppText variant="label" className={text}>{label}</AppText>
      }
    </Pressable>
  );
}
