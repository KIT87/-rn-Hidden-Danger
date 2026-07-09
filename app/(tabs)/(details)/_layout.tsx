import { Stack } from 'expo-router';

// Shared stack for all content-detail screens (product, user profile, search,
// top-rated, community). Living inside (tabs) keeps the bottom tab bar visible
// while these screens push, and lets any tab deep-link into them.
export default function DetailsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
