import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { BarcodeScanningResult } from 'expo-camera';
import { AppText, GlassHeader, ScreenGradient } from '@/components/ui';
import { GLASS } from '@/theme/glass';
import { productsApi } from '@/features/products/api';
import { useRecordActivity } from '@/features/gamification/useActivity';
import { findExactGtinMatch } from '@/features/products/searchMapper';

const { width: SCREEN_W } = Dimensions.get('window');
const VF = Math.min(SCREEN_W - 72, 300);
const BARCODE_BARS = [4, 7, 3, 5, 9, 3, 4, 7, 3, 6, 4, 8, 3, 5, 6];

// Frosted glass viewfinder graphic (landing only — not the live camera).
function Viewfinder() {
  return (
    <View style={{ width: VF, height: VF }}>
      <View
        style={{
          ...StyleSheet.absoluteFillObject,
          borderRadius: 28,
          backgroundColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.18)',
        }}
      />
      {/* Corner brackets */}
      <View style={[vf.corner, { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 24 }]} />
      <View style={[vf.corner, { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 24 }]} />
      <View style={[vf.corner, { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 24 }]} />
      <View style={[vf.corner, { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 24 }]} />

      {/* Faint barcode */}
      <View className="flex-1 items-center justify-center">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, opacity: 0.5 }}>
          {BARCODE_BARS.map((w, i) => (
            <View key={i} style={{ width: w, height: 72, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 2 }} />
          ))}
        </View>
      </View>

      {/* Scan line */}
      <View style={{ position: 'absolute', top: VF / 2 - 1, left: 26, right: 26, height: 2, backgroundColor: 'rgba(255,255,255,0.8)' }} />
    </View>
  );
}

const vf = StyleSheet.create({
  corner: { position: 'absolute', width: 36, height: 36, borderColor: '#ffffff' },
});

const SCAN_SIZE = 260;
const CORNER = 28;
const CORNER_W = 4;

function ViewfinderOverlay({ onClose }: { onClose: () => void }) {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} />
      <View style={{ flexDirection: 'row', height: SCAN_SIZE }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} />
        <View style={{ width: SCAN_SIZE, height: SCAN_SIZE }}>
          <View style={[styles.corner, { top: 0, left: 0, borderTopWidth: CORNER_W, borderLeftWidth: CORNER_W }]} />
          <View style={[styles.corner, { top: 0, right: 0, borderTopWidth: CORNER_W, borderRightWidth: CORNER_W }]} />
          <View style={[styles.corner, { bottom: 0, left: 0, borderBottomWidth: CORNER_W, borderLeftWidth: CORNER_W }]} />
          <View style={[styles.corner, { bottom: 0, right: 0, borderBottomWidth: CORNER_W, borderRightWidth: CORNER_W }]} />
        </View>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} />
      </View>
      <View
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', paddingTop: 32, gap: 24 }}
        pointerEvents="box-none"
      >
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>
          Point at a product barcode
        </Text>
        <Pressable
          onPress={onClose}
          style={{ paddingHorizontal: 28, paddingVertical: 10, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' }}
          pointerEvents="auto"
        >
          <Text style={{ color: 'white', fontSize: 15 }}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

interface CameraScannerProps {
  onClose: () => void;
  onProductFound: (productId: number) => void;
  onResults: (code: string) => void;
  onNotFound: (code: string) => void;
}

function CameraScanner({ onClose, onProductFound, onResults, onNotFound }: CameraScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [searching, setSearching] = useState(false);
  const scanLock = useRef(false);
  const cameraRef = useRef<CameraView>(null);
  const recordActivity = useRecordActivity();

  useEffect(() => {
    if (permission === null) return;
    if (!permission.granted) {
      requestPermission().then((result) => {
        if (!result.granted) {
          Alert.alert(
            'Camera Permission Required',
            'Please enable camera access in Settings to scan barcodes.',
            [
              { text: 'Cancel', style: 'cancel', onPress: onClose },
              { text: 'Open Settings', onPress: () => { Linking.openSettings(); onClose(); } },
            ]
          );
        }
      });
    }
  }, [permission]);

  async function handleBarcodeScanned({ data }: BarcodeScanningResult) {
    if (scanLock.current) return;
    scanLock.current = true;
    cameraRef.current?.pausePreview();
    setSearching(true);

    try {
      const response = await productsApi.search({ ean: data, limit: 10 });
      const hasResults = response !== null && response.products.length > 0;
      const exact = hasResults ? findExactGtinMatch(response!.products, data) : undefined;
      // Report the scan (+ resolved product) to history/points, once per scan.
      recordActivity({
        type: 'scan',
        query: data,
        product_found: !!exact,
        product_name: exact?.canonical_name ?? null,
        product_image_url: exact?.image_url ?? null,
      });
      if (exact) {
        onProductFound(exact.product_id);
      } else if (hasResults) {
        onResults(data);
      } else {
        onNotFound(data);
      }
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.', [
        { text: 'OK', onPress: () => { scanLock.current = false; setSearching(false); cameraRef.current?.resumePreview(); } },
      ]);
    }
  }

  if (!permission?.granted) return null;

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={!searching ? handleBarcodeScanned : undefined}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'],
        }}
      />
      {searching ? (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', gap: 16 }]}>
          <ActivityIndicator size="large" color="white" />
          <Text style={{ color: 'white', fontSize: 15 }}>Searching product…</Text>
        </View>
      ) : (
        <ViewfinderOverlay onClose={onClose} />
      )}
    </View>
  );
}

