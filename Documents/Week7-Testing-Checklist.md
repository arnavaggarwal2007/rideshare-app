# Week 7 Testing & Validation Checklist

**Phase 12: Testing & Validation**  
**Created**: January 11, 2026  
**Last Updated**: January 11, 2026

---

## Test Accounts

| Account Type | Email | Purpose |
|-------------|-------|---------|
| Driver | arnevaggarrwal@gmail.com | Primary test account for driver flows |
| Rider | arnavaggarwal1@gmail.com | Primary test account for rider flows |

---

## Prerequisites

Before running manual tests, ensure:

- [ ] Both test accounts are logged in on separate devices/simulators
- [ ] Expo development server is running
- [ ] Firebase emulator or production Firestore is accessible
- [ ] Push notification permissions are granted on test devices

---

## 12.1 Rating System Testing Checklist

### Basic Rating Submission (Items 360-361)

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 360 | Submit 1-5 star ratings | 1. Complete a trip as driver<br>2. Navigate to rating screen<br>3. Select 1 star, submit<br>4. Repeat for 2-5 stars | Rating saved successfully for each star count | ☐ |
| 361a | Submit rating without review text | 1. Open rating screen<br>2. Select stars only<br>3. Submit | Rating saved with empty reviewText | ☐ |
| 361b | Submit rating with review text | 1. Open rating screen<br>2. Select stars<br>3. Enter review text<br>4. Submit | Rating saved with reviewText populated | ☐ |

### Rating Statistics (Items 362-363)

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 362 | Average rating updates correctly | 1. Note user's current rating (e.g., 4.0 with 5 reviews)<br>2. Submit a new 3-star rating<br>3. Check user profile | Average updated: (4.0*5 + 3)/(5+1) = 3.83 | ☐ |
| 363 | Rating count increments | 1. Note current totalRatings<br>2. Submit new rating<br>3. Check user profile | totalRatings increased by 1 | ☐ |

### Rating Flow Integration (Items 364-366)

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 364 | Rating prompt after trip completion | 1. Create trip as driver<br>2. Get request from rider<br>3. Accept request<br>4. Mark trip as completed | Both driver and rider see rating prompt or notification | ☐ |
| 365 | Cannot rate same trip twice | 1. Submit rating for a trip<br>2. Try to access rating screen for same trip again | Error message: "Already rated" or redirect to trip details | ☐ |
| 366 | Rating enforcement blocks new bookings | 1. Complete a trip but don't rate<br>2. Try to request another ride | Warning shown about unrated trip; optionally blocked | ☐ |

---

## 12.2 Safety Features Testing Checklist

### Report Submission (Items 367-368)

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 367a | Report - inappropriate_behavior | 1. Go to user profile<br>2. Tap "More options" → "Report"<br>3. Select "Inappropriate Behavior"<br>4. Submit | Report saved with reason: inappropriate_behavior | ☐ |
| 367b | Report - safety_concern | 1. Report user<br>2. Select "Safety Concern"<br>3. Submit | Report saved with reason: safety_concern | ☐ |
| 367c | Report - fake_profile | 1. Report user<br>2. Select "Fake Profile"<br>3. Submit | Report saved with reason: fake_profile | ☐ |
| 367d | Report - harassment | 1. Report user<br>2. Select "Harassment"<br>3. Submit | Report saved with reason: harassment | ☐ |
| 367e | Report - spam | 1. Report user<br>2. Select "Spam"<br>3. Submit | Report saved with reason: spam | ☐ |
| 368 | Report with "other" requires description | 1. Report user<br>2. Select "Other"<br>3. Leave description empty<br>4. Try to submit | Validation error: description required | ☐ |

### Block User (Items 369-371)

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 369 | Block user removes their rides from feed | 1. Note a user's ride in home feed<br>2. Block that user<br>3. Refresh home feed | Blocked user's rides no longer visible | ☐ |
| 370 | Unblock user restores their rides in feed | 1. Unblock a previously blocked user<br>2. Refresh home feed | User's rides now visible again | ☐ |
| 371 | Blocked user cannot see blocker's rides | 1. User A blocks User B<br>2. Log in as User B<br>3. View User A's rides | User B cannot see User A's posted rides | ☐ |

