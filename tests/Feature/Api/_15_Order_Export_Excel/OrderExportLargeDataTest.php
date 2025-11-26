<?php

namespace Tests\Feature\Api\_15_Order_Export_Excel;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BaseOrderApiTest;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Facades\Queue;

class OrderExportLargeDataTest extends BaseOrderApiTest
{
    use RefreshDatabase, WithFaker;

    protected string $apiVersion = 'v15';

    public function test_authenticated_user_with_permission_can_dispatch_large_data_export_job()
    {
        Queue::fake(); // Ensure no jobs are actually pushed to the queue
        Excel::fake(); // Ensure no real export happens

        $user = $this->createUserWithPermission('export orders');
        $this->actingAs($user);

        $this->createOrders(10); // Create some data for the export

        $response = $this->getJson($this->getBaseUrl() . '/large');

        $response->assertStatus(202) // Accepted status for background job dispatch
                 ->assertJson(['message' => 'Order export started in the background. You will be notified when it\'s ready.']);

        Excel::assertQueued('orders_large.xlsx');
    }

    public function test_unauthenticated_user_cannot_dispatch_large_data_export_job()
    {
        $response = $this->getJson($this->getBaseUrl() . '/large');

        $response->assertStatus(401);
    }
}
