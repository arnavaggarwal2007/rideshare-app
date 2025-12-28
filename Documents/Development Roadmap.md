**Rideshare App MVP: Complete Development Roadmap**

**For First-Time App Builders | 8-Week Timeline | React Native \+ Firebase**

**GITHUB KEY:**  
**github\_pat\_11AVYQN5I0cg0M0ZKPdrZq\_66Gi6KQ6wwv83Q60oBVYVkUMvt7CjMAro064ZquNkJ5F5TZ56Z5eJorrxTo**

**Week 2 Days 1-2 Status (Updated 2025-12-22)**

* ✅ Emergency Contacts: Implemented name, phone, relationship (up to 3). Email field deferred.
* ✅ Preferences/Tags: Implemented music, chattiness, pet-friendly, smoking.
* ✅ Flow: Signup → Profile setup (with new fields) → Firestore save verified after redirects fix.
* Deferred (polish): Profile photo upload; emergency contact email field; optional school autocomplete.


**Week 2 Days 3-4 Status (Updated 2025-12-22)**

* ✅ Edit Profile: Modal migration, full form, Firestore update, validation, UI polish, navigation fix complete.
* ✅ Profile completion checker: Required fields validated, error handling in place.
* ⚠️ View other user profiles: Not yet implemented (next priority for navigation polish).
* ✅ Navigation: Tab bar, modal, and auth flow working. Minor home flicker after edit-profile save is known and accepted for now.
* ✅ Emergency Contacts: UI and logic complete.
* ✅ Preferences/Tags: UI and logic complete.
* ✅ Full flow tested: Profile → Edit → Save → Back, Firestore updates verified.

**Week 2 Day 5 Status (Updated 2025-12-24)**

* ✅ Redux Toolkit Store: Configured with dev/prod split, Redux Thunk enabled, persistence via AsyncStorage.
* ✅ State Slices: authSlice, ridesSlice, tripsSlice all implemented with CRUD reducers and error/loading states.
* ✅ Redux DevTools: Enabled in dev mode only, sensitive fields (stsTokenManager) sanitized.
* ✅ Redux Persist: Configured to persist auth, rides, trips slices across app restarts.
* ✅ AuthContext Integration: Redux syncs with Firebase Auth, AuthContext marked as legacy for future migration.
* ✅ Error Handling Pattern: ErrorAlert component created and integrated into navigation guard.
* ✅ Documentation: Migration strategy (MIGRATION.md) and async thunk guide (THUNK_GUIDE.md) complete.
* Deferred: Async thunk integration (Week 3+), full AuthContext migration (Week 3+), profile photo upload (future polish).

**Week 3 Status (Updated 2025-12-27) - COMPLETE ✅**

* ✅ **Maps & Geolocation**: React Native Maps (Expo Go compatible), OSM Nominatim geocoding, reverse geocoding, draggable markers with address lookup, current location integration with expo-location, route information display via OpenRouteService.
* ✅ **Create Ride Screen**: Location autocomplete (LocationSearchInput component), date/time pickers (DateTimeInput component), seat/price/detour inputs, route preview via OpenRouteService, distance/duration calculation, Firestore save via Redux thunk, current location button.
* ✅ **My Rides Screen**: Real-time ride list with onSnapshot listener, status badges (Active/Full/Completed), Edit and Delete buttons, FlatList display, pull-to-refresh, Redux state integration.
* ✅ **Edit Ride Screen**: Pre-filled form loading, edit via updateRideThunk, Firestore updates.
* ✅ **Redux Integration**: createRideThunk, updateRideThunk, deleteRideThunk, fetchMyRides with proper error handling and state management.
* ✅ **Bug Fixes & Polish**: Driver name field consistency, photo URL field standardization, button alignment, error object rendering, undefined state variables, duplicate keys, missing dispatch imports. ~12 bugs fixed.
* ✅ **Additional Features**: Current location button, clear location buttons, search keyword generation, route info display, time-based status computation, empty states, duplicate prevention.
* **Note**: Implementation extended to ~60 hours due to additional features, polish, and bug fixes. All work completed within Week 3 window.
* **Deferred to Week 4+**: Ride photo upload (P2), advanced search keyword indexing, analytics logging, push notifications for ride updates.

**Table of Contents**

