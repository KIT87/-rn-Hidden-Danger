import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { BarcodeScanningResult } from 'expo-camera';

// Barcode symbologies accepted everywhere we read an EAN/UPC. Keep in one place
// so the scan (EAN search) screen and the correction wizard stay identical.
const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] as const;

const SCAN_SIZE = 260;
const CORNER = 28;
const CORNER_W = 4;

function ViewfinderOverlay({ prompt, onClose }: { prompt: string; onClose: () => void }) {
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
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>{prompt}</Text>
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

export interface BarcodeScannerProps {
  /**
   * Called once with the scanned code. May be async — while it runs the preview
   * is paused and a spinner (with `busyLabel`) is shown; if it throws, the user
   * is offered a retry and scanning resumes.
   */
  onScan: (code: string) => void | Promise<void>;
  onClose: () => void;
  /** Overlay prompt under the viewfinder. */
  prompt?: string;
  /** Spinner label shown while an async `onScan` runs (e.g. "Searching product…"). */
  busyLabel?: string;
}

// Full-screen live barcode scanner. Owns camera permission (with the Settings
// prompt), the viewfinder overlay, single-scan locking and preview pausing. The
// caller decides what to do with the code via `onScan`.
export function BarcodeScanner({ onScan, onClose, prompt = 'Point at a product barcode', busyLabel }: BarcodeScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
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
    if (scanLock.current || !data) return;
    scanLock.current = true;
    cameraRef.current?.pausePreview();
    setBusy(true);

    try {
      await onScan(data);
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.', [
        { text: 'OK', onPress: () => { scanLock.current = false; setBusy(false); cameraRef.current?.resumePreview(); } },
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
        onBarcodeScanned={!busy ? handleBarcodeScanned : undefined}
        barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
      />
      {busy ? (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', gap: 16 }]}>
          <ActivityIndicator size="large" color="white" />
          {busyLabel ? <Text style={{ color: 'white', fontSize: 15 }}>{busyLabel}</Text> : null}
        </View>
      ) : (
        <ViewfinderOverlay prompt={prompt} onClose={onClose} />
      )}
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
