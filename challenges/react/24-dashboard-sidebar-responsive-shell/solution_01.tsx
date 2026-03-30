// ============================================================
// Problem 01 — Responsive Dashboard Shell
// ============================================================



// ============================================================
// types/layout.ts
//
// interface NavItem: id, label, href, icon, badge?, children?
// interface SidebarState: isOpen, isCollapsed, width
// ============================================================



// ============================================================
// hooks/useSidebar.ts
//
// State: isOpen=false (mobile overlay), isCollapsed (persisted)
//
// isCollapsed init:
//   () => localStorage.getItem("sidebar_collapsed") === "true"
//
// toggleCollapse:
//   setIsCollapsed(prev => {
//     next = !prev
//     localStorage.setItem("sidebar_collapsed", String(next))
//     return next
//   })
//
// Auto-close mobile on route change useEffect([location.pathname]):
//   setIsOpen(false)
//
// Auto-close mobile on desktop resize useEffect([]):
//   window.addEventListener("resize", handler)
//   handler: if window.innerWidth >= 768: setIsOpen(false)
//
// return { isOpen, isCollapsed, toggle, toggleCollapse, close }
// ============================================================



// ============================================================
// components/layout/Sidebar.tsx
//
// Props: navItems, isOpen (mobile), isCollapsed (desktop), onClose, onToggleCollapse
//
// Outer structure:
//   Mobile backdrop (isOpen && md:hidden):
//     fixed inset-0 bg-black/40 z-20 onClick→onClose
//
//   <aside>:
//     fixed md:sticky h-screen z-30
//     transition-all duration-300
//     isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
//     isCollapsed ? "w-16" : "w-64"
//     bg-gray-900 dark:bg-gray-950
//
//   Logo row (h-16 border-b):
//     {!isCollapsed && <Link>Tripz</Link>}
//     collapse toggle button (hidden md:flex) → onToggleCollapse
//
//   <nav> flex-1 overflow-y-auto:
//     navItems.map(<NavLink item isCollapsed />)
//
// NavLink inner component:
//   isActive = location.pathname.startsWith(item.href)
//   active:   bg-blue-600 text-white
//   inactive: text-gray-400 hover:text-white hover:bg-gray-700
//   isCollapsed: show only icon + title={item.label} tooltip
//   !isCollapsed: icon + label + badge (if badge > 0)
// ============================================================



// ============================================================
// components/layout/Header.tsx
//
// Props: { onMenuClick: () => void }
//
// sticky top-0 z-10 h-16 bg-white dark:bg-gray-800 border-b
//
// Left:
//   hamburger button (md:hidden) → onMenuClick
//   <Breadcrumbs />
//
// Right (flex-shrink-0):
//   <SearchButton />         ← Cmd+K trigger (P02)
//   <NotificationCenter />   ← from TEST_19 pattern
//   <UserMenu />
// ============================================================



// ============================================================
// components/layout/UserMenu.tsx
//
// State: isOpen=false
// Ref: menuRef for outside-click detection
//
// Outside click useEffect:
//   document.addEventListener("mousedown", handler)
//   handler: if !menuRef.current?.contains(e.target): setIsOpen(false)
//
// initials = user?.name.split(" ").map(n=>n[0]).join("").toUpperCase().slice(0,2)
//
// Avatar button:
//   user.avatar → <img rounded-full />
//   else        → <div bg-blue-600 initials />
//   ChevronDown: rotate-180 when open
//   aria-expanded={isOpen} aria-haspopup="menu"
//
// Dropdown (isOpen):
//   absolute right-0 top-full w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl
//   User info block (name + email)
//   MenuItemLink to="/profile"
//   MenuItemLink to="/settings"
//   Divider
//   Sign out button (text-red-600) → logout() + setIsOpen(false)
// ============================================================



// ============================================================
// layouts/DashboardLayout.tsx
//
// const { isOpen, isCollapsed, toggle, toggleCollapse, close } = useSidebar()
//
// Key layout structure:
//   <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
//     <Sidebar ... />
//     <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
//       ← min-w-0: prevents flex child from overflowing past parent
//       <Header onMenuClick={toggle} />
//       <main className="flex-1 overflow-y-auto">
//         ← only this area scrolls, header stays sticky
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
//           {children}
//         </div>
//       </main>
//     </div>
//   </div>
// ============================================================



// ============================================================
// hooks/useDarkMode.ts
//
// State init: () =>
//   localStorage.getItem("theme") === "dark" ||
//   (!localStorage.getItem("theme") && matchMedia("(prefers-color-scheme: dark)").matches)
//
// useEffect([isDark]):
//   document.documentElement.classList.toggle("dark", isDark)
//   localStorage.setItem("theme", isDark ? "dark" : "light")
//
// return { isDark, toggle: () => setIsDark(prev => !prev) }
//
// Tailwind config: darkMode: "class"
// ← all dark: variants activate when <html class="dark">
// ============================================================
