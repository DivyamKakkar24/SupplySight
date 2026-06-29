# Extras — Advanced Features Backlog

Ideas for taking SupplySight beyond its current feature set. Not scheduled —
this is a backlog to pull from when planning future phases.

## Analytics & Business Intelligence

- Manager-facing analytics dashboard: revenue trends, sell-through rate,
  inventory turnover, and dead-stock detection per store.
- Cohort/seasonal demand analysis layered on top of the existing 7-day ML
  forecast (e.g. weekday vs weekend, festival/holiday spikes for Indian
  markets).
- Exportable reports (CSV/PDF) for managers — daily sales, low-stock summary,
  order history.

## ML & Forecasting Improvements

- Replace the simple moving-average forecast with a proper time-series model
  (e.g. Prophet or ARIMA) once enough historical order data accumulates.
- Multi-store demand transfer suggestions ("Store A is overstocked on Item X,
  Store B is about to stock out — suggest a transfer").
- Anomaly detection on order velocity to flag potential fraud or data-entry
  errors (e.g. a 50x spike in a single order).
- A/B-testable confidence thresholds so managers can tune how aggressive
  reorder suggestions are.

## Payments & Checkout

- Real payment gateway integration (Razorpay/Stripe) instead of a mock
  checkout flow.
- Store coupons and promotional codes (in progress — see Phase 7 in
  `inventory-management-system-phases.md`).
- Loyalty points / repeat-customer rewards program.
- Multi-item discount bundles configured per store.

## Notifications & Communication

- Email/SMS notifications (beyond in-app toasts) for order confirmations and
  critical stock-outs, using a provider like Nodemailer/Twilio.
- Push notifications via a service worker for the web app.
- Digest emails to managers summarizing the previous day's activity instead of
  only real-time alerts.

## Mobile & Accessibility

- React Native companion app reusing the existing backend/ML APIs.
- Offline-first support for managers doing physical stock counts with patchy
  connectivity, syncing once back online.
- Accessibility audit (WCAG) and keyboard-navigation pass on manager and
  customer dashboards.

## Platform & Scale

- Multi-language / i18n support for regional store managers and customers.
- Multi-tenant support so unrelated businesses can run isolated instances of
  SupplySight on shared infrastructure.
- Redis caching layer for frequently read endpoints (store listings, item
  catalogs) to reduce MySQL load.
- Replace polling-based notifications with WebSockets/Server-Sent Events for
  true real-time updates.
- Rate limiting and request throttling on public-facing API routes.
- Audit log of manager actions (price/quantity changes, store edits) for
  accountability across multi-manager stores.

## Maps & Geolocation

- Heatmap overlay on the store map showing sales density or stock-out
  frequency by region.
- "Find nearest store with item in stock" search for customers, using
  geolocation distance ranking.
- Delivery radius / serviceable-area configuration per store.

## DevOps & Quality

- CI pipeline (GitHub Actions) running lint + tests on every PR across all
  three services.
- Automated integration tests covering backend ↔ ML service contract, not just
  unit tests per service.
- Structured logging/observability (e.g. pino + a log aggregator) instead of
  console logging, especially for the cron jobs and ML calls.
- Containerize all three services with Docker Compose for a one-command local
  dev environment.
