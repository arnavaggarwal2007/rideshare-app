# Phase 1-4 End-to-End Testing Guide
## Complete Rating & Review System Verification

This guide provides comprehensive test scenarios to verify all Phase 1-4 features are working correctly.

---

## Test Environment Setup
1. **Prerequisites**: Two test user accounts (User A = Rider, User B = Driver)
2. **Database State**: Clear any existing trips/reviews for clean testing
3. **Network**: Ensure real-time Firestore sync is working
4. **Device**: Test on both iOS and Android if possible

---

## Test Scenario 1: Complete Trip & Rating Flow

### Step 1.1: Verify Trip Completion
**File**: `app/(tabs)/my-trips.js`

**Test**:
1. User A (Rider) creates a trip requesting a ride
2. User B (Driver) accepts the trip
3. User B marks trip as "Completed" from my-trips page
4. Verify trip status changes to "Completed" with badge showing "Trip Completed" in red

**Expected Result**: Trip shows completion status, driver can now rate

---

### Step 1.2: Verify Rating Prompt (Driver)
**File**: `app/rating/[tripId].js`, `app/(tabs)/my-trips.js`

**Test**:
1. User B (Driver) should see a **red "UNRATED" badge** on the completed trip
2. Tap the trip to open trip details modal
3. Verify **alert pops up** asking to rate the trip before continuing
4. Alert should say: "Please rate this trip before making new bookings"

**Expected Result**: Alert prevents navigation until user agrees to rate

---

### Step 1.3: Navigate to Rating Screen
**File**: `app/rating/[tripId].js`

**Test**:
1. From my-trips, tap "Rate Now" or tap completed trip with "UNRATED" badge
2. Rating screen loads with:
   - **Trip details** showing: "📍 [pickup], Address → 🏁 [dropoff], Address"
   - **Star rating selector** (5 empty stars, interactive)
   - **Review text input** (optional, max 500 characters)
   - **Submit button**

**Expected Result**: Screen displays correctly with proper address formatting (e.g., "1003, Calboro Drive → 330, De Neve Drive")

---

### Step 1.4: Test Star Rating Selection
**File**: `components/StarRating.js`

**Test**:
1. Tap each star (1-5) to select rating
2. Verify:
   - Stars fill in order
   - Haptic feedback triggers (light vibration)
   - Rating value updates in real-time
   - Can change rating by tapping different stars

**Expected Result**: Stars respond to taps with visual feedback and haptics

---

### Step 1.5: Submit Rating
**File**: `app/rating/[tripId].js`, `store/slices/reviewsSlice.js`

**Test**:
1. Select 4-5 stars
2. (Optional) Add review text: "Great driver, safe ride"
3. Tap "Submit Rating"
4. Verify:
   - Loading spinner shows briefly
   - Screen navigates back to my-trips
   - **UNRATED badge disappears** from trip
   - Rating submission succeeds

**Expected Result**: Trip marked as rated, user can make new bookings

---

### Step 1.6: Verify Rating Stored in Firestore
**Files**: `firebaseConfig.js`, Firestore Console

**Test**:
1. Open Firestore Console
2. Navigate to `reviews` collection
3. Find document with:
   - `tripId`: Matches the rated trip
   - `ratedBy`: User B's ID
   - `ratedUser`: User A's ID
   - `rating`: 4 or 5 (your selection)
   - `reviewText`: Your review text
   - `reviewerRole`: "driver"

**Expected Result**: Review document exists with correct data

---

## Test Scenario 2: User Profile Rating Display

### Step 2.1: View Own Profile Rating Stats
**File**: `app/(tabs)/profile.js`

**Test**:
1. User A (Rider) opens profile from bottom tabs
2. Under name/email, verify rating section shows:
   - **Star visualization** (filled stars matching average rating)
   - **"4.8 (2 reviews)" or similar** (number depends on existing ratings)
   - **"X trips completed"** counter

**Expected Result**: Own profile displays rating stats accurately

---

### Step 2.2: Receive a Rating & Check Profile Update
**File**: `app/user/[id].js`

**Test**:
1. User B (Driver) rates User A (Rider) with 5 stars
2. User A receives notification or manually refreshes profile
3. Average rating updates on User A's own profile
4. Verify calculation: (previous_total_rating + 5) / (previous_total_ratings + 1)

**Expected Result**: Rating immediately reflects on own profile after rating submission

---

### Step 2.3: View Another User's Profile
**File**: `app/user/[id].js`

**Test**:
1. From chat or ride details, tap on another user's profile
2. Verify other user profile shows:
   - Their **average rating with stars**
   - **Rating count**: "4.8 (2 reviews)"
   - **Details, Preferences sections**
   - **Reviews section** with individual review cards

**Expected Result**: Other user profile displays all rating information

---

## Test Scenario 3: Reviews Display & ReviewCard Component

### Step 3.1: Verify ReviewCard Display
**Files**: `components/ReviewCard.js`, `app/user/[id].js`

