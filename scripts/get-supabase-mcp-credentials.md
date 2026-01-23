# Get Missing Supabase MCP Credentials

You need to add two more credentials to `~/.config/supabase-mcp/.env`:

## 1. QUERY_API_KEY (Required)

The Supabase MCP server uses The Query API to execute SQL safely.

**Steps:**
1. Go to https://thequery.dev
2. Sign up or log in (it's free)
3. Navigate to your API keys/dashboard
4. Copy your API key
5. Replace `your-api-key-from-thequery-dev` in `~/.config/supabase-mcp/.env`

## 2. SUPABASE_DB_PASSWORD (Required)

Your Supabase database password.

**Steps:**
1. Go to https://supabase.com/dashboard/project/emxejsyyelcdpejxuvfd
2. Click **Settings** → **Database**
3. Scroll to **Connection string** section
4. Look for the password in the connection string, OR
5. If you don't know it, click **Reset database password** (this will reset it)
6. Copy the password
7. Replace `your-database-password` in `~/.config/supabase-mcp/.env`

## Quick Edit Command

After you have both credentials, edit the file:

```bash
nano ~/.config/supabase-mcp/.env
```

Or use your preferred editor. Make sure to replace:
- `QUERY_API_KEY=your-api-key-from-thequery-dev` → your actual API key
- `SUPABASE_DB_PASSWORD=your-database-password` → your actual database password

## Verify Configuration

After updating, verify the file has all required values:

```bash
cat ~/.config/supabase-mcp/.env | grep -E "QUERY_API_KEY|SUPABASE_DB_PASSWORD" | grep -v "^#"
```

Both should show actual values (not placeholders).
