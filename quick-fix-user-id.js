const { supabase } = require('./lib/supabase.js');

async function fixUserIdColumn() {
  try {
    console.log('🔧 Checking and fixing user_id column in tasks table...');
    
    // First, let's check the current schema
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'tasks')
      .eq('column_name', 'user_id');
    
    if (tablesError) {
      console.log('❌ Error checking schema:', tablesError.message);
      console.log('🔧 Trying direct SQL approach...');
      
      // Try direct SQL to add the column
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: `
          DO $$ 
          BEGIN
              IF NOT EXISTS (
                  SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'tasks' AND column_name = 'user_id'
              ) THEN
                  ALTER TABLE tasks ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
                  CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
                  RAISE NOTICE 'Added user_id column to tasks table';
              ELSE
                  RAISE NOTICE 'user_id column already exists in tasks table';
              END IF;
          END $$;
        `
      });
      
      if (error) {
        console.log('❌ RPC Error:', error.message);
        console.log('🔧 Trying alternative approach with raw SQL...');
        
        // Try executing SQL with the direct query method
        const { error: directError } = await supabase
          .from('tasks')
          .select('user_id')
          .limit(1);
          
        if (directError && directError.message.includes('user_id')) {
          console.log('✅ Confirmed: user_id column is missing');
          console.log('📝 Manual fix needed:');
          console.log('1. Go to your Supabase dashboard');
          console.log('2. Navigate to the SQL Editor');
          console.log('3. Run this SQL:');
          console.log(`
ALTER TABLE tasks ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
          `);
        } else {
          console.log('🤔 Column might exist, testing task creation...');
        }
      } else {
        console.log('✅ SQL executed successfully');
      }
    } else {
      console.log('✅ user_id column already exists');
    }
    
    // Test task creation
    console.log('🧪 Testing task creation...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('⚠️  No authenticated user for testing');
      console.log('📝 To test manually, you can use this curl command:');
      console.log(`
curl -X POST http://localhost:3000/api/kanban/tasks \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Test Task",
    "description": "Test Description", 
    "status": "backlog",
    "priority": "medium",
    "user_id": "YOUR_USER_ID_HERE"
  }'
      `);
    } else {
      const testTask = {
        title: 'Test Task - ' + new Date().toISOString(),
        description: 'Testing user_id column fix',
        status: 'backlog',
        priority: 'medium',
        user_id: user.id
      };
      
      const response = await fetch('http://localhost:3000/api/kanban/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testTask)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ Task creation test PASSED!');
        console.log('🎉 The user_id column issue has been resolved');
        
        // Clean up test task
        if (result.data?.id) {
          await fetch(`http://localhost:3000/api/kanban/tasks/${result.data.id}`, {
            method: 'DELETE'
          });
          console.log('🧹 Cleaned up test task');
        }
      } else {
        console.log('❌ Task creation test FAILED:', result.error || result.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Script error:', error.message);
  }
}

console.log('🚀 Starting user_id column fix...');
fixUserIdColumn(); 