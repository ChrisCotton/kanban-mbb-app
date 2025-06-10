# Environment Setup for CLI Migrations

## 🔑 **Required Environment Variables**

Add these to your `.env.local` file:

```bash
# Your existing Supabase config
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Required for CLI migrations (NEW)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 🔧 **Get Your Service Role Key**

1. Go to Supabase Dashboard → Project Settings → API
2. Copy the **service_role secret** key (NOT the public anon key)
3. ⚠️ **IMPORTANT**: This key has admin privileges - keep it secret!

## 🚫 **Security Note**

- Never commit the service role key to git
- Only use it for migrations and admin tasks
- Add `.env.local` to your `.gitignore` (should already be there) 