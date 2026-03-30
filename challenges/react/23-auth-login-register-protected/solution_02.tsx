// ============================================================
// Problem 02 — OAuth & Social Login
// ============================================================



// ============================================================
// types/auth.ts  (extensions)
//
// type OAuthProvider = "google" | "github"
//
// interface TwoFactorChallenge:
//   required: boolean
//   type: "totp" | "recovery"   ← authenticator app or backup code
//
// interface LoginApiResponse extends AuthApiResponse:
//   two_factor?: TwoFactorChallenge   ← present when 2FA required before full auth
// ============================================================



// ============================================================
// components/OAuthButtons.tsx
//
// State: loadingProvider: OAuthProvider | null = null
//
// handleOAuth(provider):
//   setLoadingProvider(provider)
//   window.location.href = `/auth/${provider}/redirect`
//   ← full page redirect to Laravel Socialite — NOT fetch/AJAX
//   ← spinner shows briefly as UX reassurance; never reaches setLoadingProvider(null)
//
// Render:
//   "--- or continue with ---" divider
//   grid 2 cols: Google button + GitHub button
//
// OAuthButton props: { provider, label, icon, isLoading, onClick }
//   isLoading → show spinner instead of icon
//   disabled when isLoading
// ============================================================



// ============================================================
// pages/OAuthCallbackPage.tsx
//
// Laravel Socialite redirects back to /auth/{provider}/callback?code=...&state=...
// Code exchange happens server-side — React just reads the resulting session
//
// useEffect([]):
//   error = searchParams.get("error")
//   if error: navigate("/login?error=" + encodeURIComponent(error), { replace: true }); return
//
//   GET /api/auth/me (with token from storage)
//     → dispatch LOGIN_SUCCESS
//     → navigate("/dashboard", { replace: true })
//   catch: navigate("/login?error=oauth_failed", { replace: true })
//
// render: <LoadingSpinner message="Completing sign in…" />
// ============================================================



// ============================================================
// components/AccountLinkPrompt.tsx
//
// Props: { provider: OAuthProvider; email: string }
// Shown when OAuth email matches existing password account
//
// State: password, isLinking, error
//
// handleLink():
//   POST /api/auth/link { provider, email, password }
//   success → window.location.reload()  ← session now linked
//   catch   → setError("Incorrect password. Try again…")
//
// Render:
//   "An account with {email} already exists."
//   "Enter your password to link your {provider} account."
//   password input + error + "Link {provider} account" button
// ============================================================



// ============================================================
// components/TwoFactorChallenge.tsx
//
// Props: { onVerify: (code, isRecovery) => Promise<void> }
// State: code="", isRecovery=false, isSubmitting=false, error=null
// Ref: inputRef → auto-focus on mount useEffect([])
//
// handleSubmit(e):
//   e.preventDefault()
//   setError(null); setIsSubmitting(true)
//   try: await onVerify(code, isRecovery)
//   catch:
//     setError(isRecovery ? "Invalid recovery code" : "Invalid authentication code")
//     setCode("")            ← clear input on failure
//     inputRef.current?.focus()
//
// Input:
//   inputMode={isRecovery ? "text" : "numeric"}
//   pattern={isRecovery ? undefined : "[0-9]{6}"}
//   maxLength={isRecovery ? 10 : 6}
//   autoComplete="one-time-code"
//   text-center text-xl tracking-widest  ← prominent code display
//
// Disabled condition: code.length < (isRecovery ? 8 : 6)
//
// Toggle button: "Use a recovery code instead" ↔ "Use authenticator app instead"
//   onClick: setIsRecovery(r => !r); setCode(""); setError(null)
// ============================================================



// ============================================================
// AuthProvider.login — updated for 2FA
//
// response = await fetch("/api/login", ...)
// if !response.ok: throw await response.json()
// payload: LoginApiResponse = await response.json()
//
// if payload.two_factor?.required:
//   dispatch({ type: "SET_TWO_FACTOR", challenge: payload.two_factor })
//   return   ← caller shows <TwoFactorChallenge>, does NOT navigate yet
//
// // Normal path (no 2FA)
// store token + dispatch LOGIN_SUCCESS
//
// verifyTwoFactor(code, isRecovery):
//   POST /api/two-factor-challenge
//     body: isRecovery ? { recovery_code: code } : { code }
//   if !response.ok: throw await response.json()
//   dispatch LOGIN_SUCCESS + store token + navigate dashboard
// ============================================================



// ============================================================
// LoginPage — integrate OAuth + 2FA
//
// if twoFactorChallenge:
//   render <TwoFactorChallenge onVerify={verifyTwoFactor} />
//   ← replaces login form entirely until code verified
//
// After form: <OAuthButtons />
//
// Read ?error param on mount:
//   const error = searchParams.get("error")
//   if error: show banner "Sign in failed: {decodeURIComponent(error)}"
// ============================================================
