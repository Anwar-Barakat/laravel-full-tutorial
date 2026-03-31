# REACT_TEST_23 — File Upload • Drag & Drop • Preview

**Time:** 25 minutes | **Stack:** React + TypeScript

---

## Problem 01 — Document Upload Component (Medium)

Build a file upload component for booking documents: drag-and-drop zone, file type validation, image preview, upload progress per file, and multi-file support.

---

### Part A — Types

**File:** `types/upload.ts`

```ts
type UploadStatus = "idle" | "uploading" | "success" | "error"

interface UploadFile {
  id: string                  // crypto.randomUUID() on add
  file: File
  preview: string | null      // object URL for images, null for PDFs
  progress: number            // 0–100
  status: UploadStatus
  error: string | null
  uploadedUrl: string | null  // returned from server on success
}

interface FileUploaderProps {
  accept: string[]            // e.g. ["image/jpeg", "image/png", "application/pdf"]
  maxSize: number             // bytes
  maxFiles: number
  onUpload: (file: File, onProgress: (pct: number) => void) => Promise<{ url: string }>
  onAllComplete?: (urls: string[]) => void
}
```

---

### Part B — `useFileUploader` hook

**File:** `hooks/useFileUploader.ts`

```ts
function useFileUploader(props: Pick<FileUploaderProps, "accept" | "maxSize" | "maxFiles" | "onUpload">)
```

**State:** `files: UploadFile[]` = `[]`

**`validateFile(file: File): string | null`:**
```ts
if (!props.accept.includes(file.type))
  return `File type not allowed. Accepted: ${props.accept.join(", ")}`
if (file.size > props.maxSize)
  return `File too large. Max size: ${formatBytes(props.maxSize)}`
return null
```

**`addFiles(newFiles: FileList | File[])`:**
```ts
const remaining = props.maxFiles - files.length
const toAdd = Array.from(newFiles).slice(0, remaining)

const uploadFiles: UploadFile[] = toAdd.map(file => {
  const error = validateFile(file)
  const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : null
  return {
    id: crypto.randomUUID(),
    file,
    preview,
    progress: 0,
    status: error ? "error" : "idle",
    error,
    uploadedUrl: null,
  }
})

setFiles(prev => [...prev, ...uploadFiles])

// Auto-upload valid files immediately
uploadFiles.filter(f => f.status === "idle").forEach(f => uploadFile(f.id))
```

**`uploadFile(id: string)`:**
```ts
setFiles(prev => prev.map(f => f.id === id ? { ...f, status: "uploading", error: null } : f))

const uploadFile = files.find(f => f.id === id)
if (!uploadFile) return

const onProgress = (pct: number) =>
  setFiles(prev => prev.map(f => f.id === id ? { ...f, progress: pct } : f))

try {
  const result = await props.onUpload(uploadFile.file, onProgress)
  setFiles(prev => prev.map(f =>
    f.id === id ? { ...f, status: "success", progress: 100, uploadedUrl: result.url } : f
  ))
} catch (err) {
  setFiles(prev => prev.map(f =>
    f.id === id ? { ...f, status: "error", error: (err as Error).message } : f
  ))
}
```

**`removeFile(id: string)`:**
```ts
// Revoke object URL to free memory
const file = files.find(f => f.id === id)
if (file?.preview) URL.revokeObjectURL(file.preview)
setFiles(prev => prev.filter(f => f.id !== id))
```

**`retryFile(id: string)`:** calls `uploadFile(id)` — re-runs upload for errored file.

**Cleanup** `useEffect`:
```ts
return () => files.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview) })
```

**`canAddMore`**: `files.length < props.maxFiles`

---

### Part C — Drag-and-drop zone

**File:** `components/DropZone.tsx`

```tsx
interface DropZoneProps {
  isDragOver: boolean
  canAddMore: boolean
  accept: string[]
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  onFileSelect: (files: FileList) => void
}
```

