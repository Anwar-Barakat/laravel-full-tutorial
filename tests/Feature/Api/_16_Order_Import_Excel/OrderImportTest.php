<?php

namespace Tests\Feature\Api\_16_Order_Import_Excel;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BaseOrderApiTest;
use Illuminate\Http\UploadedFile;
use App\Models\Order;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;
use App\Imports\OrderImport;
use App\Models\Product;
use App\Models\User;

class OrderImportTest extends BaseOrderApiTest
{
    use RefreshDatabase, WithFaker;

    protected string $apiVersion = 'v16';

    protected function getBaseUrl(): string
    {
        return "/api/{$this->apiVersion}/orders-imports";
    }

    public function test_authenticated_user_with_permission_can_import_orders_from_excel_file()
    {
        
        $user = $this->createUserWithPermission('import orders');
        $this->actingAs($user);

        // Create dummy products for order items
        $product1 = Product::factory()->create(['id' => 1]);
        $product2 = Product::factory()->create(['id' => 2]);
        $buyer = User::factory()->create(['id' => 3, 'email' => 'buyer@example.com', 'name' => 'Test Buyer']);

        $product1Json = json_encode([['product_id' => 1, 'quantity' => 1, 'price' => 100.00]]);
        $product2Json = json_encode([['product_id' => 2, 'quantity' => 1, 'price' => 50.00]]);

        $fileContent = implode("\n", [
            'user_email,user_name,total_amount,status,shipping_address,billing_address,payment_method,order_items_json',
            "buyer@example.com,Test Buyer,150.00,pending,123 Main St,123 Main St,credit_card,\"" . str_replace('"', '""', $product1Json) . "\"",
            "buyer@example.com,Test Buyer,50.00,completed,456 Oak Ave,456 Oak Ave,paypal,\"" . str_replace('"', '""', $product2Json) . "\"",
        ]);

        $file = UploadedFile::fake()->createWithContent('orders.csv', $fileContent);

        $response = $this->postJson($this->getBaseUrl(), ['file' => $file]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Orders imported successfully.',
            ]);

        $this->assertDatabaseHas('orders', ['total_amount' => 150.00, 'user_id' => $buyer->id, 'status' => 'pending']);
        $this->assertDatabaseHas('orders', ['total_amount' => 50.00, 'user_id' => $buyer->id, 'status' => 'completed']);
    }

    public function test_authenticated_user_without_permission_cannot_import_orders()
    {
        Excel::fake();
        $this->createAuthenticatedUser(); // No 'import orders' permission

        $file = UploadedFile::fake()->create('orders.csv');

        $response = $this->postJson($this->getBaseUrl(), ['file' => $file]);

        $response->assertStatus(403);
    }

    public function test_unauthenticated_user_cannot_import_orders()
    {
        Excel::fake();
        $file = UploadedFile::fake()->create('orders.csv');

        $response = $this->postJson($this->getBaseUrl(), ['file' => $file]);

        $response->assertStatus(401);
    }

    public function test_import_fails_with_invalid_file_type()
    {
        Excel::fake();
        $user = $this->createUserWithPermission('import orders');
        $this->actingAs($user);

        $file = UploadedFile::fake()->create('document.pdf', 100, 'application/pdf');

        $response = $this->postJson($this->getBaseUrl(), ['file' => $file]);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['file']);
    }

    public function test_import_fails_with_missing_file()
    {
        Excel::fake();
        $user = $this->createUserWithPermission('import orders');
        $this->actingAs($user);

        $response = $this->postJson($this->getBaseUrl(), []);

        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['file']);
    }

    public function test_import_fails_with_invalid_data_in_file()
    {
        
        $user = $this->createUserWithPermission('import orders');
        $this->actingAs($user);

        // Create dummy products for order items
        $product1 = Product::factory()->create(['id' => 1]);
        $buyer = User::factory()->create(['id' => 3]);
        
        $product1Json = json_encode([['product_id' => 1, 'quantity' => 1, 'price' => 100.00]]);
        $fileContent = implode("\n", [
            'user_email,user_name,total_amount,status,shipping_address,billing_address,payment_method,order_items_json',
            "buyer@example.com,Test Buyer,invalid_amount,pending,123 Main St,123 Main St,credit_card,\"" . str_replace('"', '""', $product1Json) . "\"", // Invalid total_amount
        ]);

        $file = UploadedFile::fake()->createWithContent('orders_invalid_data.csv', $fileContent);

        $response = $this->postJson($this->getBaseUrl(), ['file' => $file]);

        $response->assertStatus(422);
    }
}
