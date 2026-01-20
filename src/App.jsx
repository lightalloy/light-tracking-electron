import { useState, useEffect, useCallback } from 'react'
import TaskInput from './components/TaskInput'
import Timer from './components/Timer'
import Statistics from './components/Statistics'

function App() {
  const [isRunning, setIsRunning] = useState(false)
  const [currentTask, setCurrentTask] = useState(null)
  const [activeTab, setActiveTab] = useState('timer')

  const loadStatus = useCallback(async () => {
    if (window.electronAPI) {
      const status = await window.electronAPI.getTimerStatus()
      setIsRunning(status.isRunning)
      setCurrentTask(status.currentTask)
    }
  }, [])

  useEffect(() => {
    loadStatus()

    if (window.electronAPI) {
      window.electronAPI.onTimerStopped(() => {
        setIsRunning(false)
        setCurrentTask(null)
      })
    }
  }, [loadStatus])

  const handleStart = async (taskName) => {
    if (window.electronAPI) {
      await window.electronAPI.startTimer(taskName)
      setIsRunning(true)
      setCurrentTask({ note: taskName, start: new Date().toISOString() })
    }
  }

  const handleStop = async () => {
    if (window.electronAPI) {
      await window.electronAPI.stopTimer()
      setIsRunning(false)
      setCurrentTask(null)
    }
  }

  return (
    <div className="min-h-screen bg-surface-900 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-accent-secondary tracking-tight">
            Light Tracking
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Simple time tracker
          </p>
        </header>

        {/* Navigation */}
        <nav className="flex gap-1 mb-6 bg-surface-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('timer')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'timer'
                ? 'bg-surface-600 text-accent-secondary'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Timer
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'stats'
                ? 'bg-surface-600 text-accent-secondary'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Statistics
          </button>
        </nav>

        {/* Content */}
        <main className="bg-surface-800 rounded-xl p-6 border border-surface-600">
          {activeTab === 'timer' ? (
            <div className="space-y-6">
              <Timer 
                isRunning={isRunning} 
                currentTask={currentTask} 
              />
              <TaskInput 
                isRunning={isRunning}
                onStart={handleStart}
                onStop={handleStop}
              />
            </div>
          ) : (
            <Statistics />
          )}
        </main>
      </div>
    </div>
  )
}

export default App

