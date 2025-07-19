import { createClient } from '@supabase/supabase-js'

// Types for our database entities
export interface Task {
  id: string
  title: string
  description?: string
  status: 'backlog' | 'todo' | 'doing' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string
  category_id?: string
  created_at: string
  updated_at: string
  user_id: string
  order_index: number
  tags?: Tag[];
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string
  name: string
  hourly_rate: number
  color?: string
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: string
  updated_by?: string
}

export interface TaskWithCategory extends Task {
  category?: Category
}

export interface Comment {
  id: string
  task_id: string
  content: string
  created_at: string
  updated_at: string
  user_id: string
}

export interface Subtask {
  id: string
  task_id: string
  title: string
  completed: boolean
  order_index: number
  created_at: string
  updated_at: string
  user_id: string
}

export interface TaskWithDetails extends Task {
  comments?: Comment[]
  subtasks?: Subtask[]
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ============================================================================
// TASK QUERIES
// ============================================================================

/**
 * Get all tasks for the current user, optionally filtered by status
 */
export async function getTasks(status?: Task['status']) {
  let query = supabase
    .from('tasks')
    .select('*')
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch tasks: ${error.message}`)
  }

  return data as Task[]
}

/**
 * Search and filter tasks with comprehensive filtering options
 */
export async function searchTasks(params: {
  query?: string
  status?: Task['status']
  priority?: Task['priority']
  category?: string
  tags?: string[]
  overdue?: boolean
  dateRange?: { start: string; end: string }
  limit?: number
  offset?: number
}) {
  let query = supabase
    .from('tasks')
    .select(`
      *
    `)
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: false })

  // Text search across title and description
  if (params.query) {
    query = query.or(`title.ilike.%${params.query}%,description.ilike.%${params.query}%`)
  }

  // Status filter
  if (params.status) {
    query = query.eq('status', params.status)
  }

  // Priority filter
  if (params.priority) {
    query = query.eq('priority', params.priority)
  }

  // Category filter
  if (params.category) {
    query = query.eq('category_id', params.category)
  }

  // Date range filter
  if (params.dateRange) {
    query = query.gte('due_date', params.dateRange.start)
    query = query.lte('due_date', params.dateRange.end)
  }

  // Overdue filter
  if (params.overdue) {
    const today = new Date().toISOString().split('T')[0]
    query = query.lt('due_date', today)
    query = query.neq('status', 'done')
  }

  // Pagination
  if (params.limit) {
    query = query.limit(params.limit)
  }
  if (params.offset) {
    query = query.range(params.offset, params.offset + (params.limit || 10) - 1)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to search tasks: ${error.message}`)
  }

  // Filter by tags if specified (post-query filtering due to many-to-many relationship)
  let filteredData = data as Task[]
  if (params.tags && params.tags.length > 0) {
    // Get tasks that have any of the specified tags
    const { data: taskTagsData, error: taskTagsError } = await supabase
      .from('task_tags')
      .select('task_id')
      .in('tag_id', params.tags)

    if (taskTagsError) {
      throw new Error(`Failed to filter by tags: ${taskTagsError.message}`)
    }

    const taskIdsWithTags = taskTagsData.map(tt => tt.task_id)
    filteredData = filteredData.filter(task => taskIdsWithTags.includes(task.id))
  }

  return filteredData
}

/**
 * Get a single task by ID with optional related data
 */
export async function getTask(id: string, includeDetails = false) {
  let query = supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single()

  const { data: task, error } = await query

  if (error) {
    throw new Error(`Failed to fetch task: ${error.message}`)
  }

  if (!includeDetails) {
    return task as Task
  }

  // Fetch related comments and subtasks
  const [comments, subtasks] = await Promise.all([
    getTaskComments(id),
    getTaskSubtasks(id)
  ])

  return {
    ...task,
    comments,
    subtasks
  } as TaskWithDetails
}

/**
 * Create a new task
 */
export async function createTask(taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('tasks')
    .insert([taskData])
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create task: ${error.message}`)
  }

  return data as Task
}

/**
 * Update an existing task
 */
export async function updateTask(id: string, updates: Partial<Omit<Task, 'id' | 'created_at' | 'user_id'>>) {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update task: ${error.message}`)
  }

  return data as Task
}

/**
 * Delete a task and all related data
 */
export async function deleteTask(id: string) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete task: ${error.message}`)
  }

  return true
}

/**
 * Update task status and order when moving between swim lanes
 */
export async function moveTask(id: string, newStatus: Task['status'], newOrderIndex: number) {
  const { data, error } = await supabase
    .from('tasks')
    .update({ 
      status: newStatus, 
      order_index: newOrderIndex 
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to move task: ${error.message}`)
  }

  return data as Task
}

