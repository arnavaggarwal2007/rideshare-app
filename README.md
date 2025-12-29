# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

## Firestore Indexes

This app uses Firestore composite indexes for feed search and sorting. If you see an error like "The query requires an index", create the index using the link provided in the error.

Required indexes for the rides feed:
- `status` (asc) + `departureTimestamp` (asc) — sorting upcoming active rides
- `startSearchKeywords` (array-contains) + `status` (asc) + `departureTimestamp` (asc)
- `endSearchKeywords` (array-contains) + `status` (asc) + `departureTimestamp` (asc)

How to create:
- Trigger a search or open the feed; when Firestore needs an index, Expo logs a link to the Firebase Console with the index prefilled. Click the link and create the index. It typically builds in 1–2 minutes.
- Repeat for each query variant (start vs end keywords).

Troubleshooting:
- While an index is building, the app will gracefully fall back to a simpler query and filter on the client. Results may be limited until the index is ready.

**Index Creation Checklist:**
- [ ] Status + departureTimestamp index created and built
- [ ] startSearchKeywords + status + departureTimestamp index created and built
- [ ] endSearchKeywords + status + departureTimestamp index created and built

## Firestore Security Rules

After updating `firestore.rules`, deploy changes to Firebase:

```bash
firebase deploy --only firestore:rules
```

**Recent Changes (Week 4)**:
- Users collection: Any authenticated user can now read all user profiles (for viewing driver info from ride details)
- Rides collection: Authenticated users can read all rides; only drivers can edit/delete their own
- RideRequests collection: Schema and rules added (Week 5 prerequisite)

## Development Status

**Week 4 (Ride Discovery & Search)**: ✅ COMPLETE (2025-12-29)
- Feed with pagination, pull-to-refresh, infinite scroll
- Search & filter (start/end keywords, date, price, seats)
- Graceful Firestore index fallbacks
- Ride Details with driver profile navigation
- Documentation and accessibility enhancements
