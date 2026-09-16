import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Quote ID is required' })
  }

  try {
    switch (method) {
      case 'GET':
        return await getQuote(req, res, id)
      case 'PUT':
        return await updateQuote(req, res, id)
      case 'PATCH':
        return await patchQuote(req, res, id)
      case 'DELETE':
        return await deleteQuote(req, res, id)
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'PATCH', 'DELETE'])
        return res.status(405).json({ error: `Method ${method} not allowed` })
    }
  } catch (error: any) {
    console.error('Quote API error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    })
  }
}

async function getQuote(req: NextApiRequest, res: NextApiResponse, quoteId: string) {
  const { user_id } = req.query

  if (!user_id || typeof user_id !== 'string') {
    return res.status(400).json({ error: 'user_id is required' })
  }

  const { data: quote, error } = await supabase
    .from('inspirational_quotes')
    .select('*')
    .eq('id', quoteId)
    .eq('user_id', user_id)
    .single()

  if (error || !quote) {
    return res.status(404).json({ error: 'Quote not found' })
  }

  return res.status(200).json({ success: true, data: quote })
}

async function updateQuote(req: NextApiRequest, res: NextApiResponse, quoteId: string) {
  const { user_id, text, author, is_active, display_order } = req.body

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' })
  }

  const { data: existing } = await supabase
    .from('inspirational_quotes')
    .select('id')
    .eq('id', quoteId)
    .eq('user_id', user_id)
    .single()

  if (!existing) {
    return res.status(404).json({ error: 'Quote not found or access denied' })
  }

  const updates: Record<string, unknown> = {}

  if (text !== undefined) {
    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'text cannot be empty' })
    }
    if (text.trim().length > 500) {
      return res.status(400).json({ error: 'text must be 500 characters or less' })
    }
    updates.text = text.trim()
  }

  if (author !== undefined) {
    if (author && typeof author === 'string' && author.trim().length > 200) {
      return res.status(400).json({ error: 'author must be 200 characters or less' })
    }
    updates.author = author?.trim() || null
  }

  if (is_active !== undefined) {
    updates.is_active = Boolean(is_active)
  }

  if (display_order !== undefined) {
    updates.display_order = display_order
  }

  const { data: quote, error } = await supabase
    .from('inspirational_quotes')
    .update(updates)
    .eq('id', quoteId)
    .eq('user_id', user_id)
    .select('*')
    .single()

  if (error) {
    console.error('Error updating quote:', error)
    return res.status(500).json({ error: 'Failed to update quote' })
  }

  return res.status(200).json({
    success: true,
    data: quote,
    message: 'Quote updated successfully',
  })
}

async function patchQuote(req: NextApiRequest, res: NextApiResponse, quoteId: string) {
  const { user_id, action, display_order } = req.body

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' })
  }

  const { data: existing } = await supabase
    .from('inspirational_quotes')
    .select('id, is_active, display_order')
    .eq('id', quoteId)
    .eq('user_id', user_id)
    .single()

  if (!existing) {
    return res.status(404).json({ error: 'Quote not found or access denied' })
  }

  if (action === 'activate') {
    const { data: quote, error } = await supabase
      .from('inspirational_quotes')
      .update({ is_active: true })
      .eq('id', quoteId)
      .eq('user_id', user_id)
      .select('*')
      .single()

    if (error) {
      return res.status(500).json({ error: 'Failed to activate quote' })
    }

    return res.status(200).json({ success: true, data: quote, message: 'Quote activated' })
  }

  if (action === 'deactivate') {
    const { data: quote, error } = await supabase
      .from('inspirational_quotes')
      .update({ is_active: false })
      .eq('id', quoteId)
      .eq('user_id', user_id)
      .select('*')
      .single()

    if (error) {
      return res.status(500).json({ error: 'Failed to deactivate quote' })
    }

    return res.status(200).json({ success: true, data: quote, message: 'Quote deactivated' })
  }

  if (action === 'reorder' && display_order !== undefined) {
    const { data: quote, error } = await supabase
      .from('inspirational_quotes')
      .update({ display_order })
      .eq('id', quoteId)
      .eq('user_id', user_id)
      .select('*')
      .single()

    if (error) {
      return res.status(500).json({ error: 'Failed to reorder quote' })
    }

    return res.status(200).json({ success: true, data: quote, message: 'Quote reordered' })
  }

  return res.status(400).json({ error: 'Invalid action or missing display_order' })
}

async function deleteQuote(req: NextApiRequest, res: NextApiResponse, quoteId: string) {
  const { user_id } = req.query

  if (!user_id || typeof user_id !== 'string') {
    return res.status(400).json({ error: 'user_id is required' })
  }

  const { data: existing } = await supabase
    .from('inspirational_quotes')
    .select('id')
    .eq('id', quoteId)
    .eq('user_id', user_id)
    .single()

  if (!existing) {
    return res.status(404).json({ error: 'Quote not found or access denied' })
  }

  const { error } = await supabase
    .from('inspirational_quotes')
    .delete()
    .eq('id', quoteId)
    .eq('user_id', user_id)

  if (error) {
    console.error('Error deleting quote:', error)
    return res.status(500).json({ error: 'Failed to delete quote' })
  }

  return res.status(200).json({
    success: true,
    message: 'Quote deleted successfully',
  })
}
