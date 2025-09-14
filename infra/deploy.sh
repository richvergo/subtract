#!/bin/bash

# Agents MVP Deployment Script
# This script helps deploy the Agents MVP to production

set -e

echo "🚀 Starting Agents MVP Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install Node.js and npm first."
        exit 1
    fi
    
    print_status "All dependencies are installed ✅"
}

# Generate secure environment variables
generate_env_vars() {
    print_status "Generating secure environment variables..."
    
    if [ ! -f .env ]; then
        print_warning "Creating .env file from template..."
        cp env.example .env
        
        # Generate encryption key
        ENCRYPTION_KEY=$(openssl rand -base64 32)
        sed -i.bak "s/your-32-byte-base64-encryption-key-here/$ENCRYPTION_KEY/" .env
        
        # Generate internal token
        INTERNAL_TOKEN=$(openssl rand -hex 32)
        sed -i.bak "s/your-random-long-secret-token-here/$INTERNAL_TOKEN/" .env
        
        # Generate NextAuth secret
        NEXTAUTH_SECRET=$(openssl rand -hex 32)
        sed -i.bak "s/your-nextauth-secret-here/$NEXTAUTH_SECRET/" .env
        
        rm .env.bak
        print_status "Generated secure environment variables ✅"
    else
        print_status "Environment file already exists ✅"
    fi
}

# Run tests
run_tests() {
    print_status "Running tests..."
    
    # Install dependencies
    npm install
    
    # Run unit tests
    print_status "Running unit tests..."
    npm run test:unit
    
    # Run API tests
    print_status "Running API tests..."
    npm run test:api
    
    # Run worker tests
    print_status "Running worker tests..."
    npm run test:worker
    
    print_status "All tests passed ✅"
}

# Build Docker images
build_images() {
    print_status "Building Docker images..."
    
    # Build main app image
    docker build -f infra/Dockerfile -t agents-mvp:latest .
    
    # Build worker image
    docker build -f infra/Dockerfile.worker -t agents-mvp-worker:latest .
    
    print_status "Docker images built successfully ✅"
}

# Deploy locally with Docker Compose
deploy_local() {
    print_status "Deploying locally with Docker Compose..."
    
    cd infra
    docker-compose down --remove-orphans
    docker-compose up -d
    
    print_status "Local deployment complete ✅"
    print_status "Application available at: http://localhost:3000"
    print_status "Health check: http://localhost:3000/api/health"
}

# Deploy to Render (instructions)
deploy_render() {
    print_status "Render deployment instructions:"
    echo ""
    echo "1. Push your code to GitHub"
    echo "2. Go to https://render.com and create a new account"
    echo "3. Create a new Web Service:"
    echo "   - Connect your GitHub repository"
    echo "   - Build Command: npm install && npx prisma generate"
    echo "   - Start Command: npm start"
    echo "   - Environment: Node"
    echo "4. Add environment variables from your .env file"
    echo "5. Create a PostgreSQL database on Render"
    echo "6. Create a Redis instance on Render or use Upstash"
    echo "7. Deploy the service"
    echo ""
    echo "For the worker service:"
    echo "1. Create a Background Worker service"
    echo "2. Use the same repository"
    echo "3. Start Command: npm run worker"
    echo "4. Use the same environment variables"
    echo ""
}

# Deploy to Vercel (instructions)
deploy_vercel() {
    print_status "Vercel deployment instructions:"
    echo ""
    echo "1. Install Vercel CLI: npm i -g vercel"
    echo "2. Login to Vercel: vercel login"
    echo "3. Deploy: vercel --prod"
    echo "4. Set environment variables in Vercel dashboard"
    echo "5. Update vercel.json with your backend URL"
    echo ""
}

# Main deployment function
main() {
    case "${1:-local}" in
        "local")
            check_dependencies
            generate_env_vars
            run_tests
            build_images
            deploy_local
            ;;
        "render")
            check_dependencies
            generate_env_vars
            run_tests
            deploy_render
            ;;
        "vercel")
            check_dependencies
            deploy_vercel
            ;;
        "test")
            check_dependencies
            run_tests
            ;;
        "build")
            check_dependencies
            build_images
            ;;
        *)
            echo "Usage: $0 {local|render|vercel|test|build}"
            echo ""
            echo "Commands:"
            echo "  local   - Deploy locally with Docker Compose"
            echo "  render  - Show instructions for Render deployment"
            echo "  vercel  - Show instructions for Vercel deployment"
            echo "  test    - Run all tests"
            echo "  build   - Build Docker images"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
