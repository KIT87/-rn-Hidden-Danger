import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { AppInput, AppText, AppToast, ScreenGradient, useToast } from '@/components/ui';
import { GLASS } from '@/theme/glass';
import { storage } from '@/lib/storage/secure';
import { BarcodeScanner } from '@/components/scan/BarcodeScanner';
import { MAX_SUBMISSION_IMAGES, uploadSubmissionImage } from '@/features/submissions/uploadImage';
import { SUBMIT_MAX_POINTS } from '@/features/submissions/points';
import {
  useCreateSubmission,
  useFinalizeSubmission,
  useSubmitSubmissionBarcode,
  useSubmitSubmissionBrand,
  useSubmitSubmissionIngredients,
  useSubmitSubmissionName,
  useSubmitSubmissionProductImage,
} from '@/features/submissions/useSubmissions';
import type { CorrectionSubmitResponse } from '@/features/products/types';

// Linear wizard for products not yet in the catalog. Mirrors the report-wrong-data
// wizard's chrome and step styling, but every step posts to its own endpoint and
// only the ingredient label photos are mandatory (required to finalize).
type Step = 'intro' | 'barcode' | 'brand' | 'name' | 'ingredients' | 'product' | 'thanks';

const glassCard = {
  backgroundColor: GLASS.cardBg,
  borderWidth: 1,
  borderColor: GLASS.cardBorder,
  borderRadius: 20,
};

// Intro reward rows — mirrors the report intro's layout (icon + label left, pts right).
const REWARD_ROWS: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  pts: string;
}[] = [
  { icon: 'barcode-outline', label: 'Scan the barcode', pts: '+2 pts' },
  { icon: 'pricetag-outline', label: 'Add the brand', pts: '+2 pts' },
  { icon: 'text-outline', label: 'Add the product name', pts: '+2 pts' },
  { icon: 'flask-outline', label: 'Ingredient label photos', pts: 'up to 20' },
  { icon: 'cube-outline', label: 'Product photo', pts: '+3 pts' },
];

// Compact hero (frosted icon badge + eyebrow + headline + subtitle), reused as the
// header of each capture step for a consistent look.
function StepHero({
  icon,
  eyebrow,
  title,
  subtitle,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View className="items-center gap-4">
      <View
        className="w-16 h-16 rounded-3xl items-center justify-center"
        style={{ backgroundColor: GLASS.cardBgStrong, borderWidth: 1, borderColor: GLASS.cardBorder }}
      >
        <Ionicons name={icon} size={30} color="#ffffff" />
      </View>
      <View className="items-center gap-2">
        <Text style={{ fontSize: 11, letterSpacing: 2.5, color: 'rgba(255,255,255,0.5)', fontWeight: '700' }}>
          {eyebrow}
        </Text>
        <Text style={{ fontSize: 24, lineHeight: 28, fontWeight: '900', color: '#ffffff', textAlign: 'center' }}>
          {title}
        </Text>
        <AppText variant="body" className="text-white/70 text-center leading-relaxed">
          {subtitle}
        </AppText>
      </View>
    </View>
  );
}

