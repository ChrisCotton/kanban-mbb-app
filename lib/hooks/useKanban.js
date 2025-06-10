import { createContext, useContext, useReducer, useEffect } from 'react'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'

const KanbanContext = createContext()

const initialState = {
  boards: [],
  currentBoard: null,
  columns: [],
  cards: [],
  categories: [],
  timeEntries: [],
  financialGoals: [],
  loading: {
    boards: false,
    columns: false,
    cards: false,
    categories: false
  },
  errors: {},
  user: null,
  totalEarnings: 0
}

function kanbanReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        loading: { ...state.loading, [action.key]: action.value }
      }
    
    case 'SET_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.key]: action.error }
      }
    
    case 'SET_USER':
      return { ...state, user: action.user }
    
    case 'SET_BOARDS':
      return { ...state, boards: action.boards }
    
    case 'SET_CURRENT_BOARD':
      return { ...state, currentBoard: action.board }
    
    case 'SET_COLUMNS':
      return { ...state, columns: action.columns }
    
    case 'SET_CARDS':
      return { ...state, cards: action.cards }
    
    case 'SET_CATEGORIES':
      return { ...state, categories: action.categories }
    
    case 'ADD_CARD':
      return { ...state, cards: [...state.cards, action.card] }
    
    case 'UPDATE_CARD':
      return {
        ...state,
        cards: state.cards.map(card =>
          card.id === action.card.id ? action.card : card
        )
      }
    
    default:
      return state
  }
}

export function KanbanProvider({ children }) {
  const [state, dispatch] = useReducer(kanbanReducer, initialState)

  // Authentication
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      dispatch({ type: 'SET_USER', user })
    }
    
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        dispatch({ type: 'SET_USER', user: session?.user || null })
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Fetch boards
  const fetchBoards = async () => {
    try {
      dispatch({ type: 'SET_LOADING', key: 'boards', value: true })
      
      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      
      dispatch({ type: 'SET_BOARDS', boards: data || [] })
      
      if (data && data.length > 0 && !state.currentBoard) {
        dispatch({ type: 'SET_CURRENT_BOARD', board: data[0] })
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', key: 'boards', error: error.message })
      toast.error('Failed to fetch boards')
    } finally {
      dispatch({ type: 'SET_LOADING', key: 'boards', value: false })
    }
  }

  const value = {
    ...state,
    fetchBoards,
    dispatch
  }

  return (
    <KanbanContext.Provider value={value}>
      {children}
    </KanbanContext.Provider>
  )
}

export const useKanban = () => {
  const context = useContext(KanbanContext)
  if (!context) {
    throw new Error('useKanban must be used within a KanbanProvider')
  }
  return context
}
