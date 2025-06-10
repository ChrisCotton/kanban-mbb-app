# Supabase Migration Guide

## ⚠️ **ALWAYS RUN MIGRATIONS IN ORDER**

Run these migration files **one at a time** in the Supabase SQL Editor:

### **Step 1: Enums**
```sql
-- Copy and paste: database/migrations/001_create_kanban_enums.sql
```

### **Step 2: Tables** 
```sql
-- Copy and paste: database/migrations/002_create_tasks_table.sql
```

### **Step 3: Triggers & RLS**
```sql
-- Copy and paste: database/migrations/003_add_tasks_triggers_and_rls.sql
```

## 🔧 **Best Practices to Avoid Dependency Loops**

### **1. Always Use Defensive SQL**
- `CREATE TABLE IF NOT EXISTS` 
- `CREATE INDEX IF NOT EXISTS`
- `DROP POLICY IF EXISTS` before `CREATE POLICY`
- `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN null; END $$;` for enums

### **2. Separate Concerns**
- **Enums first** (no dependencies)
- **Tables second** (depend on enums)
- **Triggers & RLS last** (depend on tables)

### **3. Test Each Migration**
- Run **one file at a time**
- Check for errors before proceeding
- Don't skip steps

### **4. Never Modify Existing Migrations**
- Create new migration files for changes
- Use `ALTER TABLE` statements for modifications

## 🚨 **If You Get Dependency Errors**

1. **Don't panic!** Note which objects are causing conflicts
2. **Find dependencies** using:
   ```sql
   SELECT * FROM information_schema.table_constraints 
   WHERE constraint_name LIKE '%your_table%';
   ```
3. **Drop in reverse order**: RLS policies → triggers → indexes → tables → enums
4. **Re-run migrations** from step 1

## 📝 **Migration Naming Convention**
- `001_create_kanban_enums.sql`
- `002_create_tasks_table.sql` 
- `003_add_tasks_triggers_and_rls.sql`
- `004_create_comments_table.sql` (next)
- `005_create_subtasks_table.sql` (after that) 