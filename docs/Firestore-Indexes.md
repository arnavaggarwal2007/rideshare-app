# Firestore Indexes

Firestore composite indexes optimize query performance for ride discovery, request management, and trip lookups.

## Required Indexes

Create these indexes in Firebase Console (Firestore > Indexes):

### Ride Discovery & Management

1. **Upcoming active rides**
   - Collection: `rides`
   - Fields: `status` (asc), `departureTimestamp` (asc)
   - Purpose: Sort active rides by departure time on Home screen

2. **Start location search**
   - Collection: `rides`
   - Fields: `startSearchKeywords` (array-contains), `status` (asc), `departureTimestamp` (asc)
   - Purpose: Search by start/origin keywords with upcoming rides ordering

3. **Destination search**
   - Collection: `rides`
   - Fields: `endSearchKeywords` (array-contains), `status` (asc), `departureTimestamp` (asc)
   - Purpose: Search by end/destination keywords with upcoming rides ordering

### Request Management (Phase 2 & 3)

4. **Driver pending requests per ride** (CRITICAL)
   - Collection: `rideRequests`
   - Fields: `driverId` (asc), `rideId` (asc), `createdAt` (desc)
   - Purpose: My Rides screen - driver views pending requests for their rides

5. **Rider requests with status** (CRITICAL)
   - Collection: `rideRequests`
   - Fields: `riderId` (asc), `status` (asc)
   - Purpose: My Trips screen - rider filters requests by status (pending/accepted/declined)

6. **Request lookup by ride** (OPTIONAL)
   - Collection: `rideRequests`
   - Fields: `rideId` (asc), `status` (asc), `createdAt` (desc)
   - Purpose: Query all requests for a ride, sorted by recency

## Implementation Status

| Index | Phase | Status | Notes |
|-------|-------|--------|-------|
| Ride status + departure time | Phase 1 | ✅ Active | Queries in Home screen |
| Start/End location search | Phase 1 | ✅ Active | Search functionality |
| Driver pending requests (driverId + rideId + createdAt) | Phase 2 | ✅ Created | My Rides - shows pending badges |
| Rider status filter (riderId + status) | Phase 3 | ✅ Created | My Trips - groups by status |
| Ride requests by status | Phase 3 | ✅ Created | Request filtering |

## How Indexes Are Created

### Automatic Creation
Firestore automatically suggests indexes when queries fail. Error messages include a Firebase Console link:
```
FirebaseError: The query requires an index. You can create it here: https://console.firebase.google.com/.../indexes?create_composite=...
```
Simply click the link and approve. Indexes typically build in 1–2 minutes.

### Manual Creation
1. Go to Firebase Console > Firestore > Indexes
2. Click "Create Index"
3. Select collection, add fields, and order (asc/desc)
4. Firestore will build the index

### Checking Index Status
- **Building**: Query results will be slower; Firestore will post error with link
- **Ready**: Query executes instantly (usually <100ms)
- **Building took too long?** Check the index page—if still building after 5 minutes, contact Firebase support

## Query Patterns Using These Indexes

### My Rides (Driver View)
```javascript
where('driverId', '==', driverId)
where('rideId', '==', rideId)
orderBy('createdAt', 'desc')
// Uses index: driverId + rideId + createdAt
```

### My Trips (Rider View)
```javascript
where('riderId', '==', riderId)
where('status', '==', 'pending')
orderBy('createdAt', 'desc')
// Uses index: riderId + status
// Note: Can filter by 'pending', 'accepted', or 'declined'
```

### Trip Management
```javascript
where('rideId', '==', rideId)
where('status', '==', 'pending')
orderBy('createdAt', 'desc')
// Uses index: rideId + status + createdAt
```

## Quick Creation via Error Links

When a query needs an index, Firestore returns an error that includes a direct link to create the specific index. In Expo logs you'll see something like:

```
FirebaseError: The query requires an index. You can create it here: https://console.firebase.google.com/.../indexes?create_composite=...
```

Click the link and approve. Indexes generally build within 1–2 minutes.

## Notes

- Firestore allows only one `array-contains` per query. Our code prioritizes one keyword field server-side and filters the other client-side.
- While indexes are building or missing, the app falls back to a simpler query and performs keyword/date filtering client-side. Results may be less precise until indexes are ready.
- If you add new query shapes (e.g., extra sort fields), you may need additional indexes; the error link will guide you.
