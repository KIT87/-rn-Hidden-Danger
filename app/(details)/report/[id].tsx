import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { AppInput, AppText, AppToast, ScreenGradient, useToast } from '@/components/ui';
import { GLASS } from '@/theme/glass';
import { ApiError } from '@/api/client';
import { storage } from '@/lib/storage/secure';
import { BarcodeCaptureView } from '@/components/report/BarcodeCaptureView';
import { MAX_CORRECTION_IMAGES, uploadCorrectionImage } from '@/features/corrections/uploadImage';
import { useProduct } from '@/features/products/useProduct';
import {
  useCreateReport,
  useFinalizeReport,
  useSubmitBonus,
  useSubmitBrand,
  useSubmitIngredients,
  useSubmitName,
} from '@/features/corrections/useCorrections';
import type { CorrectionSubmitResponse, CorrectionType } from '@/features/products/types';

type Step = 'intro' | 'types' | 'brand' | 'name' | 'ingredients' | 'bonus' | 'thanks';

const TYPE_OPTIONS: {
  value: CorrectionType;
  label: string;
  hint: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  { value: 'brand', label: 'Brand', hint: 'The brand name is wrong', icon: 'pricetag-outline' },
  { value: 'product_name', label: 'Product name', hint: 'The product name is wrong', icon: 'text-outline' },
  { value: 'ingredients', label: 'Ingredients', hint: 'The ingredient list is wrong', icon: 'flask-outline' },
];

const glassCard = {
  backgroundColor: GLASS.cardBg,
  borderWidth: 1,
  borderColor: GLASS.cardBorder,
  borderRadius: 20,
};

// Intro reward rows — mirrors AppIntro's risk-category card layout (icon + label
// left, value right). Icons match the TYPE_OPTIONS shown on the next step.
const REWARD_ROWS: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  pts: string;
}[] = [
  { icon: 'pricetag-outline', label: 'Fix the brand name', pts: '+2 pts' },
  { icon: 'text-outline', label: 'Fix the product name', pts: '+2 pts' },
  { icon: 'flask-outline', label: 'Ingredients with photos', pts: 'up to 20' },
];

