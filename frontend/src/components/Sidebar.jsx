import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FolderOpen, BarChart3, Play, Share2, Plus, X, Download,
  LayoutDashboard, Box, TrendingUp, Database, Cpu,
} from 'lucide-react'
const Sidebar = ({
  projects = [],
  currentProjectId,
  onCreateProject,
  onDeleteProject,
  onSelectProject,
  onImportData,
  activeTab,
  setActiveTab
}) => {
  const [showImportModal, setShowImportModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [selectedFiles, setSelectedFiles] = useState([])
  const fileInputRef = useRef(null)
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard',  key: 'dashboard',  desc: 'Overview & datasets' },
    { icon: FolderOpen,      label: 'Projects',   key: 'projects',   desc: 'Manage projects' },
    { icon: BarChart3,       label: 'Analytics',  key: 'analytics',  desc: 'Data insights' },
    { icon: Play,            label: 'Training',   key: 'training',   desc: 'Run model training' },
    { icon: TrendingUp,      label: 'Results',    key: 'results',    desc: 'View metrics' },
    { icon: Box,             label: 'Models',     key: 'models',     desc: 'Deploy & export' },
  ]
  const handleAddProject = () => {
    if (newProjectName.trim()) {
      onCreateProject(newProjectName)
      setNewProjectName('')
    }
  }
  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files)
    const validFiles = files.map(file => ({
      file,
      name: file.name,
      size: (file.size / 1024).toFixed(1) + ' KB',
      type: file.type.startsWith('image/') ? 'image' : (file.type === 'text/csv' ? 'tabular' : 'text'),
      id: Date.now() + Math.random()
    }))
    setSelectedFiles(prev => [...prev, ...validFiles])
  }
  const processFiles = () => {
    if (selectedFiles.length === 0) return
    if (onImportData) onImportData(selectedFiles)
    setShowImportModal(false)
    setSelectedFiles([])
  }
  return (
    <>
      <aside className="w-60 bg-[#07091A] border-r border-[#141E35] flex flex-col h-full overflow-hidden">
        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-6">
          {/* Brand mark in sidebar */}
          <div className="flex items-center space-x-3 px-1 pt-1">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20 flex-shrink-0">
              <Cpu className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-white tracking-tight">AI Trainer</p>
              <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-widest">Low-Code</p>
            </div>
          </div>
          {/* ── Navigation ── */}
          <div>
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.18em] px-2 mb-2">Navigation</p>
            <nav className="space-y-0.5">
              {menuItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  title={item.desc}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
                    activeTab === item.key
                      ? 'bg-gradient-to-r from-violet-600/90 to-indigo-600/90 text-white shadow-lg shadow-violet-500/20'
                      : 'text-slate-400 hover:bg-[#141E35] hover:text-slate-200'
                  }`}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
          {/* ── Projects ── */}
          <div>
            <div className="flex items-center justify-between mb-2 px-2">
              <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.18em]">Projects</p>
              <button
                onClick={() => setNewProjectName('New Project ' + (projects.length + 1))}
                className="text-slate-500 hover:text-violet-400 transition-colors"
                title="Add project"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1">
              {projects.length === 0 && (
                <p className="text-[11px] text-slate-600 italic px-3 py-2">No projects yet</p>
              )}
              {projects.map(project => (
                <div
                  key={project.id}
                  onClick={() => onSelectProject(project.id)}
                  className={`group flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer text-[12px] transition-all ${
                    currentProjectId === project.id
                      ? 'bg-violet-500/10 text-violet-300 border border-violet-500/20'
                      : 'text-slate-400 hover:bg-[#141E35] hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <FolderOpen className={`w-3.5 h-3.5 flex-shrink-0 ${currentProjectId === project.id ? 'text-violet-400' : 'text-slate-600'}`} />
                    <span className="truncate">{project.name}</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteProject(project.id) }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/15 rounded-lg transition-all"
                    title="Delete project"
                  >
                    <X className="w-3 h-3 text-red-400" />
                  </button>
                </div>
              ))}
              {/* New project input */}
              <div className="mt-2 px-1">
                <div className="flex items-center space-x-2 bg-[#0E1430] border border-[#1A2440] rounded-xl px-3 py-2 focus-within:border-violet-500/40 transition-colors">
                  <input
                    type="text"
                    placeholder="New project name…"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddProject()}
                    className="bg-transparent text-[11px] text-white placeholder-slate-600 focus:outline-none flex-1"
                  />
                  <button
                    onClick={handleAddProject}
                    disabled={!newProjectName.trim()}
                    className="bg-violet-600 disabled:opacity-30 text-white p-0.5 rounded-lg transition-all hover:bg-violet-500"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          {/* ── Actions ── */}
          <div className="mt-auto">
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.18em] px-2 mb-2">Actions</p>
            <div className="space-y-2">
              <button
                onClick={() => setNewProjectName('New Project ' + (projects.length + 1))}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-[12px] font-bold shadow-lg shadow-violet-500/20 hover:shadow-violet-500/35 hover:from-violet-500 hover:to-indigo-500 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Project</span>
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="w-full flex items-center space-x-2 px-3 py-2.5 bg-[#0E1430] border border-[#1A2440] text-slate-300 rounded-xl text-[12px] font-medium hover:bg-[#141E35] hover:text-white hover:border-violet-500/20 transition-all"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Import Data</span>
              </button>
              <button className="w-full flex items-center space-x-2 px-3 py-2.5 bg-[#0E1430] border border-[#1A2440] text-slate-300 rounded-xl text-[12px] font-medium hover:bg-[#141E35] hover:text-white hover:border-violet-500/20 transition-all">
                <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Share Model</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
      {/* ── Import Modal ── */}
      <AnimatePresence>
        {showImportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0D1525] border border-[#1E2D50] rounded-2xl p-6 w-full max-w-lg shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <div className="p-1.5 bg-cyan-500/10 rounded-lg">
                    <Download className="text-cyan-400 w-4 h-4" />
                  </div>
                  Import Dataset
                </h2>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="p-1.5 text-slate-500 hover:text-white hover:bg-[#141E35] rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
              <div
                onClick={() => fileInputRef.current.click()}
                className="border-2 border-dashed border-[#1A2E50] rounded-2xl p-10 text-center cursor-pointer hover:border-cyan-500/35 hover:bg-cyan-500/5 transition-all duration-200"
              >
                <div className="w-12 h-12 bg-cyan-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Download className="w-6 h-6 text-cyan-400 opacity-70" />
                </div>
                <p className="text-slate-200 font-semibold">Click or drag files here</p>
                <p className="text-slate-500 text-xs mt-1.5">Supports CSV, JSON, Excel, and image files</p>
                <p className="text-slate-600 text-xs mt-1">Max size: 100 MB per file</p>
              </div>
              {selectedFiles.length > 0 && (
                <div className="mt-4 space-y-2 max-h-36 overflow-y-auto custom-scrollbar">
                  {selectedFiles.map(file => (
                    <div key={file.id} className="flex items-center justify-between p-2.5 bg-[#141E35] border border-[#1E2D50] rounded-xl text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <Database className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                        <span className="text-slate-300 truncate font-medium">{file.name}</span>
                        <span className="text-slate-500 flex-shrink-0">{file.size}</span>
                      </div>
                      <button onClick={() => setSelectedFiles(prev => prev.filter(f => f.id !== file.id))}>
                        <X className="w-3.5 h-3.5 text-slate-500 hover:text-red-400 transition-colors" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => { setShowImportModal(false); setSelectedFiles([]) }}
                  className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={processFiles}
                  disabled={selectedFiles.length === 0}
                  className="px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-bold text-sm disabled:opacity-40 shadow-lg shadow-violet-500/20 hover:from-violet-500 hover:to-indigo-500 transition-all"
                >
                  Import {selectedFiles.length > 0 ? `${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}` : 'Files'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
export default Sidebar
