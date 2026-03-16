#!/bin/bash

###############################################################################
# Test Runner for Session-Based Authentication
# 
# This script verifies that the k6 load test improvements work correctly
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}k6 Session Auth Test Runner${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Load environment variables
if [ -f .env ]; then
    set -a
    source .env
    set +a
    echo -e "${GREEN}✓${NC} Loaded .env configuration"
else
    echo -e "${YELLOW}⚠${NC}  No .env file found, using defaults"
fi

BASE_URL="${BASE_URL:-http://localhost:3002}"
TEST_USER_EMAIL="${TEST_USER_EMAIL:-testuser@example.com}"

echo -e "   Target: ${BASE_URL}"
echo -e "   User: ${TEST_USER_EMAIL}"
echo ""

# Step 1: Check if application is running
echo -e "${BLUE}Step 1: Checking if application is running...${NC}"
if curl -s -f -o /dev/null --max-time 5 "$BASE_URL"; then
    echo -e "${GREEN}✓${NC} Application is reachable at $BASE_URL"
else
    echo -e "${RED}✗${NC} Application is not reachable at $BASE_URL"
    echo -e "   Please start your application first:"
    echo -e "   ${YELLOW}npm start${NC} (or) ${YELLOW}docker-compose up${NC}"
    exit 1
fi
echo ""

# Step 2: Check if k6 is installed
echo -e "${BLUE}Step 2: Checking k6 installation...${NC}"
if command -v k6 &> /dev/null; then
    K6_VERSION=$(k6 version | head -1)
    echo -e "${GREEN}✓${NC} k6 is installed: $K6_VERSION"
else
    echo -e "${RED}✗${NC} k6 is not installed"
    echo -e "   Install k6: ${YELLOW}https://k6.io/docs/getting-started/installation/${NC}"
    exit 1
fi
echo ""

# Step 3: Run example script (quick test)
echo -e "${BLUE}Step 3: Running session auth example (30s)...${NC}"
echo -e "${YELLOW}This tests the improved session handling${NC}"
echo ""

if k6 run \
    -e BASE_URL="$BASE_URL" \
    -e TEST_USER_EMAIL="$TEST_USER_EMAIL" \
    -e TEST_USER_PASSWORD="$TEST_USER_PASSWORD" \
    --quiet \
    examples/session-auth-example.js 2>&1 | tee /tmp/k6-test-output.log; then
    
    echo ""
    echo -e "${GREEN}✓${NC} Example test completed successfully"
    
    # Check for good metrics
    if grep -q "checks.*9[0-9]\." /tmp/k6-test-output.log || \
       grep -q "checks.*100\.0%" /tmp/k6-test-output.log; then
        echo -e "${GREEN}✓${NC} Check pass rate > 90%"
    else
        echo -e "${YELLOW}⚠${NC}  Check pass rate may be low - review output above"
    fi
else
    echo ""
    echo -e "${RED}✗${NC} Example test failed"
    echo -e "   Review the output above for details"
    exit 1
fi
echo ""

# Step 4: Quick smoke test
echo -e "${BLUE}Step 4: Running smoke test...${NC}"
echo ""

if k6 run \
    -e BASE_URL="$BASE_URL" \
    -e SCENARIO=smoke \
    --quiet \
    load-test.js; then
    
    echo ""
    echo -e "${GREEN}✓${NC} Smoke test passed"
else
    echo ""
    echo -e "${RED}✗${NC} Smoke test failed"
    echo -e "   This may indicate issues with your test setup"
    exit 1
fi
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ All tests completed successfully!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Next steps:"
echo -e "  1. Run load test: ${YELLOW}k6 run -e SCENARIO=load load-test.js${NC}"
echo -e "  2. Review docs:   ${YELLOW}cat SESSION_AUTH_GUIDE.md${NC}"
echo -e "  3. Check metrics: Look for checks > 95%, http_req_failed < 1%"
echo ""
echo -e "For more options: ${YELLOW}cat QUICK_REFERENCE.md${NC}"
echo ""

# Cleanup
rm -f /tmp/k6-test-output.log
