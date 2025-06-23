import { createClient } from '@supabase/supabase-js'

// Use appropriate Supabase client based on context
const getSupabaseClient = () => {
  if (typeof window !== 'undefined') {
    // Client-side: use public client
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  } else {
    // Server-side: use service role client
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
}

export interface VisionBoardImage {
  id: string
  user_id: string
  file_name: string
  file_path: string
  file_size?: number
  mime_type?: string
  title?: string
  alt_text?: string
  description?: string
  is_active: boolean
  display_order: number
  width_px?: number
  height_px?: number
  uploaded_at: string
  last_viewed_at?: string
  view_count: number
  created_at: string
  updated_at: string
}

export interface CreateVisionBoardImageData {
  user_id: string
  file_name: string
  file_path: string
  file_size?: number
  mime_type?: string
  title?: string
  alt_text?: string
  description?: string
  is_active?: boolean
  width_px?: number
  height_px?: number
}

export interface UpdateVisionBoardImageData {
  file_name?: string
  title?: string
  alt_text?: string
  description?: string
  is_active?: boolean
  width_px?: number
  height_px?: number
}

export interface VisionBoardQueryOptions {
  activeOnly?: boolean
  limit?: number
  offset?: number
  orderBy?: 'display_order' | 'created_at' | 'view_count'
  orderDirection?: 'asc' | 'desc'
}

/**
 * Get all vision board images for a user
 */
export async function getVisionBoardImages(
  userId: string,
  options: VisionBoardQueryOptions = {}
): Promise<{ data: VisionBoardImage[] | null; error: any }> {
  const supabase = getSupabaseClient()
  const {
    activeOnly = false,
    limit = 50,
    offset = 0,
    orderBy = 'display_order',
    orderDirection = 'asc'
  } = options

  try {
    let query = supabase
      .from('vision_board_images')
      .select('*')
      .eq('user_id', userId)

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    // Apply ordering
    query = query.order(orderBy, { ascending: orderDirection === 'asc' })
    
    // If ordering by display_order, add secondary sort by created_at
    if (orderBy === 'display_order') {
      query = query.order('created_at', { ascending: true })
    }

    // Apply pagination
    if (limit > 0) {
      query = query.range(offset, offset + limit - 1)
    }

    const { data, error } = await query

    return { data, error }
  } catch (error) {
    console.error('Error fetching vision board images:', error)
    return { data: null, error }
  }
}

/**
 * Get active carousel images for a user (optimized for carousel display)
 */
export async function getActiveCarouselImages(
  userId: string
): Promise<{ data: VisionBoardImage[] | null; error: any }> {
  const supabase = getSupabaseClient()

  try {
    const { data, error } = await supabase
      .rpc('get_active_carousel_images', { p_user_id: userId })

    return { data, error }
  } catch (error) {
    console.error('Error fetching active carousel images:', error)
    return { data: null, error }
  }
}

/**
 * Get a single vision board image by ID
 */
export async function getVisionBoardImageById(
  imageId: string,
  userId: string
): Promise<{ data: VisionBoardImage | null; error: any }> {
  const supabase = getSupabaseClient()

  try {
    const { data, error } = await supabase
      .from('vision_board_images')
      .select('*')
      .eq('id', imageId)
      .eq('user_id', userId)
      .single()

    return { data, error }
  } catch (error) {
    console.error('Error fetching vision board image:', error)
    return { data: null, error }
  }
}

/**
 * Create a new vision board image
 */
export async function createVisionBoardImage(
  imageData: CreateVisionBoardImageData
): Promise<{ data: VisionBoardImage | null; error: any }> {
  const supabase = getSupabaseClient()

  try {
    // Get the current max display_order for this user
    const { data: maxOrderData } = await supabase
      .from('vision_board_images')
      .select('display_order')
      .eq('user_id', imageData.user_id)
      .order('display_order', { ascending: false })
      .limit(1)

    const nextDisplayOrder = (maxOrderData?.[0]?.display_order || 0) + 1

    const { data, error } = await supabase
      .from('vision_board_images')
      .insert({
        ...imageData,
        display_order: nextDisplayOrder,
        is_active: imageData.is_active ?? true,
        view_count: 0
      })
      .select('*')
      .single()

    return { data, error }
  } catch (error) {
    console.error('Error creating vision board image:', error)
    return { data: null, error }
  }
}

/**
 * Update a vision board image
 */
export async function updateVisionBoardImage(
  imageId: string,
  userId: string,
  updateData: UpdateVisionBoardImageData
): Promise<{ data: VisionBoardImage | null; error: any }> {
  const supabase = getSupabaseClient()

  try {
    const { data, error } = await supabase
      .from('vision_board_images')
      .update(updateData)
      .eq('id', imageId)
      .eq('user_id', userId)
      .select('*')
      .single()

    return { data, error }
  } catch (error) {
    console.error('Error updating vision board image:', error)
    return { data: null, error }
  }
}

/**
 * Delete a vision board image
 */
export async function deleteVisionBoardImage(
  imageId: string,
  userId: string
): Promise<{ error: any }> {
  const supabase = getSupabaseClient()

  try {
    const { error } = await supabase
      .from('vision_board_images')
      .delete()
      .eq('id', imageId)
      .eq('user_id', userId)

    return { error }
  } catch (error) {
    console.error('Error deleting vision board image:', error)
    return { error }
  }
}

/**
 * Toggle active status of an image
 */
export async function toggleImageActiveStatus(
  imageId: string,
  userId: string
): Promise<{ data: boolean | null; error: any }> {
  const supabase = getSupabaseClient()

  try {
    const { data, error } = await supabase
      .rpc('toggle_image_active_status', { p_image_id: imageId })

    return { data, error }
  } catch (error) {
    console.error('Error toggling image active status:', error)
    return { data: null, error }
  }
}

/**
 * Reorder vision board images
 */
export async function reorderVisionBoardImages(
  imageIds: string[],
  userId: string
): Promise<{ error: any }> {
  const supabase = getSupabaseClient()

  try {
    // Verify all images belong to the user before reordering
    const { data: userImages } = await supabase
      .from('vision_board_images')
      .select('id')
      .eq('user_id', userId)
      .in('id', imageIds)

    if (!userImages || userImages.length !== imageIds.length) {
      return { error: new Error('Some images do not belong to this user') }
    }

    const { error } = await supabase
      .rpc('reorder_vision_board_images', { p_image_ids: imageIds })

    return { error }
  } catch (error) {
    console.error('Error reordering vision board images:', error)
    return { error }
  }
}

/**
 * Record image view (increment view count and update last viewed timestamp)
 */
export async function recordImageView(
  imageId: string,
  userId: string
): Promise<{ error: any }> {
  const supabase = getSupabaseClient()

  try {
    const { error } = await supabase
      .rpc('record_image_view', { p_image_id: imageId })

    return { error }
  } catch (error) {
    console.error('Error recording image view:', error)
    return { error }
  }
}

/**
 * Bulk update image active status
 */
export async function bulkUpdateImageActiveStatus(
  imageIds: string[],
  userId: string,
  isActive: boolean
): Promise<{ data: VisionBoardImage[] | null; error: any }> {
  const supabase = getSupabaseClient()

  try {
    const { data, error } = await supabase
      .from('vision_board_images')
      .update({ is_active: isActive })
      .eq('user_id', userId)
      .in('id', imageIds)
      .select('*')

    return { data, error }
  } catch (error) {
    console.error('Error bulk updating image active status:', error)
    return { data: null, error }
  }
}

/**
 * Get vision board statistics for a user
 */
export async function getVisionBoardStats(
  userId: string
): Promise<{ 
  data: {
    totalImages: number
    activeImages: number
    totalViews: number
    averageViews: number
  } | null
  error: any 
}> {
  const supabase = getSupabaseClient()

  try {
    const { data, error } = await supabase
      .from('vision_board_images')
      .select('is_active, view_count')
      .eq('user_id', userId)

    if (error || !data) {
      return { data: null, error }
    }

    const totalImages = data.length
    const activeImages = data.filter(img => img.is_active).length
    const totalViews = data.reduce((sum, img) => sum + (img.view_count || 0), 0)
    const averageViews = totalImages > 0 ? totalViews / totalImages : 0

    return {
      data: {
        totalImages,
        activeImages,
        totalViews,
        averageViews: Math.round(averageViews * 100) / 100 // Round to 2 decimal places
      },
      error: null
    }
  } catch (error) {
    console.error('Error fetching vision board stats:', error)
    return { data: null, error }
  }
}

/**
 * Search vision board images by title or description
 */
export async function searchVisionBoardImages(
  userId: string,
  searchQuery: string,
  options: VisionBoardQueryOptions = {}
): Promise<{ data: VisionBoardImage[] | null; error: any }> {
  const supabase = getSupabaseClient()
  const { activeOnly = false, limit = 50, offset = 0 } = options

  try {
    let query = supabase
      .from('vision_board_images')
      .select('*')
      .eq('user_id', userId)
      .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    query = query
      .order('display_order', { ascending: true })
      .range(offset, offset + limit - 1)

    const { data, error } = await query

    return { data, error }
  } catch (error) {
    console.error('Error searching vision board images:', error)
    return { data: null, error }
  }
}

/**
 * Get recently viewed images
 */
export async function getRecentlyViewedImages(
  userId: string,
  limit: number = 10
): Promise<{ data: VisionBoardImage[] | null; error: any }> {
  const supabase = getSupabaseClient()

  try {
    const { data, error } = await supabase
      .from('vision_board_images')
      .select('*')
      .eq('user_id', userId)
      .not('last_viewed_at', 'is', null)
      .order('last_viewed_at', { ascending: false })
      .limit(limit)

    return { data, error }
  } catch (error) {
    console.error('Error fetching recently viewed images:', error)
    return { data: null, error }
  }
}

/**
 * Get most viewed images
 */
export async function getMostViewedImages(
  userId: string,
  limit: number = 10
): Promise<{ data: VisionBoardImage[] | null; error: any }> {
  const supabase = getSupabaseClient()

  try {
    const { data, error } = await supabase
      .from('vision_board_images')
      .select('*')
      .eq('user_id', userId)
      .gt('view_count', 0)
      .order('view_count', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)

    return { data, error }
  } catch (error) {
    console.error('Error fetching most viewed images:', error)
    return { data: null, error }
  }
}

/**
 * Update display order of a single image
 */
export async function updateImageDisplayOrder(
  imageId: string,
  userId: string,
  newOrder: number
): Promise<{ data: VisionBoardImage | null; error: any }> {
  const supabase = getSupabaseClient()

  try {
    const { data, error } = await supabase
      .from('vision_board_images')
      .update({ display_order: newOrder })
      .eq('id', imageId)
      .eq('user_id', userId)
      .select('*')
      .single()

    return { data, error }
  } catch (error) {
    console.error('Error updating image display order:', error)
    return { data: null, error }
  }
}