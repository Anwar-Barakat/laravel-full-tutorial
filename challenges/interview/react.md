# React Interview Q&A — 49 Questions with Code Examples

Based on Ahmed Basuony's React Developer interview questions.

---

## 1. What's the difference between SSG, SSR, SPA, and SSL?

- **SPA** (Single Page Application) — Loads one HTML page, JavaScript handles navigation. No full page reload.
- **SSR** (Server-Side Rendering) — Server generates the full HTML for each request and sends it to the browser.
- **SSG** (Static Site Generation) — Pages are pre-built at build time (not on each request). Fastest option.
- **SSL** (Secure Sockets Layer) — Encrypts data between browser and server (HTTPS). Not a rendering method.

```jsx
// SPA — React app with client-side routing
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </BrowserRouter>
  );
}
// The browser downloads the JS bundle once,
// then React handles page transitions — no server round-trip.

// SSR — Next.js fetches data on EVERY request
export async function getServerSideProps() {
  const res = await fetch('https://api.example.com/products');
  const products = await res.json();
  return { props: { products } };
}
// Server builds the HTML with data, sends ready-to-display page.

// SSG — Next.js builds the page once at build time
export async function getStaticProps() {
  const res = await fetch('https://api.example.com/products');
  const products = await res.json();
  return { props: { products } };
}
// Page is pre-built as static HTML. Blazing fast.
```

