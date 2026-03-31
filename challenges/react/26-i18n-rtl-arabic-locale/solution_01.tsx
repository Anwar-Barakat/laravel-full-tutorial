// ============================================================
// Problem 01 — Internationalization & RTL Support
// ============================================================



// ============================================================
// types/i18n.ts
//
// type Locale = "en" | "ar"
// type Direction = "ltr" | "rtl"
//
// interface LocaleConfig: locale, dir, label, nativeLabel
//
// LOCALES: Record<Locale, LocaleConfig>
//   en: { dir:"ltr", nativeLabel:"English" }
//   ar: { dir:"rtl", nativeLabel:"العربية" }
// ============================================================



// ============================================================
// locales/en.ts + locales/ar.ts
//
// Nested key structure: nav.*, bookings.*, common.*
//
// Interpolation: "Booking #{{id}} created" — {{variable}} syntax
// English plurals: studentCount (singular) + studentCount_plural
// Arabic plurals: _zero / _one / _two / _few / _many / _other
//   (Arabic has 6 CLDR plural forms vs English's 2)
// ============================================================



// ============================================================
// contexts/I18nContext.tsx
//
// interface I18nContextValue:
//   locale, dir, t, setLocale,
//   formatNumber, formatCurrency, formatDate, formatRelative
//
// I18nProvider:
//   State init: () => localStorage.getItem("locale") ?? (navigator.language.startsWith("ar") ? "ar" : "en")
//
//   Apply to DOM useEffect([locale, dir]):
//     document.documentElement.setAttribute("lang", locale)
//     document.documentElement.setAttribute("dir", dir)
//
//   setLocale:
//     localStorage.setItem("locale", next)
//     setLocaleState(next)
//
//   t(key, vars?): string
//     keys = key.split(".")
//     navigate nested object: translations[locale][k1][k2]...
//     if undefined: fallback to translations.en[k1][k2]...
//     if still undefined: return key (last resort)
//     if vars: replace {{variable}} with vars values
//       Object.entries(vars).reduce((str, [k,v]) => str.replace(/{{k}}/g, v), value)
//
//   formatNumber:   new Intl.NumberFormat(locale, opts).format(n)
//   formatCurrency: new Intl.NumberFormat(locale, { style:"currency", currency }).format(amount)
//   formatDate:     new Intl.DateTimeFormat(locale, opts ?? { dateStyle:"medium" }).format(d)
//   formatRelative: Intl.RelativeTimeFormat(locale, { numeric:"auto" }).format(diff, unit)
//     diffSecs → pick unit: second/minute/hour/day
//
// useI18n(): ctx = useContext(I18nContext)
//   if !ctx: throw Error("must be used inside I18nProvider")
// ============================================================



// ============================================================
// utils/plural.ts
//
// function pluralize(t, locale, baseKey, count): string
//   rules = new Intl.PluralRules(locale)
//   form = rules.select(count)   → "zero"|"one"|"two"|"few"|"many"|"other"
//   pluralKey = `${baseKey}_${form}`
//   result = t(pluralKey, { count })
//   if result === pluralKey (key not found):
//     fallback to ${baseKey}_plural (English pattern), then baseKey
//   return result
//
// Arabic plural forms from Intl.PluralRules:
//   0 → "zero", 1 → "one", 2 → "two", 3-10 → "few", 11-99 → "many", 100+ → "other"
// ============================================================



// ============================================================
// components/LanguageSwitcher.tsx
//
// State: isOpen=false
// const { locale, setLocale } = useI18n()
//
// <button aria-haspopup="listbox" aria-expanded={isOpen}
//         aria-label={`Language: ${LOCALES[locale].nativeLabel}`}>
//   <GlobeIcon /> {LOCALES[locale].nativeLabel} <ChevronDownIcon />
// </button>
//
// {isOpen && (
//   <ul role="listbox" className="absolute end-0 ...">
//     ← end-0 = inset-inline-end: 0 (logical property — works RTL too)
//     {locales.map(loc =>
//       <li role="option" aria-selected={loc===locale}>
//         <button lang={loc} dir={LOCALES[loc].dir}   ← each option has correct lang+dir
//           onClick={() => { setLocale(loc); setIsOpen(false) }}>
//           {LOCALES[loc].nativeLabel}
//           {loc===locale && <CheckIcon />}
//         </button>
//       </li>
//     )}
//   </ul>
// )}
// ============================================================



// ============================================================
// RTL-aware Tailwind patterns
//
// ❌ Physical (breaks RTL): ml-4 pl-3 left-0 text-left border-l
// ✅ Logical (works both):  ms-4 ps-3 start-0 text-start border-s
//
//   ms = margin-inline-start
//   ps = padding-inline-start
//   start-0 = inset-inline-start: 0
//   text-start = text-align: start
//   border-s = border-inline-start
//
// Directional icons — must flip in RTL:
//   <ChevronRightIcon className="rtl:rotate-180" />
//
// Sidebar slide:
//   isOpen ? "translate-x-0" : dir==="rtl" ? "translate-x-full" : "-translate-x-full"
//
// Usage in component:
//   const { t, formatCurrency, formatDate, formatRelative, locale, dir } = useI18n()
//   {t("bookings.title")}
//   {formatCurrency(booking.amount)}
//   {formatDate(booking.trip_date)}
//   {pluralize(t, locale, "bookings.studentCount", booking.student_count)}
// ============================================================
