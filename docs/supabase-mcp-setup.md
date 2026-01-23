# Supabase MCP Server Setup Guide

This guide will help you install and configure Supabase MCP Server to run migrations from localhost.

## Prerequisites

- Python 3.8+ installed
- pipx installed (recommended) or uv
- Supabase project credentials

## Installation

### Step 1: Install Supabase MCP Server

```bash
# Using pipx (recommended)
pipx install supabase-mcp-server

# Or using uv
uv pip install supabase-mcp-server
```

### Step 2: Find the Executable Path

After installation, find the full path to the executable:

```bash
# macOS/Linux
which supabase-mcp-server

# Windows
where supabase-mcp-server
```

Save this path - you'll need it for Cursor configuration.

## Configuration

### Step 3: Create Global Config Directory

Create the global configuration directory:

```bash
# macOS/Linux
mkdir -p ~/.config/supabase-mcp

# Windows (PowerShell)
mkdir -Force "$env:APPDATA\supabase-mcp"
```

### Step 4: Create .env File with Credentials

Create a `.env` file in the config directory:

```bash
# macOS/Linux
nano ~/.config/supabase-mcp/.env

# Windows
notepad "$env:APPDATA\supabase-mcp\.env"
```

Add the following environment variables:

```bash
# Required: Get your API key from https://thequery.dev
QUERY_API_KEY=your-api-key-from-thequery-dev

# Required: Your Supabase project reference ID
SUPABASE_PROJECT_REF=your-project-ref

# Required: Your Supabase database password
SUPABASE_DB_PASSWORD=your-database-password

# Optional: Region (defaults to us-east-1)
SUPABASE_REGION=us-east-1

# Optional: For Management API access
SUPABASE_ACCESS_TOKEN=sbp_your-access-token

# Optional: For Auth Admin SDK (you likely have this in .env.local)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Step 5: Get Your Credentials

#### QUERY_API_KEY
1. Go to https://thequery.dev
2. Sign up or log in
3. Get your API key from the dashboard

#### SUPABASE_PROJECT_REF
1. Go to Supabase Dashboard
2. Select your project
3. Go to Settings → General
4. Copy the "Reference ID"

#### SUPABASE_DB_PASSWORD
1. Go to Supabase Dashboard
2. Select your project
3. Go to Settings → Database
4. Under "Connection string", find the password (or reset it if needed)

#### SUPABASE_SERVICE_ROLE_KEY
1. Go to Supabase Dashboard
2. Select your project
3. Go to Settings → API
4. Copy the "service_role" key (keep this secret!)

### Step 6: Configure Cursor IDE

1. Open Cursor IDE
2. Go to **Settings → Features → MCP Servers**
3. Add a new MCP server with this configuration:

```json
{
  "name": "supabase",
  "type": "command",
  "command": "/full/path/to/supabase-mcp-server"
}
```

Replace `/full/path/to/supabase-mcp-server` with the path from Step 2.

**Example for macOS:**
```json
{
  "name": "supabase",
  "type": "command",
  "command": "/Users/username/.local/bin/supabase-mcp-server"
}
```

### Step 7: Restart Cursor

After configuration, restart Cursor IDE to load the MCP server.

## Usage

Once configured, you can use Supabase MCP tools to:

1. **Execute SQL queries** - Run read-only queries safely
2. **Run migrations** - Execute migration files with automatic versioning
3. **Manage schema** - Create/modify tables, indexes, functions
4. **Query data** - Select, insert, update, delete operations

### Running Migrations

The Supabase MCP server can execute migration files directly. It will:
- Validate SQL queries for safety
- Automatically version schema changes
- Handle transactions atomically
- Require confirmation for destructive operations

### Example: Running Vision Board Migration

After setup, you can run migrations like:

```
Execute the migration from database/migrations/010_create_vision_board_images_table.sql
```

The MCP server will handle the execution safely with automatic versioning.

## Troubleshooting

### "Command not found"
- Make sure pipx/uv installation completed successfully
- Verify the executable path with `which supabase-mcp-server`
- Use the full absolute path in Cursor configuration

### "Missing environment variables"
- Check that `.env` file exists in `~/.config/supabase-mcp/` (macOS/Linux)
- Verify all required variables are set
- Restart Cursor after creating/updating the `.env` file

### "Connection failed"
- Verify your `SUPABASE_PROJECT_REF` is correct
- Check that `SUPABASE_DB_PASSWORD` matches your database password
- Ensure `QUERY_API_KEY` is valid from thequery.dev

### "Permission denied"
- Make sure the executable has execute permissions
- On macOS/Linux: `chmod +x /path/to/supabase-mcp-server`

## Additional Resources

- [Supabase MCP Server GitHub](https://github.com/alexander-zuev/supabase-mcp-server)
- [The Query API Documentation](https://thequery.dev)
- [Supabase Dashboard](https://supabase.com/dashboard)
