<?php

namespace Tests\Feature\Api\_13_Product_Cache_RateLimit;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BasePermissionTest;
use App\Models\Product;
use App\Data\Product\UpdateProductData;
use App\Models\Tag;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class ProductUpdateTest extends BasePermissionTest
{
    use RefreshDatabase, WithFaker;

    protected string $apiVersion = 'v13';

    public function test_authenticated_user_with_permission_can_update_a_product()
    {
        Storage::fake('public');
        Storage::fake('media');

        $this->createUserWithPermission('edit products');
        $product = $this->createProduct();
        $category = $this->createCategory();

        $updatedData = [
            'name' => 'Updated Product Name',
            'description' => 'Updated product description.',
            'price' => 123.45,
            'category_id' => $category->id,
        ];

        $response = $this->putJson($this->getBaseUrl() . '/' . $product->id, $updatedData);

        $response->assertStatus(200);
    }
}
