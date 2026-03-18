# File Storage & Uploads

Handle file uploads with validation, S3 storage, and image processing.

| Topic           | Details                          |
|-----------------|----------------------------------|
| Storage Facade  | Local, S3, public disk           |
| Upload Handling | Validation, naming, processing   |
| Images          | Resize, thumbnails, optimization |

## Rules

- **25 minutes** total for 2 problems
- Write Laravel code — use framework APIs and conventions
- Assume a standard Laravel 11 project structure
- Hints available but try without them first
- Timer starts immediately when you click Begin

---

## Problem 01 — Document Upload System (Medium)

### Scenario

Build a file upload system for booking documents: passport copies, permission slips, and receipts with proper validation and S3 storage.

### Requirements

1. `DocumentController` with upload and download endpoints
2. Validate uploads: `mimes:pdf,jpg,jpeg,png`, max `5MB`, max `10` files
3. Store on S3 with organized path: `bookings/{booking_id}/documents/{uuid}.{ext}`
4. Generate signed (temporary) URLs for private file access (30-min expiry)
5. `Document` model linked to `Booking` — store path, disk, mime, size
6. Delete file from S3 when `Document` model is deleted (Observer)
7. `Storage::fake('s3')` tests with `UploadedFile::fake()`

### Expected Code

```php
// Upload and store
$path = $request->file('document')
    ->storeAs("bookings/{$booking->id}/documents", Str::uuid().'.'.$ext, 's3');

// Signed URL — expires in 30 minutes
$url = Storage::disk('s3')->temporaryUrl($path, now()->addMinutes(30));

// Delete from S3 on model delete (Observer)
public function deleted(Document $document): void
{
    Storage::disk($document->disk)->delete($document->path);
}

// Test
Storage::fake('s3');
$this->postJson("/api/bookings/{$booking->id}/documents", [
    'document' => UploadedFile::fake()->create('passport.pdf', 2048),
])->assertCreated();
Storage::disk('s3')->assertExists("bookings/{$booking->id}/documents/");
```

### What We're Evaluating

- `Storage` facade for file operations
- S3 path organization
- Temporary signed URLs
- `Document` model linked to parent
- Observer deleting file on model delete
- `Storage::fake()` testing

---

## Problem 02 — Advanced File Storage Patterns (Hard)

### Scenario

Build production-grade file handling: background image processing, file deduplication using content hash, chunked uploads for large files, and virus scanning integration.

### Requirements

1. `ProcessUploadedImageJob` — queued job that generates thumbnails after upload (don't block the request)
2. File deduplication: compute `sha256` hash of file content, skip S3 upload if hash already exists — return existing path
3. `documents` table stores `hash` column — unique index prevents duplicate storage
4. Chunked upload support: accept `X-Chunk-Index` and `X-Total-Chunks` headers, reassemble on final chunk
5. Scan uploaded files for malware: `VirusScanService` wrapping ClamAV (mock in tests)
6. Multi-disk strategy: store originals on `s3`, thumbnails on `s3-thumbnails` (separate bucket)
7. Signed URL caching: cache the temporary URL in Redis for 25 minutes (avoid regenerating on every request)

### Expected Code

```php
// Queued image processing — non-blocking
ProcessUploadedImageJob::dispatch($document)->onQueue('uploads');

// Deduplication via hash
$hash = hash('sha256', $request->file('document')->get());
$existing = Document::where('hash', $hash)->first();
if ($existing) return $existing; // skip re-upload, return existing record

// Chunked upload
if ($request->header('X-Chunk-Index') < $request->header('X-Total-Chunks') - 1) {
    Storage::disk('local')->put("chunks/{$uploadId}/{$chunkIndex}", $request->getContent());
    return response()->json(['status' => 'chunk_received']);
}
// Final chunk → merge → upload to S3

// Cached signed URL
$url = Cache::remember("doc:url:{$document->id}", 1500, fn() =>
    Storage::disk('s3')->temporaryUrl($document->path, now()->addMinutes(30))
);
```

### What We're Evaluating

- Queued image processing (non-blocking uploads)
- File deduplication with `sha256` hash
- Chunked upload reassembly
- `VirusScanService` abstraction (testable via mock)
- Multi-disk (originals vs thumbnails)
- Signed URL caching to avoid repeated S3 calls