**Test**:
1. View a user profile with existing reviews
2. Each review should display:
   - **Reviewer avatar** (profile image or placeholder icon)
   - **Reviewer name** (clickable - blue color)
   - **"as Driver" or "as Rider"** label
   - **Date posted** (e.g., "2 days ago", "Today")
   - **Star rating** with numeric value (e.g., "★★★★★ 5.0")
   - **Review text** (if provided, styled in gray)

**Expected Result**: ReviewCard component renders all review information clearly

---

### Step 3.2: Navigate to Reviewer Profile
**File**: `components/ReviewCard.js`

**Test**:
1. View a review card on another user's profile
2. Tap the reviewer's name or avatar
3. Verify:
   - Navigation to `/user/[reviewerId]` succeeds
   - Reviewer's profile loads with their rating stats
   - Can navigate back and return to original profile

**Expected Result**: Profile navigation works from review cards

---

### Step 3.3: Own Profile Reviews Section
**File**: `app/(tabs)/profile.js`

**Test**:
1. User A opens own profile
2. User A should see:
   - **Rating section** with star display and stats (from Step 2.1)
   - *(Optional)* Reviews section below rating stats if implemented
3. If reviews section exists:
   - Shows all reviews received
   - Each uses ReviewCard component
   - Can click reviewer name to view their profile

**Expected Result**: Own profile displays ratings (required) and optionally reviews

---

## Test Scenario 4: Rating Enforcement & Validation

### Step 4.1: Verify Rating Required Before New Bookings
**Files**: `app/ride/[id].js`, `store/slices/tripsSlice.js`

**Test**:
1. User B (Driver) completes another trip without rating
2. User B tries to create a new ride request
3. Verify:
   - Alert shows: "You have unrated trips. Please rate them before booking"
   - Booking is **prevented** until rating is submitted
   - User is prompted to go to my-trips to rate

**Expected Result**: System prevents new bookings until all trips are rated

---

### Step 4.2: Verify Rating Validation (1-5 stars)
**File**: `app/rating/[tripId].js`

**Test**:
1. Open rating screen for a trip
2. Try to submit with **0 stars** (no selection)
3. Verify alert shows: "Please select a rating" or submit is disabled
4. Select 3 stars and submit successfully

**Expected Result**: Form validates that rating is 1-5 before submission

---

### Step 4.3: Verify Review Text Validation
**File**: `app/rating/[tripId].js`

**Test**:
1. Open rating screen
2. Select 4 stars
3. Enter review text **over 500 characters**
4. Verify:
   - Character counter shows: "X/500"
   - Submit button disabled or text truncated
5. Delete text to under 500 chars and submit

**Expected Result**: Review text has 500 character limit enforced

---

## Test Scenario 5: Data Consistency & Real-Time Updates

### Step 5.1: Cross-Device Rating Visibility
**Setup**: Two devices/browsers logged in as different users

**Test**:
1. Device A (User A) opens profile showing current rating (e.g., 4.5)
2. Device B (User B) rates User A with 5 stars
3. Device A doesn't manually refresh but waits 2-3 seconds
4. Verify Device A's profile **auto-updates** via Firestore real-time listener

**Expected Result**: Rating updates appear within 2-3 seconds on real-time listener

---

### Step 5.2: Review Appears on User Profile After Submission
**Files**: `app/rating/[tripId].js`, `store/slices/reviewsSlice.js`

**Test**:
1. User B submits rating with review text: "Excellent communication!"
2. User A navigates to User B's profile (or vice versa)
3. Verify **new review appears** in Reviews section as ReviewCard
4. Verify review shows correct:
   - Rating stars
   - Reviewer name
   - Review text
   - Date posted

**Expected Result**: Submitted reviews immediately visible on rated user's profile

---

### Step 5.3: Address Formatting Consistency
**Files**: `app/rating/[tripId].js`, `app/(tabs)/my-trips.js`, `app/chat/[id].js`

**Test**:
1. Check rating screen - trip shows: "1003, Calboro Drive → 330, De Neve Drive"
2. Check my-trips page - same trip shows: "1003, Calboro Drive"
3. Check chat - trip context shows: "1003, Calboro Drive"
4. Verify all addresses use format: "[number], [street]" not just street name

**Expected Result**: All pages format addresses consistently (first two meaningful parts)

---

## Test Scenario 6: Error Handling

### Step 6.1: Handle Network Errors During Rating
**Setup**: Enable airplane mode or disable network

**Test**:
1. On rating screen with network off, tap "Submit Rating"
2. Verify:
   - Error message shows (after timeout)
   - "Please check your internet connection"
   - Can retry submission once network restored

**Expected Result**: Graceful error handling without app crash

---

### Step 6.2: Handle Missing User Data
**Files**: `app/user/[id].js`

**Test**:
1. Navigate to `/user/[nonexistent-user-id]`
2. Verify:
   - Loading spinner shows briefly
   - "User not found" message appears
   - Can navigate back

**Expected Result**: App doesn't crash, shows user-friendly message

---

### Step 6.3: Handle Firestore Permissions Errors
**Setup**: View Firestore rules - reviews collection requires authentication

**Test**:
1. Log out of app
2. Try to submit review (if possible before auth check)
3. Verify:
   - Firestore permission denied error caught
   - User prompted to sign in

**Expected Result**: Security rules enforced without exposing errors

