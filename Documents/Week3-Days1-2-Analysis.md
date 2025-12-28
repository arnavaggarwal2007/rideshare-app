# Week 3 Days 1-2: Complete Requirements Analysis
**Date:** December 24, 2025  
**Status:** READY TO IMPLEMENT ✅

---

## 📋 Executive Summary

Week 3 Days 1-2 focuses on **Mapbox Setup & Address Autocomplete** with an estimated **16 hours** of work. This is the foundational infrastructure for the entire ride posting and discovery system. All prerequisites from Week 2 are complete, and the project is fully ready to begin Week 3 Days 1-2.

---

## 🎯 Explicit Requirements (Week 3 Days 1-2)

### Primary Goal
**"Drivers can create and manage ride posts"** - Establishing geolocation infrastructure

### Tasks Checklist (From Development Roadmap)

#### 1. Mapbox Account Setup
- [ ] Go to https://account.mapbox.com/
- [ ] Create account using student .edu email (for free tier/credits)
- [ ] Navigate to "Access tokens" page
- [ ] Copy default public token
- [ ] Create `.env` file in project root
- [ ] Add token: `EXPO_PUBLIC_MAPBOX_TOKEN=pk.your_token_here`
- [ ] Add `.env` to `.gitignore` (security)

#### 2. Install Mapbox Dependencies
```bash
npm install @rnmapbox/maps
npm install @mapbox/mapbox-sdk
```

#### 3. Create Address Autocomplete Component
**File:** `components/ride/AddressAutocomplete.js` (or similar)
- Input field for address search
- Debounced search (avoid excessive API calls)
- Display dropdown with suggestions (limit 5 results)
- Handle selection and return coordinates
- Error handling for network/API failures
- Loading state during search

#### 4. Implement Geocoding Service
**File:** `services/mapbox/geocoding.js`
- Initialize Mapbox Geocoding client with token
- `searchAddress(query)` function:
  - Forward geocoding (address → coordinates)
  - Restrict to US (`.edu` schools constraint)
  - Return array of features with:
    - `address` (full place name)
    - `coordinates` (latitude, longitude)
    - `placeName` (short name for display)
- Error handling with try/catch
- Return empty array on error

**Code Template (from roadmap):**
```javascript
// services/mapbox/geocoding.js
import mbxGeocoding from '@mapbox/mapbox-sdk/services/geocoding';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: MAPBOX_TOKEN });

export const searchAddress = async (query) => {
  try {
    const response = await geocodingClient
      .forwardGeocode({
        query: query,
        limit: 5,
        countries: ['US'], // restrict to US for .edu schools
      })
      .send();

    return response.body.features.map(feature => ({
      address: feature.place_name,
      coordinates: {
        latitude: feature.center[1],
        longitude: feature.center[0],
      },
      placeName: feature.text,
    }));
  } catch (error) {
    console.error('Geocoding error:', error);
    return [];
  }
};
```

#### 5. Create Location Picker on Map
**File:** `components/ride/LocationPicker.js` (or similar)
- Interactive map component using `@rnmapbox/maps`
- Draggable marker for precise location selection
- Display selected coordinates
- Reverse geocoding (coordinates → address) for confirmation
- "Confirm Location" button
- Map gesture handling (pan, zoom)

#### 6. Test Address Search Functionality
- Test with various address formats
- Test US-specific addresses (campus, cities, airports)
- Verify coordinates accuracy
- Test error states (no results, network failure)
- Test UI responsiveness and UX flow

---

## 🔗 Dependencies & Prerequisites

### Week 2 Completion Status (ALL ✅)
From `Week2-Day5-Summary.md` and `Development Roadmap.md`:

#### Week 2 Days 1-2: Profile System ✅
- Emergency contacts (name, phone, relationship - up to 3)
- Preferences/Tags (music, chattiness, pet-friendly, smoking)
- Signup → Profile setup → Firestore save flow working

