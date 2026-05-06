import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { BarcodeScanningResult } from 'expo-camera';
import { AppButton, AppScreen, AppText } from '@/components/ui';
import { productsApi } from '@/features/products/api';

// Once you have the image: replace <ScanGraphic /> below with:
// <Image source={require('../../assets/scan-illustration.png')} style={{ width: 260, height: 200 }} resizeMode="contain" />
function ScanGraphic() {
  return (
    <View style={{ width: 220, height: 180, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[scanGraphicStyles.corner, { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 }]} />
      <View style={[scanGraphicStyles.corner, { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 }]} />
      <View style={[scanGraphicStyles.corner, { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 }]} />
      <View style={[scanGraphicStyles.corner, { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4 }]} />
      <Ionicons name="barcode-outline" size={80} color="#d1fae5" />
    </View>
  );
}
const scanGraphicStyles = StyleSheet.create({
  corner: { position: 'absolute', width: 36, height: 36, borderColor: '#16a34a' },
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
  onNotFound: (code: string) => void;
}

function CameraScanner({ onClose, onProductFound, onNotFound }: CameraScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [searching, setSearching] = useState(false);
  const scanLock = useRef(false);
  const cameraRef = useRef<CameraView>(null);

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
      const results = await productsApi.searchByEan(data);
      if (results && results.length > 0) {
        onProductFound(results[0].product_id);
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

export default function ScanScreen() {
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
        onNotFound={(code) => {
          setCameraActive(false);
          setNotFoundCode(code);
        }}
      />
    );
  }

  if (notFoundCode) {
    return (
      <AppScreen className="items-center justify-center gap-6 px-6">
        <View className="w-32 h-32 rounded-full bg-red-50 items-center justify-center">
          <Ionicons name="barcode-outline" size={56} color="#fca5a5" />
        </View>
        <View className="items-center gap-2">
          <AppText variant="heading" className="text-gray-900 text-center">
            Product not found
          </AppText>
          <AppText variant="body" className="text-gray-500 text-center">
            No product matched the scanned barcode
          </AppText>
          <View className="bg-gray-100 rounded-xl px-4 py-2 mt-1">
            <AppText variant="caption" className="text-gray-400 text-center font-mono">
              {notFoundCode}
            </AppText>
          </View>
        </View>
        <View className="w-full gap-3">
          <AppButton
            label="Try Again"
            onPress={() => { setNotFoundCode(null); setCameraActive(true); }}
          />
          <AppButton
            label="Enter Code Manually"
            variant="secondary"
            onPress={() => { setNotFoundCode(null); router.push('/search/ean' as never); }}
          />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen className="items-center justify-center gap-8 px-6">
      <ScanGraphic />

      <View className="w-full gap-3">
        <AppButton
          label="Scan Barcode"
          onPress={() => setCameraActive(true)}
        />

        <View className="flex-row items-center gap-3">
          <View className="flex-1 h-px bg-gray-100" />
          <AppText variant="caption" className="text-gray-300">or</AppText>
          <View className="flex-1 h-px bg-gray-100" />
        </View>

        <AppButton
          label="Search by name"
          variant="secondary"
          onPress={() => router.push('/search/name' as never)}
        />
        <AppButton
          label="Enter EAN"
          variant="ghost"
          onPress={() => router.push('/search/ean' as never)}
        />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: '#16a34a',
  },
});
