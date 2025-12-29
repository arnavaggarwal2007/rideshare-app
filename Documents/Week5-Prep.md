# Week 5 Implementation Plan: Booking & Matching

## Overview

Week 5 focuses on implementing the seat request/booking flow and real-time messaging between drivers and riders. This builds on the Week 4 feed and details screens.

**Estimated Time**: 40-50 hours  
**Prerequisites**: Week 4 complete, rideRequests backend schema ready

---

## Phase Breakdown

### Phase 1: Request Seat Backend Integration (8-10 hours)

**Goal**: Replace the Request Seat stub with full backend functionality

#### Tasks
1. **Create Redux Slice for Requests** (`store/slices/requestsSlice.js`)
   - State: `{ myRequests: [], pendingForRides: {}, loading, error }`
   - Thunks:
     - `createRequestThunk(rideId, seatsRequested, message)`
     - `fetchMyRequestsThunk()`
     - `fetchRideRequestsThunk(rideId)` (driver view)
     - `cancelRequestThunk(requestId)`
     - `updateRequestStatusThunk(requestId, status)` (driver: accept/decline)

2. **Update Ride Details Screen** (`app/ride/[id].js`)
   - Replace stub `handleRequestSeat()` with real thunk call
   - Show loading state during request creation
   - Navigate to My Trips or show success alert after request
   - Disable button if already requested (check `myRequests` state)
   - Show "Pending" badge if user already has pending request for this ride

3. **Add Request List Screen** (`app/requests/index.js`)
   - Display all user's ride requests with status badges
   - Group by status: Pending, Accepted, Declined
   - Show ride info, driver name, status, timestamp
   - Allow cancel for pending requests

#### API Usage
```javascript
// In handleRequestSeat
await dispatch(createRequestThunk({
  rideId: ride.id,
  riderId: user.uid,
  riderProfile: userProfile,
  rideData: { driverId: ride.driverId, driverName: ride.driverName },
  seatsRequested: 1,
  message: null
})).unwrap();
```

---

### Phase 2: Driver Request Management (8-10 hours)

**Goal**: Allow drivers to view and respond to seat requests

#### Tasks
1. **Create Requests Tab for Drivers** (`app/(tabs)/requests.js` or add to My Rides)
   - Show all pending requests for driver's rides
   - Display rider info: name, photo, rating, message
   - "Accept" / "Decline" buttons
   - Real-time updates with `onSnapshot` listener

2. **Request Detail/Action Screen** (`app/requests/[id].js`)
   - Full rider profile preview
   - Accept/Decline actions with confirmation
   - After accept: decrease ride's `availableSeats`, add rider to `bookedRiders`
   - After decline: just update request status

3. **Update My Rides Screen**
   - Show badge count of pending requests per ride
   - Tap to view requests for that ride

4. **Ride Capacity Logic**
   - When accepting request, check if enough seats available
   - If accepting request fills all seats, update ride status to 'full'
   - Prevent accepting more requests than available seats

#### Redux Actions
```javascript
// Driver accepts request
await dispatch(updateRequestStatusThunk({ requestId, status: 'accepted' })).unwrap();
// Also update ride: decrease availableSeats, add to bookedRiders
await dispatch(updateRideThunk({ 
  rideId, 
  availableSeats: ride.availableSeats - request.seatsRequested,
  bookedRiders: [...ride.bookedRiders, request.riderId]
})).unwrap();
```

---

### Phase 3: Push Notifications (6-8 hours)

**Goal**: Notify drivers of new requests and riders of responses

#### Tasks
1. **Setup Firebase Cloud Messaging (FCM)**
   - Install `expo-notifications` and `expo-device`
   - Request notification permissions
   - Store FCM tokens in user profiles

2. **Implement Notification Handlers**
   - Send notification when rider creates request (to driver)
   - Send notification when driver accepts/declines (to rider)
   - Handle notification taps to navigate to relevant screen

