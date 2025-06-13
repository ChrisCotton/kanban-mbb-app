#!/bin/bash

# Regression Test Runner with Environment Setup
# This script ensures a clean, consistent test environment

set -e  # Exit on any error

echo "🧪 Starting Regression Test Suite"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Must be run from project root directory"
    exit 1
fi

# Parse command line arguments
UI_MODE=false
HEADED=false
DEBUG=false
SPECIFIC_TEST=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --ui)
            UI_MODE=true
            shift
            ;;
        --headed)
            HEADED=true
            shift
            ;;
        --debug)
            DEBUG=true
            shift
            ;;
        --test)
            SPECIFIC_TEST="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --ui      Run tests in Playwright UI mode"
            echo "  --headed  Run tests in headed browser mode"
            echo "  --debug   Run tests in debug mode"
            echo "  --test    Run specific test file"
            echo "  -h, --help Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Step 1: Environment cleanup
print_status "Step 1: Cleaning up environment..."
print_status "Killing any existing dev servers..."
pkill -f "next dev" || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

print_status "Clearing Next.js cache..."
rm -rf .next || true

print_success "Environment cleaned"

# Step 2: Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Step 2: Installing dependencies..."
    npm install
    print_success "Dependencies installed"
else
    print_status "Step 2: Dependencies already installed"
fi

# Step 3: Install Playwright browsers if needed
print_status "Step 3: Ensuring Playwright browsers are installed..."
npx playwright install --with-deps chromium
print_success "Playwright browsers ready"

# Step 4: Start development server
print_status "Step 4: Starting development server..."
npm run dev &
SERVER_PID=$!

# Wait for server to be ready
print_status "Waiting for server to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        print_success "Server is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "Server failed to start after 60 seconds"
        kill $SERVER_PID 2>/dev/null || true
        exit 1
    fi
    echo -n "."
    sleep 2
done

# Step 5: Run tests
print_status "Step 5: Running regression tests..."

# Build the test command
if [ -n "$SPECIFIC_TEST" ]; then
    TEST_FILE="$SPECIFIC_TEST"
else
    TEST_FILE="tests/e2e/task-description-update.spec.ts"
fi

TEST_CMD="npx playwright test $TEST_FILE"

if [ "$UI_MODE" = true ]; then
    TEST_CMD="$TEST_CMD --ui"
elif [ "$HEADED" = true ]; then
    TEST_CMD="$TEST_CMD --headed"
elif [ "$DEBUG" = true ]; then
    TEST_CMD="$TEST_CMD --debug"
fi

print_status "Running: $TEST_CMD"

# Run the tests
if $TEST_CMD; then
    print_success "All tests passed!"
    TEST_RESULT=0
else
    print_error "Some tests failed"
    TEST_RESULT=1
fi

# Step 6: Cleanup
print_status "Step 6: Cleaning up..."
print_status "Stopping development server..."
kill $SERVER_PID 2>/dev/null || true

# Wait a moment for graceful shutdown
sleep 2

# Force kill if still running
pkill -f "next dev" || true

print_success "Cleanup complete"

# Final status
echo "=================================="
if [ $TEST_RESULT -eq 0 ]; then
    print_success "🎉 Regression test suite completed successfully!"
else
    print_error "❌ Regression test suite failed"
fi
echo "=================================="

exit $TEST_RESULT 