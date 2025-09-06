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
- **`prisma/prisma/` (nested database structure) - CAUSES DATABASE CONNECTION FAILURES**

### ❌ Incorrect File Locations
- `src/app/api/auth/register/route.ts` (should be `src/app/api/register/route.ts`)
- `src/app/api/register/page.tsx` (should be `src/app/register/page.tsx`)

### ❌ Test Files in Production
- `src/app/test-*/` directories
- `create_sample_excel.js` in root
- `cookies.txt` in root

### ❌ Database Structure Issues
- **NEVER create nested `prisma/prisma/` directories**
- **NEVER have multiple `dev.db` files in different locations**
- **ALWAYS ensure database file is at `prisma/dev.db` (not nested)**

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
- **Database**: `prisma/dev.db` (MUST be at this exact location)
- **Migrations**: `prisma/migrations/`
- **Generated Client**: `node_modules/@prisma/client` (NOT in `src/generated/`)

### Environment Variables (`.env`)
```env
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

### ⚠️ **CRITICAL DATABASE WARNING**
**NEVER create nested `prisma/prisma/` directories!** This causes:
- `PrismaClientInitializationError: Error code 14: Unable to open the database file`
- Database connection failures
- Application crashes

**Correct Structure:**
```
prisma/
├── dev.db          ✅ Correct location
├── schema.prisma   ✅
└── migrations/     ✅
```

**WRONG Structure:**
```
prisma/
├── dev.db          ❌ Wrong location
├── schema.prisma   ✅
├── migrations/     ✅
└── prisma/         ❌ NEVER create this!
    └── dev.db      ❌ This causes connection failures
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

## 🛠️ **Troubleshooting Guide**

### Database Connection Issues
**Error**: `PrismaClientInitializationError: Error code 14: Unable to open the database file`

**Solution**:
```bash
# 1. Check for nested prisma directory
ls -la prisma/
# Should NOT show: prisma/prisma/

# 2. Remove nested directory if it exists
rm -rf prisma/prisma

# 3. Ensure .env file exists
cat .env
# Should show: DATABASE_URL="file:./prisma/dev.db"

# 4. Regenerate Prisma client
npx prisma generate
npx prisma db push
```

### JWT Session Errors
**Error**: `JWEDecryptionFailed: decryption operation failed`

**Solution**:
```bash
# 1. Check .env file has NEXTAUTH_SECRET
grep NEXTAUTH_SECRET .env

# 2. If missing, add it
echo 'NEXTAUTH_SECRET="your-secret-key-here"' >> .env

# 3. Restart server
pkill -f "next dev"
npx next dev
```

### Turbopack Build Manifest Errors
**Error**: `ENOENT: no such file or directory, open '.next/static/development/_buildManifest.js.tmp.*'`

**Solution**:
```bash
# 1. Remove --turbopack from package.json scripts
# 2. Clear build cache
rm -rf .next
# 3. Restart server
npx next dev
```

## 🚨 **Common Issues to Avoid**

1. **Module Resolution Conflicts**: Don't create duplicate directories
2. **Turbopack Errors**: Don't use `--turbopack` flag
3. **Database Connection**: Ensure `.env` file exists and is correct
4. **Prisma Client**: Don't generate in `src/generated/`
5. **File Permissions**: Ensure database file is readable/writable
6. **Nested Prisma Directory**: NEVER create `prisma/prisma/` - causes "Unable to open database file" errors
7. **Multiple Database Files**: Only one `dev.db` should exist at `prisma/dev.db`
8. **JWT Session Errors**: Ensure `NEXTAUTH_SECRET` is set in `.env`

---

**Last Updated**: September 6, 2025  
**Version**: 1.0  
**Status**: ✅ Verified and Working
