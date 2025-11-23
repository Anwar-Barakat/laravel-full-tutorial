# Assignment 16: Importing Orders from Excel

## Objective

This assignment focuses on implementing functionality to import order data from an Excel spreadsheet. This is a common requirement for bulk data entry or synchronization. You will leverage the `maatwebsite/excel` package for this task.

## Key Concepts Covered

*   **`FromCollection` / `ToModel`**: Reading data from the Excel file into a collection or directly mapping to models.
*   **`WithHeadingRow`**: Skipping the header row during import.
*   **`WithValidation`**: Validating imported data.
*   **`SkipsUnknownSheets`**: Handling cases where not all expected sheets are present.
*   **`WithChunkReading`**: Importing large files in chunks to prevent memory issues.
*   **`ShouldQueue`**: Offloading large imports to background jobs.

## Tasks

1.  **Create `OrderImport` Class (`app/Imports/OrderImport.php`)**
    *   Create a new import class `OrderImport.php`.
    *   Implement `ToModel` to map each row to an `Order` model.
    *   Implement `WithHeadingRow` to skip the first row (headers).
    *   Implement `WithValidation` and define validation rules for the incoming data.
    *   (Optional, for large files): Implement `WithChunkReading` and `ShouldQueue`.

2.  **Create `OrderImportController` (`app/Http/Controllers/Api/_16_Order_Import_Excel/OrderImportController.php`)**
    *   Create a new controller named `OrderImportController.php`.
    *   Implement an `import()` method that:
        *   Accepts an uploaded Excel file.
        *   Instantiates the `OrderImport` class.
        *   Uses `Excel::import()` to process the file.
        *   Handles validation errors and returns appropriate responses.

3.  **Define API Route (`routes/api.php`)**
    *   Add a new API route (e.g., `POST /api/orders/import`) that points to the `import()` method of your `OrderImportController`.

## Verification

*   Create a sample Excel file with order data, including a header row.
*   Test the API endpoint by uploading the Excel file.
*   Verify that orders are correctly imported into the database.
*   Test with invalid data to ensure validation rules are applied and errors are returned.
*   (If `ShouldQueue` is implemented): Verify that the import job is processed in the background.