1. [Feature Prioritization Matrix](#bookmark=id.g688xm2aphvl)

2. [Database Schema Design](#bookmark=id.nnvd8tf7m1nc)

3. [Technical Architecture](#bookmark=id.6rgyd9o86yv0)

4. [Week-by-Week Development Roadmap](#bookmark=id.juli1v1fskf1)

5. [Essential Learning Resources](#bookmark=id.bfxnwt9bv2gv)

6. [Setup Guides](#bookmark=id.jd692v25va5)

7. [Code Structure & Best Practices](#bookmark=id.j325crlao2v8)

8. [Testing & Launch Checklist](#bookmark=id.3j7yutcoyq4r)





**Feature Prioritization Matrix**

**Priority Level System**

* **P0 (Critical)**: Must have for MVP launch \- app doesn't work without these

* **P1 (High)**: Core features that define the product value

* **P2 (Medium)**: Nice-to-have features that improve experience

* **P3 (Low)**: Post-launch features for growth phase

**Complete Feature List with Priorities**

**Authentication & User Management**

| Feature | Priority | Estimated Hours | Dependencies |
| :---- | :---- | :---- | :---- |
| Email/password sign up with .edu verification | P0 | 8h | Firebase Auth |
| Email verification flow | P0 | 4h | Firebase Auth |
| Login/logout functionality | P0 | 4h | Firebase Auth |
| Password reset | P1 | 3h | Firebase Auth |
| Profile creation (name, photo, school, major, year) | P0 | 6h | Firebase Storage, Firestore |
| Edit profile | P1 | 4h | Firestore | ✅ Complete (modal, full form, save logic, polish)
| View other user profiles | P1 | 3h | Firestore | ⬜ Not started
| Profile completion checker (ensure required fields filled) | P1 | 2h | - | ✅ Complete |

**Total P0/P1: 34 hours**

**Ride Posting (Driver Features)**

| Feature | Priority | Estimated Hours | Dependencies |
| :---- | :---- | :---- | :---- |
| Create ride post with route (start/end) | P0 | 10h | React Native Maps (Expo Go) + OpenRouteService/OSM, Firestore |
| Set departure date/time | P0 | 4h | Date picker |
| Specify available seats (1-7) | P0 | 2h | \- |
| Set price per seat | P0 | 3h | \- |
| Add optional description/caption | P1 | 2h | \- |
| Set max detour willingness (slider) | P1 | 3h | \- |
| Upload ride photo (optional) | P2 | 4h | Firebase Storage |
| View list of your active ride posts | P0 | 4h | Firestore |
| Edit ride post | P1 | 5h | Firestore |
| Delete/cancel ride post | P1 | 3h | Firestore |
| Mark ride as full/closed | P1 | 2h | Firestore |
| Auto-close ride after departure time | P2 | 3h | Cloud Functions |

**Total P0/P1: 38 hours**

**Ride Discovery (Rider Features)**

| Feature | Priority | Estimated Hours | Dependencies |
| :---- | :---- | :---- | :---- |
| Browse ride feed (chronological/proximity) | P0 | 12h | Firestore queries |
| Search by destination | P0 | 8h | Firestore, geolocation |
| Filter by date range | P1 | 4h | \- |
| Filter by price range | P2 | 3h | \- |
| Filter by available seats | P2 | 2h | \- |
| Map view of available rides | P1 | 10h | React Native Maps |
| See ride details (driver info, route, price, seats) | P0 | 5h | \- |
| Calculate route distance/duration | P1 | 6h | OpenRouteService Directions API (free OSM) |
| See "rides passing through" your destination | P2 | 8h | Geospatial queries |

**Total P0/P1: 45 hours**

**Booking & Matching**

| Feature | Priority | Estimated Hours | Dependencies |
| :---- | :---- | :---- | :---- |
| "Request Seat" button on ride posts | P0 | 4h | Firestore |
| Driver receives ride request notification | P0 | 5h | Push notifications |
| Driver can accept/decline requests | P0 | 6h | Firestore, notifications |
| Rider receives acceptance/decline notification | P0 | 4h | Push notifications |
| View list of pending requests (driver side) | P1 | 4h | Firestore |
| View list of your ride requests (rider side) | P1 | 4h | Firestore |
| Cancel request before acceptance | P1 | 3h | Firestore |
| Auto-decline old requests | P2 | 3h | Cloud Functions |

**Total P0/P1: 30 hours**

**In-App Messaging**

| Feature | Priority | Estimated Hours | Dependencies |
| :---- | :---- | :---- | :---- |
| Direct chat between matched driver/rider | P0 | 15h | Firestore, React Native Gifted Chat |
| Text messages only | P0 | Included | \- |
| Message notifications | P1 | 4h | Push notifications |
| Chat list showing all active conversations | P1 | 5h | Firestore |
| Mark messages as read | P2 | 3h | Firestore |
| Send images in chat | P3 | 6h | Firebase Storage |

**Total P0/P1: 24 hours**

**Trip Coordination**

| Feature | Priority | Estimated Hours | Dependencies |
| :---- | :---- | :---- | :---- |
| Set specific pickup location on map | P0 | 6h | React Native Maps |
| Set specific dropoff location on map | P0 | 4h | React Native Maps |
| View trip summary (who, when, where, price) | P0 | 5h | \- |
| Trip status tracking (Pending → Confirmed → In Progress → Completed) | P0 | 8h | Firestore |
| Driver marks "Trip Started" | P1 | 3h | \- |
| Driver marks "Trip Completed" | P0 | 3h | Firestore |
| Rider confirms trip completion | P1 | 2h | \- |
| Cancel confirmed trip (with time buffer) | P1 | 5h | Firestore, notifications |
| Trip reminder notifications (24h, 2h before) | P1 | 4h | Cloud Functions, notifications |

**Total P0/P1: 40 hours**

**Rating & Review System**

| Feature | Priority | Estimated Hours | Dependencies |
| :---- | :---- | :---- | :---- |
| Post-trip rating prompt (both parties) | P0 | 6h | Firestore |
| 1-5 star rating system | P0 | 4h | \- |
| Optional text review | P1 | 3h | Firestore |
| Display average rating on profile | P0 | 3h | Firestore aggregation |
| Display total trip count on profile | P0 | 2h | Firestore |
| Block next ride request until previous rated | P1 | 4h | Firestore rules |
| View past reviews on profile | P1 | 4h | Firestore |
| Report inappropriate review | P2 | 4h | Firestore |

**Total P0/P1: 26 hours**

**Safety Features**

| Feature | Priority | Estimated Hours | Dependencies |
| :---- | :---- | :---- | :---- |
| Add emergency contacts (up to 3\) | P0 | 5h | Firestore |
| "Share Trip" button generates shareable link | P0 | 8h | Deep linking |
"firstName": "John",  
"lastName": "Doe",  
"displayName": "John Doe",  
* \[ \] Set up React Native Maps (static map preview component)

* \[ \] Create address autocomplete component (OSM fetch)
"school": "Stanford University",  
* \[ \] Implement geocoding (address → coordinates)
"graduationYear": 2026,  
* \[ \] Create location picker on map (marker)

* \[ \] Test address search + map preview in Expo Go
"bio": "Love road trips! Always up for good music and conversation.",  
**Code Example: Address Autocomplete (OSM Nominatim)**  
// services/maps/geocoding.js  
export async function searchAddress(query) {  
  if (!query) return [];  
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=us&q=${encodeURIComponent(query)}`;  
  try {  
    const res = await fetch(url, { headers: { 'User-Agent': 'rideshare-app/1.0' } });  
    const data = await res.json();  
    return data.map(item => ({  
      address: item.display_name,  
      coordinates: { latitude: parseFloat(item.lat), longitude: parseFloat(item.lon) },  
      placeName: item.display_name,  
    }));  
  } catch (error) {  
    console.error('Geocoding error:', error);  
    return [];  
  }  
}

**Resources:**

* React Native Maps (Expo): [https://docs.expo.dev/versions/latest/sdk/map-view/](https://docs.expo.dev/versions/latest/sdk/map-view/)

* OSM Nominatim usage policy: [https://operations.osmfoundation.org/policies/nominatim/](https://operations.osmfoundation.org/policies/nominatim/)
"emailVerified": true,  
* Composite: school \+ averageRating (for ranked lists)
**Tasks:**

* [ ] Set up React Native Maps (static map preview component)

* [ ] Create address autocomplete component (OSM fetch)

* [ ] Implement geocoding (address → coordinates)

* [ ] Create location picker on map (marker)

* [ ] Test address search + map preview in Expo Go

**Code Example: Address Autocomplete (OSM Nominatim)**  
// services/maps/geocoding.js  
export async function searchAddress(query) {  
  if (!query) return [];  
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=us&q=${encodeURIComponent(query)}`;  
  try {  
    const res = await fetch(url, { headers: { 'User-Agent': 'rideshare-app/1.0' } });  
    const data = await res.json();  
    return data.map(item => ({  
      address: item.display_name,  
      coordinates: { latitude: parseFloat(item.lat), longitude: parseFloat(item.lon) },  
      placeName: item.display_name,  
    }));  
  } catch (error) {  
    console.error('Geocoding error:', error);  
    return [];  
  }  
}

**Resources:**

* React Native Maps (Expo): [https://docs.expo.dev/versions/latest/sdk/map-view/](https://docs.expo.dev/versions/latest/sdk/map-view/)

* OSM Nominatim usage policy: [https://operations.osmfoundation.org/policies/nominatim/](https://operations.osmfoundation.org/policies/nominatim/)

* Composite: school \+ averageRating (for ranked lists)

---

**2\. rides Collection**

rides/{rideId}  
{  
// Ride Basic Info  
"rideId": "auto-generated-id",  
"driverId": "userId-of-driver",  
"driverName": "John Doe",  
"driverPhotoURL": "https://...",  
"driverRating": 4.7,

// Route Information  
"startLocation": {  
"address": "450 Serra Mall, Stanford, CA 94305",  
"coordinates": {  
"latitude": 37.4275,  
"longitude": \-122.1697  
},  
"placeName": "Stanford University"  
},  
"endLocation": {  
"address": "San Francisco International Airport, CA",  
"coordinates": {  
"latitude": 37.6213,  
"longitude": \-122.3790  
},  
"placeName": "SFO Airport"  
},  
"routePolyline": "encoded-polyline-string", // for map display  
"distanceKm": 52.3,  
"durationMinutes": 45,

// Ride Details  
"departureDate": "2024-11-25",  
"departureTime": "14:30",  
"departureTimestamp": "2024-11-25T14:30:00Z", // for querying  
"totalSeats": 3,  
"availableSeats": 2, // updates as riders book  
"pricePerSeat": 15.00,  
"currency": "USD",

// Driver Preferences  
"maxDetourMinutes": 15,  
"description": "Heading to SFO for Thanksgiving. Happy to pick up along the way\!",  
"ridePhoto": "https://...", // optional  
"allowsPets": false, // future feature  
"allowsSmoking": false, // future feature

// Ride Status  
"status": "active", // "active", "full", "in\_progress", "completed", "cancelled"  
"isActive": true,

// Timestamps  
"createdAt": "2024-11-19T10:00:00Z",  
"updatedAt": "2024-11-19T10:00:00Z",  
"completedAt": null,

// Booking Management  
"bookedRiders": \["userId3", "userId4"\], // riders who got accepted  
"pendingRequests": \["userId5", "userId6"\], // riders waiting for approval

// Metadata for Queries  
"school": "Stanford University", // for filtering  
"searchKeywords": \["stanford", "sfo", "airport", "san francisco"\] // for search  
}

**Indexes Needed:**

* driverId (to find driver's rides)

* status (to filter active rides)

* departureTimestamp (to sort by date)

* school (to filter by school)

* Composite: status \+ departureTimestamp (active rides sorted by date)

* Composite: school \+ status \+ departureTimestamp (school-specific active rides)

* Geohash index on startLocation.coordinates and endLocation.coordinates for proximity searches

---

**3\. rideRequests Collection**

rideRequests/{requestId}  
{  
// Request Identification  
"requestId": "auto-generated-id",  
"rideId": "reference-to-ride",  
"riderId": "userId-of-requester",  
"riderName": "Jane Smith",  
"riderPhotoURL": "https://...",  
"riderRating": 4.9,  
"driverId": "userId-of-driver",

// Pickup/Dropoff Details (rider specifies)  
"requestedPickupLocation": {  
"address": "Green Library, Stanford, CA",  
"coordinates": {  
"latitude": 37.4259,  
"longitude": \-122.1671  
}  
},  
"requestedDropoffLocation": {  
"address": "SFO Terminal 2",  
"coordinates": {  
"latitude": 37.6213,  
"longitude": \-122.3815  
}  
},

// Request Details  
"seatsRequested": 1,  
"message": "Hi\! Can you pick me up from Green Library? Thanks\!",

// Status Management  
"status": "pending", // "pending", "accepted", "declined", "cancelled"  
"requestedAt": "2024-11-19T12:00:00Z",  
"respondedAt": null,  
"response": null, // driver's response message

// Metadata  
"isActive": true  
}

**Indexes Needed:**

* rideId \+ status (to get pending requests for a ride)

* riderId \+ status (to get rider's active requests)

* driverId \+ status (to get driver's pending requests)

---

**4\. trips Collection**

trips/{tripId}  
{  
// Trip Identification  
"tripId": "auto-generated-id",  
"rideId": "reference-to-original-ride",  
"driverId": "userId",  
"riderId": "userId",

// Participant Info (denormalized for easy access)  
"driver": {  
"userId": "userId1",  
"name": "John Doe",  
"photoURL": "https://...",  
"phoneNumber": "+14155551234",  
"rating": 4.7  
},  
"rider": {  
"userId": "userId2",  
"name": "Jane Smith",  
"photoURL": "https://...",  
"phoneNumber": "+14155559876",  
"rating": 4.9  
},

// Trip Route  
"pickupLocation": {  
"address": "Green Library, Stanford, CA",  
"coordinates": { "latitude": 37.4259, "longitude": \-122.1671 }  
},  
"dropoffLocation": {  
"address": "SFO Terminal 2",  
"coordinates": { "latitude": 37.6213, "longitude": \-122.3815 }  
},  
"route": {  
"distanceKm": 50.2,  
"durationMinutes": 42,  
"polyline": "encoded-string"  
},

// Trip Details  
"scheduledDepartureTime": "2024-11-25T14:30:00Z",  
"agreedPrice": 15.00,  
"paymentMethod": "Venmo", // "Venmo", "Cash", "Zelle", etc.

// Trip Status Tracking  
"status": "confirmed", // "confirmed", "in\_progress", "completed", "cancelled"  
"statusHistory": \[  
{ "status": "confirmed", "timestamp": "2024-11-19T13:00:00Z" },  
{ "status": "in\_progress", "timestamp": "2024-11-25T14:30:00Z" },  
{ "status": "completed", "timestamp": "2024-11-25T15:15:00Z" }  
\],

// Trip Lifecycle Timestamps  
"confirmedAt": "2024-11-19T13:00:00Z",  
"startedAt": null,  
"completedAt": null,  
"cancelledAt": null,  
"cancellationReason": null,

// Safety Features  
"sharedWithContacts": \["[contact1@email.com](mailto:contact1@email.com)", "[contact2@email.com](mailto:contact2@email.com)"\],  
"shareLink": "[https://yourapp.com/trip/abc123](https://yourapp.com/trip/abc123)",

// Post-Trip  
"isRatedByDriver": false,  
"isRatedByRider": false,  
"bothPartiesRated": false  
}

**Indexes Needed:**

* driverId \+ status (driver's active/past trips)

* riderId \+ status (rider's active/past trips)

* Composite: driverId \+ completedAt (trip history)

* Composite: riderId \+ completedAt (trip history)

---

**5\. reviews Collection**

reviews/{reviewId}  
{  
// Review Identification  
"reviewId": "auto-generated-id",  
"tripId": "reference-to-trip",  
"reviewerId": "userId-who-wrote-review",  
"revieweeId": "userId-being-reviewed",  
"reviewerRole": "driver", // "driver" or "rider"

// Review Content  
"rating": 5, // 1-5 stars  
"reviewText": "Great conversation and very punctual\! Highly recommend.",  
"tags": \["punctual", "friendly", "clean car"\], // optional predefined tags

// Review Context  
"isPublic": true,  
"createdAt": "2024-11-25T16:00:00Z",

// Moderation  
"isReported": false,  
"reportCount": 0,  
"isHidden": false  
}

**Indexes Needed:**

* revieweeId (to get all reviews for a user)

* tripId (to get reviews for a specific trip)

* Composite: revieweeId \+ createdAt (chronological reviews)

---

**6\. chats Collection (with subcollection for messages)**

chats/{chatId}  
{  
// Chat Identification  
"chatId": "auto-generated-id",  
"participants": \["userId1", "userId2"\], // always 2 users  
"participantDetails": {  
"userId1": {  
"name": "John Doe",  
"photoURL": "https://..."  
},  
"userId2": {  
"name": "Jane Smith",  
"photoURL": "https://..."  
}  
},

// Associated Trip/Ride  
"rideId": "rideId123",  
"tripId": "tripId456", // once trip is confirmed

// Chat Metadata  
"lastMessage": {  
"text": "See you tomorrow\!",  
"senderId": "userId1",  
"timestamp": "2024-11-24T20:15:00Z"  
},  
"unreadCount": {  
"userId1": 0,  
"userId2": 2  
},

// Chat Status  
"isActive": true,  
"createdAt": "2024-11-19T13:05:00Z",  
"updatedAt": "2024-11-24T20:15:00Z"  
}

// Subcollection: messages  
chats/{chatId}/messages/{messageId}  
{  
"messageId": "auto-generated-id",  
"senderId": "userId1",  
"text": "What time should I pick you up?",  
"timestamp": "2024-11-24T19:30:00Z",  
"isRead": false,  
"type": "text", // "text", "image" (future)  
"imageURL": null // for future image messages  
}

**Indexes Needed:**

* Composite: participants (array-contains) \+ updatedAt (to show chat list)

* Messages subcollection: timestamp (to order messages chronologically)

---

**7\. reports Collection**

reports/{reportId}  
{  
// Report Identification  
"reportId": "auto-generated-id",  
"reporterId": "userId-who-reported",  
"reportedUserId": "userId-being-reported",

// Report Context  
"reason": "inappropriate\_behavior", // predefined categories  
"description": "User was rude during the trip.",  
"relatedTripId": "tripId123", // optional  
"relatedReviewId": null, // if reporting a review

// Report Status  
"status": "pending", // "pending", "reviewed", "resolved", "dismissed"  
"createdAt": "2024-11-25T17:00:00Z",  
"reviewedAt": null,  
"reviewedBy": null, // admin userId  
"resolution": null  
}

---

**8\. notifications Collection**

notifications/{notificationId}  
{  
// Notification Identification  
"notificationId": "auto-generated-id",  
"userId": "recipient-userId",

// Notification Content  
"type": "ride\_request\_received", // types: ride\_request\_received, request\_accepted, new\_message, trip\_reminder, rating\_reminder  
"title": "New Ride Request",  
"body": "Jane Smith requested a seat on your ride to SFO.",

// Associated Data  
"data": {  
"rideId": "rideId123",  
"requestId": "requestId456",  
"senderId": "userId2"  
},

// Notification Status  
"isRead": false,  
"isSent": true,  
"createdAt": "2024-11-19T12:01:00Z",  
"readAt": null,

// Navigation  
"actionURL": "/ride-requests/requestId456" // deep link within app  
}

**Indexes Needed:**

* userId \+ isRead (to get unread notifications)

* userId \+ createdAt (chronological notification list)

---

**Firestore Security Rules (Essential)**

rules\_version \= '2';  
service cloud.firestore {  
match /databases/{database}/documents {

// Helper function to check if user is authenticated  
function isSignedIn() {  
  return request.auth \!= null;  
}

// Helper function to check if user is accessing their own data  
function isOwner(userId) {  
  return request.auth.uid \== userId;  
}

// Users collection  
match /users/{userId} {  
  // Anyone can read user profiles (for viewing driver/rider info)  
  allow read: if isSignedIn();  
    
  // Only the user can create/update their own profile  
  allow create: if isSignedIn() && isOwner(userId);  
  allow update: if isSignedIn() && isOwner(userId);  
    
  // No one can delete users (handle via admin)  
  allow delete: if false;  
}

// Rides collection  
match /rides/{rideId} {  
  // Anyone can read rides (for browsing)  
  allow read: if isSignedIn();  
    
  // Only authenticated users can create rides  
  allow create: if isSignedIn() &&   
                   request.resource.data.driverId \== request.auth.uid;  
    
  // Only the driver can update their own ride  
  allow update: if isSignedIn() &&   
                   resource.data.driverId \== request.auth.uid;  
    
  // Only the driver can delete their ride  
  allow delete: if isSignedIn() &&   
                   resource.data.driverId \== request.auth.uid;  
}

// Ride requests  
match /rideRequests/{requestId} {  
  // Rider and driver can read their own requests  
  allow read: if isSignedIn() &&   
                 (resource.data.riderId \== request.auth.uid ||   
                  resource.data.driverId \== request.auth.uid);  
    
  // Only riders can create requests  
  allow create: if isSignedIn() &&   
                   request.resource.data.riderId \== request.auth.uid;  
    
  // Only driver can update (accept/decline)  
  allow update: if isSignedIn() &&   
                   resource.data.driverId \== request.auth.uid;  
    
  // Rider can delete their own pending request  
  allow delete: if isSignedIn() &&   
                   resource.data.riderId \== request.auth.uid &&  
                   resource.data.status \== 'pending';  
}

// Trips collection  
match /trips/{tripId} {  
  // Only driver and rider can read their trip  
  allow read: if isSignedIn() &&   
                 (resource.data.driverId \== request.auth.uid ||   
                  resource.data.riderId \== request.auth.uid);  
    
  // Both driver and rider can update (status changes, ratings)  
  allow update: if isSignedIn() &&   
                   (resource.data.driverId \== request.auth.uid ||   
                    resource.data.riderId \== request.auth.uid);  
    
  // No one can delete trips  
  allow delete: if false;  
}

// Reviews  
match /reviews/{reviewId} {  
  // Anyone can read reviews  
  allow read: if isSignedIn();  
    
  // Only the reviewer can create their review  
  allow create: if isSignedIn() &&   
                   request.resource.data.reviewerId \== request.auth.uid;  
    
  // Reviews cannot be updated or deleted  
  allow update, delete: if false;  
}

// Chats  
match /chats/{chatId} {  
  // Only participants can read the chat  
  allow read: if isSignedIn() &&   
                 request.auth.uid in resource.data.participants;  
    
  // Participants can update chat metadata (last message, unread count)  
  allow update: if isSignedIn() &&   
                   request.auth.uid in resource.data.participants;  
    
  // Messages subcollection  
  match /messages/{messageId} {  
    // Only participants can read messages  
    allow read: if isSignedIn() &&   
                   request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants;  
      
    // Only participants can create messages  
    allow create: if isSignedIn() &&   
                     request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants &&  
                     request.resource.data.senderId \== request.auth.uid;  
  }  
}

// Notifications  
match /notifications/{notificationId} {  
  // Only the recipient can read their notifications  
  allow read: if isSignedIn() &&   
                 resource.data.userId \== request.auth.uid;  
    
  // Only the recipient can update (mark as read)  
  allow update: if isSignedIn() &&   
                   resource.data.userId \== request.auth.uid;  
}

// Reports  
match /reports/{reportId} {  
  // Only admins can read reports (set admin UIDs in a separate config)  
  allow read: if false; // handle via admin SDK  
    
  // Users can create reports  
  allow create: if isSignedIn() &&   
                   request.resource.data.reporterId \== request.auth.uid;  
}

}  
}

---

**Technical Architecture**

**Technology Stack**

**Frontend (Mobile App)**

Framework: React Native 0.76+ with Expo 52+  
Language: JavaScript (TypeScript optional for later)  
State Management: Redux Toolkit  
Navigation: React Navigation 7.x  
UI Components: React Native Elements \+ Custom Components  
Styling: StyleSheet (built-in) \+ NativeWind (Tailwind for RN)

**Backend & Services**

Backend-as-a-Service: Firebase

* Authentication: Firebase Auth

* Database: Cloud Firestore

* Storage: Firebase Storage

* Functions: Cloud Functions for Firebase

* Messaging: Firebase Cloud Messaging (FCM)

* Hosting: Firebase Hosting (for web dashboard later)

**APIs & External Services**

Maps & Geolocation:

* React Native Maps (Expo Go compatible; no paid Apple account needed)

* OpenRouteService Directions API (free, OSM-based)

* OSM Geocoding/Autocomplete (Nominatim/Photon)

* Expo Location (device GPS)

Note: Mapbox Maps SDK requires a custom dev client and paid Apple Developer account to run on iOS. Avoided here to stay fully free and Expo Go compatible.

**Development Tools**

Code Editor: VS Code  
Version Control: Git \+ GitHub  
Package Manager: npm or yarn  
Testing: Jest (unit tests), Expo Go (device testing)  
Debugging: React Native Debugger, Flipper

**Project Folder Structure**

rideshare-app/  
│  
├── app/ \# Expo Router pages (navigation)  
│ ├── (auth)/ \# Authentication screens  
│ │ ├── login.js  
│ │ ├── signup.js  
│ │ └── forgot-password.js  
│ ├── (tabs)/ \# Main app tabs (after login)  
│ │ ├── home.js \# Ride feed/search  
│ │ ├── my-rides.js \# Driver's posted rides  
│ │ ├── my-trips.js \# Rider's booked trips  
│ │ ├── messages.js \# Chat list  
│ │ └── profile.js \# User profile  
│ ├── ride/ \# Ride-related screens  
│ │ ├── \[id\].js \# Ride details (dynamic route)  
│ │ ├── create.js \# Create new ride  
│ │ └── edit.js \# Edit ride  
│ ├── trip/ \# Trip-related screens  
│ │ ├── \[id\].js \# Trip details  
│ │ └── share.js \# Share trip with contacts  
│ ├── chat/  
│ │ └── \[id\].js \# Individual chat screen  
│ ├── user/  
│ │ └── \[id\].js \# View other user's profile  
│ └── \_layout.js \# Root layout  
│  
├── components/ \# Reusable UI components  
│ ├── common/  
│ │ ├── Button.js  
│ │ ├── Input.js  
│ │ ├── Card.js  
│ │ └── Loading.js  
│ ├── ride/  
│ │ ├── RideCard.js \# Ride post card in feed  
│ │ ├── RideMap.js \# Map showing ride route  
│ │ └── RideRequestCard.js \# Pending request card  
│ ├── trip/  
│ │ ├── TripCard.js  
│ │ └── TripTimeline.js  
│ ├── user/  
│ │ ├── ProfileHeader.js  
│ │ └── RatingStars.js  
│ └── chat/  
│ └── MessageBubble.js  
│  
├── services/ \# Business logic & API calls  
│ ├── firebase/  
│ │ ├── config.js \# Firebase initialization  
│ │ ├── auth.js \# Auth methods  
│ │ ├── firestore.js \# Database operations  
│ │ └── storage.js \# File upload/download  
│ ├── maps/  
│ │ ├── geocoding.js \# Address search (OSM)  
│ │ ├── directions.js \# Route calculation (ORS)  
│ │ └── maps.js \# Map utilities (React Native Maps)  
│ └── notifications/  
│ └── pushNotifications.js \# Push notification setup  
│  
├── store/ \# Redux state management  
│ ├── slices/  
│ │ ├── authSlice.js \# User authentication state  
│ │ ├── ridesSlice.js \# Rides data  
│ │ ├── tripsSlice.js \# Trips data  
│ │ └── chatsSlice.js \# Chat messages  
│ └── store.js \# Redux store configuration  
│  
├── hooks/ \# Custom React hooks  
│ ├── useAuth.js \# Authentication hook  
│ ├── useLocation.js \# Geolocation hook  
│ └── useNotifications.js \# Notification hook  
│  
├── utils/ \# Helper functions  
│ ├── dateUtils.js \# Date formatting  
│ ├── validation.js \# Input validation  
│ ├── constants.js \# App constants  
│ └── helpers.js \# General utilities  
│  
├── assets/ \# Static files  
│ ├── images/  
│ ├── icons/  
│ └── fonts/  
│  
├── app.json \# Expo configuration  
├── package.json \# Dependencies  
├── .env \# Environment variables  
└── [README.md](http://README.md)  \# Project documentation

---

**Week-by-Week Development Roadmap**

**Pre-Development (Before Week 1\)**

**Time: 4-6 hours**

**Goal: Set up development environment and accounts**

1. **Install Development Tools**

   * \[ \] Install Node.js (v18 or newer): [https://nodejs.org/](https://nodejs.org/)

   * \[ \] Install VS Code: [https://code.visualstudio.com/](https://code.visualstudio.com/)

   * \[ \] Install Git: [https://git-scm.com/](https://git-scm.com/)

   * \[ \] Install Expo CLI: npm install \-g expo-cli

   * \[ \] Install EAS CLI: npm install \-g eas-cli

2. **Create Accounts**

   * \[ \] GitHub account for version control

   * \[ \] Firebase account: [https://firebase.google.com/](https://firebase.google.com/)

  * \[ \] OpenRouteService account (free tier): [https://openrouteservice.org/dev/#/signup](https://openrouteservice.org/dev/#/signup)

   * \[ \] Expo account: [https://expo.dev/](https://expo.dev/)

3. **Learning Foundations**

   * \[ \] Complete "React Native Basics" (2 hours): [https://reactnative.dev/docs/tutorial](https://reactnative.dev/docs/tutorial)

   * \[ \] Watch "Firebase Setup Tutorial" (1 hour): See resources section

---

**Week 1: Setup & Authentication (40 hours)**

**Goal: Working authentication system with user profiles**

**Day 1-2: Project Setup (16 hours)**

**Create new Expo project**

npx create-expo-app rideshare-app \--template blank  
cd rideshare-app

**Install core dependencies**

npm install @react-navigation/native @react-navigation/native-stack  
npm install react-native-screens react-native-safe-area-context  
npm install firebase  
npm install @react-native-firebase/app @react-native-firebase/auth  
npm install redux @reduxjs/toolkit react-redux  
npm install expo-location expo-image-picker expo-notifications

**Install UI libraries**

npm install react-native-elements @rneui/themed  
npm install react-native-vector-icons

**Tasks:**

* \[ \] Initialize Expo project

* \[ \] Set up folder structure (see architecture above)

* \[ \] Install all dependencies

* \[ \] Configure app.json with app name, bundle ID

* \[ \] Set up Git repository and make initial commit

**Resources:**

* Expo Setup: [https://docs.expo.dev/get-started/create-a-new-app/](https://docs.expo.dev/get-started/create-a-new-app/)

* Navigation Setup: [https://reactnative.dev/docs/navigation](https://reactnative.dev/docs/navigation)

**Day 3-4: Firebase Configuration (16 hours)**

**NOTE DO CLOUD STUFF LATER**

**Create Firebase Project:**

1. Go to Firebase Console: [https://console.firebase.google.com/](https://console.firebase.google.com/)

2. Click "Add Project"

3. Name it "rideshare-app-mvp"

4. Disable Google Analytics (for now)

5. Click "Create Project"

**Enable Authentication:**

1. In Firebase Console → Build → Authentication

2. Click "Get Started"

3. Enable "Email/Password" provider

4. Enable "Email link (passwordless sign-in)" (for verification)

**Create Firestore Database:**

1. Build → Firestore Database → "Create database"

2. Start in "test mode" (we'll add security rules later)

3. Choose location (us-central1 or closest to your users)

**Get Configuration:**

1. Project Settings → Your apps → Add app → Web

2. Register app nickname: "rideshare-web"

3. Copy the firebaseConfig object

**Tasks:**

* \[ \] Create Firebase project

* \[ \] Enable Email/Password authentication

* \[ \] Create Firestore database

* \[ \] Set up React Native Maps (static map preview component)

* \[ \] Create address autocomplete component (OSM fetch)

* \[ \] Implement geocoding (address → coordinates)

* \[ \] Create location picker on map (marker)

* \[ \] Test address search + map preview in Expo Go

**Code Example: Address Autocomplete (OSM Nominatim)**  
// services/maps/geocoding.js  
export async function searchAddress(query) {  
  if (!query) return [];  
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=us&q=${encodeURIComponent(query)}`;  
  try {  
    const res = await fetch(url, { headers: { 'User-Agent': 'rideshare-app/1.0' } });  
    const data = await res.json();  
    return data.map(item => ({  
      address: item.display_name,  
      coordinates: { latitude: parseFloat(item.lat), longitude: parseFloat(item.lon) },  
      placeName: item.display_name,  
    }));  
  } catch (error) {  
    console.error('Geocoding error:', error);  
    return [];  
  }  
}

**Resources:**

* React Native Maps (Expo): [https://docs.expo.dev/versions/latest/sdk/map-view/](https://docs.expo.dev/versions/latest/sdk/map-view/)

* OSM Nominatim usage policy: [https://operations.osmfoundation.org/policies/nominatim/](https://operations.osmfoundation.org/policies/nominatim/)
return eduEmailRegex.test(email);  
};

export const validatePassword \= (password) \=\> {  
// At least 8 characters, 1 uppercase, 1 lowercase, 1 number  
return password.length \>= 8 &&  
/\[A-Z\]/.test(password) &&  
/\[a-z\]/.test(password) &&  
/\[0-9\]/.test(password);  
};

**Resources:**

* React Native Forms: [https://reactnative.dev/docs/handling-text-input](https://reactnative.dev/docs/handling-text-input)

* Form Validation: [https://formik.org/docs/guides/react-native](https://formik.org/docs/guides/react-native)

---

**Week 2: User Profiles & Navigation (40 hours)**

**Goal: Complete user profile system with navigation**

**Day 1-2: Profile Creation (16 hours)**

**Tasks:**

* \[ \] Create profile creation screen (after signup)

* \[ \] Add profile photo picker (Expo ImagePicker)

* \[ \] Upload photos to Firebase Storage

* \[ \] Create Firestore user document on signup

* \[ \] Add fields: name, school, major, graduation year, bio

* \[ \] Implement school dropdown (autocomplete)

* \[ \] Save profile data to Firestore

**Code Example: Profile Photo Upload**  
// services/firebase/storage.js  
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';  
import { storage } from './config';

export const uploadProfilePhoto \= async (userId, imageUri) \=\> {  
try {  
const response \= await fetch(imageUri);  
const blob \= await response.blob();

const storageRef \= ref(storage, \`profilePhotos/${userId}.jpg\`);  
await uploadBytes(storageRef, blob);

const downloadURL \= await getDownloadURL(storageRef);  
return downloadURL;

} catch (error) {  
console.error('Error uploading photo:', error);  
throw error;  
}  
};

**Resources:**

* Expo ImagePicker: [https://docs.expo.dev/versions/latest/sdk/imagepicker/](https://docs.expo.dev/versions/latest/sdk/imagepicker/)

* Firebase Storage: [https://firebase.google.com/docs/storage/web/upload-files](https://firebase.google.com/docs/storage/web/upload-files)

**Day 3-4: Navigation Setup (16 hours)**

**Tasks:**

* \[ \] Set up Expo Router with tab navigation

* \[ \] Create bottom tab bar with 5 tabs (Home, My Rides, Trips, Messages, Profile)

* \[ \] Implement authentication flow (if logged in → tabs, else → auth screens)

* \[ \] Add navigation between screens

* \[ \] Add header navigation with back buttons

* \[ \] Create profile view screen (view own profile)

* \[ \] Create view other user profile screen

**Code Example: Tab Navigator**  
// app/(tabs)/\_layout.js  
import { Tabs } from 'expo-router';  
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {  
return (  
\<Tabs screenOptions={{ tabBarActiveTintColor: '\#007AFF' }}\>  
\<Tabs.Screen  
name="home"  
options={{  
title: 'Home',  
tabBarIcon: ({ color, size }) \=\> (

),  
}}  
/\>  
\<Tabs.Screen  
name="my-rides"  
options={{  
title: 'My Rides',  
tabBarIcon: ({ color, size }) \=\> (

),  
}}  
/\>  
{/\* Add other tabs \*/}  
\</Tabs\>  
);  
}

**Resources:**

* Expo Router: [https://docs.expo.dev/router/introduction/](https://docs.expo.dev/router/introduction/)

* React Navigation: [https://reactnavigation.org/docs/getting-started](https://reactnavigation.org/docs/getting-started)

**Day 5: Redux State Setup (8 hours)**

**Tasks:**

* \[x\] Set up Redux Toolkit store

* \[x\] Create authSlice for user state

* \[x\] Create ridesSlice for ride data

* \[x\] Create tripsSlice for trip data

* \[x\] Implement Redux persist (save state on app close)

* \[x\] Connect Redux to authentication flow

* \[x\] Enable Redux DevTools for debugging (development only, sanitize sensitive fields)

* \[x\] Document migration strategy: keep AuthContext and Redux in parallel, mark AuthContext as legacy, plan full migration to Redux

* \[x\] Confirm Redux Thunk middleware is enabled; document use of createAsyncThunk for future Firestore async actions

* \[x\] Add error handling pattern: wrap Firebase calls in try/catch, set error/loading state, display alerts

**Code Example: Auth Slice**  
// store/slices/authSlice.js  
import { createSlice } from '@reduxjs/toolkit';

const authSlice \= createSlice({  
name: 'auth',  
initialState: {  
user: null,  
isAuthenticated: false,  
loading: false,  
error: null,  
},  
reducers: {  
setUser: (state, action) \=\> {  
state.user \= action.payload;  
state.isAuthenticated \= true;  
},  
logout: (state) \=\> {  
state.user \= null;  
state.isAuthenticated \= false;  
},  
setLoading: (state, action) \=\> {  
state.loading \= action.payload;  
},  
setError: (state, action) \=\> {  
state.error \= action.payload;  
},  
},  
});

export const { setUser, logout, setLoading, setError } \= authSlice.actions;  
export default authSlice.reducer;

**Resources:**

* Redux Toolkit: [https://redux-toolkit.js.org/tutorials/quick-start](https://redux-toolkit.js.org/tutorials/quick-start)

* Redux with React Native: [https://redux.js.org/tutorials/essentials/part-1-overview-concepts](https://redux.js.org/tutorials/essentials/part-1-overview-concepts)

---

**Week 3: Ride Posting System (40 hours)**

**Goal: Drivers can create and manage ride posts**

**Day 1-2: Maps (Expo Go Compatible) & Address Autocomplete (16 hours)**

**Goal:** Keep maps free and runnable in Expo Go (no paid Apple account, no custom dev client).

**Install map library:**  
expo install react-native-maps

**APIs (all free tiers):**

* Map display: React Native Maps (included in Expo Go)

* Geocoding/autocomplete: OpenStreetMap Nominatim/Photon (HTTP fetch; no native code)

* Directions (used Day 3-4): OpenRouteService (ORS) free tier

**Tasks:**

* \[ \] Set up React Native Maps (static map preview component)

* \[ \] Create address autocomplete component (OSM fetch)

* \[ \] Implement geocoding (address → coordinates)

* \[ \] Create location picker on map (marker)

* \[ \] Test address search + map preview in Expo Go

**Code Example: Address Autocomplete (OSM Nominatim)**  
// services/maps/geocoding.js  
export async function searchAddress(query) {  
  if (!query) return [];  
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=us&q=${encodeURIComponent(query)}`;  
  try {  
    const res = await fetch(url, { headers: { 'User-Agent': 'rideshare-app/1.0' } });  
    const data = await res.json();  
    return data.map(item => ({  
      address: item.display_name,  
      coordinates: { latitude: parseFloat(item.lat), longitude: parseFloat(item.lon) },  
      placeName: item.display_name,  
    }));  
  } catch (error) {  
    console.error('Geocoding error:', error);  
    return [];  
  }  
}

**Resources:**

* React Native Maps (Expo): [https://docs.expo.dev/versions/latest/sdk/map-view/](https://docs.expo.dev/versions/latest/sdk/map-view/)

* OSM Nominatim usage policy: [https://operations.osmfoundation.org/policies/nominatim/](https://operations.osmfoundation.org/policies/nominatim/)

* Mapbox Geocoding API: [https://docs.mapbox.com/api/search/geocoding/](https://docs.mapbox.com/api/search/geocoding/)

**Day 3-4: Create Ride Screen (16 hours)**

**Tasks:**

* \[ \] Build "Create Ride" screen UI

* \[ \] Add start location input (autocomplete)

* \[ \] Add end location input (autocomplete)

* \[ \] Add date/time picker for departure

* \[ \] Add seat count selector (1-7)

* \[ \] Add price input

* \[ \] Add max detour slider (0-30 mins)

* \[ \] Add optional description text area

* \[ \] Calculate route using OpenRouteService Directions API (free tier)

* \[ \] Display route on map preview

* \[ \] Show distance and duration

* \[ \] Implement "Post Ride" button with Firestore save

**Code Example: Calculate Route (OpenRouteService)**  
// services/maps/directions.js  
const ORS_API_KEY \= process.env.EXPO\_PUBLIC\_ORS\_KEY;  

export const calculateRoute \= async (startCoords, endCoords) \=\> {  
  const body \= {  
    coordinates: [  
      [startCoords.longitude, startCoords.latitude],  
      [endCoords.longitude, endCoords.latitude],  
    ],  
    format: 'json',  
    elevation: false,  
  };  

  try {  
    const res \= await fetch('https://api.openrouteservice.org/v2/directions/driving-car', {  
      method: 'POST',  
      headers: {  
        'Content-Type': 'application/json',  
        Authorization: ORS_API_KEY,  
      },  
      body: JSON.stringify(body),  
    });  

    const data \= await res.json();  
    const route \= data.features?.[0];  
    if (!route) throw new Error('No route found');

    const distanceKm \= (route.properties.summary.distance / 1000).toFixed(1);  
    const durationMinutes \= Math.round(route.properties.summary.duration / 60);  
    const polyline \= route.geometry; // GeoJSON LineString

    return { distanceKm, durationMinutes, polyline };  
  } catch (error) {  
    console.error('Directions error:', error);  
    throw error;  
  }  
};

**Code Example: Save Ride to Firestore**  
// services/firebase/firestore.js  
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';  
import { db } from './config';

export const createRide \= async (rideData, userId, userProfile) \=\> {  
try {  
const ridesRef \= collection(db, 'rides');

const ride \= {  
  driverId: userId,  
  driverName: userProfile.displayName,  
  driverPhotoURL: userProfile.profilePhotoURL,  
  driverRating: userProfile.averageRating || 0,  
  startLocation: rideData.startLocation,  
  endLocation: rideData.endLocation,  
  routePolyline: rideData.routePolyline,  
  distanceKm: rideData.distanceKm,  
  durationMinutes: rideData.durationMinutes,  
  departureDate: rideData.departureDate,  
  departureTime: rideData.departureTime,  
  departureTimestamp: new Date(\`${rideData.departureDate}T${rideData.departureTime}\`),  
  totalSeats: rideData.totalSeats,  
  availableSeats: rideData.totalSeats,  
  pricePerSeat: rideData.pricePerSeat,  
  currency: 'USD',  
  maxDetourMinutes: rideData.maxDetourMinutes,  
  description: rideData.description || '',  
  status: 'active',  
  isActive: true,  
  createdAt: serverTimestamp(),  
  updatedAt: serverTimestamp(),  
  bookedRiders: \[\],  
  pendingRequests: \[\],  
  school: userProfile.school,  
  searchKeywords: generateSearchKeywords(rideData),  
};

const docRef \= await addDoc(ridesRef, ride);  
return docRef.id;

} catch (error) {  
console.error('Error creating ride:', error);  
throw error;  
}  
};

function generateSearchKeywords(rideData) {  
// Extract keywords from addresses for search  
const words \= \[  
...rideData.startLocation.address.toLowerCase().split(' '),  
...rideData.endLocation.address.toLowerCase().split(' '),  
rideData.startLocation.placeName.toLowerCase(),  
rideData.endLocation.placeName.toLowerCase(),  
\];

return \[...new Set(words)\]; // remove duplicates  
}

**Resources:**

* Mapbox Directions: [https://docs.mapbox.com/api/navigation/directions/](https://docs.mapbox.com/api/navigation/directions/)

* React Native DateTimePicker: [https://github.com/react-native-datetimepicker/datetimepicker](https://github.com/react-native-datetimepicker/datetimepicker)

* Firestore Add Data: [https://firebase.google.com/docs/firestore/manage-data/add-data](https://firebase.google.com/docs/firestore/manage-data/add-data)

**Day 5: My Rides Screen (8 hours)**

**Tasks:**

* \[ \] Create "My Rides" tab screen

* \[ \] Fetch user's posted rides from Firestore

* \[ \] Display rides in list/card format

* \[ \] Show ride status (active, full, completed)

* \[ \] Add "Edit Ride" button

* \[ \] Add "Delete Ride" button with confirmation

* \[ \] Implement real-time updates (listen to changes)

**Code Example: Fetch User Rides**  
// services/firebase/firestore.js  
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

export const subscribeToUserRides \= (userId, callback) \=\> {  
const ridesRef \= collection(db, 'rides');  
const q \= query(  
ridesRef,  
where('driverId', '==', userId),  
orderBy('departureTimestamp', 'desc')  
);

// Real-time listener  
const unsubscribe \= onSnapshot(q, (snapshot) \=\> {  
const rides \= snapshot.docs.map(doc \=\> ({  
id: [doc.id](http://doc.id),  
...doc.data()  
}));  
callback(rides);  
});

return unsubscribe; // Call this to stop listening  
};

**Resources:**

* Firestore Real-time Updates: [https://firebase.google.com/docs/firestore/query-data/listen](https://firebase.google.com/docs/firestore/query-data/listen)

---

**Week 4: Ride Discovery & Search (40 hours)**

**Goal: Riders can browse, search, and find rides**

**Day 1-2: Ride Feed (16 hours)**

**Tasks:**

* \[ \] Create Home screen with ride feed

* \[ \] Fetch all active rides from Firestore

* \[ \] Display rides in scrollable card list (FlatList)

* \[ \] Show ride details: route, date, time, price, driver info

* \[ \] Add "Pull to refresh" functionality

* \[ \] Implement pagination (load 20 rides at a time)

* \[ \] Sort by departure date (soonest first)

* \[ \] Handle empty state (no rides available)

**Code Example: Ride Card Component**  
// components/ride/RideCard.js  
import React from 'react';  
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';  
import { useRouter } from 'expo-router';  
import { Ionicons } from '@expo/vector-icons';

export default function RideCard({ ride }) {  
const router \= useRouter();

return (  
\<TouchableOpacity  
style={styles.card}  
onPress={() \=\> router.push(/ride/${ride.id})}  
\>

  \<View style={styles.route}\>  
    \<View style={styles.locationRow}\>  
      \<Ionicons name="radio-button-on" size={16} color="\#4CAF50" /\>  
      \<Text style={styles.location} numberOfLines={1}\>  
        {ride.startLocation.placeName}  
      \</Text\>  
    \</View\>  
      
    \<View style={styles.routeLine} /\>  
      
    \<View style={styles.locationRow}\>  
      \<Ionicons name="location" size={16} color="\#F44336" /\>  
      \<Text style={styles.location} numberOfLines={1}\>  
        {ride.endLocation.placeName}  
      \</Text\>  
    \</View\>  
  \</View\>  
    
  \<View style={styles.footer}\>  
    \<View style={styles.detailItem}\>  
      \<Ionicons name="calendar-outline" size={16} color="\#666" /\>  
      \<Text style={styles.detailText}\>  
        {formatDate(ride.departureDate)} at {ride.departureTime}  
      \</Text\>  
    \</View\>  
    \<View style={styles.detailItem}\>  
      \<Ionicons name="people-outline" size={16} color="\#666" /\>  
      \<Text style={styles.detailText}\>  
        {ride.availableSeats} seat{ride.availableSeats \!== 1 ? 's' : ''} left  
      \</Text\>  
    \</View\>  
  \</View\>  
\</TouchableOpacity\>

);  
}

const styles \= StyleSheet.create({  
card: {  
backgroundColor: '\#fff',  
borderRadius: 12,  
padding: 16,  
marginHorizontal: 16,  
marginVertical: 8,  
shadowColor: '\#000',  
shadowOffset: { width: 0, height: 2 },  
shadowOpacity: 0.1,  
shadowRadius: 4,  
elevation: 3,  
},  
header: {  
flexDirection: 'row',  
alignItems: 'center',  
marginBottom: 12,  
},  
avatar: {  
width: 48,  
height: 48,  
borderRadius: 24,  
},  
driverInfo: {  
flex: 1,  
marginLeft: 12,  
},  
driverName: {  
fontSize: 16,  
fontWeight: '600',  
marginBottom: 4,  
},  
ratingRow: {  
flexDirection: 'row',  
alignItems: 'center',  
},  
rating: {  
marginLeft: 4,  
fontSize: 14,  
color: '\#666',  
},  
priceTag: {  
alignItems: 'flex-end',  
},  
price: {  
fontSize: 20,  
fontWeight: 'bold',  
color: '\#007AFF',  
},  
perSeat: {  
fontSize: 11,  
color: '\#999',  
},  
route: {  
marginVertical: 12,  
},  
locationRow: {  
flexDirection: 'row',  
alignItems: 'center',  
marginVertical: 4,  
},  
routeLine: {  
width: 2,  
height: 20,  
backgroundColor: '\#E0E0E0',  
marginLeft: 7,  
marginVertical: 2,  
},  
location: {  
marginLeft: 8,  
fontSize: 14,  
color: '\#333',  
flex: 1,  
},  
footer: {  
flexDirection: 'row',  
justifyContent: 'space-between',  
marginTop: 8,  
paddingTop: 12,  
borderTopWidth: 1,  
borderTopColor: '\#F0F0F0',  
},  
detailItem: {  
flexDirection: 'row',  
alignItems: 'center',  
},  
detailText: {  
marginLeft: 6,  
fontSize: 13,  
color: '\#666',  
},  
});

**Resources:**

* FlatList Performance: [https://reactnative.dev/docs/optimizing-flatlist-configuration](https://reactnative.dev/docs/optimizing-flatlist-configuration)

* Pagination: [https://firebase.google.com/docs/firestore/query-data/query-cursors](https://firebase.google.com/docs/firestore/query-data/query-cursors)

**Day 3-4: Search & Filter (16 hours)**

**Tasks:**

* \[ \] Add search bar at top of Home screen

* \[ \] Implement search by destination (query Firestore)

* \[ \] Add date range filter (date picker modal)

* \[ \] Add price range filter (slider)

* \[ \] Add available seats filter

* \[ \] Show filtered results in real-time

* \[ \] Add "Clear Filters" button

* \[ \] Display filter count badge

**Code Example: Search Rides**  
// services/firebase/firestore.js  
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

export const searchRides \= async (searchParams) \=\> {  
try {  
const ridesRef \= collection(db, 'rides');  
let q \= query(ridesRef, where('status', '==', 'active'));

// Filter by destination keywords  
if (searchParams.destination) {  
  q \= query(  
    q,  
    where('searchKeywords', 'array-contains', searchParams.destination.toLowerCase())  
  );  
}

// Filter by date range  
if (searchParams.startDate) {  
  q \= query(  
    q,  
    where('departureTimestamp', '\>=', new Date(searchParams.startDate))  
  );  
}

if (searchParams.endDate) {  
  q \= query(  
    q,  
    where('departureTimestamp', '\<=', new Date(searchParams.endDate))  
  );  
}

q \= query(q, orderBy('departureTimestamp', 'asc'));

const snapshot \= await getDocs(q);  
let rides \= snapshot.docs.map(doc \=\> ({ id: doc.id, ...doc.data() }));

// Client-side filtering for price and seats (Firestore has query limitations)  
if (searchParams.maxPrice) {  
  rides \= rides.filter(ride \=\> ride.pricePerSeat \<= searchParams.maxPrice);  
}

if (searchParams.minSeats) {  
  rides \= rides.filter(ride \=\> ride.availableSeats \>= searchParams.minSeats);  
}

return rides;

} catch (error) {  
console.error('Search error:', error);  
throw error;  
}  
};

**Resources:**

* Firestore Queries: [https://firebase.google.com/docs/firestore/query-data/queries](https://firebase.google.com/docs/firestore/query-data/queries)

* Array Contains: [https://firebase.google.com/docs/firestore/query-data/queries\#array\_membership](https://firebase.google.com/docs/firestore/query-data/queries#array_membership)

**Day 5: Ride Details Screen (8 hours)**

**Tasks:**

* \[ \] Create Ride Details screen (when user taps a ride card)

* \[ \] Display full ride information

* \[ \] Show route on interactive map

* \[ \] Display driver profile (photo, name, rating, bio)

* \[ \] Show all ride details (date, time, price, seats, detour)

* \[ \] Add "Request Seat" button (if user is not the driver)

* \[ \] Navigate to driver's full profile on tap

**Code Example: Ride Details Screen**  
// app/ride/\[id\].js  
import { useLocalSearchParams } from 'expo-router';  
import { useEffect, useState } from 'react';  
import { doc, getDoc } from 'firebase/firestore';  
import { db } from '../../services/firebase/config';

export default function RideDetailsScreen() {  
const { id } \= useLocalSearchParams(); // Get ride ID from URL  
const \[ride, setRide\] \= useState(null);  
const \[loading, setLoading\] \= useState(true);

useEffect(() \=\> {  
loadRideDetails();  
}, \[id\]);

const loadRideDetails \= async () \=\> {  
try {  
const rideDoc \= await getDoc(doc(db, 'rides', id));  
if (rideDoc.exists()) {  
setRide({ id: [rideDoc.id](http://rideDoc.id), ...rideDoc.data() });  
}  
} catch (error) {  
console.error('Error loading ride:', error);  
} finally {  
setLoading(false);  
}  
};

// ... rest of component with UI  
}

---

**Week 5: Booking & Matching (40 hours)**

**Goal: Riders can request seats, drivers can accept/decline**

**Day 1-2: Request Seat Flow (16 hours)**

**Tasks:**

* \[ \] Add "Request Seat" button on Ride Details screen

* \[ \] Create modal/screen for ride request

* \[ \] Let rider specify pickup location (map picker)

* \[ \] Let rider specify dropoff location (map picker)

* \[ \] Add optional message to driver

* \[ \] Save request to rideRequests collection

* \[ \] Send push notification to driver

* \[ \] Show confirmation to rider

**Code Example: Create Ride Request**  
// services/firebase/firestore.js  
export const createRideRequest \= async (requestData) \=\> {  
try {  
const requestsRef \= collection(db, 'rideRequests');

const request \= {  
  rideId: requestData.rideId,  
  riderId: requestData.riderId,  
  riderName: requestData.riderName,  
  riderPhotoURL: requestData.riderPhotoURL,  
  riderRating: requestData.riderRating,  
  driverId: requestData.driverId,  
  requestedPickupLocation: requestData.pickupLocation,  
  requestedDropoffLocation: requestData.dropoffLocation,  
  seatsRequested: requestData.seatsRequested,  
  message: requestData.message || '',  
  status: 'pending',  
  requestedAt: serverTimestamp(),  
  respondedAt: null,  
  response: null,  
  isActive: true,  
};

const docRef \= await addDoc(requestsRef, request);

// Update ride's pendingRequests array  
const rideRef \= doc(db, 'rides', requestData.rideId);  
await updateDoc(rideRef, {  
  pendingRequests: arrayUnion(requestData.riderId)  
});

// Send notification to driver  
await sendNotification(requestData.driverId, {  
  type: 'ride\_request\_received',  
  title: 'New Ride Request',  
  body: \`${requestData.riderName} requested a seat on your ride.\`,  
  data: { rideId: requestData.rideId, requestId: docRef.id }  
});

return docRef.id;

} catch (error) {  
console.error('Error creating request:', error);  
throw error;  
}  
};

**Resources:**

* Array Union: [https://firebase.google.com/docs/firestore/manage-data/add-data\#update\_elements\_in\_an\_array](https://firebase.google.com/docs/firestore/manage-data/add-data#update_elements_in_an_array)

**Day 3-4: Accept/Decline Requests (16 hours)**

**Tasks:**

* \[ \] Create "Ride Requests" section in driver's My Rides screen

* \[ \] Show list of pending requests for each ride

* \[ \] Display request details (rider info, pickup/dropoff, message)

* \[ \] Add "Accept" and "Decline" buttons

* \[ \] Handle accept: create trip, update ride seats, notify rider

* \[ \] Handle decline: update request status, notify rider

* \[ \] Update UI in real-time when requests change

**Code Example: Accept Ride Request**  
// services/firebase/firestore.js  
import { runTransaction } from 'firebase/firestore';

export const acceptRideRequest \= async (requestId, rideId, riderId, driverId) \=\> {  
try {  
// Use transaction to ensure atomic updates  
await runTransaction(db, async (transaction) \=\> {  
// Get current ride data  
const rideRef \= doc(db, 'rides', rideId);  
const rideDoc \= await transaction.get(rideRef);  
const rideData \= rideDoc.data();

  // Check if seats still available  
  if (rideData.availableSeats \< 1\) {  
    throw new Error('No seats available');  
  }  
    
  // Update request status  
  const requestRef \= doc(db, 'rideRequests', requestId);  
  transaction.update(requestRef, {  
    status: 'accepted',  
    respondedAt: serverTimestamp()  
  });  
    
  // Update ride: decrease available seats, move rider to booked  
  transaction.update(rideRef, {  
    availableSeats: rideData.availableSeats \- 1,  
    bookedRiders: arrayUnion(riderId),  
    pendingRequests: arrayRemove(riderId),  
    updatedAt: serverTimestamp()  
  });  
    
  // Create trip document  
  const requestDoc \= await transaction.get(requestRef);  
  const requestData \= requestDoc.data();  
    
  const tripsRef \= collection(db, 'trips');  
  const newTripRef \= doc(tripsRef); // Auto-generate ID  
    
  transaction.set(newTripRef, {  
    tripId: newTripRef.id,  
    rideId: rideId,  
    driverId: driverId,  
    riderId: riderId,  
    driver: {  
      userId: driverId,  
      name: rideData.driverName,  
      photoURL: rideData.driverPhotoURL,  
      rating: rideData.driverRating  
    },  
    rider: {  
      userId: riderId,  
      name: requestData.riderName,  
      photoURL: requestData.riderPhotoURL,  
      rating: requestData.riderRating  
    },  
    pickupLocation: requestData.requestedPickupLocation,  
    dropoffLocation: requestData.requestedDropoffLocation,  
    scheduledDepartureTime: rideData.departureTimestamp,  
    agreedPrice: rideData.pricePerSeat,  
    status: 'confirmed',  
    confirmedAt: serverTimestamp(),  
    isRatedByDriver: false,  
    isRatedByRider: false,  
    bothPartiesRated: false  
  });  
});

// Send notification to rider  
await sendNotification(riderId, {  
  type: 'request\_accepted',  
  title: 'Request Accepted\!',  
  body: 'Your ride request has been accepted.',  
  data: { rideId: rideId }  
});

return true;

} catch (error) {  
console.error('Error accepting request:', error);  
throw error;  
}  
};

**Resources:**

* Firestore Transactions: [https://firebase.google.com/docs/firestore/manage-data/transactions](https://firebase.google.com/docs/firestore/manage-data/transactions)

**Day 5: Request Management (8 hours)**

**Tasks:**

* \[ \] Create "My Requests" section in rider's Trips tab

* \[ \] Show list of pending/accepted/declined requests

* \[ \] Allow rider to cancel pending request

* \[ \] Display request status with visual indicators

* \[ \] Show notification when request is accepted/declined

---

**Week 6: Messaging & Trip Management (40 hours)**

**Goal: In-app chat and trip tracking**

**Day 1-2: In-App Chat Setup (16 hours)**

**Install React Native Gifted Chat:**  
npm install react-native-gifted-chat

**Tasks:**

* \[ \] Set up chat collection structure in Firestore

* \[ \] Create chat when trip is confirmed

* \[ \] Create Messages tab screen showing chat list

* \[ \] Display all active chats with last message preview

* \[ \] Create individual chat screen (using Gifted Chat)

* \[ \] Implement send message functionality

* \[ \] Real-time message updates

* \[ \] Show unread message count

**Code Example: Chat Screen**  
// app/chat/\[id\].js  
import React, { useState, useEffect, useCallback } from 'react';  
import { GiftedChat } from 'react-native-gifted-chat';  
import { collection, query, orderBy, onSnapshot, addDoc } from 'firebase/firestore';  
import { db } from '../../services/firebase/config';

export default function ChatScreen({ chatId, currentUserId }) {  
const \[messages, setMessages\] \= useState(\[\]);

useEffect(() \=\> {  
const messagesRef \= collection(db, chats/${chatId}/messages);  
const q \= query(messagesRef, orderBy('timestamp', 'desc'));

const unsubscribe \= onSnapshot(q, (snapshot) \=\> {  
  const msgs \= snapshot.docs.map(doc \=\> ({  
    \_id: doc.id,  
    text: doc.data().text,  
    createdAt: doc.data().timestamp?.toDate(),  
    user: {  
      \_id: doc.data().senderId,  
      name: doc.data().senderName,  
      avatar: doc.data().senderPhotoURL,  
    },  
  }));  
  setMessages(msgs);  
});

return () \=\> unsubscribe();

}, \[chatId\]);

const onSend \= useCallback(async (newMessages \= \[\]) \=\> {  
const message \= newMessages\[0\];

try {  
  await addDoc(collection(db, \`chats/${chatId}/messages\`), {  
    text: message.text,  
    senderId: currentUserId,  
    timestamp: serverTimestamp(),  
  });  
    
  // Update chat's last message  
  await updateDoc(doc(db, 'chats', chatId), {  
    lastMessage: {  
      text: message.text,  
      senderId: currentUserId,  
      timestamp: serverTimestamp()  
    },  
    updatedAt: serverTimestamp()  
  });  
} catch (error) {  
  console.error('Error sending message:', error);  
}

}, \[chatId, currentUserId\]);

return (  
\<GiftedChat  
messages={messages}  
onSend={messages \=\> onSend(messages)}  
user={{ \_id: currentUserId }}  
/\>  
);  
}

**Resources:**

* React Native Gifted Chat: [https://github.com/FaridSafi/react-native-gifted-chat](https://github.com/FaridSafi/react-native-gifted-chat)

* Firestore Subcollections: [https://firebase.google.com/docs/firestore/data-model\#subcollections](https://firebase.google.com/docs/firestore/data-model#subcollections)

**Day 3-4: Trip Status Tracking (16 hours)**

**Tasks:**

* \[ \] Create Trip Details screen

* \[ \] Display trip information (driver/rider info, route, time)

* \[ \] Show trip status timeline (Confirmed → In Progress → Completed)

* \[ \] Add "Start Trip" button for driver

* \[ \] Add "Complete Trip" button for driver

* \[ \] Update trip status in Firestore

* \[ \] Send status notifications to both parties

* \[ \] Allow trip cancellation (with confirmation)

**Code Example: Trip Status Update**  
// services/firebase/firestore.js  
export const updateTripStatus \= async (tripId, newStatus, userId) \=\> {  
try {  
const tripRef \= doc(db, 'trips', tripId);  
const tripDoc \= await getDoc(tripRef);  
const tripData \= tripDoc.data();

// Verify user is driver  
if (tripData.driverId \!== userId) {  
  throw new Error('Only driver can update trip status');  
}

const updates \= {  
  status: newStatus,  
  updatedAt: serverTimestamp(),  
  statusHistory: arrayUnion({  
    status: newStatus,  
    timestamp: new Date().toISOString()  
  })  
};

if (newStatus \=== 'in\_progress') {  
  updates.startedAt \= serverTimestamp();  
} else if (newStatus \=== 'completed') {  
  updates.completedAt \= serverTimestamp();  
}

await updateDoc(tripRef, updates);

// Notify rider  
const notificationBody \=   
  newStatus \=== 'in\_progress' ? 'Your trip has started\!' :  
  newStatus \=== 'completed' ? 'Your trip is complete. Please rate your experience.' :  
  'Trip status updated';

await sendNotification(tripData.riderId, {  
  type: 'trip\_status\_update',  
  title: 'Trip Update',  
  body: notificationBody,  
  data: { tripId: tripId }  
});

return true;

} catch (error) {  
console.error('Error updating trip status:', error);  
throw error;  
}  
};

**Day 5: Trip Share Feature (8 hours)**

**Tasks:**

* \[ \] Add "Share Trip" button on Trip Details screen

* \[ \] Generate shareable link with trip details

* \[ \] Use Expo Linking to create deep link

* \[ \] Show share sheet (SMS, email, WhatsApp)

* \[ \] Create public trip view page (web view)

* \[ \] Display driver info, route, ETA on shared page

**Code Example: Share Trip**  
// utils/shareTrip.js  
import \* as Linking from 'expo-linking';  
import { Share } from 'react-native';

export const shareTrip \= async (trip) \=\> {  
const shareURL \= Linking.createURL(/trip/${trip.tripId});

const message \= \`  
🚗 Trip Shared for Safety

Driver: ${[trip.driver.name](http://trip.driver.name)}  
From: ${trip.pickupLocation.address}  
To: ${trip.dropoffLocation.address}  
Departure: ${formatDateTime(trip.scheduledDepartureTime)}

Track this trip: ${shareURL}  
\`.trim();

try {  
await Share.share({  
message: message,  
url: shareURL, // iOS only  
title: 'Trip Safety Share'  
});  
} catch (error) {  
console.error('Error sharing trip:', error);  
}  
};

**Resources:**

* Expo Linking: [https://docs.expo.dev/guides/linking/](https://docs.expo.dev/guides/linking/)

* React Native Share: [https://reactnative.dev/docs/share](https://reactnative.dev/docs/share)

---

**Week 7: Ratings, Safety & Notifications (40 hours)**

**Goal: Complete rating system, safety features, push notifications**

**Day 1-2: Rating System (16 hours)**

**Tasks:**

* \[ \] Create rating modal/screen

* \[ \] Show rating prompt after trip completion

* \[ \] Add 1-5 star rating selector

* \[ \] Add optional text review field

* \[ \] Save review to reviews collection

* \[ \] Update user's average rating

* \[ \] Increment user's total ratings count

* \[ \] Block next ride request until previous trip rated

* \[ \] Display reviews on user profile

**Code Example: Submit Rating**  
// services/firebase/firestore.js  
export const submitRating \= async (tripId, reviewerId, revieweeId, rating, reviewText, reviewerRole) \=\> {  
try {  
await runTransaction(db, async (transaction) \=\> {  
// Create review document  
const reviewsRef \= collection(db, 'reviews');  
const newReviewRef \= doc(reviewsRef);

  transaction.set(newReviewRef, {  
    reviewId: newReviewRef.id,  
    tripId: tripId,  
    reviewerId: reviewerId,  
    revieweeId: revieweeId,  
    reviewerRole: reviewerRole, // 'driver' or 'rider'  
    rating: rating,  
    reviewText: reviewText || '',  
    isPublic: true,  
    createdAt: serverTimestamp(),  
    isReported: false,  
    reportCount: 0,  
    isHidden: false  
  });  
    
  // Update trip's rating status  
  const tripRef \= doc(db, 'trips', tripId);  
  const tripDoc \= await transaction.get(tripRef);  
  const tripData \= tripDoc.data();  
    
  const ratingField \= reviewerRole \=== 'driver' ? 'isRatedByDriver' : 'isRatedByRider';  
  const bothRated \= reviewerRole \=== 'driver' ? tripData.isRatedByRider : tripData.isRatedByDriver;  
    
  transaction.update(tripRef, {  
    \[ratingField\]: true,  
    bothPartiesRated: bothRated,  
  });  
    
  // Update reviewee's average rating  
  const userRef \= doc(db, 'users', revieweeId);  
  const userDoc \= await transaction.get(userRef);  
  const userData \= userDoc.data();  
    
  const currentTotal \= (userData.averageRating || 0\) \* (userData.totalRatings || 0);  
  const newTotal \= currentTotal \+ rating;  
  const newCount \= (userData.totalRatings || 0\) \+ 1;  
  const newAverage \= newTotal / newCount;  
    
  transaction.update(userRef, {  
    averageRating: newAverage,  
    totalRatings: newCount  
  });  
});

return true;

} catch (error) {  
console.error('Error submitting rating:', error);  
throw error;  
}  
};

**Day 3: Safety Features (8 hours)**

**Tasks:**

* \[ \] Create emergency contacts screen in Profile settings

* \[ \] Allow adding up to 3 emergency contacts

* \[ \] Implement report user functionality

* \[ \] Create report modal with reason selection

* \[ \] Save reports to reports collection

* \[ \] Implement block user feature

* \[ \] Add blocked users to user's blockedUsers array

* \[ \] Filter out blocked users from ride feed

**Code Example: Report User**  
// services/firebase/firestore.js  
export const reportUser \= async (reporterId, reportedUserId, reason, description, tripId) \=\> {  
try {  
const reportsRef \= collection(db, 'reports');

await addDoc(reportsRef, {  
  reporterId: reporterId,  
  reportedUserId: reportedUserId,  
  reason: reason, // 'inappropriate\_behavior', 'safety\_concern', 'fake\_profile', etc.  
  description: description,  
  relatedTripId: tripId || null,  
  status: 'pending',  
  createdAt: serverTimestamp(),  
  reviewedAt: null,  
  reviewedBy: null,  
  resolution: null  
});

return true;

} catch (error) {  
console.error('Error reporting user:', error);  
throw error;  
}  
};

export const blockUser \= async (userId, blockedUserId) \=\> {  
try {  
const userRef \= doc(db, 'users', userId);

await updateDoc(userRef, {  
  blockedUsers: arrayUnion(blockedUserId)  
});

return true;

} catch (error) {  
console.error('Error blocking user:', error);  
throw error;  
}  
};

**Day 4-5: Push Notifications (16 hours)**

**Install Expo Notifications:**  
npx expo install expo-notifications expo-device expo-constants

**Tasks:**

* \[ \] Set up Expo push notification credentials

* \[ \] Request notification permissions on app launch

* \[ \] Get and save device push token to user document

* \[ \] Set up Firebase Cloud Messaging (FCM)

* \[ \] Create Cloud Function to send notifications

* \[ \] Implement notification for ride request received

* \[ \] Implement notification for request accepted/declined

* \[ \] Implement notification for new messages

* \[ \] Implement notification for trip reminders (24h, 2h before)

* \[ \] Handle notification tap (deep linking to relevant screen)

**Code Example: Notification Setup**  
// services/notifications/pushNotifications.js  
import \* as Notifications from 'expo-notifications';  
import \* as Device from 'expo-device';  
import { Platform } from 'react-native';  
import { doc, updateDoc } from 'firebase/firestore';  
import { db } from '../firebase/config';

Notifications.setNotificationHandler({  
handleNotification: async () \=\> ({  
shouldShowAlert: true,  
shouldPlaySound: true,  
shouldSetBadge: true,  
}),  
});

export async function registerForPushNotifications(userId) {  
let token;

if (Device.isDevice) {  
const { status: existingStatus } \= await Notifications.getPermissionsAsync();  
let finalStatus \= existingStatus;

if (existingStatus \!== 'granted') {  
  const { status } \= await Notifications.requestPermissionsAsync();  
  finalStatus \= status;  
}

if (finalStatus \!== 'granted') {  
  console.log('Failed to get push token');  
  return;  
}

token \= (await Notifications.getExpoPushTokenAsync()).data;

// Save token to user document  
const userRef \= doc(db, 'users', userId);  
await updateDoc(userRef, {  
  pushToken: token,  
  pushTokenUpdatedAt: new Date()  
});

} else {  
console.log('Must use physical device for push notifications');  
}

if (Platform.OS \=== 'android') {  
Notifications.setNotificationChannelAsync('default', {  
name: 'default',  
importance: Notifications.AndroidImportance.MAX,  
vibrationPattern: \[0, 250, 250, 250\],  
lightColor: '\#FF231F7C',  
});  
}

return token;  
}

export function setupNotificationListeners(navigation) {  
// Handle notification received while app is open  
const notificationListener \= Notifications.addNotificationReceivedListener(notification \=\> {  
console.log('Notification received:', notification);  
});

// Handle notification tap  
const responseListener \= Notifications.addNotificationResponseReceivedListener(response \=\> {  
const data \= response.notification.request.content.data;

// Navigate based on notification type  
if (data.type \=== 'ride\_request\_received') {  
  navigation.navigate('ride', { id: data.rideId });  
} else if (data.type \=== 'new\_message') {  
  navigation.navigate('chat', { id: data.chatId });  
} else if (data.type \=== 'trip\_reminder') {  
  navigation.navigate('trip', { id: data.tripId });  
}

});

return () \=\> {  
Notifications.removeNotificationSubscription(notificationListener);  
Notifications.removeNotificationSubscription(responseListener);  
};  
}

**Firebase Cloud Function for Sending Notifications:**  
// firebase/functions/index.js  
const functions \= require('firebase-functions');  
const admin \= require('firebase-admin');  
admin.initializeApp();

exports.sendNotification \= functions.firestore  
.document('notifications/{notificationId}')  
.onCreate(async (snap, context) \=\> {  
const notification \= snap.data();

// Get user's push token  
const userDoc \= await admin.firestore()  
  .collection('users')  
  .doc(notification.userId)  
  .get();

const pushToken \= userDoc.data().pushToken;

if (\!pushToken) {  
  console.log('No push token for user:', notification.userId);  
  return;  
}

// Send push notification via Expo  
const message \= {  
  to: pushToken,  
  sound: 'default',  
  title: notification.title,  
  body: notification.body,  
  data: notification.data,  
};

await fetch('https://exp.host/--/api/v2/push/send', {  
  method: 'POST',  
  headers: {  
    'Content-Type': 'application/json',  
  },  
  body: JSON.stringify(message),  
});

// Mark notification as sent  
await snap.ref.update({ isSent: true });

});

// Trip reminder function (runs daily)  
exports.sendTripReminders \= functions.pubsub  
.schedule('every 1 hours')  
.onRun(async (context) \=\> {  
const now \= new Date();  
const in24Hours \= new Date(now.getTime() \+ 24 \* 60 \* 60 \* 1000);  
const in2Hours \= new Date(now.getTime() \+ 2 \* 60 \* 60 \* 1000);

// Get trips departing in 24 hours or 2 hours  
const tripsSnapshot \= await admin.firestore()  
  .collection('trips')  
  .where('status', '==', 'confirmed')  
  .where('scheduledDepartureTime', '\>=', now)  
  .where('scheduledDepartureTime', '\<=', in24Hours)  
  .get();

const notifications \= \[\];

tripsSnapshot.forEach(doc \=\> {  
  const trip \= doc.data();  
  const departureTime \= trip.scheduledDepartureTime.toDate();  
    
  const hoursUntil \= (departureTime \- now) / (1000 \* 60 \* 60);  
    
  let reminderText \= '';  
  if (hoursUntil \<= 2.5 && hoursUntil \>= 1.5) {  
    reminderText \= 'Your trip is in 2 hours\!';  
  } else if (hoursUntil \<= 24.5 && hoursUntil \>= 23.5) {  
    reminderText \= 'Your trip is tomorrow\!';  
  } else {  
    return; // Skip if not exactly 2h or 24h  
  }  
    
  // Create notifications for both driver and rider  
  \[trip.driverId, trip.riderId\].forEach(userId \=\> {  
    notifications.push(  
      admin.firestore().collection('notifications').add({  
        userId: userId,  
        type: 'trip\_reminder',  
        title: 'Trip Reminder',  
        body: reminderText,  
        data: { tripId: doc.id },  
        isRead: false,  
        isSent: false,  
        createdAt: admin.firestore.FieldValue.serverTimestamp(),  
      })  
    );  
  });  
});

await Promise.all(notifications);  
console.log(\`Sent ${notifications.length} trip reminders\`);

});

**Resources:**

* Expo Notifications: [https://docs.expo.dev/versions/latest/sdk/notifications/](https://docs.expo.dev/versions/latest/sdk/notifications/)

* Firebase Cloud Functions: [https://firebase.google.com/docs/functions/get-started](https://firebase.google.com/docs/functions/get-started)

* Cloud Functions Cron: [https://firebase.google.com/docs/functions/schedule-functions](https://firebase.google.com/docs/functions/schedule-functions)

---

**Week 8: Testing, Polish & Launch Prep (40 hours)**

**Goal: Bug fixes, UI polish, testing, launch preparation**

**Day 1-2: Comprehensive Testing (16 hours)**

**Create Test Checklist:**

**Authentication Flow:**

* \[ \] Sign up with .edu email

* \[ \] Email verification works

* \[ \] Login with correct credentials

* \[ \] Login fails with wrong credentials

* \[ \] Password reset email received

* \[ \] Profile creation saves correctly

* \[ \] Profile photo upload works

**Ride Posting:**

* \[ \] Create ride with all fields

* \[ \] Address autocomplete works

* \[ \] Route displays on map

* \[ \] Distance/duration calculated correctly

* \[ \] Ride appears in My Rides

* \[ \] Edit ride saves changes

* \[ \] Delete ride removes from feed

**Ride Discovery:**

* \[ \] Feed loads all active rides

* \[ \] Search by destination works

* \[ \] Date filter works

* \[ \] Price filter works

* \[ \] Ride details screen displays correctly

* \[ \] Pull to refresh updates feed

**Booking Flow:**

* \[ \] Request seat creates request

* \[ \] Driver receives notification

* \[ \] Accept request creates trip

* \[ \] Decline request updates status

* \[ \] Rider receives notification

**Messaging:**

* \[ \] Chat appears after trip confirmed

* \[ \] Messages send in real-time

* \[ \] Unread count updates

* \[ \] Message notifications work

**Trip Management:**

* \[ \] Trip details display correctly

* \[ \] Start trip updates status

* \[ \] Complete trip updates status

* \[ \] Share trip generates link

* \[ \] Cancel trip works

**Rating System:**

* \[ \] Rating prompt appears after trip

* \[ \] Submit rating updates user profile

* \[ \] Reviews display on profile

* \[ \] Can't book new ride until rated

**Safety Features:**

* \[ \] Add emergency contacts

* \[ \] Report user works

* \[ \] Block user filters them out

**Notifications:**

* \[ \] All notification types work

* \[ \] Tapping notification navigates correctly

* \[ \] Notification badge updates

**Edge Cases:**

* \[ \] No internet connection handling

* \[ \] Empty states (no rides, no messages)

* \[ \] Loading states work

* \[ \] Error messages display correctly

* \[ \] Blocked users can't see each other's content

**Day 3-4: UI Polish & Accessibility (16 hours)**

**Tasks:**

* \[ \] Consistent color scheme throughout app

* \[ \] All buttons have proper touch feedback

* \[ \] Loading spinners during data fetches

* \[ \] Error messages are user-friendly

* \[ \] Empty states have helpful messages

* \[ \] Images have proper aspect ratios

* \[ \] Text is readable (sufficient contrast)

* \[ \] Touch targets are at least 44x44 points

* \[ \] Add accessibility labels for screen readers

* \[ \] Test with VoiceOver (iOS) and TalkBack (Android)

* \[ \] Smooth animations and transitions

* \[ \] Keyboard avoidance on forms

* \[ \] Dark mode support (optional)

**Day 5: Launch Preparation (8 hours)**

**Tasks:**

* \[ \] Create app icon (1024x1024)

* \[ \] Create splash screen

* \[ \] Update app.json with final app name, bundle ID

* \[ \] Write App Store description

* \[ \] Take screenshots for app stores

* \[ \] Set up Firebase production environment

* \[ \] Deploy Cloud Functions

* \[ \] Set Firestore security rules to production mode

* \[ \] Create privacy policy page

* \[ \] Create terms of service page

* \[ \] Set up app store listings (Apple, Google)

* \[ \] Build production APK/IPA

* \[ \] Submit for beta testing (TestFlight, Google Play Internal Testing)

**Production Firestore Security Rules:**  
rules\_version \= '2';  
service cloud.firestore {  
match /databases/{database}/documents {  
function isSignedIn() {  
return request.auth \!= null;  
}

function isOwner(userId) {  
  return request.auth.uid \== userId;  
}

function isVerifiedStudent() {  
  let user \= get(/databases/$(database)/documents/users/$(request.auth.uid)).data;  
  return user.emailVerified \== true && user.studentStatus \== 'verified';  
}

// Apply same rules as before, but add student verification check for posting rides  
match /rides/{rideId} {  
  allow read: if isSignedIn();  
  allow create: if isSignedIn() && isVerifiedStudent() &&   
                   request.resource.data.driverId \== request.auth.uid;  
  allow update, delete: if isSignedIn() && resource.data.driverId \== request.auth.uid;  
}

// ... rest of rules

}  
}

**App Store Submission Checklist:**

* \[ \] App icon designed

* \[ \] Splash screen created

* \[ \] Privacy policy URL added

* \[ \] Terms of service URL added

* \[ \] Age rating determined (17+ due to user-generated content)

* \[ \] App description written

* \[ \] Keywords selected

* \[ \] Screenshots taken (multiple device sizes)

* \[ \] App demo video created (optional)

* \[ \] Beta testers recruited (10-15 people)

* \[ \] TestFlight build uploaded (iOS)

* \[ \] Internal testing track uploaded (Android)

**Resources:**

* App Store Guidelines: [https://developer.apple.com/app-store/review/guidelines/](https://developer.apple.com/app-store/review/guidelines/)

* Google Play Policies: [https://play.google.com/about/developer-content-policy/](https://play.google.com/about/developer-content-policy/)

* Expo Build: [https://docs.expo.dev/build/introduction/](https://docs.expo.dev/build/introduction/)

---

**Essential Learning Resources**

**For Complete Beginners**

**1\. JavaScript Fundamentals (If needed \- 20 hours)**

**Free Course:** "JavaScript Basics" by freeCodeCamp

* [https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/](https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/)

* Focus on: variables, functions, arrays, objects, promises, async/await

**2\. React Native Basics (Required \- 10 hours)**

**Official Tutorial:** React Native Getting Started

* [https://reactnative.dev/docs/getting-started](https://reactnative.dev/docs/get-started)

* [https://reactnative.dev/docs/tutorial](https://reactnative.dev/docs/tutorial)

**Video Tutorial:** "React Native Crash Course 2024"

* [https://www.youtube.com/watch?v=0-S5a0eXPoc](https://www.youtube.com/watch?v=0-S5a0eXPoc) (3 hours)

**3\. Firebase Fundamentals (Required \- 8 hours)**

**Video Tutorial:** "React Native Expo Firebase Tutorial"

* [https://www.youtube.com/watch?v=a0KJ7l5sNGw](https://www.youtube.com/watch?v=a0KJ7l5sNGw) (full integration guide)

**Official Docs:** Firebase Web SDK

* [https://firebase.google.com/docs/web/setup](https://firebase.google.com/docs/web/setup)

* [https://firebase.google.com/docs/firestore/quickstart](https://firebase.google.com/docs/firestore/quickstart)

**4\. Mapbox Integration (Required \- 4 hours)**

**Documentation:** Mapbox Maps SDK for React Native

* [https://github.com/rnmapbox/maps/blob/main/docs/GettingStarted.md](https://github.com/rnmapbox/maps/blob/main/docs/GettingStarted.md)

**Video:** "React Native Maps Tutorial"

* [https://www.youtube.com/results?search\_query=react+native+mapbox+tutorial](https://www.youtube.com/results?search_query=react+native+mapbox+tutorial)

**5\. Redux State Management (Required \- 6 hours)**

**Official Tutorial:** Redux Toolkit Quick Start

* [https://redux-toolkit.js.org/tutorials/quick-start](https://redux-toolkit.js.org/tutorials/quick-start)

* [https://redux.js.org/tutorials/essentials/part-1-overview-concepts](https://redux.js.org/tutorials/essentials/part-1-overview-concepts)

**Reference Documentation (Bookmark These)**

1. **React Native Docs**: [https://reactnative.dev/docs](https://reactnative.dev/docs)

2. **Expo Docs**: [https://docs.expo.dev/](https://docs.expo.dev/)

3. **Firebase Docs**: [https://firebase.google.com/docs](https://firebase.google.com/docs)

4. **Firestore Docs**: [https://firebase.google.com/docs/firestore](https://firebase.google.com/docs/firestore)

5. **Mapbox API Reference**: [https://docs.mapbox.com/api/](https://docs.mapbox.com/api/)

6. **React Navigation**: [https://reactnavigation.org/docs/getting-started](https://reactnavigation.org/docs/getting-started)

**Community & Help**

1. **Stack Overflow**: Tag your questions with react-native, firebase, expo

2. **Reddit**: r/reactnative, r/Firebase

3. **Discord**: Reactiflux Discord (React Native channel)

4. **GitHub Discussions**: Expo and React Native repos

---

**Setup Guides**

**Complete Development Environment Setup**

**macOS Setup**

**1\. Install Homebrew (if not installed)**

/bin/bash \-c "$(curl \-fsSL [https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh](https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh))"

**2\. Install Node.js (v18 or newer)**

brew install node

**3\. Verify installation**

node \--version \# Should show v18.x.x or higher  
npm \--version \# Should show 9.x.x or higher

**4\. Install Watchman (for React Native)**

brew install watchman

**5\. Install Git**

brew install git

**6\. Install VS Code**

brew install \--cask visual-studio-code

**7\. Install Expo CLI globally**

npm install \-g expo-cli

**8\. Install EAS CLI (for building)**

npm install \-g eas-cli

**9\. For iOS development (optional for testing on simulator)**

**Install Xcode from Mac App Store (12+ GB, takes time)**

**Then install command line tools:**

xcode-select \--install

**10\. For Android development (optional)**

**Install Android Studio from [https://developer.android.com/studio](https://developer.android.com/studio)**

**Set up Android SDK and emulator following Expo docs**

**Windows Setup**

**1\. Install Node.js**

**Download from [https://nodejs.org/](https://nodejs.org/) (LTS version)**

**Run installer and follow prompts**

**2\. Verify installation (in Command Prompt or PowerShell)**

node \--version  
npm \--version

**3\. Install Git**

**Download from [https://git-scm.com/download/win](https://git-scm.com/download/win)**

**Run installer with default options**

**4\. Install VS Code**

**Download from [https://code.visualstudio.com/](https://code.visualstudio.com/)**

**Run installer**

**5\. Install Expo CLI**

npm install \-g expo-cli

**6\. Install EAS CLI**

npm install \-g eas-cli

**7\. For Android development (optional)**

**Install Android Studio from [https://developer.android.com/studio](https://developer.android.com/studio)**

**Set up Android SDK and emulator**

**VS Code Extensions (Recommended)**

Install these extensions in VS Code:

1. **ES7+ React/Redux/React-Native snippets** \- Code snippets

2. **Prettier \- Code formatter** \- Auto-format code

3. **ESLint** \- Code linting

4. **React Native Tools** \- Debugging support

5. **Firebase** \- Firebase syntax highlighting

6. **GitLens** \- Git integration

**Firebase Project Setup (Detailed)**

**Step 1: Create Firebase Project**

1. Go to [https://console.firebase.google.com/](https://console.firebase.google.com/)

2. Click "Add project"

3. Enter project name: rideshare-app-mvp

4. Disable Google Analytics (can enable later)

5. Click "Create project"

6. Wait for setup (30-60 seconds)

**Step 2: Register Your App**

1. In project overview, click "Web" icon (\</\>)

2. Register app nickname: rideshare-web

3. Check "Also set up Firebase Hosting" (optional)

4. Click "Register app"

5. Copy the firebaseConfig object

6. Click "Continue to console"

**Step 3: Enable Authentication**

1. In left sidebar → Build → Authentication

2. Click "Get started"

3. Enable "Email/Password" provider:

   * Click "Email/Password"

   * Toggle "Enable"

   * Click "Save"

**Step 4: Create Firestore Database**

1. In left sidebar → Build → Firestore Database

2. Click "Create database"

3. Choose location (us-central1 recommended)

4. Start in **test mode** (for development)

   * Production mode requires security rules upfront

   * We'll update rules later

5. Click "Enable"

**Step 5: Set Up Firebase Storage**

1. In left sidebar → Build → Storage

2. Click "Get started"

3. Start in **test mode**

4. Choose same location as Firestore

5. Click "Done"

**Step 6: Set Up Cloud Functions (Later in Week 7\)**

1. Install Firebase CLI: npm install \-g firebase-tools

2. Login: firebase login

3. Initialize functions: firebase init functions

4. Choose TypeScript or JavaScript

5. Install dependencies

**Mapbox Setup**

1. Create account at [https://account.mapbox.com/](https://account.mapbox.com/)

2. Use your .edu email (for student credits)

3. Go to "Access tokens" page

4. Copy your **Default public token**

5. Create .env file in project root:  
   EXPO\_PUBLIC\_MAPBOX\_TOKEN=pk.your\_token\_here

6. Add .env to .gitignore

**Project Initialization**

**Create new Expo project**

npx create-expo-app rideshare-app \--template blank  
cd rideshare-app

**Initialize Git**

git init  
git add .  
git commit \-m "Initial commit"

**Create GitHub repository (via web or CLI)**

gh repo create rideshare-app \--public \--source=. \--remote=origin  
git push \-u origin main

**Install all dependencies**

npm install @react-navigation/native @react-navigation/native-stack  
npm install react-native-screens react-native-safe-area-context  
npm install firebase  
npm install @react-native-firebase/app @react-native-firebase/auth  
npm install redux @reduxjs/toolkit react-redux  
npm install expo-location expo-image-picker expo-notifications  
npm install react-native-elements @rneui/themed  
npm install react-native-vector-icons  
npm install @rnmapbox/maps @mapbox/mapbox-sdk  
npm install react-native-gifted-chat  
npm install expo-linking

**Start development server**

npx expo start

**Scan QR code with Expo Go app on your phone**

**OR press 'i' for iOS simulator, 'a' for Android emulator**

---

**Code Structure & Best Practices**

**Component Organization Pattern**

// Good component structure  
import React, { useState, useEffect } from 'react';  
import { View, Text, StyleSheet } from 'react-native';

// 1\. Component definition  
export default function MyComponent({ prop1, prop2 }) {  
// 2\. State  
const \[data, setData\] \= useState(\[\]);  
const \[loading, setLoading\] \= useState(false);

// 3\. Effects  
useEffect(() \=\> {  
loadData();  
}, \[\]);

// 4\. Functions  
const loadData \= async () \=\> {  
setLoading(true);  
try {  
// ... fetch data  
} catch (error) {  
console.error(error);  
} finally {  
setLoading(false);  
}  
};

// 5\. Render  
if (loading) {  
return ;  
}

return (

);  
}

// 6\. Styles at bottom  
const styles \= StyleSheet.create({  
container: {  
flex: 1,  
padding: 16,  
},  
title: {  
fontSize: 20,  
fontWeight: 'bold',  
},  
});

**Firebase Service Pattern**

// services/firebase/firestore.js  
// Centralize all Firestore operations

import { db } from './config';  
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';

// Users  
export const getUserProfile \= async (userId) \=\> {  
const userDoc \= await getDoc(doc(db, 'users', userId));  
return userDoc.exists() ? { id: [userDoc.id](http://userDoc.id), ...userDoc.data() } : null;  
};

// Rides  
export const getAllRides \= async () \=\> {  
const snapshot \= await getDocs(collection(db, 'rides'));  
return snapshot.docs.map(doc \=\> ({ id: doc.id, ...doc.data() }));  
};

// ... more functions

**Error Handling Pattern**

// Always wrap Firebase calls in try-catch  
const saveData \= async () \=\> {  
setLoading(true);  
setError(null); // Clear previous errors

try {  
await addDoc(collection(db, 'rides'), rideData);  
Alert.alert('Success', 'Ride posted successfully\!');  
navigation.goBack();  
} catch (error) {  
console.error('Error saving ride:', error);  
setError('Failed to post ride. Please try again.');  
Alert.alert('Error', 'Something went wrong. Please try again.');  
} finally {  
setLoading(false);  
}  
};

**Constants & Configuration**

// utils/constants.js  
export const COLORS \= {  
primary: '\#007AFF',  
secondary: '\#5856D6',  
success: '\#34C759',  
danger: '\#FF3B30',  
warning: '\#FF9500',  
background: '\#F2F2F7',  
text: '\#000000',  
textSecondary: '\#8E8E93',  
};

export const SIZES \= {  
padding: 16,  
radius: 12,  
headerHeight: 56,  
};

export const RIDE\_STATUS \= {  
ACTIVE: 'active',  
FULL: 'full',  
IN\_PROGRESS: 'in\_progress',  
COMPLETED: 'completed',  
CANCELLED: 'cancelled'  
};

**Form Validation**

// utils/validation.js  
export const validateRideForm \= (formData) \=\> {  
const errors \= {};

if (\!formData.startLocation) {  
errors.startLocation \= 'Start location is required';  
}

if (\!formData.endLocation) {  
errors.endLocation \= 'End location is required';  
}

if (\!formData.departureDate) {  
errors.departureDate \= 'Departure date is required';  
} else if (new Date(formData.departureDate) \< new Date()) {  
errors.departureDate \= 'Departure date must be in the future';  
}

if (\!formData.totalSeats || formData.totalSeats \< 1 || formData.totalSeats \> 7\) {  
errors.totalSeats \= 'Seats must be between 1 and 7';  
}

if (\!formData.pricePerSeat || formData.pricePerSeat \< 0\) {  
errors.pricePerSeat \= 'Price must be 0 or greater';  
}

return {  
isValid: Object.keys(errors).length \=== 0,  
errors  
};  
};

**Date Formatting**

// utils/dateUtils.js  
export const formatDate \= (dateString) \=\> {  
const date \= new Date(dateString);  
const options \= { month: 'short', day: 'numeric', year: 'numeric' };  
return date.toLocaleDateString('en-US', options);  
// Output: "Nov 25, 2024"  
};

export const formatTime \= (timeString) \=\> {  
const \[hours, minutes\] \= timeString.split(':');  
const hour \= parseInt(hours);  
const ampm \= hour \>= 12 ? 'PM' : 'AM';  
const displayHour \= hour % 12 || 12;  
return ${displayHour}:${minutes} ${ampm};  
// Output: "2:30 PM"  
};

export const formatDateTime \= (timestamp) \=\> {  
const date \= new Date(timestamp);  
return date.toLocaleString('en-US', {  
month: 'short',  
day: 'numeric',  
hour: 'numeric',  
minute: '2-digit',  
});  
// Output: "Nov 25, 2:30 PM"  
};

---

**Testing & Launch Checklist**

**Beta Testing Plan**

**Week 8 Beta Test (10-15 testers)**

**Recruitment:**

* \[ \] Recruit 5 potential drivers (friends with cars)

* \[ \] Recruit 10 potential riders (classmates)

* \[ \] Create private TestFlight/Google Play beta group

* \[ \] Send installation instructions

**Test Scenarios:**

1. **Scenario 1: Thanksgiving Airport Run**

   * Driver posts: Campus → SFO, 3 seats, $15/seat

   * 3 riders request seats

   * Driver accepts all

   * Complete trips and rate

2. **Scenario 2: Weekend Trip**

   * Driver posts: Campus → City, 2 seats, $10/seat

   * 1 rider requests

   * Use messaging to coordinate

   * Test trip sharing

3. **Scenario 3: Edge Cases**

   * Driver cancels ride

   * Rider cancels request

   * Test with no internet

   * Test empty states

**Feedback Collection:**

* \[ \] Create Google Form for feedback

* \[ \] Questions to ask:

  * What was confusing?

  * What features are missing?

  * Any bugs encountered?

  * Would you use this for real?

  * Rate overall experience (1-10)

**Pre-Launch Checklist**

**Technical**

* \[ \] All P0 features working

* \[ \] No critical bugs

* \[ \] App doesn't crash during normal use

* \[ \] Loading states everywhere

* \[ \] Error messages user-friendly

* \[ \] Offline mode handled gracefully

* \[ \] Push notifications working

* \[ \] Deep linking working

* \[ \] Security rules in production mode

**Legal & Compliance**

* \[ \] Privacy policy written and hosted

* \[ \] Terms of service written and hosted

* \[ \] Age rating determined (17+ due to user-generated content)

* \[ \] App metadata entered

* \[ \] Privacy nutrition label filled

* \[ \] In-app purchases declared (if any)

**Marketing Materials**

* \[ \] App icon designed (professional looking)

* \[ \] Splash screen created

* \[ \] App Store screenshots (5+ per platform)

* \[ \] App description written (SEO optimized)

* \[ \] Keywords selected (10+)

* \[ \] Support email created

* \[ \] Landing page created (optional)

* \[ \] Social media accounts created

**App Store Specifics**

**Apple App Store:**

* \[ \] Apple Developer account ($99/year)

* \[ \] Bundle ID registered

* \[ \] App uploaded via EAS Build

* \[ \] TestFlight build tested

* \[ \] App metadata entered

* \[ \] Privacy nutrition label filled

* \[ \] Age rating set

* \[ \] In-app purchases declared (if any)

* \[ \] Submit for review

**Google Play Store:**

* \[ \] Google Play Developer account ($25 one-time)

* \[ \] Package name registered

* \[ \] AAB uploaded

* \[ \] Internal testing completed

* \[ \] Store listing created

* \[ \] Content rating completed

* \[ \] Privacy policy linked

* \[ \] Submit for review

**Launch Day Plan**

**Soft Launch (One School Only):**

**Day 1:**

* \[ \] Release app to public on stores

* \[ \] Post in 3-5 school Facebook groups

* \[ \] Post on school subreddit

* \[ \] Instagram story with demo

* \[ \] Message 20 friends personally

**Day 2-3:**

* \[ \] Monitor for crashes (Firebase Crashlytics)

* \[ \] Respond to user feedback

* \[ \] Fix critical bugs immediately

**Day 4-7:**

* \[ \] Recruit 5 drivers to post rides

* \[ \] Target Thanksgiving break (high demand)

* \[ \] Post in additional groups

* \[ \] Get first 10 completed trips

**Week 2:**

* \[ \] Analyze metrics (signups, posts, trips)

* \[ \] Interview active users

* \[ \] Prioritize requested features

* \[ \] Plan version 1.1

**Success Metrics (First Month)**

**User Acquisition:**

* Target: 100-150 signups

* Benchmark: 20% week-over-week growth

**Engagement:**

* Target: 25+ ride posts created

* Target: 10-15 completed trips

* Benchmark: 30% of signups post OR request a ride

**Quality:**

* Target: 4.0+ average rating

* Target: \<5% cancellation rate

* Target: \<3 critical bug reports

**Retention:**

* Target: 40%+ week-1 retention

* Target: 20%+ week-4 retention

**Post-Launch Roadmap (Months 2-6)**

**Month 2: Stability & Growth**

* \[ \] Fix all reported bugs

* \[ \] Improve onboarding flow

* \[ \] Add 2-3 most requested features

* \[ \] Reach 300 users

* \[ \] Get featured in school newspaper

**Month 3: Feature Expansion**

* \[ \] Add recurring rides

* \[ \] Add ride groups/events

* \[ \] Improve matching algorithm

* \[ \] Expand to 2nd campus

**Month 4-6: Scale Preparation**

* \[ \] Automated moderation tools

* \[ \] Campus ambassador program

* \[ \] Partnership with university transportation

* \[ \] Expand to 5-10 universities

* \[ \] Consider fundraising if traction is strong

---

**Conclusion & Next Steps**

**Your 8-Week Journey Recap**

**You now have:**

1. ✅ Complete feature prioritization matrix

2. ✅ Production-ready database schema

3. ✅ Week-by-week development roadmap

4. ✅ All necessary setup guides

5. ✅ Code examples for every major feature

6. ✅ Testing and launch checklists

7. ✅ Curated learning resources

**Immediate Action Items (Today)**

1. **Set up development environment** (4 hours)

   * Install Node.js, VS Code, Expo CLI

   * Create Firebase account and project

   * Create Mapbox account

2. **Complete React Native basics tutorial** (3 hours)

   * [https://reactnative.dev/docs/tutorial](https://reactnative.dev/docs/tutorial)

   * Build the sample app

3. **Clone starter template** (1 hour)

   * Create your Expo project

   * Set up folder structure

   * Make first Git commit

4. **Watch Firebase integration video** (1 hour)

   * [https://www.youtube.com/watch?v=a0KJ7l5sNGw](https://www.youtube.com/watch?v=a0KJ7l5sNGw)

   * Take notes on key concepts

**Study Plan (Before Week 1\)**

**Total prep time: \~20 hours over 3-5 days**

**Day 1-2: JavaScript & React (8 hours)**

* If rusty on JavaScript, review ES6+ features

* Complete React Native tutorial

* Understand: components, state, props, hooks

**Day 3: Firebase Fundamentals (6 hours)**

* Watch Firebase tutorial

* Read Firestore documentation

* Set up practice Firebase project

* Try CRUD operations

**Day 4: Mapbox & Navigation (4 hours)**

* Read Mapbox setup docs

* Try React Navigation tutorial

* Understand: stack navigation, tab navigation

**Day 5: Redux Basics (2 hours)**

* Watch Redux Toolkit crash course

* Understand: store, slices, actions, reducers

**Tips for Success**

**1\. Start Small, Build Incrementally**

* Don't try to build everything at once

* Get authentication working first

* Add one feature at a time

* Commit code frequently

**2\. Test on Real Devices**

* Use Expo Go app on your phone

* Test early and often

* Get feedback from friends

**3\. Don't Get Stuck**

* If stuck \>2 hours, ask for help

* Stack Overflow is your friend

* Check GitHub issues for similar problems

* ChatGPT can help debug code

**4\. MVP Mindset**

* Perfect is the enemy of done

* Launch with core features working well

* Add polish later based on feedback

* Users care about functionality \> aesthetics

**5\. Learn by Doing**

* Don't wait to understand everything

* Learn concepts as you need them

* Copy examples and modify them

* Break things and fix them

**When You Get Stuck (Troubleshooting Guide)**

**Problem: Expo won't start**

* Solution: Clear cache with npx expo start \-c

* Check Node version: node \--version (needs 18+)

**Problem: Firebase errors**

* Check firebaseConfig is correct

* Verify Firebase project is active

* Check network connection

* Look at Firebase Console for errors

**Problem: Map not showing**

* Verify Mapbox token is correct

* Check .env file is in root directory

* Restart Expo dev server after adding .env

**Problem: Styles look wrong**

* Check for typos in style properties

* Verify using StyleSheet.create()

* Test on actual device, not just simulator

**Problem: Real-time updates not working**

* Verify Firestore listeners are set up correctly

* Check unsubscribe() is called on cleanup

* Look for errors in console

**Resources for Continued Learning**

**YouTube Channels:**

1. **Academind** \- React Native tutorials

2. **Traversy Media** \- Firebase & React

3. **The Net Ninja** \- Complete series on React Native

4. **William Candillon** \- Advanced React Native

**Blogs & Articles:**

1. **React Native Blog** \- [https://reactnative.dev/blog](https://reactnative.dev/blog)

2. **Expo Blog** \- [https://blog.expo.dev/](https://blog.expo.dev/)

3. **Firebase Blog** \- [https://firebase.blog/](https://firebase.blog/)

**Communities:**

1. **Reactiflux Discord** \- Live help from experts

2. **r/reactnative** \- Reddit community

3. **Stack Overflow** \- Tag: react-native, firebase, expo

**Final Encouragement**

**You CAN do this\!**

Building your first app is challenging, but:

* ✅ You have a clear roadmap

* ✅ You have working code examples

* ✅ You have excellent resources

* ✅ You have a validated idea (BlaBlaCar proves it works)

**Remember:**

* Every expert was once a beginner

* Every bug you fix makes you better

* Every feature you build teaches you something

* Your MVP doesn't need to be perfect

**8 weeks from now, you could have:**

* A working app on the App Store

* 100+ students using your product

* Real rides happening because of your code

* A portfolio project that impresses employers

**Start today. Build something. Ship it. Learn from users. Iterate.**

**Good luck\! 🚀**

---

**Questions? Stuck on something?**  
Feel free to ask for clarification on any section of this guide. I can provide:

* More detailed code examples

* Specific debugging help

* Clarification on concepts

* Alternative approaches

* Additional resources for topics you find challenging

**You've got this\!**

---

## Temporary Navigation Fixes (Dec 2025)

- [ ] **Edit Profile button in Profile tab uses `router.replace` to swap the profile screen with the edit-profile screen in-place.**
    - This is a temporary workaround due to Expo Router tab limitations.
    - **Proper fix:** Should use a modal or stack route so that editing profile overlays or pushes on top of the profile screen, not replacing the tab. This will allow users to go back to their profile easily.
    - Track this as a technical debt item and update navigation once Expo Router supports better modal/stack flows for tab screens.
    - See: app/(tabs)/profile.js, Dec 2025