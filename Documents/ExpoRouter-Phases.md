# Expo Router Navigation Implementation Plan (Phases 0–5)

## Phase 0: Planning & Documentation
- Document navigation requirements and flows (signed in, signed out, incomplete profile, deep link, cold start).
- Outline guard logic, bypass routes, and loading gating.
- Define folder/file structure for (tabs), (auth), modal, etc.

## Phase 1: Tab Navigator & Folder Structure
- Create app/(tabs)/_layout.js with a <Tabs> navigator.
- Add the 5 required tab screens in (tabs):
  - home.js (Home)
  - my-rides.js (My Rides)
  - my-trips.js (Trips)
  - messages.js (Messages)
  - profile.js (Profile)
- Register only these 5 tabs in _layout.js.
- Ensure (tabs) screens render and are accessible.

## Phase 2: Auth & Profile Groups
- Create app/(auth)/_layout.js for auth stack (if needed).
- Add auth screens: signin.js, signup.js, forgot-password.js, profile-setup.js.
- Ensure navigation to and between auth screens works.
- Add modal/other special-case folders as needed.

## Phase 3: Global Navigation Guard (RootLayout)
- Implement app/_layout.js with:
  - Loading gating (block UI until user/profile loaded).
  - Centralized guard logic (useSegments, useRouter, useAuth).
  - Bypass logic for (auth), modal, etc.
  - Profile completion redirect.
  - Unauthenticated redirect.
- Add robust logging for debugging.
- Test all flows for correct guard behavior.

## Phase 4: Redirects & Fallbacks
- Ensure app/index.js always redirects to a concrete screen (e.g., '/(tabs)/home').
- Update all navigation actions (router.replace, Redirect) to use correct group paths.
- Add fallback in RootLayout: if segments are empty and user is authenticated, redirect to '/(tabs)/home'.
- Test deep links and cold starts.

## Phase 5: Polish, Test, and Document
- Polish loading UI (ActivityIndicator, app font, background).
- Add comments and structure for future-proofing.
- Test all navigation flows: signed out, signed in, incomplete profile, deep link, cold start, bypass routes.
- Document navigation structure and guard logic for future maintainers.

---

**Further Considerations:**
- Expand (tabs) with more screens as app grows.
- Adjust guard logic for new flows (e.g., onboarding, verification).
- Keep navigation logic centralized and maintainable.

**Summary:**
Follow these phases step-by-step to build a robust, maintainable navigation system with Expo Router, supporting all required flows and future growth.
