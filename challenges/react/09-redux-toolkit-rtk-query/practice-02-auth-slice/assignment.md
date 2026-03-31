# Practice 02 — Auth Slice (Redux Toolkit)

Real-world authentication using `createSlice` + `createAsyncThunk`.

---

## Scenario

Build an auth store for login, register, and logout.
Token is stored in localStorage and injected into every API request.

---

## State Shape

```ts
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
```

---

## Requirements

### Sync reducers
1. `logout()` — clear user, token, remove from localStorage
2. `clearError()` — reset error to null
3. `setCredentials({ user, token })` — set user + token (used after token refresh)

### Async thunks
4. `login({ email, password })` — POST /auth/login
   - on success: save token to localStorage
   - returns `{ user, token }`
5. `register({ name, email, password })` — POST /auth/register
   - on success: save token to localStorage
   - returns `{ user, token }`

### Selectors
6. `selectCurrentUser`     — the logged-in user object
7. `selectAuthToken`       — the token string
8. `selectIsAuthenticated` — true if token is not null
9. `selectIsAdmin`         — true if user.role === "admin"

---

## Expected Usage in Component

```ts
const dispatch = useAppDispatch()
const user     = useAppSelector(selectCurrentUser)
const isAuth   = useAppSelector(selectIsAuthenticated)
const isAdmin  = useAppSelector(selectIsAdmin)

// login
const result = await dispatch(login({ email: "a@b.com", password: "secret" }))
if (login.rejected.match(result)) {
    // show error from result.payload
}

// logout
dispatch(logout())
```

---

## Hints

- `login.fulfilled`: `state.user = action.payload.user; state.token = action.payload.token`
- Save to localStorage inside the thunk (not the reducer):
  `localStorage.setItem("token", response.token)`
- `selectIsAuthenticated`: `(state) => state.auth.token !== null`
- Initial state: read token from localStorage so user stays logged in on refresh:
  `token: localStorage.getItem("token")`
