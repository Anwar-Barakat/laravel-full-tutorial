<?php

namespace Tests\Feature\Api\_15_Order_Export_Excel;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BaseOrderApiTest;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;

class OrderExportCustomizingOutputTest extends BaseOrderApiTest
{
    use RefreshDatabase, WithFaker;

    protected string $apiVersion = 'v15';

    public function test_authenticated_user_with_permission_can_download_styled_excel_export()
    {
        Storage::fake('exports');
        Excel::fake();

        $user = $this->createUserWithPermission('export orders');
        $this->actingAs($user);

        $this->createOrders(2);

        $response = $this->getJson($this->getBaseUrl() . '/styled');

        $response->assertStatus(200);

        Excel::assertDownloaded('orders_styled.xlsx');
    }

    public function test_unauthenticated_user_cannot_download_styled_excel_export()
    {
        $response = $this->getJson($this->getBaseUrl() . '/styled');

        $response->assertStatus(401);
    }
}