#### Week 2 Days 3-4: Edit Profile & Navigation ✅
- Edit Profile modal migration complete
- Full form with validation
- Firestore update logic working
- Navigation guard implemented
- Profile completion checker active

#### Week 2 Day 5: Redux State Setup ✅
- Redux Toolkit store configured (dev/prod split)
- State slices: `authSlice`, `ridesSlice`, `tripsSlice`
- Redux DevTools enabled (dev-only, sensitive fields sanitized)
- Redux Persist configured (AsyncStorage)
- AuthContext + Redux integration (parallel operation)
- Error handling pattern established (`ErrorAlert` component)
- Migration strategy documented (`MIGRATION.md`, `THUNK_GUIDE.md`)
- Redux Thunk middleware enabled (ready for async operations)

### Current Codebase State
**Verified via file reads:**

#### Firebase Configuration ✅
- **File:** `firebaseConfig.js`
- Auth, Firestore, Storage, Functions all initialized
- AsyncStorage persistence enabled
- Ready for production use

#### Redux Store ✅
- **Files:** `store/store.js`, `store/slices/authSlice.js`, `store/slices/ridesSlice.js`, `store/slices/tripsSlice.js`
- All slices have CRUD reducers
- `ridesSlice` ready to manage ride data:
  - `setRides`, `addRide`, `updateRide`, `deleteRide`, `setMyRides`
  - `loading` and `error` state for async operations

#### Navigation Structure ✅
- **Files:** `app/_layout.js`, `app/index.js`
- Expo Router configured with tab navigation
- Authentication guard implemented
- Tabs: `home`, `my-rides`, `my-trips`, `messages`, `profile`
- Modal routes supported
- Deep linking configured (`scheme: "rideshareapp"`)

#### Package Dependencies ✅
- **File:** `package.json`
- React Native 0.81.5, Expo ~54
- Redux Toolkit, React-Redux, Redux Persist installed
- Firebase SDK installed
- Expo Router, Expo Image Picker, Expo Linking installed
- **Mapbox NOT yet installed** (expected - this is Week 3 task)

---

## 🚀 Hidden/Implicit Requirements

### 1. Environment Variable Configuration
**Not explicitly stated but critical:**
- Create `.env` file structure
- Configure Expo to read environment variables
- May need `babel-plugin-transform-inline-environment-variables` or similar
- Update `app.json` with environment variable plugin if needed
- Document environment setup for team/future developers

**Expo Environment Variables Best Practice:**
- Use `EXPO_PUBLIC_` prefix for client-accessible variables
- Never commit `.env` to version control
- Provide `.env.example` template for team

### 2. TypeScript Type Definitions (Future-Proofing)
**Not required now, but beneficial:**
- Create types for Mapbox responses
- Type definitions for location data structures
- Will prevent bugs when integrating with Create Ride screen

### 3. Error Handling Standards
**Must align with Week 2 Day 5 pattern:**
- Use established `ErrorAlert` component for Mapbox errors
- Consistent try/catch wrapping
- User-friendly error messages
- Log errors for debugging

### 4. Component Architecture Consistency
**Follow existing patterns:**
- Use Redux selectors for global state (not local state)
- Follow existing file structure:
  - `components/` for reusable UI
  - `services/` for API/external service logic
- Use established styling conventions (from existing components)

### 5. Git Ignore Configuration
**Must add before committing:**
```gitignore
.env
.env.local
.env.*.local
```

---

## 📦 Future Dependencies (Week 3 Days 3-4 and Beyond)

### Week 3 Days 3-4: Create Ride Screen (16 hours)
**DIRECTLY depends on Week 3 Days 1-2:**

#### Will use Mapbox Geocoding:
- Start location input → `AddressAutocomplete` component
- End location input → `AddressAutocomplete` component
- Both must return coordinates for route calculation

#### Will use Mapbox Directions API:
```javascript
// services/mapbox/directions.js (to be created in Days 3-4)
import mbxDirections from '@mapbox/mapbox-sdk/services/directions';

export const calculateRoute = async (startCoords, endCoords) => {
  // Calculate distance, duration, polyline
  // Returns: { distanceKm, durationMinutes, polyline }
};
```

