#!/bin/bash
# ==============================================
# KubeAtlas Quick Start Script
# ==============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════╗"
echo "║           KubeAtlas Quick Start                       ║"
echo "║    Kubernetes Inventory & Asset Management            ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check prerequisites
check_prereqs() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"
    
    local missing=()
    
    if ! command -v docker &> /dev/null; then
        missing+=("docker")
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        missing+=("docker-compose")
    fi
    
    if [ ${#missing[@]} -ne 0 ]; then
        echo -e "${RED}Missing prerequisites: ${missing[*]}${NC}"
        echo "Please install them and try again."
        exit 1
    fi
    
    echo -e "${GREEN}✓ All prerequisites met${NC}"
}

# Start services
start_services() {
    echo -e "\n${YELLOW}Starting services...${NC}"
    
    if docker compose version &> /dev/null 2>&1; then
        docker compose -f docker-compose.dev.yml up -d
    else
        docker-compose -f docker-compose.dev.yml up -d
    fi
    
    echo -e "${GREEN}✓ Services started${NC}"
}

# Wait for services
wait_for_services() {
    echo -e "\n${YELLOW}Waiting for services to be ready...${NC}"
    
    local max_attempts=60
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s http://localhost:8080/health > /dev/null 2>&1; then
            echo -e "${GREEN}✓ API is ready${NC}"
            break
        fi
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    
    if [ $attempt -eq $max_attempts ]; then
        echo -e "\n${RED}Timeout waiting for services${NC}"
        echo "Check logs with: docker-compose -f docker-compose.dev.yml logs"
        exit 1
    fi
}

# Initialize database
init_database() {
    echo -e "\n${YELLOW}Initializing database...${NC}"
    
    # Wait for PostgreSQL
    sleep 5
    
    # Run schema and seed
    if docker compose version &> /dev/null 2>&1; then
        docker compose -f docker-compose.dev.yml exec -T postgres psql -U kubeatlas -d kubeatlas < database/schema.sql 2>/dev/null || true
        docker compose -f docker-compose.dev.yml exec -T postgres psql -U kubeatlas -d kubeatlas < database/seed.sql 2>/dev/null || true
    else
        docker-compose -f docker-compose.dev.yml exec -T postgres psql -U kubeatlas -d kubeatlas < database/schema.sql 2>/dev/null || true
        docker-compose -f docker-compose.dev.yml exec -T postgres psql -U kubeatlas -d kubeatlas < database/seed.sql 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✓ Database initialized${NC}"
}

# Print summary
print_summary() {
    echo -e "\n${GREEN}╔═══════════════════════════════════════════════════════╗"
    echo "║           KubeAtlas is Ready!                         ║"
    echo "╚═══════════════════════════════════════════════════════╝${NC}"
    
    echo -e "\n${BLUE}Access:${NC}"
    echo "  URL:      http://localhost:3000"
    echo "  Email:    admin@kubeatlas.local"
    echo "  Password: admin123"
    
    echo -e "\n${BLUE}Services:${NC}"
    echo "  Frontend: http://localhost:3000"
    echo "  API:      http://localhost:8080"
    echo "  Postgres: localhost:5432"
    
    echo -e "\n${BLUE}Useful commands:${NC}"
    echo "  # View logs"
    echo "  docker-compose -f docker-compose.dev.yml logs -f"
    echo ""
    echo "  # Stop services"
    echo "  docker-compose -f docker-compose.dev.yml down"
    echo ""
    echo "  # Restart services"
    echo "  docker-compose -f docker-compose.dev.yml restart"
    
    echo -e "\n${YELLOW}⚠ Remember to change the admin password!${NC}"
}

# Main
main() {
    check_prereqs
    start_services
    wait_for_services
    init_database
    print_summary
}

main "$@"