**Drag events in `FileUploader`:**
```ts
const [isDragOver, setIsDragOver] = useState(false)

const handleDragOver = (e: React.DragEvent) => {
  e.preventDefault()          // REQUIRED — without this, onDrop never fires
  e.dataTransfer.dropEffect = "copy"
  setIsDragOver(true)
}
const handleDragLeave = (e: React.DragEvent) => {
  // Only clear if leaving the zone entirely (not entering a child element)
  if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false)
}
const handleDrop = (e: React.DragEvent) => {
  e.preventDefault()
  setIsDragOver(false)
  addFiles(e.dataTransfer.files)
}
```

**Render:**
```tsx
<div
  onDragOver={handleDragOver}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}
  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
    ${isDragOver
      ? "border-blue-500 bg-blue-50"
      : canAddMore
        ? "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
        : "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"}`}
  onClick={() => canAddMore && inputRef.current?.click()}
>
  <input
    ref={inputRef}
    type="file"
    multiple
    accept={accept.join(",")}
    className="hidden"
    onChange={e => e.target.files && onFileSelect(e.target.files)}
  />
  <UploadIcon className="w-10 h-10 text-gray-400 mx-auto mb-3" />
  {isDragOver
    ? <p className="text-blue-600 font-medium">Drop files here</p>
    : canAddMore
      ? <>
          <p className="font-medium text-gray-700">Drag & drop files here</p>
          <p className="text-sm text-gray-500 mt-1">or click to browse</p>
          <p className="text-xs text-gray-400 mt-2">
            {accept.map(t => t.split("/")[1].toUpperCase()).join(", ")} · Max {formatBytes(maxSize)}
          </p>
        </>
      : <p className="text-gray-500">Maximum {maxFiles} files reached</p>
  }
</div>
```

---

### Part D — `FilePreview` component

**File:** `components/FilePreview.tsx`

```tsx
interface FilePreviewProps {
  uploadFile: UploadFile
  onRemove: () => void
  onRetry: () => void
}
```

**Render:**
```tsx
<div className="flex items-center gap-3 p-3 bg-white border rounded-lg">
  {/* Thumbnail or PDF icon */}
  <div className="flex-shrink-0 w-12 h-12 rounded overflow-hidden bg-gray-100">
    {uploadFile.preview
      ? <img src={uploadFile.preview} alt="" className="w-full h-full object-cover" />
      : <div className="w-full h-full flex items-center justify-center">
          <PdfIcon className="w-6 h-6 text-red-500" />
        </div>
    }
  </div>

  {/* File info */}
  <div className="flex-1 min-w-0">
    <p className="text-sm font-medium text-gray-900 truncate">{uploadFile.file.name}</p>
    <p className="text-xs text-gray-400">{formatBytes(uploadFile.file.size)}</p>

    {/* Progress bar */}
    {uploadFile.status === "uploading" && (
      <div className="mt-1.5 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 transition-all duration-200 rounded-full"
             style={{ width: `${uploadFile.progress}%` }} />
      </div>
    )}

    {/* Error message */}
    {uploadFile.status === "error" && (
      <p className="text-xs text-red-600 mt-0.5">{uploadFile.error}</p>
    )}

    {/* Success */}
    {uploadFile.status === "success" && (
      <p className="text-xs text-green-600 mt-0.5">✓ Uploaded</p>
    )}
  </div>

  {/* Actions */}
  <div className="flex items-center gap-1 flex-shrink-0">
    {uploadFile.status === "error" && uploadFile.error !== "File type not allowed" &&
      uploadFile.error !== `File too large. Max size: ${formatBytes(props.maxSize)}` && (
      <button onClick={onRetry} className="text-xs text-blue-600 hover:underline px-2">
        Retry
      </button>
    )}
    <button onClick={onRemove}
            className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors">
      <XIcon className="w-4 h-4" />
    </button>
  </div>