#### Will use Location Picker:
- Precise pickup/dropoff point selection on map
- Confirmation of route waypoints

#### Additional Mapbox Features Needed:
- **NOT in Week 3 Days 1-2, but needed for Days 3-4:**
  - Directions API client setup
  - Route polyline display on map
  - Distance/duration calculation
  - Map route visualization

### Week 3 Day 5: My Rides Screen (8 hours)
**Uses Firestore, not Mapbox:**
- Displays rides created with Mapbox data (but no new Mapbox features)
- Real-time listener for user's rides

### Week 4 Days 1-2: Ride Feed (16 hours)
**Uses Mapbox data, minimal new Mapbox features:**
- Displays ride cards with route info (from Firestore)
- May need map thumbnail/static map image (enhancement)

### Week 4 Days 3-4: Search & Filter (16 hours)
**Potentially uses Mapbox:**
- Search by destination → could use geocoding for better matching
- Proximity-based filtering → requires geospatial calculations
- "Rides passing through" feature → complex geospatial queries

**CRITICAL FUTURE REQUIREMENT:**
The roadmap mentions **"rides passing through your destination"** (Week 4, P2 priority):
- Requires geospatial queries (Firestore limitations)
- May need GeoFirestore or custom distance calculations
- **Dependency:** Week 3 Days 1-2 must store coordinates in consistent format

### Week 5+: Booking & Trip Management
**Uses Mapbox for:**
- Pickup/dropoff location selection (Days 1-2)
- Trip route display (Day 3-4)
- Share trip with map link (Day 5)

---

## 🏗️ Data Structure Implications

### Coordinate Storage Format (CRITICAL)
Week 3 Days 1-2 establishes the coordinate format used throughout the app.

**From Development Roadmap (Firestore Schema):**
```javascript
"startLocation": {
  "address": "450 Serra Mall, Stanford, CA 94305",
  "coordinates": {
    "latitude": 37.4275,
    "longitude": -122.1697
  },
  "placeName": "Stanford University"
},
```

**Why this matters:**
- **Consistency:** All future features (Create Ride, Request Seat, Trip Details) must use this exact format
- **Firestore Queries:** Geospatial queries depend on coordinate structure
- **Mapbox Integration:** Mapbox expects `[longitude, latitude]` (reversed!)
- **Redux State:** `ridesSlice` must store locations in this format

**Conversion Helper Needed (implicit requirement):**
```javascript
// utils/mapboxHelpers.js (to be created)
export const mapboxToFirestore = (mapboxCoords) => ({
  latitude: mapboxCoords[1],
  longitude: mapboxCoords[0],
});

export const firestoreToMapbox = (firestoreCoords) => [
  firestoreCoords.longitude,
  firestoreCoords.latitude,
];
```

### Search Keywords Generation
Week 3 Days 3-4 requires `searchKeywords` array for Firestore queries.

**Must be populated during address selection:**
```javascript
function generateSearchKeywords(addressData) {
  const words = [
    ...addressData.address.toLowerCase().split(' '),
    addressData.placeName.toLowerCase(),
  ];
  return [...new Set(words)]; // remove duplicates
}
```

**Why this matters:**
- Week 4 search functionality depends on this
- Must be implemented in geocoding service or autocomplete component
- Should be part of address selection flow

---

## 🎨 UI/UX Considerations

### Address Autocomplete UX Best Practices
**Not explicitly stated but industry standard:**

1. **Debouncing:** Wait 300-500ms after user stops typing before searching
2. **Min Characters:** Require 3+ characters before triggering search
3. **Loading Indicator:** Show spinner during search
4. **Empty State:** "No results found" message
5. **Error State:** Network error retry option
6. **Keyboard Handling:** 
   - "Done" button behavior
   - Auto-dismiss on selection
