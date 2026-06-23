import React from 'react'
import { motion } from 'framer-motion'
import { 
  Activity, 
  CheckCircle, 
  Clock,
  Play
} from 'lucide-react'

const TrainingProgress = ({ progress, isTraining }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#151B2B]/50 border border-cyan-500/20 rounded-2xl p-6 backdrop-blur-xl relative overflow-hidden"
    >
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-lg shadow-lg shadow-cyan-500/20">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Training Status</h2>
          <div className="flex items-center space-x-2 mt-1">
            <div className={`w-2 h-2 rounded-full ${isTraining ? 'bg-cyan-400 animate-pulse' : 'bg-yellow-400'}`} />
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">
              {isTraining ? 'Training in progress' : progress >= 100 ? 'Completed' : 'Ready to initialize'}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="relative pt-1">
          <div className="flex mb-2 items-center justify-between">
            <div>
              <span className="text-[10px] font-bold inline-block py-1 px-2 uppercase rounded-full text-cyan-400 bg-cyan-400/10 tracking-widest">
                {isTraining ? 'Computing' : 'Progress'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold inline-block text-cyan-400">
                {Math.round(progress)}%
              </span>
            </div>
          </div>
          <div className="overflow-hidden h-1.5 mb-4 text-xs flex rounded-full bg-[#0B0F1A] border border-[#1E293B]">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-cyan-400 to-blue-600 rounded-full"
            />
          </div>
        </div>

        <div className="p-4 bg-[#0B0F1A] border border-[#1E293B] rounded-xl flex items-center justify-center space-x-3 group cursor-default">
          {progress >= 100 ? (
            <CheckCircle className="w-5 h-5 text-green-400" />
          ) : isTraining ? (
            <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Clock className="w-5 h-5 text-gray-500" />
          )}
          <span className="text-sm font-medium text-gray-400">
            {progress >= 100 ? 'Model optimized' : isTraining ? 'Running epochs...' : 'Waiting for input'}
          </span>
        </div>
      </div>

      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-[40px] pointer-events-none rounded-full" />
    </motion.div>
  )
}

export default TrainingProgress