// ─── Buttons ──────────────────────────────────────────────────────────────────

function PrimaryButton({ label, icon, onPress }: { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-center gap-2 rounded-2xl py-4 active:opacity-80"
      style={{ backgroundColor: '#7c3aed' }}
    >
      <Ionicons name={icon} size={20} color="#ffffff" />
      <AppText variant="label" className="text-white" style={{ fontWeight: '700', fontSize: 16 }}>{label}</AppText>
    </Pressable>
  );
}

function GlassButton({ label, icon, onPress }: { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-center gap-2 rounded-2xl py-4 active:opacity-70"
      style={{ backgroundColor: GLASS.cardBg, borderWidth: 1, borderColor: GLASS.cardBorder }}
    >
      <Ionicons name={icon} size={18} color="#ffffff" />
      <AppText variant="label" className="text-white" style={{ fontWeight: '700', fontSize: 15 }}>{label}</AppText>
    </Pressable>
  );
}

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const [cameraActive, setCameraActive] = useState(false);
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);

  if (cameraActive) {
    return (
      <CameraScanner
        onClose={() => setCameraActive(false)}
        onProductFound={(id) => {
          setCameraActive(false);
          router.push(`/product/${id}` as never);
        }}
        onResults={(code) => {
          setCameraActive(false);
          router.push({ pathname: '/search/ean', params: { code } } as never);
        }}
        onNotFound={(code) => {
          setCameraActive(false);
          setNotFoundCode(code);
        }}
      />
    );
  }

  if (notFoundCode) {
    return (
      <View className="flex-1">
        <ScreenGradient />
        <StatusBar style="light" />
        <GlassHeader title="Scan Product" onBack={() => setNotFoundCode(null)} />

        <View className="flex-1 items-center justify-center gap-6 px-6">
          <View className="w-32 h-32 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(239,68,68,0.2)' }}>
            <Ionicons name="barcode-outline" size={56} color="#fca5a5" />
          </View>
          <View className="items-center gap-2">
            <AppText variant="heading" className="text-white text-center">Product not found</AppText>
            <AppText variant="body" className="text-white/60 text-center">
              No product matched the scanned barcode
            </AppText>
            <View className="rounded-xl px-4 py-2 mt-1" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
              <AppText variant="caption" className="text-white/70 text-center font-mono">
                {notFoundCode}
              </AppText>
            </View>
          </View>
          <View className="w-full gap-3">
            <PrimaryButton label="Try Again" icon="scan-outline" onPress={() => { setNotFoundCode(null); setCameraActive(true); }} />
            <GlassButton label="Enter Code Manually" icon="keypad-outline" onPress={() => { setNotFoundCode(null); router.push('/search/ean' as never); }} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <ScreenGradient />
      <StatusBar style="light" />
      <GlassHeader title="Scan Product" onBack={router.canGoBack() ? () => router.back() : undefined} />

      <View className="flex-1 items-center justify-center gap-10 px-6">
        <AppText variant="body" className="text-white/70 text-center" style={{ fontSize: 16 }}>
          Point your camera at a product barcode
        </AppText>
        <Viewfinder />
      </View>

      <View className="px-6 gap-3" style={{ paddingBottom: insets.bottom + 16 }}>
        <PrimaryButton label="Scan Barcode" icon="scan-outline" onPress={() => setCameraActive(true)} />

        <View className="flex-row items-center gap-3">
          <View className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
          <AppText variant="caption" className="text-white/50">or</AppText>
          <View className="flex-1 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
        </View>

        <GlassButton label="Search by name" icon="search-outline" onPress={() => router.push('/search/name' as never)} />

        <Pressable onPress={() => router.push('/search/ean' as never)} className="items-center py-2 active:opacity-60">
          <AppText variant="label" className="text-white/70 font-semibold">Enter barcode manually</AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: '#7c3aed',
  },
});
