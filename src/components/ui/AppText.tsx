import { Text, type TextProps } from 'react-native';

interface AppTextProps extends TextProps {
  variant?: 'body' | 'label' | 'caption' | 'heading' | 'title';
  className?: string;
}

const variantClass: Record<NonNullable<AppTextProps['variant']>, string> = {
  title:   'text-3xl font-bold text-gray-900',
  heading: 'text-xl font-semibold text-gray-900',
  body:    'text-base text-gray-700',
  label:   'text-sm font-medium text-gray-800',
  caption: 'text-xs text-gray-500',
};

export function AppText({ variant = 'body', className = '', children, ...props }: AppTextProps) {
  return (
    <Text className={`${variantClass[variant]} ${className}`} {...props}>
      {children}
    </Text>
  );
}
