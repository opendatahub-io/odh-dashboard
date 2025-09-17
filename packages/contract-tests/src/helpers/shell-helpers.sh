#!/bin/bash

# Shared shell helper functions for contract testing scripts
# Source this file in your package's run-with-mock-bff.sh script

# Enable strict mode
set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "ℹ️  $1"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}


# Kill process on port if exists
kill_process_on_port() {
    local PORT="$1"
    
    local PIDS
    PIDS=$(lsof -ti:"$PORT" 2>/dev/null || true)
    if [[ -n "$PIDS" ]]; then
        log_warning "Port $PORT is in use, attempting graceful shutdown (SIGTERM)..."
        while IFS=$'\n' read -r PID; do
            [[ -z "$PID" ]] && continue
            [[ "$PID" =~ ^[0-9]+$ ]] || continue
            kill -15 "$PID" 2>/dev/null || true
        done <<< "$PIDS"
        sleep 2

        # Re-check and SIGKILL remaining processes if any
        PIDS=$(lsof -ti:"$PORT" 2>/dev/null || true)
        if [[ -n "$PIDS" ]]; then
            log_warning "Force killing remaining process(es) on port $PORT (SIGKILL)..."
            while IFS=$'\n' read -r PID; do
                [[ -z "$PID" ]] && continue
                [[ "$PID" =~ ^[0-9]+$ ]] || continue
                kill -9 "$PID" 2>/dev/null || true
            done <<< "$PIDS"
            sleep 1
        fi
    fi
}


# Display test results summary
display_test_summary() {
    local TEST_RUN_DIR="$1"
    
    log_info "Test Results Summary:"
    log_info "📂 Test Results Directory: $TEST_RUN_DIR"

    # Show test artifacts
    log_info "📋 Available test artifacts:"
    ls -la "$TEST_RUN_DIR" | grep -E "\.(html|log|xml)$" || echo "No artifacts found"

    # Show available logs
    log_info "📋 Available logs:"
    ls -la "$TEST_RUN_DIR"

    # Parse test results if available
    if grep -q "Test Suites:" "$TEST_RUN_DIR/contract-test-output.log" 2>/dev/null; then
        log_info "📊 Test Summary:"
        grep "Test Suites:" "$TEST_RUN_DIR/contract-test-output.log" | tail -1
        grep "Tests:" "$TEST_RUN_DIR/contract-test-output.log" | tail -1
    fi
}

# Open HTML report in browser
open_html_report() {
    local TEST_RUN_DIR="$1"
    local JEST_HTML_REPORT="$TEST_RUN_DIR/contract-test-report.html"
    
    if [[ -f "$JEST_HTML_REPORT" ]]; then
        log_info "📊 Opening Jest HTML report..."
        if command -v open >/dev/null 2>&1; then
            log_info "🌐 Opening report in browser..."
            open "file://$JEST_HTML_REPORT"
        elif command -v xdg-open >/dev/null 2>&1; then
            log_info "🌐 Opening report in browser..."
            xdg-open "file://$JEST_HTML_REPORT"
        else
            log_info "🌐 Open in browser: file://$JEST_HTML_REPORT"
        fi
    else
        log_warning "Jest HTML report not found at $JEST_HTML_REPORT"
    fi
}
