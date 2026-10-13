# Mermaid ERD — W2 support (T14/T15)

Prepared by Perry for Charles, 7 Oct 2026. **Proposed model, pending the 12 Oct approval gate. No migrations.** The column dictionary, nullability, constraints, unresolved decisions, and source references are in [tables-overview.md](tables-overview.md).

Mermaid lists all columns from the dictionary. `PK`, `FK`, and `UK` mark keys; comments identify nullable attributes. `numeric` denotes PostgreSQL `numeric(7,6)` here. `AUTH_USERS` is the existing Supabase `auth.users` entity, shown only to make the external FK explicit; it is not an application table to create.

```mermaid
erDiagram
    menu_categories ||--o{ menu_items : groups
    menu_items ||--o{ item_sizes : offers
    item_sizes ||--o{ price_change_log : records
    staff_users o|--o{ price_change_log : changes
    orders ||--|{ order_lines : contains
    item_sizes ||--o{ order_lines : purchased_as
    order_lines ||--o{ order_line_components : selects
    menu_items ||--o{ order_line_components : supplies_half
    orders ||--o| payments : has_session
    orders ||--o{ order_status_log : records
    staff_users o|--o{ order_status_log : performs
    AUTH_USERS ||--o| staff_users : has_role

    menu_categories {
        uuid id PK
        text name UK
        integer sort_order
    }
    menu_items {
        uuid id PK
        uuid category_id FK
        text code UK
        text name
        text description "nullable"
        boolean is_available
        boolean is_active
        boolean is_spicy_flag
        boolean is_catering
        integer sort_order
        timestamptz created_at
        timestamptz updated_at
    }
    item_sizes {
        uuid id PK
        uuid menu_item_id FK, UK "composite UK with size_code"
        text size_code UK "composite UK with menu_item_id"
        integer sort_order
        integer price_cents
    }
    price_change_log {
        uuid id PK
        uuid item_size_id FK
        integer old_price_cents
        integer new_price_cents
        uuid changed_by FK "nullable"
        timestamptz changed_at
    }
    orders {
        uuid id PK
        text display_order_number UK
        text customer_name
        text customer_email
        text customer_phone "nullable"
        timestamptz pickup_at
        timestamptz earliest_pickup_at
        text payment_status
        text ticket_status "nullable until payment confirmed"
        integer subtotal_cents
        numeric tax_rate
        integer tax_cents
        integer total_cents
        timestamptz email_sent_at "nullable"
        timestamptz created_at
        timestamptz updated_at
    }
    order_lines {
        uuid id PK
        uuid order_id FK
        uuid item_size_id FK
        integer quantity
        integer unit_price_cents
        text item_name_snapshot
        text size_code_snapshot
        boolean spicy_requested
        text instructions "nullable"
    }
    order_line_components {
        uuid id PK
        uuid order_line_id FK, UK "composite UK with component_position"
        smallint component_position UK "composite UK with order_line_id"
        uuid menu_item_id FK
        text item_name_snapshot
    }
    payments {
        uuid id PK
        uuid order_id FK, UK
        text stripe_checkout_session_id UK
        text stripe_payment_intent_id UK "nullable"
        integer amount_cents
        text currency
        timestamptz paid_at "nullable"
        timestamptz created_at
    }
    order_status_log {
        uuid id PK
        uuid order_id FK
        text status_kind
        text from_status "nullable"
        text to_status
        uuid changed_by FK "nullable"
        timestamptz changed_at
    }
    staff_users {
        uuid id PK, FK
        text role
    }
    business_hours {
        smallint day_of_week PK
        time opens_at "nullable when closed"
        time closes_at "nullable when closed"
    }
    settings {
        smallint id PK
        numeric tax_rate
        integer regular_lead_minutes
        integer catering_lead_minutes
        text timezone
    }
    AUTH_USERS {
        uuid id PK "external Supabase Auth key only"
    }
```

## Cardinality and lifecycle notes for Visio

- Each menu item belongs to exactly one category; categories can be empty. Each size belongs to one item; an orderable item must have at least one size, although an item under setup can have none.
- A completed checkout record contains one or more lines; transactional creation must guarantee that minimum because an FK alone cannot. Each line references one size, which resolves its current item; snapshots preserve the historical label and price.
- Each G1 line has exactly two component rows, and every other line has none. Mermaid's zero-to-many edge cannot express that conditional exact count. Component positions are `1` and `2`, with one half per ordered parent unit, and the parent price includes both halves.
- Each order has zero or one payment association, and each payment belongs to exactly one order. Zero is necessary while a pending order exists before its Stripe session is saved. Session and order uniqueness support idempotent webhook handling.
- Each price/status event has zero or one staff actor, allowing system events. Each staff role record refers to exactly one external Auth user; an Auth user may have no application role.
- `business_hours` and singleton `settings` are intentionally separate and unconnected. Checkout uses their current values, then stores the order's applicable tax and earliest-pickup snapshots.
- Payment: `pending_payment → paid → refunded / cancelled` is the documented high-level lifecycle. Exact cancellation/refund transitions need agreement. Ticket: null until confirmed payment, then `received → in_progress → ready → completed`. An unpaid order never reaches the kitchen. A refund may retain historical ticket status.
- Keep item-level availability provisional, and obtain BR-08, BR-20, BR-23, BR-24, and BR-26 before approval. The dictionary records additional design choices requiring Charles's review and the F8/F16 change-log corrections.

The dictionary and diagram are the W2 handoff only. Charles redraws the official ERD in Visio; T23 database implementation follows approval.
