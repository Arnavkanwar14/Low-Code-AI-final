import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Filter,
  RefreshCw,
  Zap,
  CheckCircle,
  BarChart3,
  ChevronDown,
  Trash2,
  Copy,
  Activity,
  Maximize2
} from 'lucide-react'

const DataCleaningPanel = ({ datasets, setDatasets, onDataCleaned }) => {
  const [selectedDataset, setSelectedDataset] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [cleaningStatus, setCleaningStatus] = useState(null)
  
  const [options, setOptions] = useState({
    removeMissingValues: true,
    removeDuplicates: true,
    handleOutliers: true,
    normalizeData: false,
    imputeMissing: true
  })

  const tabularDatasets = datasets.filter(d => d.type === 'tabular' || d.file)

  const toggleOption = (opt) => {
    setOptions(prev => ({ ...prev, [opt]: !prev[opt] }))
  }

  const handleCleanData = async () => {
    if (!selectedDataset || !selectedDataset.file) return
    
    setIsProcessing(true)
    setCleaningStatus('Cleaning data...')

    try {
      const formData = new FormData()
      formData.append('file', selectedDataset.file)
      formData.append('options', JSON.stringify(options))
      
      const response = await fetch('http://localhost:5000/api/clean-data', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) throw new Error('Failed to clean data')
      
      const result = await response.json()
      
      if (result.success) {
        const cleanedDataset = {
          id: `cleaned-${Date.now()}`,
          name: `${selectedDataset.name} (Cleaned)`,
          type: 'tabular',
          size: selectedDataset.size,
          samples: result.final_stats.final_rows.toString(),
          file: selectedDataset.file,
          uploadedAt: new Date().toISOString(),
          isCleaned: true,
          cleanedFile: result.cleaned_file
        }
        
        setDatasets(prev => [...prev, cleanedDataset])
        if (onDataCleaned) onDataCleaned(cleanedDataset)
        setCleaningStatus('Success!')
        setTimeout(() => setCleaningStatus(null), 3000)
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Error cleaning data:', error)
      setCleaningStatus('Failed to clean data')
      setTimeout(() => setCleaningStatus(null), 3000)
    } finally {
      setIsProcessing(false)
    }
  }

    const CleaningOption = ({ id, label, icon: Icon, colorClass, textColor, borderColor, bgColor }) => (
      <button
        onClick={() => toggleOption(id)}
        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
          options[id] 
          ? `${bgColor} ${borderColor} ${textColor}` 
          : 'bg-[#0B0F1A] border-white/5 text-gray-500 hover:border-white/10'
        }`}
      >
        <div className="flex items-center space-x-3">
          <Icon className={`w-4 h-4 ${options[id] ? textColor : 'text-gray-600'}`} />
          <span className="text-xs font-medium">{label}</span>
        </div>
        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
          options[id] ? `${borderColor} ${colorClass}` : 'border-gray-600'
        }`}>
          {options[id] && <CheckCircle className="w-3 h-3 text-white" />}
        </div>
      </button>
    )

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg shadow-lg shadow-cyan-500/20">
              <Filter className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Data Cleaning</h2>
              <p className="text-gray-500 text-[10px] uppercase tracking-wider">Clean and preprocess your datasets</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Dataset to process</label>
            <div className="relative">
              <select
                value={selectedDataset?.id || ''}
                onChange={(e) => setSelectedDataset(tabularDatasets.find(d => d.id === e.target.value))}
                className="w-full bg-[#0B0F1A] border border-[#1E293B] text-white rounded-xl px-4 py-3 text-sm appearance-none focus:outline-none focus:border-cyan-500/50 transition-colors cursor-pointer"
              >
                <option value="" disabled>Choose a dataset...</option>
                {tabularDatasets.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.samples} rows)</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <CleaningOption 
              id="removeMissingValues" 
              label="Remove Missing" 
              icon={Trash2} 
              colorClass="bg-red-500" 
              textColor="text-red-400" 
              borderColor="border-red-500/30" 
              bgColor="bg-red-500/10" 
            />
            <CleaningOption 
              id="removeDuplicates" 
              label="Remove Duplicates" 
              icon={Copy} 
              colorClass="bg-blue-500" 
              textColor="text-blue-400" 
              borderColor="border-blue-500/30" 
              bgColor="bg-blue-500/10" 
            />
            <CleaningOption 
              id="handleOutliers" 
              label="Handle Outliers" 
              icon={Activity} 
              colorClass="bg-orange-500" 
              textColor="text-orange-400" 
              borderColor="border-orange-500/30" 
              bgColor="bg-orange-500/10" 
            />
            <CleaningOption 
              id="imputeMissing" 
              label="Impute Values" 
              icon={Maximize2} 
              colorClass="bg-cyan-500" 
              textColor="text-cyan-400" 
              borderColor="border-cyan-500/30" 
              bgColor="bg-cyan-500/10" 
            />
          </div>

        {selectedDataset && (
          <motion.button
            onClick={handleCleanData}
            disabled={isProcessing}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all flex items-center justify-center space-x-2"
          >
            {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            <span>{isProcessing ? 'Processing Dataset...' : 'Start Pipeline'}</span>
          </motion.button>
        )}

        <AnimatePresence>
          {cleaningStatus && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`text-center text-xs font-medium py-3 rounded-xl border ${
              cleaningStatus.includes('Failed') 
              ? 'text-red-400 bg-red-500/10 border-red-500/20' 
              : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
            }`}>
              {cleaningStatus}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default DataCleaningPanel
