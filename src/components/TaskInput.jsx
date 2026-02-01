import { useState, useRef, useEffect } from 'react'

function TaskInput({ isRunning, onStart, onStop }) {
  const [taskName, setTaskName] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [filteredSuggestions, setFilteredSuggestions] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef(null)
  const suggestionsRef = useRef(null)

  const loadSuggestions = async () => {
    if (window.electronAPI) {
      try {
        const tasks = await window.electronAPI.getRecentTasks()
        setSuggestions(tasks)
        setFilteredSuggestions(tasks)
      } catch (error) {
        console.error('Failed to load suggestions:', error)
        setSuggestions([])
        setFilteredSuggestions([])
      }
    }
  }

  const filterSuggestions = (input) => {
    if (!input || input.length < 2) {
      setFilteredSuggestions(suggestions)
      return
    }

    const inputLower = input.toLowerCase()
    const filtered = suggestions.filter(task => {
      const taskLower = task.toLowerCase()
      return taskLower.startsWith(inputLower) && taskLower !== inputLower
    })
    setFilteredSuggestions(filtered)
  }

  const handleInputChange = (e) => {
    const value = e.target.value
    setTaskName(value)
    filterSuggestions(value)
    setSelectedIndex(-1)
    if (value.length >= 2 || value.length === 0) {
      setShowSuggestions(true)
    }
  }

  const handleFocus = () => {
    if (suggestions.length === 0) {
      loadSuggestions()
    }
    setShowSuggestions(true)
  }

  const handleBlur = (e) => {
    // Delay hiding to allow click on suggestion
    setTimeout(() => {
      if (!suggestionsRef.current?.contains(document.activeElement)) {
        setShowSuggestions(false)
      }
    }, 200)
  }

  const selectSuggestion = (suggestion) => {
    setTaskName(suggestion)
    setShowSuggestions(false)
    setSelectedIndex(-1)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (!showSuggestions || filteredSuggestions.length === 0) {
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        if (selectedIndex >= 0 && selectedIndex < filteredSuggestions.length) {
          e.preventDefault()
          selectSuggestion(filteredSuggestions[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setShowSuggestions(false)
        setSelectedIndex(-1)
        break
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (isRunning) {
      onStop()
    } else if (taskName.trim()) {
      onStart(taskName.trim())
      setTaskName('')
      setShowSuggestions(false)
      setSelectedIndex(-1)
    }
  }

  // Load suggestions on mount
  useEffect(() => {
    if (window.electronAPI) {
      loadSuggestions()
    }
  }, [])

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={taskName}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="What are you working on?"
          disabled={isRunning}
          className="w-full bg-surface-700 border border-surface-600 rounded-lg px-4 py-3 
                     text-neutral-200 placeholder-neutral-500 
                     focus:outline-none focus:border-accent-secondary focus:ring-1 focus:ring-accent-secondary
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all"
        />
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-10 w-full mt-1 bg-surface-700 border border-surface-600 rounded-lg shadow-lg max-h-60 overflow-auto"
          >
            {filteredSuggestions.map((suggestion, index) => (
              <div
                key={suggestion}
                onClick={() => selectSuggestion(suggestion)}
                className={`px-4 py-2 cursor-pointer transition-colors ${
                  index === selectedIndex
                    ? 'bg-accent-secondary text-surface-900'
                    : 'text-neutral-200 hover:bg-surface-600'
                }`}
              >
                {suggestion}
              </div>
            ))}
          </div>
        )}
      </div>
      <button
        type="submit"
        disabled={!isRunning && !taskName.trim()}
        className={`w-full py-3 rounded-lg font-semibold text-sm uppercase tracking-wider
                    transition-all duration-200 
                    ${isRunning
                      ? 'bg-red-600 hover:bg-red-500 text-white'
                      : 'bg-accent-primary hover:bg-accent-secondary text-surface-900 disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
      >
        {isRunning ? 'Stop' : 'Start'}
      </button>
    </form>
  )
}

export default TaskInput

