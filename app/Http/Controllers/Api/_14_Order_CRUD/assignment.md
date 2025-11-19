# Assignment 14: Action Layer with Spatie Data Objects (DTOs)

## Objective

This assignment focuses on implementing a full CRUD (Create, Read, Update, Delete) API for an "Order" resource, following the advanced "Controller + Action + DTO" architectural pattern. This will include managing associated "Order Items".

## Tasks

1.  **Database Setup:**
    *   Create `Order` and `OrderItem` models, migrations, factories, and seeders.
    *   Define relationships between `User`, `Order`, `OrderItem`, and `Product` models.
    *   The `orders` table should include fields like `user_id`, `total_amount`, `status`, `shipping_address`, `billing_address`, `payment_method`.
    *   The `order_items` table should include `order_id`, `product_id`, `quantity`, `price` (price at the time of order).

2.  **Spatie Data Transfer Objects (DTOs):**
    *   Create `OrderItemData.php` in `app/Data/` to represent individual items within an order.
    *   Create `OrderData.php` in `app/Data/` to represent an entire order. This DTO should include a collection of `OrderItemData` objects.
    *   Implement validation rules within these DTOs for incoming request data.

3.  **Laravel Actions (app/Actions/Order):**
    *   Create dedicated Action classes for each CRUD operation for Orders:
        *   `GetAllOrdersAction.php`
        *   `FindOrderAction.php`
        *   `CreateOrderAction.php`: This action will also handle the creation of associated `OrderItem`s.
        *   `UpdateOrderAction.php`: This action will handle updating order details and potentially its items.
        *   `DeleteOrderAction.php`: This action will handle deleting an order and its associated items.
    *   Each Action should encapsulate the business logic, including database interactions, and use the DTOs for input.

4.  **Order API Controller (app/Http/Controllers/Api/_15_Order_CRUD):**
    *   Create `OrderController.php`.
    *   Make the controller "ultra-thin" by delegating all business logic to the respective Actions.
    *   Utilize `ApiResponseTrait` for consistent JSON responses.
    *   Implement policy authorization (e.g., `viewAny`, `create`, `view`, `update`, `delete`) for Order and potentially OrderItem actions.

5.  **API Resources (app/Http/Resources):**
    *   Create `OrderItemResource.php` to format individual order item data for API responses.
    *   Create `OrderResource.php` to format order data, including its associated `orderItems` (using `OrderItemResource`).

6.  **Routing (routes/api.php):**
    *   Define `apiResource` routes for `orders` that map to the `OrderController` from `_15_Order_CRUD`.

## Verification

*   Test all CRUD endpoints for orders and ensure order items are correctly created, updated, retrieved, and deleted along with the parent order.
*   Confirm that validation rules from DTOs are correctly applied.
*   Verify API responses are consistent and correctly formatted using the resources.
*   Ensure authorization policies are respected.
