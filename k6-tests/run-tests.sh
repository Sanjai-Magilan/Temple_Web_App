#!/bin/bash

###############################################################################
# k6 Load Test Runner Script
# 
# Quick commands to run various load tests against your application.
# Make this executable: chmod +x run-tests.sh
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
BASE_URL="${BASE_URL:-http://localhost:3002}"
TEST_USER_EMAIL="${TEST_USER_EMAIL:-testuser@example.com}"
TEST_USER_PASSWORD="${TEST_USER_PASSWORD:-Test@123}"
TEST_ADMIN_EMAIL="${TEST_ADMIN_EMAIL:-admin@example.com}"
TEST_ADMIN_PASSWORD="${TEST_ADMIN_PASSWORD:-Admin@123}"

# Function to print colored messages
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check if k6 is installed
check_k6() {
    if ! command -v k6 &> /dev/null; then
        print_message "$RED" "❌ k6 is not installed!"
        print_message "$YELLOW" "Install k6 first:"
        print_message "$YELLOW" "  - Linux: sudo apt-get install k6"
        print_message "$YELLOW" "  - macOS: brew install k6"
        print_message "$YELLOW" "  - Windows: choco install k6"
        exit 1
    fi
    print_message "$GREEN" "✓ k6 is installed: $(k6 version)"
}

# Function to check if application is running
check_app() {
    print_message "$BLUE" "Checking if application is running at $BASE_URL..."
    
    if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL" | grep -q "200\|302"; then
        print_message "$GREEN" "✓ Application is running"
    else
        print_message "$RED" "❌ Application is not responding at $BASE_URL"
        print_message "$YELLOW" "Please start your application first:"
        print_message "$YELLOW" "  npm start"
        exit 1
    fi
}

# Change to k6-tests directory
cd "$(dirname "$0")"

print_message "$BLUE" "================================="
print_message "$BLUE" "   k6 Load Test Runner"
print_message "$BLUE" "================================="
echo ""

# Check prerequisites
check_k6
check_app

echo ""
print_message "$BLUE" "Configuration:"
print_message "$BLUE" "  Base URL: $BASE_URL"
print_message "$BLUE" "  Test User: $TEST_USER_EMAIL"
echo ""

# Display menu
print_message "$YELLOW" "Select a test to run:"
echo ""
echo "  Quick Tests:"
echo "    1) Smoke Test (2 VUs, 30s) - Quick verification"
echo "    2) Light Load Test (5 VUs, 2m) - Development testing"
echo ""
echo "  Standard Tests:"
echo "    3) Load Test (10-20 VUs, 16m) - Normal load simulation"
echo "    4) Focused: Authenticated Users (10 VUs, 5m)"
echo "    5) Focused: API Heavy Operations (5 VUs, 5m)"
echo ""
echo "  Stress Tests:"
echo "    6) Stress Test (up to 100 VUs, 24m) - Find limits"
echo "    7) Spike Test (sudden 200 VUs) - Test resilience"
echo "    8) Soak Test (30 VUs, 30m) - Sustained load"
echo ""
echo "  Advanced:"
echo "    9) Multi-Scenario Test (10m) - Mixed load patterns"
echo "   10) Custom Test (enter parameters)"
echo ""
echo "    0) Exit"
echo ""

read -p "Enter your choice [0-10]: " choice

