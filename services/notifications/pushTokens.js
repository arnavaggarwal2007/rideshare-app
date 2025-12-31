import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export async function savePushToken(userId, token, metadata = {}) {
  if (!userId || !token) throw new Error('userId and token are required');

  const tokenRef = doc(db, 'pushTokens', userId);
  const existingSnap = await getDoc(tokenRef);
  const existingTokens = existingSnap.exists() && Array.isArray(existingSnap.data()?.tokens)
    ? existingSnap.data().tokens.filter((t) => typeof t === 'string')
    : [];

  const uniqueTokens = Array.from(new Set([...existingTokens, token]));

  await setDoc(tokenRef, {
    tokens: uniqueTokens,
    updatedAt: serverTimestamp(),
    latest: {
      token,
      platform: metadata.platform || 'unknown',
      osVersion: metadata.osVersion || 'unknown',
      deviceName: metadata.deviceName || 'unknown',
      appId: metadata.appId || 'unknown',
      appVersion: metadata.appVersion || 'unknown',
      savedAt: serverTimestamp(),
    },
  }, { merge: true });
}

export async function getUserPushTokens(userId) {
  if (!userId) throw new Error('userId is required');
  const tokenRef = doc(db, 'pushTokens', userId);
  const snap = await getDoc(tokenRef);
  if (!snap.exists()) return [];
  const data = snap.data();
  if (!Array.isArray(data?.tokens)) return [];
  return data.tokens.filter((t) => typeof t === 'string');
}
