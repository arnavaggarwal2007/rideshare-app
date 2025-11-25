import { router } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { auth, db } from '../firebaseConfig';
import AuthScreen from '../screens/AuthScreen';

export default function Index() {
  const [loading, setLoading] = useState(true);
  const[user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists() && userDoc.data().profileComplete) {
            router.replace('/(tabs)/home');
          } else {
            setUser(currentUser);
            setLoading(false);
          }
        } catch (error) {
          console.error('Error checking profile:', error);
          setLoading(false);
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2774AE" />
      </View>
    );
  }

  if (user) {
    const ProfileSetupScreen = require('../screens/ProfileSetupScreen').default;
    return <ProfileSetupScreen />
  }

  return <AuthScreen />;
}

const styles = StyleSheet.create({
  loadingCOntainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});