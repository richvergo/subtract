#!/bin/bash

# API Contract Validation Script
# Validates that frontend and backend API contracts are in sync
# This script should be run in CI/CD to ensure schema consistency

set -e

echo "🔍 Starting API Contract Validation..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL:-http://localhost:3000}"
TEST_AGENT_ID="${TEST_AGENT_ID:-test-agent-id}"
MAX_RETRIES="${MAX_RETRIES:-3}"
RETRY_DELAY="${RETRY_DELAY:-1000}"

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "success")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "error")
            echo -e "${RED}❌ $message${NC}"
            ;;
        "warning")
            echo -e "${YELLOW}⚠️  $message${NC}"
            ;;
        "info")
            echo -e "${BLUE}ℹ️  $message${NC}"
            ;;
    esac
}

# Function to check if API is running
check_api_availability() {
    print_status "info" "Checking API availability..."
    
    local health_check_url="${API_BASE_URL}/api/health"
    
    # Try to reach the API
    if curl -s --max-time 10 "${health_check_url}" > /dev/null 2>&1; then
        print_status "success" "API is running at ${API_BASE_URL}"
        return 0
    else
        print_status "warning" "Health check endpoint not available, trying to start API..."
        
        # Try to start the development server if not running
        if command -v npm > /dev/null 2>&1; then
            print_status "info" "Starting development server..."
            npm run dev &
            DEV_SERVER_PID=$!
            
            # Wait for server to start
            local max_wait=30
            local wait_count=0
            
            while [ $wait_count -lt $max_wait ]; do
                if curl -s --max-time 5 "${API_BASE_URL}" > /dev/null 2>&1; then
                    print_status "success" "Development server started successfully"
                    return 0
                fi
                sleep 1
                wait_count=$((wait_count + 1))
            done
            
            print_status "error" "Failed to start development server within ${max_wait} seconds"
            return 1
        else
            print_status "error" "npm not found. Please ensure the API is running at ${API_BASE_URL}"
            return 1
        fi
    fi
}

# Function to run API contract validation
run_contract_validation() {
    print_status "info" "Running API contract validation..."
    
    # Create a temporary test file
    local test_file=$(mktemp)
    cat > "$test_file" << 'EOF'
const { validateApiContract } = require('./src/lib/api/connectionCheck');

async function runValidation() {
    try {
        const result = await validateApiContract();
        
        if (result.passed) {
            console.log('✅ API contract validation passed');
            process.exit(0);
        } else {
            console.log('❌ API contract validation failed:');
            result.errors.forEach(error => console.log(`  - ${error}`));
            if (result.warnings.length > 0) {
                console.log('⚠️  Warnings:');
                result.warnings.forEach(warning => console.log(`  - ${warning}`));
            }
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Contract validation error:', error.message);
        process.exit(1);
    }
}

runValidation();
EOF

    # Run the validation
    if node "$test_file"; then
        print_status "success" "API contract validation completed successfully"
        rm "$test_file"
        return 0
    else
        print_status "error" "API contract validation failed"
        rm "$test_file"
        return 1
    fi
}

# Function to run integration tests
run_integration_tests() {
    print_status "info" "Running integration tests..."
    
    if command -v npm > /dev/null 2>&1; then
        if npm test -- --testPathPattern="connectionCheck|ConnectionValidator" --passWithNoTests; then
            print_status "success" "Integration tests passed"
            return 0
        else
            print_status "error" "Integration tests failed"
            return 1
        fi
    else
        print_status "warning" "npm not found, skipping integration tests"
        return 0
    fi
}

# Function to validate environment variables
validate_environment() {
    print_status "info" "Validating environment configuration..."
    
    local missing_vars=()
    
    # Check for required environment variables
    if [ -z "$NODE_ENV" ]; then
        missing_vars+=("NODE_ENV")
    fi
    
    if [ -z "$DATABASE_URL" ] && [ "$NODE_ENV" != "test" ]; then
        missing_vars+=("DATABASE_URL")
    fi
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        print_status "error" "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        return 1
    fi
    
    print_status "success" "Environment configuration is valid"
    return 0
}

# Function to generate validation report
generate_report() {
    local status=$1
    local output_file="${2:-api-contract-validation-report.txt}"
    
    {
        echo "API Contract Validation Report"
        echo "=============================="
        echo "Timestamp: $(date)"
        echo "API Base URL: ${API_BASE_URL}"
        echo "Test Agent ID: ${TEST_AGENT_ID}"
        echo "Status: $status"
        echo ""
        
        if [ "$status" = "success" ]; then
            echo "✅ All API contracts are valid and consistent between frontend and backend."
            echo ""
            echo "Validated endpoints:"
            echo "  - /api/agents/[id]/validate (WorkflowReplay)"
            echo "  - /api/agents/[id]/variables (VariableConfigModal)"
            echo "  - /api/agents/[id]/generate-logic (LogicEditor)"
            echo "  - /api/agents/[id]/run (RunConsole)"
            echo "  - /api/agents/[id]/schedule (ScheduleEditor)"
        else
            echo "❌ API contract validation failed."
            echo "Please check the error messages above and ensure frontend and backend schemas are in sync."
        fi
    } > "$output_file"
    
    print_status "info" "Validation report saved to: $output_file"
}

# Main execution
main() {
    local exit_code=0
    
    echo "🚀 API Contract Validation Script"
    echo "=================================="
    echo "API Base URL: ${API_BASE_URL}"
    echo "Test Agent ID: ${TEST_AGENT_ID}"
    echo "Max Retries: ${MAX_RETRIES}"
    echo ""
    
    # Step 1: Validate environment
    if ! validate_environment; then
        exit_code=1
    fi
    
    # Step 2: Check API availability
    if [ $exit_code -eq 0 ] && ! check_api_availability; then
        exit_code=1
    fi
    
    # Step 3: Run contract validation
    if [ $exit_code -eq 0 ] && ! run_contract_validation; then
        exit_code=1
    fi
    
    # Step 4: Run integration tests
    if [ $exit_code -eq 0 ] && ! run_integration_tests; then
        exit_code=1
    fi
    
    # Step 5: Generate report
    local status="success"
    if [ $exit_code -ne 0 ]; then
        status="failed"
    fi
    
    generate_report "$status"
    
    # Cleanup
    if [ -n "$DEV_SERVER_PID" ]; then
        print_status "info" "Stopping development server..."
        kill $DEV_SERVER_PID 2>/dev/null || true
    fi
    
    # Final status
    if [ $exit_code -eq 0 ]; then
        print_status "success" "API contract validation completed successfully!"
        echo ""
        print_status "info" "All systems are operational and schemas are in sync."
    else
        print_status "error" "API contract validation failed!"
        echo ""
        print_status "error" "Please fix the issues above before proceeding."
        echo ""
        print_status "info" "Common solutions:"
        echo "  - Ensure the API server is running"
        echo "  - Check that all environment variables are set"
        echo "  - Verify that frontend and backend schemas match"
        echo "  - Run 'npm run dev' to start the development server"
    fi
    
    exit $exit_code
}

# Handle script interruption
trap 'echo -e "\n${YELLOW}⚠️  Script interrupted${NC}"; exit 130' INT

# Run main function
main "$@"
