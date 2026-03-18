# Multi-Channel Notifications

Send notifications via email, database, SMS, and broadcast — Laravel's powerful notification system.

| Topic              | Details                                   |
|--------------------|-------------------------------------------|
| Mail Notifications | Formatted emails with Markdown            |
| Database           | In-app notification center                |
| Multi-Channel      | Route to different channels per user      |

## Rules

- **25 minutes** total for 2 problems
- Write Laravel code — use framework APIs and conventions
- Assume a standard Laravel 11 project structure
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Booking Notification System (Medium)

### Scenario

Build notifications for key booking events: confirmation, cancellation, payment received. 
Each notification goes to multiple channels (email + database + optionally SMS) with different content per channel.

### Requirements

1. `BookingConfirmedNotification` extending `Notification`
2. Override `via()` to return channels per user preference
3. `toMail()` with Markdown template
4. `toArray()` for database channel
5. `toVonage()` for SMS channel (optional)
6. `toBroadcast()` for real-time push
7. Mark notifications as read: `$user->unreadNotifications->markAsRead()`
8. Use `ShouldQueue` for async sending

### Expected Code

```php
// Send notification
$booking->school->admin->notify(new BookingConfirmedNotification($booking));

// Or notify multiple users
Notification::send($parents, new BookingConfirmedNotification($booking));

// Read notifications
$user->unreadNotifications; // Collection
$user->notifications()->latest()->paginate(20);

// Mark as read
$notification->markAsRead();
```

### What We're Evaluating

- Notification class structure
- Multiple channels (`via` method)
- Channel-specific formatting
- Database notification storage
- Queued notifications

---

## Problem 02 — Custom Notification Channel & On-Demand (Hard)

### Scenario

Build a custom notification channel for WhatsApp and implement on-demand notifications (send to email/phone without a User model).

### Requirements

1. Create a `WhatsAppChannel` custom channel class
2. `WhatsAppMessage` value object for message formatting
3. Register channel and use in `via()`
4. `Notification::route()` for on-demand notifications
5. Send booking confirmation to parent emails without user accounts
6. Rate limit notifications: max 1 per booking per channel per hour
7. `NotificationSent` event listener for tracking

### Expected Code

```php
// Custom channel
class WhatsAppChannel
{
    public function send($notifiable, Notification $notification) {...}
}

// On-demand — no User model needed
Notification::route('mail', 'parent@example.com')
    ->route('vonage', '+971564614167')
    ->notify(new BookingConfirmedNotification($booking));

// Rate limiting
// Only 1 notification per booking per channel per hour
```

### What We're Evaluating

- Custom notification channel
- On-demand notifications
- Rate limiting notifications
- Notification tracking
