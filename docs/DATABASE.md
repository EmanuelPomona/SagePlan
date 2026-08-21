# Database Design

## Provider

TBD

## Database

TBD

---

# Entities

## User

Fields:

| Field | Type | Required | Notes |
|---|---|---|---|
| id | UUID | yes | primary key |
| created_at | timestamp | yes | creation time |

---

## Example Entity

Fields:

| Field | Type | Required | Notes |
|---|---|---|---|
| id | UUID | yes | primary key |

---

# Relationships

Document entity relationships here.

Example:

```text
User
 │
 └── has many → Projects
                  │
                  └── has many → Results