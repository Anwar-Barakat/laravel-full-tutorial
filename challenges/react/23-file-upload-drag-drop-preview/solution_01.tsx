// ============================================================
// Problem 01 — Document Upload Component
// ============================================================



// ============================================================
// types/upload.ts
//
// type UploadStatus = "idle" | "uploading" | "success" | "error"
//
// interface UploadFile:
//   id (crypto.randomUUID()), file: File, preview: string | null,
//   progress: 0-100, status: UploadStatus, error: string | null,
//   uploadedUrl: string | null
//
// interface FileUploaderProps:
//   accept: string[], maxSize: number, maxFiles: number,
//   onUpload: (file, onProgress) => Promise<{ url: string }>,
//   onAllComplete?: (urls: string[]) => void
// ============================================================



// ============================================================
// utils/formatBytes.ts
//
// formatBytes(bytes):
//   < 1024       → "N B"
//   < 1024²      → "N.N KB"
//   < 1024³      → "N.N MB"
//   else         → "N.N GB"
// ============================================================



// ============================================================
// utils/xhrUpload.ts
//
// xhrUpload(url, formData, onProgress): Promise<{ url: string }>
//   ← XMLHttpRequest because fetch has no upload progress API
//
// xhr.open("POST", url)
// xhr.setRequestHeader("X-CSRF-TOKEN", getCsrfToken())
//
// xhr.upload.addEventListener("progress", (e) => {
//   if e.lengthComputable: onProgress(Math.round(e.loaded / e.total * 100))
// })
//
// xhr.addEventListener("load", () =>
//   xhr.status 200-299 → resolve(JSON.parse(xhr.responseText))
//   else → reject(new Error(`Upload failed: ${xhr.status}`))
// )
// xhr.addEventListener("error", () => reject(new Error("Network error")))
// xhr.addEventListener("abort", () => reject(new Error("Upload aborted")))
// xhr.send(formData)
// ============================================================



// ============================================================
// hooks/useFileUploader.ts
//
// State: files: UploadFile[] = []
// isFetchingRef NOT used here — each file uploads independently
//
// validateFile(file): string | null
//   !accept.includes(file.type) → "File type not allowed. Accepted: ..."
//   file.size > maxSize         → "File too large. Max size: {formatBytes}"
//
// addFiles(newFiles):
//   remaining = maxFiles - files.length
//   toAdd = Array.from(newFiles).slice(0, remaining)
//   map each → UploadFile with:
//     preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : null
//     status = error ? "error" : "idle"
//   setFiles(prev => [...prev, ...uploadFiles])
//   auto-upload: uploadFiles.filter(f => f.status === "idle").forEach(f => uploadFile(f.id))
//
// uploadFile(id):
//   set status="uploading", error=null for that id
//   onProgress = (pct) => setFiles(prev => prev.map(f => f.id === id ? {...f, progress: pct} : f))
//   try:
//     result = await props.onUpload(file, onProgress)
//     set status="success", progress=100, uploadedUrl=result.url
//   catch:
//     set status="error", error=err.message
//
// removeFile(id):
//   find file → if preview: URL.revokeObjectURL(preview)   ← free memory
//   setFiles(prev => prev.filter(f => f.id !== id))
//
// retryFile(id): calls uploadFile(id)
//
// Cleanup useEffect:
//   return () => files.forEach(f => { if f.preview: URL.revokeObjectURL(f.preview) })
//
// return { files, addFiles, removeFile, retryFile, canAddMore: files.length < maxFiles }
// ============================================================



// ============================================================
// components/DropZone.tsx
//
// Props: isDragOver, canAddMore, accept, maxSize, maxFiles,
//        onDragOver, onDragLeave, onDrop, onFileSelect
//
// handleDragOver(e):
//   e.preventDefault()     ← REQUIRED or onDrop never fires
//   e.dataTransfer.dropEffect = "copy"
//   setIsDragOver(true)
//
// handleDragLeave(e):
//   if !e.currentTarget.contains(e.relatedTarget as Node): setIsDragOver(false)
//   ← check containment or isDragOver flickers when cursor passes over child elements
//
// handleDrop(e):
//   e.preventDefault(); setIsDragOver(false); addFiles(e.dataTransfer.files)
//
// Zone border styles:
//   isDragOver  → "border-blue-500 bg-blue-50"
//   canAddMore  → "border-gray-300 hover:border-blue-400"
//   !canAddMore → "border-gray-200 opacity-60 cursor-not-allowed"
//
// Hidden <input type="file" multiple accept={...} />
// onClick zone → inputRef.current?.click() (if canAddMore)
// ============================================================



// ============================================================
// components/FilePreview.tsx
//
// Props: { uploadFile, onRemove, onRetry }
//
// Left: 48×48 thumbnail
//   image → <img src={preview} object-cover>
//   PDF   → <PdfIcon className="text-red-500" />
//
// Middle: file.name (truncate) + formatBytes(file.size)
//   "uploading": progress bar (h-1.5 bg-blue-500 transition-all, width=progress%)
//   "error":     error text in red
//   "success":   "✓ Uploaded" in green
//
// Right: Retry button (only for upload errors, NOT validation errors)
//        Remove ✕ button (always)
//
// Retry visibility check:
//   isValidationError = error includes "type" || "large"
//   show retry only if status==="error" && !isValidationError
// ============================================================



// ============================================================
// components/FileUploader.tsx  (assembled)
//
// Hooks: useFileUploader(props) + useState isDragOver
//
// onAllComplete useEffect([files]):
//   if files.length === 0: return
//   allDone = files.every(f => status is "success" or "error")
//   if allDone && onAllComplete: call with success urls
//
// Render:
//   <DropZone /> with drag handlers
//   files.length > 0:
//     files.map(<FilePreview key={f.id} />)
//     summary: "N/total uploaded"
// ============================================================
