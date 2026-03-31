// ============================================================
// Practice 01 — Shopping Cart (Redux Toolkit)
// ============================================================

import {
    createSlice,
    createAsyncThunk,
    createSelector,
    configureStore,
} from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import type { PayloadAction } from "@reduxjs/toolkit";

// ============================================================
// Types
// ============================================================

interface CartItem {
    id:       number;
    name:     string;
    price:    number;
    quantity: number;
}

interface Product {
    id:    number;
    name:  string;
    price: number;
}

interface CartState {
    items:          CartItem[];
    products:       Product[];
    status:         "idle" | "loading" | "succeeded" | "failed";
    error:          string | null;
    checkoutStatus: "idle" | "loading" | "succeeded" | "failed";
}

// ============================================================
// Initial state
// ============================================================

const initialState: CartState = {
    items:          [],
    products:       [],
    status:         "idle",
    error:          null,
    checkoutStatus: "idle",
};

// ============================================================
// Async thunks
// ============================================================

export const fetchProducts = createAsyncThunk(
    "cart/fetchProducts",
    async (_: void, { rejectWithValue }) => {
        try {
            const response = await fetch("/api/products");
            return await response.json() as Product[];
        } catch (error: unknown) {
            return rejectWithValue((error as Error).message);
        }
    },
);

export const checkout = createAsyncThunk(
    "cart/checkout",
    async (items: CartItem[], { rejectWithValue }) => {
        try {
            const response = await fetch("/api/orders", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ items }),
            });
            return await response.json();
        } catch (error: unknown) {
            return rejectWithValue((error as Error).message);
        }
    },
);

// ============================================================
// Slice
// ============================================================

const cartSlice = createSlice({
    name: "cart",
    initialState,

    reducers: {
        // Add item — increase quantity if already in cart
        addItem(state, action: PayloadAction<CartItem>) {
            const existing = state.items.find((i) => i.id === action.payload.id);
            if (existing) {
                existing.quantity += 1;  // Immer — mutate directly
            } else {
                state.items.push(action.payload);
            }
        },

        // Remove item completely
        removeItem(state, action: PayloadAction<number>) {
            state.items = state.items.filter((i) => i.id !== action.payload);
        },

        // Set specific quantity — remove if 0
        updateQuantity(state, action: PayloadAction<{ id: number; quantity: number }>) {
            const { id, quantity } = action.payload;
            if (quantity === 0) {
                state.items = state.items.filter((i) => i.id !== id);
            } else {
                const item = state.items.find((i) => i.id === id);
                if (item) item.quantity = quantity;
            }
        },

        // Empty the cart
        clearCart(state) {
            state.items = [];
        },
    },

    extraReducers: (builder) => {
        // fetchProducts — need loading + error for product list
        builder
            .addCase(fetchProducts.pending, (state) => {
                state.status = "loading";
                state.error  = null;
            })
            .addCase(fetchProducts.fulfilled, (state, action) => {
                state.status   = "succeeded";
                state.products = action.payload;
            })
            .addCase(fetchProducts.rejected, (state, action) => {
                state.status = "failed";
                state.error  = action.payload as string;
            });

        // checkout — track its own status separately
        builder
            .addCase(checkout.pending, (state) => {
                state.checkoutStatus = "loading";
            })
            .addCase(checkout.fulfilled, (state) => {
                state.checkoutStatus = "succeeded";
                // don't clearCart here — do it in the component after success
            })
            .addCase(checkout.rejected, (state, action) => {
                state.checkoutStatus = "failed";
                state.error          = action.payload as string;
            });
    },
});

export const { addItem, removeItem, updateQuantity, clearCart } = cartSlice.actions;
export default cartSlice.reducer;

// ============================================================
// Store
// ============================================================

export const store = configureStore({
    reducer: {
        cart: cartSlice.reducer,
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

export const selectCartItems   = (state: RootState) => state.cart.items;
export const selectProducts    = (state: RootState) => state.cart.products;
export const selectCartStatus  = (state: RootState) => state.cart.status;
export const selectCartError   = (state: RootState) => state.cart.error;
export const selectIsEmpty     = (state: RootState) => state.cart.items.length === 0;

// Memoized — recalculates only when items change
export const selectCartTotal = createSelector(
    selectCartItems,
    (items) => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
);

export const selectCartCount = createSelector(
    selectCartItems,
    (items) => items.reduce((sum, item) => sum + item.quantity, 0),
);

/*
================================================================
TIPS
================================================================

ADITEM — FIND OR ADD PATTERN
------------------------------
• find existing item first — if found, mutate its quantity (Immer)
• if not found — push new item
• Immer lets you write: existing.quantity += 1 — no spread needed

UPDATEQUANTITY — REMOVE IF ZERO
---------------------------------
• if quantity reaches 0 → filter it out completely
• otherwise find and set the new quantity

CHECKOUT — SEPARATE STATUS FIELD
----------------------------------
• checkoutStatus is separate from status (products loading)
• two operations can run independently — each has its own status field
• clearCart() in the COMPONENT after fulfilled — not in extraReducers
  reason: keep reducer pure, let component decide what to do after success

SELECTCARTTOTAL — PRICE × QUANTITY
-------------------------------------
• item.price * item.quantity — per item subtotal
• .reduce() sums all subtotals
• createSelector caches — only recalculates when items array changes

================================================================
*/
