#!/bin/bash

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script configuration
PACKAGE_LOCK_FILE="./package-lock.json"
CHECK_ALL_FILES=false
VERBOSE=false

print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}


show_help() {
    echo "Usage: $0 [OPTIONS] [PACKAGE_LOCK_FILE]"
    echo ""
    echo "Validates that non-workspace packages in package-lock.json have resolved properties."
    echo ""
    echo "OPTIONS:"
    echo "  --all           Check all package-lock.json files in the repository"
    echo "  --verbose, -v   Show all missing packages (default shows only first 10)"
    echo "  --help, -h      Show this help message"
    echo ""
    echo "EXAMPLES:"
    echo "  $0                                    # Check ./package-lock.json"
    echo "  $0 path/to/package-lock.json         # Check specific file"
    echo "  $0 --all                             # Check all package-lock.json files"
    echo "  $0 --all --verbose                   # Check all files, show all missing packages"
    echo ""
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --all)
            CHECK_ALL_FILES=true
            shift
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            PACKAGE_LOCK_FILE="$1"
            shift
            ;;
    esac
done

# Check dependencies
for cmd in jq; do
    if ! command -v "$cmd" &> /dev/null; then
        print_status "$RED" "❌ Required command '$cmd' not found. Please install it."
        exit 1
    fi
done

# Function to validate a single package-lock.json file
validate_single_file() {
    local file="$1"
    
    # Check if package-lock.json exists
    if [[ ! -f "$file" ]]; then
        print_status "$RED" "❌ File not found: $file"
        return 1
    fi

    print_status "$BLUE" "🔍 Checking file: $file"

    # Count issues
    local missing_resolved=0
    local issues=()

    # Process packages in package-lock.json
    while IFS=$'\t' read -r path name resolved has_link; do
        # Skip root package entry
        if [[ "$path" == "" ]]; then
            continue
        fi
        
        # Skip workspace symlinks (they have link: true)
        if [[ "$has_link" == "true" ]]; then
            continue
        fi

        # Skip if the path doesn't include node_modules
        if [[ "$path" != *"node_modules"* ]]; then
            continue
        fi
        
        # Check if this package has resolved property
        if [[ "$resolved" == "false" || -z "$resolved" ]]; then
            missing_resolved=$((missing_resolved + 1))
            if [[ "$name" == "unknown" ]]; then
                issues+=("$path")
            else
                issues+=("$path ($name)")
            fi
        fi
    done < <(
        jq -r '
            (.packages // {}) | to_entries[] | 
            select(.key != null and .key != "") |
            [
                .key,
                (.value.name // "unknown"),
                (if .value.resolved then .value.resolved else "false" end),
                (if .value.link then "true" else "false" end)
            ] | @tsv
        ' "$file"
    )

    # Report results
    echo ""

    if [[ $missing_resolved -eq 0 ]]; then
        print_status "$GREEN" "✅ All external packages have resolved properties!"
        echo ""
        return 0
    else
        print_status "$RED" "❌ Found $missing_resolved packages missing resolved properties:"
        echo ""
        
        # Show limited or all issues based on verbose flag
        if [[ "$VERBOSE" == true ]] || [[ ${#issues[@]} -le 10 ]]; then
            # Show all issues
            for issue in "${issues[@]}"; do
                echo "   • $issue"
            done
        else
            # Show first 10 issues
            for i in "${issues[@]:0:10}"; do
                echo "   • $i"
            done
            local remaining=$((${#issues[@]} - 10))
            echo "   • ... $remaining more (use --verbose option to show all)"
        fi
        
        echo ""
        return 1
    fi
}

# Main logic
if [[ "$CHECK_ALL_FILES" == true ]]; then
    # Check all package-lock.json files
    failed_files=()
    successful_files=()
    
    # Count files first and show starting summary
    all_files=()
    while IFS= read -r file; do
        all_files+=("$file")
    done < <(find . -name "package-lock.json" -type f -not -path "*/node_modules/*")
    
    print_status "$BLUE" "🔍 Checking ${#all_files[@]} package-lock.json files..."
    echo ""
    
    for file in "${all_files[@]}"; do
        if ! validate_single_file "$file"; then
            failed_files+=("$file")
        else
            successful_files+=("$file")
        fi
        
        echo ""
    done
    
    # Show summary
    total_files=$((${#successful_files[@]} + ${#failed_files[@]}))
    
    print_status "$BLUE" "📋 VALIDATION SUMMARY"
    print_status "$BLUE" "================================"
    
    if [[ ${#failed_files[@]} -eq 0 ]]; then
        print_status "$GREEN" "🎉 All $total_files package-lock.json files passed validation!"
        exit 0
    elif [[ ${#successful_files[@]} -eq 0 ]]; then
        print_status "$RED" "💥 All $total_files package-lock.json files failed validation!"
        exit 1
    else
        print_status "$GREEN" "✅ ${#successful_files[@]} files passed validation"
        print_status "$RED" "❌ ${#failed_files[@]} files failed validation"
        exit 1
    fi
else
    # Check single file
    validate_single_file "$PACKAGE_LOCK_FILE"
fi
