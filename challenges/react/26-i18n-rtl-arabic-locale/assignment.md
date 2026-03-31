# REACT_TEST_30 — i18n • RTL • Arabic • Locale

**Time:** 25 minutes | **Stack:** React + TypeScript

---

## Problem 01 — Internationalization & RTL Support (Medium)

Build a complete i18n system for Tripz: translation context, `useTranslation` hook, RTL layout switching for Arabic, locale-aware number/date/currency formatting, and a language switcher.

---

### Part A — Locale types and translations

**File:** `types/i18n.ts`

```ts
type Locale = "en" | "ar"
type Direction = "ltr" | "rtl"

interface LocaleConfig {
  locale: Locale
  dir: Direction
  label: string
  nativeLabel: string    // name in that language: "English", "العربية"
}

const LOCALES: Record<Locale, LocaleConfig> = {
  en: { locale: "en", dir: "ltr", label: "English",  nativeLabel: "English" },
  ar: { locale: "ar", dir: "rtl", label: "Arabic",   nativeLabel: "العربية" },
}

// Typed translation keys — prevents typos at compile time
type TranslationKey = keyof typeof en   // inferred from the English translation object
```

---

### Part B — Translation files

**File:** `locales/en.ts`

```ts
export const en = {
  // Navigation
  nav: {
    dashboard:    "Dashboard",
    bookings:     "Bookings",
    destinations: "Destinations",
    settings:     "Settings",
    logout:       "Sign out",
  },
  // Bookings
  bookings: {
    title:          "Bookings",
    new:            "New Booking",
    search:         "Search bookings…",
    noResults:      "No bookings found",
    status: {
      pending:    "Pending",
      confirmed:  "Confirmed",
      cancelled:  "Cancelled",
    },
    fields: {
      school:     "School",
      destination:"Destination",
      date:       "Trip Date",
      students:   "Students",
      amount:     "Amount",
    },
    // Interpolated strings — {{variable}} syntax
    confirm:        "Confirm booking for {{school}}?",
    successMessage: "Booking #{{id}} created successfully",
    // Plural forms (English: one/other)
    studentCount:   "{{count}} student",       // singular
    studentCount_plural: "{{count}} students", // plural
  },
  // Common
  common: {
    save:     "Save",
    cancel:   "Cancel",
    delete:   "Delete",
    edit:     "Edit",
    loading:  "Loading…",
    error:    "Something went wrong",
    retry:    "Try again",
    close:    "Close",
  },
}
```

**File:** `locales/ar.ts`

```ts
export const ar = {
  nav: {
    dashboard:    "لوحة التحكم",
    bookings:     "الحجوزات",
    destinations: "الوجهات",
    settings:     "الإعدادات",
    logout:       "تسجيل الخروج",
  },
  bookings: {
    title:          "الحجوزات",
    new:            "حجز جديد",
    search:         "البحث في الحجوزات…",
    noResults:      "لا توجد حجوزات",
    status: {
      pending:    "قيد الانتظار",
      confirmed:  "مؤكد",
      cancelled:  "ملغي",
    },
    fields: {
      school:     "المدرسة",
      destination:"الوجهة",
      date:       "تاريخ الرحلة",
      students:   "الطلاب",
      amount:     "المبلغ",
    },
    confirm:        "تأكيد الحجز لـ {{school}}؟",
    successMessage: "تم إنشاء الحجز رقم {{id}} بنجاح",
    // Arabic has 6 plural forms (zero/one/two/few/many/other)
    studentCount_zero:  "لا طلاب",
    studentCount_one:   "طالب واحد",
    studentCount_two:   "طالبان",
    studentCount_few:   "{{count}} طلاب",    // 3–10
    studentCount_many:  "{{count}} طالبًا",  // 11–99
    studentCount_other: "{{count}} طالب",   // 100+
  },
  common: {
    save:     "حفظ",
    cancel:   "إلغاء",
    delete:   "حذف",
    edit:     "تعديل",
    loading:  "جارٍ التحميل…",
    error:    "حدث خطأ ما",
    retry:    "حاول مجددًا",
    close:    "إغلاق",
  },
}
```

---

### Part C — `I18nContext` and `I18nProvider`

**File:** `contexts/I18nContext.tsx`

```ts
interface I18nContextValue {
  locale: Locale
  dir: Direction
  t: (key: string, vars?: Record<string, string | number>) => string
  setLocale: (locale: Locale) => void
  formatNumber:   (n: number, opts?: Intl.NumberFormatOptions) => string
  formatCurrency: (amount: number, currency?: string) => string
  formatDate:     (date: Date | string, opts?: Intl.DateTimeFormatOptions) => string
  formatRelative: (date: Date | string) => string   // "2 days ago", "منذ يومين"
}
```

