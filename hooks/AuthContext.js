import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { auth, db } from '../firebaseConfig';
import { logout as reduxLogout, setUser as setReduxUser, setUserProfile as setReduxUserProfile } from '../store/slices/authSlice';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null); // Firestore profile
  const [profileComplete, setProfileComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const dispatch = useDispatch();

  const refreshProfile = useCallback(async (uid) => {
    setProfileLoading(true);
    try {
      const userId = uid || (auth.currentUser && auth.currentUser.uid);
      if (!userId) {
        setProfileComplete(false);
        setUserProfile(null);
        setProfileLoading(false);
        return;
      }
      const userDoc = await getDoc(doc(db, 'users', userId));
      console.log('[AuthContext] refreshProfile userDoc.exists:', userDoc.exists());
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserProfile(userData);
        dispatch(setReduxUserProfile(userData));
        console.log('[AuthContext] refreshProfile userData:', userData);
        const isComplete =
          userData.profileComplete === true &&
          userData.name &&
          userData.school &&
          userData.major &&
          userData.graduationYear;
        setProfileComplete(Boolean(isComplete));
        console.log('[AuthContext] refreshProfile setProfileComplete:', Boolean(isComplete));
      } else {
        setProfileComplete(false);
        setUserProfile(null);
        dispatch(setReduxUserProfile(null));
        console.log('[AuthContext] refreshProfile: userDoc does not exist, setProfileComplete false');
      }
    } catch (error) {
      if (__DEV__) console.error('Error refreshing profile:', error);
      setProfileComplete(false);
      setUserProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!active) return;
      setUser(currentUser);
      if (!currentUser) {
        setProfileComplete(false);
        setUserProfile(null);
        setLoading(false);
        setProfileLoading(false);
        dispatch(reduxLogout());
        return;
      }
      dispatch(setReduxUser(currentUser));
      // Reset stale profile immediately when user changes to avoid incorrect redirects
      setUserProfile(null);
      setProfileComplete(false);
      dispatch(setReduxUserProfile(null));
      setProfileLoading(true);
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        console.log('[AuthContext] onAuthStateChanged userDoc.exists:', userDoc.exists());
        if (!active) return;
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserProfile(userData);
          dispatch(setReduxUserProfile(userData));
          console.log('[AuthContext] onAuthStateChanged userData:', userData);
          const isComplete =
            userData.profileComplete === true &&
            userData.name &&
            userData.school &&
            userData.major &&
            userData.graduationYear;
          setProfileComplete(Boolean(isComplete));
          console.log('[AuthContext] onAuthStateChanged setProfileComplete:', Boolean(isComplete));
        } else {
          setProfileComplete(false);
          setUserProfile(null);
          dispatch(setReduxUserProfile(null));
          console.log('[AuthContext] onAuthStateChanged: userDoc does not exist, setProfileComplete false');
        }
      } catch (error) {
        if (__DEV__) console.error('Error checking profile:', error);
        if (active) setProfileComplete(false);
        if (active) setUserProfile(null);
      } finally {
        if (active) setLoading(false);
        if (active) setProfileLoading(false);
      }
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const value = { user, userProfile, profileComplete, loading, profileLoading, refreshProfile };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
