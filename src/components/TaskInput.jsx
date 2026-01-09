import { useState } from 'react'

function TaskInput({ isRunning, onStart, onStop }) {
  const [taskName, setTaskName] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (isRunning) {
      onStop()
    } else if (taskName.trim()) {
      onStart(taskName.trim())
      setTaskName('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <input
          type="text"
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
          placeholder="What are you working on?"
          disabled={isRunning}
          className="w-full bg-surface-700 border border-surface-600 rounded-lg px-4 py-3 
                     text-neutral-200 placeholder-neutral-500 
                     focus:outline-none focus:border-accent-lime focus:ring-1 focus:ring-accent-lime
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all"
        />
      </div>
      <button
        type="submit"
        disabled={!isRunning && !taskName.trim()}
        className={`w-full py-3 rounded-lg font-semibold text-sm uppercase tracking-wider
                    transition-all duration-200 
                    ${isRunning
                      ? 'bg-red-600 hover:bg-red-500 text-white'
                      : 'bg-accent-green hover:bg-accent-lime text-surface-900 disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
      >
        {isRunning ? 'Stop' : 'Start'}
      </button>
    </form>
  )
}

export default TaskInput

