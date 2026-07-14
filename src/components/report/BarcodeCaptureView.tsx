import { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui';

// Full-screen barcode scanner that returns the scanned value only (no product
// lookup / navigation). Barcode settings mirror app/(tabs)/scan.tsx.
export function BarcodeCaptureView({ onScanned, onClose }: {
  onScanned: (code: string) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const scannedRef = useRef(false);

  if (!permission) {
    return <View style={{ flex: 1, backgroundColor: 'black' }} />;
  }

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: 'black', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
        <AppText className="text-white text-center">Camera access is needed to scan a barcode.</AppText>
        <Pressable onPress={requestPermission} className="rounded-2xl px-5 py-3" style={{ backgroundColor: '#7c3aed' }}>
          <AppText className="text-white font-semibold">Grant access</AppText>
        </Pressable>
        <Pressable onPress={onClose} hitSlop={8}>
          <AppText className="text-white/70">Cancel</AppText>
        </Pressable>
      </View>
    );
  }

  const handle = (r: BarcodeScanningResult) => {
    if (scannedRef.current || !r.data) return;
    scannedRef.current = true;
    onScanned(r.data);
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <StatusBar style="light" />
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={handle}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] }}
      />
      <Pressable
        onPress={onClose}
        hitSlop={8}
        style={{ position: 'absolute', top: insets.top + 12, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name="close" size={22} color="#ffffff" />
      </Pressable>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 40, alignItems: 'center' }}>
        <AppText className="text-white/90">Point at the product barcode</AppText>
      </View>
    </View>
  );
}
