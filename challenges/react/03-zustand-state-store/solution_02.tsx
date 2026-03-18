// ============================================================
// Problem 02 — Auth Store with Persist & Store Composition
// ============================================================



// ============================================================
// stores/authStore.ts
//
// User interface (id, name, email, role union, permissions[])
// AuthState interface (user, token, isAuthenticated, isLoading, error + actions)
//
// useAuthStore = create<AuthState>()(persist(..., { partialize }))
//   login        — POST /api/auth/login, set token + user + isAuthenticated
//   logout       — useBookingStore.getState().reset() THEN clear own state
//   refreshToken — POST /api/auth/refresh; on failure call logout()
//   isAdmin()          — get().user?.role === "admin"
//   canCreateBooking() — role in ["admin", "school_admin"]
//   hasPermission(p)   — get().user?.permissions.includes(p)
//
// persist options:
//   name: "auth-storage"
//   storage: createJSONStorage(() => localStorage)
//   partialize: (s) => ({ token: s.token, user: s.user })  ← only these 2 fields
// ============================================================
