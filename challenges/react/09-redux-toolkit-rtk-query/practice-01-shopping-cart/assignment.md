# Practice 01 — Shopping Cart (Redux Toolkit)

Real-world e-commerce cart using `createSlice` + `createAsyncThunk`.

---

## Scenario

Build a shopping cart store for an online store.
User can browse products, add them to cart, update quantities, and checkout.

---

## State Shape

```ts
interface CartItem {
    id:       number;
    name:     string;
    price:    number;
    quantity: number;
}

interface CartState {
    items:           CartItem[];
    status:          "idle" | "loading" | "succeeded" | "failed";
    error:           string | null;
    checkoutStatus:  "idle" | "loading" | "succeeded" | "failed";
}
```

---

## Requirements

### Sync reducers (instant, no API)
1. `addItem(item: CartItem)` — add item, or increase quantity if already in cart
2. `removeItem(id: number)` — remove item completely
3. `updateQuantity({ id, quantity })` — set item quantity (remove if quantity = 0)
4. `clearCart()` — empty the cart

### Async thunks (API calls)
5. `fetchProducts` — GET /products — load available products
6. `checkout(items)` — POST /orders — submit the cart

### Selectors
7. `selectCartItems` — all items in cart
8. `selectCartTotal` — total price (price × quantity for each item) → `createSelector`
9. `selectCartCount` — total number of items → `createSelector`
10. `selectIsEmpty` — true if cart has no items

---

## Expected Usage in Component

```ts
const dispatch = useAppDispatch()
const items    = useAppSelector(selectCartItems)
const total    = useAppSelector(selectCartTotal)
const count    = useAppSelector(selectCartCount)

// add item
dispatch(addItem({ id: 1, name: "Book", price: 29.99, quantity: 1 }))

// update quantity
dispatch(updateQuantity({ id: 1, quantity: 3 }))

// remove
dispatch(removeItem(1))

// checkout
const result = await dispatch(checkout(items))
if (checkout.fulfilled.match(result)) {
    dispatch(clearCart())
}
```

---

## Hints

- `addItem`: check if item already exists with `.find()` — if yes, increase quantity
- `selectCartTotal`: `items.reduce((sum, item) => sum + item.price * item.quantity, 0)`
- `checkout` thunk: after success → `clearCart()` in the component, not in the thunk
