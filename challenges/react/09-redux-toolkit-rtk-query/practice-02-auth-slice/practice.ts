// ============================================================
// Practice 02 — Auth Slice (Redux Toolkit)
// Read assignment.md first, then fill in each section below.
// Check solution.ts when done.
// ============================================================

import {
    createSlice,
    createAsyncThunk,
    configureStore,
} from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import type { PayloadAction } from "@reduxjs/toolkit";

// ── Types ─────────────────────────────────────────────────────
// User: id, name, email, role ("admin" | "user")
// AuthState: user, token, status, error
// LoginData: email, password
// RegisterData: name, email, password
// AuthResponse: user, token



// ── 1. initialState ───────────────────────────────────────────
// Hint: token should be read from localStorage on startup



// ── 2. login — POST /api/auth/login ──────────────────────────
// createAsyncThunk("auth/login", async (credentials: LoginData, { rejectWithValue }) => { ... })
// Hint: save token to localStorage inside the thunk (not the reducer)



// ── 3. register — POST /api/auth/register ────────────────────
// createAsyncThunk("auth/register", async (data: RegisterData, { rejectWithValue }) => { ... })



// ── 4. createSlice ────────────────────────────────────────────
// reducers:
//   logout         — clear user, token, remove from localStorage
//   clearError     — reset error to null
//   setCredentials — set user + token (for token refresh)
//
// extraReducers:
//   login:    pending/fulfilled/rejected
//   register: pending/fulfilled/rejected



// ── 5. Store ──────────────────────────────────────────────────



// ── 6. Typed hooks ────────────────────────────────────────────



// ── 7. Selectors ─────────────────────────────────────────────
// selectCurrentUser, selectAuthToken, selectAuthStatus, selectAuthError
// selectIsAuthenticated → token !== null
// selectIsAdmin         → user?.role === "admin"
