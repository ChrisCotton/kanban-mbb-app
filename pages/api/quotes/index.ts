import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req

  try {
    switch (method) {
      case 'GET':
        return await getQuotes(req, res)
      case 'POST':
        return await createQuote(req, res)
      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).json({ error: `Method ${method} not allowed` })
    }
  } catch (error: any) {
    console.error('Quotes API error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    })
  }
}

async function getQuotes(req: NextApiRequest, res: NextApiResponse) {
  const { user_id, active_only = 'false' } = req.query

  if (!user_id || typeof user_id !== 'string') {
    return res.status(400).json({ error: 'user_id is required' })
  }

  let query = supabase
    .from('inspirational_quotes')
    .select('*')
    .eq('user_id', user_id)

  if (active_only === 'true') {
    query = query.eq('is_active', true)
  }

  query = query.order('display_order', { ascending: true })

  const { data: quotes, error } = await query

  if (error) {
    console.error('Error fetching quotes:', error)
    return res.status(500).json({ error: 'Failed to fetch quotes' })
  }

  return res.status(200).json({
    success: true,
    data: quotes,
    count: quotes?.length || 0,
  })
}

async function createQuote(req: NextApiRequest, res: NextApiResponse) {
  const { user_id, text, author, is_active = true } = req.body

  if (!user_id) {
    return res.status(400).json({ error: 'Missing required field: user_id' })
  }

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Missing required field: text' })
  }

  if (text.trim().length > 500) {
    return res.status(400).json({ error: 'text must be 500 characters or less' })
  }

  if (author && typeof author === 'string' && author.trim().length > 200) {
    return res.status(400).json({ error: 'author must be 200 characters or less' })
  }

  const { data: maxOrderData } = await supabase
    .from('inspirational_quotes')
    .select('display_order')
    .eq('user_id', user_id)
    .order('display_order', { ascending: false })
    .limit(1)

  const nextDisplayOrder = (maxOrderData?.[0]?.display_order ?? -1) + 1

  const { data: quote, error } = await supabase
    .from('inspirational_quotes')
    .insert({
      user_id,
      text: text.trim(),
      author: author?.trim() || null,
      is_active: Boolean(is_active),
      display_order: nextDisplayOrder,
    })
    .select('*')
    .single()

  if (error) {
    console.error('Error creating quote:', error)
    return res.status(500).json({
      error: 'Failed to create quote',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    })
  }

  return res.status(201).json({
    success: true,
    data: quote,
    message: 'Quote created successfully',
  })
}
