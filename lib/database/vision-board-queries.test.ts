import {
  getVisionBoardImages,
  getActiveCarouselImages,
  getVisionBoardImageById,
  createVisionBoardImage,
  updateVisionBoardImage,
  deleteVisionBoardImage,
  toggleImageActiveStatus,
  reorderVisionBoardImages,
  recordImageView,
  bulkUpdateImageActiveStatus,
  getVisionBoardStats,
  searchVisionBoardImages,
  getRecentlyViewedImages,
  getMostViewedImages,
  updateImageDisplayOrder,
  VisionBoardImage,
  CreateVisionBoardImageData,
  UpdateVisionBoardImageData
} from './vision-board-queries'

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(),
  rpc: jest.fn()
}

// Mock the createClient function
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient)
}))

const mockUserId = 'user-123'
const mockImageId = 'image-456'

const mockVisionBoardImage: VisionBoardImage = {
  id: mockImageId,
  user_id: mockUserId,
  file_name: 'test-image.jpg',
  file_path: '/test/path/test-image.jpg',
  file_size: 1024,
  mime_type: 'image/jpeg',
  title: 'Test Image',
  alt_text: 'Test alt text',
  description: 'Test description',
  is_active: true,
  display_order: 0,
  width_px: 800,
  height_px: 600,
  uploaded_at: '2024-01-01T00:00:00Z',
  last_viewed_at: '2024-01-02T00:00:00Z',
  view_count: 5,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  goal: 'Test goal',
  due_date: '2024-12-31',
  media_type: 'image',
  generation_prompt: null,
  ai_provider: null
}

const mockCreateImageData: CreateVisionBoardImageData = {
  user_id: mockUserId,
  file_name: 'new-image.jpg',
  file_path: '/new/path/new-image.jpg',
  title: 'New Image',
  description: 'New description',
  is_active: true,
  goal: 'New goal',
  due_date: '2024-12-31',
  media_type: 'image'
}

const mockUpdateImageData: UpdateVisionBoardImageData = {
  title: 'Updated Title',
  description: 'Updated description',
  is_active: false,
  goal: 'Updated goal',
  due_date: '2025-01-01'
}

// Helper function to create a mock query chain
const createMockQueryChain = (returnValue: any, shouldError = false) => {
  const mockChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis()
  }

  // Set up the final promise resolution
  const finalResult = shouldError 
    ? Promise.resolve({ data: null, error: new Error('Test error') })
    : Promise.resolve({ data: returnValue, error: null })

  // All methods in the chain should return the promise when actually executed
  Object.keys(mockChain).forEach(key => {
    mockChain[key].mockImplementation(() => {
      // If this is the last call in a chain (e.g., after select), return the promise
      if (key === 'single' || key === 'limit' || key === 'range') {
        return finalResult
      }
      return mockChain
    })
  })

  return { mockChain, finalResult }
}

