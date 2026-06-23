import { motion } from 'framer-motion'
import {
  Cpu,
  Database,
  Play,
  RotateCcw,
  Zap,
  Trash2
} from 'lucide-react'
import { useState } from 'react'
import { Draggable, Droppable } from 'react-beautiful-dnd'

const Workspace = ({
  workspaceItems,
  setWorkspaceItems,
  isTraining,
  setIsTraining,
  trainingProgress,
  setTrainingProgress,
  setModelResults,
    setActiveTab,
    selectedAlgorithm,
    selectedTaskType,
    targetColumn,
    featureColumns,
    trainingParams
  }) => {
    const [error, setError] = useState(null)
  
    const handleTrain = async () => {
      setError(null)
      const datasetItem = workspaceItems.find(item => item.type === 'tabular' || item.type === 'dataset' || item.file || item.id === 'sample-churn');
  
        if (!datasetItem) {
          setError("Please add a dataset to the workspace.")
          return
        }
    
        setIsTraining(true)
      setTrainingProgress(0)
  
      const progressInterval = setInterval(() => {
        setTrainingProgress(prev => {
          if (prev >= 90) return prev;
          return prev + 5;
        })
      }, 500)
  
        try {
          const formData = new FormData()
          if (datasetItem.file) {
            formData.append('file', datasetItem.file)
          } else {
            formData.append('filename', datasetItem.name + '.csv')
          }
          formData.append('target_column', targetColumn)

        formData.append('feature_columns', featureColumns)
        formData.append('task_type', selectedTaskType)
        formData.append('algorithm', selectedAlgorithm)
        
        // Add additional training parameters
        Object.keys(trainingParams).forEach(key => {
          formData.append(key, trainingParams[key])
        })
        
        const response = await fetch('http://localhost:5000/api/train', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      clearInterval(progressInterval)

      if (data.success) {
        setTrainingProgress(100)
        setModelResults({ ...data, timestamp: new Date().toISOString() })
        setTimeout(() => {
          setIsTraining(false)
          setActiveTab('results')
        }, 1000)
      } else {
        setError(data.error || "Training failed")
        setIsTraining(false)
        setTrainingProgress(0)
      }
    } catch (err) {
      clearInterval(progressInterval)
      setError("Network error or server unreachable")
      setIsTraining(false)
      setTrainingProgress(0)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#151B2B]/50 border border-cyan-500/20 rounded-2xl p-6 backdrop-blur-xl min-h-[400px] flex flex-col relative overflow-hidden"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-lg shadow-lg shadow-cyan-500/20">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Training Workspace</h2>
            <p className="text-gray-500 text-xs">Build your AI model pipeline</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <motion.button
            onClick={handleTrain}
            disabled={workspaceItems.length === 0 || isTraining}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all font-bold text-sm ${
              workspaceItems.length === 0 || isTraining
              ? 'bg-[#1E293B] text-gray-500 cursor-not-allowed border border-[#2D3748]'
              : 'bg-white/10 border border-white/20 text-white hover:bg-white/20'
            }`}
            whileHover={workspaceItems.length > 0 && !isTraining ? { scale: 1.02 } : {}}
            whileTap={workspaceItems.length > 0 && !isTraining ? { scale: 0.98 } : {}}
          >
            <Play className={`w-4 h-4 ${isTraining ? 'animate-spin' : ''}`} />
            <span>{isTraining ? 'Training...' : 'Train'}</span>
          </motion.button>

          <motion.button
            onClick={() => setWorkspaceItems([])}
            className="p-2 bg-[#0B0F1A] border border-[#1E293B] rounded-xl hover:bg-[#1E293B] transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RotateCcw className="w-4 h-4 text-gray-500" />
          </motion.button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-medium">
          {error}
        </div>
      )}

      <Droppable droppableId="workspace">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 rounded-2xl border-2 border-dashed transition-all duration-300 relative ${
              snapshot.isDraggingOver
              ? 'border-cyan-400/50 bg-cyan-500/5 scale-[0.99]'
              : 'border-[#1E293B] bg-[#0B0F1A]/50'
            }`}
          >
            {workspaceItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center mb-4 border border-cyan-500/20">
                  <Zap className="w-8 h-8 text-cyan-400 opacity-50" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Start Building</h3>
                <p className="text-gray-500 text-sm max-w-xs">
                  Drag datasets and features here to begin training your model
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {workspaceItems.map((item, index) => (
                  <Draggable key={item.id} draggableId={item.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`bg-[#0B0F1A] border border-[#1E293B] p-4 rounded-xl flex items-center justify-between group ${
                          snapshot.isDragging ? 'border-cyan-500/50 shadow-2xl' : ''
                        }`}
                      >
                          <div className="flex items-center space-x-3 overflow-hidden">
                            <Database className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                            <span className="text-sm font-medium text-gray-200 truncate">{item.name}</span>
                          </div>
                        <button 
                          onClick={() => setWorkspaceItems(prev => prev.filter(i => i.id !== item.id))}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 rounded transition-all"
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </button>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </div>
        )}
      </Droppable>

      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-500/5 blur-[50px] pointer-events-none rounded-full" />
    </motion.div>
  )
}

export default Workspace
