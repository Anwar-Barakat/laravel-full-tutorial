<?php

namespace Tests\Feature\Api\_15_Order_Export_Excel;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\Feature\Api\BaseOrderApiTest;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;

class OrderExportMultipleSheetsTest extends BaseOrderApiTest
{
    use RefreshDatabase, WithFaker;

    protected string $apiVersion = 'v15';

    public function test_authenticated_user_with_permission_can_download_multiple_sheets_excel_export()
    {
        Storage::fake('exports');
        Excel::fake();

        $user = $this->createUserWithPermission('export orders');
        $this->actingAs($user);

        $this->createOrder(['status' => 'pending']);
        $this->createOrder(['status' => 'completed']);
        $this->createOrder(['status' => 'pending']);

        $response = $this->getJson($this->getBaseUrl() . '/multi-sheet');

        $response->assertStatus(200);

        Excel::assertDownloaded('orders_multi_sheet.xlsx');
    }

    public function test_unauthenticated_user_cannot_download_multiple_sheets_excel_export()
    {
        $response = $this->getJson($this->getBaseUrl() . '/multi-sheet');

        $response->assertStatus(401);
    }
}
