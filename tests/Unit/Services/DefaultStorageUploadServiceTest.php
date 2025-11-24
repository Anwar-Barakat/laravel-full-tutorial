<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\Media\DefaultStorageUploadService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Foundation\Testing\RefreshDatabase;

class DefaultStorageUploadServiceTest extends TestCase
{
    use RefreshDatabase;

    protected DefaultStorageUploadService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new DefaultStorageUploadService();
        Storage::fake('public'); // Fake the public disk
    }

    public function test_it_can_upload_a_file_to_default_storage()
    {
        $file = UploadedFile::fake()->image('avatar.jpg', 100, 100);
        $directory = 'test_uploads';
        $disk = 'public';

        $path = $this->service->upload($file, $directory, $disk);

        $this->assertIsString($path);
        Storage::disk($disk)->assertExists($path);
    }

    public function test_it_can_delete_a_file_from_default_storage()
    {
        $file = UploadedFile::fake()->image('document.pdf', 100, 100);
        $directory = 'test_documents';
        $disk = 'public';

        // Upload the file first
        $path = Storage::disk($disk)->putFile($directory, $file);
        Storage::disk($disk)->assertExists($path);

        // Now delete it using the service
        $result = $this->service->delete($path, $disk);

        $this->assertTrue($result);
        Storage::disk($disk)->assertMissing($path);
    }
}
