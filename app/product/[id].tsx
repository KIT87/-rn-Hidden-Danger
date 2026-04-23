import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppBadge, AppText } from '@/components/ui';
import { ScoreBadge } from '@/components/product';
import { useProduct } from '@/features/products/useProduct';
import type {
  ConcernLevel,
  Ingredient,
  ProductDetail,
} from '@/features/products/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getScoreInfo(score: number) {
  if (score <= 3) return { color: '#16a34a', label: 'Low Hazard' };
  if (score <= 6) return { color: '#f59e0b', label: 'Moderate Hazard' };
  return { color: '#ef4444', label: 'High Hazard' };
}

function concernVariant(level: ConcernLevel): 'safe' | 'caution' | 'danger' {
  if (level === 'LOW') return 'safe';
  if (level === 'MODERATE') return 'caution';
  return 'danger';
}

function formatDate(str: string) {
  return new Date(`${str}T00:00:00`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ─── Layout primitives ────────────────────────────────────────────────────────

function Divider() {
  return <View className="h-px bg-gray-100" />;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-3">
      <AppText variant="heading">{title}</AppText>
      {children}
    </View>
  );
}

// ─── Score ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const { color, label } = getScoreInfo(score);
  const tint = score <= 3 ? '#f0fdf4' : score <= 6 ? '#fffbeb' : '#fef2f2';
  return (
    <View style={{ backgroundColor: tint, borderRadius: 20, padding: 20 }}>
      <View className="flex-row items-center gap-6">
        <View style={[styles.ring, { borderColor: color }]}>
          <Text style={{ fontSize: 44, fontWeight: '900', color, lineHeight: 50 }}>{score}</Text>
          <Text style={{ fontSize: 11, color: '#9ca3af' }}>/ 10</Text>
        </View>
        <View className="flex-1 gap-1">
          <Text style={{ fontSize: 22, fontWeight: '800', color }}>{label}</Text>
          <Text style={{ fontSize: 13, color: '#6b7280' }}>Hazard Score</Text>
          <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
            Higher = more hazardous
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Concern card ─────────────────────────────────────────────────────────────

const CONCERN_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  cancer: 'ribbon-outline',
  dev_rep: 'body-outline',
  allergy: 'leaf-outline',
  use_res_level: 'lock-closed-outline',
};

const CONCERN_LABELS: Record<string, string> = {
  cancer: 'Cancer',
  dev_rep: 'Dev. & Reproductive',
  allergy: 'Allergies',
  use_res_level: 'Use Restrictions',
};

const VARIANT_COLORS = {
  safe: { bg: '#f0fdf4', icon: '#16a34a' },
  caution: { bg: '#fffbeb', icon: '#f59e0b' },
  danger: { bg: '#fef2f2', icon: '#ef4444' },
};

function ConcernCard({ field, level }: { field: string; level: ConcernLevel }) {
  const variant = concernVariant(level);
  const { bg, icon: iconColor } = VARIANT_COLORS[variant];
  return (
    <View className="flex-1 rounded-2xl p-3.5 gap-2.5" style={{ backgroundColor: bg }}>
      <Ionicons name={CONCERN_ICONS[field]} size={20} color={iconColor} />
      <AppText variant="caption" className="font-semibold text-gray-700">
        {CONCERN_LABELS[field]}
      </AppText>
      <AppBadge label={level} variant={variant} />
    </View>
  );
}

// ─── Concern tag group ────────────────────────────────────────────────────────

const TAG_STYLES = {
  high: { dot: '#ef4444', bg: 'bg-red-50', text: 'text-red-700', label: 'High' },
  moderate: { dot: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-700', label: 'Moderate' },
  low: { dot: '#16a34a', bg: 'bg-green-50', text: 'text-green-700', label: 'Low' },
};

function ConcernTagGroup({
  items,
  level,
}: {
  items: string[];
  level: 'high' | 'moderate' | 'low';
}) {
  if (items.length === 0) return null;
  const s = TAG_STYLES[level];
  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-1.5">
        <View className="w-2 h-2 rounded-full" style={{ backgroundColor: s.dot }} />
        <AppText variant="caption" className={`font-semibold ${s.text}`}>{s.label}</AppText>
      </View>
      <View className="flex-row flex-wrap gap-2">
        {items.map((item) => (
          <View key={item} className={`rounded-full px-2.5 py-1 ${s.bg}`}>
            <AppText variant="caption" className={s.text}>{item}</AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Ingredient row ───────────────────────────────────────────────────────────

const CONCERN_LEVEL_COLORS: Record<string, string> = {
  high: '#ef4444',
  moderate: '#f59e0b',
  low: '#16a34a',
};

function IngredientRow({ ingredient }: { ingredient: Ingredient }) {
  const [expanded, setExpanded] = useState(false);
  const hasConcerns = ingredient.concerns.length > 0;

  return (
    <Pressable
      onPress={() => hasConcerns && setExpanded((v) => !v)}
      className="py-3 gap-2"
    >
      <View className="flex-row items-center gap-2">
        <AppText variant="label" className="flex-1 capitalize" numberOfLines={expanded ? undefined : 1}>
          {ingredient.name.toLowerCase()}
        </AppText>
        <ScoreBadge score={ingredient.score} showLabel={false} />
        {hasConcerns && (
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={13}
            color="#9ca3af"
          />
        )}
      </View>

      {expanded && (
        <View className="gap-1.5 pl-0.5">
          {ingredient.concerns.map((c, i) => (
            <View key={i} className="flex-row items-center gap-2">
              <View
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: c.level ? CONCERN_LEVEL_COLORS[c.level] : '#d1d5db' }}
              />
              <AppText variant="caption" className="text-gray-600 flex-1">
                {c.concern_name}
              </AppText>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: product, isLoading, isError, refetch } = useProduct(Number(id));
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  if (isError || !product) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-gray-50 px-8">
        <Ionicons name="alert-circle-outline" size={52} color="#d1d5db" />
        <AppText variant="body" className="text-gray-400 text-center">
          Product not found
        </AppText>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <AppText variant="label" className="text-primary-600">Go back</AppText>
        </Pressable>
      </View>
    );
  }

  const imageUrl = product.mobile_image_url ?? product.image_url;
  const hasIngredients = product.ingredients.length > 0;
  const hasConcernDetails =
    product.concerns.other_high.length > 0 ||
    product.concerns.other_moderate.length > 0 ||
    product.concerns.other_low.length > 0;
  const hasAvoid = product.preference_flags.avoid.length > 0;
  const hasPrefer = product.preference_flags.prefer.length > 0;

  return (
    <ScrollView
      className="flex-1 bg-white"
      showsVerticalScrollIndicator={false}
      bounces={true}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" colors={['#16a34a']} />}
    >
      {/* ── Hero image ────────────────────────────────── */}
      <View style={{ height: 300, backgroundColor: '#f9fafb' }}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode="contain"
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="cube-outline" size={72} color="#e5e7eb" />
          </View>
        )}

        {/* Floating back button */}
        <Pressable
          onPress={() => router.back()}
          style={{ position: 'absolute', top: insets.top + 8, left: 16 }}
          className="w-10 h-10 rounded-full bg-white/85 items-center justify-center"
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </Pressable>

        {/* Score pill in image corner */}
        <View style={{ position: 'absolute', bottom: 20, right: 16 }}>
          <ScoreBadge score={product.score} />
        </View>
      </View>

      {/* ── Content card (overlaps image) ─────────────── */}
      <View className="bg-white rounded-t-3xl px-5 py-6 gap-6" style={{ marginTop: -24 }}>

        {/* Product identity */}
        <View className="gap-2">
          <AppText variant="title" className="leading-tight">{product.name}</AppText>
          <AppText variant="body" className="text-gray-500">
            {product.brand_name}
            {product.company_name !== product.brand_name
              ? ` · ${product.company_name}`
              : ''}
          </AppText>

          {product.categories.length > 0 && (
            <View className="flex-row flex-wrap gap-2 mt-1">
              {product.categories.map((cat) => (
                <View key={cat} className="bg-gray-100 rounded-full px-3 py-1">
                  <AppText variant="caption" className="text-gray-600 capitalize">{cat}</AppText>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Status badges */}
        {(product.minority_owned || product.old_product) && (
          <View className="flex-row flex-wrap gap-2">

            {product.minority_owned && (
              <View className="flex-row items-center gap-1.5 bg-purple-50 rounded-full px-3 py-1.5">
                <Ionicons name="heart" size={13} color="#9333ea" />
                <AppText variant="caption" className="text-purple-700 font-semibold">Minority Owned</AppText>
              </View>
            )}
            {product.old_product && (
              <View className="flex-row items-center gap-1.5 bg-amber-50 rounded-full px-3 py-1.5">
                <Ionicons name="time-outline" size={13} color="#d97706" />
                <AppText variant="caption" className="text-amber-700 font-semibold">Older data</AppText>
              </View>
            )}
          </View>
        )}

        <Divider />

        {/* ── Safety score ─────────────────────────────── */}
        <Section title="Safety Score">
          <ScoreRing score={product.score} />
          <AppText variant="caption" className="text-gray-400">
            Last updated {formatDate(product.last_updated)}
          </AppText>
        </Section>

        <Divider />

        {/* ── Key concerns 2×2 grid ─────────────────────── */}
        <Section title="Key Concerns">
          <View className="gap-3">
            <View className="flex-row gap-3">
              <ConcernCard field="cancer" level={product.concerns.cancer} />
              <ConcernCard field="dev_rep" level={product.concerns.dev_rep} />
            </View>
            <View className="flex-row gap-3">
              <ConcernCard field="allergy" level={product.concerns.allergy} />
              <ConcernCard field="use_res_level" level={product.concerns.use_res_level} />
            </View>
          </View>
        </Section>

        {/* ── Additional concern details ────────────────── */}
        {hasConcernDetails && (
          <>
            <Divider />
            <Section title="Concern Details">
              <View className="gap-4">
                <ConcernTagGroup items={product.concerns.other_high} level="high" />
                <ConcernTagGroup items={product.concerns.other_moderate} level="moderate" />
                <ConcernTagGroup items={product.concerns.other_low} level="low" />
              </View>
            </Section>
          </>
        )}

        {/* ── Ingredient flags ─────────────────────────── */}
        {(hasAvoid || hasPrefer) && (
          <>
            <Divider />
            <Section title="Ingredient Flags">
              {hasAvoid && (
                <View className="gap-2">
                  <View className="flex-row items-center gap-1.5">
                    <Ionicons name="close-circle" size={14} color="#ef4444" />
                    <AppText variant="caption" className="font-semibold text-red-600">Avoid</AppText>
                  </View>
                  {product.preference_flags.avoid.map((flag, i) => (
                    <View key={i} className="bg-red-50 rounded-xl px-3.5 py-3 gap-0.5">
                      <AppText variant="label" className="text-red-800">{flag.name}</AppText>
                      <AppText variant="caption" className="text-red-400">{flag.list_name}</AppText>
                    </View>
                  ))}
                </View>
              )}
              {hasPrefer && (
                <View className="gap-2">
                  <View className="flex-row items-center gap-1.5">
                    <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
                    <AppText variant="caption" className="font-semibold text-green-700">Preferred Ingredients</AppText>
                  </View>
                  {product.preference_flags.prefer.map((flag, i) => (
                    <View key={i} className="bg-green-50 rounded-xl px-3.5 py-3 gap-0.5">
                      <AppText variant="label" className="text-green-800">{flag.name}</AppText>
                      <AppText variant="caption" className="text-green-500">{flag.list_name}</AppText>
                    </View>
                  ))}
                </View>
              )}
            </Section>
          </>
        )}

        {/* ── Certifications ───────────────────────────── */}
        {product.certifications.length > 0 && (
          <>
            <Divider />
            <Section title="Certifications">
              {product.certifications.map((cert) => (
                <Pressable
                  key={cert.cert_id}
                  onPress={() => Linking.openURL(cert.website)}
                  className="flex-row gap-3 bg-gray-50 rounded-2xl p-3.5 active:opacity-75"
                >
                  <Image
                    source={{ uri: cert.logo_url }}
                    style={{ width: 48, height: 48 }}
                    resizeMode="contain"
                  />
                  <View className="flex-1 gap-1">
                    <AppText variant="label">{cert.name}</AppText>
                    <AppText variant="caption" className="text-gray-500 leading-relaxed" numberOfLines={4}>
                      {cert.description}
                    </AppText>
                  </View>
                  <Ionicons name="open-outline" size={14} color="#9ca3af" />
                </Pressable>
              ))}
            </Section>
          </>
        )}

        {/* ── Ingredients (structured) ─────────────────── */}
        {hasIngredients && (
          <>
            <Divider />
            <Section title={`Ingredients (${product.ingredients.length})`}>
              <AppText variant="caption" className="text-gray-400">
                Tap an ingredient to see its concerns
              </AppText>
              <View className="divide-y divide-gray-100">
                {[...product.ingredients]
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((ingredient) => (
                    <IngredientRow key={ingredient.ingred_id} ingredient={ingredient} />
                  ))}
              </View>
            </Section>
          </>
        )}

        {/* ── Ingredients (label text fallback) ────────── */}
        {!hasIngredients && product.label_ingredients && (
          <>
            <Divider />
            <Section title="Ingredients">
              <AppText variant="caption" className="text-gray-600 leading-relaxed">
                {product.label_ingredients}
              </AppText>
            </Section>
          </>
        )}

        {/* ── Label info ───────────────────────────────── */}
        {(product.label_warnings || product.label_directions) && (
          <>
            <Divider />
            <Section title="Label Information">
              {product.label_warnings && (
                <View className="gap-1.5 bg-amber-50 rounded-xl p-3.5">
                  <View className="flex-row items-center gap-1.5">
                    <Ionicons name="warning-outline" size={14} color="#d97706" />
                    <AppText variant="label" className="text-amber-700">Warnings</AppText>
                  </View>
                  <AppText variant="caption" className="text-amber-800 leading-relaxed">
                    {product.label_warnings}
                  </AppText>
                </View>
              )}
              {product.label_directions && (
                <View className="gap-1">
                  <AppText variant="label">Directions</AppText>
                  <AppText variant="caption" className="text-gray-600 leading-relaxed">
                    {product.label_directions}
                  </AppText>
                </View>
              )}
            </Section>
          </>
        )}

        {/* ── Where to buy ─────────────────────────────── */}
        {product.retailers.length > 0 && (
          <>
            <Divider />
            <Section title="Where to Buy">
              {product.retailers.map((retailer, i) => (
                <Pressable
                  key={i}
                  onPress={() => Linking.openURL(retailer.url)}
                  className="flex-row items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3.5 active:bg-gray-100"
                >
                  <Ionicons name="cart-outline" size={18} color="#374151" />
                  <AppText variant="label" className="flex-1">{retailer.name}</AppText>
                  <Ionicons name="open-outline" size={14} color="#9ca3af" />
                </Pressable>
              ))}
            </Section>
          </>
        )}


        <View style={{ height: insets.bottom + 8 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  ring: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
