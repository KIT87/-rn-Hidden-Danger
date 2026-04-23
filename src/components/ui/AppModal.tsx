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
        <Pressable className="bg-white rounded-t-3xl p-6 gap-4" onPress={() => {}}>
          {title && <AppText variant="heading">{title}</AppText>}
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
