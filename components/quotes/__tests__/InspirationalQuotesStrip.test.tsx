import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import InspirationalQuotesStrip from '../InspirationalQuotesStrip'
import { mergeQuotesWithDefaults } from '../../../lib/quotes/merge-quotes-with-defaults'

const mockQuotes = [
  { id: 'q1', text: 'First quote', author: 'Author One' },
  { id: 'q2', text: 'Second quote', author: 'Author Two' },
  { id: 'q3', text: 'Third quote', author: null },
]

describe('InspirationalQuotesStrip', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('renders with provided quotes prop', () => {
    render(<InspirationalQuotesStrip quotes={mockQuotes} />)

    expect(screen.getByTestId('inspirational-quotes-strip')).toBeInTheDocument()
    expect(screen.getByText(/First quote/)).toBeInTheDocument()
    expect(screen.getByText(/Author One/)).toBeInTheDocument()
  })

  it('shows default quotes when user has no active quotes', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ success: true, data: [] }),
    })

    await act(async () => {
      render(<InspirationalQuotesStrip userId="user-123" />)
    })

    expect(await screen.findByText(/The secret of getting ahead/)).toBeInTheDocument()
  })

  it('shows user quotes plus curated defaults when personal quotes exist', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        success: true,
        data: [{ id: 'u1', text: 'My custom quote', author: 'Me' }],
      }),
    })

    await act(async () => {
      render(<InspirationalQuotesStrip userId="user-123" />)
    })

    expect(await screen.findByText(/My custom quote/)).toBeInTheDocument()
    expect(screen.getByLabelText('Go to quote 11')).toBeInTheDocument()
  })

  it('mergeQuotesWithDefaults keeps personal quotes first and appends defaults', () => {
    const merged = mergeQuotesWithDefaults([
      { id: 'u1', text: 'Neville quote', author: 'Neville Goddard' },
    ])

    expect(merged).toHaveLength(11)
    expect(merged[0].text).toBe('Neville quote')
    expect(merged.some((q) => q.text.includes('secret of getting ahead'))).toBe(true)
  })

  it('advances to next quote on next button click', () => {
    render(<InspirationalQuotesStrip quotes={mockQuotes} autoAdvanceInterval={11000} />)

    expect(screen.getByText(/First quote/)).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Next quote'))

    expect(screen.getByText(/Second quote/)).toBeInTheDocument()
  })

  it('goes to previous quote on prev button click', () => {
    render(<InspirationalQuotesStrip quotes={mockQuotes} />)

    fireEvent.click(screen.getByLabelText('Next quote'))
    fireEvent.click(screen.getByLabelText('Previous quote'))

    expect(screen.getByText(/First quote/)).toBeInTheDocument()
  })

  it('auto-advances quotes on interval', () => {
    render(
      <InspirationalQuotesStrip
        quotes={mockQuotes}
        autoAdvanceInterval={5000}
      />
    )

    expect(screen.getByText(/First quote/)).toBeInTheDocument()

    act(() => {
      jest.advanceTimersByTime(5000)
    })

    expect(screen.getByText(/Second quote/)).toBeInTheDocument()
  })

  it('does not auto-advance with single quote', () => {
    render(
      <InspirationalQuotesStrip
        quotes={[{ id: 'solo', text: 'Only one', author: null }]}
        autoAdvanceInterval={5000}
      />
    )

    expect(screen.getByText(/Only one/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Next quote')).not.toBeInTheDocument()

    act(() => {
      jest.advanceTimersByTime(10000)
    })

    expect(screen.getByText(/Only one/)).toBeInTheDocument()
  })

  it('pauses auto-advance on hover', () => {
    render(
      <InspirationalQuotesStrip
        quotes={mockQuotes}
        autoAdvanceInterval={5000}
      />
    )

    const strip = screen.getByTestId('inspirational-quotes-strip')
    fireEvent.mouseEnter(strip)

    act(() => {
      jest.advanceTimersByTime(10000)
    })

    expect(screen.getByText(/First quote/)).toBeInTheDocument()

    fireEvent.mouseLeave(strip)

    act(() => {
      jest.advanceTimersByTime(5000)
    })

    expect(screen.getByText(/Second quote/)).toBeInTheDocument()
  })

  it('navigates via dot indicators', () => {
    render(<InspirationalQuotesStrip quotes={mockQuotes} />)

    fireEvent.click(screen.getByLabelText('Go to quote 3'))

    expect(screen.getByText(/Third quote/)).toBeInTheDocument()
  })
})
