# CorpDeals - Corporate Employee Deals Platform

A full-stack application for managing corporate employee deals and vendor partnerships.

## Project Structure

```
CorpDeals/
├── app/                    # React Frontend (Vite + TypeScript)
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── context/        # React Context providers
│   │   ├── pages/          # Page components
│   │   │   ├── admin/      # Admin dashboard pages
│   │   │   └── auth/       # Authentication pages
│   │   ├── sections/       # Homepage sections
│   │   └── services/       # API service layer
│   └── package.json
│
└── backend/                # Express Backend (TypeScript)
    ├── src/
    │   ├── routes/         # API route handlers
    │   ├── middleware/     # Auth middleware
    │   └── lib/            # Prisma client
    ├── prisma/
    │   ├── schema.prisma   # Database schema
    │   └── seed.ts         # Seed data
    └── package.json
```

## Prerequisites

- Node.js 18+
- PostgreSQL database

## Getting Started

### 1. Database Setup

Make sure PostgreSQL is running and create a database:

```sql
CREATE DATABASE corpdeals;
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment variables
# Edit .env file with your PostgreSQL connection string
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/corpdeals?schema=public"
JWT_SECRET="your-secret-key"

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed initial data
npm run db:seed

# Start development server
npm run dev
```

The backend will run at `http://localhost:3001`

### 3. Frontend Setup

```bash
cd app

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will run at `http://localhost:5173`

## Test Credentials

After running the seed script:

- **Admin**: admin@corpdeals.io / admin123
- **Vendor**: vendor@coastcapital.com / vendor123

## Features

### Public Pages
- **Homepage** - Browse featured deals
- **Company Pages** - View deals by company
- **Category Pages** - View deals by category
- **Become a Partner** - Vendor application form

### Admin Dashboard (`/admin`)
- Dashboard with stats overview
- Vendor request approval/rejection
- Vendor management
- Company management with HR contacts
- Offer management
- User management

### API Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

#### Vendors
- `POST /api/vendors/apply` - Submit vendor application
- `GET /api/vendors` - List vendors (admin)
- `GET /api/vendors/:id` - Get vendor details
- `GET /api/vendors/me/profile` - Get own vendor profile

#### Companies
- `GET /api/companies` - List companies
- `GET /api/companies/:idOrSlug` - Get company details
- `POST /api/companies` - Create company (admin)
- `PATCH /api/companies/:id` - Update company (admin)
- `DELETE /api/companies/:id` - Delete company (admin)

#### Offers
- `GET /api/offers` - List offers
- `GET /api/offers/:id` - Get offer details
- `POST /api/offers` - Create offer (vendor/admin)
- `PATCH /api/offers/:id` - Update offer
- `DELETE /api/offers/:id` - Delete offer

#### HR Contacts
- `GET /api/hr-contacts` - List HR contacts (admin)
- `POST /api/hr-contacts` - Create HR contact (admin)
- `PATCH /api/hr-contacts/:id` - Update HR contact (admin)
- `DELETE /api/hr-contacts/:id` - Delete HR contact (admin)

#### Admin
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/vendor-requests` - List vendor requests
- `PATCH /api/admin/vendor-requests/:id` - Approve/reject request
- `GET /api/admin/users` - List users
- `PATCH /api/admin/users/:id/role` - Update user role
- `POST /api/admin/vendors` - Create vendor directly

## Tech Stack

### Frontend
- React 19
- TypeScript
- Vite
- React Router DOM
- Tailwind CSS
- Lucide Icons
- GSAP (animations)

### Backend
- Node.js
- Express 5
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT Authentication
- bcryptjs
