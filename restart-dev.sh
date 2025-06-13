#!/bin/bash
# Quick restart for active development (stops when you stop script)
# ./restart-dev.sh
# 
#
## Background mode with process display (your original request)
# ./restart-dev.sh -b
#
# Just check server status without restarting
# ./restart-dev.sh -s
#
# Foreground mode (now also shows initial process status)
# ./restart-dev.sh -f
#
# Show help with all options
# ./restart-dev.sh -h
#
#######################################################################                                                                       
# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Project directory
PROJECT_DIR="$HOME/Learn/AI/MBB_Kanban/MBB_Kanban_cursor/kanban-mbb-app"

# Default mode
BACKGROUND_MODE=false
STATUS_ONLY=false

# Function to show running server processes
show_server_processes() {
    echo -e "${CYAN}🔍 Checking for running server processes...${NC}"
    
    # Check for Next.js dev processes
    NEXT_PROCESSES=$(ps aux | grep -E "next dev|npm run dev" | grep -v grep)
    if [ ! -z "$NEXT_PROCESSES" ]; then
        echo -e "${GREEN}📋 Next.js dev processes:${NC}"
        echo "$NEXT_PROCESSES" | while read line; do
            echo -e "${YELLOW}  $line${NC}"
        done
    fi
    
    # Check for processes on port 3000
    PORT_PROCESSES=$(lsof -i:3000 2>/dev/null)
    if [ ! -z "$PORT_PROCESSES" ]; then
        echo -e "${GREEN}🌐 Processes on port 3000:${NC}"
        echo "$PORT_PROCESSES" | while read line; do
            echo -e "${YELLOW}  $line${NC}"
        done
    else
        echo -e "${YELLOW}⚠️  No processes found on port 3000${NC}"
    fi
    
    # Check if port 3000 is responding
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Server is responding on http://localhost:3000${NC}"
    else
        echo -e "${YELLOW}⚠️  Server not yet responding on http://localhost:3000${NC}"
    fi
}

# Function to show dev server logs hyperlink
show_logs_hyperlink() {
    local log_file="$1"
    local full_path="$PROJECT_DIR/$log_file"
    
    echo -e "${PURPLE}📄 Dev Server Logs:${NC}"
    
    # Check if we're in a terminal that supports hyperlinks (iTerm2, some terminals)
    if [[ "$TERM_PROGRAM" == "iTerm.app" ]] || [[ "$TERM" == *"xterm"* ]]; then
        # Create a clickable hyperlink using OSC 8 escape sequence
        echo -e "${CYAN}   📎 Click to open logs: \033]8;;file://$full_path\033\\$log_file\033]8;;\033\\${NC}"
    else
        echo -e "${CYAN}   📁 Log file location: $log_file${NC}"
    fi
    
    # Also provide command to tail the logs
    echo -e "${CYAN}   🔍 To follow logs: ${YELLOW}tail -f $log_file${NC}"
    echo -e "${CYAN}   📖 To view logs: ${YELLOW}cat $log_file${NC}"
    echo ""
}

# Function to show usage
show_usage() {
    echo -e "${CYAN}Usage: $0 [OPTIONS]${NC}"
    echo -e "${CYAN}Options:${NC}"
    echo -e "  ${YELLOW}-b, --background${NC}    Run dev server in background (script exits, server continues)"
    echo -e "  ${YELLOW}-f, --foreground${NC}    Run dev server in foreground (default - stopping script stops server)"
    echo -e "  ${YELLOW}-s, --status${NC}        Show running server processes without restarting"
    echo -e "  ${YELLOW}-h, --help${NC}          Show this help message"
    echo ""
    echo -e "${CYAN}Examples:${NC}"
    echo -e "  ${GREEN}./restart-dev.sh${NC}              # Foreground mode (default)"
    echo -e "  ${GREEN}./restart-dev.sh -f${NC}           # Foreground mode (explicit)"
    echo -e "  ${GREEN}./restart-dev.sh -b${NC}           # Background mode"
    echo -e "  ${GREEN}./restart-dev.sh -s${NC}           # Just show server status"
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
        -s|--status)
            STATUS_ONLY=true
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

# Handle status-only mode
if [ "$STATUS_ONLY" = true ]; then
    echo -e "${BLUE}🔍 Checking Kanban Dev Server Status...${NC}"
    
    # Change to project directory
    echo -e "${YELLOW}📂 Changing to project directory...${NC}"
    cd "$PROJECT_DIR" || {
        echo -e "${RED}❌ Error: Could not change to project directory: $PROJECT_DIR${NC}"
        exit 1
    }
    
    # Show running processes and exit
    show_server_processes
    exit 0
fi

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
    # Show logs hyperlink before starting background server
    show_logs_hyperlink "dev-server.log"
    
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
        echo ""
        
        # Show running processes
        show_server_processes
        
        echo ""
        echo -e "${GREEN}✅ Script complete - dev server continues running${NC}"
    else
        echo -e "${RED}❌ Failed to start dev server in background${NC}"
        exit 1
    fi
else
    # Foreground mode - script controls server lifecycle
    echo -e "${CYAN}📋 Running in foreground - press Ctrl+C to stop server${NC}"
    echo ""
    
    # Show initial process status
    show_server_processes
    
    echo ""
    
    # Show logs info for foreground mode (logs will be displayed directly in terminal)
    echo -e "${PURPLE}📄 Dev Server Logs:${NC}"
    echo -e "${CYAN}   📺 Logs will be displayed directly in this terminal${NC}"
    echo -e "${CYAN}   🔍 To save logs to file, use: ${YELLOW}npm run dev 2>&1 | tee dev-server.log${NC}"
    echo ""
    
    echo -e "${CYAN}🚀 Starting dev server in foreground...${NC}"
    npm run dev
    echo -e "${YELLOW}⚠️  Dev server stopped${NC}"
fi 