</div>
```

---

### Part E — `FileUploader` component (assembled)

**File:** `components/FileUploader.tsx`

```tsx
function FileUploader({ accept, maxSize, maxFiles, onUpload, onAllComplete }: FileUploaderProps) {
  const { files, addFiles, removeFile, retryFile, canAddMore } = useFileUploader({
    accept, maxSize, maxFiles, onUpload
  })

  // Call onAllComplete when all files have finished
  useEffect(() => {
    if (files.length === 0) return
    const allDone = files.every(f => f.status === "success" || f.status === "error")
    if (allDone && onAllComplete) {
      const urls = files.filter(f => f.status === "success").map(f => f.uploadedUrl!)
      onAllComplete(urls)
    }
  }, [files, onAllComplete])

  return (
    <div className="space-y-4">
      <DropZone
        isDragOver={isDragOver}
        canAddMore={canAddMore}
        accept={accept}
        maxSize={maxSize}
        maxFiles={maxFiles}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onFileSelect={addFiles}
      />

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map(f => (
            <FilePreview
              key={f.id}
              uploadFile={f}
              onRemove={() => removeFile(f.id)}
              onRetry={() => retryFile(f.id)}
            />
          ))}
        </div>
      )}

      {/* Summary */}
      {files.length > 0 && (
        <p className="text-xs text-gray-400 text-right">
          {files.filter(f => f.status === "success").length}/{files.length} uploaded
        </p>
      )}
    </div>
  )
}
```

---

### Part F — `formatBytes` utility

```ts
function formatBytes(bytes: number): string {
  if (bytes < 1024)         return `${bytes} B`
  if (bytes < 1024 ** 2)   return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3)   return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`
}
```

---

### Part G — XHR upload with progress

Using `XMLHttpRequest` instead of `fetch` because `fetch` does not expose upload progress:

```ts
function xhrUpload(
  url: string,
  formData: FormData,
  onProgress: (pct: number) => void
): Promise<{ url: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", url)
    xhr.setRequestHeader("X-CSRF-TOKEN", getCsrfToken())

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    })

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText))
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`))
      }
    })

    xhr.addEventListener("error", () => reject(new Error("Network error")))
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted")))

    xhr.send(formData)
  })
}
```

---

## Problem 02 — Camera Capture & Image Cropping (Hard)

Add camera capture for mobile, canvas-based cropping and compression, and clipboard paste support.

---

### Part A — Image compression with Canvas

**File:** `utils/compressImage.ts`

```ts
interface CompressOptions {
  maxWidth?: number       // default 1920
  maxHeight?: number      // default 1080
  quality?: number        // 0–1, default 0.8
  mimeType?: string       // default "image/jpeg"
}

async function compressImage(file: File, options: CompressOptions = {}): Promise<File>
```

**Implementation:**
```ts
async function compressImage(file, { maxWidth=1920, maxHeight=1080, quality=0.8, mimeType="image/jpeg" } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      // Compute scaled dimensions preserving aspect ratio
      let { width, height } = img
      if (width > maxWidth)  { height = Math.round(height * maxWidth / width);  width = maxWidth  }
      if (height > maxHeight){ width  = Math.round(width * maxHeight / height); height = maxHeight }

      const canvas = document.createElement("canvas")
      canvas.width  = width
      canvas.height = height

      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error("Canvas toBlob failed")); return }
          resolve(new File([blob], file.name, { type: mimeType }))
        },
        mimeType,
        quality
      )
    }
    img.onerror = () => reject(new Error("Failed to load image"))
    img.src = URL.createObjectURL(file)
  })
}
```

---

### Part B — `useCropModal` hook (canvas crop)

**File:** `hooks/useCropModal.ts`

```ts
interface CropRect { x: number; y: number; width: number; height: number }

function useCropModal(): {
  isCropOpen: boolean
  imageForCrop: string | null          // object URL
  openCrop: (file: File) => void
  closeCrop: () => void
  cropAndConfirm: (rect: CropRect) => Promise<File>
}
```

**`cropAndConfirm(rect)`:**
```ts
const canvas = document.createElement("canvas")
canvas.width  = rect.width
canvas.height = rect.height
const ctx = canvas.getContext("2d")!
ctx.drawImage(imgRef.current!, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height)
return new Promise(resolve =>
  canvas.toBlob(blob => resolve(new File([blob!], originalFile.name, { type: originalFile.type })), originalFile.type)
)
```

---

### Part C — Camera capture input

**File:** `components/CameraCapture.tsx`

```tsx
interface CameraCaptureProps {
  onCapture: (file: File) => void
}

