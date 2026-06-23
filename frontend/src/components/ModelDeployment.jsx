import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import {
  Server,
  Play,
  Square,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Activity,
  Zap,
  Clock,
  TrendingUp,
  AlertTriangle
} from 'lucide-react'

const ModelDeployment = ({ modelResults }) => {
  const API_BASE_URL = (import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '')
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState(null)
  const [predictionInput, setPredictionInput] = useState('')
  const [predictionResult, setPredictionResult] = useState(null)
  const [predicting, setPredicting] = useState(false)
  const [requiredFeatures, setRequiredFeatures] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)

  // Fetch models on component mount
  useEffect(() => {
    fetchModels()
  }, [])

  // Auto-refresh when a new model is trained
  useEffect(() => {
    if (modelResults?.model_id) {
      fetchModels()
    }
  }, [modelResults])

  const fetchModels = async () => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const response = await fetch(`${API_BASE_URL}/api/models`)
      if (!response.ok) {
        const text = await response.text()
        throw new Error(`Failed to fetch models: ${response.status} ${text}`)
      }
      const data = await response.json()
      if (data.success) {
        // Fetch metadata for each model to get feature map
        const modelsWithMetadata = await Promise.all(
          data.models.map(async (model) => {
            try {
              const metadataResponse = await fetch(`${API_BASE_URL}/api/models/${model.model_id}`)
              const metadataData = await metadataResponse.json()
              return {
                ...model,
                metadata: metadataData.model
              }
            } catch (e) {
              return model
            }
          })
        )
        setModels(modelsWithMetadata)
      } else {
        throw new Error(data.error || 'Backend returned success=false')
      }
    } catch (error) {
      console.error('Error fetching models:', error)
      setModels([])
      setErrorMessage(
        `Could not load models from ${API_BASE_URL}. ` +
        `Make sure the backend is running on that URL. ` +
        `Details: ${error?.message || String(error)}`
      )
    } finally {
      setLoading(false)
    }
  }

  const handleDeploy = async (modelId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/models/${modelId}/deploy`, {
        method: 'POST'
      })
      const data = await response.json()
      if (data.success) {
        fetchModels() // Refresh list
      } else {
        alert(data.error || 'Failed to deploy model')
      }
    } catch (error) {
      console.error('Error deploying model:', error)
      alert('Error deploying model')
    }
  }

  const handleUndeploy = async (modelId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/models/${modelId}/undeploy`, {
        method: 'POST'
      })
      const data = await response.json()
      if (data.success) {
        fetchModels() // Refresh list
      } else {
        alert(data.error || 'Failed to undeploy model')
      }
    } catch (error) {
      console.error('Error undeploying model:', error)
      alert('Error undeploying model')
    }
  }

  const handleDelete = async (modelId) => {
    if (!window.confirm('Are you sure you want to delete this model? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/models/${modelId}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      if (data.success) {
        fetchModels() // Refresh list
        if (selectedModel?.model_id === modelId) {
          setSelectedModel(null)
        }
      } else {
        alert(data.error || 'Failed to delete model')
      }
    } catch (error) {
      console.error('Error deleting model:', error)
      alert('Error deleting model')
    }
  }

  const handleDeleteAll = async () => {
    if (models.length === 0) return
    if (!window.confirm(`Delete ALL ${models.length} trained model${models.length > 1 ? 's' : ''}? This cannot be undone.`)) {
      return
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/models`, { method: 'DELETE' })
      const data = await response.json()
      if (data.success) {
        setSelectedModel(null)
        fetchModels()
      } else {
        alert(data.error || 'Failed to delete all models')
      }
    } catch (error) {
      console.error('Error deleting all models:', error)
      alert('Error deleting all models')
    }
  }

  const handleExport = async (modelId) => {
    try {
      setErrorMessage(null)
      const response = await fetch(`${API_BASE_URL}/api/models/${modelId}/export`)
      if (!response.ok) {
        const text = await response.text()
        throw new Error(`Export failed: ${response.status} ${text}`)
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `model_export_${modelId}.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting model:', error)
      setErrorMessage(error?.message || 'Error exporting model')
    }
  }

  const handlePredict = async () => {
    if (!selectedModel || !selectedModel.deployed) {
      setErrorMessage('Please select a deployed model first')
      return
    }

    if (!predictionInput.trim()) {
      setErrorMessage('Please enter input data (JSON format)')
      return
    }

    setPredicting(true)
    setPredictionResult(null)
    setErrorMessage(null)
    setRequiredFeatures(null)

    try {
      // Parse input JSON
      let inputData
      try {
        inputData = JSON.parse(predictionInput)
      } catch (e) {
        // If not valid JSON, try as single value or object
        inputData = predictionInput.includes('{') ? JSON.parse(predictionInput) : { data: predictionInput }
      }

      // Ensure data is in correct format
      if (!Array.isArray(inputData) && !inputData.data) {
        inputData = { data: inputData }
      }

      const response = await fetch(`${API_BASE_URL}/api/models/${selectedModel.model_id}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: Array.isArray(inputData) ? inputData : inputData.data,
          return_proba: true
        })
      })

      const data = await response.json()
      if (data.success) {
        setPredictionResult(data)
        setErrorMessage(null)
      } else {
        setErrorMessage(data.error || 'Prediction failed')
        if (data.required_features) {
          setRequiredFeatures(data.required_features)
        }
      }
    } catch (error) {
      console.error('Error making prediction:', error)
      setErrorMessage('Error making prediction: ' + error.message)
    } finally {
      setPredicting(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  const getMetricValue = (metrics, key) => {
    if (!metrics) return 'N/A'
    const value = metrics[key]
    if (typeof value === 'number') {
      return (value * 100).toFixed(2) + '%'
    }
    return value || 'N/A'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="kinesthetic-card neon-glow h-full flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
            <Server className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-purple-300 neon-text">Model Deployment</h2>
            <p className="text-sm text-gray-300">Deploy and serve your trained models</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {models.length > 0 && (
            <motion.button
              onClick={handleDeleteAll}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-xs font-semibold hover:bg-red-500/20 hover:border-red-500/50 transition-all"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              title="Delete all trained models"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Delete All</span>
            </motion.button>
          )}
          <motion.button
            onClick={fetchModels}
            disabled={loading}
            className="p-2 bg-gray-700/50 rounded-lg hover:bg-gray-600/50 transition-colors disabled:opacity-50"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw className={`w-4 h-4 text-gray-300 ${loading ? 'animate-spin' : ''}`} />
          </motion.button>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-300 rounded-lg text-xs">
          {errorMessage}
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-auto">
        {/* Models List */}
        <div className="space-y-4">
          <h3 className="text-md font-semibold text-gray-200">Trained Models ({models.length})</h3>
          
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
            </div>
          ) : models.length === 0 ? (
            <div className="p-8 text-center bg-gray-800/30 rounded-lg border border-gray-700/50">
              <Server className="w-12 h-12 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400">No models trained yet</p>
              <p className="text-sm text-gray-500 mt-1">Train a model to see it here</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {models.map((model) => (
                <motion.div
                  key={model.model_id}
                  onClick={() => setSelectedModel(model)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedModel?.model_id === model.model_id
                      ? 'bg-cyan-500/20 border-cyan-500/50'
                      : 'bg-gray-800/30 border-gray-700/50 hover:border-gray-600/50'
                  }`}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-200">{model.model_name || 'Unnamed Model'}</h4>
                      <p className="text-xs text-gray-400 mt-1">
                        {model.algorithm} • {model.task_type}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {model.deployed ? (
                        <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-full flex items-center">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Deployed
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-500/20 text-gray-300 text-xs rounded-full flex items-center">
                          <XCircle className="w-3 h-3 mr-1" />
                          Trained
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="flex items-center space-x-4 mt-3 text-xs">
                    {model.metrics?.accuracy && (
                      <div className="flex items-center text-cyan-300">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        {getMetricValue(model.metrics, 'accuracy')}
                      </div>
                    )}
                    {model.metrics?.r2_score && (
                      <div className="flex items-center text-green-300">
                        <Activity className="w-3 h-3 mr-1" />
                        R²: {getMetricValue(model.metrics, 'r2_score')}
                      </div>
                    )}
                    <div className="flex items-center text-gray-400">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatDate(model.created_at)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-gray-700/50">
                    {model.deployed ? (
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleUndeploy(model.model_id)
                        }}
                        className="flex-1 px-3 py-1.5 bg-yellow-500/20 text-yellow-300 rounded text-xs hover:bg-yellow-500/30 transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Square className="w-3 h-3 inline mr-1" />
                        Undeploy
                      </motion.button>
                    ) : (
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeploy(model.model_id)
                        }}
                        className="flex-1 px-3 py-1.5 bg-green-500/20 text-green-300 rounded text-xs hover:bg-green-500/30 transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Play className="w-3 h-3 inline mr-1" />
                        Deploy
                      </motion.button>
                    )}
                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleExport(model.model_id)
                      }}
                      className="px-3 py-1.5 bg-blue-500/20 text-blue-300 rounded text-xs hover:bg-blue-500/30 transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      title="Export model as zip"
                    >
                      Export
                    </motion.button>
                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(model.model_id)
                      }}
                      className="px-3 py-1.5 bg-red-500/20 text-red-300 rounded text-xs hover:bg-red-500/30 transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Prediction Panel */}
        <div className="space-y-4">
          <h3 className="text-md font-semibold text-gray-200">Make Predictions</h3>
          
          {selectedModel ? (
            <div className="space-y-4">
              {/* Model Info with Feature Requirements */}
              <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
                <h4 className="font-medium text-gray-200 mb-2">{selectedModel.model_name}</h4>
                <div className="text-xs text-gray-400 space-y-1">
                  <p>Algorithm: {selectedModel.algorithm}</p>
                  <p>Task Type: {selectedModel.task_type}</p>
                  {selectedModel.target_column && <p>Target: {selectedModel.target_column}</p>}
                  {!selectedModel.deployed && (
                    <p className="text-yellow-400 mt-2">⚠️ Model must be deployed to make predictions</p>
                  )}
                </div>
                
                {/* Required Features Display */}
                {selectedModel.metadata?.feature_map && (
                  <div className="mt-3 pt-3 border-t border-gray-700/50">
                    <p className="text-xs font-semibold text-cyan-300 mb-2">Required Features:</p>
                    <div className="space-y-2">
                      {selectedModel.metadata.feature_map.numerical && selectedModel.metadata.feature_map.numerical.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Numerical:</p>
                          <div className="flex flex-wrap gap-1">
                            {selectedModel.metadata.feature_map.numerical.map(col => (
                              <span key={col} className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded">{col}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedModel.metadata?.feature_map.categorical && selectedModel.metadata.feature_map.categorical.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Categorical:</p>
                          <div className="flex flex-wrap gap-1">
                            {selectedModel.metadata.feature_map.categorical.map(col => (
                              <span key={col} className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded">{col}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Input Data (JSON format)
                </label>
                <textarea
                  value={predictionInput}
                  onChange={(e) => setPredictionInput(e.target.value)}
                  placeholder='{"feature1": value1, "feature2": value2}'
                  className="w-full p-3 bg-gray-900/50 border border-gray-700/50 rounded-lg text-gray-200 text-sm font-mono focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  rows={6}
                  disabled={!selectedModel.deployed}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter feature values as JSON object or array of objects
                </p>
              </div>

              {/* Predict Button */}
              <motion.button
                onClick={handlePredict}
                disabled={!selectedModel.deployed || predicting || !predictionInput.trim()}
                className={`w-full px-4 py-3 rounded-lg font-medium transition-all ${
                  selectedModel.deployed && predictionInput.trim() && !predicting
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:shadow-lg'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
                whileHover={selectedModel.deployed && predictionInput.trim() && !predicting ? { scale: 1.02 } : {}}
                whileTap={selectedModel.deployed && predictionInput.trim() && !predicting ? { scale: 0.98 } : {}}
              >
                {predicting ? (
                  <span className="flex items-center justify-center">
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Predicting...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <Zap className="w-4 h-4 mr-2" />
                    Predict
                  </span>
                )}
              </motion.button>

              {/* Error Message */}
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg"
                >
                  <h4 className="font-medium text-red-300 mb-2">Error</h4>
                  <p className="text-sm text-red-200 mb-2">{errorMessage}</p>
                  
                  {/* Show required features if available */}
                  {requiredFeatures && (
                    <div className="mt-3 pt-3 border-t border-red-500/30">
                      <p className="text-xs font-semibold text-red-300 mb-2">Required Features:</p>
                      {requiredFeatures.numerical && requiredFeatures.numerical.length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs text-red-200 mb-1">Numerical:</p>
                          <div className="flex flex-wrap gap-1">
                            {requiredFeatures.numerical.map(col => (
                              <span key={col} className="px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded">{col}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {requiredFeatures.categorical && requiredFeatures.categorical.length > 0 && (
                        <div>
                          <p className="text-xs text-red-200 mb-1">Categorical:</p>
                          <div className="flex flex-wrap gap-1">
                            {requiredFeatures.categorical.map(col => (
                              <span key={col} className="px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded">{col}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Results */}
              {predictionResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg"
                >
                  <h4 className="font-medium text-green-300 mb-2">Prediction Result</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm text-gray-300">Predictions: </span>
                      <span className="text-sm font-mono text-cyan-300">
                        {JSON.stringify(predictionResult.predictions)}
                      </span>
                    </div>
                    {predictionResult.probabilities && (
                      <div>
                        <span className="text-sm text-gray-300">Probabilities: </span>
                        <pre className="text-xs text-gray-400 mt-1 overflow-auto">
                          {JSON.stringify(predictionResult.probabilities, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center bg-gray-800/30 rounded-lg border border-gray-700/50">
              <Activity className="w-12 h-12 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400">Select a model to make predictions</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default ModelDeployment