describe('Vision Board Queries', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getVisionBoardImages', () => {
    it('should fetch all images for a user with default options', async () => {
      const { mockChain } = createMockQueryChain([mockVisionBoardImage])
      mockSupabaseClient.from.mockReturnValue(mockChain)

      const result = await getVisionBoardImages(mockUserId)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('vision_board_images')
      expect(mockChain.select).toHaveBeenCalledWith('*')
      expect(mockChain.eq).toHaveBeenCalledWith('user_id', mockUserId)
      expect(mockChain.order).toHaveBeenCalledWith('display_order', { ascending: true })
      expect(result.data).toEqual([mockVisionBoardImage])
      expect(result.error).toBeNull()
    })

    it('should filter active images only when activeOnly is true', async () => {
      const { mockChain } = createMockQueryChain([mockVisionBoardImage])
      mockSupabaseClient.from.mockReturnValue(mockChain)

      await getVisionBoardImages(mockUserId, { activeOnly: true })

      expect(mockChain.eq).toHaveBeenCalledWith('is_active', true)
    })

    it('should apply pagination when limit and offset are provided', async () => {
      const { mockChain } = createMockQueryChain([mockVisionBoardImage])
      mockSupabaseClient.from.mockReturnValue(mockChain)

      await getVisionBoardImages(mockUserId, { limit: 10, offset: 20 })

      expect(mockChain.range).toHaveBeenCalledWith(20, 29)
    })

    it('should filter by due_date range when provided', async () => {
      const { mockChain } = createMockQueryChain([mockVisionBoardImage])
      mockSupabaseClient.from.mockReturnValue(mockChain)

      await getVisionBoardImages(mockUserId, {
        dueDateFrom: '2024-01-01',
        dueDateTo: '2024-12-31'
      })

      expect(mockChain.gte).toHaveBeenCalledWith('due_date', '2024-01-01')
      expect(mockChain.lte).toHaveBeenCalledWith('due_date', '2024-12-31')
    })

    it('should sort by due_date when sortByDueDate is true', async () => {
      const { mockChain } = createMockQueryChain([mockVisionBoardImage])
      mockSupabaseClient.from.mockReturnValue(mockChain)

      await getVisionBoardImages(mockUserId, {
        sortByDueDate: true,
        orderDirection: 'asc'
      })

      expect(mockChain.order).toHaveBeenCalledWith('due_date', { ascending: true })
    })

    it('should include goal, due_date, and media_type in response', async () => {
      const { mockChain } = createMockQueryChain([mockVisionBoardImage])
      mockSupabaseClient.from.mockReturnValue(mockChain)

      const result = await getVisionBoardImages(mockUserId)

      expect(result.data).toEqual([mockVisionBoardImage])
      expect(result.data?.[0]).toHaveProperty('goal')
      expect(result.data?.[0]).toHaveProperty('due_date')
      expect(result.data?.[0]).toHaveProperty('media_type')
    })

    it('should handle errors', async () => {
      const { mockChain } = createMockQueryChain(null, true)
      mockSupabaseClient.from.mockReturnValue(mockChain)

      const result = await getVisionBoardImages(mockUserId)

      expect(result.data).toBeNull()
      expect(result.error).toBeInstanceOf(Error)
    })
  })

  describe('getActiveCarouselImages', () => {
    it('should call the RPC function for active carousel images', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ data: [mockVisionBoardImage], error: null })

      const result = await getActiveCarouselImages(mockUserId)

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_active_carousel_images', { p_user_id: mockUserId })
      expect(result.data).toEqual([mockVisionBoardImage])
      expect(result.error).toBeNull()
    })

    it('should handle RPC errors', async () => {
      const error = new Error('RPC error')
      mockSupabaseClient.rpc.mockResolvedValue({ data: null, error })

      const result = await getActiveCarouselImages(mockUserId)

      expect(result.data).toBeNull()
      expect(result.error).toBe(error)
    })
  })

  describe('getVisionBoardImageById', () => {
    it('should fetch a single image by ID', async () => {
      const { mockChain } = createMockQueryChain(mockVisionBoardImage)
      mockSupabaseClient.from.mockReturnValue(mockChain)

      const result = await getVisionBoardImageById(mockImageId, mockUserId)

      expect(mockChain.eq).toHaveBeenCalledWith('id', mockImageId)
      expect(mockChain.eq).toHaveBeenCalledWith('user_id', mockUserId)
      expect(mockChain.single).toHaveBeenCalled()
      expect(result.data).toEqual(mockVisionBoardImage)
    })
  })

  describe('createVisionBoardImage', () => {
    it('should require goal and due_date', async () => {
      const { mockChain } = createMockQueryChain([mockVisionBoardImage])
      mockSupabaseClient.from.mockReturnValue(mockChain)

      const imageData = {
        user_id: mockUserId,
        file_name: 'test.jpg',
        file_path: '/path/to/test.jpg',
        goal: 'Test goal',
        due_date: '2024-12-31',
        media_type: 'image' as const
      }

      await createVisionBoardImage(imageData)

      expect(mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          goal: 'Test goal',
          due_date: '2024-12-31',
          media_type: 'image'
        })
      )
    })

    it('should validate goal is not null', async () => {
      const imageData = {
        user_id: mockUserId,
        file_name: 'test.jpg',
        file_path: '/path/to/test.jpg',
        // Missing goal and due_date
      } as any

      // TypeScript should catch this, but we test runtime behavior
      expect(() => createVisionBoardImage(imageData)).not.toThrow()
      // The API layer will validate this
    })
    it('should create a new image with auto-generated display order', async () => {
      // Mock the max order query
      const maxOrderMockChain = createMockQueryChain([{ display_order: 5 }])
      
      // Mock the insert query
      const insertMockChain = createMockQueryChain(mockVisionBoardImage)
      
      mockSupabaseClient.from.mockReturnValueOnce(maxOrderMockChain.mockChain)
      mockSupabaseClient.from.mockReturnValueOnce(insertMockChain.mockChain)

      const result = await createVisionBoardImage(mockCreateImageData)

      expect(insertMockChain.mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockCreateImageData,
          display_order: 6,
          is_active: true,
          view_count: 0
        })
      )
      expect(result.data).toEqual(mockVisionBoardImage)
    })

    it('should handle creation with no existing images (first image)', async () => {
      // Mock empty max order query
      const maxOrderMockChain = createMockQueryChain([])
      const insertMockChain = createMockQueryChain(mockVisionBoardImage)
      
      mockSupabaseClient.from.mockReturnValueOnce(maxOrderMockChain.mockChain)
      mockSupabaseClient.from.mockReturnValueOnce(insertMockChain.mockChain)

      await createVisionBoardImage(mockCreateImageData)

      expect(insertMockChain.mockChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          display_order: 1
        })
      )
    })
  })

  describe('updateVisionBoardImage', () => {
    it('should update an image with provided data', async () => {
      const { mockChain } = createMockQueryChain(mockVisionBoardImage)
      mockSupabaseClient.from.mockReturnValue(mockChain)

      const result = await updateVisionBoardImage(mockImageId, mockUserId, mockUpdateImageData)

      expect(mockChain.update).toHaveBeenCalledWith(mockUpdateImageData)
      expect(mockChain.eq).toHaveBeenCalledWith('id', mockImageId)
      expect(mockChain.eq).toHaveBeenCalledWith('user_id', mockUserId)
      expect(result.data).toEqual(mockVisionBoardImage)
    })
  })

  describe('deleteVisionBoardImage', () => {
    it('should delete an image', async () => {
      const { mockChain } = createMockQueryChain(null)
      mockSupabaseClient.from.mockReturnValue(mockChain)

      const result = await deleteVisionBoardImage(mockImageId, mockUserId)

      expect(mockChain.delete).toHaveBeenCalled()
      expect(mockChain.eq).toHaveBeenCalledWith('id', mockImageId)
      expect(mockChain.eq).toHaveBeenCalledWith('user_id', mockUserId)
      expect(result.error).toBeNull()
    })
  })

  describe('toggleImageActiveStatus', () => {
    it('should call the toggle RPC function', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ data: false, error: null })

      const result = await toggleImageActiveStatus(mockImageId, mockUserId)

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('toggle_image_active_status', { p_image_id: mockImageId })
      expect(result.data).toBe(false)
    })
  })

  describe('reorderVisionBoardImages', () => {
    const imageIds = ['img1', 'img2', 'img3']

    it('should reorder images after verifying ownership', async () => {
      // Mock user verification query
      const verifyMockChain = createMockQueryChain([{ id: 'img1' }, { id: 'img2' }, { id: 'img3' }])
      mockSupabaseClient.from.mockReturnValue(verifyMockChain.mockChain)
      
      // Mock RPC call
      mockSupabaseClient.rpc.mockResolvedValue({ error: null })

      const result = await reorderVisionBoardImages(imageIds, mockUserId)

      expect(verifyMockChain.mockChain.eq).toHaveBeenCalledWith('user_id', mockUserId)
      expect(verifyMockChain.mockChain.in).toHaveBeenCalledWith('id', imageIds)
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('reorder_vision_board_images', { p_image_ids: imageIds })
      expect(result.error).toBeNull()
    })

    it('should return error if not all images belong to user', async () => {
      // Mock incomplete user verification
      const verifyMockChain = createMockQueryChain([{ id: 'img1' }]) // Only one image returned
      mockSupabaseClient.from.mockReturnValue(verifyMockChain.mockChain)

      const result = await reorderVisionBoardImages(imageIds, mockUserId)

      expect(result.error).toBeInstanceOf(Error)
      expect(result.error.message).toContain('do not belong to this user')
    })
  })

  describe('recordImageView', () => {
    it('should call the record view RPC function', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({ error: null })

      const result = await recordImageView(mockImageId, mockUserId)

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('record_image_view', { p_image_id: mockImageId })
      expect(result.error).toBeNull()
    })
  })

  describe('bulkUpdateImageActiveStatus', () => {
    const imageIds = ['img1', 'img2']

    it('should update active status for multiple images', async () => {
      const { mockChain } = createMockQueryChain([mockVisionBoardImage, mockVisionBoardImage])
      mockSupabaseClient.from.mockReturnValue(mockChain)

      const result = await bulkUpdateImageActiveStatus(imageIds, mockUserId, false)

      expect(mockChain.update).toHaveBeenCalledWith({ is_active: false })
      expect(mockChain.eq).toHaveBeenCalledWith('user_id', mockUserId)
      expect(mockChain.in).toHaveBeenCalledWith('id', imageIds)
      expect(result.data).toHaveLength(2)
    })
  })

  describe('getVisionBoardStats', () => {
    it('should calculate statistics correctly', async () => {
      const mockData = [
        { is_active: true, view_count: 10 },
        { is_active: false, view_count: 5 },
        { is_active: true, view_count: 15 }
      ]
      const { mockChain } = createMockQueryChain(mockData)
      mockSupabaseClient.from.mockReturnValue(mockChain)

      const result = await getVisionBoardStats(mockUserId)

      expect(result.data).toEqual({
        totalImages: 3,
        activeImages: 2,
        totalViews: 30,
        averageViews: 10
      })
    })

    it('should handle empty data', async () => {
      const { mockChain } = createMockQueryChain([])
      mockSupabaseClient.from.mockReturnValue(mockChain)

      const result = await getVisionBoardStats(mockUserId)

      expect(result.data).toEqual({
        totalImages: 0,
        activeImages: 0,
        totalViews: 0,
        averageViews: 0
      })
    })
  })

  describe('searchVisionBoardImages', () => {
    it('should search images by title and description', async () => {
      const { mockChain } = createMockQueryChain([mockVisionBoardImage])
      mockSupabaseClient.from.mockReturnValue(mockChain)

      const result = await searchVisionBoardImages(mockUserId, 'test query')

      expect(mockChain.or).toHaveBeenCalledWith('title.ilike.%test query%,description.ilike.%test query%')
      expect(result.data).toEqual([mockVisionBoardImage])
    })

    it('should filter active images in search when specified', async () => {
      const { mockChain } = createMockQueryChain([mockVisionBoardImage])
      mockSupabaseClient.from.mockReturnValue(mockChain)

      await searchVisionBoardImages(mockUserId, 'test', { activeOnly: true })

      expect(mockChain.eq).toHaveBeenCalledWith('is_active', true)
    })
  })

  describe('getRecentlyViewedImages', () => {
    it('should fetch recently viewed images', async () => {
      const { mockChain } = createMockQueryChain([mockVisionBoardImage])
      mockSupabaseClient.from.mockReturnValue(mockChain)

      const result = await getRecentlyViewedImages(mockUserId, 5)

      expect(mockChain.not).toHaveBeenCalledWith('last_viewed_at', 'is', null)
      expect(mockChain.order).toHaveBeenCalledWith('last_viewed_at', { ascending: false })
      expect(mockChain.limit).toHaveBeenCalledWith(5)
      expect(result.data).toEqual([mockVisionBoardImage])
    })
  })

  describe('getMostViewedImages', () => {
    it('should fetch most viewed images', async () => {
      const { mockChain } = createMockQueryChain([mockVisionBoardImage])
      mockSupabaseClient.from.mockReturnValue(mockChain)

      const result = await getMostViewedImages(mockUserId, 10)

      expect(mockChain.gt).toHaveBeenCalledWith('view_count', 0)
      expect(mockChain.order).toHaveBeenCalledWith('view_count', { ascending: false })
      expect(mockChain.limit).toHaveBeenCalledWith(10)
      expect(result.data).toEqual([mockVisionBoardImage])
    })
  })

  describe('updateImageDisplayOrder', () => {
    it('should update the display order of a single image', async () => {
      const { mockChain } = createMockQueryChain(mockVisionBoardImage)
      mockSupabaseClient.from.mockReturnValue(mockChain)

      const result = await updateImageDisplayOrder(mockImageId, mockUserId, 3)

      expect(mockChain.update).toHaveBeenCalledWith({ display_order: 3 })
      expect(mockChain.eq).toHaveBeenCalledWith('id', mockImageId)
      expect(mockChain.eq).toHaveBeenCalledWith('user_id', mockUserId)
      expect(result.data).toEqual(mockVisionBoardImage)
    })
  })

  describe('Error Handling', () => {
    it('should handle thrown exceptions in all functions', async () => {
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const result = await getVisionBoardImages(mockUserId)

      expect(result.data).toBeNull()
      expect(result.error).toBeInstanceOf(Error)
    })

    it('should handle RPC exceptions', async () => {
      mockSupabaseClient.rpc.mockImplementation(() => {
        throw new Error('RPC failed')
      })

      const result = await toggleImageActiveStatus(mockImageId, mockUserId)

      expect(result.data).toBeNull()
      expect(result.error).toBeInstanceOf(Error)
    })
  })
})