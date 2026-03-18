# Real-Time Chat with Laravel Reverb

Build a live group chat for Tripz trip conversations — private channels, presence channels, typing indicators via whispers, read receipts, and feature tests using `Event::fake()`.

| Topic              | Details                                                       |
|--------------------|---------------------------------------------------------------|
| Broadcasting       | ShouldBroadcast, broadcastOn, broadcastWith, broadcastAs      |
| Channel Auth       | Private + presence channels in routes/channels.php            |
| Typing & Presence  | Whispers (client-only), presence join/leave, read receipts    |

## Rules

- **25 minutes** total for 2 problems
- Write Laravel code — use framework APIs and conventions
- Assume a standard Laravel 11 project structure
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Core Chat: Events, Channels & Echo (Medium)

### Scenario

Add live messaging to Tripz trip conversations. When a user sends a message, a `MessageSent` event broadcasts on a private channel. Other participants receive it via Echo.js without polling. Channel authorization ensures only conversation participants can subscribe.

### Requirements

1. `Message` model — `conversation_id`, `user_id`, `body`, `read_at`; belongs to `Conversation` and `User`
2. `MessageSent` event — implements `ShouldBroadcast`; broadcasts on `PrivateChannel('conversation.{id}')`; `broadcastWith()` returns `id`, `body`, `user`, `sent_at`; `broadcastAs()` returns `'message.sent'`
3. `MessageController@store` — authorize, create in `DB::transaction()`, call `broadcast(...)->toOthers()`, return `201`
4. `MessageController@index` — authorize, return cursor-paginated messages with `user:id,name,avatar` eager-loaded
5. `routes/channels.php` — private channel auth: user must belong to the conversation
6. Frontend `Echo.private(...).listen('.message.sent', callback)` — note the `.` prefix required when using `broadcastAs()`
7. `broadcast(...)->toOthers()` — sender does not receive their own event (avoids double-rendering)

### Expected Code

```php
// app/Events/MessageSent.php
class MessageSent implements ShouldBroadcast
{
    use SerializesModels;

    public function __construct(public readonly Message $message) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('conversation.' . $this->message->conversation_id),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'id'      => $this->message->id,
            'body'    => $this->message->body,
            'user'    => [
                'id'   => $this->message->user->id,
                'name' => $this->message->user->name,
            ],
            'sent_at' => $this->message->created_at->toIso8601String(),
        ];
    }

    public function broadcastAs(): string
    {
        return 'message.sent'; // listen in Echo as: .listen('.message.sent', ...)
    }
}
```

```php
// app/Http/Controllers/MessageController.php
class MessageController extends Controller
{
    public function index(Conversation $conversation): AnonymousResourceCollection
    {
        $this->authorize('participate', $conversation);

        $messages = $conversation->messages()
            ->with('user:id,name,avatar')
            ->latest()
            ->cursorPaginate(30);

        return MessageResource::collection($messages);
    }

    public function store(SendMessageRequest $request, Conversation $conversation): JsonResponse
    {
        $this->authorize('participate', $conversation);

        $message = DB::transaction(function () use ($request, $conversation) {
            $message = $conversation->messages()->create([
                'user_id' => auth()->id(),
                'body'    => $request->validated('body'),
            ]);

            $conversation->touch(); // bump updated_at for inbox ordering

            return $message;
        });

        broadcast(new MessageSent($message->load('user')))->toOthers();

        return MessageResource::make($message)
            ->response()
            ->setStatusCode(201);
    }
}
```

```php
// routes/channels.php
use App\Models\{Conversation, User};

Broadcast::channel('conversation.{conversationId}', function (User $user, int $conversationId) {
    // Only participants can subscribe to private conversation channel
    return $user->conversations()->where('conversations.id', $conversationId)->exists();
});
```

