import { Modal, Pressable, View, type ModalProps } from 'react-native';
import { AppText } from './AppText';

interface AppModalProps extends Pick<ModalProps, 'visible'> {
  title?: string;
  children: React.ReactNode;
  onClose: () => void;
}

export function AppModal({ visible, title, children, onClose }: AppModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/50 justify-end" onPress={onClose}>
        <Pressable
          className="rounded-t-3xl p-6 gap-4"
          style={{ backgroundColor: '#2e1b58', borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.14)' }}
          onPress={() => {}}
        >
          {title && <AppText variant="heading" className="text-white">{title}</AppText>}
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
