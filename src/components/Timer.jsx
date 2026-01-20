import { useState, useEffect } from 'react'

function Timer({ isRunning, currentTask }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    let interval = null
    
    if (isRunning && currentTask?.start) {
      const startTime = new Date(currentTask.start).getTime()
      
      const updateElapsed = () => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000))
      }
      
      updateElapsed()
      interval = setInterval(updateElapsed, 1000)
    } else {
      setElapsed(0)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, currentTask])

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="text-center py-8">
      {/* Status indicator */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <div 
          className={`w-3 h-3 rounded-full transition-colors ${
            isRunning ? 'bg-accent-primary animate-pulse' : 'bg-neutral-600'
          }`}
        />
        <span className="text-sm text-neutral-400">
          {isRunning ? 'Tracking' : 'Idle'}
        </span>
      </div>

      {/* Timer display */}
      <div className="text-5xl font-bold text-neutral-100 tracking-wider mb-4">
        {formatTime(elapsed)}
      </div>

      {/* Current task */}
      {currentTask && (
        <div className="text-accent-cyan text-lg">
          {currentTask.note}
        </div>
      )}
    </div>
  )
}

export default Timer

