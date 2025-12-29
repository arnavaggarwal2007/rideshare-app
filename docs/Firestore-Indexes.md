# Firestore Indexes

The rides feed relies on Firestore composite indexes to support keyword search and sorting by departure time.

## Required Indexes

Create these indexes in Firebase Console (Firestore > Indexes):

1. Upcoming active rides
   - Fields: `status` (asc), `departureTimestamp` (asc)
   - Purpose: Sort active rides by departure time

2. Start location search
   - Fields: `startSearchKeywords` (array-contains), `status` (asc), `departureTimestamp` (asc)
   - Purpose: Search by start/origin keywords with upcoming rides ordering

3. Destination search
   - Fields: `endSearchKeywords` (array-contains), `status` (asc), `departureTimestamp` (asc)
   - Purpose: Search by end/destination keywords with upcoming rides ordering

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
