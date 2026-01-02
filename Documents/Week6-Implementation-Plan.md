# Week 6 Implementation Plan
## In-App Chat, Trip Status Tracking & Trip Sharing

**Duration**: 40 hours (5 days)  
**Created**: December 31, 2025  
**Prerequisites**: Week 5 complete (Push notifications, Trip creation, Real-time listeners)

---

## Overview

This plan implements three interconnected features:
- **Days 1-2**: In-App Messaging (16 hours)
- **Days 3-4**: Trip Status Tracking (16 hours)
- **Day 5**: Trip Sharing & Deep Linking (8 hours)

All infrastructure is in place from Week 5. This plan breaks each feature into atomic, sequentially buildable steps following established patterns.

---

## PHASE 1: REDUX & CHAT INFRASTRUCTURE (Prerequisite)

### 1.1 Create chatsSlice Redux state management
- Define initial state: `{ chats: [], currentChat: null, messages: [], loading, error }`
- Create thunks: `fetchUserChats`, `createChat`, `sendMessage`, `markMessagesRead`
- Add reducers: `setChats`, `addMessage`, `updateChatPreview`, `setCurrentChat`
- Add to store configuration in `store.js`

### 1.2 Create Firestore chat operations in services/firebase/firestore.js
- `createChatRoom()` - Create chat document with participants when trip confirmed
- `sendMessage()` - Add message to messages subcollection with isRead flag
- `subscribeToUserChats()` - Real-time listener for user's chat list (participants array-contains)
- `subscribeToChat()` - Real-time listener for specific chat's messages (ordered by timestamp)
- `markChatMessagesRead()` - Update isRead flags for user's unread messages
- `updateChatPreview()` - Update lastMessage in chat document (called after each send)

### 1.3 Update Firestore security rules
- Add collection rule: `chats` - only participants can read/write
- Add collection rule: `chats/{chatId}/messages` - only participants can read, create (immutable)
- Update `trips` rule to allow partial trip update (status field only for driver)

### 1.4 Install gifted-chat dependency
- Add `react-native-gifted-chat` to package.json for modern chat UI
- Verify compatibility with Expo Go

---

## PHASE 2: IN-APP MESSAGING IMPLEMENTATION

### 2.1 Create app/chat/[id].js chat details screen
- Accept route params: `chatId` from navigation
- Dispatch `setCurrentChat` Redux action
- Set up real-time listener: `subscribeToChat(chatId, (messages) => dispatch(setMessages()))`
- Return unsubscribe in cleanup

### 2.2 Build Gifted Chat UI integration
- Render `<GiftedChat>` with messages from Redux state
- Map Firebase message objects to Gifted Chat format: `{ _id, text, createdAt, user }`
- Connect send handler: `onSend` → dispatch `sendMessage(chatId, text, userId)`
- Add user avatar from `participantDetails` in chat document

### 2.3 Implement message sending flow
- On `onSend`, dispatch `sendMessage` thunk
- Thunk calls Firestore: add message doc to messages subcollection with `{ text, senderId, timestamp, isRead: false }`
- Thunk then calls `updateChatPreview` to set `lastMessage` in chat document
- Dispatch `addMessage` reducer to update local state immediately for optimistic UI
- Handle errors with `ErrorAlert` component

### 2.4 Implement message read status updates
- When chat screen mounts: dispatch `markChatMessagesRead(chatId, userId)` 
- Updates all messages with `senderId !== userId` to `isRead: true`
- Real-time listener picks up changes from other user

### 2.5 Build chat header with user info
- Display other participant's name and photo from `participantDetails`
- Add status indicator (online/offline - P2 feature, show as "Active" for now)
- Add back button that clears `currentChat` from Redux on unmount

### 2.6 Implement messages tab (app/(tabs)/messages.js)
- Replace stub with real UI showing chat list
- Dispatch `fetchUserChats(userId)` on mount with real-time listener
- Render FlatList of chats from Redux state
- Each chat item shows: other user's photo, name, last message preview, timestamp
- Sort chats by `updatedAt` (descending) 
- Tap chat → navigate to `chat/[chatId]`
- Add empty state: "No active chats yet"

### 2.7 Add navigation to chat from trip details
- In app/trip/[id].js, add button: "Message Driver" (or "Message Rider")
- On tap: check if chat exists for this trip; if not, create it via thunk
- Navigate to `chat/[chatId]` after creation
- Disable button if trip is Completed/Cancelled

