// Import the functions you need from the SDKs you need
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getReactNativePersistence, initializeAuth, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAyCYxmmtApGYx-6UsgYRquNNrGLQk4T2k",
  authDomain: "rideshare-ae5f3.firebaseapp.com",
  projectId: "rideshare-ae5f3",
  storageBucket: "rideshare-ae5f3.appspot.com",
  messagingSenderId: "160288615210",
  appId: "1:160288615210:web:325f8ea28e15d503ee4c53",
  measurementId: "G-JE46BJ72F8"
};

// Initialize Firebase (guard against duplicate app initialization)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Initialize Auth with persistence; if already initialized, reuse existing auth instance
let authInstance;
try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (e) {
  authInstance = getAuth(app);
}
export const auth = authInstance;

// Initialize services
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export default app;