7. **Accessibility:**
   - Screen reader labels
   - Touch target sizes (44x44 minimum)

### Location Picker UX
**Standard map picker features:**
1. **Initial Camera Position:** Center on user's location or last selected
2. **Marker Dragging:** Smooth, responsive dragging
3. **Address Confirmation:** Show address after marker placement
4. **"Current Location" Button:** Quick way to select user's GPS location
5. **Map Controls:** Zoom in/out, compass, satellite view toggle
6. **Loading State:** Show while fetching user location

---

## 🧪 Testing Strategy (Implicit Requirements)

### Manual Testing Checklist
**Must be completed before moving to Week 3 Days 3-4:**

#### Geocoding Service:
- [ ] Search for campus addresses (e.g., "Stanford University")
- [ ] Search for airports (e.g., "SFO")
- [ ] Search for city names (e.g., "San Francisco")
- [ ] Search with partial input (e.g., "San Fran")
- [ ] Test with no internet connection
- [ ] Test with invalid Mapbox token
- [ ] Test with empty query
- [ ] Verify coordinates accuracy (cross-check with Google Maps)

#### Address Autocomplete Component:
- [ ] Type quickly, verify debouncing works
- [ ] Select address from dropdown
- [ ] Verify coordinates are returned
- [ ] Test keyboard dismissal
- [ ] Test on different screen sizes (iPhone SE, iPad)
- [ ] Test with VoiceOver (accessibility)

#### Location Picker:
- [ ] Drag marker to different locations
- [ ] Verify address updates on marker move
- [ ] Test "Current Location" button
- [ ] Test map zoom controls
- [ ] Verify coordinate display accuracy
- [ ] Test on slow network (throttle network in dev tools)

### Edge Cases to Test:
1. **No GPS Permission:** Handle gracefully
2. **Airplane Mode:** Show appropriate error
3. **Slow Network:** Show loading state, timeout gracefully
4. **Mapbox API Limits:** Handle rate limiting
5. **Invalid Coordinates:** Validate lat/lng ranges
6. **Special Characters in Address:** Test with accents, symbols

---

## 📚 Resources & Documentation

### Official Documentation (From Roadmap)
1. **Mapbox Installation:** https://github.com/rnmapbox/maps/blob/main/docs/GettingStarted.md
2. **Mapbox Geocoding API:** https://docs.mapbox.com/api/search/geocoding/
3. **Mapbox Directions API** (Week 3 Days 3-4): https://docs.mapbox.com/api/navigation/directions/

### Additional Resources (Not in Roadmap)
1. **React Native Maps Comparison:** Understand Mapbox vs Google Maps
2. **Mapbox React Native Examples:** https://github.com/rnmapbox/maps/tree/main/example
3. **Expo Environment Variables:** https://docs.expo.dev/guides/environment-variables/
4. **Geospatial Best Practices:** For future "rides passing through" feature

### Student Tier Benefits
**Mapbox Student Account:**
- Free tier: 50,000 requests/month (sufficient for MVP testing)
- No credit card required for basic tier
- Educational discount: potentially higher limits with .edu email

**Important:** Monitor usage during development to avoid hitting limits.

---

## ⚠️ Risks & Mitigations

### Risk 1: Mapbox API Complexity
**Risk:** `@rnmapbox/maps` is complex, steep learning curve  
**Mitigation:**
- Start with official examples
- Read documentation thoroughly before coding
- Test on iOS/Android separately (platform differences)
- Budget extra time for troubleshooting

### Risk 2: Environment Variable Configuration
**Risk:** Expo environment variables can be tricky to configure  
**Mitigation:**
- Test `.env` loading immediately after creation
- Use `console.log(process.env.EXPO_PUBLIC_MAPBOX_TOKEN)` to verify
- Check Expo documentation for `babel-plugin-inline-dotenv` if needed
- May need to restart Metro bundler after `.env` changes

