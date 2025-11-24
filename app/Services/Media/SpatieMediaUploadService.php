<?php

namespace App\Services\Media;

use Spatie\MediaLibrary\HasMedia;
use Illuminate\Http\UploadedFile;

class SpatieMediaUploadService
{
    public function upload(HasMedia $model, UploadedFile|string $file, string $collectionName)
    {
        return $model->addMedia($file)->toMediaCollection($collectionName);
    }

    public function uploadFromRequest(HasMedia $model, string $requestFieldName, string $collectionName)
    {
        return $model->addMediaFromRequest($requestFieldName)->toMediaCollection($collectionName);
    }
}
