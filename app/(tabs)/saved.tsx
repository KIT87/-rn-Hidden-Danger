import { AppScreen, AppText } from '@/components/ui';

export default function SavedScreen() {
  return (
    <AppScreen className="justify-center items-center">
      <AppText variant="heading">Saved</AppText>
      <AppText variant="body" className="text-gray-400 mt-2">Your saved products</AppText>
    </AppScreen>
  );
}
