import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { StarRating } from './StarRating';
import { useUpsertReview } from '@/features/products/useUpsertReview';
import { useDeleteReview } from '@/features/products/useDeleteReview';
import { productsApi } from '@/features/products/api';
import type {
  BuyAgain,
  PurchaseSource,
  Review,
  UsageAmount,
  UsageDuration,
  UpsertReviewPayload,
} from '@/features/products/types';

interface ReviewSheetProps {
  visible: boolean;
  productId: number;
  userReviewed?: boolean;
  initialReview?: Review;
  onClose: () => void;
  onSuccess?: () => void;
}

const emptyForm = (): UpsertReviewPayload => ({
  overall_score: 0,
  performance_score: 0,
  ease_of_use_score: 0,
  accuracy_of_claims_score: 0,
  value_for_money_score: 0,
  packaging_score: 0,
  review_text: '',
  advantages: '',
  disadvantages: '',
  buy_again: '' as BuyAgain,
  usage_amount: '' as UsageAmount,
  usage_duration: '' as UsageDuration,
  purchase_source: '' as PurchaseSource,
  image_url: null,
});

export function ReviewSheet({ visible, productId, userReviewed = false, initialReview, onClose, onSuccess }: ReviewSheetProps) {
  const [form, setForm] = useState<UpsertReviewPayload>(emptyForm());
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const { mutate: upsert, isPending: saving } = useUpsertReview(productId);
  const { mutate: deleteReview, isPending: deleting } = useDeleteReview(productId);

  useEffect(() => {
    if (!visible) return;
    setErrors([]);
    setDeleteConfirm(false);

    if (!userReviewed) {
      setExistingReview(null);
      setForm(emptyForm());
      return;
    }

    if (initialReview) {
      setExistingReview(initialReview);
      setForm({
        overall_score: initialReview.overall_score,
        performance_score: initialReview.performance_score,
        ease_of_use_score: initialReview.ease_of_use_score,
        accuracy_of_claims_score: initialReview.accuracy_of_claims_score,
        value_for_money_score: initialReview.value_for_money_score,
        packaging_score: initialReview.packaging_score,
        review_text: initialReview.review_text,
        advantages: initialReview.advantages,
        disadvantages: initialReview.disadvantages,
        buy_again: initialReview.buy_again,
        usage_amount: initialReview.usage_amount,
        usage_duration: initialReview.usage_duration,
        purchase_source: initialReview.purchase_source,
        image_url: initialReview.image_url,
      });
      return;
    }

    const loadExisting = async () => {
      setLoadingExisting(true);
      try {
        let found: Review | null = null;
        let page = 1;
        while (!found) {
          const res = await productsApi.productReviews(productId, page);
          if (!res) break;
          found = res.reviews.find((r) => r.user_is_owner) ?? null;
          if (found || page >= res.total_pages) break;
          page++;
        }
        setExistingReview(found);
        if (found) {
          setForm({
            overall_score: found.overall_score,
            performance_score: found.performance_score,
            ease_of_use_score: found.ease_of_use_score,
            accuracy_of_claims_score: found.accuracy_of_claims_score,
            value_for_money_score: found.value_for_money_score,
            packaging_score: found.packaging_score,
            review_text: found.review_text,
            advantages: found.advantages,
            disadvantages: found.disadvantages,
            buy_again: found.buy_again,
            usage_amount: found.usage_amount,
            usage_duration: found.usage_duration,
            purchase_source: found.purchase_source,
            image_url: found.image_url,
          });
        } else {
          setForm(emptyForm());
        }
      } finally {
        setLoadingExisting(false);
      }
    };

    loadExisting();
  }, [visible, productId]);

  function set<K extends keyof UpsertReviewPayload>(key: K, value: UpsertReviewPayload[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function pickImage() {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];

    setUploadingImage(true);
    try {
      const urlData = await productsApi.imageUploadUrl();
      if (!urlData) throw new Error('Failed to get upload URL');

      const blob = await fetch(asset.uri).then((r) => r.blob());
      const uploadRes = await fetch(urlData.upload_url, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': urlData.content_type },
      });

      if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`);

      set('image_url', urlData.public_url);
    } catch (err) {
      setErrors(['Failed to upload image. Please try again.']);
    } finally {
      setUploadingImage(false);
    }
  }

  function validate(): boolean {
    const errs: string[] = [];
    const scoreFields: (keyof UpsertReviewPayload)[] = [
      'overall_score', 'performance_score', 'ease_of_use_score',
      'accuracy_of_claims_score', 'value_for_money_score', 'packaging_score',
    ];
    if (scoreFields.some((k) => !form[k] || (form[k] as number) < 1)) {
      errs.push('Please rate all 6 score categories.');
    }
    if (!form.review_text.trim()) errs.push('Review text is required.');
    if (!form.advantages.trim()) errs.push('Advantages field is required.');
    if (!form.disadvantages.trim()) errs.push('Disadvantages field is required.');
    if (!form.buy_again) errs.push('Please answer "Would you buy this again?"');
    if (!form.usage_amount) errs.push('Please answer "How much have you used?"');
    if (!form.usage_duration) errs.push('Please answer "How long have you been using it?"');
    if (!form.purchase_source) errs.push('Please answer "Where did you get it?"');
    setErrors(errs);
    return errs.length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    upsert(form, {
      onSuccess: () => {
        onSuccess?.();
        onClose();
      },
    });
  }

  function handleDelete() {
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    deleteReview(undefined, {
      onSuccess: () => {
        onSuccess?.();
        onClose();
      },
    });
  }

  const locked = existingReview?.locked ?? false;
  const isEditing = !!existingReview;

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onClose} />
        <View style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' }}>
          {/* Handle */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb' }} />
          </View>

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 }}>
            <AppText variant="heading">{isEditing ? 'Edit Review' : 'Write a Review'}</AppText>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color="#6b7280" />
            </Pressable>
          </View>

          {loadingExisting ? (
            <View style={{ paddingVertical: 60, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#16a34a" />
            </View>
          ) : (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 24 }}
            >
              {locked && (
                <View style={{ flexDirection: 'row', gap: 8, backgroundColor: '#fffbeb', borderRadius: 12, padding: 12 }}>
                  <Ionicons name="lock-closed-outline" size={16} color="#d97706" />
                  <AppText variant="caption" className="text-amber-700 flex-1">
                    This review has received helpful votes or reports and can no longer be edited.
                  </AppText>
                </View>
              )}

              {/* Overall score */}
              <Section title="Overall Score" required>
                <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                  <StarRating
                    score={form.overall_score}
                    size={40}
                    onChange={locked ? undefined : (v) => set('overall_score', v)}
                  />
                  {form.overall_score > 0 && (
                    <AppText variant="caption" className="text-gray-400 mt-2">
                      {OVERALL_LABELS[form.overall_score - 1]}
                    </AppText>
                  )}
                </View>
              </Section>

              {/* Detailed scores */}
              <Section title="Detailed Scores" required>
                <View style={{ gap: 14 }}>
                  {DETAILED_SCORES.map(({ key, label }) => (
                    <View key={key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <AppText variant="label" className="text-gray-600">{label}</AppText>
                      <StarRating
                        score={form[key as keyof UpsertReviewPayload] as number}
                        size={22}
                        onChange={locked ? undefined : (v) => set(key as keyof UpsertReviewPayload, v as never)}
                      />
                    </View>
                  ))}
                </View>
              </Section>

              {/* Text fields */}
              <Section title="Review" required>
                <MultilineInput
                  value={form.review_text}
                  onChangeText={locked ? undefined : (v) => set('review_text', v)}
                  placeholder="Share your experience with this product..."
                  editable={!locked}
                />
              </Section>

              <Section title="Advantages" required>
                <MultilineInput
                  value={form.advantages}
                  onChangeText={locked ? undefined : (v) => set('advantages', v)}
                  placeholder="What did you like about it?"
                  editable={!locked}
                />
              </Section>

              <Section title="Disadvantages" required>
                <MultilineInput
                  value={form.disadvantages}
                  onChangeText={locked ? undefined : (v) => set('disadvantages', v)}
                  placeholder="What could be improved?"
                  editable={!locked}
                />
              </Section>

              {/* Poll */}
              <Section title="Would you buy this again?" required>
                <ChipGroup
                  options={BUY_AGAIN_OPTIONS}
                  value={form.buy_again}
                  onChange={locked ? undefined : (v) => set('buy_again', v as BuyAgain)}
                />
              </Section>

              <Section title="How much have you used?" required>
                <ChipGroup
                  options={USAGE_AMOUNT_OPTIONS}
                  value={form.usage_amount}
                  onChange={locked ? undefined : (v) => set('usage_amount', v as UsageAmount)}
                />
              </Section>

              <Section title="How long have you been using it?" required>
                <ChipGroup
                  options={USAGE_DURATION_OPTIONS}
                  value={form.usage_duration}
                  onChange={locked ? undefined : (v) => set('usage_duration', v as UsageDuration)}
                />
              </Section>

              <Section title="Where did you get it?" required>
                <ChipGroup
                  options={PURCHASE_SOURCE_OPTIONS}
                  value={form.purchase_source}
                  onChange={locked ? undefined : (v) => set('purchase_source', v as PurchaseSource)}
                />
              </Section>

              {/* Image */}
              <Section title="Photo" subtitle="optional">
                {form.image_url ? (
                  <View style={{ gap: 8 }}>
                    <Image
                      source={{ uri: form.image_url }}
                      style={{ width: '100%', height: 160, borderRadius: 12, backgroundColor: '#f9fafb' }}
                      resizeMode="cover"
                    />
                    {!locked && (
                      <Pressable onPress={() => set('image_url', null)} style={{ alignSelf: 'flex-start' }}>
                        <AppText variant="caption" className="text-red-500">Remove photo</AppText>
                      </Pressable>
                    )}
                  </View>
                ) : !locked ? (
                  <Pressable
                    onPress={pickImage}
                    disabled={uploadingImage}
                    style={{
                      borderWidth: 1.5,
                      borderColor: '#e5e7eb',
                      borderStyle: 'dashed',
                      borderRadius: 12,
                      paddingVertical: 20,
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {uploadingImage ? (
                      <ActivityIndicator size="small" color="#9ca3af" />
                    ) : (
                      <>
                        <Ionicons name="camera-outline" size={22} color="#9ca3af" />
                        <AppText variant="caption" className="text-gray-400">Take a photo</AppText>
                      </>
                    )}
                  </Pressable>
                ) : null}
              </Section>

              {/* Validation errors */}
              {errors.length > 0 && (
                <View style={{ backgroundColor: '#fef2f2', borderRadius: 12, padding: 12, gap: 4 }}>
                  {errors.map((e, i) => (
                    <AppText key={i} variant="caption" className="text-red-600">{e}</AppText>
                  ))}
                </View>
              )}

              {/* Actions */}
              {!locked && (
                <View style={{ gap: 10, paddingTop: 4 }}>
                  <AppButton
                    label={isEditing ? 'Update Review' : 'Submit Review'}
                    onPress={handleSubmit}
                    loading={saving}
                    disabled={uploadingImage}
                  />
                  {isEditing && (
                    <AppButton
                      label={deleteConfirm ? 'Tap again to confirm delete' : 'Delete Review'}
                      variant="secondary"
                      onPress={handleDelete}
                      loading={deleting}
                    />
                  )}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function Section({
  title,
  subtitle,
  required,
  children,
}: {
  title: string;
  subtitle?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <AppText variant="label">{title}</AppText>
        {required && <AppText variant="caption" className="text-red-400">*</AppText>}
        {subtitle && <AppText variant="caption" className="text-gray-400">{subtitle}</AppText>}
      </View>
      {children}
    </View>
  );
}

function MultilineInput({
  value,
  onChangeText,
  placeholder,
  editable = true,
}: {
  value: string;
  onChangeText?: (v: string) => void;
  placeholder?: string;
  editable?: boolean;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#9ca3af"
      multiline
      editable={editable}
      style={{
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        color: '#111827',
        minHeight: 80,
        textAlignVertical: 'top',
        backgroundColor: editable ? 'white' : '#f9fafb',
      }}
    />
  );
}

function ChipGroup({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange?: (v: string) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange?.(opt.value)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 100,
              borderWidth: 1.5,
              borderColor: selected ? '#16a34a' : '#e5e7eb',
              backgroundColor: selected ? '#f0fdf4' : 'white',
            }}
          >
            <AppText
              variant="caption"
              className={`font-medium ${selected ? 'text-green-700' : 'text-gray-600'}`}
            >
              {opt.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const OVERALL_LABELS = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

const DETAILED_SCORES = [
  { key: 'performance_score',        label: 'Performance' },
  { key: 'ease_of_use_score',        label: 'Ease of Use' },
  { key: 'accuracy_of_claims_score', label: 'Accuracy of Claims' },
  { key: 'value_for_money_score',    label: 'Value for Money' },
  { key: 'packaging_score',          label: 'Packaging' },
];

const BUY_AGAIN_OPTIONS: { label: string; value: BuyAgain }[] = [
  { label: 'Yes', value: 'yes' },
  { label: 'No', value: 'no' },
  { label: 'Not sure', value: 'not_sure' },
];

const USAGE_AMOUNT_OPTIONS: { label: string; value: UsageAmount }[] = [
  { label: 'First package', value: 'first_package' },
  { label: 'Finished one', value: 'finished_one' },
  { label: 'Finished multiple', value: 'finished_multiple' },
  { label: 'Sample (one use)', value: 'sample_one' },
  { label: 'Multiple samples', value: 'multiple_samples' },
];

const USAGE_DURATION_OPTIONS: { label: string; value: UsageDuration }[] = [
  { label: 'Sample (one use)', value: 'sample_one' },
  { label: '1 week', value: 'one_week' },
  { label: '2 weeks', value: 'two_weeks' },
  { label: '1 month', value: 'one_month' },
  { label: 'Several months', value: 'several_months' },
  { label: '1 year or more', value: 'one_year_plus' },
];

const PURCHASE_SOURCE_OPTIONS: { label: string; value: PurchaseSource }[] = [
  { label: 'Received from brand', value: 'brand_testing' },
  { label: 'Online store', value: 'online_store' },
  { label: 'Physical store', value: 'physical_store' },
  { label: 'Pharmacy', value: 'pharmacy' },
  { label: 'Marketplace', value: 'marketplace' },
  { label: 'Perfume store', value: 'perfume_store' },
  { label: 'Supermarket', value: 'supermarket' },
  { label: 'Received as gift', value: 'gift' },
];
