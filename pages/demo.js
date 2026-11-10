import KanbanBoard from '../components/kanban/KanbanBoard'
import Layout from '../components/layout/Layout'

export default function Demo() {
  return (
    <Layout title="Kanban Board Demo - Mental Bank Balance">
      <div className="page-content-shell">
        <div className="text-center mb-4 sm:mb-8">
          <h1 className="page-title">
            Mental Bank Balance Kanban Board
          </h1>
          <p className="text-base sm:text-xl text-gray-300 mb-2">
            Demo: Track your productivity and calculate virtual earnings
          </p>
          <p className="text-sm sm:text-base text-gray-400">
            This is a live demo with sample data - try dragging tasks between columns!
          </p>
        </div>
        
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-3 sm:p-8 min-w-0 overflow-x-clip">
          <KanbanBoard className="w-full min-w-0" />
        </div>

        <div className="mt-8 text-center">
          <div className="bg-white/5 backdrop-blur-md rounded-lg border border-white/10 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              🎯 Task 2.0 - Core Kanban Board UI Components
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3">
                <div className="text-green-400 font-medium">✅ Completed</div>
                <div className="text-gray-300 mt-1">
                  • KanbanBoard Component<br/>
                  • SwimLane Components<br/>
                  • TaskCard Components<br/>
                  • Sample Data Integration
                </div>
              </div>
              <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3">
                <div className="text-yellow-400 font-medium">🔄 Next Up</div>
                <div className="text-gray-300 mt-1">
                  • Drag & Drop Functionality<br/>
                  • Task Creation Modals<br/>
                  • Task Editing<br/>
                  • Comments & Subtasks
                </div>
              </div>
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3">
                <div className="text-blue-400 font-medium">📊 Features</div>
                <div className="text-gray-300 mt-1">
                  • 4 Swim Lanes<br/>
                  • Priority Badges<br/>
                  • Due Date Tracking<br/>
                  • MBB Impact Scoring
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}