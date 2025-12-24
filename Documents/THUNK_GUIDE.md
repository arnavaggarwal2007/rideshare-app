# Using Redux Thunk and createAsyncThunk

Redux Toolkit includes Redux Thunk middleware by default, allowing you to write async logic that interacts with Firestore or other APIs.

## Example: Fetching User Profile from Firestore

```js
import { createAsyncThunk } from '@reduxjs/toolkit';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

// Async thunk to fetch user profile
envexport const fetchUserProfile = createAsyncThunk(
  'auth/fetchUserProfile',
  async (uid, thunkAPI) => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data();
      } else {
        return thunkAPI.rejectWithValue('User profile not found');
      }
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);
```

## Usage in Slice

Add extraReducers to handle pending, fulfilled, and rejected states:

```js
import { fetchUserProfile } from './path/to/thunks';

const authSlice = createSlice({
  // ...existing code...
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.userProfile = action.payload;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});
```

---

_Last updated: 2025-12-23_
