import { useState, useEffect } from 'react'
import { DragDropContext } from 'react-beautiful-dnd'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Upload, Settings, Zap, CheckCircle, ArrowRight, ArrowLeft,
  Database, Brain, BarChart3, Sparkles
} from 'lucide-react'
import DataCleaningPanel from './components/DataCleaningPanel'
import DatasetPanel from './components/DatasetPanel'
import FeaturesPanel from './components/FeaturesPanel'
import Header from './components/Header'
import ModelDeployment from './components/ModelDeployment'
import ResultsPanel from './components/ResultsPanel'
import Sidebar from './components/Sidebar'
import TrainingProgress from './components/TrainingProgress'
import Workspace from './components/Workspace'
import DataPreviewModal from './components/DataPreviewModal'
import { API_BASE_URL } from './config'
const STEPS = [
  { id: 1, label: 'Load Data',       icon: Database, desc: 'Upload a dataset to work with' },
  { id: 2, label: 'Configure',        icon: Settings, desc: 'Choose model & clean data' },
  { id: 3, label: 'Train & Review',   icon: Zap,      desc: 'Run training, view results' },
]
function StepShell({ children, stepId }) {
  return (
    <motion.div
      key={`step-${stepId}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
function StepNav({ onBack, onNext, nextLabel = 'Next Step', canNext = true, canBack = true }) {
  return (
    <div className="mt-8 flex items-center justify-between">
      {canBack ? (
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#141E35] border border-[#1E2D50] text-slate-300 rounded-xl font-semibold text-sm hover:bg-[#1A2440] hover:text-white transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      ) : <div />}
      {onNext && (
        <button
          onClick={onNext}
          disabled={!canNext}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-violet-500/25 hover:from-violet-500 hover:to-indigo-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {nextLabel} <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
function App() {
  const [datasets, setDatasets] = useState([])
  const [workspaceItems, setWorkspaceItems] = useState([])
  const [previewDataset, setPreviewDataset] = useState(null)
  const [availableColumns, setAvailableColumns] = useState([])
  const [isTraining, setIsTraining] = useState(false)
  const [trainingProgress, setTrainingProgress] = useState(0)
  const [modelResults, setModelResults] = useState(null)
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('linear_regression')
  const [selectedTaskType, setSelectedTaskType] = useState('regression')
  const [targetColumn, setTargetColumn] = useState('')
  const [featureColumns, setFeatureColumns] = useState('')
  const [epochs, setEpochs] = useState(100)
  const [batchSize, setBatchSize] = useState(32)
  const [learningRate, setLearningRate] = useState(0.001)
  const [validationSplit, setValidationSplit] = useState(0.2)
  const [normalizeData, setNormalizeData] = useState(true)
  const [augmentData, setAugmentData] = useState(false)
  const [randomSeed, setRandomSeed] = useState(42)
  const [shuffleData, setShuffleData] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [projects, setProjects] = useState([])
  const [currentProjectId, setCurrentProjectId] = useState(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState([])
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/projects`)
      .then(res => res.json())
      .then(data => {
        setProjects(data)
        if (data.length > 0) setCurrentProjectId(data[0].id)
      })
      .catch(() => {})
  }, [])
  useEffect(() => {
    const item = workspaceItems.find(i => i.type === 'dataset' || i.file || i.id === 'sample-churn')
    if (!item) { setAvailableColumns([]); return }
    const fd = new FormData()
    if (item.file) fd.append('file', item.file)
    else fd.append('filename', item.name + '.csv')
    fetch(`${API_BASE_URL}/api/analyze-data`, { method: 'POST', body: fd })
      .then(r => r.json())
      .then(d => { if (d.success) setAvailableColumns(Object.keys(d.stats.column_info)) })
      .catch(() => {})
  }, [workspaceItems])
  const addImportedDatasets = (files) => {
    const next = files.map(f => ({
      id: `dataset-${Date.now()}-${Math.random()}`,
      name: f.name.replace(/\.[^/.]+$/, ''),
      type: f.type, size: f.size, samples: 'Unknown',
      file: f.file, uploadedAt: new Date().toISOString(), isImported: true,
    }))
    setDatasets(prev => [...prev, ...next])
  }
  const handleDataCleaned = (cleaned) => {
    setWorkspaceItems(prev => [...prev, { ...cleaned, id: `workspace-${Date.now()}` }])
  }
  const handleDragEnd = ({ source, destination, draggableId }) => {
    if (!destination) return
    if (destination.droppableId === 'workspace') {
      const ds = datasets.find(d => d.id === draggableId)
      if (ds) setWorkspaceItems(prev => [...prev, { ...ds, id: `workspace-${Date.now()}`, type: 'dataset' }])
    }
    if (destination.droppableId === 'datasets') {
      setWorkspaceItems(prev => prev.filter(i => i.id !== draggableId))
    }
  }
  const createProject = (name) => {
    fetch(`${API_BASE_URL}/api/projects`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }).then(r => r.json()).then(p => {
      setProjects(prev => [...prev, p]); setCurrentProjectId(p.id)
    })
  }
  const deleteProject = (id) => {
    fetch(`${API_BASE_URL}/api/projects/${id}`, { method: 'DELETE' }).then(() => {
      setProjects(prev => {
        const updated = prev.filter(p => p.id !== id)
        if (currentProjectId === id && updated.length > 0) setCurrentProjectId(updated[0].id)
        return updated
      })
    })
  }
  const selectProject = (id) => {
    setCurrentProjectId(id)
    setProjects(prev => prev.map(p => ({ ...p, isActive: p.id === id })))
  }
  const markDone = (step) => setCompletedSteps(prev => prev.includes(step) ? prev : [...prev, step])
  const goNext = () => { markDone(currentStep); setCurrentStep(s => Math.min(s + 1, 3)) }
  const goBack = () => setCurrentStep(s => Math.max(s - 1, 1))
  const featurePanelProps = {
    selectedAlgorithm, setSelectedAlgorithm, selectedTaskType, setSelectedTaskType,
    availableColumns, targetColumn, setTargetColumn, featureColumns, setFeatureColumns,
    epochs, setEpochs, batchSize, setBatchSize, learningRate, setLearningRate,
    validationSplit, setValidationSplit, normalizeData, setNormalizeData,
    augmentData, setAugmentData, randomSeed, setRandomSeed, shuffleData, setShuffleData,
  }
  const workspaceProps = {
    workspaceItems, setWorkspaceItems, isTraining, setIsTraining,
    trainingProgress, setTrainingProgress, setModelResults, setActiveTab,
    selectedAlgorithm, selectedTaskType, targetColumn, featureColumns,
    trainingParams: { epochs, batchSize, learningRate, validationSplit, normalizeData, augmentData, randomSeed, shuffleData },
  }
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-transparent text-white font-sans overflow-hidden">
        <Header />
        <div className="flex h-screen pt-16">
          <Sidebar
            projects={projects} currentProjectId={currentProjectId}
            onCreateProject={createProject} onDeleteProject={deleteProject}
            onSelectProject={selectProject} onImportData={addImportedDatasets}
            activeTab={activeTab} setActiveTab={setActiveTab}
          />
          <main className="flex-1 overflow-y-auto custom-scrollbar">
            {activeTab === 'results' && <ResultsPanel modelResults={modelResults} isTraining={isTraining} />}
            {activeTab === 'models' && <ModelDeployment modelResults={modelResults} />}
            {activeTab === 'dashboard' && (
              <div className="max-w-6xl mx-auto px-6 py-6 w-full" style={{ zoom: 1.25 }}>
                {/* Page heading + step pills */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl shadow-lg shadow-violet-500/25">
                      <Brain className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h1 className="text-lg font-bold text-white leading-tight">Build Your AI Model</h1>
                      <p className="text-xs text-slate-500 mt-0.5">Guided workflow — no ML experience required</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {STEPS.map((step, i) => {
                      const Icon = step.icon
                      const done = completedSteps.includes(step.id)
                      const active = currentStep === step.id
                      const clickable = done || step.id <= currentStep
                      return (
                        <div key={step.id} className="flex items-center gap-2">
                          <button
                            onClick={() => clickable && setCurrentStep(step.id)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all text-xs font-semibold ${
                              active   ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20'
                              : done   ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 cursor-pointer'
                                       : 'bg-[#141E35] text-slate-500 border border-[#1E2D50] cursor-default'
                            }`}
                          >
                            {done ? <CheckCircle className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                            {step.label}
                          </button>
                          {i < STEPS.length - 1 && <div className={`w-5 h-px ${done ? 'bg-emerald-500/40' : 'bg-[#1E2D50]'}`} />}
                        </div>
                      )
                    })}
                  </div>
                </div>
                <AnimatePresence mode="wait">
                  {/* STEP 1 */}
                  {currentStep === 1 && (
                    <StepShell stepId={1}>
                      <div className="grid grid-cols-5 gap-5">
                        <div className="col-span-3 flex flex-col gap-4">
                          <div>
                            <h2 className="text-base font-bold text-white">Step 1 — Load Your Dataset</h2>
                            <p className="text-sm text-slate-400 mt-1">Upload a file or use the sample dataset. Supports CSV, Excel, JSON and images (up to 100 MB).</p>
                          </div>
                          <DatasetPanel datasets={datasets} setDatasets={setDatasets} onPreview={setPreviewDataset} />
                        </div>
                        <div className="col-span-2 flex flex-col gap-4">
                          <div className="bg-[#0D1525]/80 border border-[#1E2D50]/60 rounded-2xl p-5 backdrop-blur-xl flex-1">
                            <div className="flex items-center gap-2 mb-5">
                              <div className="w-1 h-4 bg-gradient-to-b from-violet-500 to-indigo-500 rounded-full" />
                              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest">What this platform does</h3>
                            </div>
                            <ul className="space-y-4">
                              {[
                                { icon: '📤', t: 'Upload any dataset',  d: 'CSV, Excel, JSON or image files up to 100 MB' },
                                { icon: '🧹', t: 'Clean your data',     d: 'Remove duplicates, fix missing values, handle outliers' },
                                { icon: '🤖', t: 'Train an ML model',   d: 'Choose from regression, classification or clustering' },
                                { icon: '📊', t: 'View results',        d: 'Accuracy, charts, feature importance & more' },
                                { icon: '🚀', t: 'Deploy your model',   d: 'Export and share your trained model' },
                              ].map(({ icon, t, d }) => (
                                <li key={t} className="flex items-start gap-3">
                                  <span className="text-lg flex-shrink-0">{icon}</span>
                                  <div>
                                    <p className="text-sm font-semibold text-slate-300">{t}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{d}</p>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="bg-[#0D1525]/80 border border-[#1E2D50]/60 rounded-2xl p-4 backdrop-blur-xl">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Supported Formats</p>
                            <div className="grid grid-cols-2 gap-2">
                              {['.csv', '.xlsx', '.json', 'images'].map(f => (
                                <div key={f} className="flex items-center gap-2 bg-[#141E35] rounded-lg px-3 py-2.5">
                                  <div className="w-1.5 h-1.5 bg-violet-400 rounded-full" />
                                  <span className="text-sm font-mono text-slate-300">{f}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <button
                            onClick={goNext}
                            disabled={datasets.length === 0}
                            className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-violet-500/25 hover:from-violet-500 hover:to-indigo-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Next: Configure Model <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </StepShell>
                  )}
                  {/* STEP 2 */}
                  {currentStep === 2 && (
                    <StepShell stepId={2}>
                      <div>
                        <h2 className="text-base font-bold text-white">Step 2 — Configure Your Model</h2>
                        <p className="text-sm text-slate-400 mt-1 mb-5">Choose the prediction task, algorithm, and optionally clean your data before training.</p>
                        <div className="grid grid-cols-2 gap-5">
                          <FeaturesPanel {...featurePanelProps} />
                          <div className="bg-[#0D1525]/80 border border-[#1E2D50]/60 rounded-2xl p-5 backdrop-blur-xl">
                            <DataCleaningPanel datasets={datasets} setDatasets={setDatasets} onDataCleaned={handleDataCleaned} />
                          </div>
                        </div>
                        <StepNav onBack={goBack} onNext={goNext} nextLabel="Next: Train Model" />
                      </div>
                    </StepShell>
                  )}
                  {/* STEP 3 */}
                  {currentStep === 3 && (
                    <StepShell stepId={3}>
                      <div>
                        <div className="flex items-center justify-between mb-5">
                          <div>
                            <h2 className="text-base font-bold text-white">Step 3 — Train Your Model</h2>
                            <p className="text-sm text-slate-400 mt-1">Drag a dataset into the workspace, then click <strong className="text-slate-300">Train</strong>.</p>
                          </div>
                          <div className="flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-xl">
                            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                            <p className="text-xs text-violet-300 font-semibold">Drag dataset → click Train</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-5">
                          <div className="col-span-1">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Your Datasets</p>
                            <DatasetPanel datasets={datasets} setDatasets={setDatasets} onPreview={setPreviewDataset} />
                          </div>
                          <div className="col-span-2">
                            <Workspace {...workspaceProps} />
                          </div>
                          <div className="col-span-1">
                            <TrainingProgress progress={trainingProgress} isTraining={isTraining} />
                          </div>
                        </div>
                        <StepNav onBack={goBack} canBack={true} />
                      </div>
                    </StepShell>
                  )}
                </AnimatePresence>
              </div>
            )}
            {!['dashboard', 'results', 'models'].includes(activeTab) && (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="w-16 h-16 bg-[#141E35] border border-[#1E2D50] rounded-3xl flex items-center justify-center mb-4">
                  <BarChart3 className="w-7 h-7 text-slate-600" />
                </div>
                <h2 className="text-lg font-bold text-white capitalize">{activeTab}</h2>
                <p className="text-sm text-slate-500 mt-2 max-w-xs">This section is available after you train your first model.</p>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-bold text-sm"
                >
                  <ArrowLeft className="w-4 h-4" /> Go to Dashboard
                </button>
              </div>
            )}
          </main>
        </div>
        <AnimatePresence>
          {previewDataset && (
            <DataPreviewModal dataset={previewDataset} onClose={() => setPreviewDataset(null)} />
          )}
        </AnimatePresence>
      </div>
    </DragDropContext>
  )
}
export default App
