import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import ErrorAlert from '../components/ErrorAlert';
import { setError, setUserProfile } from '../store/slices/authSlice';

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

import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { AuthProvider } from '../hooks/AuthContext';
import { persistor, store } from '../store/store';

function RootLayoutInner() {
  // Use Redux selectors for user and profileComplete state
  const user = useSelector(state => state.auth.user);
  const userProfile = useSelector(state => state.auth.userProfile);
  const loading = useSelector(state => state.auth.loading);
  const dispatch = useDispatch();

  // Only trust a profile that belongs to the current user
  const effectiveProfile = user && userProfile && userProfile.uid === user.uid ? userProfile : null;
  // Assume profileComplete is derived from userProfile
  const profileComplete = effectiveProfile?.profileComplete === true;
  const segments = useSegments();
  const router = useRouter();

  // All hooks must be called unconditionally, before any return
  const [stuck, setStuck] = React.useState(false);
  const [errorAlert, setErrorAlert] = useState({ visible: false, message: '' });

  // Debug: log loading and segments state every render
  console.log('RootLayout render:', { loading, segments, user, userProfile });
  // Dismiss handler for error alert
  const handleDismissError = () => {
    setErrorAlert({ visible: false, message: '' });
    dispatch(setError(null));
  };

  // Allow navigation/guard logic when loading is false
  const guardReady = !loading;

    // Increase stuck loading timeout to 20s for smoother UX
    React.useEffect(() => {
          // --- Redirect to home if profile is complete and user is on profile-setup ---
          if ((user || effectiveProfile) && profileComplete && segments.includes('profile-setup')) {
            console.log('Profile complete, redirecting from profile-setup to home.');
            router.replace('/(tabs)/home');
            return;
          }
      if (guardReady) return;
      const timer = setTimeout(() => setStuck(true), 20000);
      return () => clearTimeout(timer);
    }, [guardReady, user, effectiveProfile, profileComplete, segments, router]);

  // Log when Stack is about to render
  React.useEffect(() => {
      // Simulate Firebase error for testing (remove/comment out in production)
      // if (user && Math.random() < 0.05) {
      //   setErrorAlert({ visible: true, message: 'Simulated Firebase error: Network failure.' });
      //   dispatch(setError('Simulated Firebase error: Network failure.'));
      //   return;
      // }
    if (!guardReady) {
      console.log('Rendering Stack. segments:', segments, 'user:', user);
    }
  }, [guardReady, segments, user]);

  // --- CENTRALIZED NAVIGATION GUARD LOGIC ---
  // 1. Define bypass groups/routes (for unauthenticated and special-case access)
  const BYPASS_GROUPS = ['(auth)', 'modal'];
  // Do not bypass profile-setup so guard can redirect when profile becomes complete
  const BYPASS_ROUTES = ['signin', 'signup', 'forgot-password'];

  // 2. Helper: is current route a bypass?
  const isBypass = React.useMemo(() => {
    if (!segments || segments.length === 0) return false;
    const last = segments[segments.length - 1];
    // Once a user is present, do not bypass guard so redirects can run
    if (user || effectiveProfile) return false;
    if (last === 'profile-setup') return false;
    // Allow guard on signup once a user exists
    if (last === 'signup' && (user || effectiveProfile)) return false;
    if (segments.some(seg => BYPASS_GROUPS.includes(seg))) return true;
    if (BYPASS_ROUTES.includes(last)) return true;
    return false;
  }, [segments, user, effectiveProfile]);

  // 3. Centralized guard effect: handles all redirect logic in one place
  React.useEffect(() => {
    if (!guardReady) return;

    // --- Logging for diagnostics ---
    console.log('user:', user);
    console.log('userProfile:', userProfile);
    console.log('profileComplete:', profileComplete);
    console.log('segments:', segments);
    console.log('router:', router);

    // Clear any persisted profile when there is no signed-in user to avoid stale redirects
    if (!user && userProfile) {
      dispatch(setUserProfile(null));
    }


    // --- Profile completion redirect (must run even on (auth)/profile-setup) ---
    if ((user || effectiveProfile) && profileComplete) {
      const onProfileSetup = segments.includes('profile-setup');
      if (onProfileSetup) {
        console.log('Profile complete, redirecting from profile-setup to home.');
        router.replace('/(tabs)/home');
        return;
      }
    }

    // --- Special case: redirect from (auth)/signup to profile-setup for new accounts ---
    if (
      segments.length === 2 &&
      segments[0] === '(auth)' &&
      segments[1] === 'signup' &&
      (user || effectiveProfile)
    ) {
      if (!profileComplete) {
        console.log('Redirecting from signup to profile-setup for new account.');
        router.replace('/(auth)/profile-setup');
      } else {
        console.log('Redirecting from signup to home (profile already complete).');
        router.replace('/(tabs)/home');
      }
      return;
    }

    // --- Special case: redirect from (auth)/signin to (tabs)/home after sign in ---
    if (
      segments.length === 2 &&
      segments[0] === '(auth)' &&
      segments[1] === 'signin' &&
      user && profileComplete
    ) {
      console.log('Redirecting from (auth)/signin to (tabs)/home after sign in.');
      router.replace('/(tabs)/home');
      return;
    }

    // --- Bypass logic ---
    if (isBypass) {
      console.log('Bypass route/group detected, skipping guard logic.');
      return;
    }

    // --- Profile completion redirect ---
    if ((user || effectiveProfile) && !profileComplete) {
      const onProfileSetup = segments.includes('profile-setup');
      if (!onProfileSetup) {
        console.log('Redirecting to /profile-setup for incomplete profile.');
        router.replace('/(auth)/profile-setup');
        return;
      }
    }

    // --- Unauthenticated redirect ---
    if (!user) {
      console.log('Would redirect to (auth)/signin');
      dispatch(setUserProfile(null));
      // router.replace('/(auth)/signin');
      return;
    }

    // --- (Future: add more guard logic here) ---
  }, [guardReady, user, userProfile, effectiveProfile, profileComplete, segments, router, isBypass, dispatch]);

  if (!guardReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F9FB' }}>
        {stuck ? (
          <Text style={{ color: 'red', marginBottom: 16, fontSize: 16, textAlign: 'center', fontFamily: 'Montserrat_700Bold', fontWeight: 'bold' }}>
            Still loading... If this persists, please check your connection or try again later.
          </Text>
        ) : (
          <>
            <ActivityIndicator size="large" color="#2774AE" />
            <Text style={{ marginTop: 16, fontSize: 16, color: '#2774AE', textAlign: 'center', fontFamily: 'Montserrat_700Bold', fontWeight: 'bold' }}>
              Setting up your account...
            </Text>
          </>
        )}
        <ErrorAlert
          visible={errorAlert.visible}
          message={errorAlert.message}
          onDismiss={handleDismissError}
        />
      </View>
    );
  }

  return (
    <>
      <ErrorAlert
        visible={errorAlert.visible}
        message={errorAlert.message}
        onDismiss={handleDismissError}
      />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" />
        <Stack.Screen name="modal/edit-profile" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AuthProvider>
          <RootLayoutInner />
        </AuthProvider>
      </PersistGate>
    </Provider>
  );
}