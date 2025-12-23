import { Stack, useRouter, useSegments } from 'expo-router';
import { Text, ActivityIndicator, View } from 'react-native';
import React from 'react';
import { useAuth } from '../hooks/AuthContext';

/**
 * GLOBAL NAVIGATION GUARD DESIGN (Phase 0)
 *
 * 1. Loading Gating:
 *    - Block all navigation/UI rendering until useAuth().loading is false.
 *    - Prevents flicker and premature redirects.
 * 2. Bypass Lists:
 *    - Define routes/groups that should bypass the guard (e.g., (auth), modal, error pages).
 *    - Used to allow unauthenticated or special-case access.
 * 3. Segment/Group Detection:
 *    - Use useSegments() to detect current route group (e.g., (auth), (tabs), modal).
 *    - Enables group-based guard logic.
 * 4. Redirect Map:
 *    - Centralize all redirect logic in one place.
 *    - E.g., if not authenticated, redirect to (auth)/signin; if profile incomplete, redirect to (auth)/profile-setup; else allow (tabs).
 * 5. Deep Link & Cold Start Handling:
 *    - Ensure guard logic works for deep links and app cold starts.
 *    - Avoids redirect loops and ensures correct initial route.
 * 6. Risk Mitigations:
 *    - Strict loading gating to prevent flicker.
 *    - Single source of truth for all redirects.
 *    - Bypass list for special-case routes.
 *    - Test all flows: signed out, signed in, incomplete profile, deep link, cold start.
 * 7. Incremental Implementation:
 *    - Each step will be implemented and build-checked before proceeding.
 *    - No guard logic is active yet—this is documentation only.
 */

import { AuthProvider } from '../hooks/AuthContext';

function RootLayoutInner() {
  // Step 1: Loading gating (block all navigation/guard logic until both user and profileComplete are loaded)
  const user = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Defensive redirect removed: index.js handles initial redirect to (tabs)/home

  // All hooks must be called unconditionally, before any return
  const [stuck, setStuck] = React.useState(false);

  // Debug: log loading and segments state every render
  console.log('RootLayout render:', { userLoading: user.loading, segments, user });

  // Only allow navigation/guard logic when user.loading and user.profileLoading are both false
  const guardReady = !user.loading && !user.profileLoading;

    // Increase stuck loading timeout to 20s for smoother UX
    React.useEffect(() => {
      if (guardReady) return;
      const timer = setTimeout(() => setStuck(true), 20000);
      return () => clearTimeout(timer);
    }, [guardReady]);

  // Log when Stack is about to render
  React.useEffect(() => {
    if (!guardReady) {
      console.log('Rendering Stack. segments:', segments, 'user:', user);
    }
  }, [guardReady, segments, user]);

  // --- CENTRALIZED NAVIGATION GUARD LOGIC ---
  // 1. Define bypass groups/routes (for unauthenticated and special-case access)
  const BYPASS_GROUPS = ['(auth)', 'modal'];
  const BYPASS_ROUTES = ['signin', 'signup', 'forgot-password'];

  // 2. Helper: is current route a bypass?
  const isBypass = React.useMemo(() => {
    if (!segments || segments.length === 0) return false;
    if (segments.some(seg => BYPASS_GROUPS.includes(seg))) return true;
    const last = segments[segments.length - 1];
    if (BYPASS_ROUTES.includes(last)) return true;
    return false;
  }, [segments]);

  // 3. Centralized guard effect: handles all redirect logic in one place
  React.useEffect(() => {
    if (!guardReady) return;

    // --- Logging for diagnostics ---
    console.log('user:', user);
    console.log('segments:', segments);
    console.log('router:', router);

    // --- Bypass logic ---
    if (isBypass) {
      console.log('Bypass route/group detected, skipping guard logic.');
      return;
    }

    // --- Profile completion redirect ---
    if (user.user && !user.profileComplete) {
      const onProfileSetup = segments.includes('profile-setup');
      if (!onProfileSetup) {
        console.log('Redirecting to /profile-setup for incomplete profile.');
        router.replace('/(auth)/profile-setup');
        return;
      }
    }

    // --- Unauthenticated redirect ---
    if (!user.user) {
      console.log('Would redirect to (auth)/signin');
      // router.replace('/(auth)/signin');
      return;
    }

    // --- (Future: add more guard logic here) ---
  }, [guardReady, user, segments, router, isBypass]);

  if (!guardReady) {
    if (stuck) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F9FB' }}>
          <Text style={{ color: 'red', marginBottom: 16, fontSize: 16, textAlign: 'center', fontFamily: 'Montserrat_700Bold', fontWeight: 'bold' }}>
            Still loading... If this persists, please check your connection or try again later.
          </Text>
        </View>
      );
    }
    // Show a friendly loading indicator with a message
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F9FB' }}>
        <ActivityIndicator size="large" color="#2774AE" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#2774AE', textAlign: 'center', fontFamily: 'Montserrat_700Bold', fontWeight: 'bold' }}>
          Setting up your account...
        </Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="modal" />
      <Stack.Screen name="modal/edit-profile" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutInner />
    </AuthProvider>
  );
}