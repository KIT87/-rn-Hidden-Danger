import { Stack } from 'expo-router';

// Shared stack for all content-detail screens (product, user profile, search,
// top-rated, community). Lives at the root level (a sibling of (tabs)) so these
// screens push over the whole tab UI: back always pops cleanly instead of
// switching tabs and leaving stale screens behind. The bottom tab bar is hidden
// while a detail screen is open (it returns when you pop back to the tabs).
export default function DetailsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
