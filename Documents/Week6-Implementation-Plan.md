# Week 6: Messaging & Trip Management - Implementation Plan

**Created**: December 30, 2025  
**Status**: Ready for implementation after Week 5 completion  
**Estimated Hours**: 40 hours (Days 1-5)  
**Prerequisites**: All Week 5 work completed, including push notification system

---

## Critical Dependencies from Week 5

### ✅ Prerequisites That MUST Be Completed in Week 5:

1. **Push Notification System** (BLOCKING for Week 6 messaging)
   - Expo notifications setup with FCM
   - User push token storage in Firestore
   - Cloud Function for sending notifications
   - Notification listeners with deep linking
   - Status: Must be 100% complete before Day 1 of Week 6
   - Reason: Week 6 messaging depends on notification alerts for new messages

2. **Trip Details Screen (Minimal)**
   - Basic trip information display
   - Message button that navigates to chat
   - Trip status badge (shows "confirmed")
   - Status: Foundation in place, full features in Week 6
   - Reason: Chat UI needs somewhere to open from

3. **Pickup/Dropoff Location Storage**
   - Request documents include pickup/dropoff locations
   - Trip documents include pickup/dropoff locations
   - Status: Confirmed implemented in Week 5 detour validation
   - Reason: Week 6 trip details displays these locations

### ⚠️ Technical Debt from Week 5:

**Do NOT attempt in Week 6 (defer to Week 7+):**
1. Time-based max detour validation (minutes) - requires traffic modeling
2. Real-time detour feedback as user drags map marker - too API-intensive
3. Advanced notification scheduling - cron job optimization

---

## Week 6 Architecture Overview

### Data Flow for Week 6 Features

```
Trip Created (Week 5)
    ↓
Create Chat Document (Week 6 Day 1)
    ↓
Messages Subcollection (Week 6 Day 1-2)
    ↓
Rider/Driver Exchange Messages (Week 6 Day 1-2)
    ↓
Trip Status Updates (Week 6 Day 3-4)
    ↓
Trip Details UI with Status Controls (Week 6 Day 3-4)
    ↓
Trip Completion & Rating Flow (Week 7 - NOT Week 6)
    ↓
Trip Share Feature (Week 6 Day 5)
```

### Key Firestore Collections for Week 6

**chats/{chatId}** (Created when trip confirmed)
- participants: [driverId, riderId]
- rideId, tripId (links to original ride and trip)
- lastMessage, unreadCount, updatedAt
- Subcollection: messages/{messageId}

**messages subcollection** (chats/{chatId}/messages/{messageId})
- senderId, text, timestamp
- Ordered chronologically for chat UI

**trips/{tripId}** (Updated in Week 6)
- status: 'confirmed' → 'in_progress' → 'completed'
- statusHistory: [{ status, timestamp }, ...]
- startedAt, completedAt timestamps
- Immutable after created (but status field updates)

---

## Week 6 Day-by-Day Breakdown

### Days 1-2: In-App Chat Setup (16 hours)

**Goal**: Real-time messaging between driver and rider

#### Architecture: Chat Creation Trigger

When driver accepts a ride request in Week 5 (acceptRideRequest thunk):
- Firestore transaction creates both trip AND chat document
- Chat document includes both participants, trip/ride links
- Messages subcollection starts empty

**Firestore Structure for Reference**:
```
chats/{chatId}
├── participants: ["driverId", "riderId"]
├── participantDetails: { driverId: {name, photo}, riderId: {name, photo} }
├── rideId: "rideId123"
├── tripId: "tripId456"
├── lastMessage: { text, senderId, timestamp }
├── unreadCount: { driverId: 0, riderId: 2 }
├── isActive: true
├── createdAt, updatedAt
└── messages/{messageId}
    ├── messageId, senderId, text
    ├── timestamp, isRead
    └── type: "text" (future: "image")
```

#### Tasks for Day 1-2:

**Day 1: Messages Tab Screen (8 hours)**

