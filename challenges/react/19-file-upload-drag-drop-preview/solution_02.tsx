// ============================================================
// Problem 02 — Camera Capture & Image Cropping
// ============================================================



// ============================================================
// utils/compressImage.ts
//
// compressImage(file, { maxWidth=1920, maxHeight=1080, quality=0.8, mimeType="image/jpeg" })
//   : Promise<File>
//
// img = new Image()
// img.src = URL.createObjectURL(file)
//
// img.onload:
//   compute scaled dimensions (preserve aspect ratio):
//     if width > maxWidth:  height = round(height * maxWidth / width);  width = maxWidth
//     if height > maxHeight:width  = round(width * maxHeight / height); height = maxHeight
//
//   canvas = document.createElement("canvas")
//   canvas.width = width; canvas.height = height
//   ctx.drawImage(img, 0, 0, width, height)
//
//   canvas.toBlob(
//     blob → resolve(new File([blob], file.name, { type: mimeType })),
//     mimeType,
//     quality
//   )
//
// img.onerror → reject(new Error("Failed to load image"))
//
// URL.createObjectURL vs FileReader.readAsDataURL:
//   createObjectURL: synchronous, tiny reference string, no memory copy
//   readAsDataURL:   async, base64 encodes entire file (~33% larger in memory)
//   → always createObjectURL for previews; revoke when done
// ============================================================



// ============================================================
// hooks/useCropModal.ts
//
// State: isCropOpen=false, imageForCrop: string | null = null
// Refs: imgRef = useRef<HTMLImageElement>(null), originalFileRef = useRef<File | null>(null)
//
// openCrop(file):
//   originalFileRef.current = file
//   imageForCrop = URL.createObjectURL(file)
//   setIsCropOpen(true)
//
// closeCrop():
//   URL.revokeObjectURL(imageForCrop!)
//   setIsCropOpen(false); setImageForCrop(null)
//
// cropAndConfirm(rect: { x, y, width, height }): Promise<File>
//   canvas = document.createElement("canvas")
//   canvas.width = rect.width; canvas.height = rect.height
//   ctx.drawImage(imgRef.current!, rect.x, rect.y, rect.width, rect.height,
//                                  0, 0, rect.width, rect.height)
//   canvas.toBlob(blob =>
//     resolve(new File([blob!], originalFile.name, { type: originalFile.type }))
//   , originalFile.type)
//   closeCrop()
//
// return { isCropOpen, imageForCrop, openCrop, closeCrop, cropAndConfirm }
// ============================================================



// ============================================================
// components/CameraCapture.tsx
//
// Props: { onCapture: (file: File) => void }
//
// inputRef = useRef<HTMLInputElement>(null)
//
// render:
//   <input
//     ref={inputRef}
//     type="file"
//     accept="image/*"
//     capture="environment"    ← rear camera on mobile; "user" for front
//     className="hidden"
//     onChange={e => {
//       file = e.target.files?.[0]
//       if file: onCapture(file)
//       e.target.value = ""    ← reset so same file can be re-captured
//     }}
//   />
//   <button onClick={() => inputRef.current?.click()}>
//     <CameraIcon /> Take Photo
//   </button>
//
// On desktop: capture attribute is ignored → normal file picker opens
// ============================================================



// ============================================================
// Clipboard paste support (in FileUploader useEffect)
//
// useEffect([addFiles]):
//   handlePaste = (e: ClipboardEvent) => {
//     items = Array.from(e.clipboardData?.items ?? [])
//     imageItem = items.find(item => item.type.startsWith("image/"))
//     if !imageItem: return
//     file = imageItem.getAsFile()
//     if file: e.preventDefault(); addFiles([file])
//   }
//   document.addEventListener("paste", handlePaste)
//   cleanup: removeEventListener
// ============================================================



// ============================================================
// utils/addFilesWithCompression.ts  (updated addFiles)
//
// addFilesWithCompression(newFiles):
//   toAdd = slice to remaining capacity
//
//   processed = await Promise.all(toAdd.map(async file => {
//     error = validateFile(file)
//     if error: return { file, error }
//
//     if file.type.startsWith("image/"):
//       try:
//         compressed = await compressImage(file, { maxWidth: 1920, quality: 0.8 })
//         return { file: compressed, error: null }
//       catch:
//         return { file, error: null }   ← fall back to original on failure
//
//     return { file, error: null }
//   }))
//
//   map processed → UploadFile[] → setFiles → auto-upload valid ones
// ============================================================



// ============================================================
// FilePreview retry logic (Problem 01 extension)
//
// retryFile(id) already exists — re-calls uploadFile(id)
//
// Show retry button only for network/server errors:
//   isValidationError = error?.includes("type") || error?.includes("large")
//   {status === "error" && !isValidationError && <button onClick={onRetry}>Retry</button>}
//
// Validation errors (wrong type, too large) cannot be fixed by retrying
// ============================================================



// ============================================================
// Key concepts
//
// XHR over fetch for upload progress:
//   xhr.upload.addEventListener("progress", e => e.loaded / e.total * 100)
//   fetch API has no equivalent — no way to track upload bytes sent
//
// URL.revokeObjectURL — must call:
//   on removeFile:         frees memory immediately when user removes
//   in useEffect cleanup:  handles unmount (file still in list)
//   forgetting = memory leak: each URL holds entire file in browser memory
//
// e.preventDefault() on dragover — why required:
//   Browser default: dragover = "not allowed to drop here"
//   preventDefault signals this zone accepts drops
//   Without it: onDrop never fires
//
// DragLeave + child elements:
//   dragLeave fires when cursor moves TO a child — causing flicker
//   Fix: e.currentTarget.contains(e.relatedTarget) check
//   Only clear isDragOver if relatedTarget is outside the zone entirely
// ============================================================
