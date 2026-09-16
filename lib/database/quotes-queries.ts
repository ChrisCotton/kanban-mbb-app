import { createClient } from '@supabase/supabase-js'

const getSupabaseClient = () => {
  if (typeof window !== 'undefined') {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export interface InspirationalQuote {
  id: string
  user_id: string
  text: string
  author: string | null
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export interface CreateQuoteData {
  user_id: string
  text: string
  author?: string | null
  is_active?: boolean
}

export interface UpdateQuoteData {
  text?: string
  author?: string | null
  is_active?: boolean
  display_order?: number
}

export interface DisplayQuote {
  id: string
  text: string
  author?: string | null
}

export async function getActiveQuotes(userId: string): Promise<InspirationalQuote[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('inspirational_quotes')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching active quotes:', error)
    throw error
  }

  return data || []
}

export async function getAllQuotes(userId: string): Promise<InspirationalQuote[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('inspirational_quotes')
    .select('*')
    .eq('user_id', userId)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching quotes:', error)
    throw error
  }

  return data || []
}

export async function createQuote(data: CreateQuoteData): Promise<InspirationalQuote> {
  const supabase = getSupabaseClient()

  const { data: maxOrderData } = await supabase
    .from('inspirational_quotes')
    .select('display_order')
    .eq('user_id', data.user_id)
    .order('display_order', { ascending: false })
    .limit(1)

  const nextDisplayOrder = (maxOrderData?.[0]?.display_order ?? -1) + 1

  const { data: quote, error } = await supabase
    .from('inspirational_quotes')
    .insert({
      user_id: data.user_id,
      text: data.text.trim(),
      author: data.author?.trim() || null,
      is_active: data.is_active ?? true,
      display_order: nextDisplayOrder,
    })
    .select('*')
    .single()

  if (error) {
    console.error('Error creating quote:', error)
    throw error
  }

  return quote
}

export async function updateQuote(
  quoteId: string,
  userId: string,
  updates: UpdateQuoteData
): Promise<InspirationalQuote> {
  const supabase = getSupabaseClient()

  const payload: UpdateQuoteData = { ...updates }
  if (payload.text !== undefined) {
    payload.text = payload.text.trim()
  }
  if (payload.author !== undefined) {
    payload.author = payload.author?.trim() || null
  }

  const { data: quote, error } = await supabase
    .from('inspirational_quotes')
    .update(payload)
    .eq('id', quoteId)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error) {
    console.error('Error updating quote:', error)
    throw error
  }

  return quote
}

export async function deleteQuote(quoteId: string, userId: string): Promise<void> {
  const supabase = getSupabaseClient()

  const { error } = await supabase
    .from('inspirational_quotes')
    .delete()
    .eq('id', quoteId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error deleting quote:', error)
    throw error
  }
}

export async function reorderQuote(
  quoteId: string,
  userId: string,
  newOrder: number
): Promise<InspirationalQuote> {
  return updateQuote(quoteId, userId, { display_order: newOrder })
}
