# Assignment 15: Comprehensive Order Export Functionality

## Objective

This assignment consolidates various `Maatwebsite/Laravel-Excel` export functionalities for Orders into a single, comprehensive API. You will explore different export scenarios, from basic data exports to advanced features like custom queries, styling, multiple sheets, large data handling, and exporting to alternative formats (CSV, PDF).

## Key Concepts Covered

*   **`FromCollection` / `FromQuery`**: Defining the data source for your export.
*   **`WithHeadings`**: Customizing the header row.
*   **`WithMapping`**: Mapping model attributes to export rows.
*   **`WithStyles`**: Applying styles to cells, rows, or columns.
*   **`WithColumnWidths`**: Setting explicit column widths.
*   **`WithColumnFormatting`**: Formatting data within columns (e.g., currency, dates).
*   **`WithMultipleSheets`**: Exporting multiple data sets into separate sheets within one Excel file.
*   **`ShouldQueue`**: Offloading large data exports to background jobs to prevent timeouts.
*   **Exporting to CSV/PDF**: Generating exports in different file formats.

## Tasks

1.  **Export Classes (`app/Exports/Order/`)**
    *   **`OrderExportBasic.php`**: A fundamental export class implementing `FromCollection`, `WithHeadings`, and `WithMapping`. Retrieves all orders.
    *   **`OrderExportCustomQuery.php`**: Extends the basic export by accepting a `$status` parameter in its constructor to filter orders based on their status using a `where()` clause in the `collection()` method.
    *   **`OrderExportCustomizingOutput.php`**: Implements `WithStyles` to apply basic styling (e.g., bold headers) to the exported Excel file.
    *   **`Sheets/PendingOrdersSheet.php` & `Sheets/CompletedOrdersSheet.php`**: Individual sheet classes for the multiple sheet export. Each filters orders by a specific status and implements `FromCollection`, `WithHeadings`, `WithMapping`, and `WithTitle`.
    *   **`OrderExportMultipleSheets.php`**: Implements `WithMultipleSheets` to combine `PendingOrdersSheet` and `CompletedOrdersSheet` into a single Excel workbook with two tabs.
    *   **`OrderExportLargeData.php`**: Implements `FromQuery` and `ShouldQueue` for efficient export of potentially large datasets. The `query()` method returns an Eloquent query builder instance. The export will run as a background job.
    *   **`OrderExportAdvancedFeatures.php`**: Combines `WithStyles`, `WithColumnWidths`, and `WithColumnFormatting` to demonstrate fine-grained control over Excel output (e.g., custom column widths, specific number/date formats).
    *   **`OrderExportOtherFormats.php`**: A simple `FromCollection` export class used by the controller to generate CSV and PDF outputs.
    *   **`OrderExportWithEvents.php`**: Implements `WithEvents` to demonstrate applying styles or performing other actions after specific events during the export process (e.g., setting column auto-size, applying styles to specific ranges).

2.  **OrderExportController (`app/Http/Controllers/Api/_15_Order_Export_Excel/OrderExportController.php`)**
    *   This controller should contain multiple public methods, each corresponding to a specific export type.
    *   Each method should:
        *   Implement authorization using `$this->authorize('export', Order::class);`.
        *   Instantiate the appropriate `OrderExport` class.
        *   Call `Excel::download()` for immediate downloads (Excel, CSV, PDF) or `->queue()` for background large data exports.
        *   For `exportCustomQuery`, it should accept a `status` query parameter.
        *   For `exportPdf`, include a comment noting the requirement to `composer require dompdf/dompdf`.

3.  **Define API Routes (`routes/api.php`)**
    *   Add distinct API routes for each export method in the `OrderExportController`.
    *   Example routes:
        *   `/api/orders/export/basic`
        *   `/api/orders/export/custom-query?status=pending`
        *   `/api/orders/export/styled`
        *   `/api/orders/export/multi-sheet`
        *   `/api/orders/export/large` (returns a JSON response indicating job dispatch)
        *   `/api/orders/export/advanced`
        *   `/api/orders/export/with-events`
        *   `/api/orders/export/csv`
        *   `/api/orders/export/pdf`

## Verification

*   Test each API endpoint to ensure the correct export file is downloaded or the background job is dispatched.
*   Open each downloaded file (Excel, CSV, PDF) and verify:
    *   Data accuracy and completeness.
    *   Correct application of custom queries (filtering).
    *   Expected styling, column widths, and formatting.
    *   The presence and correctness of multiple sheets.
    *   For large data exports, confirm the job runs and the file is generated (check storage).
    *   Correct file format for CSV and PDF exports.