### 2.8 Implement message notifications
- Modify `pushNotifications.js` to handle message topic subscriptions
- When chat created: subscribe user to topic `chat_{chatId}`
- When message sent: call Cloud Function to send FCM notification to other participant
- Notification payload: `{ chatId, senderName, messagePreview }`
- Tap notification → navigate to `chat/[chatId]`

### 2.9 Hook chat creation into trip confirmation
- Modify `acceptRideRequest` thunk in store/slices/requestsSlice.js
- After trip creation, call `createChatRoom(driverId, riderId, tripId)`
- Pass chat creation result to UI so immediate navigation is possible

---

## PHASE 3: TRIP STATUS TRACKING

### 3.1 Update trips Firestore operations
- Add `updateTripStatus()` function to services/firebase/firestore.js
- Function signature: `updateTripStatus(tripId, driverId, newStatus, timestamp)`
- Validates: only driver can update, only allow Pending→Confirmed→InProgress→Completed transitions
- Updates fields: `status`, `statusHistory` (append entry), `startedAt` (if InProgress), `completedAt` (if Completed)
- Returns updated trip object

### 3.2 Create tripsSlice Redux actions
- Add thunk `updateTripStatus` that calls Firestore function
- Handle validation errors (only driver, invalid transition)
- Update local state with new trip status
- Dispatch success notification

### 3.3 Modify app/trip/[id].js to show trip status timeline
- Display current status: Pending / Confirmed / In Progress / Completed
- Add visual indicator: color-coded badge or progress bar
- Show status history: list of timestamps when each status was reached
- Display relevant info per status:
  - **Pending**: Waiting for driver response (rider only sees this)
  - **Confirmed**: Pickup details, estimated time
  - **InProgress**: Show live trip info (map coming P2)
  - **Completed**: Trip summary, option to rate/review (future P2)

### 3.4 Add driver controls - "Start Trip" button
- Show in app/trip/[id].js when status === Confirmed and user is driver
- On tap: show confirmation Alert: "I've picked up the passenger. Start trip?"
- On confirm: dispatch `updateTripStatus(tripId, 'InProgress')`
- Button triggers haptic feedback and disables while loading
- Update UI immediately via Redux state

### 3.5 Add driver controls - "Complete Trip" button
- Show in app/trip/[id].js when status === InProgress and user is driver
- On tap: show confirmation Alert: "Trip complete? Passenger dropped off?"
- On confirm: dispatch `updateTripStatus(tripId, 'Completed')`
- Add input field for final notes (optional - P2 enhancement)
- Button triggers haptic feedback and disables while loading

### 3.6 Add rider confirmation on trip completion (P1)
- When driver marks trip Completed, rider gets notification
- Rider sees new button in trip details: "Confirm Completion"
- On tap: confirmation alert then updates local status
- Store confirmation timestamp in trip record
- Only then is trip fully finalized

### 3.7 Implement trip status change notifications
- Modify `updateTripStatus` thunk to dispatch notification after each status change
- Use `expo-notifications` to send local notification to other party
- Payload: Trip ID, new status, timestamp
- Notification text varies by status: "Driver started trip", "Trip completed", etc.

### 3.8 Add trip cancellation with time buffer
- Show "Cancel Trip" button in trip details when status is Confirmed
- Add cancellation logic: only allowed if trip starts in > 1 hour (or configurable)
- On tap: show alert with warning and reason input
- If approved: update trip status to Cancelled, store cancellation reason/timestamp
- Notify other party with reason

### 3.9 Update app/(tabs)/my-trips.js to show status visually
- Group trips by status instead of just Pending/Accepted/Declined
- Add status badges with color coding (Pending: yellow, InProgress: blue, Completed: green, Cancelled: red)
- Show next upcoming action per trip: "Start trip", "Complete trip", "Confirm completion"
- Tap trip → navigate to trip details

### 3.10 Implement trip reminder notifications
- Create background task: check trips daily at 24h and 2h before start time
- Use `expo-task-manager` if available, else use simple scheduled notifications
- Send notification: "Your trip starts in 24 hours / 2 hours" with trip details
- Tap notification → navigate to trip details

---

## PHASE 4: TRIP SHARING & DEEP LINKING

### 4.1 Add share button to app/trip/[id].js
- Button: "Share Trip" in header or bottom action bar
- Icon: `share` from `Ionicons`
- On tap: triggers trip sharing logic

### 4.2 Implement shareable trip link generation
- Create function `generateTripShareLink(tripId)` in utils
- Link format: `yourapp://trip/{tripId}` (custom scheme or universal link)
- Store base URL in environment config (e.g., `expo.dev` for Expo preview)
- Function returns full shareable URL/URI