# Execute based on choice
case $choice in
    1)
        print_message "$GREEN" "Running Smoke Test..."
        k6 run -e BASE_URL="$BASE_URL" \
               -e TEST_USER_EMAIL="$TEST_USER_EMAIL" \
               -e TEST_USER_PASSWORD="$TEST_USER_PASSWORD" \
               -e SCENARIO=smoke \
               load-test.js
        ;;
    
    2)
        print_message "$GREEN" "Running Light Load Test..."
        k6 run -e BASE_URL="$BASE_URL" \
               -e TEST_USER_EMAIL="$TEST_USER_EMAIL" \
               -e TEST_USER_PASSWORD="$TEST_USER_PASSWORD" \
               --vus 5 \
               --duration 2m \
               load-test.js
        ;;
    
    3)
        print_message "$GREEN" "Running Load Test..."
        k6 run -e BASE_URL="$BASE_URL" \
               -e TEST_USER_EMAIL="$TEST_USER_EMAIL" \
               -e TEST_USER_PASSWORD="$TEST_USER_PASSWORD" \
               -e SCENARIO=load \
               load-test.js
        ;;
    
    4)
        print_message "$GREEN" "Running Focused Test: Authenticated Users..."
        k6 run -e BASE_URL="$BASE_URL" \
               -e TEST_USER_EMAIL="$TEST_USER_EMAIL" \
               -e TEST_USER_PASSWORD="$TEST_USER_PASSWORD" \
               -e TEST_TYPE=authenticated \
               -e VUS=10 \
               -e DURATION=5m \
               focused-test.js
        ;;
    
    5)
        print_message "$GREEN" "Running Focused Test: API Heavy Operations..."
        k6 run -e BASE_URL="$BASE_URL" \
               -e TEST_USER_EMAIL="$TEST_USER_EMAIL" \
               -e TEST_USER_PASSWORD="$TEST_USER_PASSWORD" \
               -e TEST_TYPE=api-heavy \
               -e VUS=5 \
               -e DURATION=5m \
               focused-test.js
        ;;
    
    6)
        print_message "$YELLOW" "⚠️  WARNING: This will generate significant load!"
        read -p "Continue? (y/N): " confirm
        if [[ $confirm =~ ^[Yy]$ ]]; then
            print_message "$GREEN" "Running Stress Test..."
            k6 run -e BASE_URL="$BASE_URL" \
                   -e TEST_USER_EMAIL="$TEST_USER_EMAIL" \
                   -e TEST_USER_PASSWORD="$TEST_USER_PASSWORD" \
                   -e SCENARIO=stress \
                   load-test.js
        else
            print_message "$YELLOW" "Stress test cancelled."
        fi
        ;;
    
    7)
        print_message "$YELLOW" "⚠️  WARNING: This will spike to 200 VUs!"
        read -p "Continue? (y/N): " confirm
        if [[ $confirm =~ ^[Yy]$ ]]; then
            print_message "$GREEN" "Running Spike Test..."
            k6 run -e BASE_URL="$BASE_URL" \
                   -e TEST_USER_EMAIL="$TEST_USER_EMAIL" \
                   -e TEST_USER_PASSWORD="$TEST_USER_PASSWORD" \
                   -e SCENARIO=spike \
                   load-test.js
        else
            print_message "$YELLOW" "Spike test cancelled."
        fi
        ;;
    
    8)
        print_message "$YELLOW" "⚠️  WARNING: This test runs for 30 minutes!"
        read -p "Continue? (y/N): " confirm
        if [[ $confirm =~ ^[Yy]$ ]]; then
            print_message "$GREEN" "Running Soak Test..."
            k6 run -e BASE_URL="$BASE_URL" \
                   -e TEST_USER_EMAIL="$TEST_USER_EMAIL" \
                   -e TEST_USER_PASSWORD="$TEST_USER_PASSWORD" \
                   -e SCENARIO=soak \
                   load-test.js
        else
            print_message "$YELLOW" "Soak test cancelled."
        fi
        ;;
    
    9)
        print_message "$GREEN" "Running Multi-Scenario Test..."
        k6 run -e BASE_URL="$BASE_URL" \
               -e TEST_USER_EMAIL="$TEST_USER_EMAIL" \
               -e TEST_USER_PASSWORD="$TEST_USER_PASSWORD" \
               -e TEST_ADMIN_EMAIL="$TEST_ADMIN_EMAIL" \
               -e TEST_ADMIN_PASSWORD="$TEST_ADMIN_PASSWORD" \
               multi-scenario-test.js
        ;;
    
    10)
        print_message "$BLUE" "Custom Test Configuration"
        read -p "Enter number of VUs: " vus
        read -p "Enter duration (e.g., 5m, 30s): " duration
        read -p "Enter test type (browsing/authenticated/api-heavy/admin): " test_type
        
        print_message "$GREEN" "Running custom test: $vus VUs for $duration, type: $test_type"
        k6 run -e BASE_URL="$BASE_URL" \
               -e TEST_USER_EMAIL="$TEST_USER_EMAIL" \
               -e TEST_USER_PASSWORD="$TEST_USER_PASSWORD" \
               -e TEST_TYPE="$test_type" \
               -e VUS="$vus" \
               -e DURATION="$duration" \
               focused-test.js
        ;;
    
    0)
        print_message "$BLUE" "Exiting..."
        exit 0
        ;;
    
    *)
        print_message "$RED" "Invalid choice!"
        exit 1
        ;;
esac

echo ""
print_message "$GREEN" "================================="
print_message "$GREEN" "   Test Complete!"
print_message "$GREEN" "================================="
echo ""
print_message "$BLUE" "Review the results above to check:"
print_message "$BLUE" "  ✓ http_req_duration (response times)"
print_message "$BLUE" "  ✓ http_req_failed (error rate)"
print_message "$BLUE" "  ✓ checks (validation pass rate)"
print_message "$BLUE" "  ✓ http_reqs (throughput)"
echo ""
