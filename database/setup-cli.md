# Supabase CLI Migration Setup

## 📦 **Install Supabase CLI**

```bash
# Install Supabase CLI globally
npm install -g supabase

# Or using homebrew (macOS)
brew install supabase/tap/supabase
```

## 🔧 **Initialize Supabase in Your Project**

```bash
# Run this once in your project root
supabase init

# Login to Supabase (opens browser)
supabase login

# Link to your existing project
supabase link --project-ref YOUR_PROJECT_REF
```

**Find your PROJECT_REF in:** Supabase Dashboard → Settings → General → Reference ID

## 📁 **Project Structure After Init**

```
your-project/
├── supabase/
│   ├── config.toml
│   ├── migrations/     # ← CLI will use this folder
│   └── seed.sql
├── database/
│   └── migrations/     # ← Our custom migrations
└── package.json
```

## 🎯 **Migration Commands**

```bash
# Apply all pending migrations
supabase db push

# Create a new migration file
supabase migration new create_comments_table

# Reset database and reapply all migrations
supabase db reset

# Check migration status
supabase migration list
``` 