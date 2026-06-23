import { motion } from 'framer-motion'
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Settings,
  Sliders,
  Target,
  Zap
} from 'lucide-react'
import { useState } from 'react'

const ModelConfig = ({ selectedAlgorithm, setSelectedAlgorithm, selectedTaskType, setSelectedTaskType }) => {
  const [expandedSections, setExpandedSections] = useState({
    training: true,
    model: true,
    data: true
  })

  // Define supported algorithms per task type
  const algorithmOptions = {
    'classification': ['random_forest', 'logistic_regression', 'svm', 'decision_tree', 'knn'],
    'regression': ['random_forest', 'linear_regression', 'svm', 'decision_tree', 'knn'],
    'clustering': ['kmeans']
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const configSections = [
    {
      id: 'model',
      title: 'Model selection',
      icon: Settings,
      settings: [
        {
          name: 'Task Type',
          type: 'select',
          value: selectedTaskType,
          options: ['classification', 'regression', 'clustering'],
          onChange: (e) => setSelectedTaskType(e.target.value)
        },
        {
          name: 'Algorithm',
          type: 'select',
          value: selectedAlgorithm,
          options: algorithmOptions[selectedTaskType] || [],
          onChange: (e) => setSelectedAlgorithm(e.target.value)
        }
      ]
    },
    {
      id: 'training',
      title: 'Training Parameters',
      icon: Target,
      settings: [
        { name: 'Epochs', type: 'number', value: 100, min: 1, max: 1000 },
        { name: 'Batch Size', type: 'number', value: 32, min: 1, max: 512 },
        { name: 'Learning Rate', type: 'number', value: 0.001, min: 0.0001, max: 1, step: 0.0001 },
        { name: 'Validation Split', type: 'number', value: 0.2, min: 0.1, max: 0.5, step: 0.05 },
      ]
    },
    {
      id: 'data',
      title: 'Data Processing',
      icon: Sliders,
      settings: [
        { name: 'Normalize Data', type: 'checkbox', value: true },
        { name: 'Augment Data', type: 'checkbox', value: false },
        { name: 'Random Seed', type: 'number', value: 42, min: 1, max: 9999 },
        { name: 'Shuffle Data', type: 'checkbox', value: true },
      ]
    }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="kinesthetic-card"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-green-500 to-green-600 rounded-lg">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Model Configuration</h2>
            <p className="text-sm text-gray-600">Configure training parameters</p>
          </div>
        </div>

        <motion.button
          className="p-2 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg hover:shadow-lg transition-shadow"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Zap className="w-4 h-4" />
        </motion.button>
      </div>

      <div className="space-y-4">
        {configSections.map((section) => {
          const IconComponent = section.icon
          return (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="border border-gray-200 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition-all"
              >
                <div className="flex items-center space-x-3">
                  <IconComponent className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-800">{section.title}</span>
                </div>
                {expandedSections[section.id] ? (
                  <ChevronUp className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                )}
              </button>

              {expandedSections[section.id] && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 space-y-4"
                >
                  {section.settings.map((setting, index) => (
                    <div key={setting.name} className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">
                        {setting.name}
                      </label>
                      <div className="flex items-center space-x-2">
                        {setting.type === 'number' && (
                          <input
                            type="number"
                            min={setting.min}
                            max={setting.max}
                            step={setting.step || 1}
                            defaultValue={setting.value}
                            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        )}
                        {setting.type === 'select' && (
                          <select
                            value={setting.value}
                            onChange={setting.onChange}
                            className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          >
                            {setting.options.map(option => (
                              <option key={option} value={option}>
                                {(() => {
                                  if (option === 'linear_regression') return 'Linear Regression';
                                  if (option === 'logistic_regression') return 'Logistic Regression';
                                  if (option === 'random_forest') return 'Random Forest';
                                  return option.charAt(0).toUpperCase() + option.slice(1);
                                })()}
                              </option>
                            ))}
                          </select>
                        )}
                        {setting.type === 'checkbox' && (
                          <input
                            type="checkbox"
                            defaultChecked={setting.value}
                            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Quick Presets */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Presets</h3>
        <div className="grid grid-cols-2 gap-2">
          {['Fast Training', 'High Accuracy', 'Balanced', 'Custom'].map((preset) => (
            <motion.button
              key={preset}
              className="px-3 py-2 text-xs bg-white/50 rounded-lg hover:bg-white/70 transition-colors border border-gray-200"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {preset}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Estimated Training Time */}
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
        <div className="flex items-center space-x-3">
          <Clock className="w-5 h-5 text-blue-600" />
          <div>
            <h4 className="text-sm font-medium text-gray-800">Estimated Training Time</h4>
            <p className="text-sm text-gray-600">~15-30 minutes</p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default ModelConfig