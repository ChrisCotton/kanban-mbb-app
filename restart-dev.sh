#!/bin/bash
# Quick restart for active development
#
# Default mode (no options) - runs in foreground
# ./restart-dev.sh
#
# Follow-log mode (restarts server and tails log)
# ./restart-dev.sh -f
#
# Background mode with process display
# ./restart-dev.sh -b
#
# Just check server status without restarting
# ./restart-dev.sh -s
#
# Just kill the server without restarting
# ./restart-dev.sh -k
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
FOLLOW_MODE=false
KILL_ONLY=false

# Function to load environment variables from .env.local
load_environment_variables() {
    echo -e "${CYAN}🔧 Loading environment variables from .env.local...${NC}"
    
    if [ -f ".env.local" ]; then
        # Count lines in .env.local
        local env_count=$(grep -c "=" .env.local 2>/dev/null || echo "0")
        echo -e "${CYAN}   📄 Found .env.local with $env_count variables${NC}"
        
        # Source the file but also export the variables
        set -a  # Automatically export all variables
        source .env.local
        set +a  # Turn off automatic export
        
        # Verify key variables are loaded
        if [ ! -z "$NEXT_PUBLIC_SUPABASE_URL" ] && [ ! -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
            local url_preview="${NEXT_PUBLIC_SUPABASE_URL:0:30}..."
            local key_preview="${SUPABASE_SERVICE_ROLE_KEY:0:20}..."
            echo -e "${GREEN}   ✅ Supabase URL loaded: $url_preview${NC}"
            echo -e "${GREEN}   ✅ Service key loaded: $key_preview${NC}"
        else
            echo -e "${YELLOW}   ⚠️  Warning: Supabase variables may not be loaded${NC}"
            if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
                echo -e "${YELLOW}      - NEXT_PUBLIC_SUPABASE_URL is empty${NC}"
            fi
            if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
                echo -e "${YELLOW}      - SUPABASE_SERVICE_ROLE_KEY is empty${NC}"
            fi
        fi
        
        echo -e "${GREEN}   ✅ Environment variables loaded and exported${NC}"
    else
        echo -e "${RED}   ❌ Warning: .env.local file not found${NC}"
        echo -e "${YELLOW}   🔍 Make sure .env.local exists in the project root${NC}"
    fi
    echo ""
}

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

# Function to kill running server processes
kill_server_processes() {
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
}

# Function to show dev server logs hyperlink
show_logs_hyperlink() {
    local log_file="$1"
    local full_path="$PROJECT_DIR/$log_file"
    
    echo -e "${PURPLE}📄 Dev Server Logs: ${YELLOW}$log_file${NC}"
    
    # Provide simple, clean log file information
    echo -e "${CYAN}   📁 Log file: $log_file${NC}"
    echo -e "${CYAN}   📂 Full path: $full_path${NC}"
    
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
    echo -e "  ${YELLOW}-f, --follow${NC}        Restart server and tail the server log file"
    echo -e "  ${YELLOW}-k, --kill${NC}          Kill running server processes and exit"
    echo -e "  ${YELLOW}-s, --status${NC}        Show running server processes without restarting"
    echo -e "  ${YELLOW}-h, --help${NC}          Show this help message"
    echo ""
    echo -e "${CYAN}Default Action (no options):${NC}"
    echo -e "  Run dev server in foreground (stopping script stops server)"
    echo ""
    echo -e "${CYAN}Examples:${NC}"
    echo -e "  ${GREEN}./restart-dev.sh${NC}              # Foreground mode (default)"
    echo -e "  ${GREEN}./restart-dev.sh -f${NC}           # Restart server and follow logs"
    echo -e "  ${GREEN}./restart-dev.sh -b${NC}           # Background mode"
    echo -e "  ${GREEN}./restart-dev.sh -s${NC}           # Just show server status"
    echo -e "  ${GREEN}./restart-dev.sh -k${NC}           # Just kill the server"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -b|--background)
            BACKGROUND_MODE=true
            shift
            ;;
        -f|--follow)
            FOLLOW_MODE=true
            shift
            ;;
        -k|--kill)
            KILL_ONLY=true
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