### Risk 3: Coordinate Format Confusion
**Risk:** Mapbox uses `[lng, lat]`, standard is `[lat, lng]`  
**Mitigation:**
- Create helper functions immediately (see Data Structure section)
- Document format in code comments
- Validate coordinates before saving to Firestore
- Add assertions/checks for lat/lng ranges

### Risk 4: Platform-Specific Issues
**Risk:** `@rnmapbox/maps` may behave differently on iOS vs Android  
**Mitigation:**
- Test on both platforms early
- Check GitHub issues for known platform bugs
- Have fallback plan (Google Maps API) if critical issues arise
- Test on physical devices, not just simulators

### Risk 5: Git Security
**Risk:** Accidentally committing `.env` with Mapbox token  
**Mitigation:**
- Add `.env` to `.gitignore` BEFORE creating `.env` file
- Use `git status` to verify before first commit
- Add pre-commit hook to block `.env` commits
- Rotate token immediately if accidentally committed

### Risk 6: Week 3 Days 3-4 Blockers
**Risk:** Incomplete Week 3 Days 1-2 blocks Create Ride screen  
**Mitigation:**
- Thoroughly test autocomplete and geocoding before moving on
- Create comprehensive test cases
- Document any limitations/bugs found
- Don't rush - spend full 16 hours to ensure quality

---

## 🛠️ Implementation Order (Recommended)

### Phase 1: Environment Setup (2 hours)
1. Create Mapbox account
2. Get token
3. Create `.env` file
4. Add to `.gitignore`
5. Test environment variable loading
6. Document setup in README

### Phase 2: Install & Configure (2 hours)
1. Install Mapbox packages
2. Configure `@rnmapbox/maps` (may need app.json updates)
3. Test basic map rendering (simple example)
4. Verify iOS/Android builds succeed
5. Fix any build errors

### Phase 3: Geocoding Service (3 hours)
1. Create `services/mapbox/geocoding.js`
2. Implement `searchAddress()` function
3. Test with various queries (console logs)
4. Add error handling
5. Create coordinate conversion helpers
6. Write unit tests (optional but recommended)

### Phase 4: Address Autocomplete Component (5 hours)
1. Create `components/ride/AddressAutocomplete.js`
2. Build UI (TextInput + dropdown)
3. Integrate geocoding service
4. Add debouncing
5. Handle selection
6. Style component
7. Test on different devices
8. Add accessibility labels

### Phase 5: Location Picker Component (3 hours)
1. Create `components/ride/LocationPicker.js`
2. Render interactive map
3. Add draggable marker
4. Implement reverse geocoding (optional for now)
5. Add "Confirm Location" button
6. Test drag responsiveness
7. Handle edge cases

### Phase 6: Testing & Polish (1 hour)
1. Run through all manual test cases
2. Fix bugs
3. Update documentation
4. Prepare demo for Week 3 Days 3-4
5. Git commit with descriptive message

---

## 📝 Success Criteria

### Week 3 Days 1-2 is COMPLETE when:
- [x] Mapbox account created and token obtained
- [ ] `.env` file configured with `EXPO_PUBLIC_MAPBOX_TOKEN`
- [ ] `.env` added to `.gitignore`
- [ ] Mapbox packages installed (`@rnmapbox/maps`, `@mapbox/mapbox-sdk`)
- [ ] Geocoding service created and tested
- [ ] Address autocomplete component working and styled
- [ ] Location picker component functional
- [ ] All manual test cases passing
- [ ] Code documented and committed to Git
- [ ] No blockers for Week 3 Days 3-4 (Create Ride screen)

### Ready for Week 3 Days 3-4 when:
- [ ] Autocomplete returns valid coordinates consistently
- [ ] Geocoding service handles all edge cases
- [ ] UI/UX is polished and follows app design
- [ ] No console errors or warnings
- [ ] Performance is acceptable (no lag during typing)
- [ ] Works on both iOS and Android

---

## 🔮 Long-Term Considerations

