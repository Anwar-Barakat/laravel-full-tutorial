// ============================================================
// Practice 02 — Auth Slice (Redux Toolkit)
// ============================================================

import {
    createSlice,
    createAsyncThunk,
    configureStore,
} from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import type { PayloadAction } from "@reduxjs/toolkit";

// ============================================================
// Types
// ============================================================

interface User {
    id:    number;
    name:  string;
    email: string;
    role:  "admin" | "user";
}

interface AuthState {
    user:   User | null;
    token:  string | null;
    status: "idle" | "loading" | "succeeded" | "failed";
    error:  string | null;
}

interface LoginData {
    email:    string;
    password: string;
}

interface RegisterData {
    name:     string;
    email:    string;
    password: string;
}

interface AuthResponse {
    user:  User;
    token: string;
}

// ============================================================
// Initial state — read token from localStorage so user stays
// logged in after page refresh
// ============================================================

const initialState: AuthState = {
    user:   null,
    token:  localStorage.getItem("token"),  // persisted across refreshes
    status: "idle",
    error:  null,
};

// ============================================================
// Async thunks
// ============================================================

export const login = createAsyncThunk(
    "auth/login",
    async (credentials: LoginData, { rejectWithValue }) => {
        try {
            const response = await fetch("/api/auth/login", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify(credentials),
            });

            if (!response.ok) throw new Error("Invalid credentials");

            const data = await response.json() as AuthResponse;

            // Save token to localStorage inside the thunk — not the reducer
            // Reducers must be pure (no side effects)
            localStorage.setItem("token", data.token);

            return data;  // { user, token } → goes to fulfilled
        } catch (error: unknown) {
            return rejectWithValue((error as Error).message);
        }
    },
);

export const register = createAsyncThunk(
    "auth/register",
    async (data: RegisterData, { rejectWithValue }) => {
        try {
            const response = await fetch("/api/auth/register", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify(data),
            });

            if (!response.ok) throw new Error("Registration failed");

            const result = await response.json() as AuthResponse;
            localStorage.setItem("token", result.token);

            return result;
        } catch (error: unknown) {
            return rejectWithValue((error as Error).message);
        }
    },
);

// ============================================================
// Slice
// ============================================================

const authSlice = createSlice({
    name: "auth",
    initialState,

    reducers: {
        // Logout — clear state + localStorage
        logout(state) {
            state.user   = null;
            state.token  = null;
            state.status = "idle";
            state.error  = null;
            localStorage.removeItem("token");
        },

        clearError(state) {
            state.error = null;
        },

        // Used after token refresh — update credentials without a full login
        setCredentials(state, action: PayloadAction<AuthResponse>) {
            state.user  = action.payload.user;
            state.token = action.payload.token;
            localStorage.setItem("token", action.payload.token);
        },
    },

    extraReducers: (builder) => {
        // login
        builder
            .addCase(login.pending, (state) => {
                state.status = "loading";
                state.error  = null;
            })
            .addCase(login.fulfilled, (state, action) => {
                state.status = "succeeded";
                state.user   = action.payload.user;
                state.token  = action.payload.token;
            })
            .addCase(login.rejected, (state, action) => {
                state.status = "failed";
                state.error  = action.payload as string;
            });

        // register — same shape as login
        builder
            .addCase(register.pending, (state) => {
                state.status = "loading";
                state.error  = null;
            })
            .addCase(register.fulfilled, (state, action) => {
                state.status = "succeeded";
                state.user   = action.payload.user;
                state.token  = action.payload.token;
            })
            .addCase(register.rejected, (state, action) => {
                state.status = "failed";
                state.error  = action.payload as string;
            });
    },
});

export const { logout, clearError, setCredentials } = authSlice.actions;
export default authSlice.reducer;

// ============================================================
// Store
// ============================================================

export const store = configureStore({
    reducer: {
        auth: authSlice.reducer,
    },
});

export type RootState   = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// ============================================================
// Typed hooks
// ============================================================

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector = <T>(selector: (state: RootState) => T): T =>
    useSelector(selector);

// ============================================================
// Selectors
// ============================================================

export const selectCurrentUser      = (state: RootState) => state.auth.user;
export const selectAuthToken        = (state: RootState) => state.auth.token;
export const selectAuthStatus       = (state: RootState) => state.auth.status;
export const selectAuthError        = (state: RootState) => state.auth.error;
export const selectIsAuthenticated  = (state: RootState) => state.auth.token !== null;
export const selectIsAdmin          = (state: RootState) => state.auth.user?.role === "admin";

/*
================================================================
TIPS
================================================================

LOCALSTORAGE IN THUNK NOT REDUCER
------------------------------------
• Reducers must be pure — no side effects (no localStorage, no fetch)
• Side effects (localStorage.setItem) belong in the thunk
• logout() clears localStorage in the reducer — acceptable because
  it's a synchronous, predictable operation with no async side effects
  (RTK's Immer wrapper considers this fine for sync reducers)

INITIAL STATE — PERSIST LOGIN
--------------------------------
• token: localStorage.getItem("token") — reads on app start
• user is null until the app fetches the profile with the token
• this means user stays "logged in" across page refreshes

SETCREDENTIALS — TOKEN REFRESH
---------------------------------
• used when backend sends a new token (refresh token flow)
• dispatch(setCredentials({ user, token })) — updates store + localStorage
• no API call needed — just update the store

SELECTISAUTHENTICATED
-----------------------
• token !== null — if token exists, user is authenticated
• don't check user object — token is the source of truth
• user could be null if profile hasn't loaded yet

SELECTISADMIN
--------------
• user?.role === "admin" — optional chaining because user can be null
• returns undefined (falsy) if user is null — safe to use in conditions

================================================================
*/
