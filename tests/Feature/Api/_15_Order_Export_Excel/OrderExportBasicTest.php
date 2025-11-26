<?php

namespace Tests\Feature\Api\_15_Order_Export_Excel;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BaseOrderApiTest;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;

class OrderExportBasicTest extends BaseOrderApiTest
{
    use RefreshDatabase, WithFaker;

    protected string $apiVersion = 'v15';

    public function test_authenticated_user_with_permission_can_download_basic_excel_export()
    {
        Storage::fake('exports');
        Excel::fake();

        $user = $this->createUserWithPermission('export orders');
        $this->actingAs($user);

        $this->createOrders(5);

        $response = $this->getJson($this->getBaseUrl() . '/basic');

        $response->assertStatus(200);

        Excel::assertDownloaded('orders_basic.xlsx', function($export) {
            return $export->collection()->count() === 5;
        });
    }

    public function test_unauthenticated_user_cannot_download_basic_excel_export()
    {
        $response = $this->getJson($this->getBaseUrl() . '/basic');

        $response->assertStatus(401);
    }

    public function test_authenticated_user_without_permission_cannot_download_basic_excel_export()
    {
        $this->createAuthenticatedUser(); // User without 'export orders' permission

        $response = $this->getJson($this->getBaseUrl() . '/basic');

        $response->assertStatus(403);
    }
}
