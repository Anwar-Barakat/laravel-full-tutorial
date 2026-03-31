// ============================================================
// Practice 01 — Shopping Cart (Redux Toolkit)
// Read assignment.md first, then fill in each section below.
// Check solution.ts when done.
// ============================================================

import {
    createSlice,
    createAsyncThunk,
    createSelector,
    configureStore,
} from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import type { PayloadAction } from "@reduxjs/toolkit";

// ── Types ─────────────────────────────────────────────────────
// CartItem: id, name, price, quantity
// Product: id, name, price
// CartState: items[], products[], status, error, checkoutStatus



// ── 1. initialState ───────────────────────────────────────────



// ── 2. fetchProducts — GET /api/products ─────────────────────
// createAsyncThunk("cart/fetchProducts", async (_, { rejectWithValue }) => { ... })



// ── 3. checkout — POST /api/orders ───────────────────────────
// createAsyncThunk("cart/checkout", async (items: CartItem[], { rejectWithValue }) => { ... })



// ── 4. createSlice ────────────────────────────────────────────
// reducers:
//   addItem       — add or increase quantity if already exists
//   removeItem    — remove by id
//   updateQuantity({ id, quantity }) — set quantity, remove if 0
//   clearCart     — empty items[]
//
// extraReducers:
//   fetchProducts: pending/fulfilled/rejected
//   checkout:      pending/fulfilled/rejected (use checkoutStatus field)



// ── 5. Store ──────────────────────────────────────────────────



// ── 6. Typed hooks ────────────────────────────────────────────



// ── 7. Selectors ─────────────────────────────────────────────
// selectCartItems, selectProducts, selectCartStatus, selectCartError, selectIsEmpty
// selectCartTotal  → createSelector (price × quantity)
// selectCartCount  → createSelector (sum of all quantities)
