// app/_layout.js
import { useAuth } from '@/hooks/useAuth';
import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function RootLayout() {
  const { user, profileComplete, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/(auth)/signin');
      } else if (!profileComplete) {
        router.replace('/(auth)/profile-setup');
      } else {
        router.replace('/(tabs)/home');
      }
    }
  }, [loading, user, profileComplete, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2774AE" />
      </View>
    );
  }
  
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)/signin" />
      <Stack.Screen name="(auth)/profile-setup" />
      <Stack.Screen name="(tabs)/home" />
    </Stack>
    );

}
