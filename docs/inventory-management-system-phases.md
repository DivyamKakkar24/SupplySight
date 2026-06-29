# Inventory Management System — Development Phases

This document tracks the phased development history of SupplySight, from initial
scaffolding through the current MySQL-backed production system.

---

## Phase 0 — Project Bootstrap

**Goal:** Stand up a minimal three-service skeleton and prove the stack works end to end.

- Initialized the monorepo with `backend/` (Node.js/Express), `frontend/` (React + Vite),
  and `ml-service/` (Python/FastAPI) as independent, separately deployable services.
- Backend wired to MongoDB via Mongoose; basic `server.js` with health-check route.
- Frontend scaffolded with Vite, Tailwind CSS, and React Router DOM.
- ML service scaffolded with FastAPI + Uvicorn, exposing a single `/health` endpoint.
- Apache 2.0 license added; baseline `README.md` and `setup.md` written.
- No auth, no real data models yet — purely infrastructure plumbing and "hello world"
  responses from each service to confirm they could talk to one another.

---

## Phase 1 — Core Domain Models & Authentication

**Goal:** Define the core entities and lock down access by role.

- Mongoose models introduced: `User`, `Store`, `Item`, `Order`, `Notification`.
- JWT-based authentication implemented (`backend/middleware/auth.js`,
  `backend/routes/auth.js`) with bcrypt password hashing.
- Explicit role selection at registration/login: **Manager** vs **Customer**.
- Protected route middleware added; frontend `AuthContext` for session state
  (token persisted to `localStorage`).
- Frontend `Login.jsx` / `Register.jsx` pages with role-aware redirects.
- Manager-only and customer-only route guards established on the frontend router.

---

## Phase 2 — Store & Inventory Management

**Goal:** Let managers create stores and track stock; let customers browse it.

- Store model extended with geolocation (lat/lng) per store; manager-to-store
  assignment relationship established.
- Item model with category, quantity, reorder threshold, and auto-generated SKU
  (pre-save hook).
- `frontend/src/pages/Stores.jsx` and `StoreDetail.jsx` built for browsing stores
  and viewing per-store inventory.
- `ManagerDashboard.jsx` introduced for inventory CRUD: add/edit items, adjust
  quantities, set reorder thresholds.
- Search and category filtering added to the inventory views.
- Seed script (`backend/seed.js`) created with 4 sample stores (Mumbai Electronics
  Hub, Delhi Fashion Boutique, Bangalore Grocery Market, Hyderabad Hardware Store)
  and ~19 items covering edge cases (out of stock, low stock, high demand).

---

## Phase 3 — Order Processing & Notifications

**Goal:** Turn inventory into a transactional system with real-time alerts.

- Order model with line items, status (`pending`, `completed`, `cancelled`), and
  atomic quantity decrement on order completion to prevent overselling.
- Customer-facing cart and checkout flow; `Orders.jsx` for order history and
  manager order oversight.
- Notification model and routes added; role-based filtering so managers see stock
  alerts and customers see order-status updates.
- Frontend `NotificationContext` with 30-second polling and `react-hot-toast`
  for immediate feedback.
- Low-stock and out-of-stock alert triggers wired to quantity changes.

---

## Phase 4 — ML-Powered Demand Forecasting

**Goal:** Move from reactive alerts to predictive reorder suggestions.

- `ml-service/api.py` built out with a 7-day sales analysis algorithm: average
  daily sales, confidence scoring, and suggested reorder quantity with a 20%
  safety buffer.
- Backend `routes/ml.js` added as the integration point between Express and
  FastAPI, including graceful fallback when the ML service is unreachable.
- `node-cron` jobs (`backend/utils/cronJobs.js`) introduced to run hourly:
  inventory threshold checks, ML forecast calls, notification generation, and
  cleanup of stale notifications.
- Store-specific forecasting so suggestions reflect each location's own sales
  velocity rather than a global average.
- Manual test endpoints added for triggering cron tasks on demand during QA.

---

## Phase 5 — Interactive Maps & Dashboard Polish

**Goal:** Make multi-store operations visually navigable.

- React Leaflet integrated for interactive store maps on both `Dashboard.jsx`
  (customer view) and `ManagerDashboard.jsx` (manager view).
- Store markers with popups showing address, inventory summary, and quick links
  into store detail pages.
- Role-specific map scoping — managers see only their assigned stores, customers
  see all active stores.
- General UI pass: Tailwind component cleanup, Lucide icon set adopted, loading/
  empty states added across list views.

---

## Phase 6 — MySQL Migration

**Goal:** Move off MongoDB onto a relational schema better suited to
multi-table order/inventory relationships and to simplify hosting.

- Designed relational schema: `users`, `stores`, `inventory`, `orders`,
  `order_items`, `order_status_history`, `notifications`, with explicit foreign
  keys in place of Mongoose `ObjectId` references.
- Replaced Mongoose models with `mysql2`-based data-access modules; rewrote all
  route handlers to use parameterized SQL queries instead of ODM calls.
- Reworked population/joins that Mongoose handled implicitly (e.g. order →
  order_items → item) into explicit SQL joins and application-level helpers.
- Migrated SKU auto-generation and reorder-threshold logic from Mongoose
  pre-save hooks into application-layer logic on insert.
- Added a "checkout" page (`frontend` order flow) aligned with the new
  `order_items` structure.
- Updated seed data and verification scripts for the MySQL schema.
- Deployed to Render with MySQL as the managed database; this is the current
  production baseline (see `README.md` for the live demo link).

---

## Phase 7 (In Progress) — Store Coupons

**Goal:** Let managers issue store-specific discount coupons that customers can
apply at checkout.

- Branch: `feature/store-coupons-functionality`.
- Planned: `coupons` table (code, discount type/value, store scope, expiry,
  usage limits), manager UI for coupon creation, and checkout-page coupon
  redemption with validation against expiry/usage/store scope.
- Not yet merged to `main`.

---

## Status Summary

| Phase | Area | Status |
|-------|------|--------|
| 0 | Project bootstrap | Complete |
| 1 | Auth & domain models | Complete |
| 2 | Store & inventory management | Complete |
| 3 | Orders & notifications | Complete |
| 4 | ML forecasting & cron jobs | Complete |
| 5 | Maps & dashboard polish | Complete |
| 6 | MySQL migration | Complete |
| 7 | Store coupons | In progress |