* [ ] Implement [app/(tabs)/messages.js](app/(tabs)/messages.js) (currently stub)
  * [ ] Query current user's chats from Firestore
  * [ ] Display chat list with:
    * [ ] Participant name and photo
    * [ ] Last message preview text
    * [ ] Timestamp of last message
    * [ ] Unread count badge (show only if > 0)
    * [ ] Visual "unread" indicator (bold text or highlighting)
  * [ ] On chat tap: Navigate to [app/chat/[id].js](app/chat/[id].js)
  * [ ] Implement pull-to-refresh to reload chat list
  * [ ] Handle empty state (no chats yet)
  * [ ] Real-time updates via onSnapshot listener

**Code Pattern (for reference)**:
```javascript
// Hook for chat list
useEffect(() => {
  const chatsRef = collection(db, 'chats');
  const q = query(
    chatsRef,
    where('participants', 'array-contains', user.uid),
    orderBy('updatedAt', 'desc')
  );
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const chats = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    dispatch(setChats(chats)); // Store in Redux
  });
  
  return () => unsubscribe();
}, [user.uid, dispatch]);
```

**Day 2: Individual Chat Screen (8 hours)**

* [ ] Implement [app/chat/[id].js](app/chat/[id].js) with React Native Gifted Chat
  * [ ] Install dependency: `npm install react-native-gifted-chat`
  * [ ] Fetch messages from chats/{chatId}/messages subcollection
  * [ ] Display messages in Gifted Chat format
  * [ ] Implement send message:
    * [ ] Add message to subcollection with senderId
    * [ ] Update parent chat's lastMessage and updatedAt
    * [ ] Optimistic UI (show message immediately)
    * [ ] Send notification to other participant
  * [ ] Mark messages as read when viewed
  * [ ] Show typing indicators (optional enhancement)
  * [ ] Display participant info at top (photo, name, rating)
  * [ ] Add "View Trip" button to navigate to trip details
  * [ ] Handle empty state (conversation just started)
  * [ ] Real-time message updates via onSnapshot

**Code Pattern (for reference)**:
```javascript
// Message listener
useEffect(() => {
  const messagesRef = collection(db, `chats/${chatId}/messages`);
  const q = query(messagesRef, orderBy('timestamp', 'desc'));
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const msgs = snapshot.docs.map(doc => ({
      _id: doc.id,
      text: doc.data().text,
      createdAt: doc.data().timestamp?.toDate(),
      user: {
        _id: doc.data().senderId,
        name: doc.data().senderName,
        avatar: doc.data().senderPhotoURL,
      },
    }));
    setMessages(msgs);
  });
  
  return () => unsubscribe();
}, [chatId]);

// Send message
const onSend = async (newMessages = []) => {
  const message = newMessages[0];
  
  await addDoc(collection(db, `chats/${chatId}/messages`), {
    text: message.text,
    senderId: user.uid,
    senderName: user.displayName,
    senderPhotoURL: user.photoURL,
    timestamp: serverTimestamp(),
    isRead: false,
  });
  
  // Update chat last message
  await updateDoc(doc(db, 'chats', chatId), {
    lastMessage: { text: message.text, senderId: user.uid, timestamp: serverTimestamp() },
    updatedAt: serverTimestamp(),
  });
  
  // Send notification to other participant
  const chat = await getDoc(doc(db, 'chats', chatId));
  const otherParticipant = chat.data().participants.find(p => p !== user.uid);
  await sendNotification(otherParticipant, {
    type: 'new_message',
    title: user.displayName,
    body: message.text,
    data: { chatId }
  });
};
```

**Firestore Index Needed for Week 6**:
- Composite: `chats` collection
  - participants (array-contains)
  - updatedAt (descending)
  - Used for: "Show my chats sorted by most recent"

---

### Days 3-4: Trip Status Tracking (16 hours)

**Goal**: Allow driver to update trip status, show progress to both parties

#### Trip Status Lifecycle

```
Week 5: 'confirmed' (trip created, chat available)
    ↓ (Week 6 Day 3-4)
'in_progress' (driver starts trip)
    ↓ (Week 6 Day 3-4)
'completed' (driver marks complete)
    ↓ (Week 7: rating & reviews)
'rated' (both parties rated)
```

#### Key Design Decisions for Week 6

1. **Who can update status**: Only the driver
2. **Rider visibility**: Rider sees status changes in real-time (no action buttons)
3. **Notifications**: Send notification to rider on each status change
4. **Timeline**: Show history of all status changes

