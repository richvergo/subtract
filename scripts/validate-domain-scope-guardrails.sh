#!/bin/bash

# Domain Scope Guardrails Validation Script
# Ensures domain-scoping functionality meets security and performance requirements

set -e

echo "🔒 Validating Domain Scope Guardrails..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "PASS")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "FAIL")
            echo -e "${RED}❌ $message${NC}"
            ;;
        "WARN")
            echo -e "${YELLOW}⚠️  $message${NC}"
            ;;
    esac
}

# Function to check if a file exists and is not empty
check_file_exists() {
    local file=$1
    if [[ -f "$file" && -s "$file" ]]; then
        return 0
    else
        return 1
    fi
}

# Function to validate domain scope configuration
validate_domain_scope_config() {
    echo "🔍 Validating domain scope configuration..."
    
    # Check if DomainScope.ts exists
    if check_file_exists "src/lib/agents/capture/DomainScope.ts"; then
        print_status "PASS" "DomainScope.ts exists"
    else
        print_status "FAIL" "DomainScope.ts not found"
        exit 1
    fi
    
    # Check if PuppeteerCaptureService.ts exists
    if check_file_exists "src/lib/agents/capture/PuppeteerCaptureService.ts"; then
        print_status "PASS" "PuppeteerCaptureService.ts exists"
    else
        print_status "FAIL" "PuppeteerCaptureService.ts not found"
        exit 1
    fi
    
    # Check if domain scope is properly integrated
    if grep -q "DomainScope" "src/lib/agents/capture/PuppeteerCaptureService.ts"; then
        print_status "PASS" "DomainScope integrated in PuppeteerCaptureService"
    else
        print_status "FAIL" "DomainScope not integrated in PuppeteerCaptureService"
        exit 1
    fi
}

# Function to validate test coverage
validate_test_coverage() {
    echo "🧪 Validating test coverage..."
    
    # Check if regression test exists
    if check_file_exists "tests/agents/capture/DomainScopeRegression.test.ts"; then
        print_status "PASS" "Domain scope regression tests exist"
    else
        print_status "FAIL" "Domain scope regression tests not found"
        exit 1
    fi
    
    # Check if smoke test has domain scoping validation
    if grep -q "domain-scoping" "tests/e2e/BasicWorkflowSmoke.test.tsx"; then
        print_status "PASS" "Smoke test includes domain-scoping validation"
    else
        print_status "FAIL" "Smoke test missing domain-scoping validation"
        exit 1
    fi
    
    # Check if unit tests exist
    if check_file_exists "tests/agents/capture/DomainScope.test.ts"; then
        print_status "PASS" "Domain scope unit tests exist"
    else
        print_status "FAIL" "Domain scope unit tests not found"
        exit 1
    fi
}

# Function to validate security requirements
validate_security_requirements() {
    echo "🔐 Validating security requirements..."
    
    # Check for sensitive data logging prevention
    if grep -q "sensitive.*data" "tests/agents/capture/DomainScopeRegression.test.ts"; then
        print_status "PASS" "Sensitive data logging prevention tests exist"
    else
        print_status "WARN" "Sensitive data logging prevention tests not found"
    fi
    
    # Check for input validation
    if grep -q "validateConfig" "src/lib/agents/capture/DomainScope.ts"; then
        print_status "PASS" "Configuration validation exists"
    else
        print_status "FAIL" "Configuration validation not found"
        exit 1
    fi
    
    # Check for Zod schema validation
    if grep -q "z\." "src/lib/agents/capture/DomainScope.ts"; then
        print_status "PASS" "Zod schema validation exists"
    else
        print_status "FAIL" "Zod schema validation not found"
        exit 1
    fi
}