### 4.3 Configure deep linking in app/_layout.js
- Add linking config to Expo Router: `linking: { prefixes: ['yourapp://'], config: { ... } }`
- Add route pattern: `trip/:id` maps to `app/trip/[id].js`
- Test: sharing link should deep link to trip details screen
- Non-users who tap link: redirect to signup/signin, then navigate to trip

### 4.4 Add Share API integration
- Use React Native's built-in `Share` API
- On share button: call `Share.share({ message: tripShareLink, title: "Check out my trip" })`
- Allow user to choose share destination (Messages, Email, etc.)
- Include trip summary in message: origin, destination, date, time

### 4.5 Build trip preview for deep links (P2 enhancement)
- Create modal/sheet component for shared trips
- Non-authenticated users see: trip overview, driver profile, book button
- After signup/signin, can book the trip directly
- Shows trip details same as authenticated users

### 4.6 Share with emergency contacts (P2)
- Modify share flow: add "Share with emergency contacts" option
- When enabled: loop through user's emergency contacts
- Send notification or SMS with trip link (implement via Cloud Function - P2)
- Emergency contact can tap link to view trip status (read-only)

### 4.7 Update trip details screen to show share count (optional P2)
- Track number of times trip was shared in Firestore
- Show badge: "Shared with 3 people"
- Just for reference, not critical for MVP

---

## PHASE 5: INTEGRATION & POLISH

### 5.1 Validate all navigation flows
- Chat creation → messages tab → chat details: all screens load correctly
- Trip status transitions: all buttons appear/disappear at right times
- Trip sharing deep links: navigate to trip details and app handles unauth
- Back button behavior: proper navigation stack management

### 5.2 Implement loading states
- All thunks set `loading: true` while pending, `false` on completion
- Show spinners on buttons while updating
- Disable buttons while loading to prevent double-taps
- Toast/Alert for success messages

### 5.3 Implement error handling
- All async operations wrapped in try-catch
- Dispatch errors to Redux state
- Show `ErrorAlert` for failures: network, validation, permission errors
- Log errors to console for debugging

### 5.4 Add offline resilience (P2)
- Redux persist already caches state locally
- Show "Offline" indicator when sending message fails
- Queue messages locally, send when online
- Trip updates: show "Syncing..." state

### 5.5 Test security rules
- Attempt unauthorized chat access → Firestore deny
- Attempt non-driver trip status update → Firestore deny
- Attempt to modify immutable messages → Firestore deny
- Deploy rules to production

### 5.6 Test notifications end-to-end
- Send message → notification appears on other device
- Update trip status → both parties get notification
- Tap notification → correct screen opens with correct data

### 5.7 Performance optimization
- Chat list: add pagination (first 20 chats, load more on scroll)
- Messages: virtualize long message lists via Gifted Chat `renderListContainer`
- Real-time listeners: unsubscribe properly in cleanup
- Images: compress before upload (P3 - for image messages later)

### 5.8 Accessibility audit
- All buttons have `accessibilityLabel`
- Colors have sufficient contrast (status badges)
- Screen readers can navigate chat and trip lists

### 5.9 Update tab bar icons
- Messages tab: add unread count badge if chats have unread messages
- Trips tab: add badge for upcoming trips or status changes

---

## Database Schema

### Firestore Collections

#### chats/{chatId}
```javascript
{
  chatId: "auto-generated",
  participants: ["driverId", "riderId"],
  participantDetails: {
    driverId: { name, photoURL },
    riderId: { name, photoURL }
  },
  rideId: "rideId123",
  tripId: "tripId456",
  lastMessage: { 
    text: "See you at 8am!", 
    senderId: "userId1", 
    timestamp: Timestamp 
  },
  unreadCount: { 
    driverId: 0, 
    riderId: 2 
  },
  isActive: true,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### chats/{chatId}/messages/{messageId}
```javascript
{
  messageId: "auto-generated",
  senderId: "userId1",
  text: "What time should I pick you up?",
  timestamp: Timestamp,
  isRead: false,
  type: "text" // future: "image"
}
```

### Firestore Indexes Required

**Composite Index: chats collection**
- Collection: `chats`
- Fields:
  - `participants` (array-contains)
  - `updatedAt` (descending)
- Purpose: Show user's chats sorted by most recent

**Existing in trips collection** (already supports status queries):
- `status` field exists
- `statusHistory` array exists
- No new indexes required

---

## Security Rules Updates

```javascript
// Add to firestore.rules

