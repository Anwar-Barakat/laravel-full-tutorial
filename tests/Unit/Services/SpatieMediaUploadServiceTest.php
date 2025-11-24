<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\Media\SpatieMediaUploadService;
use App\Models\Product; // Assuming Product is a HasMedia model
use Illuminate\Http\UploadedFile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\MediaLibrary\MediaCollections\Models\Media; // Import Spatie's Media class

use Illuminate\Support\Facades\Storage;

class SpatieMediaUploadServiceTest extends TestCase
{
    use RefreshDatabase;

    protected SpatieMediaUploadService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new SpatieMediaUploadService();
        Storage::fake('media'); // Fake the media disk for Spatie Media Library
        config()->set('media-library.queue_conversions_by_default', false);
    }

    public function test_it_can_upload_a_file_and_associate_with_a_model()
    {
        $product = Product::factory()->create();
        $file = UploadedFile::fake()->image('test_image.jpg', 100, 100);
        $collectionName = 'main_image';

        $media = $this->service->upload($product, $file, $collectionName);

        $this->assertInstanceOf(Media::class, $media);
        $this->assertCount(1, $product->getMedia($collectionName));
    }

    public function test_it_can_upload_a_file_from_request_and_associate_with_a_model()
    {
        $product = Product::factory()->create();
        $collectionName = 'gallery_images';

        // Simulate a request file upload correctly
        $uploadedFile = UploadedFile::fake()->image('request_image.png', 200, 200);

        // Create a new Request instance with the uploaded file
        $request = new \Illuminate\Http\Request([], [], [], [], ['test_file' => $uploadedFile]);

        // Ensure the Request instance is bound to the application container
        // This is necessary if the service uses the global request() helper or app('request')
        $this->app->instance('request', $request);

        // Use the uploadFromRequest method
        $media = $this->service->uploadFromRequest($product, 'test_file', $collectionName);

        $this->assertInstanceOf(Media::class, $media);
        $this->assertCount(1, $product->getMedia($collectionName));
    }
}
