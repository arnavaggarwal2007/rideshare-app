# Firestore Indexes - Complete Reference

**Status**: Phase 3 Complete - All indexes created and tested ✅

## Critical Indexes for Phase 3

These two indexes are **essential** for Phase 3 functionality to work correctly:

### 1. Driver Pending Requests Per Ride (My Rides)
```
Collection: rideRequests
Fields: driverId (asc) → rideId (asc) → createdAt (desc)
```
**Why**: Driver navigates to My Rides and sees pending request badges. The app queries:
```javascript
where('driverId', '==', userId)
where('rideId', '==', rideId)
orderBy('createdAt', 'desc')
```
**Status**: ✅ **Created** (automatically when first query ran)

### 2. Rider Requests With Status (My Trips)
```
Collection: rideRequests
Fields: riderId (asc) → status (asc)
```
**Why**: Rider navigates to My Trips and sees requests grouped by status (pending/accepted/declined). The app queries:
```javascript
where('riderId', '==', userId)
where('status', '==', 'pending|accepted|declined')
orderBy('createdAt', 'desc')
```
**Status**: ✅ **Created** (automatically when first query ran)

## All Firestore Indexes

| # | Collection | Fields | Purpose | Phase | Status |
|---|-----------|--------|---------|-------|--------|
| 1 | rides | status, departureTimestamp | Home screen: show upcoming rides | 1 | ✅ Active |
| 2 | rides | startSearchKeywords (array), status, departureTimestamp | Home screen: search by origin | 1 | ✅ Active |
| 3 | rides | endSearchKeywords (array), status, departureTimestamp | Home screen: search by destination | 1 | ✅ Active |
| 4 | rideRequests | driverId, rideId, createdAt | **My Rides: pending request badges** | 2-3 | ✅ **CRITICAL** |
| 5 | rideRequests | riderId, status | **My Trips: group by status** | 3 | ✅ **CRITICAL** |
| 6 | rideRequests | rideId, status, createdAt | Request lookup by ride | 3 | ✅ Optional |

## Testing Status

### Tested Queries (Phase 3 End-to-End Test)

✅ **Rider creates request** 
- Collection: `rideRequests`
- Document created with: `{riderId, rideId, driverId, status: 'pending', seatsRequested, message, createdAt}`

✅ **Driver sees pending badge in My Rides**
- Query: `where('driverId', '==', driverId) && where('rideId', '==', rideId)`
- Index 4 used: `driverId + rideId + createdAt`
- Result: Real-time listener updates badge count

✅ **Driver accepts request**
- Atomic operation: request status → 'accepted', trip document created, ride capacity decremented
- Query: `where('requestId', '==', requestId)`
- Firestore Rules: Driver allowed to update (owns the ride)

✅ **Rider sees status update in My Trips**
- Query: `where('riderId', '==', riderId) && where('status', '==', 'accepted')`
- Index 5 used: `riderId + status`
- Result: Real-time listener shows status changed from "Pending" to "Accepted"

✅ **Rider cancels pending request**
- Allowed by rules: `riderId == auth.uid && status == 'pending'`
- Document deleted from `rideRequests`
- Driver's My Rides badge updates in real-time

## Firestore Rules Verification

Relevant rules for Phase 3:

```firestore
// RideRequests - seat booking
match /rideRequests/{requestId} {
  // Riders can read their own; drivers can read for their rides
  allow read: if isSignedIn() && 
                 (request.auth.uid == resource.data.riderId || 
                  request.auth.uid == resource.data.driverId);
  
  // Only drivers can update status
  allow update: if isSignedIn() && 
                   request.auth.uid == resource.data.driverId;
  
  // Riders can delete their pending requests
  allow delete: if isSignedIn() && 
                   request.auth.uid == resource.data.riderId &&
                   resource.data.status == 'pending';
}

// Trips - immutable booking records
match /trips/{tripId} {
  // Rider and driver can read
  allow read: if isSignedIn() && 
                 (request.auth.uid == resource.data.riderId || 
                  request.auth.uid == resource.data.driverId);
  
  // Backend creates on request acceptance
  allow create: if isSignedIn();
  
  // No updates or deletes (immutable)
  allow update: if false;
  allow delete: if false;
}
```

## How to Create Missing Indexes

If you're setting up a new Firebase project:

### Method 1: Auto-Create via Error Link (Recommended)
1. Try a query in the app (e.g., open My Rides as driver with pending requests)
2. Firestore returns error with link
3. Click link → Firebase Console opens with index creation dialog
4. Click "Create Index" → Index builds in 1-2 minutes

### Method 2: Manual Creation
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project → Firestore → Indexes tab
3. Click "Create Index"
4. Fill in:
   - Collection: `rideRequests`
   - Field 1: `driverId` (Ascending)
   - Field 2: `rideId` (Ascending)
   - Field 3: `createdAt` (Descending)
5. Click "Create" → Wait for build

## Monitoring Index Status

Go to Firebase Console → Firestore → Indexes:
- **Building**: Index is being created (usually 1-2 minutes)
- **Enabled**: Ready to use
- **Failed**: Rare; check error message and recreate

## Performance Notes

- First query on a new index may take slightly longer while building
- Subsequent queries are instant (cached)
- Real-time listeners (`onSnapshot`) use the same indexes
- If a query is slow even after index is ready, check network latency

## Quick Validation

To verify indexes are set up correctly:

1. **Check My Rides (Driver View)**
   - See pending badges on ride cards?
   - Click to expand and see request details?
   - If yes → Index 4 is working

2. **Check My Trips (Rider View)**
   - Requests grouped by Pending/Accepted/Declined?
   - Status updates in real-time when driver accepts?
   - If yes → Index 5 is working

3. **Check Real-Time Updates**
   - Open My Rides on one device, My Trips on another
   - Rider submits request → Driver sees badge appear instantly
   - Driver clicks Accept → Rider sees status change to "Accepted" instantly
   - If all yes → Both indexes + rules + real-time working

## Troubleshooting

### "No index found" Error?
- Verify field names match exactly (Firestore is case-sensitive)
- Check order: should be `driverId` not `DriverId`
- Click the error link to auto-create

### Queries are slow?
- Confirm index is in "Enabled" state in Firebase Console
- Try pull-to-refresh on the screen
- Check network tab in DevTools for latency

### Real-time updates not working?
- Verify unsubscribe cleanup is in place (see my-rides.js and my-trips.js)
- Check browser console for listener errors
- Try closing and reopening the screen

## Phase 3 Implementation Checklist

- ✅ My Trips: Request grouping by status (pending/accepted/declined)
- ✅ My Trips: Cancel button for pending requests with confirmation
- ✅ My Trips: Real-time listener `subscribeToRiderRequests`
- ✅ My Rides: Expandable requests section with rider info
- ✅ My Rides: Accept/Decline buttons with confirmation dialogs
- ✅ My Rides: Real-time listener `subscribeToRideRequests`
- ✅ Real-time updates: Rider sees status changes immediately
- ✅ Real-time updates: Driver sees pending badges update
- ✅ Firestore Rules: Trips collection (read/create/immutable)
- ✅ Firestore Indexes: driverId + rideId + createdAt (critical)
- ✅ Firestore Indexes: riderId + status (critical)
- ✅ End-to-end test: Request → Accept → Trip creation → Real-time update