---

## Test Scenario 7: UI/UX Verification

### Step 7.1: Responsive Star Rating Display
**File**: `components/StarRating.js`

**Test** (on different screen sizes):
1. Rating page with 5 large stars (32px)
2. Profile page with smaller stars (20px)
3. ReviewCard with small stars (16px)
4. Verify all sizes are proportional and readable

**Expected Result**: Star rating looks good on all screen sizes

---

### Step 7.2: Text Truncation in ReviewCard
**File**: `components/ReviewCard.js`

**Test**:
1. Add very long review text (300+ characters)
2. View on ReviewCard in profile
3. Verify:
   - Review text shows in full on profile page
   - Compact mode (if used) truncates with "..."
   - Text is readable with proper line-height

**Expected Result**: Text displays elegantly without UI breaking

---

### Step 7.3: Loading States
**Files**: `app/user/[id].js`, `app/rating/[tripId].js`

**Test**:
1. Navigation to user profile - loading spinner shows
2. Rating submission - loading overlay shows
3. Verify spinners are visible, styled, and disappear after completion

**Expected Result**: Loading states improve perceived performance

---

## Test Scenario 8: Edge Cases

### Step 8.1: Zero Ratings Case
**Setup**: New user with no ratings

**Test**:
1. View new user's profile
2. Verify:
   - No rating section shown (or shows "No ratings yet")
   - Reviews section shows "No reviews yet" with icon
   - App doesn't crash

**Expected Result**: Graceful handling of no-ratings state

---

### Step 8.2: Single Review Case
**Setup**: User with exactly 1 review

**Test**:
1. View profile of user with 1 review
2. Verify:
   - Rating shows: "X.0 (1 review)" - correct singular
   - 1 ReviewCard displays
   - Stats show "1 trip completed"

**Expected Result**: Singular/plural handling correct

---

### Step 8.3: Rate Same User Multiple Times
**Setup**: Multiple trips with same driver/rider pair

**Test**:
1. User A and B have 3 completed trips together
2. User B rates all 3 trips with different ratings: 5, 4, 3
3. Check User A's profile
4. Verify:
   - Average rating = (5+4+3)/3 = 4.0
   - "4.0 (3 reviews)" displayed
   - All 3 reviews visible in Reviews section

**Expected Result**: Multiple reviews from same person aggregate correctly

---

## Test Checklist

### Phase 1: Rating System Core Infrastructure
- [ ] Firestore `reviews` collection exists with proper security rules
- [ ] User documents have `averageRating`, `totalRatings`, `totalTripsCompleted` fields
- [ ] Redux `reviewsSlice` exports actions and thunks
- [ ] `StarRating` component renders correctly

### Phase 2: Rating UI Screen
- [ ] `/app/rating/[tripId].js` loads with trip info
- [ ] Address formatting shows correctly (e.g., "1003, Calboro Drive")
- [ ] Star selector is interactive with haptic feedback
- [ ] Review text input validates character count
- [ ] Submit button submits rating to Firestore

### Phase 3: Rating Integration & User Profiles
- [ ] Trip completion shows "UNRATED" badge on driver's my-trips
- [ ] Alert prompts for rating before allowing new bookings
- [ ] Other user profiles display rating with stars and count
- [ ] **Own profile displays rating stats** (Phase 3.5) ✅
- [ ] Reviews appear as ReviewCard components

### Phase 4: ReviewCard Component
- [ ] ReviewCard displays: avatar, name, role, date, stars, review text
- [ ] Reviewer name is clickable and navigates to their profile
- [ ] ReviewCard appears on user profiles
- [ ] Compact mode works if implemented

### Additional Checks
- [ ] Address formatting consistent across all pages
- [ ] Real-time updates work for ratings/reviews
- [ ] Error messages are user-friendly
- [ ] App doesn't crash on edge cases
- [ ] Firestore security rules properly enforced
- [ ] All fonts and styling match design system

---

## Common Issues & Troubleshooting

### Issue: "User not found" when viewing profile from chat
**Solution**: Ensure otherParticipant includes `uid` field in chat/[id].js

### Issue: Reviews not displaying on profile
**Solution**: Check Redux selector uses `Array.isArray()` not array indexing

### Issue: Address shows only street name instead of full format
**Solution**: Use `getLocationShortName()` to extract first two address parts

### Issue: Rating stats not showing on own profile
**Solution**: Ensure `userProfile` from Redux auth slice has `averageRating` populated

### Issue: Star rating not interactive
**Solution**: Verify `disabled={false}` on rating page, `disabled={true}` on profile page

---

## Performance Notes
- **Firestore Indexing**: Ensure composite index exists for reviews queries (see `firestore.indexes.json`)
- **Real-time Listeners**: Reviews subscription should unsubscribe on component unmount
- **Image Loading**: Avatar images load efficiently; use placeholder on error

---

## Next Steps After Phase 1-4
Once all tests pass:
1. Proceed to **Phase 5**: Report Modal & Dispute Resolution
2. Implement user reporting feature for problematic drivers/riders
3. Add dispute resolution workflow for rating appeals
4. Add admin dashboard for review moderation

