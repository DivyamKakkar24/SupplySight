# SupplySight – Coupon Management Feature

SupplySight is a comprehensive, modular full-stack inventory management platform tailored for multi-store businesses. Customers can interact with businesses and purchase products from them.

A new feature needs to be added that allows store managers to publish coupons for a particular store. On the StoreDetail page, there should be a new button called **"Manage Coupons"**. Clicking this button should open a new page where all coupons for that particular store are listed in a table.

## Coupons Table Columns

The table must include the following columns:

- Coupon Code
- Usage Limit
- Discount %
- Valid Till
- Status

### Field Details

- **Coupon Code** — Must be unique per store and displayed in uppercase.
- **Usage Limit** — Defines the total number of times a coupon can be used across all users.
- **Discount %** — Represents the percentage discount applied to the total amount.
- **Valid Till** — The date until which the coupon remains active. After this date, the coupon should expire.
- **Status** — Can have two values:
  - **Active** — Indicates that the coupon is currently usable.
  - **Inactive** — Means the coupon cannot be used.

> When the usage limit reaches 0 or the Valid Till date has passed, the coupon status must automatically change to **Inactive**. This must be checked on every API request for getting the ACTIVE coupons, and updated accordingly in the coupons table.

## Action Column

Additionally, there should be an **Action** column (leftmost), which contains an edit icon. Clicking this icon should allow the store manager to edit a particular coupon.

## Add / Edit Coupon Modal

The Coupons page must also include an **"Add Coupon"** button. Clicking this button should open an overlay popup modal containing a form that allows the store manager to create a new coupon. The form fields should correspond to the columns mentioned above.

For editing, the same modal form must be used — except the coupon code field, all other fields can be editable.

## Backend Requirements

Create a new API endpoint and a `coupons` table in the MySQL database to handle coupons and perform CRUD operations. The `coupons` table should also store the `storeId` associated with the coupon.

## Customer-Side: Checkout Flow

On the customer side, users should be able to apply coupons during checkout.

### Multi-Store Cart Restriction

A store manager can own multiple stores. If a customer's cart contains items from different stores:

- The **"Place Order"** button should be disabled.
- An error message should be displayed in the Order Summary section, below the Grand Total amount:

  > "Cannot add items from different stores."

### Applying a Coupon

On the Checkout page, there should be an **"Apply Coupon"** button next to the Subtotal. Clicking this button should open a popup displaying all **ACTIVE** coupons available for that particular store.

Once the customer selects a coupon code, a new API call should be made to calculate the updated total after applying the coupon discount. The updated amount must then be displayed in the UI.

### Removing a Coupon

The customer must also be able to remove the applied coupon. Every time a coupon is selected or removed, the usage limit should be updated in the `coupons` table.

### Order Storage

The coupon applied to an order should also be stored in the `orders` table in the database. Add a new column named `coupon_applied` to the `orders` table, which will store the coupon ID.

---

This entire flow should be implemented end-to-end in both the backend and the UI.
