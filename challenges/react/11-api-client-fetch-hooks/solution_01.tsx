// ============================================================
// Problem 01 — API Client with Interceptors
// ============================================================



// ============================================================
// lib/ApiError.ts
//
// class ApiError extends Error:
//   constructor(status, code, message, errors?)
//   Object.setPrototypeOf(this, ApiError.prototype)  ← required for instanceof
//   name = "ApiError"
//
//   get isValidation()   { return this.status === 422 }
//   get isUnauthorized() { return this.status === 401 }
//   get isNotFound()     { return this.status === 404 }
//   get isServerError()  { return this.status >= 500 }
// ============================================================



// ============================================================
// lib/ApiClient.ts
//
// type RequestInterceptor  = (config: RequestInit & { url: string }) => same
// type ResponseInterceptor = (response: Response) => Promise<Response>
//
// ApiClientConfig: { baseUrl, timeout?, getToken? }
//
// constructor:
//   this.requestInterceptors  = []
//   this.responseInterceptors = []
//   register authInterceptor (request) + errorInterceptor (response)
//
// authInterceptor(config):
//   token = getToken?.() ?? localStorage.getItem("auth_token")
//   if token: add Authorization: Bearer {token} to headers
//
// errorInterceptor(response):
//   if response.ok → return response
//   body = await response.clone().json()  ← clone() because body can only be read once
//   if status 401 → localStorage.removeItem + window.location.href = "/login"
//   throw new ApiError(status, body.code, body.message, body.errors)
//
// request<T>(url, options, signal?):
//   fullUrl = baseUrl + url
//   config = { ...options, headers: { Content-Type, Accept, ...options.headers } }
//   run requestInterceptors in order
//   timeout: new AbortController + setTimeout(abort, timeout)
//   response = await fetch(url, config)
//   run responseInterceptors in order
//   if status 204: return null as T
//   return response.json()
//   catch AbortError → throw ApiError(0, "REQUEST_ABORTED", ...)
//   finally: clearTimeout(timeoutId)
//
// get<T>(url, signal?)           → request<T>(url, { method: "GET" }, signal)
// post<T>(url, body, signal?)    → request<T>(url, { method: "POST", body: JSON.stringify })
// patch<T>(url, body, signal?)   → request<T>(url, { method: "PATCH", body: JSON.stringify })
// delete<T>(url, signal?)        → request<T>(url, { method: "DELETE" }, signal)
//
// export const api = new ApiClient({ baseUrl, timeout: 15_000, getToken })
// ============================================================



// ============================================================
// hooks/useFetch.ts
//
// UseFetchOptions<T>: { enabled?, onSuccess?, onError?, initialData? }
// UseFetchReturn<T>:  { data, isLoading, error, refetch, mutate }
//
// state: data, isLoading, error, trigger (counter for refetch)
//
// useEffect([url, enabled, trigger]):
//   if !url || !enabled → return (dependent fetch)
//   controller = new AbortController()
//   setIsLoading(true); setError(null)
//   api.get<T>(url, controller.signal)
//     .then(result → setData + onSuccess)
//     .catch(err → if REQUEST_ABORTED: return; else setError + onError)
//     .finally(→ setIsLoading(false))
//   return () => controller.abort()  ← cleanup cancels in-flight request
//
// refetch: () => setTrigger(t => t + 1)
// mutate:  (d) => setData(d)  ← local override without refetch
// ============================================================



// ============================================================
// Usage patterns
//
// Basic:
//   useFetch<Booking[]>("/bookings")
//   → isLoading, error, data, refetch
//
// Dependent (null = skip):
//   useFetch<Booking>(bookingId ? `/bookings/${bookingId}` : null)
//   → if bookingId is null, useEffect skips entirely
//
// Optimistic mutate:
//   const { data, mutate, refetch } = useFetch<Booking>(`/bookings/${id}`)
//   mutate({ ...data!, status: "paid" })  ← update UI immediately
//   try: await api.patch(...)
//   catch: mutate(original); refetch()   ← revert on failure
// ============================================================
