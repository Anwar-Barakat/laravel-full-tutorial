# REACT_TEST_24 — Auth • Login • Register • Protected

**Time:** 25 minutes | **Stack:** React + TypeScript

---

## Problem 01 — Login & Register Pages (Medium)

Build complete login and register pages with form validation, API integration, token storage, and password strength indicator.

---

### Part A — Types

**File:** `types/auth.ts`

```ts
interface User {
  id: number
  name: string
  email: string
  role: "admin" | "staff" | "viewer"
  email_verified_at: string | null
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
}

interface LoginFormData {
  email: string
  password: string
  remember: boolean
}

interface RegisterFormData {
  name: string
  email: string
  password: string
  password_confirmation: string
}

interface AuthApiResponse {
  user: User
  token: string
}

interface ApiValidationError {
  message: string
  errors: Record<string, string[]>   // Laravel validation format
}
```

---

### Part B — `useAuthStore` (Context + useReducer)

**File:** `store/authStore.tsx`

```ts
type AuthAction =
  | { type: "LOGIN_SUCCESS"; payload: AuthApiResponse }
  | { type: "LOGOUT" }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "RESTORE"; user: User; token: string }

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "LOGIN_SUCCESS":
      return { ...state, user: action.payload.user, token: action.payload.token,
               isAuthenticated: true, isLoading: false }
    case "LOGOUT":
      return { user: null, token: null, isAuthenticated: false, isLoading: false }
    case "SET_LOADING":
      return { ...state, isLoading: action.loading }
    case "RESTORE":
      return { ...state, user: action.user, token: action.token, isAuthenticated: true }
    default:
      return state
  }
}
```

**`AuthProvider` component:**
```ts
const initialState: AuthState = { user: null, token: null, isLoading: true, isAuthenticated: false }

function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem("auth_token")
    const user  = localStorage.getItem("auth_user")
    if (token && user) {
      dispatch({ type: "RESTORE", user: JSON.parse(user), token })
    }
    dispatch({ type: "SET_LOADING", loading: false })
  }, [])

  const login = useCallback(async (data: LoginFormData): Promise<void> => {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw await response.json()   // throws ApiValidationError
    const payload: AuthApiResponse = await response.json()
    if (data.remember) {
      localStorage.setItem("auth_token", payload.token)
      localStorage.setItem("auth_user",  JSON.stringify(payload.user))
    } else {
      sessionStorage.setItem("auth_token", payload.token)
    }
    dispatch({ type: "LOGIN_SUCCESS", payload })
  }, [])

  const register = useCallback(async (data: RegisterFormData): Promise<void> => {
    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw await response.json()
    const payload: AuthApiResponse = await response.json()
    localStorage.setItem("auth_token", payload.token)
    localStorage.setItem("auth_user",  JSON.stringify(payload.user))
    dispatch({ type: "LOGIN_SUCCESS", payload })
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem("auth_token")
    localStorage.removeItem("auth_user")
    sessionStorage.removeItem("auth_token")
    dispatch({ type: "LOGOUT" })
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook
function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}
```

---

### Part C — `useForm` validation hook

**File:** `hooks/useForm.ts`

```ts
type Validator<T> = (value: T[keyof T], data: T) => string | undefined

interface UseFormOptions<T> {
  initial: T
  validators?: Partial<Record<keyof T, Validator<T>>>
}

function useForm<T extends Record<string, unknown>>({ initial, validators = {} }: UseFormOptions<T>) {
  const [data, setData]     = useState<T>(initial)
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const setField = <K extends keyof T>(key: K, value: T[K]) => {
    setData(prev => ({ ...prev, [key]: value }))
    setErrors(prev => ({ ...prev, [key]: undefined }))    // clear on change
  }

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {}
    for (const [key, validator] of Object.entries(validators)) {
      const error = (validator as Validator<T>)(data[key as keyof T], data)
      if (error) newErrors[key as keyof T] = error
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const setApiErrors = (apiError: ApiValidationError) => {
    const mapped: Partial<Record<keyof T, string>> = {}
    for (const [field, messages] of Object.entries(apiError.errors ?? {})) {
      mapped[field as keyof T] = messages[0]    // show first error per field
    }
    // If no field errors, set a general error
    if (Object.keys(mapped).length === 0) {
      mapped["email" as keyof T] = apiError.message
    }
    setErrors(mapped)
  }

  return { data, errors, isSubmitting, setField, validate, setApiErrors, setIsSubmitting }
}
```

---

### Part D — Password strength indicator

**File:** `utils/passwordStrength.ts`