3. **Backend: Cloud Functions** (optional, can defer)
   - Trigger notifications via Firestore onCreate/onUpdate
   - For MVP, can send notifications from client-side after Firestore writes

#### Code Scaffold
```javascript
// utils/notifications.js
import * as Notifications from 'expo-notifications';

export async function registerForPushNotifications() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return null;
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  return token;
}

export async function sendNotification(expoPushToken, title, body) {
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: expoPushToken,
      title,
      body,
    }),
  });
}
```

---

### Phase 4: Messaging System (12-16 hours)

**Goal**: Real-time chat between matched drivers and riders

#### Tasks
1. **Create Messages Tab** (`app/(tabs)/messages.js`)
   - List of all active conversations
   - Show last message, timestamp, unread badge
   - Tap to open chat screen

2. **Chat Screen** (`app/chat/[chatId].js`)
   - Use `react-native-gifted-chat`
   - Real-time message sync with Firestore `onSnapshot`
   - Send/receive text messages
   - Auto-scroll to bottom

3. **Firestore `chats` Collection Schema**
   ```javascript
   {
     chatId: 'auto-generated',
     participants: ['userId1', 'userId2'], // driver + rider
     rideId: 'ride123',
     lastMessage: { text: '...', senderId: 'userId1', timestamp: Date },
     createdAt: Timestamp,
     updatedAt: Timestamp
   }
   ```

4. **Firestore `messages` Sub-Collection**
   ```javascript
   {
     messageId: 'auto-generated',
     chatId: 'chat123',
     senderId: 'userId1',
     text: 'Message content',
     createdAt: Timestamp,
     read: false
   }
   ```

5. **Chat Creation Trigger**
   - When driver accepts request, create or retrieve chat between driver and rider
   - Navigate to chat from Request Accepted alert

6. **Security Rules for Chats**
   - Only participants can read/write messages
   - Auto-create chat on first message or via Cloud Function

#### API Functions (`services/firebase/firestore.js`)
```javascript
export async function getOrCreateChat(rideId, driverId, riderId) {
  // Query for existing chat with these participants
  // If not found, create new chat doc
  // Return chatId
}

export async function sendMessage(chatId, senderId, text) {
  // Add message to messages sub-collection
  // Update chat's lastMessage field
}

export function subscribeToMessages(chatId, callback) {
  // onSnapshot listener for messages, ordered by timestamp
}
```

---

### Phase 5: Trip Coordination Screens (6-8 hours)

**Goal**: Dedicated trip management and status tracking

#### Tasks
1. **My Trips Screen** (`app/(tabs)/my-trips.js`)
   - List of all trips (as rider and driver)
   - Status badges: Pending, Confirmed, In Progress, Completed
   - Tap to view trip details

2. **Trip Details Screen** (`app/trip/[id].js`)
   - Full trip info: ride details, participants, pickup/dropoff
   - Chat button (navigate to chat)
   - "Mark Started" / "Mark Completed" buttons (driver only)
   - Cancel trip button (with confirmation)

3. **Trip State Transitions**
   - Pending → Confirmed (when driver accepts request)
   - Confirmed → In Progress (driver marks started)
   - In Progress → Completed (driver marks completed)
   - Completed → Trigger rating prompt for both parties

4. **Firestore `trips` Collection Schema**
   ```javascript
   {
     tripId: 'auto-generated',
     rideId: 'ride123',
     driverId: 'userId1',
     riderId: 'userId2',
     requestId: 'request123',
     status: 'pending|confirmed|in_progress|completed|cancelled',
     pickupLocation: { coordinates, placeName },
     dropoffLocation: { coordinates, placeName },
     seatsBooked: 1,
     totalPrice: 25.00,
     createdAt: Timestamp,
     updatedAt: Timestamp,
     startedAt: Timestamp|null,
     completedAt: Timestamp|null
   }
   ```

5. **Auto-Create Trip on Accept**
   - When driver accepts request, create trip document
   - Link trip to rideRequest and ride
   - Send confirmation notifications

