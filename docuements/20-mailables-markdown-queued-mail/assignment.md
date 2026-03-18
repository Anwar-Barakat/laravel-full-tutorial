# Mailable Classes & Email Templates

Build transactional emails with Mailable classes — Markdown templates, attachments, queued sending.

| Topic              | Details                          |
|--------------------|----------------------------------|
| Mailable Classes   | Build, customize, preview        |
| Markdown Templates | Branded email layouts            |
| Attachments        | PDF receipts, invoices           |

## Rules

- **25 minutes** total for 2 problems
- Write Laravel code — use framework APIs and conventions
- Assume a standard Laravel 11 project structure
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Booking Email System (Medium)

### Scenario

Build Mailable classes for booking confirmation emails with Markdown templates, PDF receipt attachments, and queued sending.

### Requirements

1. `BookingConfirmationMail` extending `Mailable` with `ShouldQueue`
2. Use `envelope()` and `content()` methods (Laravel 11 style)
3. Markdown template using `x-mail::message` components
4. Dynamic PDF attachment via `attachments()`
5. CC school admin, add tags and metadata for tracking
6. `Mail::fake()` tests to verify sending and content

### Expected Code

```php
// Send queued email
Mail::to($school->email)->queue(new BookingConfirmationMail($booking));

// Laravel 11 Mailable structure
public function envelope(): Envelope
{
    return new Envelope(
        subject: 'Booking Confirmed — ' . $this->booking->reference,
        cc:      [new Address($this->booking->school->admin_email)],
        tags:    ['booking-confirmation'],
        metadata: ['booking_id' => $this->booking->id],
    );
}

public function content(): Content
{
    return new Content(markdown: 'mail.booking.confirmed');
}

public function attachments(): array
{
    return [Attachment::fromPath(storage_path("receipts/{$this->booking->reference}.pdf"))];
}
```

### What We're Evaluating

- Mailable structure with `envelope()` + `content()` (Laravel 11)
- Markdown email template with `x-mail::message`
- PDF attachment via `attachments()`
- Queued sending
- `Mail::fake()` testing

---

## Problem 02 — Notification Preferences & Unsubscribe (Hard)

### Scenario

Build email preferences: users choose which emails they receive, with one-click unsubscribe links and preference management.

### Requirements

1. `notification_preferences` table — per-user, per-type opt-in/out
2. `HasNotificationPreferences` trait on `User` with `wantsEmail(string $type): bool`
3. Check preferences before sending inside `BookingConfirmationMail`
4. Add unsubscribe link to all email footers using `URL::signedRoute()`
5. `UnsubscribeController` — one-click unsubscribe that validates the signed URL
6. `shouldSend()` method on notifications to respect preferences
7. Preference management endpoint: `PUT /api/notification-preferences`

### Expected Code

```php
// Check before sending
if ($user->wantsEmail('booking_confirmation')) {
    Mail::to($user)->queue(new BookingConfirmationMail($booking));
}

// Signed unsubscribe URL in email footer
$unsubscribeUrl = URL::signedRoute('unsubscribe', [
    'user' => $user->id,
    'type' => 'booking_confirmation',
]);

// One-click unsubscribe controller
public function __invoke(Request $request, User $user, string $type): void
{
    abort_unless($request->hasValidSignature(), 403);
    $user->disableEmail($type);
}

// shouldSend on Notification
public function shouldSend(object $notifiable, string $channel): bool
{
    return $notifiable->wantsEmail($this->type);
}
```

### What We're Evaluating

- `notification_preferences` schema and trait
- `shouldSend()` on notifications
- `URL::signedRoute()` for tamper-proof unsubscribe links
- `hasValidSignature()` verification
- Preference management API endpoint