**`I18nProvider` implementation:**

```tsx
const translations: Record<Locale, typeof en> = { en, ar }

function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem("locale") as Locale
    // Detect browser language as fallback
    const browser = navigator.language.startsWith("ar") ? "ar" : "en"
    return saved ?? browser
  })

  const dir = LOCALES[locale].dir

  // Apply dir to <html> element
  useEffect(() => {
    document.documentElement.setAttribute("lang", locale)
    document.documentElement.setAttribute("dir",  dir)
  }, [locale, dir])

  const setLocale = useCallback((next: Locale) => {
    localStorage.setItem("locale", next)
    setLocaleState(next)
  }, [])

  // Translation function with interpolation
  const t = useCallback((key: string, vars?: Record<string, string | number>): string => {
    // Navigate nested keys: "bookings.title" → translations[locale].bookings.title
    const keys = key.split(".")
    let value: unknown = translations[locale]
    for (const k of keys) {
      value = (value as Record<string, unknown>)?.[k]
      if (value === undefined) break
    }

    // Fallback to English if key missing
    if (value === undefined) {
      let fallback: unknown = translations.en
      for (const k of keys) { fallback = (fallback as Record<string, unknown>)?.[k] }
      value = fallback
    }

    if (typeof value !== "string") return key   // key not found in either locale

    // Interpolate: replace {{variable}} with vars
    if (vars) {
      return Object.entries(vars).reduce(
        (str, [k, v]) => str.replace(new RegExp(`{{${k}}}`, "g"), String(v)),
        value
      )
    }
    return value
  }, [locale])

  // Intl.NumberFormat
  const formatNumber = useCallback((n: number, opts?: Intl.NumberFormatOptions) =>
    new Intl.NumberFormat(locale, opts).format(n),
    [locale]
  )

  // Currency — defaults to GBP for Tripz (UK company)
  const formatCurrency = useCallback((amount: number, currency = "GBP") =>
    new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount),
    [locale]
  )

  // Date
  const formatDate = useCallback((date: Date | string, opts?: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, opts ?? { dateStyle: "medium" })
      .format(typeof date === "string" ? new Date(date) : date),
    [locale]
  )

  // Relative time: "2 days ago" / "منذ يومين"
  const formatRelative = useCallback((date: Date | string) => {
    const d     = typeof date === "string" ? new Date(date) : date
    const diffMs = d.getTime() - Date.now()
    const diffSecs = Math.round(diffMs / 1000)
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })

    const abs = Math.abs(diffSecs)
    if (abs < 60)   return rtf.format(diffSecs, "second")
    if (abs < 3600) return rtf.format(Math.round(diffSecs / 60), "minute")
    if (abs < 86400)return rtf.format(Math.round(diffSecs / 3600), "hour")
    return rtf.format(Math.round(diffSecs / 86400), "day")
  }, [locale])

  return (
    <I18nContext.Provider value={{ locale, dir, t, setLocale, formatNumber,
                                   formatCurrency, formatDate, formatRelative }}>
      {children}
    </I18nContext.Provider>
  )
}

function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider")
  return ctx
}
```

---

### Part D — Plural helper

**File:** `utils/plural.ts`

Arabic has 6 CLDR plural forms. The `Intl.PluralRules` API handles this automatically:

```ts
function pluralize(
  t: (key: string, vars?: Record<string, string | number>) => string,
  locale: Locale,
  baseKey: string,
  count: number
): string {
  const rules = new Intl.PluralRules(locale)
  const form  = rules.select(count)   // "zero"|"one"|"two"|"few"|"many"|"other"

  // Try specific plural form key, then base key
  const pluralKey = `${baseKey}_${form}`
  const result    = t(pluralKey, { count })

  // Fallback: if specific form missing, try baseKey_plural (English pattern), then baseKey
  if (result === pluralKey) return t(`${baseKey}_plural`, { count }) || t(baseKey, { count })
  return result
}

// Usage:
// pluralize(t, locale, "bookings.studentCount", 5)
// → English: "5 students"
// → Arabic (few): "5 طلاب"
```

---

### Part E — `LanguageSwitcher` component

**File:** `components/LanguageSwitcher.tsx`

