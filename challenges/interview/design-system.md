# System Design — Q&A with Laravel Examples

A practical, interview-ready reference covering core system design concepts with real Laravel code.

---

## 1. What is System Design?

**Q: What is system design and why does it matter?**

System design is the process of planning the architecture, components, data flow, and interactions of a software system before writing code. It ensures the system is scalable, maintainable, secure, and performs well from day one — avoiding costly mistakes later.

**Q: What are the main things you define in system design?**

- Components (services, databases, caches)
- How components communicate (APIs, queues, events)
- How data flows between them
- How to handle scalability, security, and performance

**Q: Give a simple Laravel example of system components.**

```php
// A blog platform broken into clear components:

// 1. AuthController — handles login & registration
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

// 2. PostController — manages articles
Route::apiResource('/posts', PostController::class);

// 3. CommentController — handles comments on posts
Route::post('/posts/{post}/comments', [CommentController::class, 'store']);

// Each controller talks to its own Service class,
// and each Service talks to its own Model/Repository.
// This separation IS system design at the code level.
```

---

## 2. Functional vs Non-Functional Requirements

**Q: What are functional requirements?**

They define **what** the system must do — the features and actions users can perform.

**Q: What are non-functional requirements?**

They define **how** the system must behave — quality attributes like speed, security, and uptime.

**Q: Give an example for an e-commerce system.**

Functional:
- User can register and login
- User can browse products
- User can add items to cart
- User can checkout and pay

Non-Functional:
- Response time under 2 seconds for 90% of requests
- All sensitive data (payment info) must be encrypted
- System uptime of 99.9%
- Support 100,000 concurrent users

**Q: How does Laravel help with non-functional requirements?**

```php
// Performance — use caching to reduce response time
$products = Cache::remember('products:featured', 3600, function () {
    return Product::where('featured', true)->with('category')->get();
});

// Security — encrypt sensitive data
// In the User model:
protected $casts = [
    'payment_info' => 'encrypted',
];

// Rate Limiting — protect against abuse (Non-Functional)
// In RouteServiceProvider or bootstrap/app.php:
RateLimiter::for('api', function (Request $request) {
    return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
});
```

---

## 3. Scalability Concepts

**Q: What is scalability?**

Scalability is the system's ability to handle increased load (more users, more data, more requests) without degrading performance.

**Q: What are the two types of scaling?**

Vertical Scaling (Scale Up):
- What: Upgrade one server (more CPU, RAM)
- Pros: Simple, no code changes
- Cons: Has a hardware limit, single point of failure

Horizontal Scaling (Scale Out):
- What: Add more servers
- Pros: No single point of failure, nearly unlimited growth
- Cons: More complex — requires load balancing and shared session management

**Q: What must you handle in Laravel for horizontal scaling?**

```php
// Problem: sessions are stored on one server by default.
// If user hits server A then server B, session is lost.

// Solution 1: Use database sessions
// SESSION_DRIVER=database

// Solution 2: Use Redis for sessions (best for performance)
// SESSION_DRIVER=redis
// REDIS_HOST=your-redis-server

// Solution 3: Use Redis for cache too
// CACHE_DRIVER=redis

// Now any server can read the session/cache from Redis.
// This is required for horizontal scaling.
```

---

## 4. Vertical vs Horizontal Scaling

**Q: When should you use vertical scaling?**

When your app is small, traffic is low, and you want simplicity. Just upgrade the server.

**Q: When should you use horizontal scaling?**

When your app is growing, you need high availability, and one server can't handle the load.

**Q: What does horizontal scaling look like in production?**

```nginx
# Nginx load balancer config — distributes traffic across 3 Laravel servers
upstream laravel_app {
    server 192.168.1.10:8000;
    server 192.168.1.11:8000;
    server 192.168.1.12:8000;
}

server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://laravel_app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Q: What's the best approach for large systems?**

Combine both. Upgrade each server to a reasonable level (vertical), then add more servers as needed (horizontal).

---

## 5. Reliability & Availability

**Q: What's the difference between reliability and availability?**

Reliability:
- Meaning: System works correctly without errors
- Example: A payment system that never double-charges

Availability:
- Meaning: System is accessible when users need it
- Example: Website is up 99.9% of the time

A system can be available but unreliable (it's up but gives wrong results), or reliable but unavailable (works perfectly when it's up, but crashes often).

**Q: How do you measure availability?**

```
Availability = (Total Time - Downtime) / Total Time × 100