#### Tasks for Days 3-4:

**Day 3: Trip Details Screen - Completion (8 hours)**

* [ ] Expand [app/trip/[id].js](app/trip/[id].js) with status controls
  * [ ] Show trip status timeline:
    * [ ] "Confirmed" with timestamp (clickable for context)
    * [ ] "In Progress" with timestamp (if applicable)
    * [ ] "Completed" with timestamp (if applicable)
  * [ ] For DRIVER only:
    * [ ] "Start Trip" button (visible only if status='confirmed')
      * [ ] Confirmation dialog: "Are you sure? This will notify the rider."
      * [ ] On click: Call updateTripStatus thunk
      * [ ] Loading state during update
      * [ ] Success feedback (haptic + toast)
    * [ ] "Complete Trip" button (visible only if status='in_progress')
      * [ ] Confirmation dialog: "Mark trip as complete?"
      * [ ] On click: Call updateTripStatus thunk
      * [ ] Success feedback: Navigate to rating screen (Week 7)
  * [ ] For RIDER: Show read-only status badges
  * [ ] Update trip details in real-time (listener on trip document)
  * [ ] Keep "Message" button visible at all times
  * [ ] Add "View Location" or "Call Driver" placeholder buttons (Week 7+)

**Day 4: Trip Status Update Backend (8 hours)**

* [ ] Create Redux thunk: `updateTripStatusThunk({tripId, newStatus})`
  * [ ] Validate user is driver of trip
  * [ ] Update trip document with new status
  * [ ] Add entry to statusHistory array with timestamp
  * [ ] Update timestamps (startedAt, completedAt)
  * [ ] Send notification to rider with appropriate message
  * [ ] Handle errors: show user-friendly message

* [ ] Update Firestore transaction in acceptRideRequest (Week 5):
  * [ ] When creating trip: set initial status='confirmed'
  * [ ] Initialize statusHistory: [{ status: 'confirmed', timestamp: now }]

**Code Pattern for Status Update**:
```javascript
export const updateTripStatusThunk = createAsyncThunk(
  'trips/updateStatus',
  async ({ tripId, newStatus }, { rejectWithValue }) => {
    try {
      const tripRef = doc(db, 'trips', tripId);
      const tripDoc = await getDoc(tripRef);
      const trip = tripDoc.data();
      
      // Verify user is driver
      if (trip.driverId !== auth.currentUser.uid) {
        throw new Error('Only driver can update trip status');
      }
      
      const updates = {
        status: newStatus,
        updatedAt: serverTimestamp(),
        statusHistory: arrayUnion({
          status: newStatus,
          timestamp: new Date().toISOString()
        })
      };
      
      if (newStatus === 'in_progress') {
        updates.startedAt = serverTimestamp();
      } else if (newStatus === 'completed') {
        updates.completedAt = serverTimestamp();
      }
      
      await updateDoc(tripRef, updates);
      
      // Send notification to rider
      const notificationBody = 
        newStatus === 'in_progress' ? 'Your trip has started!' :
        newStatus === 'completed' ? 'Your trip is complete. Please rate your experience.' :
        'Trip status updated';
      
      await sendNotification(trip.riderId, {
        type: 'trip_status_update',
        title: 'Trip Update',
        body: notificationBody,
        data: { tripId }
      });
      
      return { tripId, ...updates };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
```

**Firestore Indexes Needed for Week 6**:
- trips collection:
  - driverId (for driver to find their trips)
  - status (for filtering by trip state)
  - Composite: driverId + status (for "My active trips")

---

### Day 5: Trip Share Feature (8 hours)

**Goal**: Allow riders/drivers to share trip info with emergency contacts for safety

#### Design Notes

1. **What gets shared**: Trip ID, driver info, route, ETA, real-time location (future)
2. **How it's shared**: Deep link that opens in app or web
3. **Recipient permissions**: Read-only view of trip (no chat access)

#### Tasks for Day 5:

* [ ] Add "Share Trip" button to trip details screen
  * [ ] Visible to both driver and rider
  * [ ] Opens native share sheet with pre-filled text