---

## Week 5 Blockers & Dependencies

### Must Have Before Starting
- ✅ Week 4 feed and details complete
- ✅ rideRequests backend schema and rules (added in Week 4 closeout)
- ✅ Firestore rules for users, rides
- ⚠️ FCM setup and permissions (Phase 3)
- ⚠️ Gifted Chat library installed (`npm install react-native-gifted-chat`)

### Deferred to Week 6+
- Rating/review system (after trip completion)
- Trip reminders (24h/2h before departure)
- Advanced chat features (images, read receipts)
- Push notification backend (Cloud Functions)
- Payment integration (Stripe/Venmo)

---

## Testing Checklist

**Request Flow**:
- [ ] Rider can request seat for a ride
- [ ] Driver receives notification of new request
- [ ] Driver can view pending requests
- [ ] Driver can accept request (updates ride seats, creates trip)
- [ ] Driver can decline request
- [ ] Rider receives notification of acceptance/decline
- [ ] Rider can cancel pending request
- [ ] Request status updates in real-time

**Messaging**:
- [ ] Chat created automatically on request acceptance
- [ ] Messages sync in real-time
- [ ] Unread badge updates correctly
- [ ] Chat history persists across app restarts
- [ ] Messages ordered chronologically

**Trip Management**:
- [ ] Trip created on request acceptance
- [ ] Trip details screen shows all info
- [ ] Driver can mark trip started/completed
- [ ] Status transitions trigger notifications
- [ ] My Trips screen shows all user trips

---

## Security & Data Integrity

### Firestore Rules to Add
```javascript
// trips collection
match /trips/{tripId} {
  allow read: if isSignedIn() && 
                 (request.auth.uid == resource.data.driverId || 
                  request.auth.uid == resource.data.riderId);
  
  allow create: if isSignedIn() && 
                   request.auth.uid == request.resource.data.driverId &&
                   request.resource.data.status == 'confirmed';
  
  allow update: if isSignedIn() && 
                   request.auth.uid == resource.data.driverId &&
                   request.resource.data.keys().hasOnly(['status', 'startedAt', 'completedAt', 'updatedAt']);
}

// chats collection
match /chats/{chatId} {
  allow read: if isSignedIn() && 
                 request.auth.uid in resource.data.participants;
  
  allow create: if isSignedIn() && 
                   request.auth.uid in request.resource.data.participants;
  
  // messages sub-collection
  match /messages/{messageId} {
    allow read: if isSignedIn() && 
                   request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants;
    
    allow create: if isSignedIn() && 
                     request.auth.uid == request.resource.data.senderId &&
                     request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants;
  }
}
```

---

## Notes & Recommendations

1. **Notification Strategy**: For MVP, client-side notifications are acceptable. Cloud Functions can be added later for reliability.

2. **Chat UX**: Consider auto-creating chat on request creation (not just acceptance) to allow pre-ride coordination.

3. **Trip vs Ride**: A "trip" is a confirmed booking between one rider and one driver for one ride. A "ride" can have multiple trips.

4. **Atomic Updates**: When accepting requests, use Firestore transactions or batch writes to ensure consistency between request status, ride seats, and trip creation.

5. **Error Handling**: Add comprehensive error states for network issues, permission denials, and Firestore write conflicts.

6. **Performance**: Use pagination for request/trip/message lists; implement pull-to-refresh and infinite scroll.

---

## Week 5 Success Criteria

- [ ] Riders can request seats via UI
- [ ] Drivers can accept/decline requests
- [ ] Both parties receive notifications
- [ ] Real-time chat works between matched users
- [ ] Trips are created and tracked through lifecycle
- [ ] My Trips screen shows all user trips
- [ ] No TypeScript/ESLint errors
- [ ] All Firestore rules deployed and tested

**Total Estimated Time**: 40-50 hours (spread over 5 days @ 8-10h/day)
