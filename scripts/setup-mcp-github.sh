#!/bin/bash
# Setup GitHub MCP Server for Claude Code
# Run this script in Git Bash or WSL
#
# Usage: ./scripts/setup-mcp-github.sh

set -e

echo "🔧 GitHub MCP Server Setup"
echo "=========================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install it from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    exit 1
fi

echo "✅ npm found: $(npm --version)"
echo ""

# Install the GitHub MCP server
echo "📦 Installing @modelcontextprotocol/server-github..."
npm install -g @modelcontextprotocol/server-github

echo "✅ MCP server installed"
echo ""

# Determine config path
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    CONFIG_DIR="$USERPROFILE/.claude"
    CONFIG_PATH="$CONFIG_DIR/claude_desktop_config.json"
else
    CONFIG_DIR="$HOME/.claude"
    CONFIG_PATH="$CONFIG_DIR/claude_desktop_config.json"
fi

# Create config directory if needed
mkdir -p "$CONFIG_DIR"

# Prompt for GitHub token
echo ""
echo "🔑 GitHub Personal Access Token Required"
echo "Create one at: https://github.com/settings/tokens"
echo "Required scopes: repo, project, workflow"
echo ""
read -p "Enter your GitHub Personal Access Token (or press Enter to skip): " TOKEN

if [[ -z "$TOKEN" ]]; then
    echo ""
    echo "⚠️  Token skipped. You'll need to manually configure the token."
    TOKEN="ghp_YOUR_TOKEN_HERE"
fi

# Create config
CONFIG=$(cat <<EOF
{
  "mcpServers": {
    "github": {
      "command": "mcp-server-github",
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "$TOKEN"
      }
    }
  }
}
EOF
)

# Write config (simple version - for merging, use jq)
if [[ -f "$CONFIG_PATH" ]]; then
    echo "📄 Existing config found at: $CONFIG_PATH"
    echo "⚠️  Please manually merge the GitHub MCP config:"
    echo ""
    echo "$CONFIG"
    echo ""
else
    echo "$CONFIG" > "$CONFIG_PATH"
    echo "✅ Config saved to: $CONFIG_PATH"
fi

echo ""
echo "=========================="
echo "✅ Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Restart Claude Code / VS Code"
echo "2. The GitHub MCP tools will be available"
echo ""
echo "Available capabilities:"
echo "  - Create issues from backlog items"
echo "  - Read and create PRs"
echo "  - View workflow status"
echo "  - Manage labels and projects"
echo ""

if [[ "$TOKEN" == "ghp_YOUR_TOKEN_HERE" ]]; then
    echo "⚠️  Don't forget to update your token in:"
    echo "    $CONFIG_PATH"
fi