export default function ReportWrongDataScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = Number(id);
  const insets = useSafeAreaInsets();
  const { toastConfig, showToast } = useToast();

  // Cached from the product screen — shows the user which product they're fixing.
  const { data: product } = useProduct(productId);
  const heroImageUrl = product ? product.image_url ?? product.images[0] ?? null : null;

  const createReport = useCreateReport();
  const submitBrand = useSubmitBrand();
  const submitName = useSubmitName();
  const submitIngredients = useSubmitIngredients();
  const submitBonus = useSubmitBonus();
  const finalize = useFinalizeReport();

  const [hideIntro, setHideIntro] = useState<boolean | null>(null); // null = loading
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [types, setTypes] = useState<Set<CorrectionType>>(new Set());
  const [reportId, setReportId] = useState<number | null>(null);
  const [brand, setBrand] = useState('');
  const [name, setName] = useState('');
  const [labelUrls, setLabelUrls] = useState<string[]>([]);
  const [productUrl, setProductUrl] = useState<string | null>(null);
  const [barcode, setBarcode] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [alreadyReported, setAlreadyReported] = useState(false);
  const [result, setResult] = useState<CorrectionSubmitResponse | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    storage.getHideReportIntro().then((v) => setHideIntro(v === 'true'));
  }, []);

  // Ordered steps, derived from the chosen types. Bonus is offered only when the
  // ingredients step is NOT taken (they are mutually exclusive server-side).
  const steps: Step[] = useMemo(() => {
    const s: Step[] = [];
    if (hideIntro === false) s.push('intro');
    s.push('types');
    if (types.has('brand')) s.push('brand');
    if (types.has('product_name')) s.push('name');
    if (types.has('ingredients')) s.push('ingredients');
    else s.push('bonus');
    s.push('thanks');
    return s;
  }, [hideIntro, types]);

  const step = steps[Math.min(stepIndex, steps.length - 1)];

  // Finalize when the thank-you step is reached; retryable on failure via runFinalize().
  function runFinalize() {
    if (reportId == null || result || finalize.isPending) return;
    finalize
      .mutateAsync(reportId)
      .then((r) => { if (r) setResult(r); })
      .catch(() => showToast('Could not finalize your report. Please try again.'));
  }

  useEffect(() => {
    if (step === 'thanks') runFinalize();
  }, [step, reportId]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleType(t: CorrectionType) {
    setTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  function goNext() { setStepIndex((i) => i + 1); }
  function goBack() {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
    else router.back();
  }

  async function pickCamera() {
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (res.canceled || !res.assets[0]) return null;
    return res.assets[0];
  }

  async function addLabelPhoto() {
    if (labelUrls.length >= MAX_CORRECTION_IMAGES) {
      showToast(`You can add up to ${MAX_CORRECTION_IMAGES} label photos.`);
      return;
    }
    const asset = await pickCamera();
    if (!asset) return;
    setUploading(true);
    try {
      const url = await uploadCorrectionImage(asset);
      setLabelUrls((u) => [...u, url]);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function setProductPhoto() {
    const asset = await pickCamera();
    if (!asset) return;
    setUploading(true);
    try {
      setProductUrl(await uploadCorrectionImage(asset));
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleContinue() {
    setBusy(true);
    try {
      switch (step) {
        case 'intro':
          if (dontShowAgain) await storage.setHideReportIntro(true);
          goNext();
          break;
        case 'types': {
          const res = await createReport.mutateAsync({ productId, types: Array.from(types) });
          if (!res) {
            showToast('Something went wrong. Please try again.');
            break;
          }
          setReportId(res.report_id);
          goNext();
          break;
        }
        case 'brand':
          if (reportId != null) await submitBrand.mutateAsync({ reportId, value: brand.trim() });
          goNext();
          break;
        case 'name':
          if (reportId != null) await submitName.mutateAsync({ reportId, value: name.trim() });
          goNext();
          break;
        case 'ingredients':
          if (reportId != null) {
            await submitIngredients.mutateAsync({
              reportId,
              payload: {
                label_image_urls: labelUrls,
                product_image_url: productUrl ?? undefined,
                barcode: barcode ?? undefined,
              },
            });
          }
          goNext();
          break;
        case 'bonus':
          if (reportId != null) {
            await submitBonus.mutateAsync({
              reportId,
              payload: {
                label_image_urls: labelUrls,
                product_image_url: productUrl ?? undefined,
                barcode: barcode ?? undefined,
              },
            });
          }
          goNext();
          break;
      }
    } catch (e) {
      if (step === 'types' && e instanceof ApiError && e.status === 422) {
        setAlreadyReported(true);
      } else {
        showToast('Something went wrong. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  const canContinue = (() => {
    switch (step) {
      case 'types': return types.size > 0;
      case 'brand': return brand.trim().length > 0;
      case 'name': return name.trim().length > 0;
      case 'ingredients':
      case 'bonus': return labelUrls.length > 0 && !uploading;
      default: return true;
    }
  })();

  // The barcode scanner takes over the whole screen while active.
  if (scanning) {
    return (
      <BarcodeCaptureView
        onScanned={(code) => { setBarcode(code); setScanning(false); }}
        onClose={() => setScanning(false)}
      />
    );
  }

  return (
    <View className="flex-1">
      <ScreenGradient />
      <StatusBar style="light" />

      {/* Header + progress */}
      <View style={{ paddingTop: insets.top + 8 }}>
        <View className="flex-row items-center gap-3 px-4" style={{ height: 48 }}>
          {reportId == null ? (
            <Pressable onPress={goBack} hitSlop={8} className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: GLASS.chipBg }}>
              <Ionicons name="chevron-back" size={20} color="#ffffff" />
            </Pressable>
          ) : (
            <View style={{ width: 36 }} />
          )}
          <AppText variant="label" className="flex-1 text-center text-white">Report wrong data</AppText>
          <Pressable onPress={() => router.back()} hitSlop={8} className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: GLASS.chipBg }}>
            <Ionicons name="close" size={18} color="#ffffff" />
          </Pressable>
        </View>
        <View className="mx-4 mt-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}>
          <View style={{ height: '100%', width: `${((stepIndex + 1) / steps.length) * 100}%`, backgroundColor: '#c4b5fd' }} />
        </View>
      </View>

      {hideIntro === null ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      ) : alreadyReported ? (
        <View className="flex-1 items-center justify-center gap-4 px-8">
          <Ionicons name="checkmark-circle-outline" size={52} color="rgba(255,255,255,0.7)" />
          <AppText variant="body" className="text-white/80 text-center">
            You've already reported this product. Thanks for helping keep the data accurate.
          </AppText>
          <Pressable onPress={() => router.back()} className="rounded-2xl px-5 py-3" style={{ backgroundColor: '#7c3aed' }}>
            <AppText className="text-white font-semibold">Back to product</AppText>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={
              step === 'intro'
                ? { padding: 20, paddingBottom: 24, gap: 16, flexGrow: 1, justifyContent: 'center' }
                : { padding: 20, gap: 16, paddingBottom: 24 }
            }
            showsVerticalScrollIndicator={false}
          >
            {step === 'intro' && (
              <View className="gap-7">
                {/* Hero — frosted badge + eyebrow + wordmark, AppIntro style */}
                <View className="items-center gap-4">
                  <View
                    className="w-20 h-20 rounded-3xl items-center justify-center"
                    style={{ backgroundColor: GLASS.cardBgStrong, borderWidth: 1, borderColor: GLASS.cardBorder }}
                  >
                    <Ionicons name="construct" size={36} color="#ffffff" />
                  </View>
                  <View className="items-center gap-2">
                    <Text style={{ fontSize: 11, letterSpacing: 2.5, color: 'rgba(255,255,255,0.5)', fontWeight: '700' }}>
                      HELP US STAY ACCURATE
                    </Text>
                    <Text style={{ fontSize: 30, lineHeight: 34, fontWeight: '900', color: '#ffffff', textAlign: 'center' }}>
                      Help fix this product
                    </Text>
                    <AppText variant="body" className="text-white/70 text-center leading-relaxed">
                      Spotted something wrong? Report it and earn points — your report goes to our moderators and won't change the product until it's verified.
                    </AppText>
                  </View>
                </View>

                {/* Product being fixed */}
                {product && (
                  <View
                    className="flex-row items-center gap-3 rounded-2xl p-2.5 pr-4"
                    style={{ backgroundColor: GLASS.cardBg, borderWidth: 1, borderColor: GLASS.cardBorder }}
                  >
                    <View className="rounded-xl overflow-hidden items-center justify-center" style={{ width: 44, height: 44, backgroundColor: 'rgba(255,255,255,0.06)' }}>
                      {heroImageUrl ? (
                        <Image source={{ uri: heroImageUrl }} style={{ width: 44, height: 44 }} resizeMode="contain" />
                      ) : (
                        <Ionicons name="cube-outline" size={20} color="rgba(255,255,255,0.5)" />
                      )}
                    </View>
                    <View className="flex-1">
                      {product.brand_name ? (
                        <Text style={{ fontSize: 10, letterSpacing: 1.2, color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase' }} numberOfLines={1}>
                          {product.brand_name}
                        </Text>
                      ) : null}
                      <AppText variant="label" className="text-white" numberOfLines={2}>{product.name}</AppText>
                    </View>
                  </View>
                )}

                {/* Rewards card — mirrors the splash's risk-category card */}
                <View className="rounded-3xl p-5 gap-3.5" style={{ backgroundColor: GLASS.cardBg, borderWidth: 1, borderColor: GLASS.cardBorder }}>
                  <Text style={{ fontSize: 11, letterSpacing: 1.2, color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase' }}>
                    Earn points for
                  </Text>
                  {REWARD_ROWS.map((r) => (
                    <View key={r.label} className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2.5">
                        <Ionicons name={r.icon} size={17} color="#c4b5fd" />
                        <AppText variant="body" className="text-white/85">{r.label}</AppText>
                      </View>
                      <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 15 }}>{r.pts}</Text>
                    </View>
                  ))}
                  <View className="flex-row items-center gap-2 pt-2" style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.10)' }}>
                    <Ionicons name="shield-checkmark" size={13} color="rgba(255,255,255,0.55)" />
                    <AppText variant="caption" className="text-white/45 flex-1">
                      Pending points are credited once a moderator verifies your report.
                    </AppText>
                  </View>
                </View>
              </View>
            )}

            {step === 'types' && (
              <View className="gap-4">
                <AppText variant="heading" className="text-white">What's wrong?</AppText>
                <AppText variant="body" className="text-white/70">Select everything that needs fixing.</AppText>
                {TYPE_OPTIONS.map((opt) => {
                  const on = types.has(opt.value);
                  return (
                    <Pressable key={opt.value} onPress={() => toggleType(opt.value)} className="flex-row items-center gap-3 rounded-2xl p-4 active:opacity-80" style={{ backgroundColor: on ? GLASS.cardBgStrong : GLASS.cardBg, borderWidth: 1, borderColor: on ? '#c4b5fd' : GLASS.cardBorder }}>
                      <Ionicons name={opt.icon} size={22} color="#c4b5fd" />
                      <View className="flex-1">
                        <AppText variant="label" className="text-white">{opt.label}</AppText>
                        <AppText variant="caption" className="text-white/60">{opt.hint}</AppText>
                      </View>
                      <View className="w-6 h-6 rounded-md items-center justify-center" style={{ backgroundColor: on ? '#7c3aed' : 'transparent', borderWidth: 1, borderColor: GLASS.cardBorder }}>
                        {on && <Ionicons name="checkmark" size={16} color="#ffffff" />}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {step === 'brand' && (
              <View className="gap-4">
                <AppText variant="heading" className="text-white">Correct the brand</AppText>
                <AppInput tone="glass" label="Suggested brand name" value={brand} onChangeText={setBrand} placeholder="e.g. Acme Cosmetics" />
              </View>
            )}

            {step === 'name' && (
              <View className="gap-4">
                <AppText variant="heading" className="text-white">Correct the product name</AppText>
                <AppInput tone="glass" label="Suggested product name" value={name} onChangeText={setName} placeholder="e.g. Hydrating Shampoo 500ml" />
              </View>
            )}

            {(step === 'ingredients' || step === 'bonus') && (
              <View className="gap-5">
                <View className="gap-1">
                  <AppText variant="heading" className="text-white">
                    {step === 'ingredients' ? 'Report wrong ingredients' : 'Add supporting evidence'}
                  </AppText>
                  <AppText variant="body" className="text-white/70">
                    Add at least one clear photo of the ingredient label. A product photo and barcode are optional but help verification.
                  </AppText>
                </View>

                {/* Label photos (mandatory) */}
                <View className="gap-2">
                  <AppText variant="label" className="text-white">
                    Ingredient label photos * {labelUrls.length > 0 ? `(${labelUrls.length}/${MAX_CORRECTION_IMAGES})` : `(up to ${MAX_CORRECTION_IMAGES})`}
                  </AppText>
                  <View className="flex-row flex-wrap gap-2">
                    {labelUrls.map((url, i) => (
                      <View key={url} className="rounded-xl overflow-hidden" style={{ width: 84, height: 84 }}>
                        <Image source={{ uri: url }} style={{ width: 84, height: 84 }} />
                        <Pressable onPress={() => setLabelUrls((u) => u.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 2, right: 2, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name="close" size={14} color="#ffffff" />
                        </Pressable>
                      </View>
                    ))}
                    {labelUrls.length < MAX_CORRECTION_IMAGES && (
                      <Pressable onPress={addLabelPhoto} disabled={uploading} className="items-center justify-center rounded-xl" style={{ width: 84, height: 84, backgroundColor: GLASS.cardBg, borderWidth: 1, borderColor: GLASS.cardBorder }}>
                        {uploading ? <ActivityIndicator color="#ffffff" /> : <Ionicons name="camera-outline" size={24} color="#ffffff" />}
                      </Pressable>
                    )}
                  </View>
                </View>

                {/* Product photo (optional) */}
                <View className="gap-2">
                  <AppText variant="label" className="text-white">Product photo (optional)</AppText>
                  {productUrl ? (
                    <View className="rounded-xl overflow-hidden" style={{ width: 84, height: 84 }}>
                      <Image source={{ uri: productUrl }} style={{ width: 84, height: 84 }} />
                      <Pressable onPress={() => setProductUrl(null)} style={{ position: 'absolute', top: 2, right: 2, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="close" size={14} color="#ffffff" />
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable onPress={setProductPhoto} disabled={uploading} className="items-center justify-center rounded-xl" style={{ width: 84, height: 84, backgroundColor: GLASS.cardBg, borderWidth: 1, borderColor: GLASS.cardBorder }}>
                      <Ionicons name="camera-outline" size={24} color="#ffffff" />
                    </Pressable>
                  )}
                </View>

                {/* Barcode (optional) */}
                <View className="gap-2">
                  <AppText variant="label" className="text-white">Barcode (optional)</AppText>
                  <Pressable onPress={() => setScanning(true)} className="flex-row items-center gap-2 rounded-2xl px-4 py-3 active:opacity-80" style={{ backgroundColor: GLASS.cardBg, borderWidth: 1, borderColor: GLASS.cardBorder }}>
                    <Ionicons name="barcode-outline" size={18} color="#ffffff" />
                    <AppText className="text-white/90">{barcode ?? 'Scan barcode'}</AppText>
                  </Pressable>
                </View>
              </View>
            )}

            {step === 'thanks' && (
              <View className="items-center gap-4 pt-6">
                <Ionicons name="checkmark-circle" size={64} color="#c4b5fd" />
                <AppText variant="heading" className="text-white text-center">Thank you!</AppText>
                {finalize.isPending ? (
                  <ActivityIndicator color="#ffffff" />
                ) : result ? (
                  <View className="items-center gap-2">
                    <AppText variant="body" className="text-white/85 text-center">You earned</AppText>
                    <AppText className="text-white" style={{ fontSize: 40, fontWeight: '900' }}>{result.points_awarded_total} pts</AppText>
                    {result.points_pending_total > 0 && (
                      <AppText variant="caption" className="text-white/70 text-center">
                        +{result.points_pending_total} pending — credited once a moderator verifies your report.
                      </AppText>
                    )}
                  </View>
                ) : (
                  <Pressable onPress={runFinalize} className="rounded-2xl px-5 py-3" style={{ backgroundColor: '#7c3aed' }}>
                    <AppText className="text-white font-semibold">Try again</AppText>
                  </Pressable>
                )}
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 12, gap: 10 }}>
            {step === 'intro' && (
              <Pressable onPress={() => setDontShowAgain((v) => !v)} className="flex-row items-center gap-2 self-start active:opacity-70">
                <View className="w-5 h-5 rounded items-center justify-center" style={{ backgroundColor: dontShowAgain ? '#7c3aed' : 'transparent', borderWidth: 1, borderColor: GLASS.cardBorder }}>
                  {dontShowAgain && <Ionicons name="checkmark" size={13} color="#ffffff" />}
                </View>
                <AppText variant="caption" className="text-white/55">Don't show this again</AppText>
              </Pressable>
            )}
            {step === 'bonus' && (
              <Pressable onPress={goNext} className="items-center py-2 active:opacity-70">
                <AppText className="text-white/70">Skip this step</AppText>
              </Pressable>
            )}
            {step === 'thanks' ? (
              <Pressable onPress={() => router.back()} className="items-center justify-center rounded-2xl py-4 active:opacity-80" style={{ backgroundColor: '#7c3aed' }}>
                <AppText className="text-white font-semibold">Done</AppText>
              </Pressable>
            ) : (
              <Pressable onPress={handleContinue} disabled={!canContinue || busy} className="flex-row items-center justify-center gap-2 rounded-2xl py-4 active:opacity-80" style={{ backgroundColor: canContinue && !busy ? '#7c3aed' : 'rgba(124,58,237,0.4)' }}>
                {busy ? <ActivityIndicator color="#ffffff" /> : <AppText className="text-white font-semibold">Continue</AppText>}
              </Pressable>
            )}
          </View>
        </>
      )}

      <AppToast config={toastConfig} />
    </View>
  );
}
