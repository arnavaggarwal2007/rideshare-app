# Week 7 Implementation Plan
## RideShare App MVP - Ratings, Safety & Push Notifications

**Duration:** 5 Days (40 hours)  
**Features:** Rating System, Safety Features, Push Notification Enhancements

---

## Table of Contents
1. [Prerequisites Checklist](#prerequisites-checklist)
2. [Phase 1: Rating System Core Infrastructure](#phase-1-rating-system-core-infrastructure-day-1-8-hours)
3. [Phase 2: Rating UI Screen](#phase-2-rating-ui-screen-day-1-2-4-hours)
4. [Phase 3: Rating Integration Points](#phase-3-rating-integration-points-day-2-6-hours)
5. [Phase 4: Review Card Component](#phase-4-review-card-component-day-2-2-hours)
6. [Phase 5: Safety Features - Report User](#phase-5-safety-features---report-user-day-3-4-hours)
7. [Phase 6: Safety Features - Block User](#phase-6-safety-features---block-user-day-3-2-hours)
8. [Phase 7: Block User Feed Filtering](#phase-7-block-user-feed-filtering-day-3-2-hours)
9. [Phase 8: Push Notifications - Rating Reminders](#phase-8-push-notifications---rating-reminders-day-4-4-hours)
10. [Phase 9: Push Notifications - Trip Reminders](#phase-9-push-notifications---trip-reminders-day-4-5-6-hours)
11. [Phase 10: Notification Deep Linking Polish](#phase-10-notification-deep-linking-polish-day-5-3-hours)
12. [Phase 11: UI Polish & Edge Cases](#phase-11-ui-polish--edge-cases-day-5-3-hours)
13. [Phase 12: Testing & Validation](#phase-12-testing--validation-day-5-2-hours)
14. [Further Considerations](#further-considerations)

---

## Prerequisites Checklist

Before starting Week 7, verify these features are fully implemented:

### Authentication & User System
- [ ] Email/password authentication with Firebase Auth
- [ ] User profiles stored in Firestore `users` collection
- [ ] Emergency contacts support (up to 3)
- [ ] Ride preferences (music, chattiness, pet-friendly, smoking)
- [ ] Profile completion validation
- [ ] View other user profiles at `app/user/[id].js`

### Trip System
- [ ] Trip creation on booking acceptance
- [ ] Trip status tracking: `confirmed → in-progress → completed`
- [ ] Trip details screen (`app/trip/[id].js`) with map and controls
- [ ] Real-time trip status subscriptions
- [ ] Driver can mark trip as completed
- [ ] Rider can view completed trips
- [ ] Trip document includes `driverId`, `riderId`, `status` fields

### Push Notifications Infrastructure
- [ ] `expo-notifications` configured and working
- [ ] Push token collection and storage in Firestore (`pushTokens` collection)
- [ ] `sendPushNotificationAsync` function in `services/notifications/pushNotifications.js`
- [ ] `getUserPushTokens` function in `services/notifications/pushTokens.js`
- [ ] Basic notification handler registered in app layout
- [ ] Notifications for: request received, accepted, declined, trip status, messages

### Redux Store Structure
- [ ] Store configured at `store/store.js`
- [ ] Auth slice with user state
- [ ] Trips slice with trip management
- [ ] Rides slice with ride feed
- [ ] Messages slice with chat functionality

### Firebase Services
- [ ] `services/firebase/trips.js` with trip CRUD operations
- [ ] `services/firebase/users.js` with user profile operations
- [ ] Firestore security rules in `firestore.rules`

---

## Phase 0: Prerequisites Verification & Setup

**STATUS: The following critical missing functions have been ADDED to the codebase:**

### 0.1 Added Missing Firestore Functions ✅ COMPLETED
The following functions were added to `services/firebase/firestore.js`:

- ✅ `updateTripStatus(tripId, driverId, newStatus, timestamp, cancellationReason)` - Update trip status with validation
- ✅ `subscribeToTrip(tripId, callback)` - Real-time trip subscription
- ✅ `confirmTripCompletionByRider(tripId, riderId)` - Rider confirms completion
- ✅ `notifyUserPush(userId, message)` - Now exported (was internal only)

### 0.2 Created Firebase Users Service ✅ COMPLETED
Created `services/firebase/users.js` with:

- ✅ `getUserById(userId)` - Get user profile
- ✅ `updateUserProfile(userId, updates)` - Update user profile
- ✅ `blockUser(userId, blockedUserId)` - Block a user
- ✅ `unblockUser(userId, blockedUserId)` - Unblock a user
- ✅ `getBlockedUsers(userId)` - Get blocked users list
- ✅ `isUserBlocked(userId, targetUserId)` - Check if user is blocked
- ✅ `updateUserRating(userId, newAverageRating, newTotalRatings)` - Update rating stats
- ✅ `incrementCompletedTrips(userId)` - Increment completed trips counter

### 0.3 Verify Trip Completion Flow
1. Open `app/trip/[id].js` and verify driver can mark trip as completed ✅ EXISTS
2. Verify trip status updates to 'completed' in Firestore ✅ EXISTS
3. The `handleCompleteTrip` function exists and works properly

### 0.4 Verify Trip Document Structure
4. Ensure trip documents have fields: `driverId`, `riderId`, `status`, `departureTime` ✅ EXISTS
5. Add missing rating flag fields to trip schema when creating trips:
   - `isRatedByDriver: false`
   - `isRatedByRider: false`
   - `bothPartiesRated: false`

### 0.5 Verify User Document Structure
6. Ensure user documents can support new fields:
   - `averageRating` (will default to 0)
   - `totalRatings` (will default to 0)
   - `blockedUsers` (will default to [])
   - `totalTripsCompleted` (will default to 0)

### 0.6 Verify Notification Infrastructure
7. Open `services/notifications/pushNotifications.js` and verify `sendPushNotificationAsync` exists ✅ EXISTS
8. Open `services/notifications/pushTokens.js` and verify `getUserPushTokens` exists ✅ EXISTS
9. Trip reminders service exists at `services/notifications/tripReminders.js` ✅ EXISTS

---

## Phase 1: Rating System Core Infrastructure (Day 1, ~8 hours)

### 1.1 Firestore Security Rules Setup
1. Open `firestore.rules` and add a new `reviews` collection match block
2. Add `allow read` rule requiring `isSignedIn()` for reviews
3. Add `allow create` rule validating: `reviewerId == request.auth.uid`, rating between 1-5, required fields present
4. Add `allow update, delete: if false` to make reviews immutable
5. Add `reports` collection match block with `allow create` for signed-in users only
6. Add `allow read: if false` for reports (admin-only via SDK)
7. Update `users` match to allow updating `averageRating`, `totalRatings`, `blockedUsers` fields

### 1.2 Firestore Indexes Configuration
8. Open `firestore.indexes.json`
9. Add composite index: `reviews` collection with `revieweeId` (ASC) + `createdAt` (DESC)
10. Add composite index: `reviews` collection with `tripId` (ASC) for checking if trip is rated
11. Add composite index: `reports` collection with `reportedUserId` (ASC) + `status` (ASC)

### 1.3 Firebase Service Layer - Reviews Module
12. Create new file `services/firebase/reviews.js`
13. Add imports: `addDoc`, `collection`, `doc`, `getDoc`, `getDocs`, `query`, `where`, `orderBy`, `limit`, `runTransaction`, `serverTimestamp` from `firebase/firestore`
14. Import `db` from `../../firebaseConfig`
15. Create `submitRating` async function signature with params: `tripId`, `reviewerId`, `revieweeId`, `rating`, `reviewText`, `reviewerRole`
16. Inside `submitRating`, start a `runTransaction` block for atomicity
17. In transaction step 1: Read the trip document to verify it exists and status is 'completed'
18. In transaction step 2: Verify the reviewer hasn't already rated this trip (check `isRatedByDriver`/`isRatedByRider` based on role)
19. In transaction step 3: Read the reviewee's user document to get current `averageRating` and `totalRatings`
20. In transaction step 4: Calculate new average rating: `(currentAvg * totalRatings + newRating) / (totalRatings + 1)`
21. In transaction step 5: Create review document reference with `doc(collection(db, 'reviews'))`
22. In transaction step 6: Set the review document with all fields including `createdAt: serverTimestamp()`
23. In transaction step 7: Update trip document's rating flag (`isRatedByDriver` or `isRatedByRider`) to `true`
24. In transaction step 8: Check if both parties have now rated, update `bothPartiesRated` if true
25. In transaction step 9: Update reviewee's user document with new `averageRating` and incremented `totalRatings`
26. Return the created review object with generated ID
27. Create `getUserReviews` async function with params: `userId`, `limitCount = 10`
28. Build query: `collection(db, 'reviews')`, `where('revieweeId', '==', userId)`, `orderBy('createdAt', 'desc')`, `limit(limitCount)`
29. Execute query and map results to array with `id` field
30. Create `getTripReview` async function with params: `tripId`, `reviewerId`
31. Build query to check if a review exists for this trip/reviewer combination
32. Return the review if exists, null otherwise
33. Create `getUnratedTripsForUser` async function with param: `userId`
34. Query trips collection where user is participant, status is 'completed', and their rating flag is false
35. Return array of unrated trip IDs

### 1.4 Redux Reviews Slice
36. Create new file `store/slices/reviewsSlice.js`
37. Add imports for `createAsyncThunk`, `createSlice` from `@reduxjs/toolkit`
38. Import all functions from `services/firebase/reviews.js`
39. Define initial state: `{ userReviews: [], submitting: false, loading: false, error: null, unratedTrips: [] }`
40. Create `submitRatingThunk` async thunk with type `'reviews/submitRating'`
41. Implement thunk body calling `submitRating` service, wrapping in try/catch with `rejectWithValue`
42. Create `fetchUserReviewsThunk` async thunk with type `'reviews/fetchUserReviews'`
43. Implement thunk body calling `getUserReviews` service
44. Create `fetchUnratedTripsThunk` async thunk with type `'reviews/fetchUnratedTrips'`
45. Implement thunk body calling `getUnratedTripsForUser` service
46. Create `checkTripReviewThunk` async thunk with type `'reviews/checkTripReview'`
47. Implement thunk body calling `getTripReview` service
48. Create the slice with `createSlice`, name `'reviews'`
49. Add reducer `clearReviewsError` to reset error state
50. Add reducer `clearUserReviews` to reset userReviews array
51. Add `extraReducers` builder for `submitRatingThunk.pending` setting `submitting: true`
52. Add `extraReducers` builder for `submitRatingThunk.fulfilled` setting `submitting: false`
53. Add `extraReducers` builder for `submitRatingThunk.rejected` setting error and `submitting: false`
54. Add similar extraReducers for `fetchUserReviewsThunk` (pending, fulfilled, rejected)
55. Add similar extraReducers for `fetchUnratedTripsThunk`
56. Export actions and reducer

### 1.5 Register Reviews Slice in Store
57. Open `store/store.js`
58. Import `reviewsReducer` from `./slices/reviewsSlice`
59. Add `reviews: reviewsReducer` to the store's reducer configuration

### 1.6 StarRating Component
60. Create new file `components/StarRating.js`
61. Add imports: `React`, `useState` from 'react', `View`, `TouchableOpacity`, `StyleSheet` from 'react-native'
62. Import `Ionicons` from `@expo/vector-icons`
63. Import `Haptics` from `expo-haptics`
64. Define component props: `rating`, `maxStars = 5`, `size = 32`, `color = '#FFD700'`, `onRatingChange`, `disabled = false`
65. Create internal state `selectedRating` initialized from `rating` prop
66. Create `handlePress` function that takes star index, triggers haptic feedback, updates state, calls `onRatingChange`
67. Render a horizontal `View` container with `flexDirection: 'row'`
68. Map over `maxStars` array rendering `TouchableOpacity` for each star
69. Inside each TouchableOpacity, render `Ionicons` with `name` conditionally set to 'star' or 'star-outline'
70. Apply `disabled` prop to prevent interaction when readonly
71. Add StyleSheet for container and star spacing
72. Export component as default

---

## Phase 2: Rating UI Screen (Day 1-2, ~4 hours)

### 2.1 Rating Screen Setup
73. Create new file `app/rating/[tripId].js`
74. Add imports: `React`, `useState`, `useEffect` from 'react'
75. Import `View`, `Text`, `TextInput`, `TouchableOpacity`, `StyleSheet`, `ActivityIndicator`, `Alert`, `KeyboardAvoidingView`, `Platform`, `ScrollView` from 'react-native'
76. Import `SafeAreaView` from 'react-native-safe-area-context'
77. Import `useLocalSearchParams`, `router` from 'expo-router'
78. Import `useDispatch`, `useSelector` from 'react-redux'
79. Import fonts: `Montserrat_700Bold`, `useFonts` and `Lato_400Regular`
80. Import `StarRating` component
81. Import `submitRatingThunk`, `checkTripReviewThunk` from store
82. Import trip service function to get trip details

### 2.2 Rating Screen State & Data Loading
83. Extract `tripId` from `useLocalSearchParams()`
84. Get `user` from auth state selector
85. Get `submitting`, `error` from reviews state selector
86. Create local state: `rating` (default 0), `reviewText` (default ''), `trip` (default null), `loading` (default true), `otherUser` (default null), `userRole` (default null)
87. Create `useEffect` to fetch trip details on mount
88. Inside effect, call trip service to get trip by `tripId`
89. Determine user's role: if `trip.driverId === user.uid` then 'driver', else 'rider'
90. Determine other user ID: if driver then `trip.riderId`, else `trip.driverId`
91. Fetch other user's profile data (name, avatar)
92. Check if user has already rated this trip using `checkTripReviewThunk`
93. If already rated, show alert and navigate back
94. Set all state and `loading: false`

### 2.3 Rating Screen Submit Logic
95. Create `handleSubmit` async function
96. Validate rating is selected (1-5), show alert if not
97. Trim `reviewText` and validate max 500 characters
98. Dispatch `submitRatingThunk` with all parameters
99. Handle success: show success alert, navigate back or to home
100. Handle error: show error alert with message

### 2.4 Rating Screen UI Rendering
101. Add loading state check returning `ActivityIndicator` centered
102. Add font loading check
103. Render `SafeAreaView` with flex:1 and background color
104. Render `KeyboardAvoidingView` with platform-specific behavior
105. Render `ScrollView` for content
106. Add header section with title "Rate Your Trip"
107. Display other user's avatar (or placeholder) and name
108. Display trip date and route summary (origin → destination)
109. Render `StarRating` component with `onRatingChange` handler
110. Add "Tap to rate" helper text below stars
111. Add `TextInput` for optional review text with placeholder "Share your experience (optional)"
112. Style TextInput as multiline with 4-line height, border, rounded corners
113. Add character counter showing `${reviewText.length}/500`
114. Render submit button with conditional styling based on rating selection
115. Disable submit button if `submitting` or no rating selected
116. Show loading indicator on button when `submitting`
117. Add "Skip" link at bottom to navigate away without rating

### 2.5 Rating Screen Styles
118. Create StyleSheet with all necessary styles following app design system
119. Use `#1B4965` for primary color, `#5FA8D3` for secondary
120. Add shadow styles for cards
121. Ensure proper spacing and typography using Montserrat/Lato fonts

---

## Phase 3: Rating Integration Points (Day 2, ~6 hours)

### 3.1 Trip Completion Rating Prompt
122. Open `app/trip/[id].js`
123. Locate the `handleCompleteTrip` or similar function that marks trip as completed
124. After successful completion, determine the other party's name
125. Show `Alert.alert` with title "Trip Completed!", message asking to rate
126. Add "Rate Now" button that navigates to `/rating/${tripId}`
127. Add "Later" button that dismisses alert
128. Import and dispatch notification to other party about trip completion

### 3.2 Rider-Side Rating Prompt
129. In the same file, locate where rider sees completed status
130. Add `useEffect` that triggers when trip status changes to 'completed'
131. Check if current user has rated using trip's rating flags
132. If not rated, show similar rating prompt alert after short delay (2 seconds)

### 3.3 User Profile - Display Average Rating
133. Open `app/user/[id].js`
134. Locate where user profile data is displayed
135. Add import for `StarRating` component (readonly mode)
136. Find or create the user stats section
137. Add `View` containing `StarRating` component with `disabled={true}` showing user's `averageRating`
138. Add `Text` showing rating number and total count: "4.8 (24 ratings)"
139. Handle case where `totalRatings` is 0, show "No ratings yet"

### 3.4 User Profile - Reviews List
140. Add import for `fetchUserReviewsThunk` from reviews slice
141. Dispatch `fetchUserReviewsThunk` in the profile's useEffect with viewed user ID
142. Get `userReviews` from reviews state selector
143. Create reviews section with header "Recent Reviews"
144. If no reviews, show placeholder text
145. Map over reviews array rendering review cards
146. Each review card shows: star rating, review text (if any), reviewer name, date
147. Style review cards with consistent design

### 3.5 Own Profile - Display Rating
148. Open `app/(tabs)/profile.js`
149. Add import for `StarRating` component
150. Locate stats/info section of profile
151. Add rating display showing own average rating with star visualization
152. Add total ratings count and total trips completed
153. Optionally add "View my reviews" link that navigates to a reviews list

### 3.6 Rating Enforcement Before New Booking
154. Open `app/ride/request.js` (or the screen where users request seats)
155. Import `fetchUnratedTripsThunk` and `unratedTrips` selector
156. In component mount effect, dispatch `fetchUnratedTripsThunk` with user ID
157. Add check before allowing booking form submission
158. If `unratedTrips.length > 0`, show alert: "Please rate your previous trip first"
159. Alert includes "Rate Now" button navigating to `/rating/${unratedTrips[0]}`
160. Alert includes "Cancel" button dismissing
161. Prevent form submission until unrated trips are handled

---

## Phase 4: Review Card Component (Day 2, ~2 hours)

### 4.1 ReviewCard Component
162. Create new file `components/ReviewCard.js`
163. Add imports: React, View, Text, StyleSheet, Image from react-native
164. Import `StarRating` component
165. Import time formatting utility (or create inline)
166. Define props: `review` object containing all review fields
167. Create `formatDate` helper to convert Firestore timestamp to readable format
168. Render card container with shadow and rounded corners
169. Render header row with reviewer avatar (placeholder if none), name, and date
170. Render `StarRating` in readonly mode with the review's rating
171. Conditionally render review text if present
172. Add StyleSheet with card styling matching app design
173. Export component as default

### 4.2 Integrate ReviewCard in User Profile
174. Open `app/user/[id].js`
175. Import `ReviewCard` component
176. Replace the inline review rendering with `ReviewCard` component
177. Pass each review object as prop
178. Add "Show More" button if reviews exceed 3, linking to full reviews screen

---

## Phase 5: Safety Features - Report User (Day 3, ~4 hours)

### 5.1 Firebase Service Layer - Reports Module
179. Create new file `services/firebase/reports.js`
180. Add imports for Firestore functions and `db`
181. Define report reasons enum/constant: `REPORT_REASONS = ['inappropriate_behavior', 'safety_concern', 'fake_profile', 'harassment', 'spam', 'other']`
182. Create `submitReport` async function with params: `reporterId`, `reportedUserId`, `reason`, `description`, `relatedTripId = null`, `relatedReviewId = null`
183. Validate reason is in allowed list
184. Create report document in `reports` collection with all fields
185. Add `status: 'pending'`, `createdAt: serverTimestamp()`
186. Return created report ID
187. Create `hasUserReportedUser` async function to check for duplicate reports
188. Query reports where `reporterId` matches and `reportedUserId` matches and `status` is 'pending'
189. Return boolean indicating if report exists

### 5.2 Firebase Service Layer - Block User
190. In `services/firebase/users.js` (or create if needed), add `blockUser` function
191. Function params: `userId` (blocker), `blockedUserId` (blocked)
192. Use `arrayUnion` to add `blockedUserId` to user's `blockedUsers` array
193. Create `unblockUser` function with `arrayRemove`
194. Create `getBlockedUsers` function to fetch user's blocked list
195. Create `isUserBlocked` helper function

### 5.3 Redux Safety Slice
196. Create new file `store/slices/safetySlice.js`
197. Add imports for createAsyncThunk, createSlice
198. Import report and block service functions
199. Define initial state: `{ submitting: false, error: null, blockedUsers: [] }`
200. Create `submitReportThunk` async thunk
201. Create `blockUserThunk` async thunk
202. Create `unblockUserThunk` async thunk
203. Create `fetchBlockedUsersThunk` async thunk
204. Create slice with name 'safety'
205. Add reducers for clearing error
206. Add extraReducers for all thunks (pending, fulfilled, rejected)
207. Export actions and reducer

### 5.4 Register Safety Slice in Store
208. Open `store/store.js`
209. Import `safetyReducer` from `./slices/safetySlice`
210. Add `safety: safetyReducer` to store configuration

### 5.5 ReportModal Component
211. Create new file `components/ReportModal.js`
212. Add imports: React, useState, View, Text, Modal, TouchableOpacity, TextInput, StyleSheet, ScrollView, Alert
213. Import `Ionicons` for icons
214. Define props: `visible`, `onClose`, `onSubmit`, `reportedUserName`
215. Create local state: `selectedReason` (null), `description` ('')
216. Define report reasons array with labels: `[{ id: 'inappropriate_behavior', label: 'Inappropriate Behavior' }, ...]`
217. Create `handleSubmit` function validating reason selected and description if 'other'
218. Render `Modal` with `transparent` and `animationType="slide"`
219. Render overlay background with semi-transparent black
220. Render modal content container with white background, rounded corners
221. Add header with title "Report User" and close X button
222. Add subtitle explaining report purpose
223. Render reason selection as list of radio-button-style TouchableOpacity items
224. Highlight selected reason with primary color
225. Render TextInput for additional description with placeholder
226. Render submit button, disabled if no reason selected
227. Render cancel button
228. Add StyleSheet for all elements
229. Export component

---

## Phase 6: Safety Features - Block User (Day 3, ~2 hours)

### 6.1 Block User Confirmation Flow
230. Create helper function `showBlockConfirmation` in a utils file or inline
231. Function shows Alert.alert with title, message explaining consequences
232. Consequences: won't see their rides, they won't see yours, existing chats archived
233. Add "Block" destructive button triggering block action
234. Add "Cancel" button dismissing

### 6.2 Integrate Report/Block in User Profile
235. Open `app/user/[id].js`
236. Import `ReportModal` component
237. Import `submitReportThunk`, `blockUserThunk` from safety slice
238. Add state: `reportModalVisible` (false)
239. Check if viewing own profile - don't show report/block options
240. Add "More Options" button (three dots icon) in header or below profile info
241. On press, show ActionSheet or custom menu with "Report User", "Block User" options
242. "Report User" sets `reportModalVisible: true`
243. Render `ReportModal` with visibility state, user name, handlers
244. `onSubmit` handler dispatches `submitReportThunk`, shows success alert, closes modal
245. "Block User" calls block confirmation, on confirm dispatches `blockUserThunk`
246. After blocking, show success alert and navigate back to home
247. Add visual indicator if user is already blocked (show "Unblock" option instead)

### 6.3 Integrate Report in Trip Details
248. Open `app/trip/[id].js`
249. Import `ReportModal` component and safety thunks
250. Add `reportModalVisible` state
251. Determine the other party in the trip
252. Add report option accessible from trip actions (gear icon menu or similar)
253. Include `relatedTripId` when submitting report from trip context
254. Handle same flow as user profile

---

## Phase 7: Block User Feed Filtering (Day 3, ~2 hours)

### 7.1 Fetch Blocked Users on App Load
255. Open `hooks/AuthContext.js` or main app layout
256. After user authentication confirmed, dispatch `fetchBlockedUsersThunk`
257. Store blocked users in Redux state

### 7.2 Filter Ride Feed
258. Open `app/(tabs)/home.js` (ride feed screen)
259. Import `blockedUsers` selector from safety slice
260. In the feed data processing, add filter step
261. Filter out rides where `ride.driverId` is in `blockedUsers` array
262. Apply filter before rendering ride list
263. Ensure filter runs reactively when blockedUsers changes

### 7.3 Filter Search Results
264. Locate any ride search functionality
265. Apply same `blockedUsers` filter to search results
266. Ensure blocked users' rides don't appear in any listing

### 7.4 Filter Message List
267. Open `app/(tabs)/messages.js`
268. Import blocked users selector
269. Optionally filter or mark conversations with blocked users
270. Consider showing "User blocked" indicator instead of hiding completely

---

## Phase 8: Push Notifications - Rating Reminders (Day 4, ~4 hours)

### 8.1 Review Notification Service Structure
271. Open `services/notifications/pushNotifications.js`
272. Verify `sendPushNotificationAsync` function exists and works
273. Ensure notification payload structure supports `data` field for deep linking

### 8.2 Add Rating Reminder Notification Type
274. Open `services/firebase/notifications.js` (or create)
275. Create `sendRatingReminderNotification` function
276. Params: `userId`, `tripId`, `otherUserName`
277. Get user's push tokens using `getUserPushTokens`
278. Construct notification: title "Rate Your Trip!", body "How was your ride with {name}?"
279. Include `data: { type: 'rating_reminder', tripId }` for deep linking
280. Call `sendPushNotificationAsync` with tokens and payload

### 8.3 Trigger Rating Reminder on Trip Completion
281. Open `services/firebase/trips.js`
282. Locate `updateTripStatus` or `completeTrip` function
283. After status updated to 'completed', call `sendRatingReminderNotification`
284. Send to both driver and rider with appropriate other user name

### 8.4 Handle Rating Reminder Notification Tap
285. Open `app/_layout.js` or notification handler setup
286. Locate notification response handler (tap handler)
287. Check if `notification.data.type === 'rating_reminder'`
288. Extract `tripId` from notification data
289. Navigate to `/rating/${tripId}` using router

---

## Phase 9: Push Notifications - Trip Reminders (Day 4-5, ~6 hours)

### 9.1 Local Scheduled Notifications Approach
290. Since Cloud Functions require paid tier, implement local scheduling
291. Create new file `services/notifications/tripReminders.js`
292. Import `Notifications` from 'expo-notifications'
293. Create `scheduleTripReminder` function
294. Params: `tripId`, `tripDateTime`, `destination`, `reminderType` ('24h' or '2h')

### 9.2 Schedule 24-Hour Reminder
295. In `scheduleTripReminder`, calculate trigger time: `tripDateTime - 24 hours`
296. If trigger time is in the past, skip scheduling
297. Create notification content: title "Trip Tomorrow!", body "Your ride to {destination} is tomorrow"
298. Include `data: { type: 'trip_reminder', tripId }`
299. Use `Notifications.scheduleNotificationAsync` with date trigger
300. Return scheduled notification identifier for cancellation

### 9.3 Schedule 2-Hour Reminder
301. Calculate trigger time: `tripDateTime - 2 hours`
302. If trigger time is in the past, skip scheduling
303. Create notification content: title "Trip in 2 Hours!", body "Don't forget your ride to {destination}"
304. Include `data: { type: 'trip_reminder', tripId }`
305. Schedule notification with date trigger
306. Return identifier

### 9.4 Cancel Trip Reminders
307. Create `cancelTripReminders` function
308. Params: array of notification identifiers
309. Loop through and call `Notifications.cancelScheduledNotificationAsync` for each

### 9.5 Store Scheduled Notification IDs
310. When scheduling reminders, store notification IDs in trip document
311. Add fields `reminder24hId`, `reminder2hId` to trip document
312. On trip cancellation, retrieve IDs and cancel notifications

### 9.6 Integrate Reminder Scheduling
313. Open `services/firebase/trips.js`
314. In trip creation/confirmation flow, after trip is confirmed
315. Calculate trip departure datetime
316. Call `scheduleTripReminder` for 24h reminder for rider
317. Call `scheduleTripReminder` for 2h reminder for rider
318. Optionally schedule reminders for driver too
319. Store returned notification IDs in trip document

### 9.7 Cancel Reminders on Trip Cancellation
320. In trip cancellation function, before or after status update
321. Retrieve notification IDs from trip document
322. Call `cancelTripReminders` with IDs
323. Clear the ID fields in trip document

### 9.8 Handle Trip Reminder Notification Tap
324. In notification response handler (app/_layout.js)
325. Check if `notification.data.type === 'trip_reminder'`
326. Extract `tripId` from data
327. Navigate to `/trip/${tripId}`

---

## Phase 10: Notification Deep Linking Polish (Day 5, ~3 hours)

### 10.1 Consolidate Notification Handler
328. Open `app/_layout.js`
329. Create unified `handleNotificationResponse` function
330. Switch on `notification.data.type` to handle all notification types
331. Cases: 'rating_reminder', 'trip_reminder', 'new_message', 'request_received', 'request_accepted', 'request_declined', 'trip_status'
332. Each case navigates to appropriate screen with correct params

### 10.2 Handle Notification When App in Background
333. Ensure notification handler is registered for background responses
334. Use `Notifications.addNotificationResponseReceivedListener`
335. Handler should work whether app was killed or in background

### 10.3 Handle Notification When App in Foreground
336. Ensure foreground notification display using `Notifications.setNotificationHandler`
337. Configure `shouldShowAlert: true`, `shouldPlaySound: true`, `shouldSetBadge: true`
338. Optionally show in-app banner for certain notification types

### 10.4 Test Deep Link Navigation States
339. Test navigation when navigating from different screens
340. Ensure stack is properly set up so back navigation works correctly
341. Handle edge case where destination screen requires auth

---

## Phase 11: UI Polish & Edge Cases (Day 5, ~3 hours)

### 11.1 Rating Screen Edge Cases
342. Handle case where trip doesn't exist (deleted) - show error, navigate back
343. Handle case where other user account deleted - show generic "User" name
344. Handle network errors gracefully with retry option
345. Add haptic feedback on star selection
346. Add subtle animation when stars are selected

### 11.2 Review Display Edge Cases
347. Handle very long review text - truncate with "Read more" expansion
348. Handle review without text - show only stars
349. Handle deleted reviewer account - show "Anonymous User"
350. Format dates relatively: "2 days ago", "Last week", etc.

### 11.3 Report/Block Edge Cases
351. Prevent reporting/blocking yourself
352. Prevent duplicate pending reports for same user
353. Show feedback when report submitted successfully
354. Handle network errors in report submission
355. Confirm block action with clear consequences explanation

### 11.4 Notification Edge Cases
356. Handle expired push tokens - remove invalid tokens
357. Handle notification permissions denied - show prompt to enable
358. Handle scheduling notifications for past times - skip gracefully
359. Clear notification badge count when app opened

---

## Phase 12: Testing & Validation (Day 5, ~2 hours)

### 12.1 Rating System Testing Checklist
360. Test submitting 1-5 star ratings
361. Test submitting rating with and without review text
362. Verify average rating updates correctly on user profile
363. Verify rating count increments
364. Test rating prompt appears after trip completion
365. Test cannot rate same trip twice
366. Test rating enforcement blocks new bookings when unrated trip exists

### 12.2 Safety Features Testing Checklist
367. Test report submission with all reason types
368. Test report with "other" reason requires description
369. Test block user removes their rides from feed
370. Test unblock user restores their rides in feed
371. Test blocked user cannot see blocker's rides (requires two test accounts)

### 12.3 Notification Testing Checklist
372. Test rating reminder received after trip completion
373. Test tapping rating reminder opens rating screen
374. Test 24h trip reminder received (may need to adjust time for testing)
375. Test 2h trip reminder received
376. Test tapping trip reminder opens trip details
377. Test reminder cancellation when trip cancelled

---

## Data Models Reference

### New: `reviews` Collection
```javascript
reviews/{reviewId}
{
  reviewId: 'auto-generated',
  tripId: 'reference-to-trip',
  reviewerId: 'userId-who-wrote-review',
  revieweeId: 'userId-being-reviewed',
  reviewerRole: 'driver' | 'rider',
  
  rating: 1-5,  // Integer
  reviewText: 'Optional text review (max 500 chars)',
  
  isPublic: true,
  createdAt: Timestamp,
  
  isReported: false,
  reportCount: 0,
  isHidden: false
}
```

### New: `reports` Collection
```javascript
reports/{reportId}
{
  reportId: 'auto-generated',
  reporterId: 'userId-who-reported',
  reportedUserId: 'userId-being-reported',
  
  reason: 'inappropriate_behavior' | 'safety_concern' | 'fake_profile' | 'harassment' | 'spam' | 'other',
  description: 'User provided description',
  relatedTripId: 'tripId or null',
  relatedReviewId: 'reviewId or null',
  
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed',
  createdAt: Timestamp,
  reviewedAt: Timestamp | null,
  reviewedBy: 'admin userId | null',
  resolution: 'string | null'
}
```

### Updated: `users` Collection (New Fields)
```javascript
{
  // Existing fields...
  
  // NEW for Week 7:
  averageRating: 0.0,      // Float, computed from reviews
  totalRatings: 0,         // Integer, count of reviews received
  blockedUsers: [],        // Array of userIds
  totalTripsCompleted: 0,  // Counter
}
```

### Updated: `trips` Collection (New Fields)
```javascript
{
  // Existing fields...
  
  // NEW for Week 7:
  isRatedByDriver: false,
  isRatedByRider: false,
  bothPartiesRated: false,
  reminder24hId: 'notification-id or null',
  reminder2hId: 'notification-id or null'
}
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `app/rating/[tripId].js` | Rating submission screen |
| `store/slices/reviewsSlice.js` | Reviews state management |
| `store/slices/safetySlice.js` | Safety (reports/blocks) state management |
| `services/firebase/reviews.js` | Reviews Firestore operations |
| `services/firebase/reports.js` | Reports Firestore operations |
| `components/StarRating.js` | Reusable star rating component |
| `components/ReviewCard.js` | Display single review |
| `components/ReportModal.js` | Report user modal |

---

## Files to Modify

| File | Changes |
|------|---------|
| `firestore.rules` | Add reviews, reports rules; update users rules |
| `firestore.indexes.json` | Add composite indexes for reviews, reports |
| `store/store.js` | Register reviews and safety reducers |
| `services/firebase/users.js` | ✅ Already created with blockUser, unblockUser functions |
| `services/firebase/firestore.js` | ✅ Already updated with trip status functions; add rating reminder trigger |
| `services/notifications/tripReminders.js` | ✅ Already exists; may need minor updates |
| `app/trip/[id].js` | Rating prompt after completion, report button |
| `app/user/[id].js` | Rating display, reviews list, report/block buttons |
| `app/(tabs)/profile.js` | Display own rating and stats |
| `app/(tabs)/home.js` | Filter blocked users from feed |
| `app/(tabs)/messages.js` | Handle blocked users in message list |
| `app/ride/request.js` | Rating enforcement check |
| `app/_layout.js` | Notification deep linking handlers |
| `hooks/AuthContext.js` | Fetch blocked users on auth |

---

## Further Considerations

### Cloud Functions for Reliable Reminders
Local scheduling requires app to be running when scheduling. For production reliability, consider Firebase Cloud Functions (requires Blaze plan) or a cron-based backend service. For MVP, local scheduling is acceptable.

### Review Moderation System
Currently reports go to a collection but there's no admin UI. Consider adding an admin dashboard in a future phase, or use Firebase Console to manually review reports.

### Rating Tags/Categories
The roadmap mentions optional tags like "punctual", "friendly". This could be added as a future enhancement (~4 hours additional work).

### Offline Support
Consider caching reviews locally for offline viewing. Rating submission should queue if offline and sync when online.

---

## Progress Tracking

Use this checklist to track implementation progress:

- [x] Phase 0: Prerequisites Verification & Setup
- [x] Phase 1: Rating System Core Infrastructure
- [x] Phase 2: Rating UI Screen
- [x] Phase 3: Rating Integration Points
- [x] Phase 4: Review Card Component
- [ ] Phase 5: Safety Features - Report User
- [ ] Phase 6: Safety Features - Block User
- [ ] Phase 7: Block User Feed Filtering
- [ ] Phase 8: Push Notifications - Rating Reminders
- [ ] Phase 9: Push Notifications - Trip Reminders
- [ ] Phase 10: Notification Deep Linking Polish
- [ ] Phase 11: UI Polish & Edge Cases
- [ ] Phase 12: Testing & Validation

---

*Document Created: January 2, 2026*  
*Last Updated: January 2, 2026*