```js
// resources/js/chat.js  (Echo.js client)
import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

window.Pusher = Pusher

window.Echo = new Echo({
    broadcaster:  'reverb',
    key:          import.meta.env.VITE_REVERB_APP_KEY,
    wsHost:       import.meta.env.VITE_REVERB_HOST,
    wsPort:       import.meta.env.VITE_REVERB_PORT,
    wssPort:      import.meta.env.VITE_REVERB_PORT,
    forceTLS:     false,
    enabledTransports: ['ws', 'wss'],
})

// Listen for new messages — note the . prefix (custom broadcastAs name)
Echo.private(`conversation.${conversationId}`)
    .listen('.message.sent', (e) => {
        appendMessage(e)
    })
```

### broadcastAs() Naming Rule

| `broadcastAs()` returns | Listen in Echo with           |
|-------------------------|-------------------------------|
| `null` (default)        | `.listen('MessageSent', cb)`  |
| `'message.sent'`        | `.listen('.message.sent', cb)` |

The `.` prefix tells Echo the event name is a custom string, not a class name.

### What We're Evaluating

- `ShouldBroadcast` — event is dispatched to the queue, then pushed to WebSocket
- `PrivateChannel` — requires auth before subscription (vs public `Channel`)
- `broadcastWith()` — controls the payload shape (not the full Eloquent model)
- `broadcastAs()` — custom event name; requires `.` prefix in Echo listener
- `->toOthers()` — excludes the sender from receiving their own event
- Channel auth in `routes/channels.php` — return truthy to allow, `false` to deny

---

## Problem 02 — Presence Channel, Typing & Feature Tests (Hard)

### Scenario

Add a presence channel so participants see who's currently online, add typing indicators via `whisper()` (client-to-client, no server round-trip), broadcast read receipts when messages are marked read, and test everything with `Event::fake()`.

### Requirements

1. `presence-conversation.{id}` channel in `routes/channels.php` — return `['id', 'name', 'avatar']` for joined users; `here()`, `joining()`, `leaving()` in Echo
2. `UserTyping` event — implements `ShouldBroadcastNow` (not queued — typing must be instant); `broadcastAs('user.typing')`
3. Whisper alternative: `Echo.private(...).whisper('typing', { user })` — client-to-client, no server broadcast; `.listenForWhisper('typing', callback)` to receive
4. `MarkAsReadController@update` — marks unread messages as read, broadcasts `MessagesRead` event on `private-conversation.{id}`
5. `MessagesRead` event — broadcasts `{ read_by, read_at }` so sender can show double-tick
6. Feature test: `Event::fake([MessageSent::class])`, post message, `Event::assertDispatched()` with channel name + payload assertions
7. Feature test: non-participant POST to conversation → 403

### Expected Code

```php
// routes/channels.php  (presence channel)
Broadcast::channel('presence-conversation.{conversationId}', function (User $user, int $conversationId) {
    if (!$user->conversations()->where('conversations.id', $conversationId)->exists()) {
        return false; // deny subscription
    }

    // Return user data — available in Echo .here() / .joining() callbacks
    return [
        'id'     => $user->id,
        'name'   => $user->name,
        'avatar' => $user->avatar_url,
    ];
});

// Per-user private channel (for unread badge updates)
Broadcast::channel('user.{userId}', function (User $user, int $userId) {
    return $user->id === $userId;
});
```

```php
// app/Events/MessagesRead.php
class MessagesRead implements ShouldBroadcast
{
    use SerializesModels;

    public function __construct(
        public readonly int    $conversationId,
        public readonly int    $readByUserId,
        public readonly string $readAt,
    ) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('conversation.' . $this->conversationId)];
    }

    public function broadcastWith(): array
    {
        return [
            'read_by' => $this->readByUserId,
            'read_at' => $this->readAt,
        ];
    }

    public function broadcastAs(): string { return 'messages.read'; }
}

// app/Http/Controllers/MarkAsReadController.php
class MarkAsReadController extends Controller
{
    public function update(Conversation $conversation): JsonResponse
    {
        $this->authorize('participate', $conversation);

        $conversation->messages()
            ->where('user_id', '!=', auth()->id())
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        broadcast(new MessagesRead(
            conversationId: $conversation->id,
            readByUserId:   auth()->id(),
            readAt:         now()->toIso8601String(),
        ))->toOthers();

        return response()->json(['read' => true]);
    }
}
```

