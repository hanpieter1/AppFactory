# Setup GitHub MCP Server for Claude Code
# Run this script in PowerShell as Administrator
#
# Usage: .\scripts\setup-mcp-github.ps1

Write-Host "🔧 GitHub MCP Server Setup" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js is not installed. Please install it from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Node.js found: $(node --version)" -ForegroundColor Green

# Check if npm is installed
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "❌ npm is not installed." -ForegroundColor Red
    exit 1
}

Write-Host "✅ npm found: $(npm --version)" -ForegroundColor Green
Write-Host ""

# Install the GitHub MCP server
Write-Host "📦 Installing @modelcontextprotocol/server-github..." -ForegroundColor Yellow
npm install -g @modelcontextprotocol/server-github

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install MCP server" -ForegroundColor Red
    exit 1
}

Write-Host "✅ MCP server installed" -ForegroundColor Green
Write-Host ""

# Check for existing config
$configPath = "$env:USERPROFILE\.claude\claude_desktop_config.json"
$configDir = "$env:USERPROFILE\.claude"

if (-not (Test-Path $configDir)) {
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
    Write-Host "📁 Created config directory: $configDir" -ForegroundColor Yellow
}

# Prompt for GitHub token
Write-Host ""
Write-Host "🔑 GitHub Personal Access Token Required" -ForegroundColor Cyan
Write-Host "Create one at: https://github.com/settings/tokens" -ForegroundColor Gray
Write-Host "Required scopes: repo, project, workflow" -ForegroundColor Gray
Write-Host ""

$token = Read-Host "Enter your GitHub Personal Access Token (or press Enter to skip)"

if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Host ""
    Write-Host "⚠️  Token skipped. You'll need to manually configure the token." -ForegroundColor Yellow
    $token = "ghp_YOUR_TOKEN_HERE"
}

# Create or update config
$config = @{
    mcpServers = @{
        github = @{
            command = "mcp-server-github"
            env = @{
                GITHUB_PERSONAL_ACCESS_TOKEN = $token
            }
        }
    }
}

# Check if config exists and merge
if (Test-Path $configPath) {
    Write-Host "📄 Existing config found, merging..." -ForegroundColor Yellow
    $existingConfig = Get-Content $configPath | ConvertFrom-Json -AsHashtable

    if (-not $existingConfig.mcpServers) {
        $existingConfig.mcpServers = @{}
    }
    $existingConfig.mcpServers.github = $config.mcpServers.github
    $config = $existingConfig
}

$config | ConvertTo-Json -Depth 10 | Set-Content $configPath -Encoding UTF8

Write-Host "✅ Config saved to: $configPath" -ForegroundColor Green
Write-Host ""

# Summary
Write-Host "==========================" -ForegroundColor Cyan
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Restart Claude Code / VS Code" -ForegroundColor White
Write-Host "2. The GitHub MCP tools will be available" -ForegroundColor White
Write-Host ""
Write-Host "Available capabilities:" -ForegroundColor Cyan
Write-Host "  - Create issues from backlog items" -ForegroundColor White
Write-Host "  - Read and create PRs" -ForegroundColor White
Write-Host "  - View workflow status" -ForegroundColor White
Write-Host "  - Manage labels and projects" -ForegroundColor White
Write-Host ""

if ($token -eq "ghp_YOUR_TOKEN_HERE") {
    Write-Host "⚠️  Don't forget to update your token in:" -ForegroundColor Yellow
    Write-Host "    $configPath" -ForegroundColor Gray
}
