import {
  calculateTaskStartCost,
  calculateTaskCompletionReward,
  calculateColumnMoveImpact,
  calculateFocusSessionReward,
  checkEnergyLimits,
  getTaskRecommendations,
  generateEnergyImpactSummary,
  DEFAULT_MENTAL_BANK_CONFIG,
  MentalBankState
} from '../lib/mental-bank-integration'

// Mock task data
const mockTask = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  title: 'Test Task',
  description: 'A test task for mental bank balance',
  priority: 'medium' as const,
  status: 'todo' as const,
  column: 'todo',
  position: 0,
  order_index: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  due_date: null,
  user_id: 'test-user'
}

const mockHighPriorityTask = {
  ...mockTask,
  id: '550e8400-e29b-41d4-a716-446655440001',
  priority: 'high' as const,
  title: 'High Priority Task'
}

const mockUrgentTask = {
  ...mockTask,
  id: '550e8400-e29b-41d4-a716-446655440002',
  priority: 'urgent' as const,
  title: 'Urgent Task',
  due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Due tomorrow
}

const mockMentalBankState: MentalBankState = {
  currentEnergy: 150,
  maxEnergy: 200,
  dailyExpenditure: 50,
  lastUpdated: new Date(),
  streakDays: 3,
  totalTasksCompleted: 25,
  weeklyStats: {
    energySpent: 200,
    energyGained: 180,
    tasksCompleted: 12,
    focusTime: 300
  }
}

