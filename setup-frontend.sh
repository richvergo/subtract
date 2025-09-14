#!/bin/bash

# Frontend Setup Script for Agents MVP
echo "🚀 Setting up Agents MVP Frontend..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: Create environment file
print_status "Creating environment file..."
cat > .env.local << 'EOF'
# Local development environment variables
DATABASE_URL="file:./prisma/dev.db"
ENCRYPTION_KEY="local-dev-encryption-key-32chars"
REDIS_HOST=localhost
REDIS_PORT=6379
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=local-dev-nextauth-secret-key
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
NODE_ENV=development
EOF

print_status "Environment file created ✅"

# Step 2: Install dependencies
print_status "Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    print_status "Dependencies installed ✅"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Step 3: Generate Prisma client
print_status "Generating Prisma client..."
npx prisma generate

if [ $? -eq 0 ]; then
    print_status "Prisma client generated ✅"
else
    print_error "Failed to generate Prisma client"
    exit 1
fi

# Step 4: Run database migrations
print_status "Running database migrations..."
npx prisma migrate dev --name init

if [ $? -eq 0 ]; then
    print_status "Database migrations completed ✅"
else
    print_warning "Migration failed, but continuing..."
fi

# Step 5: Check if everything is ready
print_status "Checking setup..."

# Check if node_modules exists
if [ -d "node_modules" ]; then
    print_status "Node modules found ✅"
else
    print_error "Node modules not found"
    exit 1
fi

# Check if .env.local exists
if [ -f ".env.local" ]; then
    print_status "Environment file found ✅"
else
    print_error "Environment file not found"
    exit 1
fi

# Check if Prisma client exists
if [ -d "node_modules/.prisma" ]; then
    print_status "Prisma client found ✅"
else
    print_error "Prisma client not found"
    exit 1
fi

print_status "🎉 Setup complete! You can now start the development server."
echo ""
echo "Next steps:"
echo "1. Run: npm run dev"
echo "2. Open: http://localhost:3000"
echo "3. Test the Agents MVP frontend!"
echo ""
echo "Available pages:"
echo "- Dashboard: http://localhost:3000"
echo "- Logins: http://localhost:3000/logins"
echo "- Agents: http://localhost:3000/agents"
echo ""