99.9%  availability = ~8.7 hours downtime per year
99.99% availability = ~52 minutes downtime per year
```

**Q: How does Laravel help build reliable systems?**

```php
// 1. Health check endpoint — for monitoring
Route::get('/health', function () {
    $checks = [
        'database' => true,
        'cache'    => true,
        'queue'    => true,
    ];

    try {
        DB::connection()->getPdo();
    } catch (\Exception $e) {
        $checks['database'] = false;
    }

    try {
        Cache::store()->get('health-check');
    } catch (\Exception $e) {
        $checks['cache'] = false;
    }

    $allHealthy = !in_array(false, $checks);

    return response()->json([
        'status' => $allHealthy ? 'healthy' : 'degraded',
        'checks' => $checks,
    ], $allHealthy ? 200 : 503);
});

// 2. Database transactions — ensure data consistency (reliability)
DB::transaction(function () use ($order) {
    $order->update(['status' => 'paid']);
    $order->items->each(fn ($item) => $item->product->decrement('stock', $item->qty));
    Payment::create(['order_id' => $order->id, 'amount' => $order->total]);
});
// If anything fails, everything rolls back. No partial data.
```

---

## 6. Fault Tolerance

**Q: What is fault tolerance?**

The ability of a system to keep working (normally or with reduced functionality) even when some parts fail.

**Q: What are the key techniques for fault tolerance?**

- **Redundancy** — duplicate critical components (multiple servers, DB replicas)
- **Failover** — automatically switch to a backup when primary fails
- **Retries** — try again if a request fails
- **Circuit Breaker** — stop calling a failing service to let it recover
- **Graceful Degradation** — serve partial functionality instead of total failure

**Q: Show a retry pattern in Laravel.**

```php
// Simple retry — Laravel has a built-in retry helper
$response = retry(3, function () {
    return Http::timeout(5)->get('https://api.payment-gateway.com/status');
}, 100); // Retry 3 times, wait 100ms between attempts

// More control with exponential backoff
$response = retry(3, function (int $attempt) {
    return Http::timeout(5)->get('https://api.payment-gateway.com/status');
}, function (int $attempt) {
    return $attempt * 200; // 200ms, 400ms, 600ms
});
```

**Q: Show a circuit breaker pattern in Laravel.**

```php
// Using cache as a simple circuit breaker
class PaymentGateway
{
    public function charge(float $amount): mixed
    {
        $failureKey = 'circuit:payment-gateway:failures';
        $failures = (int) Cache::get($failureKey, 0);

        // Circuit is OPEN — don't even try
        if ($failures >= 5) {
            throw new \Exception('Payment gateway is down. Try again later.');
        }

        try {
            $response = Http::timeout(5)->post('https://api.gateway.com/charge', [
                'amount' => $amount,
            ]);
            Cache::forget($failureKey); // Reset on success
            return $response->json();
        } catch (\Exception $e) {
            Cache::put($failureKey, $failures + 1, now()->addMinutes(5));
            throw $e;
        }
    }
}
```

---

## 7. Monolithic Architecture

**Q: What is monolithic architecture?**

All parts of the application (UI, business logic, database access) are built and deployed as a single unit.

**Q: What are the pros and cons?**

Pros:
- Simple to develop and deploy initially
- Easy debugging (everything in one place)
- Good for small teams and MVPs
- Lower infrastructure cost at start

Cons:
- Hard to scale individual parts
- One bug can crash the whole app
- Slow deployments as app grows
- Difficult to adopt new technologies

**Q: Is a standard Laravel app monolithic?**

Yes. A typical Laravel app is monolithic — routes, controllers, models, views, and jobs all live in one codebase and deploy as one unit. That's fine for most projects.

```php
// A typical monolithic Laravel app structure:
// app/
//   Http/Controllers/
//     UserController.php      ← User management
//     ProductController.php   ← Product management
//     OrderController.php     ← Order management
//     PaymentController.php   ← Payment processing
//   Models/
//     User.php
//     Product.php
//     Order.php
//   Services/
//     PaymentService.php
//     InventoryService.php

