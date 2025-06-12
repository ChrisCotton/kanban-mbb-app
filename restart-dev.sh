#!/bin/bash
# Quick restart for active development (stops when you stop script)
# ./restart-dev.sh
# 
# Start server and leave it running (script exits, server continues)
# ./restart-dev.sh -b
# 
# Get help on all options
# ./restart-dev.sh -h
#
#######################################################################                                                                       
# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Project directory
PROJECT_DIR="$HOME/Learn/AI/MBB_Kanban/MBB_Kanban_cursor/kanban-mbb-app"

# Default mode
BACKGROUND_MODE=false

# Function to show usage
show_usage() {
    echo -e "${CYAN}Usage: $0 [OPTIONS]${NC}"
    echo -e "${CYAN}Options:${NC}"
    echo -e "  ${YELLOW}-b, --background${NC}    Run dev server in background (script exits, server continues)"
    echo -e "  ${YELLOW}-f, --foreground${NC}    Run dev server in foreground (default - stopping script stops server)"
    echo -e "  ${YELLOW}-h, --help${NC}          Show this help message"
    echo ""
    echo -e "${CYAN}Examples:${NC}"
    echo -e "  ${GREEN}./restart-dev.sh${NC}              # Foreground mode (default)"
    echo -e "  ${GREEN}./restart-dev.sh -f${NC}           # Foreground mode (explicit)"
    echo -e "  ${GREEN}./restart-dev.sh -b${NC}           # Background mode"
    echo -e "  ${GREEN}./restart-dev.sh --background${NC}  # Background mode (long form)"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -b|--background)
            BACKGROUND_MODE=true
            shift
            ;;
        -f|--foreground)
            BACKGROUND_MODE=false
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            show_usage
            exit 1
            ;;
    esac
done

# Show mode
if [ "$BACKGROUND_MODE" = true ]; then
    echo -e "${BLUE}🔄 Restarting Kanban Dev Server (Background Mode)...${NC}"
    echo -e "${CYAN}ℹ️  Server will continue running after script exits${NC}"
else
    echo -e "${BLUE}🔄 Restarting Kanban Dev Server (Foreground Mode)...${NC}"
    echo -e "${CYAN}ℹ️  Use Ctrl+C to stop both script and server${NC}"
fi

# Change to project directory
echo -e "${YELLOW}📂 Changing to project directory...${NC}"
cd "$PROJECT_DIR" || {
    echo -e "${RED}❌ Error: Could not change to project directory: $PROJECT_DIR${NC}"
    exit 1
}

echo -e "${YELLOW}💀 Killing existing Next.js dev servers...${NC}"

# Kill Next.js dev processes
pkill -f "next dev" 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Killed Next.js dev processes${NC}"
else
    echo -e "${YELLOW}⚠️  No Next.js dev processes found${NC}"
fi

# Kill any processes on port 3000
PORT_PIDS=$(lsof -ti:3000 2>/dev/null)
if [ ! -z "$PORT_PIDS" ]; then
    echo "$PORT_PIDS" | xargs kill -9 2>/dev/null
    echo -e "${GREEN}✅ Killed processes on port 3000${NC}"
else
    echo -e "${YELLOW}⚠️  No processes found on port 3000${NC}"
fi

# Wait a moment for processes to fully terminate
sleep 2

echo -e "${YELLOW}🚀 Starting fresh dev server...${NC}"

# Start the dev server based on mode
if [ "$BACKGROUND_MODE" = true ]; then
    # Background mode - server continues after script exits
    nohup npm run dev > dev-server.log 2>&1 &
    DEV_PID=$!
    
    # Wait a moment to check if it started successfully
    sleep 3
    
    if kill -0 $DEV_PID 2>/dev/null; then
        echo -e "${GREEN}✅ Dev server started in background (PID: $DEV_PID)${NC}"
        echo -e "${BLUE}🌐 Server should be available at: http://localhost:3000${NC}"
        echo -e "${CYAN}📋 Logs are being written to: dev-server.log${NC}"
        echo -e "${CYAN}🛑 To stop the server later, run: pkill -f 'next dev'${NC}"
        echo -e "${GREEN}✅ Script complete - dev server continues running${NC}"
    else
        echo -e "${RED}❌ Failed to start dev server in background${NC}"
        exit 1
    fi
else
    # Foreground mode - script controls server lifecycle
    echo -e "${CYAN}📋 Running in foreground - press Ctrl+C to stop server${NC}"
    npm run dev
    echo -e "${YELLOW}⚠️  Dev server stopped${NC}"
fi 