```js
// Presence channel — who's online right now
Echo.join(`presence-conversation.${conversationId}`)
    .here((users)  => setOnlineUsers(users))          // called once on join with all current users
    .joining((user) => addOnlineUser(user))            // someone joined
    .leaving((user) => removeOnlineUser(user))         // someone left

// Typing indicator via whisper (client-to-client — no server event, no queue)
function onInput() {
    Echo.private(`conversation.${conversationId}`)
        .whisper('typing', { user: { id: authUser.id, name: authUser.name } })
}

Echo.private(`conversation.${conversationId}`)
    .listenForWhisper('typing', (e) => {
        showTypingBadge(e.user)
        clearTimeout(typingTimer)
        typingTimer = setTimeout(() => hideTypingBadge(e.user), 2000)
    })

// Read receipts
Echo.private(`conversation.${conversationId}`)
    .listen('.messages.read', (e) => {
        markMessagesAsRead(e.read_by, e.read_at) // show double-tick
    })
```

### ShouldBroadcast vs ShouldBroadcastNow

| Interface             | Queue? | Use when                                          |
|-----------------------|--------|---------------------------------------------------|
| `ShouldBroadcast`     | Yes    | Normal events — chat messages, notifications      |
| `ShouldBroadcastNow`  | No     | Time-sensitive — typing indicators, presence ping |

```php
// Feature tests
// tests/Feature/ChatTest.php

public function test_message_sent_event_is_dispatched_on_store(): void
{
    Event::fake([MessageSent::class]);

    $user         = User::factory()->create();
    $conversation = Conversation::factory()->hasAttached($user)->create();

    $this->actingAs($user, 'sanctum')
        ->postJson(route('api.conversations.messages.store', $conversation), [
            'body' => 'Hello everyone!',
        ])
        ->assertCreated();

    Event::assertDispatched(MessageSent::class, function (MessageSent $event) use ($conversation) {
        return $event->message->conversation_id === $conversation->id
            && $event->message->body === 'Hello everyone!';
    });
}

public function test_message_event_broadcasts_on_correct_private_channel(): void
{
    $user         = User::factory()->create();
    $conversation = Conversation::factory()->create();
    $message      = Message::factory()->for($conversation)->for($user)->make();

    $event = new MessageSent($message);

    $channels = collect($event->broadcastOn())->map->name->all();

    $this->assertEquals(
        ['private-conversation.' . $conversation->id],
        $channels
    );
}

public function test_non_participant_cannot_post_message(): void
{
    $user         = User::factory()->create();
    $conversation = Conversation::factory()->create(); // user NOT attached

    $this->actingAs($user, 'sanctum')
        ->postJson(route('api.conversations.messages.store', $conversation), [
            'body' => 'Intruder!',
        ])
        ->assertForbidden();

    Event::assertNotDispatched(MessageSent::class);
}

public function test_mark_as_read_broadcasts_messages_read_event(): void
{
    Event::fake([MessagesRead::class]);

    $sender   = User::factory()->create();
    $receiver = User::factory()->create();
    $conv     = Conversation::factory()
        ->hasAttached([$sender, $receiver])
        ->create();

    Message::factory(3)->for($conv)->for($sender)->create(['read_at' => null]);

    $this->actingAs($receiver, 'sanctum')
        ->patchJson(route('api.conversations.mark-read', $conv))
        ->assertOk();

    Event::assertDispatched(MessagesRead::class, function (MessagesRead $e) use ($conv, $receiver) {
        return $e->conversationId === $conv->id && $e->readByUserId === $receiver->id;
    });
}
```

### What We're Evaluating

- Presence channel returning user data array — powers `here()`, `joining()`, `leaving()`
- Whisper vs broadcast: whispers are client-to-client (no server event, no queue)
- `ShouldBroadcastNow` for typing indicators — skips queue for instant delivery
- `MessagesRead` event updating sender's UI with double-tick read receipt
- `Event::fake()` + `Event::assertDispatched()` with closure assertions
- `Event::assertNotDispatched()` to verify event was NOT fired on auth failure
