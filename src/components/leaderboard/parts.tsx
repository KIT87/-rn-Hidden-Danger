import { Pressable, View } from 'react-native';
import { AppText } from '@/components/ui';
import type { LeaderboardEntry } from '@/features/products/types';

const AVATAR_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];

export function avatarColor(nickname: string) {
  const sum = (nickname || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

// Tinted rank badges for the podium places (1 gold · 2 silver · 3 blue).
const RANK_TINT: Record<number, { bg: string; fg: string }> = {
  1: { bg: '#fbbf24', fg: '#422006' },
  2: { bg: '#cbd5e1', fg: '#1e293b' },
  3: { bg: '#3b82f6', fg: '#ffffff' },
};

function Avatar({ size, nickname }: { size: number; nickname: string }) {
  const initial = (nickname || '?').charAt(0).toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: avatarColor(nickname), alignItems: 'center', justifyContent: 'center' }}>
      <AppText className="text-white font-bold" style={{ fontSize: Math.round(size * 0.42) }}>{initial}</AppText>
    </View>
  );
}

// A single ranked row: rank (or medal for the top 3) · avatar · nickname · points
// (right-aligned). The caller's own row (`you`) is rendered larger and highlighted.
export function LeaderRow({ entry, you, onPress }: { entry: LeaderboardEntry; you: boolean; onPress: () => void }) {
  const tint = RANK_TINT[entry.rank];
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-3 px-4 active:opacity-70 ${you ? 'py-4' : 'py-3'}`}
      style={you ? { backgroundColor: 'rgba(139,92,246,0.30)' } : undefined}
    >
      {/* Rank — tinted badge for the top 3 (gold/silver/blue), plain number otherwise */}
      <View style={{ minWidth: you ? 40 : 34, alignItems: 'center' }}>
        {tint ? (
          <View style={{ width: you ? 30 : 26, height: you ? 30 : 26, borderRadius: 999, backgroundColor: tint.bg, alignItems: 'center', justifyContent: 'center' }}>
            <AppText numberOfLines={1} style={{ color: tint.fg, fontWeight: '800', fontSize: you ? 14 : 12 }}>{entry.rank}</AppText>
          </View>
        ) : (
          <AppText className="text-white/50 font-bold" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: you ? 15 : 13, textAlign: 'center' }}>
            {entry.rank}
          </AppText>
        )}
      </View>

      <Avatar size={you ? 44 : 34} nickname={entry.nickname} />

      <View className="flex-1 flex-row items-center gap-2">
        <AppText className={`text-white ${you ? 'font-bold' : 'font-semibold'}`} numberOfLines={1} style={{ fontSize: you ? 17 : 15 }}>
          {entry.nickname}
        </AppText>
        {you && (
          <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: 'rgba(255,255,255,0.28)' }}>
            <AppText className="text-white font-bold" style={{ fontSize: 10 }}>You</AppText>
          </View>
        )}
      </View>

      {/* Points, right-aligned */}
      <View className="items-end shrink-0">
        <AppText className="text-white font-extrabold" numberOfLines={1} style={{ fontSize: you ? 19 : 15 }}>
          {entry.points_total.toLocaleString()}
        </AppText>
        <AppText className="text-white/50" style={{ fontSize: 10, letterSpacing: 0.5 }}>PTS</AppText>
      </View>
    </Pressable>
  );
}

function PodiumColumn({ entry, avatarSize, pedestalH, onPress }: {
  entry: LeaderboardEntry;
  avatarSize: number;
  pedestalH: number;
  onPress: () => void;
}) {
  const tint = RANK_TINT[entry.rank] ?? { bg: 'rgba(255,255,255,0.12)', fg: '#ffffff' };
  return (
    <Pressable onPress={onPress} className="items-center gap-2 active:opacity-70" style={{ width: 96 }}>
      <Avatar size={avatarSize} nickname={entry.nickname} />
      <View className="items-center w-full px-1">
        <AppText className="text-white font-bold w-full" numberOfLines={1} style={{ fontSize: 13, textAlign: 'center' }}>{entry.nickname}</AppText>
        <AppText variant="caption" className="text-white/55">{entry.points_total.toLocaleString()}</AppText>
      </View>
      {/* Colored pedestal with the position digit inside */}
      <View
        className="w-full items-center justify-center"
        style={{ height: pedestalH, backgroundColor: tint.bg, borderTopLeftRadius: 14, borderTopRightRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }}
      >
        <AppText style={{ color: tint.fg, fontWeight: '900', fontSize: 26 }}>{entry.rank}</AppText>
      </View>
    </Pressable>
  );
}

// Top-3 podium (2nd · 1st · 3rd), colored gold/silver/blue with the rank digit
// inside each pedestal. Renders nothing if fewer than 3 entries.
export function Podium({ top3, onUser }: { top3: LeaderboardEntry[]; onUser: (id: number) => void }) {
  const [first, second, third] = top3;
  if (!first || !second || !third) return null;
  return (
    <View className="flex-row items-end justify-center gap-4 pt-2">
      <PodiumColumn entry={second} avatarSize={58} pedestalH={48} onPress={() => onUser(second.user_id)} />
      <PodiumColumn entry={first} avatarSize={74} pedestalH={66} onPress={() => onUser(first.user_id)} />
      <PodiumColumn entry={third} avatarSize={52} pedestalH={34} onPress={() => onUser(third.user_id)} />
    </View>
  );
}
