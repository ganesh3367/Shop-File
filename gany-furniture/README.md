# Gany's Furniture: full-stack furniture store

A full-stack rebuild of the original static HTML/Bootstrap site: a React storefront with an animated, interactive UI, a Node.js + Express REST API, a SQLite database, customer accounts and an admin panel.

## Run it

```bash
npm install
npm run dev        # website on http://localhost:5173, API on http://localhost:4000
```

`npm run dev` starts both the React app (Vite) and the API (Express) together. The database file is created automatically at `data/gany.db`.

On first start a development admin account is created:

| Admin panel                   | Email            | Password     |
| ----------------------------- | ---------------- | ------------ |
| http://localhost:5173/admin   | `admin@ganys.in` | `gany@admin` |

Production:

```bash
cp .env.example .env   # then set JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm run build          # builds the React app into dist/
npm start              # one Express server serves the website and the API
```

Deploy to any Node host with a persistent disk (Render, Railway, a VPS). Set the environment variables from `.env.example`, use `npm install && npm run build` as the build command and `npm start` as the start command. Static-only hosts (Netlify, Vercel static) can't run the API.

## Architecture

```
Browser ──▶ React app (Vite)  ──fetch /api──▶  Express API  ──▶  SQLite (data/gany.db)
            storefront + /admin                 auth · orders · admin
```

- **Frontend:** React 18, React Router 6, Framer Motion 12, Lenis smooth scroll, lucide-react icons, plain CSS with light and dark themes.
- **Backend:** Express 4, better-sqlite3, bcryptjs (password hashing), jsonwebtoken (JWT auth), zod (input validation), helmet (security headers and CSP), express-rate-limit.
- **One catalogue:** `src/data/products.js` is imported by both the React app and the server. The server prices every order from it, so prices can't be tampered with from the browser.

### Database tables

| Table          | Holds                                                                    |
| -------------- | ------------------------------------------------------------------------ |
| `users`        | customers and admins; bcrypt password hashes; `role` = customer / admin  |
| `orders`       | customer and shipping details, totals, status, link to the user (if any) |
| `order_items`  | line items with the price at the time of purchase                        |
| `order_events` | status history (Pending → Processing → Shipped → Delivered / Cancelled)  |
| `messages`     | contact form submissions, read/unread                                    |
| `subscribers`  | newsletter emails (unique, case-insensitive)                             |

### API

| Method | Endpoint                         | Access   | Purpose                                         |
| ------ | -------------------------------- | -------- | ----------------------------------------------- |
| POST   | `/api/auth/signup`               | public   | create a customer account → `{ token, user }`   |
| POST   | `/api/auth/login`                | public   | log in (customers and admins) → `{ token, user }` |
| GET    | `/api/auth/me`                   | customer | current user                                    |
| POST   | `/api/orders`                    | public   | place an order (priced on the server)           |
| GET    | `/api/orders/mine`               | customer | the logged-in customer's orders                 |
| POST   | `/api/messages`                  | public   | contact form                                    |
| POST   | `/api/subscribers`               | public   | newsletter sign-up                              |
| GET    | `/api/admin/orders`              | admin    | all orders with items and history               |
| PATCH  | `/api/admin/orders/:id/status`   | admin    | change status (adds a history event)            |
| POST   | `/api/admin/sample`              | admin    | load 46 sample orders (flagged `demo`)          |
| DELETE | `/api/admin/sample`              | admin    | remove the sample orders                        |
| GET    | `/api/admin/messages`            | admin    | contact inbox                                   |
| PATCH  | `/api/admin/messages/:id`        | admin    | mark read / unread                              |
| DELETE | `/api/admin/messages/:id`        | admin    | delete a message                                |
| GET    | `/api/admin/subscribers`         | admin    | newsletter list                                 |
| GET    | `/api/admin/users`               | admin    | registered accounts with order totals           |

Authenticated requests send `Authorization: Bearer <token>`. Errors come back as `{ "error": "message", "field"?: "path" }`.

### Security

- Passwords are hashed with bcrypt; login returns the same message for an unknown email and a wrong password.
- JWTs expire after 7 days. Admin routes check the `admin` role from the database on every request.
- Every request body is validated with zod. All SQL is parameterised.
- Rate limits on login/signup, contact, newsletter and orders.
- Helmet sets security headers, including a Content Security Policy that only allows the font, image and map hosts the site uses.

## Features

**Experience**

- Intro preloader (once per session) and curtain-wipe page transitions
- Subtle custom cursor: a small dot that tracks the pointer exactly and softens over clickable things (off on touch screens and for reduced motion)
- Smooth inertial scrolling (Lenis) and a scroll-progress bar
- Light theme by default, with a dark theme the visitor can switch to
- Respects `prefers-reduced-motion`

**Home page:** hero video that shrinks into a card on scroll, split-text reveals, count-up stats, category accordion, pinned horizontal showcase, **shop the room** hotspots, editorial story, tabbed bestsellers, draggable reviews.

**Shopping**

- Shop with category tabs, type chips, live search, sort, price slider and "on sale"; filters live in the URL
- Product cards with 3D tilt, quick add, wishlist and Quick View
- Product page with hover zoom, colour and material options, PIN-code delivery estimate, related products and a sticky add-to-bag bar
- Cart drawer with a free-delivery progress bar
- 3-step checkout with validation; the order is saved to the database and priced by the server
- Customer accounts (sign up / log in) with an order history showing live status
- ⌘K / Ctrl+K search palette

**Admin panel** (`/admin`)

- Dashboard: revenue, orders, average order and customers vs the previous period; daily revenue chart (hover tooltip + table view); sales by category; orders by status; top products; recent orders; inbox counts
- Orders: search, status filter, sort, CSV export, and a side panel to update status, with items, totals, customer details and a timeline
- Products: sortable catalogue with units sold and revenue
- Customers (from orders), registered accounts and newsletter subscribers, all exportable to CSV
- Messages: contact inbox with read/unread, delete and reply by email
- One-click sample data (flagged, removable) for demos

**Content pages:** About, Careers, Contact (with map), Help centre (searchable FAQ), Return policy, animated 404.

## Project structure

```
server/
  index.js              Express app: security, rate limits, routes, serves dist/ in production
  db.js                 SQLite schema, admin bootstrap, order helpers
  auth.js               JWT sign/verify, requireAuth / requireAdmin middleware
  validate.js           zod schemas for every request body
  pricing.js            server-side order pricing, shipping and GST
  sample.js             sample order generator
  routes/               auth.js · store.js (orders, messages, newsletter) · admin.js
src/
  data/products.js      catalogue shared by the app and the server
  lib/api.js            fetch wrapper (token, errors)
  context/StoreContext.jsx  cart, wishlist, auth, theme, toasts
  admin/                admin panel: Admin, Dashboard, Orders, Products, Customers, Messages,
                        data.jsx (API state), ui.jsx (chart, tiles, badges), lib.js
  components/ pages/ hooks/ styles/
```

## Notes

- Payment is simulated: no money is taken. Razorpay test mode is the natural next step.
- Product photos load from the Audo Copenhagen CDN, as on the original site. Replace them with your own photography before any commercial use.
