// ============================================================
// Problem 02 — Advanced i18n Patterns
// ============================================================



// ============================================================
// lib/loadTranslations.ts  (lazy loading)
//
// async function loadTranslations(locale: Locale): Promise<typeof en>
//   return import(
//     /* webpackChunkName: "locale-[request]" */
//     `../locales/${locale}.ts`
//   ).then(m => m.default ?? m[locale])
//
// Updated I18nProvider:
//   State: translations = { en: enData }   ← en pre-loaded, others lazy
//   State: isTranslationLoading = false
//
//   useEffect([locale]):
//     if translations[locale]: return   ← already cached
//     setIsTranslationLoading(true)
//     loadTranslations(locale)
//       .then(data => setTranslations(prev => ({ ...prev, [locale]: data })))
//       .finally(() => setIsTranslationLoading(false))
//
// Show previous locale's UI while new translation loads:
//   const activeTranslations = translations[locale] ?? translations.en
// ============================================================



// ============================================================
// Missing key warnings (dev mode)
//
// In t() function, after all lookups:
//
// if (import.meta.env.DEV || process.env.NODE_ENV === "development"):
//   if value === undefined && locale !== "en":
//     console.warn(`[i18n] Missing "${key}" in "${locale}" — using English fallback`)
//   if value === undefined:
//     console.error(`[i18n] Missing "${key}" in ALL locales — returning key name`)
//
// Purpose: catches missing translations during development
// Never runs in production (tree-shaken out)
// ============================================================



// ============================================================
// Arabic-Indic numerals
//
// new Intl.NumberFormat("ar-u-nu-arab").format(2024) → "٢٠٢٤"
// new Intl.NumberFormat("ar-u-nu-latn").format(2024) → "2024"  (Latin in Arabic locale)
//
// Updated formatNumber for Arabic locale:
//   resolvedLocale = locale === "ar" ? "ar-u-nu-arab" : locale
//   return new Intl.NumberFormat(resolvedLocale, opts).format(n)
//
// Unicode extension tags:
//   -u-nu-arab  = Arabic-Indic digits ٠١٢٣٤٥٦٧٨٩
//   -u-nu-latn  = Latin digits 0123456789
//   -u-ca-islamic = Islamic/Hijri calendar
// ============================================================



// ============================================================
// Hijri calendar dates
//
// formatHijri(date: Date): string
//   return new Intl.DateTimeFormat("ar-SA-u-ca-islamic", {
//     day: "numeric", month: "long", year: "numeric"
//   }).format(date)
//   → "١٤ شوال ١٤٤٥ هـ"
//
// DateDisplay component:
//   <time dateTime={date}>
//     {formatDate(d)}
//     {locale === "ar" && (
//       <span className="text-xs text-gray-400 ms-2">({formatHijri(d)})</span>
//     )}
//   </time>
//
// Show both Gregorian + Hijri only in Arabic locale
// dateTime attribute always uses ISO format (machine-readable)
// ============================================================



// ============================================================
// TypeScript typed translation keys
//
// Flatten nested object keys to dot-notation string union:
// type NestedKeyOf<T, K extends string = ""> =
//   T extends object
//     ? { [P in keyof T & string]: NestedKeyOf<T[P], K extends "" ? P : `${K}.${P}`> }[keyof T & string]
//     : K
//
// type TranslationKey = NestedKeyOf<typeof en>
//   → "nav.dashboard" | "nav.bookings" | "bookings.title" | "common.save" | ...
//
// t(key: TranslationKey, vars?): string
//   ← TypeScript autocompletes valid keys, errors on typos
//
// Note: nested key type is complex — in interviews, acceptable to say
// "I'd use a string type with docs, or a library like i18next for this"
// ============================================================



// ============================================================
// RTL-aware animations
//
// CSS custom property approach:
//   style={{ "--slide-from": dir==="rtl" ? "100%" : "-100%" } as CSSProperties}
//   className="animate-slide-in"   (uses var(--slide-from) in keyframes)
//
// Tailwind config:
//   keyframes: { "slide-in": {
//     from: { transform: "translateX(var(--slide-from))" },
//     to:   { transform: "translateX(0)" }
//   }}
//
// Tailwind rtl: variant approach (simpler for one-off cases):
//   className="animate-enter-from-left rtl:animate-enter-from-right"
// ============================================================



// ============================================================
// Key concepts
//
// Intl API (no library needed for basic i18n):
//   NumberFormat:       numbers, currency, percent
//   DateTimeFormat:     dates, times, relative times
//   RelativeTimeFormat: "2 days ago" / "منذ يومين"
//   PluralRules:        "one"/"other" (EN) vs 6 forms (AR)
//
// Arabic plural forms (Intl.PluralRules("ar").select(n)):
//   0 → "zero" | 1 → "one" | 2 → "two" | 3-10 → "few" | 11-99 → "many" | 100+ → "other"
//
// dir attribute placement:
//   <html dir> — affects entire page
//   Per-element — mixed-direction content (e.g. English text in Arabic UI)
//   Input fields — always match content direction, not page
//
// CSS logical properties (always prefer over physical):
//   ms/ps/start/border-s over ml/pl/left/border-l
//   Flexbox + Grid are RTL-aware automatically — no changes needed
//
// RTL gotchas:
//   Icons with direction (→ ←): rtl:rotate-180
//   Sidebar translate-x: must flip sign for RTL
//   Absolute positioning: start-0/end-0 not left-0/right-0
//   Back button: use start-pointing chevron (appears correct in both)
// ============================================================
