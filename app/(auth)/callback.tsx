import { Redirect } from 'expo-router';

// No longer used — auth is code-based, not magic link
export default function CallbackScreen() {
  return <Redirect href="/(auth)/login" />;
}
