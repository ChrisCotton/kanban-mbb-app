import { renderHook, act, waitFor } from '@testing-library/react'
import { useCategories } from './useCategories'

// Mock fetch globally
global.fetch = jest.fn()

const mockCategories = [
  {
    id: '1',
    name: 'Development',
    hourly_rate: 85,
    color: '#3B82F6',
    is_active: true,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    created_by: 'user1',
    updated_by: 'user1',
    user_id: 'user1'
  },
  {
    id: '2',
    name: 'Design',
    hourly_rate: 75,
    color: '#10B981',
    is_active: true,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    created_by: 'user1',
    updated_by: 'user1',
    user_id: 'user1'
  },
  {
    id: '3',
    name: 'Research',
    hourly_rate: 65,
    color: '#F59E0B',
    is_active: false,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    created_by: 'user1',
    updated_by: 'user1',
    user_id: 'user1'
  }
]

describe('useCategories Hook', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should load categories on mount', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockCategories })
    })

    const { result } = renderHook(() => useCategories())

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.categories).toEqual(mockCategories)
    expect(result.current.error).toBe(null)
    expect(fetch).toHaveBeenCalledWith('/api/categories', { signal: expect.any(AbortSignal) })
  })

  it('should handle loading error', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useCategories())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.categories).toEqual([])
    expect(result.current.error).toBe('Network error')
  })

  it('should create a new category', async () => {
    const newCategory = {
      id: '4',
      name: 'Writing',
      hourly_rate: 55,
      color: '#EF4444',
      is_active: true,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      created_by: 'user1',
      updated_by: 'user1',
      user_id: 'user1'
    }

    // Mock load categories first
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockCategories })
    })

    const { result } = renderHook(() => useCategories())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Mock create category
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: newCategory })
    })

    let createdCategory: any
    await act(async () => {
      createdCategory = await result.current.createCategory({
        name: 'Writing',
        hourly_rate_usd: '55.00',
        color: '#EF4444'
      })
    })

    expect(createdCategory).toEqual(newCategory)
    expect(result.current.categories).toHaveLength(4)
    expect(result.current.categories[3]).toEqual(newCategory)
  })

  it('should update an existing category', async () => {
    // Mock load categories first
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockCategories })
    })

    const { result } = renderHook(() => useCategories())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const updatedCategory = { ...mockCategories[0], name: 'Updated Development' }

    // Mock update category
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: updatedCategory })
    })

    let updated: any
    await act(async () => {
      updated = await result.current.updateCategory('1', { name: 'Updated Development' })
    })

    expect(updated).toEqual(updatedCategory)
    expect(result.current.categories[0].name).toBe('Updated Development')
  })

  it('should delete a category', async () => {
    // Mock load categories first
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockCategories })
    })

    const { result } = renderHook(() => useCategories())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Mock delete category
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true })
    })

    let deleted: boolean
    await act(async () => {
      deleted = await result.current.deleteCategory('1')
    })

    expect(deleted).toBe(true)
    expect(result.current.categories).toHaveLength(2)
    expect(result.current.categories.find(cat => cat.id === '1')).toBeUndefined()
  })

  it('should get category by ID', async () => {
    // Mock load categories first
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockCategories })
    })

    const { result } = renderHook(() => useCategories())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const category = result.current.getCategoryById('1')
    expect(category).toEqual(mockCategories[0])

    const notFound = result.current.getCategoryById('999')
    expect(notFound).toBeUndefined()
  })

  it('should get active categories only', async () => {
    // Mock load categories first
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockCategories })
    })

    const { result } = renderHook(() => useCategories())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const activeCategories = result.current.getActiveCategories()
    expect(activeCategories).toHaveLength(2)
    expect(activeCategories.every(cat => cat.is_active)).toBe(true)
  })

  it('should search categories by name', async () => {
    // Mock load categories first
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockCategories })
    })

    const { result } = renderHook(() => useCategories())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const searchResults = result.current.searchCategories('dev')
    expect(searchResults).toHaveLength(1)
    expect(searchResults[0].name).toBe('Development')

    const emptySearch = result.current.searchCategories('')
    expect(emptySearch).toEqual(mockCategories)
  })

  it('should validate category names', async () => {
    // Mock load categories first
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockCategories })
    })

    const { result } = renderHook(() => useCategories())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Valid name
    expect(result.current.validateCategoryName('Valid Category')).toBe(null)

    // Empty name
    expect(result.current.validateCategoryName('')).toBe('Category name is required')

    // Too short
    expect(result.current.validateCategoryName('A')).toBe('Category name must be at least 2 characters long')

    // Too long
    const longName = 'A'.repeat(101)
    expect(result.current.validateCategoryName(longName)).toBe('Category name must be less than 100 characters')

    // Duplicate name
    expect(result.current.validateCategoryName('Development')).toBe('A category with this name already exists')

    // Duplicate name but excluding current category (editing)
    expect(result.current.validateCategoryName('Development', '1')).toBe(null)
  })

  it('should handle bulk upload', async () => {
    // Mock load categories first
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [] })
    })

    const { result } = renderHook(() => useCategories())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Mock bulk upload
    ;(fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, created: 3, errors: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockCategories })
      })

    let uploadResult: any
    await act(async () => {
      uploadResult = await result.current.bulkUpload('name,hourly_rate_usd\nDev,85\nDesign,75')
    })

    expect(uploadResult.success).toBe(true)
    expect(uploadResult.created).toBe(3)
    expect(uploadResult.errors).toEqual([])
  })

  it('should clear errors', async () => {
    // Mock load categories with error
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useCategories())

    await waitFor(() => {
      expect(result.current.error).toBe('Network error')
    })

    act(() => {
      result.current.clearError()
    })

    expect(result.current.error).toBe(null)
  })
}) 