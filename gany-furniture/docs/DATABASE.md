# Database design

SQLite database (`data/gany.db`), created and migrated automatically by [`server/db.js`](../server/db.js) on start-up. GitHub renders the diagram below.

```mermaid
erDiagram
    USERS ||--o{ ORDERS : places
    USERS ||--o{ ADDRESSES : saves
    USERS ||--o{ WISHLIST : saves
    USERS ||--o{ REVIEWS : writes
    USERS ||--o{ RETURNS : requests
    USERS ||--o{ PASSWORD_RESETS : "can reset with"
    USERS ||--o{ ACTIVITY : "admin performs"
    ORDERS ||--|{ ORDER_ITEMS : contains
    ORDERS ||--|{ ORDER_EVENTS : "status history"
    ORDERS ||--o{ RETURNS : "may have"
    PRODUCTS ||--o{ ORDER_ITEMS : "sold as"
    PRODUCTS ||--o{ REVIEWS : receives
    PRODUCTS ||--o{ WISHLIST : "saved in"
    COUPONS |o--o{ ORDERS : "applied to"

    USERS {
        int id PK
        text name
        text email UK "case-insensitive"
        text password_hash "bcrypt"
        text role "customer | admin"
        text created_at
    }
    PRODUCTS {
        text id PK "url slug"
        text name
        text category "seating | tables | lighting"
        text type
        int price "rupees"
        int compare_at
        text image
        text badge
        int stock
        text colors "JSON"
        text materials "JSON"
        text story
        text dimensions
        text model_url "3D .glb"
        int featured
        int active "hidden when 0"
    }
    ORDERS {
        text id PK "GNY-123456"
        int user_id FK "null for guests"
        text status "Pending..Cancelled"
        text name
        text email
        text phone
        text address
        text city
        text state
        text zip
        int subtotal
        int discount
        text coupon_code FK
        int shipping
        int gst
        int total
        int demo "sample data flag"
        text created_at
    }
    ORDER_ITEMS {
        int id PK
        text order_id FK
        text product_id FK
        text name "snapshot"
        int price "price paid"
        int qty
        text color
        text material
    }
    ORDER_EVENTS {
        int id PK
        text order_id FK
        text status
        text note "shown to customer"
        text created_at
    }
    RETURNS {
        int id PK
        text order_id FK
        int user_id FK
        text reason
        text details
        text status "Requested | Approved | Rejected | Refunded"
        int refund_amount
        text admin_note
    }
    REVIEWS {
        int id PK
        text product_id FK
        int user_id FK
        int rating "1-5"
        text title
        text body
        text photo
        int verified "bought it"
        text status "Pending | Approved | Rejected"
    }
    COUPONS {
        text code PK
        text kind "percent | fixed"
        int value
        int min_subtotal
        int max_uses
        int used
        text expires_at
        int active
    }
    ADDRESSES {
        int id PK
        int user_id FK
        text label
        text address
        text city
        text zip
        int is_default
    }
    WISHLIST {
        int user_id PK, FK
        text product_id PK, FK
    }
    PASSWORD_RESETS {
        text token_hash PK "SHA-256, never the raw token"
        int user_id FK
        text expires_at "30 minutes"
        int used
    }
    ACTIVITY {
        int id PK
        int admin_id FK
        text action
        text entity
        text entity_id
        text details
        text created_at
    }
```

Two standalone tables are not shown: `messages` (contact form) and `subscribers` (newsletter).

## Design decisions

- **Order items copy the product's name, image and price.** Later edits to the catalogue never change what an old order or invoice shows.
- **Stock is reserved inside the order transaction** (`UPDATE … SET stock = stock - ? WHERE stock >= ?`), so two people can't buy the last item at the same time. Cancelling or refunding puts it back.
- **Products with orders are hidden, not deleted**, so order history and reviews stay intact.
- **Password reset tokens are stored hashed**, are single-use and expire after 30 minutes.
- **Sample orders are flagged `demo = 1`.** They never touch real stock and can be removed in one click.
- **Money is stored as whole rupees (integers)** to avoid floating-point rounding.
