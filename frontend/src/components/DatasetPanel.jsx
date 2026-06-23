import React, { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Droppable, Draggable } from 'react-beautiful-dnd'
import { 
  Database, 
  Upload, 
  FileText, 
  Image, 
  BarChart3, 
  Plus,
  Trash2,
  Eye,
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

const DatasetPanel = ({ datasets, setDatasets, sampleDatasets = [], onPreview }) => {
  const [isAddingDataset, setIsAddingDataset] = useState(false)
  const [newDatasetName, setNewDatasetName] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadStatus, setUploadStatus] = useState(null)
  const [uploadMessage, setUploadMessage] = useState('')
  const fileInputRef = useRef(null)

  const getDatasetIcon = (type) => {
    switch (type) {
      case 'image': return Image
      case 'text': return FileText
      case 'tabular': return BarChart3
      default: return Database
    }
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'image': return 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
      case 'text': return 'bg-green-500/20 text-green-300 border border-green-500/30'
      case 'tabular': return 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
      default: return 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
    }
  }

  const addDataset = () => {
    if (newDatasetName.trim()) {
      const newDataset = {
        id: `dataset-${Date.now()}`,
        name: newDatasetName,
        type: 'custom',
        size: '0 KB',
        samples: '0'
      }
      setDatasets([...datasets, newDataset])
      setNewDatasetName('')
      setIsAddingDataset(false)
    }
  }

  const validateFile = (file) => {
    const allowedTypes = [
      'text/csv',
      'application/json',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
    
    const maxSize = 1024 * 1024 * 1024 // 1GB
    
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, message: 'File type not supported. Please upload CSV, JSON, Excel, or image files.' }
    }
    
    if (file.size > maxSize) {
      return { valid: false, message: 'File size too large. Maximum size is 1GB.' }
    }
    
    return { valid: true, message: 'File is valid' }
  }

  const getFileType = (file) => {
    if (file.type.startsWith('image/')) return 'image'
    if (file.type === 'text/csv' || file.type.includes('excel')) return 'tabular'
    if (file.type === 'application/json') return 'text'
    return 'custom'
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const processFile = async (file) => {
    const validation = validateFile(file)
    if (!validation.valid) {
      setUploadStatus('error')
      setUploadMessage(validation.message)
      setTimeout(() => {
        setUploadStatus(null)
        setUploadMessage('')
      }, 3000)
      return
    }

    setUploadStatus('uploading')
    setUploadMessage('Processing file...')

    try {
      // Simulate file processing
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const fileType = getFileType(file)
      let sampleCount = 'Unknown'
      
      // Try to estimate sample count for different file types
      if (file.type === 'text/csv') {
        const text = await file.text()
        const lines = text.split('\n').filter(line => line.trim())
        sampleCount = (lines.length - 1).toString() // Subtract header
      } else if (file.type === 'application/json') {
        const text = await file.text()
        const data = JSON.parse(text)
        if (Array.isArray(data)) {
          sampleCount = data.length.toString()
        } else {
          sampleCount = '1'
        }
      } else if (file.type.startsWith('image/')) {
        sampleCount = '1'
      }

      const newDataset = {
        id: `dataset-${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
        type: fileType,
        size: formatFileSize(file.size),
        samples: sampleCount,
        file: file,
        uploadedAt: new Date().toISOString()
      }

      setDatasets(prev => [...prev, newDataset])
      setUploadStatus('success')
      setUploadMessage('File uploaded successfully!')
      
      setTimeout(() => {
        setUploadStatus(null)
        setUploadMessage('')
      }, 2000)

    } catch (error) {
      setUploadStatus('error')
      setUploadMessage('Error processing file. Please try again.')
      setTimeout(() => {
        setUploadStatus(null)
        setUploadMessage('')
      }, 3000)
    }
  }

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files)
    if (files.length > 0) {
      processFile(files[0])
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      processFile(files[0])
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="kinesthetic-card neon-glow"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl shadow-lg shadow-violet-500/20">
            <Database className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">Datasets</h2>
            <p className="text-xs text-slate-500">Drag datasets to workspace</p>
          </div>
        </div>
        <motion.button
          onClick={() => setIsAddingDataset(true)}
          className="p-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/20"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Add dataset"
        >
          <Plus className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Add Dataset Modal */}
      {isAddingDataset && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-4 p-4 bg-gray-800/80 rounded-lg border border-cyan-500/30 neon-glow"
        >
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Dataset name..."
              value={newDatasetName}
              onChange={(e) => setNewDatasetName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-gray-700 text-gray-200 placeholder-gray-400"
              onKeyPress={(e) => e.key === 'Enter' && addDataset()}
            />
            <div className="flex space-x-2">
              <motion.button
                onClick={addDataset}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:shadow-lg transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Add
              </motion.button>
              <motion.button
                onClick={() => {
                  setIsAddingDataset(false)
                  setNewDatasetName('')
                }}
                className="px-4 py-2 bg-gray-600 text-gray-300 rounded-lg hover:bg-gray-500 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.json,.xlsx,.xls,.jpg,.jpeg,.png,.gif,.webp"
        onChange={handleFileSelect}
        className="hidden"
      />

             {/* Upload Status */}
       {uploadStatus && (
         <motion.div
           initial={{ opacity: 0, y: -10 }}
           animate={{ opacity: 1, y: 0 }}
           className={`mb-4 p-3 rounded-lg flex items-center space-x-2 ${
             uploadStatus === 'success' 
               ? 'bg-green-500/20 border border-green-500/30 text-green-300'
               : uploadStatus === 'error'
               ? 'bg-red-500/20 border border-red-500/30 text-red-300'
               : 'bg-blue-500/20 border border-blue-500/30 text-blue-300'
           }`}
         >
           {uploadStatus === 'success' ? (
             <CheckCircle className="w-4 h-4" />
           ) : uploadStatus === 'error' ? (
             <AlertCircle className="w-4 h-4" />
           ) : (
             <Upload className="w-4 h-4 animate-pulse" />
           )}
           <span className="text-sm font-medium">{uploadMessage}</span>
         </motion.div>
       )}

      {/* Upload Area */}
      <motion.div 
        className={`drop-zone mb-6 text-center cursor-pointer transition-all duration-300 ${
          isDragOver ? 'drop-zone drag-over' : ''
        }`}
        whileHover={{ scale: 1.02 }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleUploadClick}
      >
        <Upload className={`w-8 h-8 mx-auto mb-2 ${
          isDragOver ? 'text-cyan-500' : 'text-cyan-400'
        }`} />
        <p className={`text-sm ${
          isDragOver ? 'text-cyan-400' : 'text-gray-300'
        }`}>
          {isDragOver ? 'Drop your file here!' : 'Drop CSV, JSON, Excel, or image files here'}
        </p>
        <p className="text-xs text-gray-400">or click to browse</p>
        <p className="text-xs text-gray-500 mt-1">Max size: 1GB</p>
      </motion.div>

      {/* Dataset List */}
      <Droppable droppableId="datasets">
        {(provided, snapshot) => (
                     <div
             ref={provided.innerRef}
             {...provided.droppableProps}
             className={`space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2 ${
              snapshot.isDraggingOver ? 'bg-cyan-500/10 rounded-lg p-2' : ''
            }`}
            
           >
            {[...sampleDatasets, ...datasets].map((dataset, index) => {
              const IconComponent = getDatasetIcon(dataset.type)
              return (
                <Draggable key={dataset.id} draggableId={dataset.id} index={index}>
                  {(provided, snapshot) => (
                    <motion.div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`dataset-card ${snapshot.isDragging ? 'rotate-2 shadow-2xl' : ''} ${
                        dataset.isImported ? 'border-cyan-500/50 bg-cyan-500/10' : ''
                      }`}
                      whileHover={{ scale: 1.02 }}
                    >
                        <div className="flex items-center justify-between overflow-hidden">
                          <div className="flex items-center space-x-3 overflow-hidden">
                            <div className={`p-2 rounded-lg flex-shrink-0 ${
                              dataset.isImported 
                                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20' 
                                : 'bg-gradient-to-r from-gray-700/50 to-gray-600/50'
                            }`}>
                              <IconComponent className={`w-4 h-4 ${
                                dataset.isImported ? 'text-cyan-400' : 'text-gray-400'
                              }`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className={`font-medium truncate ${
                                dataset.isImported ? 'text-cyan-200' : 'text-gray-200'
                              }`} title={dataset.name}>{dataset.name}</h3>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className={`px-2 py-1 text-xs rounded-full flex-shrink-0 ${
                                  dataset.isImported 
                                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                    : getTypeColor(dataset.type)
                                }`}>
                                  {dataset.type}
                                </span>
                                <span className="text-xs text-gray-400 truncate">{dataset.samples} samples</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                            <motion.button
                              onClick={() => onPreview && onPreview(dataset)}
                              className="p-1 text-gray-400 hover:text-cyan-400 transition-colors"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <Eye className="w-4 h-4" />
                            </motion.button>
                          <motion.button
                            onClick={() => {
                              if (datasets.includes(dataset)) {
                                setDatasets(prev => prev.filter(d => d.id !== dataset.id))
                              }
                            }}
                            className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </div>
                      
                      <div className="mt-2 text-xs text-gray-400">
                        Size: {dataset.size}
                        {dataset.uploadedAt && (
                          <span className="ml-2">• Uploaded {new Date(dataset.uploadedAt).toLocaleDateString()}</span>
                        )}
                        {dataset.isImported && (
                          <span className="ml-2 text-cyan-400">• Imported</span>
                        )}
                      </div>
                    </motion.div>
                  )}
                </Draggable>
              )
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </motion.div>
  )
}

export default DatasetPanel 