function CameraCapture({ onCapture }: CameraCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      {/* Mobile camera — capture="environment" opens rear camera */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"    // "user" for front camera
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) onCapture(file)
          e.target.value = ""   // reset so same file can be re-captured
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
      >
        <CameraIcon className="w-4 h-4" />
        Take Photo
      </button>
    </>
  )
}
```

> On desktop, `capture` attribute is ignored — the normal file picker opens instead.

---

### Part D — Clipboard paste support

**In `FileUploader` component, add to `useEffect`:**

```ts
useEffect(() => {
  const handlePaste = (e: ClipboardEvent) => {
    const items = Array.from(e.clipboardData?.items ?? [])
    const imageItem = items.find(item => item.type.startsWith("image/"))
    if (!imageItem) return
    const file = imageItem.getAsFile()
    if (file) {
      e.preventDefault()
      addFiles([file])
    }
  }
  document.addEventListener("paste", handlePaste)
  return () => document.removeEventListener("paste", handlePaste)
}, [addFiles])
```

---

### Part E — Updated `addFiles` with compression

```ts
async function addFilesWithCompression(newFiles: FileList | File[]) {
  const toAdd = Array.from(newFiles).slice(0, props.maxFiles - files.length)

  const processed = await Promise.all(
    toAdd.map(async (file) => {
      const validationError = validateFile(file)
      if (validationError) return { file, error: validationError }

      // Compress images before upload
      if (file.type.startsWith("image/")) {
        try {
          const compressed = await compressImage(file, { maxWidth: 1920, quality: 0.8 })
          return { file: compressed, error: null }
        } catch {
          return { file, error: null }   // fall back to original if compression fails
        }
      }
      return { file, error: null }
    })
  )

  const uploadFiles: UploadFile[] = processed.map(({ file, error }) => ({
    id: crypto.randomUUID(),
    file,
    preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    progress: 0,
    status: error ? "error" : "idle",
    error,
    uploadedUrl: null,
  }))

  setFiles(prev => [...prev, ...uploadFiles])
  uploadFiles.filter(f => f.status === "idle").forEach(f => uploadFile(f.id))
}
```

---

### Part F — Retry failed uploads

The `retryFile(id)` function already exists from Problem 01. In `FilePreview`, show the retry button for network/server errors but hide it for validation errors (wrong type, too large) since re-uploading won't fix those:

```tsx
// Show retry only for upload failures, not validation failures
const isValidationError = uploadFile.error?.includes("type") || uploadFile.error?.includes("large")
{uploadFile.status === "error" && !isValidationError && (
  <button onClick={onRetry} className="text-xs text-blue-600 hover:underline">
    Retry
  </button>
)}
```

---

### Key concepts reference

```ts
// Why XMLHttpRequest for upload progress (not fetch):
//   fetch API has no upload progress event
//   XHR has xhr.upload.addEventListener("progress", handler)
//   The "progress" event fires multiple times during upload with loaded/total bytes

// URL.createObjectURL vs FileReader.readAsDataURL:
//   createObjectURL: synchronous, tiny URL string, references browser memory
//   readAsDataURL:   async, encodes entire file as base64 in memory (~33% larger)
//   → always use createObjectURL for previews; revoke when done

// URL.revokeObjectURL — when to call:
//   Call when removing a file from the list (frees browser memory immediately)
//   Also call in useEffect cleanup (handles component unmount)
//   Forgetting causes memory leak: each URL holds the entire file in memory

// e.preventDefault() on dragover — why required:
//   Browser default for dragover is "not allowed to drop here"
//   preventDefault signals "this element accepts drops"
//   Without it, the onDrop handler never fires

// DragLeave fires for EVERY child element entry/exit too:
//   Use e.currentTarget.contains(e.relatedTarget) to detect true zone exit
//   Without this check, isDragOver flickers when cursor passes over children
```
