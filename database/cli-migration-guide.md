# CLI Migration Guide 🚀

**Never use the Supabase GUI again!** Run migrations directly from Cursor/CLI.

## 🏃 **Quick Start**

### **1. Install Dependencies**
```bash
npm install
```

### **2. Setup Environment**
Add to your `.env.local`:
```bash
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```
*(Get from Supabase Dashboard → Settings → API)*

### **3. Run Your First Migration**
```bash
# Run all kanban migrations in order
npm run migrate:kanban

# Or run all migrations
npm run migrate

# Or run a single migration
npm run migrate:single 001_create_kanban_enums.sql
```

## 📋 **Available Commands**

| Command | Description |
|---------|-------------|
| `npm run migrate` | Run ALL migration files |
| `npm run migrate:kanban` | Run the 3 kanban setup migrations |
| `npm run migrate:single <file>` | Run a specific migration |

## 💡 **Examples**

```bash
# Setup the kanban board database
npm run migrate:kanban

# Run a specific migration
npm run migrate:single 004_create_comments_table.sql

# Run all migrations (useful for new environments)
npm run migrate
```

## 🔧 **Creating New Migrations**

1. **Create file**: `database/migrations/004_new_feature.sql`
2. **Use defensive SQL**: `CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS`
3. **Run it**: `npm run migrate:single 004_new_feature.sql`

## ✅ **Benefits vs Supabase GUI**

- ✅ **No copy-paste errors**
- ✅ **Version controlled migrations** 
- ✅ **Repeatable deployments**
- ✅ **No dependency loops**
- ✅ **Team collaboration friendly**
- ✅ **Run from Cursor terminal**

## 🆘 **Troubleshooting**

**Error: Missing service role key**
- Check `.env.local` has `SUPABASE_SERVICE_ROLE_KEY`
- Verify it's the service role key (not anon key)

**Error: Migration file not found**
- Check file exists in `database/migrations/`
- Use exact filename with `.sql` extension

**Error: SQL execution failed**
- Check the SQL syntax in your migration file
- Run migrations in the correct order (001, 002, 003...) 