# CorpDeals Schema + UI Link Map

This file summarizes how the database schema, API routes, and UI pages/components connect to each other.

**Database Schema (Prisma)**

Key tables and relationships (simplified):

```
User (users)
  id PK
  email UNIQUE
  role (ADMIN | VENDOR | EMPLOYEE)
  1-1 Vendor via Vendor.user_id
  1-M VendorRequest reviews via VendorRequest.reviewed_by_id

Vendor (vendors)
  id PK
  user_id FK -> User.id
  status (PENDING | APPROVED | REJECTED)
  1-M Offer via Offer.vendor_id
  1-M VendorRequest via VendorRequest.vendor_id

VendorRequest (vendor_requests)
  id PK
  vendor_id FK -> Vendor.id
  reviewed_by_id FK -> User.id (nullable)

Company (companies)
  id PK
  slug UNIQUE
  1-M HRContact via HRContact.company_id
  1-M Offer via Offer.company_id
  1-M Lead via Lead.company_id

HRContact (hr_contacts)
  id PK
  company_id FK -> Company.id

Category (categories)
  id PK
  slug UNIQUE
  1-M Offer via Offer.category_id

Offer (offers)
  id PK
  vendor_id FK -> Vendor.id
  company_id FK -> Company.id
  category_id FK -> Category.id
  1-M Lead via Lead.offer_id

Lead (leads)
  id PK
  offer_id FK -> Offer.id
  company_id FK -> Company.id
```

**Relationship Diagram**

```
User 1─1 Vendor 1─M Offer 1─M Lead
             │          │
             │          └─M Lead -> Company
             │
             └─M VendorRequest (reviewed_by -> User)

Company 1─M HRContact
Company 1─M Offer
Category 1─M Offer
```

**Backend Routes to Tables**

Route files live in `backend/src/routes`.

| Route | Main Tables | Notes |
| --- | --- | --- |
| `/api/auth/*` | `users`, `vendors` | Login returns user + vendor profile if present. |
| `/api/vendors/apply` | `users`, `vendors`, `vendor_requests` | Creates all three in a transaction. |
| `/api/vendors/*` | `vendors`, `users`, `offers` | Admin lists vendors, vendor profile includes offers. |
| `/api/companies/*` | `companies`, `offers`, `hr_contacts` | Public reads include offers + HR contacts. |
| `/api/categories/*` | `categories`, `offers` | Public reads include offers. |
| `/api/offers/*` | `offers`, `vendors`, `companies`, `categories` | Public list + detail. |
| `/api/hr-contacts/*` | `hr_contacts`, `companies` | Admin only. |
| `/api/leads/*` | `leads`, `offers`, `companies`, `vendors` | Create lead, list by vendor/admin. |
| `/api/admin/*` | `users`, `vendors`, `companies`, `offers`, `leads`, `vendor_requests` | Dashboard stats + admin actions. |

**UI Pages and Data Sources**

Routes are defined in `app/src/App.tsx`.

Public UI uses local static data for catalogs:
- `app/src/data/companies.ts`
- `app/src/data/categories.ts`
- `app/src/data/offers.ts`

Admin and vendor portals use live API data from `app/src/services/api.ts`.

| UI Page | Component | Data Source | API Route | Tables |
| --- | --- | --- | --- | --- |
| Home | `app/src/pages/HomePage.tsx` | Local data | None | None |
| Company detail | `app/src/pages/CompanyPage.tsx` | Local data | None | None |
| Category detail | `app/src/pages/CategoryPage.tsx` | Local data | None | None |
| Offer detail | `app/src/pages/OfferPage.tsx` | Local data + submit lead | `POST /api/leads` | `leads`, `offers`, `companies` |
| Become partner | `app/src/pages/BecomePartnerPage.tsx` | API submit | `POST /api/vendors/apply` | `users`, `vendors`, `vendor_requests` |
| Login | `app/src/pages/auth/LoginPage.tsx` | API auth | `POST /api/auth/login` | `users`, `vendors` |
| Vendor portal | `app/src/pages/VendorPortal.tsx` | API data | `GET /api/vendors/me/profile`, `GET /api/leads/vendor`, `PATCH /api/leads/:id` | `vendors`, `offers`, `leads`, `companies` |
| Admin dashboard | `app/src/pages/admin/AdminDashboard.tsx` | API data | `GET /api/admin/stats`, `GET /api/admin/vendor-requests` | Aggregate counts |
| Admin vendor requests | `app/src/pages/admin/VendorRequestsPage.tsx` | API data | `GET /api/admin/vendor-requests`, `PATCH /api/admin/vendor-requests/:id` | `vendor_requests`, `vendors`, `users` |
| Admin vendors | `app/src/pages/admin/VendorsPage.tsx` | API data | `GET /api/vendors`, `POST /api/admin/vendors` | `vendors`, `users`, `offers` |
| Admin companies | `app/src/pages/admin/CompaniesPage.tsx` | API data | `GET/POST /api/companies`, `GET/POST/DELETE /api/hr-contacts` | `companies`, `hr_contacts` |
| Admin users | `app/src/pages/admin/UsersPage.tsx` | API data | `GET /api/admin/users`, `PATCH /api/admin/users/:id/role` | `users`, `vendors` |
| Admin leads | `app/src/pages/admin/AdminLeadsPage.tsx` | API data | `GET /api/leads` | `leads`, `offers`, `companies`, `vendors` |
| Admin offers | `app/src/pages/AdminOffersPage.tsx` | Local context | None | None |

**Important UI <-> DB Mismatches**

- The public catalog pages and `AdminOffersPage` use local static data in `app/src/data/*` and `app/src/context/OffersContext.tsx`. These do not read/write from the database.
- The backend expects IDs in the database to match offer IDs used in the UI. If the database is missing those offers, API actions like lead creation will fail with “Offer not found”.

**Where to Update Links**

- Update DB schema: `backend/prisma/schema.prisma`
- Update API routes: `backend/src/routes/*.ts`
- Update public catalog data: `app/src/data/*.ts`
- Update UI to use live APIs: `app/src/services/api.ts` and the page components

