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
import axios from "axios";
import toast from "react-hot-toast";
import { AxiosError } from "axios";

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? "/api",
    timeout: 15_000,
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
    },
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("auth_token");
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    (error) => Promise.reject(error),
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        switch (error.response?.status) {
            case 401:
                localStorage.removeItem("auth_token");
                window.location.href = "/login";
                break;
            case 422:
                break;
            default:
                if (error.response?.status >= 500) {
                    toast.error("Server error. Please try again.");
                } else if (!error.response) {
                    toast.error("Network error. Check your connection.");
                }
        }
        return Promise.reject(error);
    },
);

// ============================================================
// types/api.ts
//
// ApiResponse<T>       — { data: T; message?: string }
// PaginatedResponse<T> — { data: T[]; meta: { current_page, last_page, per_page, total, from, to }; links: { first, last, prev, next } }
// ValidationErrorResponse — { message: string; errors: Record<string, string[]> }
// ============================================================

interface Booking {
    id: number;
    school_id: string;
    trip_id: string;
    booking_type: "domestic" | "international";
    student_count: number;
    trip_date: string;
    amount: number;
    visa_arrangement: string;
    status: string;
    created_at: string;
    updated_at: string;
}

interface CreateBookingData {
    school_id: string;
    trip_id: string;
    booking_type: "domestic" | "international";
    student_count: number;
    trip_date: string;
    amount: number;
    visa_arrangement?: string;
}
interface ApiResponse<T> {
    data: T;
    message?: string;
}

interface PaginationMetaResponse {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
}
interface PaginationLinkResponse {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
}
interface PaginatedResponse<T> {
    data: T[];
    meta: PaginationMetaResponse;
    links: PaginationLinkResponse;
}

interface ValidationErrorResponse {
    message: string;
    errors: Record<string, string[]>;
}

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

export const bookingApi = {
    getAll: async (params?) => {
        const { data } = await api.get<PaginatedResponse<Booking>>(
            `/bookings`,
            {
                params,
            },
        );
        return data;
    },
    getById: async (id: number) => {
        const { data } = await api.get<ApiResponse<Booking>>(`/bookings/${id}`);
        return data.data;
    },
    create: async (payload: CreateBookingData) => {
        const { data } = await api.post<ApiResponse<Booking>>(
            `/bookings`,
            payload,
        );
        return data.data;
    },
    update: async (id: number, payload: Partial<Booking>) => {
        const { data } = await api.patch<ApiResponse<Booking>>(
            `/bookings/${id}`,
            payload,
        );
        return data.data;
    },
    delete: async (id: number): Promise<void> => {
        await api.delete<ApiResponse<Booking>>(`/bookings/${id}`);
    },
    search: async (query: string, signal?: AbortSignal) => {
        const { data } = await api.get<ApiResponse<Booking[]>>(
            `/bookings/search`,
            {
                params: { q: query },
                signal,
            },
        );
        return data.data;
    },
};

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

export function isValidationError(error: unknown) {
    return (
        error instanceof AxiosError &&
        error.response?.status === 422 &&
        typeof error.response?.data.errors === "object"
    );
}

export function extractValidationErrors(
    error: AxiosError<{ errors: Record<string, string[]> }>,
): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [field, messages] of Object.entries(
        error.response!.data.errors,
    )) {
        result[field] = messages[0];
    }
    return result;
}

/*
================================================================
TIPS
================================================================

AXIOS.CREATE — SHARED INSTANCE
---------------------------------
• axios.create({ baseURL, timeout, headers }) — one instance, shared config
• all api.get/post/patch/delete calls inherit baseURL and headers automatically
• timeout: 15_000 — milliseconds, not seconds (15_000 = 15 seconds)
• baseURL fallback: import.meta.env.VITE_API_URL ?? "/api"

REQUEST INTERCEPTOR — TOKEN INJECTION
----------------------------------------
• api.interceptors.request.use(successFn, errorFn)
• successFn receives config — modify headers, then RETURN config
• forgetting return config breaks every request (Axios gets undefined)
• reads token fresh on every request — picks up login/logout changes
• think of it as Laravel middleware but for outgoing requests

RESPONSE INTERCEPTOR — GLOBAL ERROR HANDLING
----------------------------------------------
• success callback (response) => response — pass 2xx through untouched
• error callback handles 4xx/5xx via switch(error.response?.status)
• 401: clear token + redirect — session expired
• 422: break only — let forms handle validation errors inline
• 500+: toast — user sees a message, no per-call handling needed
• !error.response: network error — no internet or server unreachable
• always return Promise.reject(error) — keeps errors catchable by callers

APIRESPONSE VS PAGINATEDRESPONSE
-----------------------------------
• ApiResponse<T>      — single item: { data: T, message? }
• PaginatedResponse<T>— list: { data: T[], meta: {...}, links: {...} }
• getAll returns PaginatedResponse — unwrap is just data (already the full object)
• getById/create/update/search return ApiResponse — unwrap with data.data

DATA.DATA — THE DOUBLE UNWRAP
--------------------------------
• Axios wraps response in { data } — first .data is the Axios envelope
• Laravel wraps response in { data: T } — second .data is ApiResponse
• const { data } = await api.get<ApiResponse<Booking>>(...)
• return data.data ← first .data = Axios, second .data = ApiResponse.data
• getAll skips this — PaginatedResponse.data is the array, not a nested item

ABORTSIGNAL — CANCEL IN-FLIGHT REQUESTS
------------------------------------------
• search(query, signal?) — caller passes AbortController.signal
• api.get("/bookings/search", { params: { q: query }, signal })
• when signal.abort() is called, Axios cancels the request automatically
• use case: debounced search — cancel previous request when user keeps typing

ISVALIDATIONERROR + EXTRACTVALIDATIONERRORS
---------------------------------------------
• isValidationError(err) — type guard: narrows unknown to typed AxiosError<422>
• extractValidationErrors(err) — flattens { field: ["msg1","msg2"] } → { field: "msg1" }
• usage: catch(err) { if (isValidationError(err)) setErrors(extractValidationErrors(err)) }
• Laravel returns string[] per field — take only messages[0] for the form

================================================================
*/