describe('Mental Bank Balance Integration', () => {
  describe('calculateTaskStartCost', () => {
    it('should calculate correct cost for medium priority task', () => {
      const cost = calculateTaskStartCost(mockTask)
      expect(cost).toBe(15) // medium priority (15) * doing modifier (1.0)
    })

    it('should calculate correct cost for high priority task', () => {
      const cost = calculateTaskStartCost(mockHighPriorityTask)
      expect(cost).toBe(30) // high priority (30) * doing modifier (1.0)
    })

    it('should calculate correct cost for urgent task', () => {
      const cost = calculateTaskStartCost(mockUrgentTask)
      expect(cost).toBe(50) // urgent priority (50) * doing modifier (1.0)
    })
  })

  describe('calculateTaskCompletionReward', () => {
    it('should calculate correct reward for medium priority task', () => {
      const reward = calculateTaskCompletionReward(mockTask)
      expect(reward).toBe(25) // medium priority completion reward
    })

    it('should calculate correct reward for high priority task', () => {
      const reward = calculateTaskCompletionReward(mockHighPriorityTask)
      expect(reward).toBe(50) // high priority completion reward
    })

    it('should add overdue bonus for past due tasks', () => {
      const overdueTask = {
        ...mockTask,
        due_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days overdue
      }
      const reward = calculateTaskCompletionReward(overdueTask)
      expect(reward).toBe(35) // 25 base + 10 overdue bonus (2 days * 5)
    })
  })

  describe('calculateColumnMoveImpact', () => {
    it('should calculate no impact for backlog to todo move', () => {
      const impact = calculateColumnMoveImpact(mockTask, 'backlog', 'todo')
      expect(impact).toBe(3) // (0.2 - 0) * 15 = 3
    })

    it('should calculate cost for todo to doing move', () => {
      const impact = calculateColumnMoveImpact(mockTask, 'todo', 'doing')
      expect(impact).toBe(12) // (1.0 - 0.2) * 15 = 12
    })

    it('should give completion reward for move to done', () => {
      const impact = calculateColumnMoveImpact(mockTask, 'doing', 'done')
      expect(impact).toBe(25) // completion reward for medium priority
    })

    it('should penalize context switching from doing to todo', () => {
      const impact = calculateColumnMoveImpact(mockTask, 'doing', 'todo')
      expect(impact).toBe(5) // 30% of 15 = 4.5, rounded to 5
    })
  })

  describe('calculateFocusSessionReward', () => {
    it('should give no reward for short sessions', () => {
      const reward = calculateFocusSessionReward(20)
      expect(reward).toBe(0)
    })

    it('should give reward for 25+ minute sessions', () => {
      const reward = calculateFocusSessionReward(25)
      expect(reward).toBe(10) // 1 session * 10 points
    })

    it('should give multiple rewards for long sessions', () => {
      const reward = calculateFocusSessionReward(60)
      expect(reward).toBe(20) // 2 sessions * 10 points
    })
  })

  describe('checkEnergyLimits', () => {
    it('should return none warning for good energy levels', () => {
      const result = checkEnergyLimits(mockMentalBankState)
      expect(result.warningLevel).toBe('none')
      expect(result.isOverLimit).toBe(false)
    })

    it('should return caution warning for medium energy levels', () => {
      const lowEnergyState = {
        ...mockMentalBankState,
        currentEnergy: 100 // 50% of max
      }
      const result = checkEnergyLimits(lowEnergyState)
      expect(result.warningLevel).toBe('caution')
      expect(result.isOverLimit).toBe(false)
    })

    it('should return warning for low energy levels', () => {
      const lowEnergyState = {
        ...mockMentalBankState,
        currentEnergy: 40 // 20% of max
      }
      const result = checkEnergyLimits(lowEnergyState)
      expect(result.warningLevel).toBe('warning')
      expect(result.isOverLimit).toBe(false)
    })

    it('should return critical warning for very low energy', () => {
      const criticalEnergyState = {
        ...mockMentalBankState,
        currentEnergy: 10 // 5% of max
      }
      const result = checkEnergyLimits(criticalEnergyState)
      expect(result.warningLevel).toBe('critical')
      expect(result.isOverLimit).toBe(true)
    })

    it('should return critical warning for high daily expenditure', () => {
      const highExpenditureState = {
        ...mockMentalBankState,
        dailyExpenditure: 200 // At daily limit
      }
      const result = checkEnergyLimits(highExpenditureState)
      expect(result.warningLevel).toBe('critical')
      expect(result.isOverLimit).toBe(true)
    })
  })

  describe('getTaskRecommendations', () => {
    const tasks = [mockTask, mockHighPriorityTask, mockUrgentTask]

    it('should recommend all tasks for high energy', () => {
      const result = getTaskRecommendations(tasks, 180, 200) // 90% energy
      expect(result.recommended).toHaveLength(3)
      expect(result.avoid).toHaveLength(0)
    })

    it('should avoid urgent tasks for medium energy', () => {
      const result = getTaskRecommendations(tasks, 100, 200) // 50% energy
      expect(result.recommended).toHaveLength(2)
      expect(result.avoid).toHaveLength(1)
      expect(result.avoid[0].priority).toBe('urgent')
    })

    it('should only recommend low/medium tasks for low energy', () => {
      const result = getTaskRecommendations(tasks, 60, 200) // 30% energy
      expect(result.recommended).toHaveLength(1)
      expect(result.recommended[0].priority).toBe('medium')
      expect(result.avoid).toHaveLength(2)
    })

    it('should calculate energy budget correctly', () => {
      const result = getTaskRecommendations(tasks, 100, 200)
      expect(result.energyBudget).toBe(70) // 70% of current energy
    })
  })

  describe('generateEnergyImpactSummary', () => {
    it('should generate correct summary for task start', () => {
      const summary = generateEnergyImpactSummary(mockTask, 'start')
      expect(summary.energyDelta).toBe(-15)
      expect(summary.description).toContain('Starting medium priority task')
      expect(summary.icon).toBe('⚡')
      expect(summary.color).toBe('text-yellow-400')
    })

    it('should generate correct summary for task completion', () => {
      const summary = generateEnergyImpactSummary(mockTask, 'complete')
      expect(summary.energyDelta).toBe(25)
      expect(summary.description).toContain('Completed medium priority task')
      expect(summary.icon).toBe('✨')
      expect(summary.color).toBe('text-green-400')
    })

    it('should generate correct summary for task move', () => {
      const summary = generateEnergyImpactSummary(mockTask, 'move', 'todo', 'doing')
      expect(summary.energyDelta).toBe(12)
      expect(summary.description).toContain('Moved task from todo to doing')
      expect(summary.icon).toBe('📈')
      expect(summary.color).toBe('text-green-400')
    })
  })

  describe('Configuration', () => {
    it('should use default configuration values', () => {
      expect(DEFAULT_MENTAL_BANK_CONFIG.priorityCosts.medium).toBe(15)
      expect(DEFAULT_MENTAL_BANK_CONFIG.completionRewards.medium).toBe(25)
      expect(DEFAULT_MENTAL_BANK_CONFIG.columnModifiers.doing).toBe(1.0)
      expect(DEFAULT_MENTAL_BANK_CONFIG.timeFactors.focusSessionReward).toBe(10)
      expect(DEFAULT_MENTAL_BANK_CONFIG.dailyLimits.maxEnergyExpenditure).toBe(200)
    })

    it('should allow custom configuration', () => {
      const customConfig = {
        ...DEFAULT_MENTAL_BANK_CONFIG,
        priorityCosts: {
          ...DEFAULT_MENTAL_BANK_CONFIG.priorityCosts,
          medium: 20
        }
      }
      
      const cost = calculateTaskStartCost(mockTask, customConfig)
      expect(cost).toBe(20) // custom medium priority cost
    })
  })
}) 