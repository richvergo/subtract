# 📁 File Structure Reference

This document serves as a reference for the correct file structure of the checklist application. **DO NOT** create duplicate files or directories that conflict with this structure.

## 🏗️ Root Directory Structure

```
checklist_app/
├── .env                          # Environment variables (DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL)
├── .gitignore                    # Git ignore rules
├── eslint.config.mjs             # ESLint configuration
├── next-env.d.ts                 # Next.js TypeScript declarations
├── next.config.ts                # Next.js configuration
├── package.json                  # Dependencies and scripts (NO --turbopack flags)
├── package-lock.json             # Lock file for dependencies
├── postcss.config.mjs            # PostCSS configuration
├── tsconfig.json                 # TypeScript configuration
├── README.md                     # Project documentation
├── PRD.md                        # Product Requirements Document
├── Project-Guidelines.md         # Development guidelines
├── Test-Plan.md                  # Testing documentation
├── FILE_STRUCTURE_REFERENCE.md   # This file
│
├── prisma/                       # Database configuration
│   ├── dev.db                    # SQLite database file
│   ├── schema.prisma             # Database schema
│   └── migrations/               # Database migrations
│       ├── 20250903145405_init/
│       │   └── migration.sql
│       ├── 20250904142325_add_monthclose_unique/
│       │   └── migration.sql
│       └── migration_lock.toml
│
├── public/                       # Static assets
│   ├── favicon.ico
│   ├── logo.jpg
│   ├── next.svg
│   ├── vercel.svg
│   ├── file.svg
│   ├── globe.svg
│   └── window.svg
│
├── src/                          # Source code
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # API routes
│   │   │   ├── auth/
│   │   │   │   └── [...nextauth]/
│   │   │   │       └── route.ts
│   │   │   ├── dashboard/
│   │   │   │   └── route.ts
│   │   │   ├── health/
│   │   │   │   └── route.ts
│   │   │   ├── months/
│   │   │   │   └── route.ts
│   │   │   ├── register/
│   │   │   │   └── route.ts
│   │   │   ├── tasks/
│   │   │   │   ├── [id]/
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts
│   │   │   ├── upload/
│   │   │   │   ├── ingest/
│   │   │   │   │   └── route.ts
│   │   │   │   └── preview/
│   │   │   │       └── route.ts
│   │   │   └── users/
│   │   │       └── route.ts
│   │   ├── components/           # React components
│   │   │   └── DashboardContent.tsx
│   │   ├── register/             # Registration page
│   │   │   └── page.tsx
│   │   ├── upload/               # Upload page
│   │   │   └── page.tsx
│   │   ├── favicon.ico
│   │   ├── globals.css           # Global styles
│   │   ├── layout.tsx            # Root layout
│   │   └── page.tsx              # Dashboard page
│   │
│   └── lib/                      # Utility libraries
│       ├── auth.ts               # Authentication helpers
│       ├── db.ts                 # Prisma client
│       └── env.ts                # Environment validation
│
└── tests/                        # Test files
    └── fixtures/
        └── sample_checklist.xlsx
```

## 🚫 **CRITICAL: DO NOT CREATE THESE**

### ❌ Duplicate Directories (Will Cause Module Resolution Conflicts)
- `lib/` in root (conflicts with `src/lib/`)
- `src/generated/` (incorrect Prisma generation)
- `prisma/prisma/` (nested database structure)

### ❌ Incorrect File Locations
- `src/app/api/auth/register/route.ts` (should be `src/app/api/register/route.ts`)
- `src/app/api/register/page.tsx` (should be `src/app/register/page.tsx`)

### ❌ Test Files in Production
- `src/app/test-*/` directories
- `create_sample_excel.js` in root
- `cookies.txt` in root

## ✅ **CORRECT Module Resolution**

### TypeScript Path Mapping (`tsconfig.json`)
```json
{
  "paths": {
    "@/*": ["./src/*"]
  }
}
```

### Import Examples
```typescript
// ✅ CORRECT
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { env } from '@/lib/env';

// ❌ WRONG (will cause conflicts)
import { prisma } from '../../../lib/db';
import { prisma } from './lib/db';
```

## 🔧 **Package.json Scripts**

```json
{
  "scripts": {
    "dev": "next dev",           // ✅ NO --turbopack
    "build": "next build",       // ✅ NO --turbopack
    "start": "next start",
    "lint": "eslint"
  }
}
```

## 🗄️ **Database Structure**

### Prisma Schema Location
- **Schema**: `prisma/schema.prisma`
- **Database**: `prisma/dev.db`
- **Migrations**: `prisma/migrations/`
- **Generated Client**: `node_modules/@prisma/client` (NOT in `src/generated/`)

### Environment Variables (`.env`)
```env
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

## 🚀 **Development Commands**

```bash
# Start development server (NO Turbopack)
npm run dev

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Open Prisma Studio
npx prisma studio

# Build for production
npm run build
```

## 🔍 **Verification Checklist**

Before making changes, verify:

- [ ] No duplicate `lib/` directories exist
- [ ] No `src/generated/` directory exists
- [ ] No nested `prisma/prisma/` structure
- [ ] All imports use `@/` path mapping
- [ ] Package.json scripts don't use `--turbopack`
- [ ] Database file exists at `prisma/dev.db`
- [ ] Environment variables are properly set
- [ ] No test files in production directories

## 🚨 **Common Issues to Avoid**

1. **Module Resolution Conflicts**: Don't create duplicate directories
2. **Turbopack Errors**: Don't use `--turbopack` flag
3. **Database Connection**: Ensure `.env` file exists and is correct
4. **Prisma Client**: Don't generate in `src/generated/`
5. **File Permissions**: Ensure database file is readable/writable

---

**Last Updated**: September 6, 2025  
**Version**: 1.0  
**Status**: ✅ Verified and Working