```tsx
function LanguageSwitcher() {
  const { locale, setLocale } = useI18n()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(p => !p)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Language: ${LOCALES[locale].nativeLabel}`}
      >
        <GlobeIcon className="w-4 h-4" />
        <span className="text-sm">{LOCALES[locale].nativeLabel}</span>
        <ChevronDownIcon className="w-3 h-3" />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          aria-label="Select language"
          className="absolute end-0 top-full mt-1 bg-white rounded-xl shadow-lg border py-1 min-w-[140px] z-50"
        >
          {(Object.keys(LOCALES) as Locale[]).map(loc => (
            <li key={loc} role="option" aria-selected={loc === locale}>
              <button
                onClick={() => { setLocale(loc); setIsOpen(false) }}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm
                  ${loc === locale ? "text-blue-600 font-medium" : "text-gray-700 hover:bg-gray-50"}`}
                lang={loc}                          // correct lang on each option
                dir={LOCALES[loc].dir}              // Arabic option renders RTL
              >
                <span>{LOCALES[loc].nativeLabel}</span>
                {loc === locale && <CheckIcon className="w-4 h-4" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

---

### Part F — RTL-aware CSS with Tailwind

Tailwind v3 supports CSS logical properties via the `start`/`end` variants instead of `left`/`right`:

```tsx
// ❌ Physical properties — break in RTL:
<div className="ml-4 pl-3 left-0 text-left border-l">

// ✅ Logical properties — work in both LTR and RTL:
<div className="ms-4 ps-3 start-0 text-start border-s">
//              ↑     ↑     ↑       ↑         ↑
//              ms = margin-inline-start
//              ps = padding-inline-start
//              start-0 = inset-inline-start: 0
//              text-start = text-align: start
//              border-s = border-inline-start

// For animations/transforms that should flip in RTL:
<ChevronRightIcon
  className={`w-4 h-4 ${dir === "rtl" ? "rotate-180" : ""}`}
/>
// Or use Tailwind's rtl: variant (requires config):
<ChevronRightIcon className="w-4 h-4 rtl:rotate-180" />

// Sidebar: translate-x flips in RTL
<aside className={`
  fixed start-0 h-screen transition-transform
  ${isOpen ? "translate-x-0" : dir === "rtl" ? "translate-x-full" : "-translate-x-full"}
`}>
```

**Tailwind config for RTL variant:**
```js
// tailwind.config.js
module.exports = {
  future: {
    hoverOnlyWhenSupported: true,
  },
}
// rtl: and ltr: variants work automatically with dir attribute on html element
```

---

### Part G — Usage in components

```tsx
function BookingsPage() {
  const { t, formatCurrency, formatDate, formatRelative, locale, dir } = useI18n()

  return (
    <div dir={dir}>  {/* or set on <html> in provider */}
      <h1>{t("bookings.title")}</h1>
      <button>{t("bookings.new")}</button>

      {bookings.map(b => (
        <div key={b.id} className="flex items-start gap-3">
          <div className="flex-1">
            <p>{b.school_name}</p>
            <p>{formatDate(b.trip_date)}</p>
            <p>{formatRelative(b.created_at)}</p>
          </div>
          <p>{formatCurrency(b.amount)}</p>
          <p>{pluralize(t, locale, "bookings.studentCount", b.student_count)}</p>
        </div>
      ))}

      <p>{t("bookings.confirm", { school: "SSI London" })}</p>
    </div>
  )
}
```

---

## Problem 02 — Advanced i18n Patterns (Hard)

Add lazy-loaded translations, missing key warnings (dev mode), Hijri calendar dates, and number systems (Arabic-Indic numerals).

---

### Part A — Lazy-loaded translation files

**File:** `lib/loadTranslations.ts`

```ts
// Dynamic import — only loads the translation file when needed
async function loadTranslations(locale: Locale): Promise<typeof en> {
  const module = await import(
    /* webpackChunkName: "locale-[request]" */
    `../locales/${locale}.ts`
  )
  return module.default ?? module[locale]
}

// Updated I18nProvider with async loading:
const [translations, setTranslations] = useState<Partial<Record<Locale, typeof en>>>({ en })
const [isTranslationLoading, setIsTranslationLoading] = useState(false)

useEffect(() => {
  if (translations[locale]) return   // already loaded
  setIsTranslationLoading(true)
  loadTranslations(locale)
    .then(data => setTranslations(prev => ({ ...prev, [locale]: data })))
    .finally(() => setIsTranslationLoading(false))
}, [locale])
```

---

### Part B — Missing key warnings (dev mode)

```ts
// In the t() function, after fallback to English:
if (import.meta.env.DEV) {
  const missingInLocale = value === undefined
  const missingInEnglish = fallbackValue === undefined

  if (missingInLocale) {
    console.warn(`[i18n] Missing key "${key}" in locale "${locale}" — using English fallback`)
  }
  if (missingInEnglish) {
    console.error(`[i18n] Missing key "${key}" in ALL locales — returning key name`)
  }
}
```

---

### Part C — Arabic-Indic numerals

The `Intl.NumberFormat` API supports different numeral systems via `numberingSystem`:

```ts
// Arabic uses its own numeral system: ٠١٢٣٤٥٦٧٨٩
// Specify via Unicode extension tag:
const arabicNumerals = new Intl.NumberFormat("ar-u-nu-arab").format(2024)
// → "٢٠٢٤"

const latinInArabic  = new Intl.NumberFormat("ar-u-nu-latn").format(2024)
// → "2024"  (Latin numerals in Arabic locale)

// formatNumber with numeral system option:
function formatNumber(n: number, opts?: Intl.NumberFormatOptions) {
  const resolvedLocale = locale === "ar" ? "ar-u-nu-arab" : locale
  return new Intl.NumberFormat(resolvedLocale, opts).format(n)
}
```

---

### Part D — Hijri calendar dates

```ts
// Islamic calendar via Intl.DateTimeFormat with calendar extension:
function formatHijri(date: Date): string {
  return new Intl.DateTimeFormat("ar-SA-u-ca-islamic", {
    day:   "numeric",
    month: "long",
    year:  "numeric",
  }).format(date)
}
// → "١٤ شوال ١٤٤٥ هـ"

// Show both Gregorian + Hijri in Arabic locale:
function DateDisplay({ date }: { date: string }) {
  const { locale, formatDate } = useI18n()
  const d = new Date(date)

  return (
    <time dateTime={date}>
      {formatDate(d)}
      {locale === "ar" && (
        <span className="text-xs text-gray-400 ms-2">
          ({formatHijri(d)})
        </span>
      )}
    </time>
  )
}
```

---

### Part E — RTL-aware animations

```ts
// Slide-in from correct side based on direction
function SlideIn({ children, dir }: { children: ReactNode; dir: Direction }) {
  // LTR: slide from left (translateX starts negative)
  // RTL: slide from right (translateX starts positive)
  return (
    <div
      className={`animate-slide-in`}
      style={{
        "--slide-from": dir === "rtl" ? "100%" : "-100%",
      } as React.CSSProperties}
    >
      {children}
    </div>
  )
}

// In tailwind.config.js:
// keyframes: { "slide-in": { from: { transform: "translateX(var(--slide-from))" }, to: { transform: "translateX(0)" } } }
```

---

### Part F — `useI18n` with TypeScript autocomplete

Type the `t()` function for autocomplete on translation keys:

```ts
// Flatten nested keys: "bookings.title", "bookings.status.pending", etc.
type NestedKeyOf<T, K extends string = ""> =
  T extends object
    ? { [P in keyof T & string]: NestedKeyOf<T[P], K extends "" ? P : `${K}.${P}`> }[keyof T & string]
    : K

type TranslationKey = NestedKeyOf<typeof en>

// Typed t() — autocomplete suggests valid keys:
function t(key: TranslationKey, vars?: Record<string, string | number>): string
//             ↑ TS now autocompletes: "bookings.title", "common.save", etc.
```

---

### Key concepts reference

```ts
// Intl API — use instead of libraries for basic i18n:
new Intl.NumberFormat(locale, opts).format(n)
new Intl.DateTimeFormat(locale, opts).format(date)
new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(diff, unit)
new Intl.PluralRules(locale).select(count)   // returns "zero"|"one"|"two"|"few"|"many"|"other"

// Arabic plural forms (Intl.PluralRules returns):
//   0        → "zero"
//   1        → "one"
//   2        → "two"
//   3–10     → "few"
//   11–99    → "many"
//   100+     → "other"
// English only has "one" (n===1) and "other"

// dir attribute placement:
//   On <html>: affects entire page (document direction)
//   On individual elements: useful for mixed-direction content
//   Input fields: always match their content direction, not page direction

// CSS logical properties (always use these over physical):
//   margin-inline-start / ms-*   (instead of margin-left)
//   padding-inline-start / ps-*  (instead of padding-left)
//   border-inline-start / border-s (instead of border-left)
//   inset-inline-start / start-*  (instead of left)
//   text-align: start            (instead of text-align: left)

// RTL gotchas:
//   Icons with directional meaning (→ ← ↔) must flip: rtl:rotate-180
//   Back button becomes "forward" visually in RTL — use correct icon
//   Absolutely positioned elements: use start-0/end-0 not left-0/right-0
//   Flexbox: row direction is already RTL-aware (no changes needed)
//   Grid: also RTL-aware automatically
//   Sidebar translate-x: MUST flip sign in RTL
```