When to use what:
- SPA → Dashboards, admin panels, apps behind login
- SSR → Pages with frequently changing data that need SEO (news, e-commerce)
- SSG → Blogs, docs, landing pages (content doesn't change often)

---

## 2. What is a Promise and when to use it?

A Promise is an object that represents the eventual result of an asynchronous operation. It can be in one of three states: **pending**, **fulfilled**, or **rejected**.

```js
// Creating a promise
const fetchUser = new Promise((resolve, reject) => {
  setTimeout(() => {
    const user = { id: 1, name: 'Anwar' };
    if (user) {
      resolve(user);       // Success
    } else {
      reject('Not found'); // Failure
    }
  }, 1000);
});

// Using the promise
fetchUser
  .then(user => console.log(user))    // { id: 1, name: 'Anwar' }
  .catch(error => console.log(error)) // 'Not found'
  .finally(() => console.log('Done'));

// Real-world: fetch API returns a promise
fetch('https://api.example.com/users')
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));
```

When to use: API calls, file reading, timers, database queries — anything that takes time and shouldn't block the main thread.

---

## 3. What's the difference between synchronous and asynchronous functions?

- **Synchronous** — Runs line by line, blocks until done. Example: `Math.random()`, `array.map()`
- **Asynchronous** — Starts the task and moves on, handles result later. Example: `fetch()`, `setTimeout()`, `async/await`

```js
// Synchronous — blocks execution
console.log('1');
console.log('2'); // Waits for line above
console.log('3'); // Output: 1, 2, 3

// Asynchronous — non-blocking
console.log('1');
setTimeout(() => console.log('2'), 1000); // Goes to background
console.log('3'); // Output: 1, 3, 2
```

---

## 4. What is React Helmet?

React Helmet is a library that manages the `<head>` section of your HTML (title, meta tags, etc.) from within React components. It's essential for SEO in SPAs.

```jsx
import { Helmet } from 'react-helmet';

function ProductPage({ product }) {
  return (
    <>
      <Helmet>
        <title>{product.name} | My Store</title>
        <meta name="description" content={product.description} />
        <meta property="og:title" content={product.name} />
        <meta property="og:image" content={product.image} />
      </Helmet>

      <h1>{product.name}</h1>
      <p>{product.description}</p>
    </>
  );
}
// Each page can set its own title and meta tags dynamically.
```

---

## 5. How to use CSS Design Patterns?

```jsx
// 1. CSS Modules — scoped styles, no conflicts
// Button.module.css → .btn { background: blue; color: white; }
import styles from './Button.module.css';
function Button() {
  return <button className={styles.btn}>Click</button>;
}

// 2. BEM Naming Convention (Block__Element--Modifier)
<div className="card">
  <h2 className="card__title">Title</h2>
  <p className="card__body card__body--highlighted">Text</p>
</div>

// 3. Utility-First (Tailwind CSS)
function Card() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-800">Title</h2>
      <p className="text-gray-600 mt-2">Description</p>
    </div>
  );
}

// 4. Styled Components (CSS-in-JS)
import styled from 'styled-components';

const StyledButton = styled.button`
  background: ${props => props.primary ? 'blue' : 'gray'};
  color: white;
  padding: 10px 20px;
  border-radius: 4px;
`;

function App() {
  return <StyledButton primary>Click Me</StyledButton>;
}
```

---

## 6. What's the difference between Redux and Context API?

**Context API:**
- Built-in to React, no extra package needed
- Best for small/medium apps, simple shared state
- Minimal boilerplate
- Re-renders all consumers on any change
- No DevTools, no middleware support

**Redux:**
- External library (Redux Toolkit)
- Best for large apps with complex state logic
- More setup (store, reducers, actions)
- Selective re-renders with selectors
- Redux DevTools (time-travel debugging)
- Middleware support (thunk, saga for async)

```jsx
// Context API — simple theme toggle
const ThemeContext = React.createContext();

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  const toggle = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

function Header() {
  const { theme, toggle } = useContext(ThemeContext);
  return <button onClick={toggle}>Current: {theme}</button>;
}
```

```jsx
// Redux Toolkit — complex state management
import { createSlice, configureStore } from '@reduxjs/toolkit';

const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [], total: 0 },
  reducers: {
    addItem: (state, action) => {
      state.items.push(action.payload);
      state.total += action.payload.price;
    },
    removeItem: (state, action) => {
      const index = state.items.findIndex(i => i.id === action.payload);
      if (index !== -1) {
        state.total -= state.items[index].price;
        state.items.splice(index, 1);
      }
    },
  },
});

const store = configureStore({ reducer: { cart: cartSlice.reducer } });
```

Rule of thumb: Start with Context. If state becomes complex or performance suffers, switch to Redux.

---

## 7. When to use lazy function?

`React.lazy()` lets you load components only when they are needed (lazy loading), instead of loading everything upfront.

```jsx
import { lazy, Suspense } from 'react';

// Instead of: import Dashboard from './Dashboard';
const Dashboard = lazy(() => import('./Dashboard'));
const Settings = lazy(() => import('./Settings'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/" element={<Home />} />            {/* Loaded immediately */}
        <Route path="/dashboard" element={<Dashboard />} /> {/* Loaded when visited */}
        <Route path="/settings" element={<Settings />} />   {/* Loaded when visited */}
      </Routes>
    </Suspense>
  );
}
```

When to use: Large components, route-based splitting, heavy libraries, modals/dialogs that aren't always shown.

---

## 8. How to improve performance in a React app?

```jsx
// 1. Memoize expensive components
const ExpensiveList = React.memo(({ items }) => {
  return items.map(item => <ListItem key={item.id} item={item} />);
});

// 2. Use useMemo for expensive calculations
const sortedItems = useMemo(() => {
  return items.sort((a, b) => a.price - b.price);
}, [items]);

// 3. Use useCallback for stable function references
const handleClick = useCallback((id) => {
  setSelected(id);
}, []);

// 4. Lazy load routes and heavy components
const HeavyChart = lazy(() => import('./HeavyChart'));

// 5. Virtualize long lists (only render visible items)
import { FixedSizeList } from 'react-window';

function VirtualList({ items }) {
  return (
    <FixedSizeList height={400} itemCount={items.length} itemSize={50} width="100%">
      {({ index, style }) => (
        <div style={style}>{items[index].name}</div>
      )}
    </FixedSizeList>
  );
}

// 6. Avoid inline objects/functions in JSX
// ❌ BAD — creates new object every render
<Child style={{ color: 'red' }} />

// ✅ GOOD — stable reference
const childStyle = useMemo(() => ({ color: 'red' }), []);
<Child style={childStyle} />

// 7. Use proper keys in lists
// ❌ BAD
items.map((item, index) => <Item key={index} />)

// ✅ GOOD
items.map(item => <Item key={item.id} />)
```

---

## 9. What's the difference between var, let, and const?

- `var` — Function-scoped, can be re-declared and re-assigned, hoisted (value = `undefined`)
- `let` — Block-scoped, cannot be re-declared, can be re-assigned, hoisted (temporal dead zone)
- `const` — Block-scoped, cannot be re-declared or re-assigned, hoisted (temporal dead zone)

```js
// var — function scoped, can cause bugs
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// Output: 3, 3, 3 (var is shared across all iterations)

// let — block scoped, works correctly
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// Output: 0, 1, 2 (each iteration has its own i)

// const — cannot reassign
const name = 'Anwar';
// name = 'Ahmed'; // ❌ TypeError

// But objects/arrays CAN be mutated
const user = { name: 'Anwar' };
user.name = 'Ahmed'; // ✅ This works (mutating, not reassigning)
```

Best practice: Use `const` by default. Use `let` when you need to reassign. Never use `var`.

---

## 10. What is the Event Loop?

The event loop is the mechanism that allows JavaScript (single-threaded) to handle asynchronous operations without blocking.

How it works:
- **Call Stack** — executes synchronous code, one function at a time
- **Web APIs** — browser handles async tasks (setTimeout, fetch, DOM events)
- **Task Queue** — completed async callbacks wait here
- **Microtask Queue** — Promises and `queueMicrotask` go here (higher priority than Task Queue)
- **Event Loop** — checks if call stack is empty, then moves tasks from queues to stack

```js
console.log('1');                               // → Call Stack (runs immediately)

setTimeout(() => console.log('2'), 0);          // → Web API → Task Queue

Promise.resolve().then(() => console.log('3')); // → Microtask Queue

console.log('4');                               // → Call Stack (runs immediately)

// Output: 1, 4, 3, 2
// Why? Microtasks (Promises) run before Tasks (setTimeout)
```

---

## 11. What do you know about Formik and Yup?

**Formik** handles form state, validation, and submission. **Yup** defines the validation schema.

```jsx
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';

const validationSchema = Yup.object({
  name:     Yup.string().required('Name is required').min(2, 'Too short'),
  email:    Yup.string().email('Invalid email').required('Email is required'),
  password: Yup.string().min(8, 'Min 8 characters').required('Password is required'),
});

function RegisterForm() {
  return (
    <Formik
      initialValues={{ name: '', email: '', password: '' }}
      validationSchema={validationSchema}
      onSubmit={(values) => {
        console.log(values);
      }}
    >
      {({ isSubmitting }) => (
        <Form>
          <Field name="name" placeholder="Name" />
          <ErrorMessage name="name" component="span" />

          <Field name="email" type="email" placeholder="Email" />
          <ErrorMessage name="email" component="span" />

          <Field name="password" type="password" placeholder="Password" />
          <ErrorMessage name="password" component="span" />

          <button type="submit" disabled={isSubmitting}>Register</button>
        </Form>
      )}
    </Formik>
  );
}
```

> Note: React Hook Form is a popular lighter alternative to Formik.

---

## 12. How to ensure the best SEO experience?

```jsx
// 1. Use SSR or SSG (Next.js) — so search engines see full HTML
// SPA with client-side rendering = bad SEO (crawlers see empty page)

// 2. Set proper meta tags per page
<Head>
  <title>Buy iPhone 15 | Best Price</title>
  <meta name="description" content="Get the latest iPhone 15 at the best price..." />
  <meta property="og:title" content="Buy iPhone 15" />
  <meta property="og:image" content="/images/iphone15.jpg" />
  <link rel="canonical" href="https://example.com/products/iphone-15" />
</Head>

// 3. Use semantic HTML
<header>...</header>
<nav>...</nav>
<main>
  <article>
    <h1>Main Title</h1>    {/* Only ONE h1 per page */}
    <h2>Subtitle</h2>
    <p>Content...</p>
  </article>
</main>
<footer>...</footer>

// 4. Add alt text to images
<img src="/phone.jpg" alt="iPhone 15 Pro Max in blue color" />

// 5. Generate a sitemap and robots.txt
// 6. Use structured data (JSON-LD)
// 7. Optimize loading speed (Core Web Vitals)
```

---

## 13. What's the difference between Callback and Promise?

**Callback:**
- Pass a function as an argument
- Must handle errors in each callback
- Leads to "callback hell" (deeply nested code)
- Gets messy with multiple async steps

**Promise:**
- Uses `.then()` / `.catch()` chain
- Single `.catch()` handles all errors
- Clean flat chain, much more readable

```js
// Callback — gets ugly fast ("callback hell")
getUser(1, (user) => {
  getOrders(user.id, (orders) => {
    getOrderDetails(orders[0].id, (details) => {
      console.log(details); // 3 levels deep...
    });
  });
});

// Promise — flat and readable
getUser(1)
  .then(user => getOrders(user.id))
  .then(orders => getOrderDetails(orders[0].id))
  .then(details => console.log(details))
  .catch(err => console.error(err)); // One catch handles all errors

// Async/Await — even cleaner (still uses promises under the hood)
async function loadData() {
  try {
    const user = await getUser(1);
    const orders = await getOrders(user.id);
    const details = await getOrderDetails(orders[0].id);
    console.log(details);
  } catch (err) {
    console.error(err);
  }
}
```

---

## 14. What's the difference between async and await?

- `async` — marks a function as asynchronous (always returns a Promise)
- `await` — pauses execution inside that async function until the Promise resolves

```js
// async — makes function return a promise
async function getUser() {
  return { id: 1, name: 'Anwar' };
  // Same as: return Promise.resolve({ id: 1, name: 'Anwar' });
}

// await — pauses until promise resolves
async function fetchData() {
  const res = await fetch('/api/users');   // Wait for response
  const data = await res.json();           // Wait for parsing
  return data;
}

// Parallel execution with Promise.all
async function loadDashboard() {
  const [users, orders, stats] = await Promise.all([
    fetch('/api/users').then(r => r.json()),
    fetch('/api/orders').then(r => r.json()),
    fetch('/api/stats').then(r => r.json()),
  ]);
  // All 3 requests run at the same time, not one after another
}
```

Key rule: `await` can **only** be used inside an `async` function.

---

## 15. What do you know about React Query (TanStack Query)?

React Query manages **server state** — data from APIs. It handles fetching, caching, refetching, and synchronization automatically.

```jsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Fetching data — with automatic caching and refetching
function ProductList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: () => fetch('/api/products').then(res => res.json()),
    staleTime: 5 * 60 * 1000, // Data is fresh for 5 minutes
  });

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return data.map(p => <div key={p.id}>{p.name}</div>);
}

// Mutations — create/update/delete with cache invalidation
function AddProduct() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (newProduct) =>
      fetch('/api/products', {
        method: 'POST',
        body: JSON.stringify(newProduct),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      // Automatically refetches the products list
    },
  });

  return (
    <button onClick={() => mutation.mutate({ name: 'New Product' })}>
      Add Product
    </button>
  );
}
```

Why use it? No need to write loading/error states, caching logic, or refetch timers manually.

---

## 16. What's the difference between Next.js SEO and React Helmet?

**React Helmet:**
- Works with any React app (SPA)
- Sets meta tags client-side (after JS loads)
- Crawlers may miss the meta tags
- Requires installing `react-helmet` package

**Next.js `<Head>`:**
- Works with Next.js only
- Sets meta tags server-side (in initial HTML)
- Crawlers see everything on first load — full SEO benefit
- Built-in, no extra package needed

```jsx
// React Helmet (SPA) — crawler might miss this
import { Helmet } from 'react-helmet';

function Page() {
  return (
    <Helmet>
      <title>My Page</title>
      <meta name="description" content="..." />
    </Helmet>
  );
}

// Next.js Head — crawler sees this immediately
import Head from 'next/head';

function Page() {
  return (
    <Head>
      <title>My Page</title>
      <meta name="description" content="..." />
    </Head>
  );
}
// Same syntax, but Next.js renders it on the server.
```

Bottom line: If SEO matters, use Next.js. React Helmet is only useful for SPAs where SEO isn't critical.

---

## 17. What is the idea of Next.js?

Next.js is a React framework that adds features React doesn't have out of the box.

**React (SPA) limitations:**
- Client-side rendering only
- Needs `react-router` for routing
- Poor SEO
- Needs a separate backend for API
- Manual code splitting and image optimization

**Next.js adds:**
- SSR, SSG, ISR, and Client rendering options
- File-based routing (automatic, no config)
- Excellent SEO
- Built-in `/api` routes
- Automatic code splitting per page
- Built-in `<Image>` with optimization

```jsx
// File-based routing — no configuration needed
// pages/index.js          → /
// pages/about.js          → /about
// pages/products/[id].js  → /products/123

// API Routes — backend inside Next.js
// pages/api/users.js
export default function handler(req, res) {
  if (req.method === 'GET') {
    res.status(200).json([{ id: 1, name: 'Anwar' }]);
  }
}

// Built-in image optimization
import Image from 'next/image';
<Image src="/photo.jpg" width={500} height={300} alt="Photo" />
// Automatically resizes, compresses, and serves in WebP format
```

---

## 18. What are SOLID Principles?

- **S** — Single Responsibility — Each component/function does ONE thing
- **O** — Open/Closed — Open for extension, closed for modification
- **L** — Liskov Substitution — Child components should work wherever parent is expected
- **I** — Interface Segregation — Don't pass props a component doesn't need
- **D** — Dependency Inversion — Depend on abstractions, not concrete implementations

```jsx
// S — Single Responsibility
// ❌ BAD — one component does everything
function UserPage() {
  // fetches data, handles form, renders UI, validates...
}

// ✅ GOOD — each component has one job
function UserPage() {
  const user = useUser();               // Custom hook for data
  return <UserProfile user={user} />;   // Component for display
}

// O — Open/Closed (use composition)
// ❌ BAD — modifying component for each button type
function Button({ type }) {
  if (type === 'icon') return <button><Icon /></button>;
  if (type === 'text') return <button>Text</button>;
}

// ✅ GOOD — extend via children/props
function Button({ children, ...props }) {
  return <button {...props}>{children}</button>;
}
<Button><Icon /> Save</Button>
<Button>Cancel</Button>

// I — Interface Segregation
// ❌ BAD — passing entire user object when only name is needed
<UserAvatar user={user} />

// ✅ GOOD — pass only what's needed
<UserAvatar name={user.name} avatar={user.avatar} />
```

---

## 19. What is DOM and BOM?

**DOM (Document Object Model):**
- Represents the HTML page as a tree of nodes
- Accessed via: `document.getElementById()`, `document.querySelector()`
- Purpose: manipulate page content

**BOM (Browser Object Model):**
- Represents the browser window and its features
- Accessed via: `window.location`, `window.navigator`
- Purpose: interact with browser (URL, history, screen)

```js
// DOM — manipulate page content
document.getElementById('title').textContent = 'Hello';
document.querySelector('.btn').addEventListener('click', handler);

// BOM — interact with browser
window.location.href = '/about';
window.history.back();
window.localStorage.setItem('key', 'value');
window.innerWidth;    // Browser width
navigator.language;   // 'en-US'

// In React, you rarely touch DOM directly.
// React manages the DOM for you via Virtual DOM.
```

---

## 20. What is useMemo?

`useMemo` caches the result of an expensive calculation so it doesn't re-run on every render.

```jsx
import { useMemo, useState } from 'react';

function ProductList({ products }) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name');

  // Only recalculates when products, search, or sort changes
  const filteredProducts = useMemo(() => {
    console.log('Filtering...'); // Only logs when deps change
    return products
      .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a[sort] > b[sort] ? 1 : -1);
  }, [products, search, sort]);

  return (
    <>
      <input value={search} onChange={e => setSearch(e.target.value)} />
      {filteredProducts.map(p => <div key={p.id}>{p.name}</div>)}
    </>
  );
}
```

When to use: Expensive filtering, sorting, calculations. Don't use for simple values — the overhead of memoization isn't worth it.

---

## 21. What's the difference between controlled and uncontrolled components?

**Controlled:**
- Data lives in React state
- Value accessed via state variable
- Updated via `onChange` handler
- Easy validation

**Uncontrolled:**
- Data lives in the DOM itself
- Value accessed via `ref`
- DOM handles updates
- Harder to validate

```jsx
// Controlled — React controls the input value
function ControlledForm() {
  const [name, setName] = useState('');

  return (
    <input
      value={name}
      onChange={e => setName(e.target.value)} // Every keystroke updates state
    />
  );
}

// Uncontrolled — DOM controls the input value
function UncontrolledForm() {
  const nameRef = useRef();

  const handleSubmit = () => {
    console.log(nameRef.current.value); // Read from DOM directly
  };

  return (
    <>
      <input ref={nameRef} defaultValue="" />
      <button onClick={handleSubmit}>Submit</button>
    </>
  );
}
```

Best practice: Use controlled components. They give you full control over the data.

---

## 22. What is Lifting State Up?

When two sibling components need to share the same data, you "lift" the state to their closest common parent and pass it down as props.

```jsx
// ❌ PROBLEM — siblings can't communicate
function TemperatureInput() {
  const [temp, setTemp] = useState(''); // Each has its own state
  return <input value={temp} onChange={e => setTemp(e.target.value)} />;
}

// ✅ SOLUTION — lift state to parent
function TemperatureConverter() {
  const [celsius, setCelsius] = useState('');

  const fahrenheit = celsius ? (celsius * 9/5 + 32).toFixed(1) : '';

  return (
    <div>
      <label>Celsius</label>
      <input value={celsius} onChange={e => setCelsius(e.target.value)} />

      <label>Fahrenheit</label>
      <input value={fahrenheit} readOnly />
    </div>
  );
}

// Real-world example: search filter + results list
function ProductPage() {
  const [search, setSearch] = useState(''); // State lives in parent

  return (
    <>
      <SearchBar value={search} onChange={setSearch} />   {/* Child 1 */}
      <ProductList filter={search} />                      {/* Child 2 */}
    </>
  );
}
```

---

## 23. What's the difference between useEffect and useLayoutEffect?

**useEffect:**
- Runs AFTER the browser paints
- Non-blocking (async)
- Use for: API calls, subscriptions, timers
- Better default choice

**useLayoutEffect:**
- Runs BEFORE the browser paints
- Blocking (sync — holds up the paint)
- Use for: DOM measurements, preventing visual flicker
- Can slow down rendering if heavy

```jsx
// useEffect — runs AFTER paint (most common)
useEffect(() => {
  fetch('/api/users').then(r => r.json()).then(setUsers);
}, []);

// useLayoutEffect — runs BEFORE paint (rare, for DOM measurements)
function Tooltip({ targetRef }) {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    // Measure DOM before browser paints — no flicker
    const rect = targetRef.current.getBoundingClientRect();
    setPosition({ top: rect.bottom, left: rect.left });
  }, [targetRef]);

  return <div style={{ position: 'absolute', ...position }}>Tooltip</div>;
}
```

Rule: Always use `useEffect` unless you see a visual flicker that needs fixing.

---

## 24. When to use useRef instead of state?

**useState:**
- Triggers a re-render when changed
- Persists between renders
- Use for: data shown in UI

**useRef:**
- Does NOT trigger a re-render when changed
- Persists between renders
- Use for: DOM access, timers, previous values

```jsx
// useRef for DOM access
function AutoFocusInput() {
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current.focus(); // Focus input on mount
  }, []);

  return <input ref={inputRef} />;
}

// useRef to store previous value (no re-render)
function Counter() {
  const [count, setCount] = useState(0);
  const prevCountRef = useRef(0);

  useEffect(() => {
    prevCountRef.current = count; // Update ref without re-rendering
  }, [count]);

  return (
    <p>Now: {count}, Before: {prevCountRef.current}</p>
  );
}

// useRef for interval ID (no re-render needed)
function Timer() {
  const intervalRef = useRef(null);

  const start = () => {
    intervalRef.current = setInterval(() => console.log('tick'), 1000);
  };

  const stop = () => {
    clearInterval(intervalRef.current);
  };

  return (
    <>
      <button onClick={start}>Start</button>
      <button onClick={stop}>Stop</button>
    </>
  );
}
```

---

## 25. What's the difference between React.memo, useMemo, and useCallback?

- **`React.memo`** — HOC that memoizes a component, prevents re-render when props haven't changed
- **`useMemo`** — Hook that memoizes a calculated value, prevents recalculation
- **`useCallback`** — Hook that memoizes a function, prevents function re-creation

```jsx
// React.memo — skip re-render if props haven't changed
const UserCard = React.memo(({ name, avatar }) => {
  console.log('Rendering UserCard'); // Only logs when name or avatar changes
  return <div><img src={avatar} /><h3>{name}</h3></div>;
});

// useMemo — cache expensive calculation
const sortedList = useMemo(() => {
  return items.sort((a, b) => a.price - b.price); // Only re-sorts when items changes
}, [items]);

// useCallback — cache function reference
const handleDelete = useCallback((id) => {
  setItems(prev => prev.filter(item => item.id !== id));
}, []); // Same function reference across renders

// They work TOGETHER:
// useCallback keeps function reference stable →
// React.memo sees same props → skips re-render
<UserCard name="Anwar" onDelete={handleDelete} />
```

---

## 26. What is the Virtual DOM and how does it work?

The Virtual DOM is a lightweight JavaScript copy of the real DOM. React uses it to minimize expensive real DOM operations.

How it works:
- React creates a Virtual DOM tree (JS objects)
- When state changes, React creates a new Virtual DOM
- React diffs (compares) old vs new Virtual DOM
- React calculates the minimum changes needed
- React updates **only** those parts of the real DOM (reconciliation)

```jsx
// Example: only the counter text updates in the real DOM
function App() {
  const [count, setCount] = useState(0);

  return (
    <div>                          {/* NOT re-created in real DOM */}
      <h1>My App</h1>             {/* NOT re-created in real DOM */}
      <p>Count: {count}</p>       {/* ONLY this text node updates */}
      <button onClick={() => setCount(count + 1)}>+</button>
    </div>
  );
}

// Without Virtual DOM (vanilla JS), you might do:
// container.innerHTML = `<div>...everything...</div>`; // Slow! Recreates everything

// React only changes: textNode.nodeValue = "Count: 1"; // Fast! Minimal update
```

---

## 27. What is key in a list and why is it important?

The `key` prop tells React which items in a list have changed, been added, or removed. Without it, React can't efficiently update the list.

```jsx
// ❌ BAD — using index as key
{items.map((item, index) => (
  <li key={index}>{item.name}</li>
))}
// If you add an item at the beginning, ALL items re-render
// because their indexes shifted.

// ✅ GOOD — using unique ID as key
{items.map(item => (
  <li key={item.id}>{item.name}</li>
))}
// React knows exactly which item changed, added, or removed.
```

Without proper keys:
- Input fields lose their values
- Animations break
- Performance degrades (unnecessary re-renders)
- Component state can get mixed up between items

---

## 28. What is re-render and when does it happen?

A re-render is when React calls your component function again to generate new JSX. It does **not** mean the real DOM updates — React only updates the DOM if the output actually changed.

Re-render happens when:
- State changes (`setState`)
- Props change
- Parent re-renders
- Context value changes

```jsx
function Parent() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>+</button>
      <Child name="Anwar" />  {/* Re-renders even though props didn't change! */}
    </div>
  );
}

function Child({ name }) {
  console.log('Child renders'); // Logs on EVERY parent re-render
  return <p>{name}</p>;
}

// Fix: wrap Child with React.memo
const Child = React.memo(({ name }) => {
  console.log('Child renders'); // Now only logs when name changes
  return <p>{name}</p>;
});
```

---

## 29. How to prevent unnecessary re-renders?

```jsx
// 1. React.memo — prevent re-render when props haven't changed
const ExpensiveComponent = React.memo(({ data }) => {
  return <div>{/* expensive rendering */}</div>;
});

// 2. useCallback — stabilize function props
function Parent() {
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []); // Same reference every render

  return <Child onClick={handleClick} />;
}

// 3. useMemo — stabilize object/array props
function Parent() {
  const config = useMemo(() => ({ theme: 'dark', lang: 'en' }), []);
  return <Child config={config} />;
}

// 4. Split state — keep state close to where it's used
// ❌ BAD — entire page re-renders on every keystroke
function Page() {
  const [search, setSearch] = useState('');
  return (
    <div>
      <input value={search} onChange={e => setSearch(e.target.value)} />
      <HeavyComponent />  {/* Re-renders unnecessarily */}
    </div>
  );
}

// ✅ GOOD — isolate the search input
function SearchInput() {
  const [search, setSearch] = useState('');
  return <input value={search} onChange={e => setSearch(e.target.value)} />;
}

function Page() {
  return (
    <div>
      <SearchInput />      {/* Only this re-renders */}
      <HeavyComponent />   {/* Stays untouched */}
    </div>
  );
}
```

---

## 30. What are Custom Hooks and when to use them?

Custom hooks are functions that start with `use` and let you extract reusable logic from components.

```jsx
// Custom hook — reusable fetch logic
function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(url)
      .then(res => res.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [url]);

  return { data, loading, error };
}

// Use it anywhere
function UserList() {
  const { data: users, loading, error } = useFetch('/api/users');

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error!</p>;
  return users.map(u => <p key={u.id}>{u.name}</p>);
}

// Custom hook — toggle state
function useToggle(initial = false) {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => setValue(v => !v), []);
  return [value, toggle];
}

function Sidebar() {
  const [isOpen, toggleSidebar] = useToggle(false);
  return <button onClick={toggleSidebar}>{isOpen ? 'Close' : 'Open'}</button>;
}
```

When to use: Whenever you find yourself repeating the same `useState` + `useEffect` pattern across multiple components.

---

## 31. What's the difference between Client-Side and Server-Side Rendering?

**CSR (Client-Side Rendering):**
- Browser receives empty `<div id="root">`
- Browser downloads JS, then renders
- Slower first paint (wait for JS download + execution)
- Poor SEO (crawlers see empty page)
- Immediate interactivity after JS loads
- Low server load

**SSR (Server-Side Rendering):**
- Browser receives full HTML with content
- Server builds HTML, sends it ready
- Faster first paint (HTML is ready immediately)
- Excellent SEO (crawlers see full content)
- Needs hydration (attach event handlers after load)
- Higher server load (renders on each request)

```html
<!-- CSR — browser receives: -->
<html>
  <body>
    <div id="root"></div>              <!-- Empty! -->
    <script src="bundle.js"></script>  <!-- JS does all the work -->
  </body>
</html>

<!-- SSR — browser receives: -->
<html>
  <body>
    <div id="root">
      <h1>Products</h1>               <!-- Content already here! -->
      <div>iPhone 15 - $999</div>
      <div>MacBook Pro - $1999</div>
    </div>
    <script src="bundle.js"></script>  <!-- JS adds interactivity later -->
  </body>
</html>
```

---

## 32. What is Hydration in Next.js?

Hydration is the process where React takes the server-rendered HTML and attaches event handlers and interactivity to it on the client side.

- **Server:** Renders HTML with content → Sends to browser
- **Browser:** Shows HTML immediately (fast first paint)
- **React:** Downloads JS → "Hydrates" the HTML → Attaches `onClick`, `onChange`, etc.

```jsx
// This button is visible immediately (from SSR HTML)
// But onClick doesn't work until hydration completes
function Page() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Count: {count}</h1>
      <button onClick={() => setCount(count + 1)}>
        Click me
        {/* Appears instantly but isn't clickable
            until React hydrates and attaches the onClick */}
      </button>
    </div>
  );
}
```

**Hydration mismatch:** If server-rendered HTML differs from what React generates on the client, you'll get a warning. Common causes: using `Date.now()`, `Math.random()`, or browser-only APIs during render.

---

## 33. What's the difference between getStaticProps and getServerSideProps?

**`getStaticProps` (SSG):**
- Runs at build time (once)
- Fastest — pre-built HTML served from CDN
- Data can go stale until next build (use ISR to refresh periodically)
- Use for: blog posts, docs, product catalog

**`getServerSideProps` (SSR):**
- Runs on every request
- Slower — server computes on each request
- Data is always fresh
- Use for: user-specific data, real-time dashboards

```jsx
// getStaticProps — built once at build time
export async function getStaticProps() {
  const res = await fetch('https://api.example.com/posts');
  const posts = await res.json();

  return {
    props: { posts },
    revalidate: 60, // ISR: rebuild page every 60 seconds
  };
}

// getServerSideProps — runs on EVERY request
export async function getServerSideProps(context) {
  const { req } = context;
  const token = req.cookies.token;

  const res = await fetch('https://api.example.com/dashboard', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();

  return { props: { data } };
}

// Note: In Next.js 13+ App Router, these are replaced by:
// - Static: fetch() with default cache
// - Dynamic: fetch() with { cache: 'no-store' }
```

---

## 34. When to use React Query vs Redux?

**React Query:**
- For server state (API data)
- Built-in caching with auto-refetch
- Minimal boilerplate
- Best for: fetching, caching, syncing API data

**Redux:**
- For client state (UI state, app logic)
- Manual caching implementation
- More setup (slices, reducers, actions)
- Best for: forms, modals, theme, auth state, complex UI logic

```jsx
// Use React Query for server state
const { data: products } = useQuery({
  queryKey: ['products'],
  queryFn: fetchProducts,
});

// Use Redux for client state
const dispatch = useDispatch();
dispatch(toggleSidebar());
dispatch(setTheme('dark'));
dispatch(addToCart(product));

// In practice, many apps use BOTH together:
// - React Query for all API calls
// - Redux (or Context) for UI state
```

Rule of thumb: If the data comes from an API → React Query. If it's local app state → Redux or Context.

---

## 35. What's the difference between Authentication and Authorization?

**Authentication:**
- Question: "Who are you?"
- When: During login
- Example: Email + password verification
- HTTP code: `401 Unauthorized`

**Authorization:**
- Question: "What are you allowed to do?"
- When: After login, on each action
- Example: Admin can delete, user cannot
- HTTP code: `403 Forbidden`

```jsx
// Authentication — login and store token
async function login(email, password) {
  const res = await fetch('/api/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  const { token, user } = await res.json();
  localStorage.setItem('token', token);
  return user;
}

// Authorization — check role before showing content
function AdminPanel() {
  const { user } = useAuth();

  if (user.role !== 'admin') {
    return <p>Access denied. Admins only.</p>; // 403 scenario
  }

  return <div>Admin Dashboard...</div>;
}
```

---

## 36. How to make Protected Routes in React?

```jsx
// ProtectedRoute component — redirects if not logged in
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <p>Loading...</p>;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Role-based protected route
function AdminRoute({ children }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;

  return children;
}

// Usage in router
function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Home />} />

      {/* Protected — must be logged in */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />

      {/* Admin only */}
      <Route path="/admin" element={
        <AdminRoute>
          <AdminPanel />
        </AdminRoute>
      } />
    </Routes>
  );
}
```

---

## 37. What is Code Splitting?

Code splitting breaks your JavaScript bundle into smaller chunks that load on demand, instead of one massive file.

```jsx
// Without code splitting:
// bundle.js = 2MB (everything loads upfront — slow)

// With code splitting:
// main.js = 200KB (loads immediately)
// dashboard.chunk.js = 500KB (loads when user visits /dashboard)
// settings.chunk.js = 300KB (loads when user visits /settings)

// React does this with lazy()
const Dashboard = lazy(() => import('./Dashboard'));
const Settings = lazy(() => import('./Settings'));

// Webpack also supports code splitting with dynamic imports:
const handleClick = async () => {
  const { heavyFunction } = await import('./heavyModule');
  heavyFunction();
};
```

---

## 38. How to use Dynamic Import?

Dynamic import loads a module only when it's needed at runtime, not at build time.

```jsx
// 1. Dynamic import for components (with React.lazy)
const Chart = lazy(() => import('./Chart'));

function Dashboard() {
  const [showChart, setShowChart] = useState(false);

  return (
    <div>
      <button onClick={() => setShowChart(true)}>Show Chart</button>
      {showChart && (
        <Suspense fallback={<p>Loading chart...</p>}>
          <Chart />  {/* Chart code downloads only when button is clicked */}
        </Suspense>
      )}
    </div>
  );
}

// 2. Dynamic import for libraries
async function generatePDF() {
  const { jsPDF } = await import('jspdf'); // Only loads when needed
  const doc = new jsPDF();
  doc.text('Hello!', 10, 10);
  doc.save('file.pdf');
}

// 3. Dynamic import for conditional features
async function shareContent(text) {
  if (navigator.share) {
    await navigator.share({ text });
  } else {
    const { copyToClipboard } = await import('./clipboard');
    copyToClipboard(text);
  }
}
```

---

## 39. What's the difference between Debounce and Throttle?

**Debounce:**
- Waits until user stops doing something, then fires once
- Use case: search input, form validation
- Analogy: Elevator waits until no one enters for 3s, then moves

**Throttle:**
- Runs at most once every X milliseconds
- Use case: scroll events, resize events, button clicks
- Analogy: Elevator goes every 30s regardless

```jsx
// Debounce — waits 300ms after user stops typing
function SearchInput() {
  const [query, setQuery] = useState('');

  const debouncedSearch = useMemo(
    () => debounce((value) => {
      fetch(`/api/search?q=${value}`);
    }, 300),
    []
  );

  const handleChange = (e) => {
    setQuery(e.target.value);
    debouncedSearch(e.target.value);
  };

  return <input value={query} onChange={handleChange} />;
}

// Simple debounce implementation
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// Simple throttle implementation
function throttle(fn, limit) {
  let inThrottle = false;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Throttle — run at most once per 200ms during scroll
useEffect(() => {
  const handleScroll = throttle(() => {
    console.log('Scroll position:', window.scrollY);
  }, 200);

  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, []);
```

---

## 40. What is Memoization?

Memoization is a technique that caches the result of a function call. If the same inputs are given again, it returns the cached result instead of recalculating.

```jsx
// Without memoization — recalculates every render
function Component({ items }) {
  const total = items.reduce((sum, i) => sum + i.price, 0); // Runs every render
}

// With memoization — only recalculates when items changes
function Component({ items }) {
  const total = useMemo(() => {
    return items.reduce((sum, i) => sum + i.price, 0);
  }, [items]);
}

// Custom memoization function
function memoize(fn) {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

const expensiveCalc = memoize((n) => {
  console.log('Calculating...');
  return n * n;
});

expensiveCalc(5); // Calculating... → 25
expensiveCalc(5); // → 25 (from cache, no log)
```

---

## 41. How to reduce Bundle Size?

```jsx
// 1. Code splitting with lazy loading
const HeavyPage = lazy(() => import('./HeavyPage'));

// 2. Tree shaking — import only what you need
// ❌ BAD — imports entire lodash (70KB+)
import _ from 'lodash';
_.debounce(...);

// ✅ GOOD — imports only debounce (~1KB)
import debounce from 'lodash/debounce';

// 3. Analyze your bundle
// npx webpack-bundle-analyzer
// npx source-map-explorer build/static/js/*.js

// 4. Replace heavy libraries with lighter alternatives
// moment.js (300KB) → date-fns (tree-shakable) or dayjs (2KB)
// lodash (70KB)     → lodash-es (tree-shakable) or native JS

// 5. Dynamic imports for rarely used features
const handleExport = async () => {
  const XLSX = await import('xlsx'); // Only load when user clicks Export
};

// 6. Optimize images — use next/image or WebP format
// 7. Enable gzip/brotli compression on server
// 8. Use production builds: npm run build
```

---

## 42. What tools do you use for Performance Analysis?

- **React DevTools Profiler** — Shows which components re-render and why
- **Chrome Lighthouse** — Measures performance, SEO, accessibility scores
- **Chrome DevTools → Performance** — Records CPU/memory usage, flame charts
- **Chrome DevTools → Network** — Shows all requests, sizes, loading times
- **Webpack Bundle Analyzer** — Visualizes what's in your JS bundle
- **source-map-explorer** — Shows which packages take up space
- **Web Vitals (CLS, LCP, FID)** — Core metrics Google uses for ranking
- **why-did-you-render** — Logs unnecessary re-renders in development

```js
// Measure Web Vitals in React
import { getCLS, getFID, getLCP } from 'web-vitals';

getCLS(console.log);  // Cumulative Layout Shift
getFID(console.log);  // First Input Delay
getLCP(console.log);  // Largest Contentful Paint
```

---

## 43. What's the difference between CSR vs SSR in Performance?

**CSR:**
- First Contentful Paint (FCP): Slow — wait for JS to download and execute
- Time to Interactive (TTI): Same time as FCP
- Subsequent navigation: Fast — no server round-trip
- Server cost: Low
- SEO: Poor

**SSR:**
- First Contentful Paint (FCP): Fast — HTML is ready immediately
- Time to Interactive (TTI): Delayed — needs hydration after HTML loads
- Subsequent navigation: Slower — new request each time
- Server cost: Higher — renders on each request
- SEO: Excellent

```
CSR Timeline:
[Download HTML] → [Download JS] → [Execute JS] → [Render] → [Interactive]
                                                  ↑ User sees content HERE

SSR Timeline:
[Server renders HTML] → [Send to browser] → [User sees content HERE]
                         → [Download JS] → [Hydrate] → [Interactive]
```

Best approach: Use SSR for the initial page load (fast FCP + SEO), then switch to CSR for navigation (fast transitions). This is what Next.js does by default.

---

## 44. How to improve Loading Time?

```jsx
// 1. Lazy load routes
const Dashboard = lazy(() => import('./Dashboard'));

// 2. Lazy load images
<img loading="lazy" src="photo.jpg" alt="..." />

// 3. Use smaller image formats (WebP, AVIF)
<picture>
  <source srcSet="photo.avif" type="image/avif" />
  <source srcSet="photo.webp" type="image/webp" />
  <img src="photo.jpg" alt="..." />
</picture>

// 4. Preload critical resources
<link rel="preload" href="/fonts/main.woff2" as="font" crossOrigin />

// 5. Minimize JavaScript — remove unused code
// 6. Enable compression (gzip/brotli)
// 7. Use a CDN for static assets
// 8. Cache API responses (React Query, SWR)
// 9. Virtualize long lists (react-window)
// 10. Avoid blocking the main thread — use Web Workers for heavy computation
```

---

## 45. What is Tree Shaking?

Tree shaking is a build optimization that removes unused code from the final bundle. The bundler (Webpack, Vite) analyzes which exports are actually imported and drops the rest.

```js
// math.js
export function add(a, b)      { return a + b; }
export function subtract(a, b) { return a - b; }
export function multiply(a, b) { return a * b; }
export function divide(a, b)   { return a / b; }

// app.js — only imports add
import { add } from './math';
console.log(add(2, 3));

// After tree shaking: subtract, multiply, divide are REMOVED from bundle.
// Only add() is included.

// ❌ Tree shaking DOESN'T work with CommonJS:
const math = require('./math'); // Can't be statically analyzed

// ✅ Tree shaking WORKS with ES Modules:
import { add } from './math';   // Statically analyzable
```

For tree shaking to work:
- Use ES Modules (`import`/`export`), not `require`
- Use named imports, not default imports
- Set `"sideEffects": false` in `package.json`
- Use production build (`npm run build`)

---

## 46. What is XSS and how to prevent it in React?

XSS (Cross-Site Scripting) is an attack where malicious JavaScript is injected into a website. When other users visit, the script runs in their browser and can steal data, tokens, or cookies.

```jsx
// React automatically escapes content — safe by default
function Comment({ text }) {
  return <p>{text}</p>;
  // If text = "<script>alert('hacked')</script>"
  // React renders it as TEXT, not HTML. Safe! ✅
}

// ❌ DANGER — dangerouslySetInnerHTML bypasses React's protection
function Comment({ html }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
  // If html contains <script>...</script>, it WILL execute! ❌
}

// ✅ If you MUST render HTML, sanitize it first
import DOMPurify from 'dompurify';

function Comment({ html }) {
  const clean = DOMPurify.sanitize(html);
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}
```

Prevention techniques:
- Never put user input in `dangerouslySetInnerHTML`
- Validate and sanitize all user input on the backend
- Use Content-Security-Policy headers
- Use `HttpOnly` cookies (JS can't access them)
- Encode user input before displaying

---

## 47. What's the difference between Cookies and localStorage?

**Cookies:**
- Size: ~4KB
- Sent to server: Yes (on every HTTP request)
- Expiry: Can set an expiration date
- JS access: Yes (unless `HttpOnly` flag is set)
- Security: `HttpOnly` + `Secure` + `SameSite` flags available
- Best for: Auth tokens, session IDs

**localStorage:**
- Size: ~5-10MB
- Sent to server: No (client-side only)
- Expiry: No expiry — persists forever until cleared
- JS access: Always
- Security: No built-in security flags
- Best for: User preferences, cached data

```js
// Cookies
document.cookie = "theme=dark; max-age=86400; path=/";

// Secure cookie (set by server, JS can't read it)
// Set-Cookie: token=abc123; HttpOnly; Secure; SameSite=Strict

// localStorage
localStorage.setItem('theme', 'dark');
const theme = localStorage.getItem('theme');
localStorage.removeItem('theme');

// sessionStorage (same API, but clears when tab closes)
sessionStorage.setItem('temp', 'data');
```

---

## 48. How to Secure Tokens?

```js
// 1. Store tokens in HttpOnly cookies (best option)
// Server sets this — JavaScript CANNOT access it
// Set-Cookie: token=abc123; HttpOnly; Secure; SameSite=Strict; Path=/

// 2. If you MUST use localStorage:
// - Set short expiry on tokens (15 min for access token)
// - Use refresh tokens to get new access tokens
// - Clear tokens on logout

function logout() {
  localStorage.removeItem('token');
  window.location.href = '/login';
}

// 3. Always use HTTPS (never send tokens over HTTP)
// 4. Validate tokens on every API request (server-side)
// 5. Use short-lived access tokens + long-lived refresh tokens

// Token refresh pattern:
async function fetchWithAuth(url, options = {}) {
  let token = localStorage.getItem('accessToken');

  let res = await fetch(url, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) {
    // Access token expired — try refresh
    const refreshRes = await fetch('/api/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: localStorage.getItem('refreshToken') }),
    });

    if (refreshRes.ok) {
      const { accessToken } = await refreshRes.json();
      localStorage.setItem('accessToken', accessToken);

      // Retry original request with new token
      res = await fetch(url, {
        ...options,
        headers: { ...options.headers, Authorization: `Bearer ${accessToken}` },
      });
    } else {
      logout(); // Refresh token also expired — force logout
    }
  }

  return res;
}
```

---

## 49. Why not use localStorage in some cases?

`localStorage` is **not** safe for sensitive data like auth tokens.

**Problem 1 — XSS Attack:**
- If an attacker injects JavaScript into your site (XSS)
- They can run: `localStorage.getItem('token')`
- They now have your user's auth token

**Problem 2 — No Expiry:**
- localStorage data stays forever until manually removed
- Even after the session should have ended

**Problem 3 — Shared Across Tabs:**
- All tabs on the same domain share localStorage
- If one tab is compromised, all tabs are affected

**Problem 4 — No HttpOnly Protection:**
- Unlike cookies, localStorage has NO way to prevent JS access
- Any script running on the page can read everything

```js
// ❌ Don't store sensitive data in localStorage
localStorage.setItem('authToken', token);      // Vulnerable to XSS
localStorage.setItem('creditCard', '1234...'); // Never store sensitive data

// ✅ Use HttpOnly cookies instead (for auth)
// Set-Cookie: authToken=...; HttpOnly; Secure; SameSite=Strict

// ✅ localStorage IS fine for non-sensitive data:
localStorage.setItem('theme', 'dark');          // Safe
localStorage.setItem('language', 'en');         // Safe
localStorage.setItem('recentSearches', '...');  // Safe
```

Where to store what:
- **HttpOnly Cookie** → Auth tokens, session IDs
- **localStorage** → Theme, language, UI preferences
- **sessionStorage** → Temporary data (form drafts, wizard state)
- **React State** → Current page data, UI state

---

## Quick Reference

- **1** SSG/SSR/SPA/SSL — Rendering strategies + encryption
- **2** Promise — Object representing future async result
- **3** Sync vs Async — Blocking vs non-blocking execution
- **4** React Helmet — Manage `<head>` tags from React
- **5** CSS Patterns — Modules, BEM, Tailwind, Styled Components
- **6** Redux vs Context — Complex state vs simple shared state
- **7** lazy() — Load components on demand
- **8** Performance — Memo, lazy load, virtualize, avoid inline objects
- **9** var/let/const — Function scope vs block scope vs constant
- **10** Event Loop — How JS handles async in a single thread
- **11** Formik & Yup — Form handling + schema validation
- **12** SEO — SSR, meta tags, semantic HTML, sitemaps
- **13** Callback vs Promise — Nested functions vs chainable objects
- **14** async/await — Cleaner syntax for promises
- **15** React Query — Server state management with caching
- **16** Next.js vs Helmet SEO — Server-rendered vs client-injected meta tags
- **17** Next.js — React framework with SSR, routing, API routes
- **18** SOLID — Five principles for clean code design
- **19** DOM vs BOM — Page content tree vs browser window API
- **20** useMemo — Cache expensive calculations
- **21** Controlled/Uncontrolled — React state vs DOM manages input
- **22** Lifting State Up — Move shared state to common parent
- **23** useEffect vs useLayoutEffect — After paint vs before paint
- **24** useRef vs State — No re-render vs triggers re-render
- **25** memo/useMemo/useCallback — Memoize component/value/function
- **26** Virtual DOM — JS copy of DOM for efficient updates
- **27** key in lists — Unique identifier for list item tracking
- **28** Re-render — Component function re-executes
- **29** Prevent Re-renders — memo, useCallback, split state
- **30** Custom Hooks — Reusable logic extracted into `use*` functions
- **31** CSR vs SSR — Client builds page vs server builds page
- **32** Hydration — Attaching interactivity to server-rendered HTML
- **33** getStaticProps vs getServerSideProps — Build time vs request time
- **34** React Query vs Redux — Server state vs client state
- **35** Auth vs Authz — Identity verification vs permission checking
- **36** Protected Routes — Redirect unauthorized users
- **37** Code Splitting — Break bundle into smaller chunks
- **38** Dynamic Import — Load modules at runtime
- **39** Debounce vs Throttle — Wait until stop vs run every X ms
- **40** Memoization — Cache function results
- **41** Reduce Bundle — Tree shake, lazy load, replace heavy libs
- **42** Performance Tools — Lighthouse, Profiler, Bundle Analyzer
- **43** CSR vs SSR Performance — Fast navigation vs fast first paint
- **44** Loading Time — Lazy load, compress, CDN, cache
- **45** Tree Shaking — Remove unused code from bundle
- **46** XSS — Script injection — React escapes by default
- **47** Cookies vs localStorage — Auto-sent to server vs client-only
- **48** Secure Tokens — HttpOnly cookies, short expiry, refresh tokens
- **49** Why Not localStorage — XSS vulnerable, no HttpOnly, no expiry
