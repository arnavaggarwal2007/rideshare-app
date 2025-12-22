import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { auth, db } from '../firebaseConfig';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [profileComplete, setProfileComplete] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const checkProfileCompletion = async () => {
      setProfileLoading(true);

      if (!user) {
        setProfileLoading(false);
        setProfileComplete(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));

        if (userDoc.exists()) {
          const userData = userDoc.data();
          const isComplete =
            userData.profileComplete === true &&
            userData.name &&
            userData.school &&
            userData.major &&
            userData.graduationYear;

          setProfileComplete(Boolean(isComplete));
        } else {
          setProfileComplete(false);
        }
      } catch (error) {
        console.error('Error checking profile:', error);
        setProfileComplete(false);
      } finally {
        setProfileLoading(false);
      }
    };

    checkProfileCompletion();
  }, [user]);

  const loading = authLoading || profileLoading;

  return { user, profileComplete, loading };
}
