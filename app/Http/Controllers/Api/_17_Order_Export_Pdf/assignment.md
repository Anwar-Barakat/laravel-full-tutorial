# Assignment 17: Exporting Orders to PDF using Dompdf and Views

## Objective

This assignment focuses on creating a highly customizable PDF export of order data by leveraging `Maatwebsite/Laravel-Excel`'s `FromView` concern, which allows rendering a Blade view as the content of the PDF. This provides full control over the layout and styling of the PDF document using HTML and CSS.

## Key Concepts Covered

*   **`FromView` Concern**: Using a Blade view to define the content and layout of the export.
*   **Blade Templating**: Designing the PDF content using standard Laravel Blade syntax, HTML, and CSS.
*   **Dompdf Integration**: How `Maatwebsite/Laravel-Excel` uses `barryvdh/laravel-dompdf` (which in turn uses Dompdf) to convert HTML views to PDF.

## Tasks

1.  **Create View File (`resources/views/exports/orders_pdf.blade.php`)**
    *   Create a new Blade view file (e.g., `orders_pdf.blade.php`).
    *   Design the layout of your PDF using HTML and CSS. Include a table to display order information (ID, User Name, Total Amount, Status, Created At).
    *   Ensure the view receives an `$orders` variable to iterate over.

2.  **Create `OrderExportFromView` Class (`app/Exports/Order/OrderExportFromView.php`)**
    *   Create a new export class `OrderExportFromView.php`.
    *   Implement the `Maatwebsite\Excel\Concerns\FromView` concern.
    *   Implement the `view()` method, which should return a `view()` instance, passing the order data to it (e.g., `return view('exports.orders_pdf', ['orders' => Order::with('user')->get()])`).

3.  **Create `OrderExportPdfController` (`app/Http/Controllers/Api/_17_Order_Export_Pdf/OrderExportPdfController.php`)**
    *   Create a new controller named `OrderExportPdfController.php`.
    *   Implement an `exportPdfFromView()` method that:
        *   Uses `Excel::download()` to trigger the download of the PDF.
        *   Passes an instance of your `OrderExportFromView` class.
        *   Specifies `\Maatwebsite\Excel\Excel::DOMPDF` as the format.
        *   Includes authorization check (`$this->authorize('export', Order::class)`).
    *   Implement an `exportDirectPdf()` method that:
        *   Fetches order data (e.g., `Order::with('user')->get()`).
        *   Uses `Pdf::loadView('exports.orders_pdf', compact('orders'))` to generate the PDF directly from the Blade view.
        *   Uses `return $pdf->download('orders_direct_dompdf.pdf');` to trigger the download.
        *   Includes authorization check.

4.  **Define API Route (`routes/api.php`)**
    *   Add a new API route (e.g., `GET /api/orders/export/pdf-from-view`) that points to the `exportPdfFromView()` method of your `OrderExportPdfController`.

## Verification

*   Test the API endpoint.
*   Verify that a PDF file is downloaded.
*   Open the PDF and ensure the layout, data, and styling from your Blade view are correctly rendered.
*   Confirm that `dompdf` is installed (`composer require barryvdh/laravel-dompdf`).
