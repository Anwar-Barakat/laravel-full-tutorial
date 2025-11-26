<?php

namespace Tests\Feature\Api\_13_Product_Cache_RateLimit;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BasePermissionTest;

class ProductDestroyTest extends BasePermissionTest
{
    use RefreshDatabase, WithFaker;

    protected string $apiVersion = 'v13';

    public function test_authenticated_user_with_permission_can_delete_a_product()
    {
        $this->createUserWithPermission('delete products');
        $product = $this->createProduct();

        $response = $this->deleteJson($this->getBaseUrl() . '/' . $product->id);

        $response->assertStatus(204);
    }
}