export default function SubmitNewProductScreen() {
  // Optional barcode prefill when entered from a "product not found" screen.
  const { barcode: barcodeParam } = useLocalSearchParams<{ barcode?: string }>();
  const insets = useSafeAreaInsets();
  const { toastConfig, showToast } = useToast();

  const createSubmission = useCreateSubmission();
  const submitBarcode = useSubmitSubmissionBarcode();
  const submitBrand = useSubmitSubmissionBrand();
  const submitName = useSubmitSubmissionName();
  const submitIngredients = useSubmitSubmissionIngredients();
  const submitProductImage = useSubmitSubmissionProductImage();
  const finalize = useFinalizeSubmission();

  const [hideIntro, setHideIntro] = useState<boolean | null>(null); // null = loading
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [submissionId, setSubmissionId] = useState<number | null>(null);
  const [barcode, setBarcode] = useState(barcodeParam ?? '');
  const [barcodeDone, setBarcodeDone] = useState(false); // barcode posted (skip re-post)
  const [existingProductId, setExistingProductId] = useState<number | null>(null);
  const [brand, setBrand] = useState('');
  const [name, setName] = useState('');
  const [labelUrls, setLabelUrls] = useState<string[]>([]);
  const [productUrl, setProductUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<CorrectionSubmitResponse | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    storage.getHideSubmitIntro().then((v) => setHideIntro(v === 'true'));
  }, []);

  // Open (or resume) the caller's single draft as soon as the wizard mounts.
  useEffect(() => {
    createSubmission.mutateAsync().then((r) => { if (r) setSubmissionId(r.submission_id); }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const steps: Step[] = useMemo(() => {
    const s: Step[] = [];
    if (hideIntro === false) s.push('intro');
    s.push('barcode', 'brand', 'name', 'ingredients', 'product', 'thanks');
    return s;
  }, [hideIntro]);

  const step = steps[Math.min(stepIndex, steps.length - 1)];

  // Finalize when the thank-you step is reached; retryable on failure via runFinalize().
  function runFinalize() {
    if (submissionId == null || result || finalize.isPending) return;
    finalize
      .mutateAsync(submissionId)
      .then((r) => { if (r) setResult(r); })
      .catch(() => showToast('Could not submit your product. Please try again.'));
  }

  useEffect(() => {
    if (step === 'thanks') runFinalize();
  }, [step, submissionId]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (labelUrls.length >= MAX_SUBMISSION_IMAGES) {
      showToast(`You can add up to ${MAX_SUBMISSION_IMAGES} label photos.`);
      return;
    }
    const asset = await pickCamera();
    if (!asset) return;
    setUploading(true);
    try {
      const url = await uploadSubmissionImage(asset);
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
      setProductUrl(await uploadSubmissionImage(asset));
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
          if (dontShowAgain) await storage.setHideSubmitIntro(true);
          goNext();
          break;
        case 'barcode': {
          const value = barcode.trim();
          // Post once; skip if blank or already posted (e.g. after a duplicate warning).
          if (submissionId != null && value && !barcodeDone) {
            const res = await submitBarcode.mutateAsync({ submissionId, barcode: value });
            setBarcodeDone(true);
            if (res?.existing_product_id != null) {
              // Catalog collision — surface it and let the user decide, don't advance.
              setExistingProductId(res.existing_product_id);
              break;
            }
          }
          goNext();
          break;
        }
        case 'brand':
          if (submissionId != null && brand.trim()) await submitBrand.mutateAsync({ submissionId, value: brand.trim() });
          goNext();
          break;
        case 'name':
          if (submissionId != null && name.trim()) await submitName.mutateAsync({ submissionId, value: name.trim() });
          goNext();
          break;
        case 'ingredients':
          if (submissionId != null && labelUrls.length > 0) await submitIngredients.mutateAsync({ submissionId, labelUrls });
          goNext();
          break;
        case 'product':
          if (submissionId != null && productUrl) await submitProductImage.mutateAsync({ submissionId, url: productUrl });
          goNext();
          break;
      }
    } catch {
      showToast('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  // Editing the barcode after a duplicate warning re-arms the post + clears the notice.
  function onChangeBarcode(v: string) {
    setBarcode(v);
    if (barcodeDone) setBarcodeDone(false);
    if (existingProductId != null) setExistingProductId(null);
  }

  const canContinue = (() => {
    switch (step) {
      // Ingredient label photos are the only mandatory step.
      case 'ingredients': return labelUrls.length > 0 && !uploading;
      // Barcode / product photo are optional — you can continue with none, but not
      // while an upload is still in flight.
      case 'barcode':
      case 'product': return !uploading;
      default: return true;
    }
  })();

  // The barcode scanner takes over the whole screen while active.
  if (scanning) {
    return (
      <BarcodeScanner
        onScan={(code) => { onChangeBarcode(code); setScanning(false); }}
        onClose={() => setScanning(false)}
      />
    );
  }

  const isOptionalStep = step === 'barcode' || step === 'brand' || step === 'name' || step === 'product';

  return (
    <View className="flex-1">
      <ScreenGradient />
      <StatusBar style="light" />

      {/* Header + progress */}
      <View style={{ paddingTop: insets.top + 8 }}>
        <View className="flex-row items-center gap-3 px-4" style={{ height: 48 }}>
          <Pressable onPress={goBack} hitSlop={8} className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: GLASS.chipBg }}>
            <Ionicons name="chevron-back" size={20} color="#ffffff" />
          </Pressable>
          <AppText variant="label" className="flex-1 text-center text-white">Add a product</AppText>
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
      ) : (
        <>
          <ScrollView
            contentContainerStyle={
              step === 'intro' || step === 'product'
                ? { padding: 20, paddingBottom: 24, gap: 16, flexGrow: 1, justifyContent: 'center' }
                : { padding: 20, gap: 16, paddingBottom: 24 }
            }
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {step === 'intro' && (
              <View className="gap-7">
                {/* Hero */}
                <View className="items-center gap-4">
                  <View
                    className="w-20 h-20 rounded-3xl items-center justify-center"
                    style={{ backgroundColor: GLASS.cardBgStrong, borderWidth: 1, borderColor: GLASS.cardBorder }}
                  >
                    <Ionicons name="add-circle" size={38} color="#ffffff" />
                  </View>
                  <View className="items-center gap-2">
                    <Text style={{ fontSize: 11, letterSpacing: 2.5, color: 'rgba(255,255,255,0.5)', fontWeight: '700' }}>
                      HELP GROW THE CATALOG
                    </Text>
                    <Text style={{ fontSize: 30, lineHeight: 34, fontWeight: '900', color: '#ffffff', textAlign: 'center' }}>
                      Add a new product
                    </Text>
                    <AppText variant="body" className="text-white/70 text-center leading-relaxed">
                      Can't find a product? Add it and earn up to {SUBMIT_MAX_POINTS} points — your submission goes to our moderators and joins the catalog once it's verified.
                    </AppText>
                  </View>
                </View>

                {/* Rewards card */}
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
                      Pending points are credited once a moderator verifies your submission.
                    </AppText>
                  </View>
                </View>
              </View>
            )}

            {step === 'barcode' && (
              <View className="gap-7">
                <StepHero
                  icon="barcode-outline"
                  eyebrow="STEP 1 · BARCODE"
                  title="Scan the barcode"
                  subtitle="Scan or type the product's barcode so we can identify it accurately."
                />
                <View className="gap-3">
                  <Pressable
                    onPress={() => setScanning(true)}
                    className="flex-row items-center justify-center gap-2 rounded-2xl px-4 py-4 active:opacity-80"
                    style={{ backgroundColor: GLASS.cardBgStrong, borderWidth: 1, borderColor: GLASS.cardBorder }}
                  >
                    <Ionicons name="scan-outline" size={20} color="#ffffff" />
                    <AppText className="text-white/90 font-semibold">Scan with camera</AppText>
                  </Pressable>
                  <AppInput
                    tone="glass"
                    label="Or enter it manually"
                    value={barcode}
                    onChangeText={onChangeBarcode}
                    placeholder="e.g. 012044009285"
                    keyboardType="number-pad"
                  />
                  {existingProductId != null && (
                    <View
                      className="flex-row items-start gap-2.5 rounded-2xl px-4 py-3"
                      style={{ backgroundColor: 'rgba(251,191,36,0.18)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.4)' }}
                    >
                      <Ionicons name="information-circle" size={18} color="#fde68a" style={{ marginTop: 1 }} />
                      <View className="flex-1 gap-2">
                        <AppText variant="caption" style={{ color: '#fde68a' }}>
                          This barcode already matches a product in our catalog.
                        </AppText>
                        <Pressable onPress={() => router.replace(`/product/${existingProductId}` as never)} className="active:opacity-70">
                          <AppText variant="caption" className="font-semibold" style={{ color: '#fde68a' }}>
                            View that product →
                          </AppText>
                        </Pressable>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            )}

            {step === 'brand' && (
              <View className="gap-4">
                <AppText variant="heading" className="text-white">What's the brand?</AppText>
                <AppInput tone="glass" label="Brand name" value={brand} onChangeText={setBrand} placeholder="e.g. Acme Cosmetics" />
              </View>
            )}

            {step === 'name' && (
              <View className="gap-4">
                <AppText variant="heading" className="text-white">What's the product name?</AppText>
                <AppInput tone="glass" label="Product name" value={name} onChangeText={setName} placeholder="e.g. Hydrating Shampoo 500ml" />
              </View>
            )}

            {/* Ingredient label photos — the only mandatory step (≥1 required). */}
            {step === 'ingredients' && (
              <View className="gap-7">
                <StepHero
                  icon="camera"
                  eyebrow="INGREDIENT LABEL"
                  title="Snap the ingredient list"
                  subtitle="Add at least one clear, readable photo of the full ingredient label so a moderator can verify the product."
                />
                <View className="rounded-3xl p-4 gap-3" style={glassCard}>
                  <View className="flex-row items-center justify-between">
                    <AppText variant="label" className="text-white">Photos</AppText>
                    <AppText variant="caption" className="text-white/50">
                      {labelUrls.length}/{MAX_SUBMISSION_IMAGES}
                    </AppText>
                  </View>
                  <View className="flex-row flex-wrap gap-2 justify-center">
                    {labelUrls.map((url, i) => (
                      <View key={url} className="rounded-xl overflow-hidden" style={{ width: 84, height: 84 }}>
                        <Image source={{ uri: url }} style={{ width: 84, height: 84 }} />
                        <Pressable onPress={() => setLabelUrls((u) => u.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 2, right: 2, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name="close" size={14} color="#ffffff" />
                        </Pressable>
                      </View>
                    ))}
                    {labelUrls.length < MAX_SUBMISSION_IMAGES && (
                      <Pressable onPress={addLabelPhoto} disabled={uploading} className="items-center justify-center rounded-xl" style={{ width: 84, height: 84, backgroundColor: GLASS.cardBgStrong, borderWidth: 1, borderColor: GLASS.cardBorder }}>
                        {uploading ? <ActivityIndicator color="#ffffff" /> : <Ionicons name="camera-outline" size={24} color="#ffffff" />}
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* Product photo (optional) */}
            {step === 'product' && (
              <View className="gap-7">
                <StepHero
                  icon="cube-outline"
                  eyebrow="PRODUCT PHOTO · OPTIONAL"
                  title="Show us the product"
                  subtitle="A photo of the front of the pack helps a moderator match the ingredients to the right product."
                />
                <View className="items-center">
                  {productUrl ? (
                    <View className="rounded-3xl overflow-hidden" style={{ width: 160, height: 160 }}>
                      <Image source={{ uri: productUrl }} style={{ width: 160, height: 160 }} />
                      <Pressable onPress={() => setProductUrl(null)} style={{ position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="close" size={16} color="#ffffff" />
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable onPress={setProductPhoto} disabled={uploading} className="items-center justify-center rounded-3xl gap-2" style={{ width: 160, height: 160, backgroundColor: GLASS.cardBg, borderWidth: 1, borderColor: GLASS.cardBorder }}>
                      {uploading ? (
                        <ActivityIndicator color="#ffffff" />
                      ) : (
                        <>
                          <Ionicons name="camera-outline" size={30} color="#ffffff" />
                          <AppText variant="caption" className="text-white/70">Take photo</AppText>
                        </>
                      )}
                    </Pressable>
                  )}
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
                    <AppText
                      className="text-white"
                      style={{ fontSize: 40, lineHeight: 48, fontWeight: '900', textAlign: 'center', textAlignVertical: 'center', includeFontPadding: false }}
                    >
                      {result.points_awarded_total} pts
                    </AppText>
                    {result.points_pending_total > 0 && (
                      <AppText variant="caption" className="text-white/70 text-center">
                        +{result.points_pending_total} pending — credited once a moderator verifies your submission.
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
            {step === 'thanks' ? (
              <Pressable onPress={() => router.back()} className="items-center justify-center rounded-2xl py-4 active:opacity-80" style={{ backgroundColor: '#7c3aed' }}>
                <AppText className="text-white font-semibold">Done</AppText>
              </Pressable>
            ) : isOptionalStep ? (
              // Optional steps: secondary Skip next to the primary Continue.
              <View className="flex-row gap-3">
                <Pressable onPress={goNext} disabled={busy} className="items-center justify-center rounded-2xl py-4 px-6 active:opacity-80" style={{ backgroundColor: GLASS.cardBg, borderWidth: 1, borderColor: GLASS.cardBorder }}>
                  <AppText className="text-white/80 font-semibold">Skip</AppText>
                </Pressable>
                <Pressable onPress={handleContinue} disabled={!canContinue || busy} className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl py-4 active:opacity-80" style={{ backgroundColor: canContinue && !busy ? '#7c3aed' : 'rgba(124,58,237,0.4)' }}>
                  {busy ? <ActivityIndicator color="#ffffff" /> : <AppText className="text-white font-semibold">Continue</AppText>}
                </Pressable>
              </View>
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
