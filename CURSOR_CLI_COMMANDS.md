# Cursor CLI Commands Reference

## Basic Cursor Commands

### Open Files/Directories
```bash
# Open current directory
cursor .

# Open a specific file
cursor path/to/file.ts

# Open file at specific line
cursor path/to/file.ts:42

# Open file at line and column
cursor path/to/file.ts:42:10

# Open multiple files
cursor file1.ts file2.ts

# Open in new window
cursor -n .

# Reuse existing window
cursor -r .
```

### File Operations
```bash
# Compare two files
cursor --diff file1.ts file2.ts

# Add folder to workspace
cursor --add ./folder

# Remove folder from workspace
cursor --remove ./folder
```

### Extensions
```bash
# List installed extensions
cursor --list-extensions

# Install extension
cursor --install-extension publisher.extension-name

# Uninstall extension
cursor --uninstall-extension publisher.extension-name

# Update all extensions
cursor --update-extensions
```

### Troubleshooting
```bash
# Check version
cursor --version

# Show status/diagnostics
cursor --status

# Verbose logging
cursor --verbose

# Disable extensions (for debugging)
cursor --disable-extensions .
```

---

## Cursor Agent Commands

The `agent` command is a powerful CLI tool for interacting with Cursor's AI agent.

### Basic Usage
```bash
# Start agent with a prompt
agent "fix the bug in login.ts"

# Start agent interactively
agent

# Start in cloud mode (opens composer)
agent --cloud

# Start in plan mode (read-only, planning only)
agent --plan

# Start in ask mode (Q&A style, read-only)
agent --mode ask
```

### Authentication
```bash
# Login to Cursor
agent login

# Check authentication status
agent status
# or
agent whoami

# Logout
agent logout
```

### Chat Management
```bash
# Resume last chat
agent --continue

# Resume specific chat by ID
agent --resume <chatId>

# Create new empty chat
agent create-chat
```

### Advanced Options
```bash
# Use specific model
agent --model sonnet-4 "your prompt"

# List available models
agent --list-models

# Print responses (non-interactive)
agent --print "your prompt"

# Force allow commands
agent --force "your prompt"

# Enable browser automation
agent --browser "your prompt"

# Set workspace directory
agent --workspace /path/to/project "your prompt"
```

### MCP (Model Context Protocol) Management
```bash
# Manage MCP servers
agent mcp

# Auto-approve all MCP servers (with --print)
agent --approve-mcps --print "your prompt"
```

### Shell Integration
```bash
# Install shell integration (adds to ~/.zshrc)
agent install-shell-integration

# Remove shell integration
agent uninstall-shell-integration
```

### Other Commands
```bash
# Generate a Cursor rule interactively
agent generate-rule
# or
agent rule

# Update agent to latest version
agent update
# or
agent upgrade

# Show about info (version, system, account)
agent about
```

---

## Common Workflows

### Quick File Edit
```bash
cursor src/components/Button.tsx:25
```

### Compare Changes
```bash
cursor --diff file.ts file.ts.bak
```

### Start Agent for Bug Fix
```bash
agent "fix the TypeScript error in GoalModal.tsx"
```

### Plan a Feature (Read-Only)
```bash
agent --plan "implement user authentication system"
```

### Ask Questions (Read-Only)
```bash
agent --mode ask "explain how the goals service works"
```

### Non-Interactive Script
```bash
agent --print "list all TODO comments in the codebase"
```

---

## Notes

- The `cursor` command is the main CLI for opening files/workspaces
- The `agent` command is for AI-powered code assistance
- Both commands are installed and working on your system
- The error message about `SecCodeCheckValidity` is harmless (macOS code signing check)