### Scalability (Future Weeks)
- **Mapbox API Limits:** Monitor usage, may need to upgrade tier post-launch
- **Caching:** Consider caching geocoding results for common addresses
- **Offline Mode:** Future feature - pre-download map tiles for campus area

### Maintenance
- **Token Rotation:** Plan for rotating Mapbox token before production
- **Version Updates:** `@rnmapbox/maps` frequently updates, stay current
- **Alternative APIs:** Keep Google Maps as backup if Mapbox issues arise

### Technical Debt
- **TypeScript Migration:** Consider adding types in future refactor
- **Unit Tests:** Geocoding service should have automated tests
- **Component Library:** Autocomplete could become generic (reuse for other inputs)

---

## 📞 Support Resources

### If Stuck:
1. **Mapbox Support:** https://support.mapbox.com/
2. **GitHub Issues:** https://github.com/rnmapbox/maps/issues (search before posting)
3. **Stack Overflow:** Tag: `react-native`, `mapbox`, `expo`
4. **Reddit:** r/reactnative
5. **Discord:** Reactiflux (#react-native-maps channel)

### Common Issues & Solutions:
- **Build fails after install:** May need to run `npx expo prebuild` and rebuild
- **Map not rendering:** Check token, check platform-specific setup
- **Type errors:** May need `@types/mapbox__mapbox-sdk-geocoding`
- **Performance issues:** Debounce search, limit results, optimize re-renders

---

## ✅ Final Checklist Before Starting Week 3 Days 1-2

### Prerequisites Verified:
- [x] Week 2 fully complete (all days)
- [x] Redux store configured and working
- [x] Firebase initialized
- [x] Navigation system functional
- [x] Error handling pattern established
- [x] Git repository initialized

### Tools Ready:
- [x] Node.js, npm installed
- [x] Expo CLI installed
- [x] Code editor (VS Code) configured
- [x] iOS Simulator / Android Emulator ready
- [ ] Physical device for testing (optional)

### Knowledge Base:
- [x] Understand Redux Toolkit (from Week 2 Day 5)
- [x] Understand Expo Router (from Week 2 Days 3-4)
- [x] Understand Firestore data structure (from roadmap)
- [ ] Review Mapbox documentation (before starting)
- [ ] Review `@rnmapbox/maps` examples (before starting)

### Time & Resources:
- [ ] **16 hours allocated** for Week 3 Days 1-2
- [ ] Uninterrupted work blocks scheduled
- [ ] Mapbox documentation bookmarked
- [ ] Ready to ask for help if stuck

---

## 🎓 Learning Outcomes

By completing Week 3 Days 1-2, you will learn:
1. **Geolocation APIs:** How to integrate third-party mapping services
2. **Geocoding:** Converting addresses to coordinates and vice versa
3. **Component Design:** Building reusable autocomplete components
4. **Environment Variables:** Secure API key management in React Native
5. **Async Operations:** Handling API calls, debouncing, error states
6. **Data Transformation:** Converting between coordinate formats
7. **UX Patterns:** Search, autocomplete, map interaction best practices

---

## 📊 Time Breakdown (Estimated)

| Phase                          | Hours | Percentage |
|--------------------------------|-------|------------|
| Environment & Account Setup    | 2     | 12.5%      |
| Install & Configure Mapbox     | 2     | 12.5%      |
| Geocoding Service              | 3     | 18.75%     |
| Address Autocomplete Component | 5     | 31.25%     |
| Location Picker Component      | 3     | 18.75%     |
| Testing & Polish               | 1     | 6.25%      |
| **TOTAL**                      | **16**| **100%**   |

**Buffer:** Budget an additional 2-4 hours for unexpected issues (platform-specific bugs, environment setup complications, learning curve).

---

## 🚦 Status: READY TO PROCEED ✅

**All prerequisites met. Week 3 Days 1-2 can begin immediately.**

**Next Action:** Create Mapbox account and obtain token.

---

_Last Updated: December 24, 2025_  
_Prepared by: GitHub Copilot_  
_For: RideShare App MVP Development_