// Chats - only participants can access
match /chats/{chatId} {
  allow read, write: if request.auth != null && 
    request.auth.uid in resource.data.participants;
}

// Messages - only participants can read/create, immutable
match /chats/{chatId}/messages/{messageId} {
  allow read: if request.auth != null && 
    request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants;
  allow create: if request.auth != null && 
    request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants &&
    request.resource.data.senderId == request.auth.uid;
  allow update, delete: if false; // Messages are immutable
}

// Update trips rule - allow driver to update status only
match /trips/{tripId} {
  allow read: if request.auth != null && 
    (request.auth.uid == resource.data.driverId || request.auth.uid == resource.data.riderId);
  allow update: if request.auth != null && 
    request.auth.uid == resource.data.driverId &&
    // Only allow updating specific fields
    request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'statusHistory', 'startedAt', 'completedAt', 'updatedAt']);
  allow create, delete: if false; // Trips created via acceptRequest, never deleted
}
```

---

## Dependencies to Install

```bash
npm install react-native-gifted-chat
```

**Verification**: Check compatibility with Expo SDK version in package.json

---

## Testing Checklist

### Phase 2 - Messaging
- [ ] Create chat when trip confirmed
- [ ] Send message appears in both devices
- [ ] Messages sync in real-time
- [ ] Unread count updates correctly
- [ ] Notification received when message sent
- [ ] Tap notification opens correct chat
- [ ] Chat list shows most recent first
- [ ] Empty state displays when no chats

### Phase 3 - Trip Status
- [ ] Driver can start trip (Confirmed → InProgress)
- [ ] Driver can complete trip (InProgress → Completed)
- [ ] Rider receives notifications for status changes
- [ ] Status timeline displays correctly
- [ ] Cancel trip works with time buffer
- [ ] Trip reminders sent at 24h and 2h
- [ ] My Trips shows correct status grouping
- [ ] Non-driver cannot update status (security rule)

### Phase 4 - Sharing
- [ ] Share button generates correct deep link
- [ ] Deep link opens trip details when tapped
- [ ] Share sheet appears with trip info
- [ ] Unauthenticated user redirected to signin
- [ ] After signin, navigates to shared trip

### Phase 5 - Integration
- [ ] All navigation flows work end-to-end
- [ ] Loading states display correctly
- [ ] Error alerts show on failures
- [ ] Security rules block unauthorized access
- [ ] Notifications work end-to-end
- [ ] Performance acceptable with 50+ messages
- [ ] Accessibility labels present

---

## Technical Debt & Future Enhancements

### P2 Features (Post-Week 6)
- Typing indicators in chat
- Image messages with compression
- Real-time location sharing during trip
- Message search functionality
- Chat archiving for old trips
- Trip preview modal for shared links
- Share with emergency contacts via SMS
- Online/offline status indicators

### P3 Features (Later)
- Voice messages
- Message reactions/emojis
- Trip rating system
- Review system
- In-app payment integration

---

## Implementation Timeline

| Day | Phase | Tasks | Hours |
|-----|-------|-------|-------|
| 1 | Phase 1 & 2.1-2.3 | Redux setup, Firestore ops, chat screen basics | 8h |
| 2 | Phase 2.4-2.9 | Complete messaging UI, notifications, integration | 8h |
| 3 | Phase 3.1-3.5 | Trip status backend, UI controls | 8h |
| 4 | Phase 3.6-3.10 | Rider confirmation, notifications, reminders | 8h |
| 5 | Phase 4 & 5 | Trip sharing, deep links, polish & testing | 8h |

**Total**: 40 hours

---

## Success Criteria

✅ Users can chat in real-time after trip confirmation  
✅ Message notifications work on both iOS/Android  
✅ Driver can start and complete trips with button taps  
✅ Rider receives notifications for all status changes  
✅ Trip sharing generates working deep links  
✅ All security rules properly restrict access  
✅ No crashes or major bugs in core flows  
✅ Performance acceptable with typical data loads

---

## Notes

- All features build on Week 5 infrastructure (notifications, trips, real-time listeners)
- No paid services required (using Expo's free FCM integration)
- Follows established patterns: Redux thunks, Firestore operations, component structure
- Security-first approach: validate on both client and Firestore rules
- Incremental implementation: each step can be tested before moving forward
- MVP focused: defer P2/P3 features to maintain timeline

---

**Document Version**: 1.0  
**Last Updated**: December 31, 2025