/**
 * Reorder tasks within the same status
 */
export async function reorderTasks(taskUpdates: Array<{ id: string; order_index: number }>) {
  const { data, error } = await supabase
    .from('tasks')
    .upsert(taskUpdates.map(update => ({ 
      id: update.id, 
      order_index: update.order_index 
    })))
    .select()

  if (error) {
    throw new Error(`Failed to reorder tasks: ${error.message}`)
  }

  return data as Task[]
}

// ============================================================================
// COMMENT QUERIES
// ============================================================================

/**
 * Get all comments for a specific task
 */
export async function getTaskComments(taskId: string) {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch comments: ${error.message}`)
  }

  return data as Comment[]
}

/**
 * Create a new comment on a task
 */
export async function createComment(commentData: Omit<Comment, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('comments')
    .insert([commentData])
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create comment: ${error.message}`)
  }

  return data as Comment
}

/**
 * Update an existing comment
 */
export async function updateComment(id: string, content: string) {
  const { data, error } = await supabase
    .from('comments')
    .update({ content })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update comment: ${error.message}`)
  }

  return data as Comment
}

/**
 * Delete a comment
 */
export async function deleteComment(id: string) {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete comment: ${error.message}`)
  }

  return true
}

// ============================================================================
// SUBTASK QUERIES
// ============================================================================

/**
 * Get all subtasks for a specific task
 */
export async function getTaskSubtasks(taskId: string) {
  const { data, error } = await supabase
    .from('subtasks')
    .select('*')
    .eq('task_id', taskId)
    .order('order_index', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch subtasks: ${error.message}`)
  }

  return data as Subtask[]
}

/**
 * Create a new subtask for a task
 */
export async function createSubtask(subtaskData: Omit<Subtask, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('subtasks')
    .insert([subtaskData])
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create subtask: ${error.message}`)
  }

  return data as Subtask
}

/**
 * Update a subtask (typically to toggle completion)
 */
export async function updateSubtask(id: string, updates: Partial<Omit<Subtask, 'id' | 'created_at' | 'user_id'>>) {
  const { data, error } = await supabase
    .from('subtasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update subtask: ${error.message}`)
  }

  return data as Subtask
}

/**
 * Toggle subtask completion status
 */
export async function toggleSubtask(id: string) {
  // First get the current status
  const { data: subtask, error: fetchError } = await supabase
    .from('subtasks')
    .select('completed')
    .eq('id', id)
    .single()

  if (fetchError) {
    throw new Error(`Failed to fetch subtask: ${fetchError.message}`)
  }

  // Toggle the completion status
  const { data, error } = await supabase
    .from('subtasks')
    .update({ completed: !subtask.completed })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to toggle subtask: ${error.message}`)
  }

  return data as Subtask
}

/**
 * Delete a subtask
 */
export async function deleteSubtask(id: string) {
  const { error } = await supabase
    .from('subtasks')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete subtask: ${error.message}`)
  }

  return true
}

/**
 * Reorder subtasks within a task
 */
export async function reorderSubtasks(subtaskUpdates: Array<{ id: string; order_index: number }>) {
  const { data, error } = await supabase
    .from('subtasks')
    .upsert(subtaskUpdates.map(update => ({ 
      id: update.id, 
      order_index: update.order_index 
    })))
    .select()

  if (error) {
    throw new Error(`Failed to reorder subtasks: ${error.message}`)
  }

  return data as Subtask[]
}

// ============================================================================
// ANALYTICS QUERIES
// ============================================================================

/**
 * Get task completion statistics
 */
export async function getTaskStats() {
  const { data, error } = await supabase
    .from('tasks')
    .select('status')

  if (error) {
    throw new Error(`Failed to fetch task stats: ${error.message}`)
  }

  const stats = {
    total: data.length,
    backlog: data.filter(t => t.status === 'backlog').length,
    todo: data.filter(t => t.status === 'todo').length,
    doing: data.filter(t => t.status === 'doing').length,
    done: data.filter(t => t.status === 'done').length,
    completionRate: data.length > 0 ? (data.filter(t => t.status === 'done').length / data.length) * 100 : 0
  }

  return stats
}

/**
 * Get tasks completed in the last N days
 */
export async function getRecentCompletions(days = 7) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('status', 'done')
    .gte('updated_at', startDate.toISOString())
    .order('updated_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch recent completions: ${error.message}`)
  }

  return data as Task[]
}

/**
 * Get overdue tasks
 */
export async function getOverdueTasks() {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .neq('status', 'done')
    .not('due_date', 'is', null)
    .lt('due_date', now)
    .order('due_date', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch overdue tasks: ${error.message}`)
  }

  return data as Task[]
} 