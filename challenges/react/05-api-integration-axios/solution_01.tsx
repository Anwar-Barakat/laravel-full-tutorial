// ============================================================
// Problem 01 — Axios API Layer
// ============================================================



// ============================================================
// lib/axios.ts
//
// api = axios.create({ baseURL, timeout: 15_000, headers })
//
// Request interceptor:
//   localStorage.getItem("auth_token") → config.headers.Authorization = `Bearer ${token}`
//
// Response interceptor:
//   401 → localStorage.removeItem("auth_token") + window.location.href = "/login"
//   422 → break (pass through — forms handle inline)
//   500+ → toast.error("Server error. Please try again.")
//   no response → toast.error("Network error. Check your connection.")
// ============================================================



// ============================================================
// types/api.ts
//
// ApiResponse<T>       — { data: T; message?: string }
// PaginatedResponse<T> — { data: T[]; meta: { current_page, last_page, per_page, total, from, to }; links: { first, last, prev, next } }
// ValidationErrorResponse — { message: string; errors: Record<string, string[]> }
// ============================================================



// ============================================================
// services/bookingApi.ts
//
// GetBookingsParams interface (status?, search?, page?, per_page?, date_from?, date_to?)
//
// bookingApi object:
//   getAll(params?)     — GET /bookings                → PaginatedResponse<Booking>
//   getById(id)         — GET /bookings/:id            → Booking (unwrap data.data)
//   create(payload)     — POST /bookings               → Booking
//   update(id, payload) — PATCH /bookings/:id          → Booking
//   delete(id)          — DELETE /bookings/:id         → void
//   search(query, signal?) — GET /bookings/search?q=   → Booking[] (signal for AbortController)
// ============================================================



// ============================================================
// utils/apiError.ts
//
// isValidationError(error: unknown):
//   error instanceof AxiosError
//   && error.response?.status === 422
//   && typeof error.response.data?.errors === "object"
//
// extractValidationErrors(error):
//   flatten { field: ["msg1", "msg2"] } → { field: "msg1" }
//   Object.entries(errors) → result[field] = messages[0]
//
// Usage:
//   catch (err) { if (isValidationError(err)) setErrors(extractValidationErrors(err)) }
// ============================================================
