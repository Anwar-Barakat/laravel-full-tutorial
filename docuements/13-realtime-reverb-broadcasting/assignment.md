# Real-Time with Broadcasting & Reverb

Build real-time features with Laravel Reverb — broadcast events, presence channels, and live notifications.

| Topic          | Details                              |
|----------------|--------------------------------------|
| Broadcasting   | Broadcast events to WebSocket        |
| Laravel Reverb | Native WebSocket server              |
| Presence Channels | Who's online, typing indicators   |

## Rules

- **25 minutes** total for 2 problems
- Write Laravel code — use framework APIs and conventions
- Assume a standard Laravel 11 project structure
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Broadcasting Booking Events (Medium)

### Scenario

Broadcast real-time booking updates to the frontend: when a booking status changes, when a new booking is created, and when a school admin is online (presence channel).

### Requirements

1. `BookingStatusChanged` event implementing `ShouldBroadcast`
2. Define channel in `broadcastOn()` — private channel per school
3. Use presence channel for admin dashboard (who's online)
4. Define channel authorization in `routes/channels.php`
5. Control payload with `broadcastWith()`
6. Use `broadcastAs()` to customize the event name on the frontend

### Expected Code

```php
// Event broadcasts to private channel
class BookingStatusChanged implements ShouldBroadcast
{
    public function broadcastOn(): array
    {
        return [new PrivateChannel("school.{$this->booking->school_id}")];
    }

    public function broadcastWith(): array
    {
        return ['booking' => BookingResource::make($this->booking)];
    }

    public function broadcastAs(): string
    {
        return 'booking.status.changed';
    }
}

// Frontend (Echo)
Echo.private('school.1')
    .listen('.booking.status.changed', (e) => {
        console.log(e.booking);
    });

// Presence channel
Echo.join('admin.dashboard')
    .here((users) => { ... })
    .joining((user) => { ... })
    .leaving((user) => { ... });
```

### What We're Evaluating

- `ShouldBroadcast` implementation
- Private and presence channels
- Channel authorization in `routes/channels.php`
- `broadcastWith()` and `broadcastAs()`

---

## Problem 02 — Advanced Broadcasting Patterns (Hard)

### Scenario

Build production-grade real-time features: queued vs immediate broadcasting, broadcasting to multiple channels, client-to-client whispers, excluding the sender, and Reverb configuration.

### Requirements

1. Use `ShouldBroadcastNow` for urgent events (skip queue, broadcast immediately)
2. Use `ShouldBroadcast` (queued) for non-urgent events — dispatch on `notifications` queue
3. `broadcast()->toOthers()` — exclude the sender when broadcasting from an action
4. Client whisper events (typing indicators) — no server round-trip needed
5. Broadcast a single event to **multiple channels** at once
6. Configure Laravel Reverb in `.env` and `config/broadcasting.php`
7. Rate limit broadcasts: skip if same event fired within 5 seconds for same booking

### Expected Code

```php
// Immediate — no queue (urgent: payment confirmed)
class PaymentConfirmed implements ShouldBroadcastNow { ... }

// Queued — async (non-urgent: activity log update)
class BookingActivityUpdated implements ShouldBroadcast
{
    public string $queue    = 'broadcasts';
    public string $afterCommit = true;  // only broadcast after DB transaction commits
}

// Broadcast to multiple channels
public function broadcastOn(): array
{
    return [
        new PrivateChannel("school.{$this->booking->school_id}"),
        new PrivateChannel("booking.{$this->booking->id}"),
        new Channel('admin.dashboard'),
    ];
}

// Exclude sender
broadcast(new BookingStatusChanged($booking))->toOthers();

// Client whisper (typing indicator — no server event needed)
// Echo.private('booking.42').whisper('typing', { user: 'Nasar' });
// Echo.private('booking.42').listenForWhisper('typing', (e) => { ... });
```

### What We're Evaluating

- `ShouldBroadcastNow` vs `ShouldBroadcast` (when to use each)
- `toOthers()` to exclude the triggering client
- Multi-channel broadcasting
- Client whispers for lightweight real-time (no server event)
- `afterCommit` to prevent broadcasting before DB is written
- Reverb `.env` configuration