// ALL of these deploy together as ONE application.

Route::middleware('auth')->group(function () {
    Route::apiResource('users', UserController::class);
    Route::apiResource('products', ProductController::class);
    Route::apiResource('orders', OrderController::class);
    Route::post('payments/charge', [PaymentController::class, 'charge']);
});
```

---

## 8. Microservices Architecture

**Q: What are microservices?**

The application is split into small, independent services. Each service handles one business function, has its own database, and communicates with others via APIs or message queues.

**Q: What are the pros and cons?**

Pros:
- Scale each service independently
- Deploy services without affecting others
- Teams can work independently
- Use different tech per service

Cons:
- Complex infrastructure
- Network latency between services
- Debugging across services is harder
- Data consistency is more complex

**Q: When should you use microservices vs monolith?**

- Small team (1–5 devs) → Monolith
- MVP or startup → Monolith
- Large team (10+ devs) → Consider microservices
- Parts need independent scaling → Microservices
- Large monolith causing problems → Migrate gradually to microservices

**Q: How would a Laravel microservice look?**

```php
// users-service/routes/api.php — a standalone Laravel app ONLY for users
Route::get('/users/{id}', function (int $id) {
    $user = User::find($id);

    if (!$user) {
        return response()->json(['message' => 'User not found'], 404);
    }

    return response()->json([
        'id'    => $user->id,
        'name'  => $user->name,
        'email' => $user->email,
    ]);
});

// orders-service calls the users-service via HTTP:
class UserServiceClient
{
    public function getUser(int $userId): ?array
    {
        $response = Http::get("http://users-service:8001/api/users/{$userId}");

        return $response->successful() ? $response->json() : null;
    }
}
```

---

## 9. Database Indexing

**Q: What is an index?**

An index is a data structure that allows the database to find rows quickly without scanning the entire table. Like a book's index — you jump straight to the page instead of reading every page.

**Q: When should you add an index?**

- Columns used frequently in WHERE clauses
- Columns used in ORDER BY
- Columns used in JOIN conditions
- Foreign key columns

**Q: When should you NOT add an index?**

- Tables with very few rows (not worth it)
- Columns that are rarely queried
- Columns with very low uniqueness (e.g., a gender column with only M/F)
- Tables with heavy writes and few reads (indexes slow down INSERT/UPDATE)

**Q: How do you add indexes in Laravel?**

```php
// In a migration:
Schema::create('users', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->string('email')->unique();  // unique() creates an index automatically
    $table->string('phone')->index();   // simple index
    $table->timestamps();
});

// Adding an index to an existing table:
Schema::table('orders', function (Blueprint $table) {
    $table->index('user_id');                         // single column index
    $table->index(['status', 'created_at']);           // composite index
    $table->index('email', 'idx_orders_email');        // custom index name
});

// Dropping an index:
Schema::table('orders', function (Blueprint $table) {
    $table->dropIndex(['status', 'created_at']);
});
```

**Q: How do you check if a query is using the index?**

```sql
-- Use EXPLAIN to see the query plan
EXPLAIN SELECT * FROM users WHERE email = 'ahmed@example.com';

