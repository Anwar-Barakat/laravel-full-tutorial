<?php

namespace Tests\Feature\Api\_17_Order_Export_Pdf;

use Tests\Feature\Api\BasePermissionTest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use App\Models\User;
use App\Models\Order;
use Barryvdh\DomPDF\Facade\Pdf;

class OrderExportPdfTest extends BasePermissionTest
{
    use RefreshDatabase, WithFaker;

    protected string $apiVersion = 'v17';

    protected function getBaseUrl(): string
    {
        return "/api/{$this->apiVersion}/orders/export";
    }

    public function test_can_export_pdf_from_view()
    {
        // Create a user and some orders to be exported
        $user = $this->createUserWithPermission('export orders');
        Order::factory()->count(5)->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)->getJson($this->getBaseUrl() . '/pdf-from-view');

        $response->assertStatus(200);
        // Assert that the response is a PDF file
        $response->assertHeader('Content-Type', 'application/pdf');
        $response->assertHeader('Content-Disposition', 'attachment; filename=orders_from_view.pdf');
    }

    public function test_can_export_direct_dompdf()
    {
        // Create a user and some orders to be exported
        $user = $this->createUserWithPermission('export orders');
        Order::factory()->count(5)->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)->get($this->getBaseUrl() . '/direct-dompdf');

        $response->assertStatus(200);
        // Assert that the response is a PDF file
        $response->assertHeader('Content-Type', 'application/pdf');
        $response->assertHeader('Content-Disposition', 'attachment; filename=orders_direct_dompdf.pdf');
    }
}