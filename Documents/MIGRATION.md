# Migration Strategy: AuthContext to Redux

## Current State
- The app uses both AuthContext (React Context) and Redux for authentication and user state.
- AuthContext listens to Firebase Auth state changes and dispatches user/userProfile to Redux.
- Redux is the single source of truth for UI and navigation guards.
- AuthContext is now considered legacy and should not be extended further.

## Migration Plan
1. **Short Term (Current):**
   - Keep AuthContext and Redux in parallel for stability.
   - All new authentication logic and state should use Redux only.
   - Mark AuthContext as legacy in code comments and documentation.
2. **Medium Term:**
   - Gradually refactor any remaining components or hooks that depend on AuthContext to use Redux selectors and actions.
   - Remove any redundant state or logic from AuthContext.
3. **Long Term:**
   - Remove AuthContext entirely once all dependencies are migrated.
   - Ensure all authentication, user, and profile state is managed by Redux.

## Action Items
- [ ] Mark AuthContext as legacy in code comments.
- [ ] Update documentation to reflect Redux as the primary state manager.
- [ ] Track migration progress in the Development Roadmap.

---

_Last updated: 2025-12-23_
