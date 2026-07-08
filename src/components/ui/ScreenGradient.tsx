import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { SCREEN_GRADIENT } from '@/theme/glass';

// Full-bleed purple→violet app background. Absolutely positioned and behind
// screen content; pointerEvents="none" so it never intercepts touches.
//
// The gradient id MUST be unique per instance: during a navigation push two
// screens are mounted at once, and a shared SVG id makes `url(#id)` collide
// (notably on web), so a pushed screen can render nothing → white. `useId`
// gives each mount its own id; the solid backgroundColor is a fallback so the
// surface is never white even if the SVG fails to paint.
export function ScreenGradient() {
  const id = `appBg-${useId().replace(/:/g, '')}`;
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#8b5cf6' }]} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0.12" y2="1">
            {SCREEN_GRADIENT.map((s) => (
              <Stop key={s.offset} offset={s.offset} stopColor={s.color} />
            ))}
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
