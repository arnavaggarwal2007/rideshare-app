# Phase 1-4 System Architecture

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     RATING & REVIEW SYSTEM                          │
└─────────────────────────────────────────────────────────────────────┘

PHASE 1: INFRASTRUCTURE
═══════════════════════

    Redux Store (reviewsSlice)
    ├── State: reviews[], userReviews[], loading, error
    ├── Actions: submitRating, fetchUserReviews
    └── Thunks: submitRatingThunk, fetchUserReviewsThunk

              ↓ (async operations)

    Firestore Database
    ├── reviews collection
    │   ├── ratedBy (user ID)
    │   ├── ratedUser (user ID)
    │   ├── tripId
    │   ├── rating (1-5)
    │   ├── reviewText (optional)
    │   ├── reviewerRole (driver/rider)
    │   └── createdAt (timestamp)
    │
    └── users collection
        ├── averageRating (calculated)
        ├── totalRatings (count)
        └── totalTripsCompleted (count)

              ↓ (service layer)

    services/reviews.js
    ├── submitReview(reviewData)
    ├── fetchUserReviews(userId)
    └── checkIfTripReviewed(tripId)


PHASE 2: RATING SUBMISSION
══════════════════════════

    app/rating/[tripId].js
    ├── Displays trip info
    ├── Interactive StarRating component
    ├── Review text input
    └── Submit button
        └─→ Calls submitRatingThunk
            └─→ Validates data
                └─→ Calls submitReview()
                    └─→ Stores in Firestore
                        └─→ Updates user stats
                            └─→ Trip marked as reviewed


PHASE 3: INTEGRATION & DISPLAY
═══════════════════════════════

    TRIP COMPLETION FLOW:
    ─────────────────────
    Trip marked "Completed"
        ↓
    Check if rated → No?
        ↓
    Show "UNRATED" badge on my-trips
        ↓
    User tries new booking
        ↓
    Alert: "Rate this trip first"
        ↓
    Prevent booking
        ↓
    User rates trip
        ↓
    Badge removed, can book now

    PROFILE DISPLAY FLOW:
    ────────────────────
    View Other User Profile (app/user/[id].js)
        ├── Fetch user data from Firestore
        ├── Fetch user reviews from Firestore
        ├── Display rating section
        │   ├── StarRating component
        │   ├── "4.8 (2 reviews)"
        │   └── "2 trips completed"
        └── Display reviews section
            └── Map reviews → ReviewCard components
                └── Tap reviewer name → View their profile

    View Own Profile (app/(tabs)/profile.js) ⭐ NEW
        ├── Get userProfile from Redux
        ├── Check averageRating > 0
        ├── Display rating section (if rated)
        │   ├── StarRating component (readonly)
        │   ├── "4.8 (2 reviews)"
        │   └── "2 trips completed"
        └── Display Details, Preferences, Buttons


PHASE 4: REVIEW DISPLAY
═══════════════════════

    ReviewCard Component (components/ReviewCard.js)
    ├── Header
    │   ├── Avatar → Tap to view profile
    │   ├── Name → Clickable
    │   └── Date (relative)
    ├── Rating
    │   ├── Stars (readonly)
    │   └── Numeric value (e.g., 4.0)
    └── Review text (if exists)

    Used on:
    - Other user profiles (reviews section)
    - Potentially own profile (future)


SUPPORTING: COMPONENTS
══════════════════════

    StarRating (components/StarRating.js)
    ├── Interactive mode (rating selection)
    │   ├── Tap star → Set rating
    │   ├── Haptic feedback
    │   └── Callback to parent
    └── Display mode (readonly)
        ├── Show current rating
        └── No interaction

    Used on:
    - Rating submission screen (interactive)
    - Other user profile (readonly)
    - Own profile (readonly)
    - ReviewCard (readonly)
```

---

## Feature Interaction Map

```
┌──────────────────────────────────────────────────────────────┐
│                     USER JOURNEYS                             │
└──────────────────────────────────────────────────────────────┘

JOURNEY 1: RATE A COMPLETED TRIP
──────────────────────────────────

User A (Rider)           User B (Driver)
    │                        │
    ├─ Requests ride ────────┤
    │                        │
    ├◄───── Accepts ─────────┤
    │                        │
    ├─ Trip in progress ────►│
    │                        │
    │                    Marks "Completed"
    │                        │
    │                   Shows "UNRATED" badge
    │                        │
    │                   Creates new booking attempt
    │                        │
    │                   Alert: "Rate first"
    │                        │
    │                   Taps "Rate Now"
    │                        │
    │                   app/rating/[tripId]
    │                        │
    │                   Selects ★★★★★ (5)
    │                   Adds review text
    │                        │
    │                   Submits rating
    │                        │
    │      ↓ Firestore updates ↓
    │   reviews collection:
    │   - tripId: "trip-123"
    │   - ratedBy: "userB"
    │   - ratedUser: "userA"
    │   - rating: 5
    │   - reviewText: "Great rider!"
    │
    │   users collection:
    │   - User A: averageRating = 5.0, totalRatings = 1
    │
    │   trips collection:
    │   - Trip: hasBeenReviewed = true
    │                        │
    │                   Badge disappears
    │                   Can create new bookings
    │
    ├─ Reviews own profile
    │  (app/(tabs)/profile.js)
    │  - Shows: ★★★★★ 5.0 (1 review)
    │  - Shows: 1 trip completed