-- type: ref or type: const  → index is being used ✅
-- type: ALL                 → full table scan, no index ❌
```

---

## 10. Network Protocols (TCP/IP & HTTP)

**Q: What is TCP/IP?**

TCP/IP is the foundation of internet communication. IP handles addressing (where to send data), and TCP ensures data arrives completely and in order.

**Q: What is HTTP?**

HTTP (HyperText Transfer Protocol) is the application-layer protocol for web communication. It runs on top of TCP/IP and defines how clients (browsers, apps) communicate with servers.

**Q: What are the main HTTP methods?**

- `GET` — Read data → `Route::get(...)`
- `POST` — Create data → `Route::post(...)`
- `PUT` — Replace/update all data → `Route::put(...)`
- `PATCH` — Update partial data → `Route::patch(...)`
- `DELETE` — Delete data → `Route::delete(...)`

**Q: What are common HTTP status codes?**

- `200` OK → `response()->json($data)`
- `201` Created → `response()->json($user, 201)`
- `204` No Content → `response()->noContent()`
- `400` Bad Request → `response()->json(['error' => '...'], 400)`
- `401` Unauthorized → Returned by auth middleware
- `403` Forbidden → `abort(403)`
- `404` Not Found → `abort(404)`
- `422` Validation Error → Returned automatically by `$request->validate()`
- `429` Too Many Requests → Returned by rate limiter
- `500` Server Error → Unhandled exception

**Q: What is the difference between HTTP and HTTPS?**

HTTPS = HTTP + TLS/SSL encryption. All data between client and server is encrypted. Always use HTTPS in production.

```php
// Force HTTPS in Laravel — in AppServiceProvider:
public function boot(): void
{
    if (app()->environment('production')) {
        URL::forceScheme('https');
    }
}
```

---

## 11. Message Queues

**Q: What is a message queue?**

A message queue stores messages from producers and delivers them to consumers asynchronously. The producer and consumer don't need to be online at the same time.

**Q: Why use message queues?**

- **Decoupling** — sender doesn't need to know about the receiver
- **Reliability** — messages are stored until processed
- **Scalability** — add more workers to handle more load
- **Performance** — offload slow tasks from the main request

**Q: How does Laravel implement this?**

```php
// 1. Create a Job (the "message")
// php artisan make:job ProcessImageUpload

class ProcessImageUpload implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public Image $image) {}

    public function handle(): void
    {
        // Runs in the background, not during the HTTP request
        $this->image->resize(800, 600);
        $this->image->optimize();
        $this->image->generateThumbnail();
    }

    public int $tries = 3;

    public function backoff(): array
    {
        return [10, 30, 60]; // seconds between retries
    }
}

// 2. Dispatch the job (produce the message)
public function upload(Request $request)
{
    $image = Image::create([...]);

    ProcessImageUpload::dispatch($image); // Sent to queue

    return response()->json(['message' => 'Upload received, processing...'], 202);
}

// 3. Run the worker (consume the messages)
// php artisan queue:work redis
```

**Q: What queue drivers does Laravel support?**

- `sync` — Local development (runs immediately)
- `database` — Simple apps, no extra infrastructure
- `redis` — Production — fast, reliable
- `sqs` — AWS environments
- `rabbitmq` — Complex routing needs (via package)

---

## 12. Load Balancing

**Q: What is load balancing?**

Distributing incoming traffic across multiple servers so no single server gets overwhelmed.

**Q: What are common load balancing algorithms?**

- **Round Robin** — Sends requests to each server in order (1→2→3→1→...)
- **Least Connections** — Sends to the server with fewest active connections
- **IP Hash** — Same client IP always goes to the same server
- **Weighted Round Robin** — Servers with more power get more requests

**Q: Show a production Nginx load balancer config for Laravel.**

```nginx
upstream laravel_servers {
    # Weighted — server 1 gets twice the traffic
    server 10.0.0.1:8000 weight=2;
    server 10.0.0.2:8000 weight=1;
    server 10.0.0.3:8000 weight=1;
}

