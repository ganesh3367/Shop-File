# Gany's Furniture: full-stack furniture store

A full-stack rebuild of the original static HTML/Bootstrap site: a React storefront with an animated, interactive UI, 3D/AR product previews, customer accounts, a Node.js + Express REST API, a SQLite database and a full admin panel.

## Run it

```bash
npm install
npm run dev        # website on http://localhost:5173, API on http://localhost:4000
```

`npm run dev` starts both the React app (Vite) and the API (Express). On first start the database (`data/gany.db`) is created and filled with the 66-piece catalogue, plus a starter discount code `WELCOME10` (10% off orders over ₹10,000).

| What               | Where                              | Login                                    |
| ------------------ | ---------------------------------- | ---------------------------------------- |
| Store              | http://localhost:5173              | sign up on the Log in page               |
| Admin panel        | http://localhost:5173/admin        | `admin@ganys.in` / `gany@admin` (dev)    |
| Interactive API docs | http://localhost:4000/api/docs   | click **Authorize** and paste a token    |

Production:

```bash
cp .env.example .env   # then set JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm run build          # builds the React app into dist/
npm start              # one Express server serves the website and the API
```

Deploy to any Node host with a persistent disk (Render, Railway, a VPS); `data/` and `uploads/` must persist. Static-only hosts (Netlify, Vercel static) can't run the API.

No email service is used. Password reset links are shown on screen in development, and in production an admin creates one from the customer's profile and sends it to them.

## Architecture

```
Browser ──▶ React app (Vite) ──fetch /api──▶ Express API ──▶ SQLite (data/gany.db)
            storefront + /admin               auth · catalogue · orders · admin
                     ▲                                    │
                     └──── Server-Sent Events (live admin alerts) ◀──┘
```

- **Frontend:** React 18, React Router 6, Framer Motion 12, Lenis smooth scroll, Google `<model-viewer>` (3D/AR, lazy-loaded), lucide-react, plain CSS with light and dark themes.
- **Backend:** Express 4, better-sqlite3, bcryptjs, jsonwebtoken (JWT), zod (validation), helmet (security headers and CSP), express-rate-limit, multer (uploads), swagger-ui-express (API docs).
- **Database:** 15 tables. See the **[ER diagram and design notes](docs/DATABASE.md)**.
- **API:** 55 endpoints, all documented at `/api/docs` (OpenAPI 3, in [`server/openapi.js`](server/openapi.js)).

### Security

- Passwords are hashed with bcrypt; login gives the same message for an unknown email and a wrong password.
- JWT auth (7 days). Admin routes re-check the `admin` role in the database on every request.
- Every request body is validated with zod. All SQL is parameterised.
- **Prices, discounts, GST and stock are computed on the server.** The browser only sends product ids, variants and quantities.
- Stock is reserved in the same transaction as the order, so the last item can't be sold twice.
- Password-reset tokens are stored hashed, single-use, and expire after 30 minutes.
- Uploads: images (≤ 4 MB) and `.glb` models (≤ 25 MB) only, saved under random names.
- Rate limits on login, password reset, reviews, orders, coupons, contact and newsletter. Helmet CSP allows only the hosts the site uses.

## Quality

Lighthouse (desktop, production build):

| Page    | Performance | Accessibility | Best practices | SEO |
| ------- | ----------- | ------------- | -------------- | --- |
| Home    | 91          | 100           | 100            | 100 |
| Shop    | 92          | 100           | 100            | 100 |
| Product | 91          | 100           | 100            | 100 |
| About   | 94          | 100           | 100            | 100 |
| Contact | 95          | 100           | 100            | 100 |
| Help    | 97          | 100           | 100            | 100 |
| Login   | 93          | 100           | 100            | 100 |

Text colours are chosen to meet WCAG AA contrast (4.5:1). Headings follow a correct outline, every control has an accessible name, and motion respects `prefers-reduced-motion`. The 3D viewer (~950 KB) and the admin panel load only when they're used.

## Features

### Storefront

