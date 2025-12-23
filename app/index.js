// app/index.js
// Root entry point - handles initial routing based on auth state

import { useAuth } from '@/hooks/useAuth';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const { user, profileComplete, loading, profileLoading } = useAuth();

  if (loading || profileLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F9FB' }}>
        <ActivityIndicator size="large" color="#2774AE" />
      </View>
    );
  }

  // Not authenticated - go to signup
  if (!user) {
    return <Redirect href="/(auth)/signup" />;
  }

  // Authenticated but profile incomplete - go to profile setup
  if (!profileComplete) {
    return <Redirect href="/(auth)/profile-setup" />;
  }

  // Authenticated and profile complete - go to home
  return <Redirect href="/(tabs)/home" />;
}
