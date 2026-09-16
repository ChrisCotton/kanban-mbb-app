import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import QuoteManager from '../QuoteManager'

const personalQuotes = Array.from({ length: 7 }, (_, i) => ({
  id: `quote-${i + 1}`,
  user_id: 'user-123',
  text: `Personal quote ${i + 1}`,
  author: 'Author',
  is_active: true,
  display_order: i,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
}))

describe('QuoteManager pagination', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: personalQuotes }),
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('shows 5 quotes per page by default including curated defaults', async () => {
    render(<QuoteManager userId="user-123" />)

    await waitFor(() => {
      expect(screen.getByText(/Personal quote 1/)).toBeInTheDocument()
    })

    expect(screen.getByText(/Personal quote 5/)).toBeInTheDocument()
    expect(screen.queryByText(/Personal quote 6/)).not.toBeInTheDocument()
    expect(screen.getByText(/Showing 1–5 of 17/)).toBeInTheDocument()
  })

  it('changes page size via dropdown', async () => {
    render(<QuoteManager userId="user-123" />)

    await waitFor(() => {
      expect(screen.getByLabelText(/Per page/i)).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText(/Per page/i), { target: { value: '10' } })

    expect(await screen.findByText(/Personal quote 7/)).toBeInTheDocument()
    expect(screen.getByText(/secret of getting ahead/i)).toBeInTheDocument()
    expect(screen.getByText(/Showing 1–10 of 17/)).toBeInTheDocument()
  })

  it('navigates to next page', async () => {
    render(<QuoteManager userId="user-123" />)

    await waitFor(() => {
      expect(screen.getByText(/Personal quote 1/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(await screen.findByText(/Personal quote 6/)).toBeInTheDocument()
    expect(screen.getByText(/Page 2 of/)).toBeInTheDocument()
  })
})
