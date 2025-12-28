// Firebase config and app instance for Firestore service
// This file re-exports the initialized app, db, auth, storage, and functions for use in Firestore and other services.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAyCYxmmtApGYx-6UsgYRquNNrGLQk4T2k",
  authDomain: "rideshare-ae5f3.firebaseapp.com",
  projectId: "rideshare-ae5f3",
  storageBucket: "rideshare-ae5f3.appspot.com",
  messagingSenderId: "160288615210",
  appId: "1:160288615210:web:325f8ea28e15d503ee4c53",
  measurementId: "G-JE46BJ72F8"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let authInstance;
try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (e) {
  authInstance = getAuth(app);
}
export const auth = authInstance;
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
export default app;