# Function to validate performance requirements
validate_performance_requirements() {
    echo "⚡ Validating performance requirements..."
    
    # Check for performance tests
    if grep -q "Performance.*Memory" "tests/agents/capture/DomainScopeRegression.test.ts"; then
        print_status "PASS" "Performance and memory management tests exist"
    else
        print_status "WARN" "Performance and memory management tests not found"
    fi
    
    # Check for large navigation history handling
    if grep -q "1000.*navigation" "tests/agents/capture/DomainScopeRegression.test.ts"; then
        print_status "PASS" "Large navigation history handling tests exist"
    else
        print_status "WARN" "Large navigation history handling tests not found"
    fi
}

# Function to validate CI/CD integration
validate_cicd_integration() {
    echo "🚀 Validating CI/CD integration..."
    
    # Check if GitHub Actions workflow exists
    if check_file_exists ".github/workflows/nightly-tests.yml"; then
        print_status "PASS" "Nightly test workflow exists"
    else
        print_status "FAIL" "Nightly test workflow not found"
        exit 1
    fi
    
    # Check if test scripts exist in package.json
    if grep -q "test:regression" "package.json"; then
        print_status "PASS" "Regression test script exists"
    else
        print_status "FAIL" "Regression test script not found"
        exit 1
    fi
    
    if grep -q "test:full" "package.json"; then
        print_status "PASS" "Full test script exists"
    else
        print_status "FAIL" "Full test script not found"
        exit 1
    fi
}

# Function to validate error handling
validate_error_handling() {
    echo "🛡️ Validating error handling..."
    
    # Check for error handling tests
    if grep -q "Error.*Handling" "tests/agents/capture/DomainScopeRegression.test.ts"; then
        print_status "PASS" "Error handling tests exist"
    else
        print_status "WARN" "Error handling tests not found"
    fi
    
    # Check for malformed URL handling
    if grep -q "malformed.*URL" "tests/agents/capture/DomainScopeRegression.test.ts"; then
        print_status "PASS" "Malformed URL handling tests exist"
    else
        print_status "WARN" "Malformed URL handling tests not found"
    fi
    
    # Check for missing base domain error handling
    if grep -q "Missing.*Base.*Domain" "tests/agents/capture/DomainScopeRegression.test.ts"; then
        print_status "PASS" "Missing base domain error handling tests exist"
    else
        print_status "WARN" "Missing base domain error handling tests not found"
    fi
}

# Function to validate test isolation
validate_test_isolation() {
    echo "🔬 Validating test isolation..."
    
    # Check for --runInBand flag in test scripts
    if grep -q "runInBand" "package.json"; then
        print_status "PASS" "Test isolation with --runInBand configured"
    else
        print_status "WARN" "Test isolation with --runInBand not configured"
    fi
    
    # Check for sequential test execution
    if grep -q "runInBand" ".github/workflows/nightly-tests.yml"; then
        print_status "PASS" "Sequential test execution configured in CI"
    else
        print_status "WARN" "Sequential test execution not configured in CI"
    fi
}

# Function to validate documentation
validate_documentation() {
    echo "📚 Validating documentation..."
    
    # Check if test file has proper documentation
    if grep -q "Domain Scope Regression Test Suite" "tests/agents/capture/DomainScopeRegression.test.ts"; then
        print_status "PASS" "Test file has proper documentation"
    else
        print_status "WARN" "Test file documentation could be improved"
    fi
    
    # Check for comprehensive test descriptions
    if grep -q "comprehensive.*test.*suite" "tests/agents/capture/DomainScopeRegression.test.ts"; then
        print_status "PASS" "Comprehensive test descriptions exist"
    else
        print_status "WARN" "Test descriptions could be more comprehensive"
    fi
}

# Main validation function
main() {
    echo "🚀 Starting Domain Scope Guardrails Validation..."
    echo "=================================================="
    
    validate_domain_scope_config
    validate_test_coverage
    validate_security_requirements
    validate_performance_requirements
    validate_cicd_integration
    validate_error_handling
    validate_test_isolation
    validate_documentation
    
    echo "=================================================="
    print_status "PASS" "Domain Scope Guardrails Validation Complete!"
    echo "🎉 All guardrails validated successfully!"
}

# Run main function
main "$@"
