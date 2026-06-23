import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, ChevronDown, Sliders, Settings, Activity, Filter, Target, List } from 'lucide-react';

const FeaturesPanel = ({ 
  selectedAlgorithm, 
  setSelectedAlgorithm,
  selectedTaskType,
  setSelectedTaskType,
  targetColumn,
  setTargetColumn,
  featureColumns,
  setFeatureColumns,
  epochs,
  setEpochs,
  batchSize,
  setBatchSize,
  learningRate,
  setLearningRate,
  validationSplit,
  setValidationSplit,
  normalizeData,
  setNormalizeData,
  augmentData,
  setAugmentData,
  randomSeed,
  setRandomSeed,
  shuffleData,
    setShuffleData,
    availableColumns = []
  }) => {
    const [expandedSection, setExpandedSection] = useState('model');


    const models = {
      regression: [
        { id: 'linear_regression', name: 'Linear Regression' },
        { id: 'random_forest', name: 'Random Forest' },
        { id: 'decision_tree', name: 'Decision Tree' },
        { id: 'svm', name: 'SVR' },
      ],
      classification: [
        { id: 'logistic_regression', name: 'Logistic Regression' },
        { id: 'random_forest', name: 'Random Forest' },
        { id: 'decision_tree', name: 'Decision Tree' },
        { id: 'svm', name: 'SVC' },
        { id: 'knn', name: 'K-Nearest Neighbors' },
      ],
      clustering: [
        { id: 'kmeans', name: 'K-Means' },
        { id: 'dbscan', name: 'DBSCAN' },
        { id: 'hierarchical', name: 'Hierarchical' },
      ]
    };


  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const SectionHeader = ({ id, icon: Icon, title }) => (
    <button
      onClick={() => toggleSection(id)}
      className={`w-full flex items-center justify-between px-3 py-2.5 transition-all ${
        expandedSection === id
          ? 'bg-[#141E35] text-white'
          : 'bg-[#0D1525] text-slate-400 hover:bg-[#111A30] hover:text-slate-200'
      }`}
    >
      <div className="flex items-center space-x-2.5 overflow-hidden">
        <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${expandedSection === id ? 'text-violet-400' : 'text-slate-600'}`} />
        <h4 className="text-xs font-semibold tracking-tight truncate">{title}</h4>
      </div>
      <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform text-slate-500 ${expandedSection === id ? 'rotate-180' : ''}`} />
    </button>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0B0F1A] border border-cyan-500/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl"
    >
      <div className="p-3 border-b border-[#1E2D50]/60 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg shadow-lg shadow-violet-500/20">
            <Settings className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-200 tracking-tight">Configuration</h3>
            <p className="text-slate-500 text-[8px] uppercase tracking-wider font-semibold">Training parameters</p>
          </div>
        </div>
        <div className="p-1.5 bg-violet-500/15 border border-violet-500/20 rounded-lg cursor-pointer hover:bg-violet-500/25 transition-all">
          <Activity className="w-3.5 h-3.5 text-violet-400" />
        </div>
      </div>

      <div className="p-2 space-y-2 max-h-[450px] overflow-y-auto custom-scrollbar">
        {/* Model Selection */}
        <div className="rounded-lg border border-gray-700/30 overflow-hidden bg-[#0F172A]">
          <SectionHeader id="model" icon={Settings} title="Model selection" />
          <AnimatePresence>
            {expandedSection === 'model' && (
              <motion.div 
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden bg-[#151B2B]"
              >
                  <div className="p-3 space-y-3 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-[10px] font-semibold text-gray-500 whitespace-nowrap">Task Type</label>
                      <select
                        value={selectedTaskType}
                        onChange={(e) => {
                          setSelectedTaskType(e.target.value);
                          setSelectedAlgorithm(models[e.target.value][0].id);
                        }}
                        className="w-[110px] bg-[#0B1020] border border-[#1E2D50] text-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold focus:outline-none focus:border-violet-500/50 cursor-pointer"
                      >
                        <option value="classification">Classification</option>
                        <option value="regression">Regression</option>
                        <option value="clustering">Clustering</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-[10px] font-semibold text-gray-500 whitespace-nowrap">Algorithm</label>
                      <select
                        value={selectedAlgorithm}
                        onChange={(e) => setSelectedAlgorithm(e.target.value)}
                        className="w-[110px] bg-[#0B1020] border border-[#1E2D50] text-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold focus:outline-none focus:border-violet-500/50 cursor-pointer"
                      >
                          {models[selectedTaskType].map(model => (
                            <option key={model.id} value={model.id}>{model.name}</option>
                          ))}
                        </select>
                      </div>


                    {selectedTaskType !== 'clustering' && availableColumns.length > 0 && (
                      <div className="flex items-center justify-between gap-3">
                        <label className="text-[10px] font-semibold text-gray-500 whitespace-nowrap">Target</label>
                        <select
                          value={targetColumn}
                          onChange={(e) => setTargetColumn(e.target.value)}
                          className="w-[110px] bg-[#0B1020] border border-[#1E2D50] text-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold focus:outline-none focus:border-violet-500/50 cursor-pointer"
                        >
                          <option value="">Auto (Last)</option>
                          {availableColumns.map(col => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Training Parameters */}
        <div className="rounded-lg border border-gray-700/30 overflow-hidden bg-[#0F172A]">
          <SectionHeader id="params" icon={Target} title="Parameters" />
          <AnimatePresence>
            {expandedSection === 'params' && (
              <motion.div 
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden bg-[#151B2B]"
              >
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-semibold text-gray-500">Epochs</label>
                    <input 
                      type="number" value={epochs} onChange={(e) => setEpochs(Number(e.target.value))}
                      className="w-16 bg-[#0B1020] border border-[#1E2D50] text-slate-200 rounded-lg px-2 py-0.5 text-[10px] font-bold text-center focus:outline-none focus:border-violet-500/50"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-semibold text-gray-500">Batch Size</label>
                    <input 
                      type="number" value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value))}
                      className="w-16 bg-[#0B1020] border border-[#1E2D50] text-slate-200 rounded-lg px-2 py-0.5 text-[10px] font-bold text-center focus:outline-none focus:border-violet-500/50"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-semibold text-gray-500">Rate</label>
                    <input 
                      type="number" step="0.0001" value={learningRate} onChange={(e) => setLearningRate(Number(e.target.value))}
                      className="w-20 bg-[#0B1020] border border-[#1E2D50] text-slate-200 rounded-lg px-2 py-0.5 text-[10px] font-bold text-center focus:outline-none focus:border-violet-500/50"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Data Processing */}
        <div className="rounded-lg border border-gray-700/30 overflow-hidden bg-[#0F172A]">
          <SectionHeader id="processing" icon={Sliders} title="Processing" />
          <AnimatePresence>
            {expandedSection === 'processing' && (
              <motion.div 
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden bg-[#151B2B]"
              >
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-semibold text-gray-500">Normalize</label>
                    <input type="checkbox" checked={normalizeData} onChange={(e) => setNormalizeData(e.target.checked)} className="w-3.5 h-3.5 accent-purple-600 rounded" />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-semibold text-gray-500">Shuffle</label>
                    <input type="checkbox" checked={shuffleData} onChange={(e) => setShuffleData(e.target.checked)} className="w-3.5 h-3.5 accent-purple-600 rounded" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="p-3 border-t border-cyan-500/10 bg-[#0F172A]">
        <div className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mb-2">Presets</div>
        <div className="grid grid-cols-2 gap-2">
          <button className="py-1.5 px-1 bg-white/5 border border-white/10 text-gray-400 text-[9px] rounded-lg font-bold hover:bg-white/10 transition-all uppercase tracking-wider truncate">Balanced</button>
          <button className="py-1.5 px-1 bg-white/5 border border-white/10 text-gray-400 text-[9px] rounded-lg font-bold hover:bg-white/10 transition-all uppercase tracking-wider truncate">Accuracy</button>
        </div>
      </div>
    </motion.div>
  );
};

export default FeaturesPanel;