#!/bin/bash

###############################################################################
# Database Monitoring Script for Load Tests
# 
# Run this in a separate terminal while your load tests are running
# to monitor database performance in real-time.
#
# Usage: ./monitor-db.sh [interval_seconds]
# Example: ./monitor-db.sh 5  (monitor every 5 seconds)
###############################################################################

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_HOST="${DB_HOST:-localhost}"
INTERVAL=${1:-5}  # Default 5 seconds

# Function to print colored header
print_header() {
    clear
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}   Database Performance Monitor${NC}"
    echo -e "${CYAN}   Refreshing every ${INTERVAL}s${NC}"
    echo -e "${CYAN}   Press Ctrl+C to stop${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""
    echo -e "${BLUE}Time: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
    echo ""
}

# Function to get database stats
get_db_stats() {
    # Build MySQL command
    MYSQL_CMD="mysql -h $DB_HOST -u $DB_USER"
    if [ -n "$DB_PASSWORD" ]; then
        MYSQL_CMD="$MYSQL_CMD -p$DB_PASSWORD"
    fi
    
    print_header
    
    # Connection Statistics
    echo -e "${YELLOW}=== Connection Statistics ===${NC}"
    $MYSQL_CMD -e "
        SHOW STATUS WHERE Variable_name IN (
            'Threads_connected',
            'Threads_running',
            'Max_used_connections',
            'Aborted_connects',
            'Aborted_clients'
        );
    " 2>/dev/null || echo -e "${RED}Failed to fetch connection stats${NC}"
    
    echo ""
    
    # Query Statistics
    echo -e "${YELLOW}=== Query Statistics ===${NC}"
    $MYSQL_CMD -e "
        SHOW STATUS WHERE Variable_name IN (
            'Queries',
            'Questions',
            'Slow_queries',
            'Com_select',
            'Com_insert',
            'Com_update',
            'Com_delete'
        );
    " 2>/dev/null || echo -e "${RED}Failed to fetch query stats${NC}"
    
    echo ""
    
    # Current Processes
    echo -e "${YELLOW}=== Active Connections (Top 10) ===${NC}"
    $MYSQL_CMD -e "
        SELECT 
            ID,
            USER,
            HOST,
            DB,
            COMMAND,
            TIME,
            STATE,
            LEFT(INFO, 60) as QUERY
        FROM information_schema.PROCESSLIST
        WHERE COMMAND != 'Sleep'
        ORDER BY TIME DESC
        LIMIT 10;
    " 2>/dev/null || echo -e "${RED}Failed to fetch process list${NC}"
    
    echo ""
    
    # InnoDB Statistics
    echo -e "${YELLOW}=== InnoDB Statistics ===${NC}"
    $MYSQL_CMD -e "
        SHOW STATUS WHERE Variable_name IN (
            'Innodb_buffer_pool_pages_free',
            'Innodb_buffer_pool_pages_total',
            'Innodb_buffer_pool_read_requests',
            'Innodb_buffer_pool_reads',
            'Innodb_row_lock_waits',
            'Innodb_rows_read',
            'Innodb_rows_inserted',
            'Innodb_rows_updated'
        );
    " 2>/dev/null || echo -e "${RED}Failed to fetch InnoDB stats${NC}"
    
    echo ""
    
    # Table Lock Statistics
    echo -e "${YELLOW}=== Lock Statistics ===${NC}"
    $MYSQL_CMD -e "
        SHOW STATUS WHERE Variable_name IN (
            'Table_locks_immediate',
            'Table_locks_waited'
        );
    " 2>/dev/null || echo -e "${RED}Failed to fetch lock stats${NC}"
    
    echo ""
    echo -e "${BLUE}Monitoring... (refreshing in ${INTERVAL}s)${NC}"
}

# Check if mysql client is installed
if ! command -v mysql &> /dev/null; then
    echo -e "${RED}Error: mysql client is not installed${NC}"
    echo -e "${YELLOW}Install with: sudo apt-get install mysql-client${NC}"
    exit 1
fi

# Check if database is accessible
MYSQL_TEST="mysql -h $DB_HOST -u $DB_USER"
if [ -n "$DB_PASSWORD" ]; then
    MYSQL_TEST="$MYSQL_TEST -p$DB_PASSWORD"
fi

if ! $MYSQL_TEST -e "SELECT 1;" &> /dev/null; then
    echo -e "${RED}Error: Cannot connect to database${NC}"
    echo -e "${YELLOW}Check your credentials:${NC}"
    echo -e "${YELLOW}  DB_HOST=$DB_HOST${NC}"
    echo -e "${YELLOW}  DB_USER=$DB_USER${NC}"
    echo ""
    echo -e "${YELLOW}Set environment variables:${NC}"
    echo -e "${YELLOW}  export DB_USER=your_user${NC}"
    echo -e "${YELLOW}  export DB_PASSWORD=your_password${NC}"
    echo -e "${YELLOW}  export DB_HOST=localhost${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Connected to database${NC}"
echo -e "${BLUE}Starting monitoring...${NC}"
sleep 2

# Monitor loop
while true; do
    get_db_stats
    sleep $INTERVAL
done
