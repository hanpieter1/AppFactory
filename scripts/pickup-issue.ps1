<#
.SYNOPSIS
    Pick up a GitHub issue for development

.DESCRIPTION
    This script will:
    1. Assign the issue to you
    2. Set project status to "In Progress"
    3. Create a feature branch
    4. Checkout the branch

.PARAMETER IssueNumber
    The GitHub issue number to pick up

.PARAMETER List
    Show available issues (Todo and In Progress)

.EXAMPLE
    .\scripts\pickup-issue.ps1 44
    Pick up issue #44

.EXAMPLE
    .\scripts\pickup-issue.ps1 -List
    Show available issues
#>

param(
    [Parameter(Position=0)]
    [string]$IssueNumber,

    [switch]$List,
    [switch]$Help
)

# Configuration
$OWNER = "hanpieter1"
$REPO = "AppFactory"
$PROJECT_NUMBER = 4
$PROJECT_ID = "PVT_kwHOAa4VUM4BPfU8"
$STATUS_FIELD_ID = "PVTSSF_lAHOAa4VUM4BPfU8zg94ixw"
$IN_PROGRESS_OPTION_ID = "89ca0d47"

# Functions
function Write-Info { param($Message) Write-Host "[INFO] $Message" -ForegroundColor Blue }
function Write-Success { param($Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Write-Warning { param($Message) Write-Host "[WARNING] $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }

function Show-Usage {
    Write-Host "Usage: .\pickup-issue.ps1 <issue-number>"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\pickup-issue.ps1 44        # Pick up issue #44"
    Write-Host "  .\pickup-issue.ps1 -List     # Show available issues"
    Write-Host ""
}

function Get-AvailableIssues {
    Write-Info "Fetching available issues..."
    Write-Host ""

    $items = gh project item-list $PROJECT_NUMBER --owner $OWNER --format json --limit 50 | ConvertFrom-Json

    Write-Host "=== Todo Issues ===" -ForegroundColor Cyan
    $todoItems = $items.items | Where-Object { $_.status -eq "Todo" }
    if ($todoItems) {
        foreach ($item in $todoItems) {
            $num = $item.content.number
            $title = $item.content.title
            if ($title.Length -gt 60) { $title = $title.Substring(0, 60) + "..." }
            Write-Host "  #$num : $title"
        }
    } else {
        Write-Host "  (none)"
    }

    Write-Host ""
    Write-Host "=== In Progress Issues ===" -ForegroundColor Cyan
    $inProgressItems = $items.items | Where-Object { $_.status -eq "In Progress" }
    if ($inProgressItems) {
        foreach ($item in $inProgressItems) {
            $num = $item.content.number
            $title = $item.content.title
            if ($title.Length -gt 60) { $title = $title.Substring(0, 60) + "..." }
            Write-Host "  #$num : $title"
        }
    } else {
        Write-Host "  (none)"
    }
}

function Get-IssueTitle {
    param($Number)
    $result = gh issue view $Number --repo "$OWNER/$REPO" --json title | ConvertFrom-Json
    return $result.title
}

function Get-ProjectItemId {
    param($Number)
    $items = gh project item-list $PROJECT_NUMBER --owner $OWNER --format json --limit 100 | ConvertFrom-Json
    $item = $items.items | Where-Object { $_.content.number -eq [int]$Number }
    return $item.id
}

function New-BranchName {
    param($Number, $Title, $Username)
    # Remove brackets and content
    $slug = $Title -replace '\[.*?\]', ''
    # Replace non-alphanumeric with dash
    $slug = $slug -replace '[^a-zA-Z0-9]', '-'
    # Remove multiple dashes
    $slug = $slug -replace '-+', '-'
    # Remove leading/trailing dashes
    $slug = $slug.Trim('-')
    # Lowercase and limit length
    $slug = $slug.ToLower()
    if ($slug.Length -gt 40) { $slug = $slug.Substring(0, 40) }

    return "feature/issue-$Number-$slug-$Username"
}

# Main
if ($Help) {
    Show-Usage
    exit 0
}

if ($List) {
    Get-AvailableIssues
    exit 0
}

if (-not $IssueNumber) {
    Show-Usage
    exit 1
}

# Validate issue number
if ($IssueNumber -notmatch '^\d+$') {
    Write-Error "Invalid issue number: $IssueNumber"
    exit 1
}

Write-Info "Picking up issue #$IssueNumber..."

# Step 1: Get issue details
Write-Info "Fetching issue details..."
$issueTitle = Get-IssueTitle $IssueNumber
if (-not $issueTitle) {
    Write-Error "Issue #$IssueNumber not found"
    exit 1
}
Write-Success "Found: $issueTitle"

# Step 2: Get current user
$githubUser = gh api user --jq '.login'
Write-Info "Assigning to: $githubUser"

# Step 3: Assign issue to current user
Write-Info "Assigning issue..."
gh issue edit $IssueNumber --repo "$OWNER/$REPO" --add-assignee $githubUser 2>$null
Write-Success "Issue assigned to $githubUser"

# Step 4: Update project status to "In Progress"
Write-Info "Updating project status to 'In Progress'..."
$itemId = Get-ProjectItemId $IssueNumber
if ($itemId) {
    try {
        gh project item-edit --project-id $PROJECT_ID --id $itemId --field-id $STATUS_FIELD_ID --single-select-option-id $IN_PROGRESS_OPTION_ID 2>$null
        Write-Success "Project status updated"
    } catch {
        Write-Warning "Could not update project status"
    }
} else {
    Write-Warning "Issue not found in project board"
}

# Step 5: Create feature branch
$branchName = New-BranchName $IssueNumber $issueTitle $githubUser
Write-Info "Creating branch: $branchName"

# Check if branch already exists locally
$localBranch = git show-ref --verify --quiet "refs/heads/$branchName" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Warning "Branch already exists locally"
    git checkout $branchName
} else {
    # Check if branch exists on remote
    $remoteBranch = git ls-remote --exit-code --heads origin $branchName 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Warning "Branch already exists on remote"
        git fetch origin $branchName
        git checkout $branchName
    } else {
        git checkout -b $branchName
        Write-Success "Branch created: $branchName"
    }
}

# Summary
Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Success "Issue #$IssueNumber picked up successfully!"
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Issue:    #$IssueNumber - $issueTitle"
Write-Host "  Assignee: $githubUser"
Write-Host "  Branch:   $branchName"
Write-Host "  Status:   In Progress"
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Make your changes"
Write-Host "  2. Commit with: git commit -m `"feat: description (#$IssueNumber)`""
Write-Host "  3. Push: git push -u origin $branchName"
Write-Host "  4. Create PR: gh pr create"
Write-Host ""