* [ ] Generate shareable link:
  * [ ] Use `Linking.createURL(/trip/${tripId})`
  * [ ] Include trip summary in share message
  * [ ] Example: "Trip: 2pm SFO → Berkeley with John Doe. Track here: [link]"

* [ ] Implement deep linking in [app/_layout.js](app/_layout.js):
  * [ ] Handle /trip/* routes
  * [ ] Navigate to trip details screen when link tapped
  * [ ] Show read-only view for non-participants

* [ ] Store trip in easily shareable format:
  * [ ] Trip document already has all needed info
  * [ ] No additional database writes needed
  * [ ] Just expose via deep link

**Code Pattern for Share**:
```javascript
import * as Linking from 'expo-linking';
import { Share } from 'react-native';

const shareTrip = async (trip) => {
  const shareURL = Linking.createURL(`/trip/${trip.tripId}`);
  
  const message = `
🚗 Trip Shared

Driver: ${trip.driver.name}
From: ${trip.pickupLocation.address}
To: ${trip.dropoffLocation.address}
Departure: ${formatDateTime(trip.scheduledDepartureTime)}

Track: ${shareURL}
  `.trim();
  
  try {
    await Share.share({
      message,
      url: shareURL,
      title: 'Trip Details'
    });
  } catch (error) {
    console.error('Error sharing:', error);
  }
};
```

**Firestore Changes**: None required (trip data already structured for sharing)

---

## Firestore Rules for Week 6

Update existing rules to allow trip status updates and chat access:

```firestore-rules
// Trips collection - update rules
match /trips/{tripId} {
  // Read access for driver and rider only
  allow read: if isSignedIn() && 
                 (request.auth.uid == resource.data.driverId || 
                  request.auth.uid == resource.data.riderId);
  
  // DRIVER only can update trip status, timestamps
  allow update: if isSignedIn() && 
                   request.auth.uid == resource.data.driverId &&
                   // Allow status and statusHistory updates only
                   request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'statusHistory', 'updatedAt', 'startedAt', 'completedAt']);
  
  // No delete allowed
  allow delete: if false;
}

// Chats collection - new
match /chats/{chatId} {
  // Participants can read their chats
  allow read: if isSignedIn() && 
                 request.auth.uid in resource.data.participants;
  
  // Participants can update (last message, unread count)
  allow update: if isSignedIn() && 
                   request.auth.uid in resource.data.participants;
  
  // No create/delete (created by backend only)
  allow create, delete: if false;
  
  // Messages subcollection
  match /messages/{messageId} {
    // Participants can read
    allow read: if isSignedIn() && 
                   request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants;
    
    // Participants can send
    allow create: if isSignedIn() && 
                     request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants &&
                     request.resource.data.senderId == request.auth.uid;
    
    // No update/delete on messages (immutable)
    allow update, delete: if false;
  }
}
```

---

## Redux State Structure for Week 6

**tripsSlice updates**:
```javascript
{
  myTrips: [], // All trips (as driver or rider)
  selectedTrip: null, // Currently viewed trip
  tripStatus: {}, // { tripId: { status, statusHistory, loading } }
  loading: false,
  error: null,
}
```

**New chatsSlice**:
```javascript
{
  chats: [], // List of all chats
  selectedChat: null, // Currently open chat
  messages: [], // Messages in selected chat
  messageLoading: false,
  unreadCounts: {}, // { chatId: count }
  error: null,
}
```

---

## Testing Checklist for Week 6

### Chat Functionality
- [ ] Chat list appears after trip confirmed
- [ ] Messages send in real-time
- [ ] Received messages appear instantly
- [ ] Unread count increments
- [ ] Mark as read (if implemented)
- [ ] Participant info displays correctly
- [ ] View Trip button navigates correctly
- [ ] Empty state shows when no messages

### Trip Status Updates
- [ ] Driver sees "Start Trip" button on confirmed trip
- [ ] Clicking "Start Trip" updates status in Firestore
- [ ] Rider sees status change in real-time
- [ ] Notification sent to rider on status change
- [ ] Status timeline displays all transitions
- [ ] Only driver can update status (verify security)
- [ ] Timestamps recorded correctly
- [ ] "Complete Trip" button appears after trip started

### Trip Sharing
- [ ] Share button appears on trip details
- [ ] Tapping share opens native sheet
- [ ] Deep link format is correct
- [ ] Link opens in app and shows trip details
- [ ] Non-participants see read-only view

### Edge Cases
- [ ] No internet during message send (queue and retry)
- [ ] Chat loads with 100+ messages (pagination)
- [ ] Delete trip while chat active (handle gracefully)
- [ ] Blocked users can't message (Week 7)
- [ ] Trip with no messages shows empty state

---

## Technical Debt & Future Enhancements

### P2 Features (Nice-to-have, defer to Week 7+)

1. **Typing Indicators**
   - Show "John is typing..." in chat
   - Implementation: Temporary 'typingUsers' array in chat document

2. **Message Images**
   - Send photos in chat
   - Requires Firebase Storage integration
   - Update message schema: `{ type: 'image', imageURL, ... }`

3. **Read Receipts**
   - Show "Delivered" and "Read" status
   - Add `isRead`, `readAt` to messages

4. **Trip Location Sharing**
   - Real-time driver location in chat screen
   - Requires location permissions and background tracking
   - P3 (safety feature, complex implementation)

5. **Call Integration**
   - Phone call button in chat
   - Requires Twilio or similar VoIP
   - P3 (future phase)

### Known Limitations for MVP

1. **No message search** - Week 8+
2. **No message deletion** - Week 8+
3. **No group chats** - Out of scope (1-to-1 only)
4. **No message timestamps in list** - Show relative time (Week 7 polish)
5. **No notification badges on Messages tab** - Week 7 enhancement

---

## Dependency Map: What Blocks Week 6

```
Week 5 Complete
├─ Push Notification System ✅ (CRITICAL BLOCKER)
├─ Trip Creation with Chat Setup ✅
├─ Pickup/Dropoff Locations Stored ✅
└─ Trip Details Foundation ✅

Then Week 6 Can Proceed
├─ Day 1-2: Messages Tab & Chat Screen
├─ Day 3-4: Trip Status Updates
└─ Day 5: Trip Sharing
```

**What CANNOT be done in Week 6 (Week 7+ scope)**:
- Rating and reviews (requires trip completion triggers)
- Trip reminders (requires Cloud Scheduler)
- Advanced blocking (requires safety features)

---

## Success Criteria for Week 6 Completion

- [ ] All messages send and receive in real-time
- [ ] Driver can start and complete trips
- [ ] Rider receives instant notifications of status changes
- [ ] Trip can be shared via deep link
- [ ] Firestore rules properly restrict access
- [ ] No lint errors: `npm run lint` passes
- [ ] End-to-end test: Message exchange → Status update → Completion
- [ ] Performance: <200ms message send latency
- [ ] Code quality: All async operations have proper error handling

---

## Estimated Time Breakdown

- Days 1-2: Messages Tab (8h) + Chat Screen (8h) = 16 hours
- Day 3: Trip Details Expansion (8h) = 8 hours  
- Day 4: Status Update Backend (8h) = 8 hours
- Day 5: Trip Share Feature (8h) = 8 hours
- **Buffer**: 0 hours (front-loaded in Week 5)

**Total**: 40 hours (on track for week)

---

## Week 6 Dependencies Summary

**FROM Week 5 (MUST COMPLETE)**:
1. ✅ Push notification system (FCM + Expo + Cloud Function)
2. ✅ Trip details screen foundation with "Message" button
3. ✅ Pickup/dropoff locations in request and trip documents
4. ✅ Max detour selection in ride creation (Miles only for MVP)

**Week 6 DELIVERABLES**:
1. ✅ Messages tab showing all chats
2. ✅ Chat screen with real-time messaging
3. ✅ Trip status tracking (Confirmed → In Progress → Completed)
4. ✅ Deep-linkable trip sharing

**Blocking Week 7 (NOT in scope)**:
1. ⏸️ Post-trip rating system
2. ⏸️ Trip reminders (24h, 2h before)
3. ⏸️ Advanced user blocking logic

---

**Document Status**: Complete and ready for Week 6 implementation  
**Last Updated**: December 30, 2025
