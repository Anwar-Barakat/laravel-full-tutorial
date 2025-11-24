<?php

namespace Tests\Feature\Api\_09_Product_Spatie_Role_Permission_With_Policy;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BasePermissionTest;
use App\Models\Product;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class ProductIndexTest extends BasePermissionTest
{
    use RefreshDatabase, WithFaker;

    protected string $apiVersion = 'v9';

    public function test_authenticated_user_with_permission_can_get_all_products()
    {
        $this->createUserWithPermission('view products');
        $this->createProducts(15);

        $response = $this->getJson($this->getBaseUrl());

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'success' => true,
                'message' => 'Products retrieved successfully.',
            ])
            ->assertJsonCount(10, 'data');
    }

    public function test_authenticated_user_without_permission_cannot_get_all_products()
    {
        $this->createAuthenticatedUser(); // User without 'view products' permission

        $response = $this->getJson($this->getBaseUrl());

        $response->assertStatus(403)
            ->assertJson([
                'message' => 'This action is unauthorized.', // Policies return 'This action is unauthorized.'
            ]);
    }

    public function test_unauthenticated_user_cannot_access_products()
    {
        $this->createProducts(3);

        $response = $this->getJson($this->getBaseUrl());

        $response->assertStatus(401); // Unauthorized
    }
}
