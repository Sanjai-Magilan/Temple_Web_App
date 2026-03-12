#!/bin/bash

###############################################################################
# k6 Load Testing Suite - Complete Setup Verification
# 
# Run this script to verify your k6 testing environment is ready.
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

print_header() {
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════╗"
    echo "║      k6 Load Testing Suite - Setup Verification       ║"
    echo "╚════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_section() {
    echo ""
    echo -e "${BLUE}━━━ $1 ━━━${NC}"
}

check_pass() {
    echo -e "${GREEN}✓${NC} $1"
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((ERRORS++))
}

print_header

# Check 1: k6 Installation
print_section "Checking k6 Installation"
if command -v k6 &> /dev/null; then
    VERSION=$(k6 version | head -n1)
    check_pass "k6 is installed: $VERSION"
else
    check_fail "k6 is NOT installed"
    echo -e "${YELLOW}  Install with:${NC}"
    echo "    Linux: sudo apt-get install k6"
    echo "    macOS: brew install k6"
    echo "    Windows: choco install k6"
fi

# Check 2: Test Files
print_section "Checking Test Files"
if [ -f "load-test.js" ]; then
    check_pass "load-test.js found"
else
    check_fail "load-test.js not found"
fi

if [ -f "config.js" ]; then
    check_pass "config.js found"
else
    check_fail "config.js not found"
fi

if [ -f "utils/helpers.js" ]; then
    check_pass "utils/helpers.js found"
else
    check_fail "utils/helpers.js not found"
fi

if [ -f "scenarios/authenticated.js" ]; then
    check_pass "Scenario files found"
else
    check_fail "Scenario files not found"
fi

# Check 3: Scripts
print_section "Checking Scripts"
if [ -x "run-tests.sh" ]; then
    check_pass "run-tests.sh is executable"
else
    check_warn "run-tests.sh is not executable (run: chmod +x run-tests.sh)"
fi

if [ -x "monitor-db.sh" ]; then
    check_pass "monitor-db.sh is executable"
else
    check_warn "monitor-db.sh is not executable (run: chmod +x monitor-db.sh)"
fi

# Check 4: Documentation
print_section "Checking Documentation"
DOCS=("README.md" "GETTING_STARTED.md" "QUICK_REFERENCE.md" "SUMMARY.md" "ARCHITECTURE.md" "INDEX.md")
DOC_COUNT=0
for doc in "${DOCS[@]}"; do
    if [ -f "$doc" ]; then
        ((DOC_COUNT++))
    fi
done

if [ $DOC_COUNT -eq ${#DOCS[@]} ]; then
    check_pass "All documentation files found ($DOC_COUNT/${#DOCS[@]})"
else
    check_warn "Some documentation files missing ($DOC_COUNT/${#DOCS[@]})"
fi

# Check 5: Application
print_section "Checking Application"
BASE_URL="${BASE_URL:-http://localhost:3002}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "302" ]; then
    check_pass "Application is running at $BASE_URL (HTTP $HTTP_CODE)"
else
    check_fail "Application is NOT accessible at $BASE_URL (HTTP $HTTP_CODE)"
    echo -e "${YELLOW}  Start your application with: npm start${NC}"
fi

# Check 6: Database
print_section "Checking Database"
if command -v mysql &> /dev/null; then
    check_pass "MySQL client is installed"
    
    # Try to connect (this will fail if creds are wrong, but we check the command exists)
    DB_HOST="${DB_HOST:-localhost}"
    DB_USER="${DB_USER:-root}"
    
    if mysql -h $DB_HOST -u $DB_USER -e "SELECT 1" &> /dev/null; then
        check_pass "Database is accessible"
    else
        check_warn "Cannot connect to database (credentials may be incorrect)"
        echo -e "${YELLOW}  Set DB credentials: export DB_USER=... DB_PASSWORD=...${NC}"
    fi
else
    check_warn "MySQL client not installed (needed for monitor-db.sh)"
    echo -e "${YELLOW}  Install with: sudo apt-get install mysql-client${NC}"
fi

# Check 7: Node.js
print_section "Checking Node.js Environment"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    check_pass "Node.js is installed: $NODE_VERSION"
else
    check_warn "Node.js not found in PATH"
fi

if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    check_pass "npm is installed: $NPM_VERSION"
else
    check_warn "npm not found in PATH"
fi

# Check 8: Configuration
print_section "Checking Configuration"
if grep -q "testuser@example.com" config.js; then
    check_warn "Using default test credentials (testuser@example.com)"
    echo -e "${YELLOW}  Update credentials in config.js if needed${NC}"
else
    check_pass "Custom test credentials configured"
fi

# Check 9: Environment
print_section "Checking Environment Variables"
if [ -z "$BASE_URL" ]; then
    check_pass "BASE_URL not set (will use default: http://localhost:3002)"
else
    check_pass "BASE_URL is set: $BASE_URL"
fi

if [ -f "../.env" ]; then
    check_pass ".env file found in root directory"
elif [ -f ".env" ]; then
    check_pass ".env file found in k6-tests directory"
else
    check_warn "No .env file found (optional - use .env.example as template)"
fi

# Summary
echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                    Verification Summary                ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ Perfect! Your environment is fully ready for load testing!${NC}"
    echo ""
    echo -e "${CYAN}Next steps:${NC}"
    echo "  1. Run your first test: ./run-tests.sh"
    echo "  2. Or use npm: npm run loadtest:smoke"
    echo "  3. Read GETTING_STARTED.md for guidance"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ Setup is mostly ready with $WARNINGS warning(s)${NC}"
    echo -e "${YELLOW}You can proceed, but consider fixing warnings for best experience.${NC}"
    echo ""
    echo -e "${CYAN}Next steps:${NC}"
    echo "  1. Review warnings above"
    echo "  2. Run test: ./run-tests.sh"
else
    echo -e "${RED}✗ Setup has $ERRORS error(s) and $WARNINGS warning(s)${NC}"
    echo -e "${RED}Please fix errors before running tests.${NC}"
    echo ""
    echo -e "${CYAN}Common fixes:${NC}"
    echo "  - Install k6: sudo apt-get install k6 (or brew install k6)"
    echo "  - Start application: npm start"
    echo "  - Check file permissions: chmod +x *.sh"
fi

echo ""
echo -e "${BLUE}Documentation:${NC}"
echo "  • Quick Start:  GETTING_STARTED.md"
echo "  • Full Docs:    README.md"
echo "  • Commands:     QUICK_REFERENCE.md"
echo "  • Overview:     INDEX.md"
echo ""

# Exit with appropriate code
if [ $ERRORS -gt 0 ]; then
    exit 1
else
    exit 0
fi