server {
    listen 80;
    server_name myapp.com;

    location / {
        proxy_pass http://laravel_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Q: What must you configure in Laravel behind a load balancer?**

```php
// In TrustProxies middleware — trust the load balancer
// so Laravel reads the real client IP

protected $proxies = '*'; // Trust all proxies (or specify IPs)

protected $headers = Request::HEADER_X_FORWARDED_FOR
                   | Request::HEADER_X_FORWARDED_HOST
                   | Request::HEADER_X_FORWARDED_PORT
                   | Request::HEADER_X_FORWARDED_PROTO;
```

---

## 13. Authentication & Authorization

**Q: What is the difference?**

Authentication:
- Question: "Who are you?"
- When: During login
- Example: Login with email + password

Authorization:
- Question: "What can you do?"
- When: After login, on every request
- Example: Admin can delete posts, regular user cannot

**Q: Show authentication in Laravel.**

```php
public function login(Request $request)
{
    $credentials = $request->validate([
        'email'    => 'required|email',
        'password' => 'required',
    ]);

    if (!Auth::attempt($credentials)) {
        return response()->json(['message' => 'Invalid credentials'], 401);
    }

    $token = $request->user()->createToken('api-token')->plainTextToken;

    return response()->json(['token' => $token]);
}

// Protected route — authentication middleware
Route::middleware('auth:sanctum')->get('/profile', function (Request $request) {
    return $request->user();
});
```

**Q: Show authorization in Laravel.**

```php
// Using Gates (simple authorization)
// In AuthServiceProvider:
Gate::define('delete-post', function (User $user, Post $post) {
    return $user->id === $post->user_id || $user->role === 'admin';
});

// In controller:
public function destroy(Post $post)
{
    Gate::authorize('delete-post', $post);
    $post->delete();
    return response()->noContent();
}

// Using Policies (organized authorization)
// php artisan make:policy PostPolicy --model=Post

class PostPolicy
{
    public function update(User $user, Post $post): bool
    {
        return $user->id === $post->user_id;
    }

    public function delete(User $user, Post $post): bool
    {
        return $user->id === $post->user_id || $user->role === 'admin';
    }
}

// In controller:
$this->authorize('update', $post);
```

---

## 14. Performance Metrics (Latency / Throughput / RPS)

**Q: What is Latency?**

The time it takes for the system to respond to a single request. Lower is better.

**Q: What is Throughput?**

The amount of work (requests, data) the system can handle in a given time. Higher is better.

**Q: What is RPS?**

Requests Per Second — how many requests a server can handle per second. A specific measure of throughput for web systems.

**Q: How do you measure and improve latency in Laravel?**

```php
// 1. Measure with middleware
class MeasureResponseTime
{
    public function handle(Request $request, Closure $next)
    {
        $start = microtime(true);

        $response = $next($request);

        $duration = round((microtime(true) - $start) * 1000, 2);

        $response->headers->set('X-Response-Time', $duration . 'ms');

        if ($duration > 2000) {
            Log::warning("Slow request: {$request->path()} took {$duration}ms");
        }

        return $response;
    }
}

// 2. Reduce latency — Eager Loading (fix N+1)
// ❌ BAD — N+1 problem (1 query + N queries for comments)
$posts = Post::all();
foreach ($posts as $post) {
    echo $post->comments->count(); // New query for each post!
}

// ✅ GOOD — Eager Loading (2 queries total)
$posts = Post::with('comments')->get();
foreach ($posts as $post) {
    echo $post->comments->count(); // Already loaded
}

// 3. Reduce latency with caching
$user = Cache::remember("user:{$id}", 600, function () use ($id) {
    return User::with('profile', 'roles')->findOrFail($id);
});
```

---

## 15. Monitoring & Logging

**Q: What is monitoring?**

Continuously collecting and analyzing data about system health — CPU usage, memory, response times, error rates.

**Q: What is logging?**

Recording events that happen in the system — errors, user actions, transactions — into files or databases for debugging and auditing.

**Q: How does Laravel handle logging?**

```php
use Illuminate\Support\Facades\Log;

// Different log levels:
Log::debug('Debugging info');
Log::info('User logged in', ['user_id' => $user->id]);
Log::warning('Slow query detected', ['query' => $sql, 'time' => $ms]);
Log::error('Payment failed', ['order_id' => $order->id, 'error' => $e->getMessage()]);
Log::critical('Database connection lost');

// Structured logging in a real controller:
public function charge(Request $request)
{
    $order = Order::findOrFail($request->order_id);

    Log::info('Payment attempt started', [
        'order_id' => $order->id,
        'amount'   => $order->total,
        'user_id'  => auth()->id(),
    ]);

    try {
        $payment = PaymentService::charge($order);

        Log::info('Payment successful', [
            'order_id'   => $order->id,
            'payment_id' => $payment->id,
        ]);

        return response()->json($payment, 201);
    } catch (\Exception $e) {
        Log::error('Payment failed', [
            'order_id' => $order->id,
            'error'    => $e->getMessage(),
            'trace'    => $e->getTraceAsString(),
        ]);

        return response()->json(['message' => 'Payment failed'], 500);
    }
}
```

**Q: What are common monitoring tools used with Laravel?**

- **Laravel Telescope** — Debug tool: queries, requests, jobs, exceptions
- **Laravel Horizon** — Redis queue monitoring dashboard
- **Prometheus + Grafana** — Metrics collection and visualization
- **Sentry / Bugsnag** — Error tracking in production
- **Datadog / New Relic** — Full application performance monitoring (APM)

---

## 16. Caching Strategies

**Q: What is caching and why is it important?**

Caching stores frequently accessed data in fast storage (like Redis) so you don't hit the database every time. It dramatically reduces latency and database load.

**Q: What are common caching strategies?**

- **Cache-Aside** — App checks cache first. If miss, query DB and store in cache.
- **Write-Through** — Every write goes to cache AND database at the same time.
- **Write-Behind** — Write to cache immediately, sync to DB later (async).
- **TTL-based** — Cache expires after a set time and refreshes on next request.

**Q: Show caching in Laravel.**

```php
// Basic Cache-Aside pattern with TTL
$products = Cache::remember('products:all', 3600, function () {
    return Product::with('category')->where('active', true)->get();
});

// Invalidate cache when data changes
public function update(Request $request, Product $product)
{
    $product->update($request->validated());

    Cache::forget('products:all');
    Cache::forget("product:{$product->id}");

    return response()->json($product);
}

// Tagged caches (Redis only) — invalidate groups at once
Cache::tags(['products'])->put("product:{$id}", $product, 3600);
Cache::tags(['products'])->flush(); // Clears ALL product caches
```

---

## 17. API Rate Limiting

**Q: What is rate limiting and why is it needed?**

Rate limiting controls how many requests a client can make in a given time. It protects against abuse, DDoS attacks, and ensures fair usage.

**Q: How does Laravel handle rate limiting?**

```php
// In bootstrap/app.php or RouteServiceProvider:
RateLimiter::for('api', function (Request $request) {
    return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
});

// Different limits for different endpoints:
RateLimiter::for('login', function (Request $request) {
    return Limit::perMinute(5)->by($request->ip()); // 5 login attempts/min
});

RateLimiter::for('uploads', function (Request $request) {
    return Limit::perMinute(10)->by($request->user()->id);
});

// Apply to routes:
Route::middleware('throttle:login')->post('/login', [AuthController::class, 'login']);
Route::middleware('throttle:uploads')->post('/upload', [UploadController::class, 'store']);

// When limit is exceeded, Laravel returns 429 Too Many Requests
```

---

## 18. Database Replication

**Q: What is database replication?**

Having multiple copies of your database. A primary (master) handles writes, and one or more replicas (slaves) handle reads. Improves read performance and provides fault tolerance.

**Q: How does Laravel support read/write splitting?**

```php
// In config/database.php:
'mysql' => [
    'read' => [
        'host' => ['replica-1.db.com', 'replica-2.db.com'],
    ],
    'write' => [
        'host' => ['primary.db.com'],
    ],
    'driver'   => 'mysql',
    'database' => 'my_app',
    'username' => env('DB_USERNAME'),
    'password' => env('DB_PASSWORD'),
],

// Laravel automatically routes:
// SELECT queries          → read replicas
// INSERT/UPDATE/DELETE    → primary

// Force write connection when needed (e.g., read-after-write):
$user = DB::connection('mysql')->table('users')
    ->useWritePdo()
    ->where('id', $id)
    ->first();
```

---

## Quick Reference

- **System Design** — Planning architecture before coding
- **Functional Requirements** — What the system does
- **Non-Functional Req.** — How well the system does it
- **Vertical Scaling** — Make one server stronger
- **Horizontal Scaling** — Add more servers
- **Reliability** — System works correctly
- **Availability** — System is accessible
- **Fault Tolerance** — System survives failures
- **Monolith** — One codebase, one deployment
- **Microservices** — Many small independent services
- **Indexing** — Speed up database queries
- **TCP/IP** — Foundation of internet communication
- **HTTP** — Web communication protocol
- **Message Queues** — Async communication between components
- **Load Balancing** — Distribute traffic across servers
- **Authentication** — Verify identity (who are you?)
- **Authorization** — Verify permissions (what can you do?)
- **Latency** — Time to respond to one request
- **Throughput / RPS** — How much work per second
- **Monitoring** — Watch system health in real-time
- **Logging** — Record events for debugging
- **Caching** — Store data in fast storage
- **Rate Limiting** — Control request frequency
- **Database Replication** — Multiple DB copies for reads/writes