JOURNEY 2: VIEW RATINGS ON PROFILE
──────────────────────────────────

User A                          User B
 │                               │
 ├─ Navigates to User B profile──┤
 │  (/user/userB)                │
 │                               │
 │  ┌─────────────────────────┐  │
 │  │ User B's Profile        │  │
 │  ├─────────────────────────┤  │
 │  │ Name: User B            │  │
 │  │ Email: userb@test.com   │  │
 │  │ ─────────────────────── │  │
 │  │ ★★★★☆ 4.8 (12 reviews) │  │
 │  │ 10 trips completed      │  │
 │  │ ─────────────────────── │  │
 │  │ RECENT REVIEWS:         │  │
 │  │ ┌─────────────────────┐ │  │
 │  │ │ [Avatar] User A     │ │  │
 │  │ │ as Rider            │ │ ← Can tap name
 │  │ │ 2 days ago          │ │ ← to view their
 │  │ │ ★★★★★ 5.0          │ │ ← profile
 │  │ │ Great driver!       │ │  │
 │  │ └─────────────────────┘ │  │
 │  │ ┌─────────────────────┐ │  │
 │  │ │ [Avatar] User C     │ │  │
 │  │ │ as Rider            │ │  │
 │  │ │ 1 week ago          │ │  │
 │  │ │ ★★★★☆ 4.0          │ │  │
 │  │ │ Good communication  │ │  │
 │  │ └─────────────────────┘ │  │
 │  └─────────────────────────┘  │


JOURNEY 3: OWN PROFILE RATINGS
──────────────────────────────

User navigates to own profile (app/(tabs)/profile.js)
    │
    ├─ If averageRating > 0:
    │  ┌──────────────────────────┐
    │  │ RATING SECTION          │
    │  ├──────────────────────────┤
    │  │ ★★★★☆                   │
    │  │ 4.8 (24 reviews)        │
    │  │ 15 trips completed      │
    │  └──────────────────────────┘
    │
    └─ If averageRating = 0:
       (No rating section shown)
```

---

## Component Hierarchy

```
App Root
│
├─ (tabs) Layout
│  │
│  ├─ profile.js ⭐ UPDATED
│  │  └─ StarRating (readonly)
│  │     └─ Shows user's averageRating
│  │
│  ├─ my-trips.js
│  │  ├─ Trip item
│  │  │  └─ UNRATED badge (if needed)
│  │  └─ List
│  │
│  └─ ... (other tabs)
│
├─ user/[id].js
│  ├─ StarRating (readonly)
│  │  └─ Shows profile.averageRating
│  └─ ReviewCard (multiple)
│     └─ StarRating (readonly)
│        └─ Shows review.rating
│
├─ rating/[tripId].js
│  ├─ StarRating (interactive) ← Rating input
│  │  └─ onRatingChange callback
│  └─ Text input (review text)
│
├─ chat/[id].js
│  └─ ... (chat content)
│
└─ ... (other routes)

