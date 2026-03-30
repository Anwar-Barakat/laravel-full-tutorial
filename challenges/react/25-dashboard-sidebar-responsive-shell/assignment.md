# REACT_TEST_26 — Dashboard • Sidebar • Responsive Shell

**Time:** 25 minutes | **Stack:** React + TypeScript

---

## Problem 01 — Responsive Dashboard Shell (Medium)

Build the complete Tripz dashboard layout: collapsible sidebar, sticky header, mobile overlay, user menu dropdown, and dark mode support.

---

### Part A — Types

**File:** `types/layout.ts`

```ts
interface NavItem {
  id: string
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number         // notification count
  children?: NavItem[]   // sub-navigation
}

interface SidebarState {
  isOpen: boolean        // mobile: overlay visible
  isCollapsed: boolean   // desktop: icon-only mode
  width: number          // desktop expanded width (Problem 02)
}

interface User {
  id: number
  name: string
  email: string
  role: string
  avatar?: string
}
```

---

### Part B — `useSidebar` hook

**File:** `hooks/useSidebar.ts`

```ts
function useSidebar(): {
  isOpen: boolean         // mobile overlay open
  isCollapsed: boolean    // desktop collapsed (icon-only)
  toggle: () => void      // mobile: show/hide overlay
  toggleCollapse: () => void  // desktop: expand/collapse
  close: () => void       // close mobile overlay
}
```

**Implementation:**
```ts
function useSidebar() {
  const [isOpen, setIsOpen] = useState(false)

  // Persist collapse preference
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem("sidebar_collapsed") === "true"
  })

  const toggle         = useCallback(() => setIsOpen(prev => !prev), [])
  const close          = useCallback(() => setIsOpen(false), [])
  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => {
      const next = !prev
      localStorage.setItem("sidebar_collapsed", String(next))
      return next
    })
  }, [])

  // Close mobile overlay on route change
  const location = useLocation()
  useEffect(() => { setIsOpen(false) }, [location.pathname])

  // Close on resize to desktop (≥768px)
  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 768) setIsOpen(false) }
    window.addEventListener("resize", handler)
    return () => window.removeEventListener("resize", handler)
  }, [])

  return { isOpen, isCollapsed, toggle, toggleCollapse, close }
}
```

---

### Part C — `Sidebar` component

**File:** `components/layout/Sidebar.tsx`

```tsx
interface SidebarProps {
  navItems: NavItem[]
  isOpen: boolean         // mobile
  isCollapsed: boolean    // desktop
  onClose: () => void
  onToggleCollapse: () => void
}
```

**Navigation items:**
```ts
const NAV_ITEMS: NavItem[] = [
  { id: "dashboard",    label: "Dashboard",    href: "/dashboard",    icon: HomeIcon },
  { id: "bookings",     label: "Bookings",     href: "/bookings",     icon: CalendarIcon, badge: 3 },
  { id: "destinations", label: "Destinations", href: "/destinations", icon: MapIcon },
  { id: "schools",      label: "Schools",      href: "/schools",      icon: BuildingIcon },
  { id: "reports",      label: "Reports",      href: "/reports",      icon: ChartIcon },
  { id: "settings",     label: "Settings",     href: "/settings",     icon: CogIcon },
]
```

**Render structure:**
```tsx
<>
  {/* Mobile backdrop */}
  {isOpen && (
    <div
      className="fixed inset-0 bg-black/40 z-20 md:hidden"
      onClick={onClose}
    />
  )}

  {/* Sidebar panel */}
  <aside className={`
    fixed md:sticky top-0 h-screen z-30
    flex flex-col bg-gray-900 dark:bg-gray-950 text-white
    transition-all duration-300 ease-in-out
    ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
    ${isCollapsed ? "w-16" : "w-64"}
  `}>
    {/* Logo */}
    <div className="flex items-center justify-between h-16 px-4 border-b border-gray-700">
      {!isCollapsed && (
        <Link to="/dashboard" className="text-xl font-bold text-white">Tripz</Link>
      )}
      <button onClick={onToggleCollapse}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700
                         hidden md:flex items-center">
        <MenuIcon className="w-5 h-5" />
      </button>
    </div>

    {/* Navigation */}
    <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-2">
      {navItems.map(item => <NavLink key={item.id} item={item} isCollapsed={isCollapsed} />)}
    </nav>

    {/* Bottom: collapse toggle (desktop) */}
    <div className="border-t border-gray-700 p-4">
      {!isCollapsed && (
        <p className="text-xs text-gray-500 text-center">Tripz v2.0</p>
      )}
    </div>
  </aside>
</>
```

