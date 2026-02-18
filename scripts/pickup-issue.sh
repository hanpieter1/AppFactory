#!/bin/bash
# pickup-issue.sh - Pick up a GitHub issue for development
# Usage: ./scripts/pickup-issue.sh <issue-number>
#
# This script will:
# 1. Assign the issue to you
# 2. Set project status to "In Progress"
# 3. Create a feature branch
# 4. Checkout the branch

set -e

# Configuration
OWNER="hanpieter1"
REPO="AppFactory"
PROJECT_NUMBER=4
STATUS_FIELD_ID="PVTSSF_lAHOAa4VUM4BPfU8zg94ixw"
IN_PROGRESS_OPTION_ID="89ca0d47"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

show_usage() {
    echo "Usage: $0 <issue-number>"
    echo ""
    echo "Examples:"
    echo "  $0 44        # Pick up issue #44"
    echo "  $0 --list    # Show issues in 'In Progress' or 'Todo'"
    echo ""
}

list_available_issues() {
    log_info "Fetching available issues (Todo status)..."
    echo ""
    echo "=== Todo Issues ==="
    gh project item-list $PROJECT_NUMBER --owner $OWNER --format json --limit 50 | \
        python -c "
import json, sys
data = json.load(sys.stdin)
for item in data.get('items', []):
    status = item.get('status', '')
    if status == 'Todo':
        num = item.get('content', {}).get('number', '-')
        title = item.get('content', {}).get('title', 'N/A')[:60]
        print(f'  #{num}: {title}')
" 2>/dev/null || echo "  (none)"
    echo ""
    echo "=== In Progress Issues ==="
    gh project item-list $PROJECT_NUMBER --owner $OWNER --format json --limit 50 | \
        python -c "
import json, sys
data = json.load(sys.stdin)
found = False
for item in data.get('items', []):
    status = item.get('status', '')
    if status == 'In Progress':
        num = item.get('content', {}).get('number', '-')
        title = item.get('content', {}).get('title', 'N/A')[:60]
        print(f'  #{num}: {title}')
        found = True
if not found:
    print('  (none)')
" 2>/dev/null
}

get_issue_title() {
    gh issue view "$1" --repo "$OWNER/$REPO" --json title --jq '.title'
}

get_project_item_id() {
    gh project item-list $PROJECT_NUMBER --owner $OWNER --format json --limit 100 | \
        python -c "
import json, sys
issue_num = int(sys.argv[1])
data = json.load(sys.stdin)
for item in data.get('items', []):
    if item.get('content', {}).get('number') == issue_num:
        print(item.get('id'))
        sys.exit(0)
sys.exit(1)
" "$1" 2>/dev/null
}

create_branch_name() {
    local issue_num=$1
    local title=$2
    local username=$3
    # Convert title to branch-friendly format
    local slug=$(echo "$title" | \
        sed 's/\[.*\]//g' | \
        sed 's/[^a-zA-Z0-9]/-/g' | \
        sed 's/--*/-/g' | \
        sed 's/^-//' | \
        sed 's/-$//' | \
        tr '[:upper:]' '[:lower:]' | \
        cut -c1-40)
    echo "feature/issue-${issue_num}-${slug}-${username}"
}

# Main
if [ $# -eq 0 ]; then
    show_usage
    exit 1
fi

if [ "$1" == "--list" ] || [ "$1" == "-l" ]; then
    list_available_issues
    exit 0
fi

if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    show_usage
    exit 0
fi

ISSUE_NUMBER=$1

# Validate issue number
if ! [[ "$ISSUE_NUMBER" =~ ^[0-9]+$ ]]; then
    log_error "Invalid issue number: $ISSUE_NUMBER"
    exit 1
fi

log_info "Picking up issue #$ISSUE_NUMBER..."

# Step 1: Get issue details
log_info "Fetching issue details..."
ISSUE_TITLE=$(get_issue_title "$ISSUE_NUMBER")
if [ -z "$ISSUE_TITLE" ]; then
    log_error "Issue #$ISSUE_NUMBER not found"
    exit 1
fi
log_success "Found: $ISSUE_TITLE"

# Step 2: Get current user
GITHUB_USER=$(gh api user --jq '.login')
log_info "Assigning to: $GITHUB_USER"

# Step 3: Assign issue to current user
log_info "Assigning issue..."
gh issue edit "$ISSUE_NUMBER" --repo "$OWNER/$REPO" --add-assignee "$GITHUB_USER" 2>/dev/null || true
log_success "Issue assigned to $GITHUB_USER"

# Step 4: Update project status to "In Progress"
log_info "Updating project status to 'In Progress'..."
ITEM_ID=$(get_project_item_id "$ISSUE_NUMBER")
if [ -n "$ITEM_ID" ]; then
    gh project item-edit \
        --project-id "PVT_kwHOAa4VUM4BPfU8" \
        --id "$ITEM_ID" \
        --field-id "$STATUS_FIELD_ID" \
        --single-select-option-id "$IN_PROGRESS_OPTION_ID" 2>/dev/null || log_warning "Could not update project status"
    log_success "Project status updated"
else
    log_warning "Issue not found in project board"
fi

# Step 5: Create feature branch
BRANCH_NAME=$(create_branch_name "$ISSUE_NUMBER" "$ISSUE_TITLE" "$GITHUB_USER")
log_info "Creating branch: $BRANCH_NAME"

# Check if branch already exists
if git show-ref --verify --quiet "refs/heads/$BRANCH_NAME" 2>/dev/null; then
    log_warning "Branch already exists locally"
    git checkout "$BRANCH_NAME"
elif git ls-remote --exit-code --heads origin "$BRANCH_NAME" >/dev/null 2>&1; then
    log_warning "Branch already exists on remote"
    git fetch origin "$BRANCH_NAME"
    git checkout "$BRANCH_NAME"
else
    git checkout -b "$BRANCH_NAME"
    log_success "Branch created: $BRANCH_NAME"
fi

# Summary
echo ""
echo "=========================================="
log_success "Issue #$ISSUE_NUMBER picked up successfully!"
echo "=========================================="
echo ""
echo "  Issue:    #$ISSUE_NUMBER - $ISSUE_TITLE"
echo "  Assignee: $GITHUB_USER"
echo "  Branch:   $BRANCH_NAME"
echo "  Status:   In Progress"
echo ""
echo "Next steps:"
echo "  1. Make your changes"
echo "  2. Commit with: git commit -m \"feat: description (#$ISSUE_NUMBER)\""
echo "  3. Push: git push -u origin $BRANCH_NAME"
echo "  4. Create PR: gh pr create"
echo ""