Components (Reusable)
├─ StarRating
│  ├── Interactive (onRatingChange, disabled=false)
│  └── Readonly (disabled=true)
│
├─ ReviewCard
│  ├── Reviewer avatar
│  ├── Reviewer name (clickable)
│  ├── Role label
│  ├── Date
│  ├── StarRating (readonly)
│  └── Review text
│
└─ ... (other components)
```

---

## Redux State Tree

```
store.js
│
├─ state.auth
│  ├─ user (Firebase user object)
│  ├─ loading (boolean)
│  └─ userProfile
│     ├─ name
│     ├─ email
│     ├─ school
│     ├─ major
│     ├─ bio
│     ├─ pronouns
│     ├─ ridePreferences
│     ├─ emergencyContacts
│     ├─ averageRating ← Used for rating display
│     ├─ totalRatings ← Used for count display
│     └─ totalTripsCompleted ← Used for stats
│
├─ state.reviews
│  ├─ reviews (Array<Review>)
│  ├─ userReviews (Array<Review>) ← Reviewed user's reviews
│  ├─ loading (boolean)
│  ├─ error (string | null)
│  └─ tripReviewed (boolean)
│
├─ state.trips
│  ├─ trips (Array<Trip>)
│  ├─ currentTrip (Trip | null)
│  ├─ loading
│  └─ error
│
└─ ... (other slices)
```

---

## Firestore Collections Structure

```
firestore
│
├─ reviews (Collection)
│  │
│  └─ {docId} (Document)
│     ├─ tripId (string)
│     ├─ ratedBy (userId)
│     ├─ ratedUser (userId)
│     ├─ rating (1-5)
│     ├─ reviewText (string, optional)
│     ├─ reviewerName (string)
│     ├─ reviewerPhotoURL (string)
│     ├─ reviewerRole ("driver" | "rider")
│     ├─ createdAt (timestamp)
│     └─ updatedAt (timestamp)
│
├─ users (Collection)
│  │
│  └─ {userId} (Document)
│     ├─ uid
│     ├─ email
│     ├─ name
│     ├─ school
│     ├─ major
│     ├─ bio
│     ├─ pronouns
│     ├─ ridePreferences
│     ├─ emergencyContacts
│     ├─ averageRating ← Calculated from reviews
│     ├─ totalRatings ← Count of reviews
│     ├─ totalTripsCompleted ← Sum of completed trips
│     ├─ createdAt
│     └─ updatedAt
│
├─ trips (Collection)
│  │
│  └─ {tripId} (Document)
│     ├─ pickupLocation
│     ├─ dropoffLocation
│     ├─ driverId
│     ├─ riderId
│     ├─ status
│     ├─ hasBeenReviewed ← Flag for enforcement
│     ├─ createdAt
│     └─ updatedAt
│
└─ ... (other collections)
```

---

## Security Rules Flow

```
User tries to:              Firestore Rules Check:
─────────────────────────────────────────────────────

READ review               ✅ Allow if authenticated
                          └─ Everyone can read reviews

CREATE review             ✅ Allow if:
                          ├─ Authenticated
                          ├─ ratedBy == userId
                          └─ ratedUser != userId (can't rate self)

UPDATE review             ❌ Deny (immutable after creation)

DELETE review             ❌ Deny (immutable after creation)

READ user profile         ✅ Allow if authenticated
                          └─ Can read anyone's profile

UPDATE own profile        ✅ Allow if:
                          └─ userId == uid

UPDATE other's profile    ❌ Deny (can't modify others' data)
                          └─ Except: Triggered by review submission
                             (server-side via Firebase Function)

READ chat                 ✅ Allow if participant

READ messages             ✅ Allow if chat participant
```

---

## Async Data Flow

```
USER ACTION → COMPONENT → REDUX THUNK → FIRESTORE → REDUX → UI UPDATE

Example: Submit Rating
─────────────────────────────────────────────────────────────────────

1. User taps "Submit Rating" button
   └─→ Component calls: onSubmit()

2. Component dispatches thunk
   └─→ dispatch(submitRatingThunk({
         tripId: "trip-123",
         ratedUser: "userA",
         rating: 5,
         reviewText: "Great ride!"
       }))

3. Redux thunk dispatches loading action
   └─→ state.reviews.loading = true

4. Thunk calls service function
   └─→ submitReview(reviewData)
       └─→ Firestore database write
           ├─ Creates document in reviews collection
           └─ Updates user document:
              - averageRating = (total + 5) / (count + 1)
              - totalRatings++

5. Firestore returns success
   └─→ Thunk dispatches success action

6. Redux updates state
   └─→ state.reviews.loading = false
   └─→ state.reviews.reviews = [..., newReview]
   └─→ state.trips.currentTrip.hasBeenReviewed = true

7. Component receives updated state
   └─→ Review submitted
   └─→ Navigate back to my-trips

8. my-trips component receives updated trip
   └─→ UNRATED badge removed

9. If viewing user profile, it updates
   └─→ averageRating displayed
   └─→ New review appears in ReviewCard
```

---

## Performance Optimization Points

```
✅ OPTIMIZATIONS IMPLEMENTED

1. Firestore Indexes
   └─ Composite index on reviews (userId, createdAt)
      → Efficient query for fetching user reviews

2. Redux Selectors (Memoized)
   └─ Prevent unnecessary re-renders
   └─ Component only re-renders if selected state changes

3. Real-Time Listeners
   └─ Subscribe to reviews changes
   └─ Unsubscribe on component unmount
   └─ No memory leaks

4. Image Optimization
   └─ Placeholder for missing avatars
   └─ Lazy loading avatars

5. Component Memoization
   └─ ReviewCard is memoized
   └─ Prevents re-render on parent changes

6. Batch Firestore Updates
   └─ Review creation + user stats update in transaction
   └─ Atomic operation
```

---

This architecture supports:
✅ Scalability - Efficient queries with indexes
✅ Real-time Updates - Firestore real-time listeners
✅ Security - Role-based access control via rules
✅ Performance - Redux memoization, lazy loading
✅ Maintainability - Clean separation of concerns
✅ User Experience - Instant feedback, loading states