**`NavLink` inner component:**
```tsx
function NavLink({ item, isCollapsed }: { item: NavItem; isCollapsed: boolean }) {
  const location = useLocation()
  const isActive = location.pathname.startsWith(item.href)

  return (
    <Link
      to={item.href}
      title={isCollapsed ? item.label : undefined}   // tooltip when collapsed
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm
        ${isActive
          ? "bg-blue-600 text-white"
          : "text-gray-400 hover:text-white hover:bg-gray-700"}`}
    >
      <item.icon className="w-5 h-5 flex-shrink-0" />
      {!isCollapsed && (
        <>
          <span className="flex-1">{item.label}</span>
          {item.badge && item.badge > 0 && (
            <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
              {item.badge > 99 ? "99+" : item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  )
}
```

---

### Part D — `Header` component

**File:** `components/layout/Header.tsx`

```tsx
interface HeaderProps {
  onMenuClick: () => void   // mobile hamburger
}
```

**Render:**
```tsx
<header className="sticky top-0 z-10 h-16 bg-white dark:bg-gray-800
                   border-b border-gray-200 dark:border-gray-700
                   flex items-center justify-between px-4 gap-4">
  {/* Left: hamburger (mobile) + breadcrumbs */}
  <div className="flex items-center gap-3 min-w-0">
    <button onClick={onMenuClick}
            className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100">
      <MenuIcon className="w-5 h-5" />
    </button>
    <Breadcrumbs />
  </div>

  {/* Right: search + notifications + user menu */}
  <div className="flex items-center gap-2 flex-shrink-0">
    <SearchButton />          {/* opens command palette in P02 */}
    <NotificationCenter />    {/* from REACT_TEST_19 pattern */}
    <UserMenu />
  </div>
</header>
```

---

### Part E — `UserMenu` component

**File:** `components/layout/UserMenu.tsx`

```tsx
function UserMenu() {
  const { user, logout } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const initials = user?.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)

  return (
    <div ref={menuRef} className="relative">
      {/* Avatar button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-2 p-1.5 rounded-full hover:bg-gray-100
                   dark:hover:bg-gray-700 transition-colors"
        aria-label="User menu"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        {user?.avatar
          ? <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
          : <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-medium
                             flex items-center justify-center">{initials}</div>
        }
        <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform duration-200
                                     ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800
                        rounded-xl shadow-xl border border-gray-200 dark:border-gray-700
                        py-1 z-50">
          {/* User info */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>

          {/* Menu items */}
          <div role="menu">
            <MenuItemLink to="/profile"  icon={<UserIcon />}   label="Profile" />
            <MenuItemLink to="/settings" icon={<CogIcon />}    label="Settings" />
            <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
            <button
              role="menuitem"
              onClick={() => { logout(); setIsOpen(false) }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600
                         hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOutIcon className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

### Part F — `DashboardLayout` component

**File:** `layouts/DashboardLayout.tsx`

```tsx
function DashboardLayout({ children }: { children: ReactNode }) {
  const { isOpen, isCollapsed, toggle, toggleCollapse, close } = useSidebar()

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        navItems={NAV_ITEMS}
        isOpen={isOpen}
        isCollapsed={isCollapsed}
        onClose={close}
        onToggleCollapse={toggleCollapse}
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuClick={toggle} />

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
```

**Key layout CSS:**
```
outer div:          flex h-screen overflow-hidden
  sidebar:          fixed md:sticky h-screen   ← sticky on desktop, overlay on mobile
  main area:        flex-1 flex-col min-w-0     ← min-w-0 prevents flex child overflow
    header:         sticky top-0 z-10
    content:        flex-1 overflow-y-auto      ← only content area scrolls
```

---

### Part G — Dark mode integration

```ts
// tailwind.config.js
module.exports = {
  darkMode: "class",   // toggle by adding "dark" class to <html>
}

// useDarkMode hook
function useDarkMode() {
  const [isDark, setIsDark] = useState(() =>
    localStorage.getItem("theme") === "dark" ||
    (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches)
  )

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark)
    localStorage.setItem("theme", isDark ? "dark" : "light")
  }, [isDark])

  return { isDark, toggle: () => setIsDark(prev => !prev) }
}
```

---

## Problem 02 — Resizable Panels & Keyboard Shortcuts (Hard)

Add drag-to-resize sidebar, global keyboard shortcuts, and a command palette (`Cmd+K`).

---

### Part A — `useKeyboardShortcut` hook

**File:** `hooks/useKeyboardShortcut.ts`

```ts
interface ShortcutOptions {
  meta?: boolean       // Cmd (Mac) / Ctrl (Windows)
  ctrl?: boolean       // Ctrl only
  shift?: boolean
  alt?: boolean
  preventDefault?: boolean
}

function useKeyboardShortcut(
  key: string,
  callback: (e: KeyboardEvent) => void,
  options: ShortcutOptions = {}
): void
```

**Implementation:**
```ts
function useKeyboardShortcut(key, callback, options = {}) {
  const callbackRef = useRef(callback)
  useEffect(() => { callbackRef.current = callback })   // stable ref pattern

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const metaMatch  = !options.meta  || (e.metaKey || e.ctrlKey)
      const ctrlMatch  = !options.ctrl  || e.ctrlKey
      const shiftMatch = !options.shift || e.shiftKey
      const altMatch   = !options.alt   || e.altKey
      const keyMatch   = e.key.toLowerCase() === key.toLowerCase()

      if (metaMatch && ctrlMatch && shiftMatch && altMatch && keyMatch) {
        if (options.preventDefault) e.preventDefault()
        callbackRef.current(e)
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [key, options.meta, options.ctrl, options.shift, options.alt, options.preventDefault])
}
```

**Usage:**
```ts
useKeyboardShortcut("k", openCommandPalette, { meta: true, preventDefault: true })
useKeyboardShortcut("b", toggleSidebar,      { meta: true, preventDefault: true })
useKeyboardShortcut("Escape", closeAll)
```

---

### Part B — Resizable sidebar

**File:** `hooks/useSidebarResize.ts`

```ts
const MIN_WIDTH = 180
const MAX_WIDTH = 400
const DEFAULT_WIDTH = 256   // 16rem = w-64

function useSidebarResize(): {
  width: number
  isResizing: boolean
  handleMouseDown: (e: React.MouseEvent) => void
}
```

**Implementation:**
```ts
function useSidebarResize() {
  const [width, setWidth] = useState<number>(() => {
    return Number(localStorage.getItem("sidebar_width")) || DEFAULT_WIDTH
  })
  const [isResizing, setIsResizing] = useState(false)
  const startXRef   = useRef(0)
  const startWidthRef = useRef(width)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    startXRef.current     = e.clientX
    startWidthRef.current = width
  }, [width])

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const delta    = e.clientX - startXRef.current
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidthRef.current + delta))
      setWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      localStorage.setItem("sidebar_width", String(width))
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup",   handleMouseUp)
    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup",   handleMouseUp)
    }
  }, [isResizing, width])

  return { width, isResizing, handleMouseDown }
}
```

**Drag handle in Sidebar:**
```tsx
{/* Resize handle — right edge of sidebar */}
<div
  onMouseDown={handleMouseDown}
  className={`absolute right-0 top-0 h-full w-1 cursor-col-resize
              hover:bg-blue-500 transition-colors duration-150 hidden md:block
              ${isResizing ? "bg-blue-500" : "bg-transparent"}`}
/>
```

---

### Part C — Command palette

**File:** `components/CommandPalette.tsx`

```tsx
interface Command {
  id: string
  label: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  action: () => void
  keywords: string[]
}
```

**`useCommandPalette` hook:**
```ts
function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery]   = useState("")

  const commands: Command[] = useMemo(() => [
    { id: "nav-dashboard",    label: "Go to Dashboard",    icon: HomeIcon,
      action: () => navigate("/dashboard"),   keywords: ["home", "overview"] },
    { id: "nav-bookings",     label: "Go to Bookings",     icon: CalendarIcon,
      action: () => navigate("/bookings"),    keywords: ["trips", "reservations"] },
    { id: "nav-new-booking",  label: "New Booking",        icon: PlusIcon,
      action: () => navigate("/bookings/new"), keywords: ["create", "add"] },
    { id: "toggle-dark",      label: "Toggle Dark Mode",   icon: MoonIcon,
      action: toggleDarkMode,                 keywords: ["theme", "light", "dark"] },
    { id: "toggle-sidebar",   label: "Toggle Sidebar",     icon: PanelIcon,
      action: toggleSidebar,                  keywords: ["collapse", "expand"] },
  ], [navigate, toggleDarkMode, toggleSidebar])

  const filtered = useMemo(() =>
    query.trim() === ""
      ? commands
      : commands.filter(cmd =>
          cmd.label.toLowerCase().includes(query.toLowerCase()) ||
          cmd.keywords.some(k => k.includes(query.toLowerCase()))
        ),
    [commands, query]
  )

  return { isOpen, open: () => setIsOpen(true), close: () => { setIsOpen(false); setQuery("") },
           query, setQuery, filtered }
}
```

**Component render:**
```tsx
function CommandPalette() {
  const { isOpen, close, query, setQuery, filtered } = useCommandPalette()
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keyboard navigation inside palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, filtered.length - 1)) }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)) }
    if (e.key === "Enter")     { filtered[activeIndex]?.action(); close() }
    if (e.key === "Escape")    { close() }
  }

  // Auto-focus input when opened
  useEffect(() => { if (isOpen) inputRef.current?.focus() }, [isOpen])

  // Reset active index when query changes
  useEffect(() => { setActiveIndex(0) }, [query])

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-[20vh] px-4"
         onClick={close}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-xl
                      overflow-hidden"
           onClick={e => e.stopPropagation()}
           onKeyDown={handleKeyDown}>
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b dark:border-gray-700">
          <SearchIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search pages, actions…"
            className="flex-1 bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400"
          />
          <kbd className="text-xs text-gray-400 border border-gray-200 dark:border-gray-600
                          rounded px-1.5 py-0.5">Esc</kbd>
        </div>

        {/* Results */}
        <ul className="max-h-80 overflow-y-auto py-2">
          {filtered.map((cmd, i) => (
            <li key={cmd.id}>
              <button
                onClick={() => { cmd.action(); close() }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                  ${i === activeIndex
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    : "hover:bg-gray-50 dark:hover:bg-gray-700"}`}
              >
                {cmd.icon && <cmd.icon className="w-4 h-4 flex-shrink-0" />}
                <div>
                  <p className="text-sm font-medium">{cmd.label}</p>
                  {cmd.description && <p className="text-xs text-gray-400">{cmd.description}</p>}
                </div>
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-4 py-8 text-center text-gray-400 text-sm">No results for "{query}"</li>
          )}
        </ul>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t dark:border-gray-700 flex gap-4 text-xs text-gray-400">
          <span><kbd>↑↓</kbd> navigate</span>
          <span><kbd>↵</kbd> select</span>
          <span><kbd>Esc</kbd> close</span>
        </div>
      </div>
    </div>,
    document.body
  )
}
```