# Change to project directory first
echo -e "${YELLOW}📂 Changing to project directory...${NC}"
cd "$PROJECT_DIR" || {
    echo -e "${RED}❌ Error: Could not change to project directory: $PROJECT_DIR${NC}"
    exit 1
}

# Load environment variables for all modes that might need them
if [ "$STATUS_ONLY" = false ] && [ "$KILL_ONLY" = false ]; then
    load_environment_variables
fi

# Handle modes that don't start a server
if [ "$STATUS_ONLY" = true ]; then
    echo -e "${BLUE}🔍 Checking Kanban Dev Server Status...${NC}"
    show_server_processes
    exit 0
fi

if [ "$KILL_ONLY" = true ]; then
    echo -e "${RED}🔪 Killing Kanban Dev Server...${NC}"
    kill_server_processes
    exit 0
fi

# For all other modes, we restart the server, which involves killing it first.
kill_server_processes

# Wait a moment for processes to fully terminate
sleep 2

echo -e "${YELLOW}🚀 Starting fresh dev server...${NC}"

# Start the dev server based on mode
if [ "$BACKGROUND_MODE" = true ]; then
    # Background mode
    echo -e "${BLUE}🔄 Restarting Kanban Dev Server (Background Mode)...${NC}"
    echo -e "${CYAN}ℹ️  Server will continue running after script exits${NC}"
    show_logs_hyperlink "dev-server.log"
    
    nohup npm run dev > dev-server.log 2>&1 &
    DEV_PID=$!
    
    sleep 3
    
    if kill -0 $DEV_PID 2>/dev/null; then
        echo -e "${GREEN}✅ Dev server started in background (PID: $DEV_PID)${NC}"
        echo -e "${BLUE}🌐 Server should be available at: http://localhost:3000${NC}"
        echo ""
        show_server_processes
        echo ""
        echo -e "${GREEN}✅ Script complete - dev server continues running${NC}"
    else
        echo -e "${RED}❌ Failed to start dev server in background${NC}"
        exit 1
    fi
elif [ "$FOLLOW_MODE" = true ]; then
    # Follow mode
    echo -e "${BLUE}🔄 Restarting Kanban Dev Server (Follow Mode)...${NC}"
    echo -e "${CYAN}ℹ️  Server will run in background, logs will be tailed here.${NC}"
    
    nohup npm run dev > dev-server.log 2>&1 &
    DEV_PID=$!
    
    echo -e "${CYAN}⏳ Waiting for server to start... (PID: $DEV_PID)${NC}"
    sleep 4 # Give it a moment
    
    if kill -0 $DEV_PID 2>/dev/null; then
        echo -e "${GREEN}✅ Dev server started successfully.${NC}"
        echo -e "${BLUE}🌐 Server should be available at: http://localhost:3000${NC}"
        echo -e "${CYAN}📋 Tailing logs now. Press Ctrl+C to stop viewing logs.${NC}"
        echo -e "${YELLOW}⚠️  Note: Stopping the log tail does NOT stop the server.${NC}"
        echo -e "${CYAN}🛑 To stop the server later, run: pkill -f 'next dev'${NC}"
        echo ""
        tail -f dev-server.log
    else
        echo -e "${RED}❌ Failed to start dev server.${NC}"
        echo -e "${YELLOW}📄 Checking log for errors:${NC}"
        cat dev-server.log
        exit 1
    fi
else
    # Foreground mode (default)
    echo -e "${BLUE}🔄 Restarting Kanban Dev Server (Foreground Mode)...${NC}"
    echo -e "${CYAN}ℹ️  Use Ctrl+C to stop both script and server${NC}"
    echo ""
    show_server_processes
    echo ""
    echo -e "${PURPLE}📄 Dev Server Logs:${NC}"
    echo -e "${CYAN}   📺 Logs will be displayed directly in this terminal${NC}"
    echo ""
    echo -e "${CYAN}🚀 Starting dev server in foreground...${NC}"
    npm run dev
    echo -e "${YELLOW}⚠️  Dev server stopped${NC}"
fi 
