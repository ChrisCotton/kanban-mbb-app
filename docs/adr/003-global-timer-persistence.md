# ADR 003: Global Timer State Persistence

## Status
Accepted

## Date
2026-01-15

## Context
The MBB Kanban application features a multi-timer system that allows users to track time spent on multiple tasks simultaneously. Users expect timers to continue running when navigating between pages (Dashboard, Calendar, Categories, Vision Board, MBB Analytics).

Previously, each page instantiated its own timer state, causing timers to reset when navigating away from a page. This created a poor user experience as users had to remain on the Dashboard page while timing tasks.

## Decision
We implemented global timer persistence using:

1. **React Context (TimerContext)** - Provides global timer state accessible from any page
2. **localStorage** - Persists timer state across browser sessions and page refreshes
3. **Automatic restoration** - Recalculates elapsed time for running timers on page load

### Why React Context over Redux/Zustand?
- **Simplicity**: The timer state is relatively simple (array of timers with basic properties)
- **Built-in**: No additional dependencies required
- **Sufficient**: Context performance is adequate for our update frequency (1/second)
- **Familiar**: Team already uses Context for other features (KanbanProvider)

### Why localStorage over sessionStorage?
- **Persistence**: Timers survive browser crashes and accidental tab closes
- **Multi-tab**: Users can reference timer state from browser DevTools if needed
- **User expectation**: Users expect their active timers to persist across sessions

### Why not server-side persistence?
- **Latency**: 1-second updates would create excessive API calls
- **Offline support**: localStorage works without network connectivity
- **Simplicity**: Avoids complex synchronization logic
- **Existing API**: We already save completed sessions to Supabase when timers are stopped

## Implementation

### TimerContext (`contexts/TimerContext.tsx`)
```typescript
export function TimerContextProvider({ children }: { children: React.ReactNode }) {
  const [timers, setTimers] = useState<MultiTimerEntry[]>([])
  
  // Restore from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      const validTimers = parsed.filter(isValidTimer)
      setTimers(restoredTimers)
    }
  }, [])
  
  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(timers))
  }, [timers])
}
```

### Timer Restoration Logic
When restoring running timers, we recalculate the elapsed time:
```typescript
if (timer.isRunning && !timer.isPaused && timer.startTime) {
  const startTime = new Date(timer.startTime).getTime()
  const elapsed = Math.floor((Date.now() - startTime) / 1000)
  return { ...timer, currentTime: elapsed }
}
```

### Stale Timer Handling
Timers older than 24 hours are automatically cleared:
```typescript
const MAX_TIMER_AGE_MS = 24 * 60 * 60 * 1000

function isValidTimer(timer: any): boolean {
  if (timer.startTime) {
    const startTime = new Date(timer.startTime).getTime()
    if (Date.now() - startTime > MAX_TIMER_AGE_MS) {
      return false
    }
  }
  return true
}
```

## Consequences

### Positive
- Timers persist across all pages without user intervention
- Timers survive browser refresh and accidental closures
- No additional backend infrastructure required
- Immediate UI feedback (no network latency)

### Negative
- localStorage has ~5MB limit (sufficient for typical usage)
- Timer state not synchronized across devices
- Slight delay on page load while restoring timers

### Risks Mitigated
- **Stale data**: Automatic 24-hour cleanup prevents abandoned timers
- **Invalid data**: Validation on restore prevents crashes from corrupt data
- **Storage quota**: JSON serialization is compact; typical timer usage well under 1KB

## Future Considerations

1. **Multi-device sync**: Could add optional server-side storage for users who want timers to sync across devices
2. **Backup/restore**: Could export timer history for users who want to archive their time tracking
3. **Offline queue**: Could queue session saves for when network connectivity is restored

## Related Documents
- `contexts/TimerContext.tsx` - Implementation
- `components/timer/MBBTimerSection.tsx` - Consumer component
- `__tests__/regression/timer-persistence.regression.test.tsx` - Test suite