- Animated UI: intro preloader, page transitions, smooth scrolling, scroll effects, subtle custom cursor, light/dark theme
- Shop with category tabs, filters, live search and sort (filters stay in the URL); ⌘K search palette
- Product page:
  - live stock ("Only 2 left", "Sold out")
  - **3D view and "View in your room" AR** (on supported phones)
  - hover zoom and colour/material options
  - **reviews with star breakdown, photos and "Verified buyer" badges**
  - **"Frequently bought together"**, worked out from real order history
- Cart drawer with a free-delivery progress bar
- Checkout:
  - **discount codes**
  - **saved addresses**
  - server-side pricing with GST on the discounted amount
- **Customer account**:
  - order history and **order tracking** (status steps, history and notes from the team)
  - **printable GST invoice (PDF)**
  - **return requests** (within 30 days of delivery)
  - saved addresses and a wishlist synced to the account across devices
- **Forgot / reset password**

### Admin panel (`/admin`)

- **Dashboard:**
  - KPIs vs the previous period and a daily revenue chart
  - sales by category and order status
  - top products and recent orders
  - **Needs attention** (orders, returns, reviews, messages) and **low-stock alerts**
- **Analytics:**
  - revenue by month and new vs returning customers
  - repeat-customer and return rates
  - category, city, payment and shipping mix
  - a month-by-month table
- **Orders:**
  - search, filters and CSV export
  - status updates with a note to the customer (cancelling restocks)
  - timeline, **invoice and packing slip**
- **Returns & refunds:** approve, reject, or refund (refunds restock).
- **Discount codes:**
  - percentage or fixed amount
  - minimum spend, usage limit and expiry
  - usage and revenue per code
- **Products:**
  - add, edit and hide products
  - **image and 3D-model uploads**
  - **inline stock editing** with live, hidden, low-stock and sold-out filters
  - units sold and revenue per product
- **Reviews:** approve or reject before they go live.
- **Customers:**
  - **customer profile** with full order history, lifetime spend, returns, addresses, reviews and wishlist
  - password-reset link generator
  - registered accounts and newsletter list, exportable to CSV
- **Messages:** contact inbox.
- **Activity log:** who changed what, and when.
- **Live alerts:** new orders, returns, reviews and messages appear instantly with a toast and an optional chime, using Server-Sent Events.
- One-click sample data (flagged, removable) for demos.

## Project structure

```
server/
  index.js        Express app: security, rate limits, routes, docs, uploads; serves dist/ in production
  db.js           schema + migrations, catalogue seed, order/stock helpers, activity log
  auth.js         JWT sign/verify, requireAuth / requireAdmin
  validate.js     zod schemas for every request body
  pricing.js      server-side pricing, coupons, shipping and GST
  events.js       in-process event bus for live admin alerts
  uploads.js      multer config for images and 3D models
  openapi.js      OpenAPI 3 spec served at /api/docs
  sample.js       sample order generator
  routes/         auth · catalog · store · account · admin
src/
  data/           seed catalogue + category defaults, business details for invoices
  context/        CatalogContext (live catalogue), StoreContext (cart, auth, wishlist, theme, toasts)
  lib/api.js      fetch wrapper
  pages/          storefront pages, Account (account, tracking, password reset), PrintDoc (invoice/slip)
  components/     UI incl. ProductExtras (3D viewer, reviews, bought together)
  admin/          Admin shell, Dashboard, Analytics, Orders, Returns, Coupons, Products, Reviews,
                  Customers, CustomerProfile, Messages, Activity, data.jsx (API state + live events)
docs/DATABASE.md  ER diagram and design decisions
```

## Credits & notes

- 3D models are Khronos glTF sample assets by Eric Chadwick: “Glam Velvet Sofa” (© Wayfair LLC, CC BY 4.0), “Sheen Chair” (© Wayfair LLC, CC0) and “Chair Damask Purplegold” (© Wayfair, CC BY 4.0). They are shown as representative models. Upload your own `.glb` files per product in the admin panel.
- Product photos load from the Audo Copenhagen CDN, as on the original site. Replace them with your own photography before any commercial use.
- Payment is simulated: no money is taken.
- Fill in your GSTIN in [`src/data/business.js`](src/data/business.js) to print it on invoices.
