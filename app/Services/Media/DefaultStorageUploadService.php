<?php

namespace App\Services\Media;

use Illuminate\Support\Facades\Storage;
use Illuminate\Http\UploadedFile;

class DefaultStorageUploadService
{
    public function upload(UploadedFile $file, string $directory = '', string $disk = 'public'): string
    {
        return Storage::disk($disk)->putFile($directory, $file);
    }

    public function delete(string $path, string $disk = 'public'): bool
    {
        return Storage::disk($disk)->delete($path);
    }
}