### Edge Cases

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| EC1 | Cannot report yourself | 1. Go to your own profile<br>2. Look for report option | Report option not available | ☐ |
| EC2 | Cannot block yourself | 1. Go to your own profile<br>2. Look for block option | Block option not available | ☐ |
| EC3 | Duplicate report prevention | 1. Report user<br>2. Try to report same user again | Error: "Already reported" or blocked | ☐ |
| EC4 | Block confirmation shows consequences | 1. Try to block a user | Alert shows: "won't see their rides, they won't see yours, conversations hidden" | ☐ |

---

## 12.3 Notification Testing Checklist

### Rating Reminders (Items 372-373)

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 372 | Rating reminder received after trip completion | 1. Complete a trip (driver marks complete)<br>2. Wait for notification | Push notification received: "Rate Your Trip" | ☐ |
| 373 | Tapping rating reminder opens rating screen | 1. Receive rating reminder notification<br>2. Tap notification | App opens to rating screen for correct trip | ☐ |

### Trip Reminders (Items 374-377)

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 374 | 24h trip reminder received | 1. Book a trip for ~24h from now<br>2. Wait (or adjust device time) | Notification: "Trip Tomorrow" | ☐ |
| 375 | 2h trip reminder received | 1. Book a trip for ~2h from now<br>2. Wait | Notification: "Trip Starting Soon" | ☐ |
| 376 | Tapping trip reminder opens trip details | 1. Receive trip reminder<br>2. Tap notification | App opens to trip details screen | ☐ |
| 377 | Reminder cancellation when trip cancelled | 1. Book trip (reminders scheduled)<br>2. Cancel the trip<br>3. Wait past reminder times | No reminders received for cancelled trip | ☐ |

### Notification Edge Cases

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| NC1 | Badge cleared on app open | 1. Receive notifications while app closed<br>2. Open app | Badge count cleared to 0 | ☐ |
| NC2 | Deep link from background | 1. Put app in background<br>2. Receive notification<br>3. Tap notification | Correct screen opens | ☐ |
| NC3 | Deep link when app killed | 1. Force close app<br>2. Tap notification | App launches and opens correct screen | ☐ |
| NC4 | Notification permissions denied prompt | 1. Deny notification permissions<br>2. Trigger action that needs notifications | Prompt shown to enable in settings | ☐ |

---

## Test Data Setup Scripts

### Create Test Trip (Firebase Console)

```javascript
// In Firestore, create a trip document:
{
  driverId: "DRIVER_UID",
  riderId: "RIDER_UID",
  status: "completed",
  departureTimestamp: Timestamp.now(),
  startLocation: { placeName: "Test Origin" },
  endLocation: { placeName: "Test Destination" },
  isRatedByDriver: false,
  isRatedByRider: false
}
```

### Reset User Ratings (Firebase Console)

```javascript
// Update user document:
{
  averageRating: 0,
  totalRatings: 0
}
```

### Clear Blocked Users (Firebase Console)

```javascript
// Update user document:
{
  blockedUsers: []
}
```

---

## Automated Test Coverage Summary

| Test Suite | Tests | Coverage |
|------------|-------|----------|
| StarRating.test.js | 22 | 90.62% lines |
| ReviewCard.test.js | 37 | 92.5% lines |
| ReportModal.test.js | 25 | 95%+ lines |
| safetySlice.test.js | 30 | 100% lines |
| reviews.test.js | 24 | 100% lines |
| reports.test.js | 18 | 100% lines |
| safetyHelpers.test.js | 37 | 100% lines |
| blockFilters.test.js | 18 | 100% lines |
| ratingReminders.test.js | 26 | 100% lines |
| tripReminders.test.js | 30 | 100% lines |
| notificationHandler.test.js | 49 | 98.75% lines |
| notificationHelpers.test.js | 47 | 100% lines |
| **Total** | **410+** | **>80% average** |

---

## Known Issues / Limitations

1. **Local Notification Scheduling**: Trip reminders are scheduled locally. If app is reinstalled or device restarts, reminders may be lost.

2. **Two-Device Testing**: Item 371 (blocked user cannot see blocker's rides) requires two physical devices or simulators to test properly.

3. **Push Token Expiration**: Expo push tokens can expire. Production app should handle re-registration.

4. **Time-Based Tests**: Trip reminders (24h/2h) are difficult to test without waiting or manipulating device time.

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| QA | | | |
| Product Owner | | | |

---

*This document tracks manual testing progress for Week 7 features.*