```ts
type PasswordStrength = "empty" | "weak" | "medium" | "strong"

interface StrengthResult {
  strength: PasswordStrength
  score: number           // 0–4
  feedback: string[]      // tips for what's missing
}

function getPasswordStrength(password: string): StrengthResult {
  if (!password) return { strength: "empty", score: 0, feedback: [] }

  const checks = {
    length:    password.length >= 8,
    upper:     /[A-Z]/.test(password),
    lower:     /[a-z]/.test(password),
    number:    /\d/.test(password),
    special:   /[^A-Za-z0-9]/.test(password),
  }

  const score = Object.values(checks).filter(Boolean).length   // 0–5

  const feedback: string[] = []
  if (!checks.length)  feedback.push("At least 8 characters")
  if (!checks.upper)   feedback.push("One uppercase letter")
  if (!checks.number)  feedback.push("One number")
  if (!checks.special) feedback.push("One special character")

  const strength: PasswordStrength =
    score <= 2 ? "weak" :
    score <= 3 ? "medium" : "strong"

  return { strength, score, feedback }
}
```

**`PasswordStrengthBar` component:**
```tsx
function PasswordStrengthBar({ password }: { password: string }) {
  const { strength, score, feedback } = getPasswordStrength(password)

  if (!password) return null

  const bars = [1, 2, 3, 4]
  const filledBars = score > 4 ? 4 : Math.max(1, Math.floor(score * 4 / 5))

  const color = strength === "weak" ? "bg-red-500" : strength === "medium" ? "bg-amber-500" : "bg-green-500"
  const label = strength === "weak" ? "Weak" : strength === "medium" ? "Medium" : "Strong"

  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {bars.map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300
            ${i <= filledBars ? color : "bg-gray-200"}`} />
        ))}
      </div>
      <div className="flex justify-between items-center mt-1">
        <span className={`text-xs font-medium ${
          strength === "weak" ? "text-red-500" : strength === "medium" ? "text-amber-500" : "text-green-500"
        }`}>{label}</span>
        {feedback.length > 0 && (
          <span className="text-xs text-gray-400">{feedback[0]}</span>
        )}
      </div>
    </div>
  )
}
```

---

### Part E — `LoginPage`

**File:** `pages/LoginPage.tsx`

```tsx
function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string })?.from ?? "/dashboard"

  const { data, errors, isSubmitting, setField, setApiErrors, setIsSubmitting }
    = useForm<LoginFormData>({
      initial: { email: "", password: "", remember: false },
      validators: {
        email:    (v) => !String(v).includes("@") ? "Valid email required" : undefined,
        password: (v) => !v ? "Password is required" : undefined,
      }
    })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setIsSubmitting(true)
    try {
      await login(data)
      navigate(from, { replace: true })
    } catch (err) {
      setApiErrors(err as ApiValidationError)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600">Tripz</h1>
          <p className="text-gray-500 mt-2">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-2xl p-8 space-y-5">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              autoComplete="email"
              value={data.email}
              onChange={e => setField("email", e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2
                focus:ring-blue-500 ${errors.email ? "border-red-500" : "border-gray-300"}`}
            />
            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <Link to="/forgot-password" className="text-xs text-blue-600 hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              autoComplete="current-password"
              value={data.password}
              onChange={e => setField("password", e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2
                focus:ring-blue-500 ${errors.password ? "border-red-500" : "border-gray-300"}`}
            />
            {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
          </div>

          {/* Remember me */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={data.remember}
              onChange={e => setField("remember", e.target.checked)}
              className="rounded border-gray-300 text-blue-600"
            />
            <span className="text-sm text-gray-600">Remember me</span>
          </label>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold
                       hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
          >
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>

          <p className="text-center text-sm text-gray-500">
            Don't have an account?{" "}
            <Link to="/register" className="text-blue-600 hover:underline font-medium">Register</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
```

---

### Part F — `RegisterPage`

**File:** `pages/RegisterPage.tsx`

```tsx
function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const { data, errors, isSubmitting, setField, validate, setApiErrors, setIsSubmitting }
    = useForm<RegisterFormData>({
      initial: { name: "", email: "", password: "", password_confirmation: "" },
      validators: {
        name:     (v) => !String(v).trim()          ? "Name is required"           : undefined,
        email:    (v) => !String(v).includes("@")   ? "Valid email required"       : undefined,
        password: (v) => String(v).length < 8       ? "At least 8 characters"      : undefined,
        password_confirmation: (v, d) =>
          v !== d.password ? "Passwords do not match" : undefined,
      }
    })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setIsSubmitting(true)
    try {
      await register(data)
      navigate("/dashboard", { replace: true })
    } catch (err) {
      setApiErrors(err as ApiValidationError)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600">Tripz</h1>
          <p className="text-gray-500 mt-2">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-2xl p-8 space-y-5">
          {/* Name, Email — same pattern as LoginPage */}

          {/* Password with strength */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" autoComplete="new-password"
                   value={data.password} onChange={e => setField("password", e.target.value)}
                   className={`w-full border rounded-lg px-3 py-2 ...`} />
            <PasswordStrengthBar password={data.password} />
            {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input type="password" autoComplete="new-password"
                   value={data.password_confirmation}
                   onChange={e => setField("password_confirmation", e.target.value)}
                   className={`w-full border rounded-lg px-3 py-2 ...`} />
            {errors.password_confirmation && (
              <p className="text-xs text-red-600 mt-1">{errors.password_confirmation}</p>
            )}
          </div>

          <button type="submit" disabled={isSubmitting}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold ...">
            {isSubmitting ? "Creating account…" : "Create account"}
          </button>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-600 hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
```

---

### Part G — `ForgotPasswordPage`

**File:** `pages/ForgotPasswordPage.tsx`

**Two internal states:** `"email"` (enter email) → `"sent"` (confirmation)

```tsx
function ForgotPasswordPage() {
  const [step, setStep] = useState<"email" | "sent">("email")
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.includes("@")) { setError("Valid email required"); return }
    setIsSubmitting(true); setError(null)
    try {
      await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      // Always show success to prevent email enumeration
      setStep("sent")
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (step === "sent") {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">📧</div>
        <h2 className="text-xl font-bold mb-2">Check your email</h2>
        <p className="text-gray-500 mb-6">
          If <strong>{email}</strong> is registered, you'll receive a reset link.
        </p>
        <Link to="/login" className="text-blue-600 hover:underline">Back to sign in</Link>
      </div>
    )
  }

  return (
    // Email input form — similar structure to LoginPage
    // "Always show success" note prevents email enumeration attacks
  )
}
```

---

### Part H — `ProtectedRoute`

**File:** `components/ProtectedRoute.tsx`

```tsx
interface ProtectedRouteProps {
  requiredRole?: User["role"] | User["role"][]
}

function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) return <LoadingSpinner />    // prevent flash of redirect

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    if (!roles.includes(user!.role)) {
      return <Navigate to="/unauthorized" replace />
    }
  }

  return <Outlet />
}
```

---

## Problem 02 — OAuth & Social Login (Hard)

Extend with Google/GitHub OAuth, per-provider loading states, account linking, and two-factor authentication.

---

### Part A — OAuth types

**File:** `types/auth.ts` (additions)

```ts
type OAuthProvider = "google" | "github"

interface OAuthState {
  loadingProvider: OAuthProvider | null   // which button shows spinner
}

interface TwoFactorChallenge {
  required: boolean
  type: "totp" | "recovery"              // authenticator app or backup code
}

interface LoginApiResponse extends AuthApiResponse {
  two_factor?: TwoFactorChallenge        // present when 2FA required
}
```

---

### Part B — OAuth buttons

**File:** `components/OAuthButtons.tsx`

```tsx
function OAuthButtons() {
  const [loadingProvider, setLoadingProvider] = useState<OAuthProvider | null>(null)

  const handleOAuth = (provider: OAuthProvider) => {
    setLoadingProvider(provider)
    // Redirect to Laravel Socialite endpoint — no AJAX, full page redirect
    window.location.href = `/auth/${provider}/redirect`
    // Note: setLoadingProvider never reaches "null" here because the page navigates away
    // The spinner shows briefly as reassurance to the user
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-3 text-gray-400">or continue with</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <OAuthButton
          provider="google"
          label="Google"
          icon={<GoogleIcon />}
          isLoading={loadingProvider === "google"}
          onClick={() => handleOAuth("google")}
        />
        <OAuthButton
          provider="github"
          label="GitHub"
          icon={<GitHubIcon />}
          isLoading={loadingProvider === "github"}
          onClick={() => handleOAuth("github")}
        />
      </div>
    </div>
  )
}

function OAuthButton({ provider, label, icon, isLoading, onClick }: OAuthButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className="flex items-center justify-center gap-2 w-full border border-gray-300
                 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700
                 hover:bg-gray-50 disabled:opacity-60 transition-colors"
    >
      {isLoading
        ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        : icon
      }
      {label}
    </button>
  )
}
```

---

### Part C — OAuth callback handler

**File:** `pages/OAuthCallbackPage.tsx`

Laravel Socialite redirects back to `/auth/{provider}/callback` with `?code=...&state=...`

```tsx
function OAuthCallbackPage() {
  const navigate  = useNavigate()
  const [searchParams] = useSearchParams()
  const { dispatch } = useAuthStore()

  useEffect(() => {
    const error = searchParams.get("error")
    if (error) {
      navigate("/login?error=" + encodeURIComponent(error), { replace: true })
      return
    }

    // The code exchange happens server-side — this page just reads the session
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then((user: User) => {
        dispatch({ type: "LOGIN_SUCCESS", payload: { user, token: getToken()! } })
        navigate("/dashboard", { replace: true })
      })
      .catch(() => navigate("/login?error=oauth_failed", { replace: true }))
  }, [])

  return <LoadingSpinner message="Completing sign in…" />
}
```

---

### Part D — Account linking flow

When OAuth email matches an existing account with a password:

```tsx
function AccountLinkPrompt({ provider, email }: { provider: OAuthProvider; email: string }) {
  const [password, setPassword] = useState("")
  const [isLinking, setIsLinking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLink = async () => {
    setIsLinking(true); setError(null)
    try {
      await fetch("/api/auth/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, email, password }),
      })
      // On success, the session is now linked — reload
      window.location.reload()
    } catch {
      setError("Incorrect password. Try again or use a different sign-in method.")
    } finally {
      setIsLinking(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-2xl shadow-md">
      <h2 className="text-xl font-bold mb-2">Link your account</h2>
      <p className="text-gray-500 text-sm mb-6">
        An account with <strong>{email}</strong> already exists.
        Enter your password to link your {provider} account.
      </p>
      <input type="password" value={password} onChange={e => setPassword(e.target.value)}
             className="w-full border rounded-lg px-3 py-2 mb-2" placeholder="Your password" />
      {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
      <button onClick={handleLink} disabled={isLinking}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold disabled:opacity-50">
        {isLinking ? "Linking…" : `Link ${provider} account`}
      </button>
    </div>
  )
}
```

---

### Part E — Two-factor authentication

**File:** `components/TwoFactorChallenge.tsx`

```tsx
interface TwoFactorChallengeProps {
  onVerify: (code: string, isRecovery: boolean) => Promise<void>
}

function TwoFactorChallenge({ onVerify }: TwoFactorChallengeProps) {
  const [code, setCode]           = useState("")
  const [isRecovery, setIsRecovery] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus on mount
  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null); setIsSubmitting(true)
    try {
      await onVerify(code, isRecovery)
    } catch {
      setError(isRecovery ? "Invalid recovery code" : "Invalid authentication code")
      setCode("")           // clear input on error
      inputRef.current?.focus()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto">
      <h2 className="text-xl font-bold mb-2">Two-factor authentication</h2>
      <p className="text-gray-500 text-sm mb-6">
        {isRecovery
          ? "Enter one of your recovery codes"
          : "Enter the 6-digit code from your authenticator app"
        }
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          ref={inputRef}
          type="text"
          inputMode={isRecovery ? "text" : "numeric"}
          pattern={isRecovery ? undefined : "[0-9]{6}"}
          maxLength={isRecovery ? 10 : 6}
          value={code}
          onChange={e => setCode(e.target.value.replace(/\s/g, ""))}
          placeholder={isRecovery ? "XXXX-XXXX" : "000000"}
          className={`w-full border rounded-lg px-3 py-3 text-center text-xl tracking-widest
            ${error ? "border-red-500" : "border-gray-300"}`}
          autoComplete="one-time-code"
        />
        {error && <p className="text-xs text-red-600 text-center">{error}</p>}

        <button type="submit" disabled={isSubmitting || code.length < (isRecovery ? 8 : 6)}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold disabled:opacity-50">
          {isSubmitting ? "Verifying…" : "Verify"}
        </button>
      </form>

      <button onClick={() => { setIsRecovery(r => !r); setCode(""); setError(null) }}
              className="mt-4 text-sm text-blue-600 hover:underline w-full text-center">
        {isRecovery ? "Use authenticator app instead" : "Use a recovery code instead"}
      </button>
    </div>
  )
}
```

---

### Part F — Updated login flow with 2FA

```ts
// In AuthProvider.login:
const response = await fetch("/api/login", { ... })
if (!response.ok) throw await response.json()
const payload: LoginApiResponse = await response.json()

if (payload.two_factor?.required) {
  // Don't dispatch LOGIN_SUCCESS yet — store temp state for 2FA step
  dispatch({ type: "SET_TWO_FACTOR", challenge: payload.two_factor })
  return   // caller shows <TwoFactorChallenge> component
}

// Normal login success path
dispatch({ type: "LOGIN_SUCCESS", payload })
```

```ts
// verifyTwoFactor(code, isRecovery):
const response = await fetch("/api/two-factor-challenge", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(isRecovery ? { recovery_code: code } : { code }),
})
if (!response.ok) throw await response.json()
const payload = await response.json()
dispatch({ type: "LOGIN_SUCCESS", payload })
```
