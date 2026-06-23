import React from 'react'
import { motion } from 'framer-motion'
import { Brain, Zap, Settings, User, Bell, Sun, Keyboard } from 'lucide-react'
const Header = () => {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 bg-[#060914]/90 backdrop-blur-xl border-b border-[#1A2440]/80"
    >
      {/* Subtle top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
      <div className="flex items-center justify-between px-6 py-2.5">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="p-2 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl shadow-lg shadow-violet-500/25">
              <Brain className="w-4 h-4 text-white" />
            </div>
            {/* Online indicator */}
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full border-2 border-[#060914]" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight leading-tight">AI Trainer</h1>
            <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-[0.2em] leading-tight">Low-Code Platform</p>
          </div>
        </div>
        {/* Navigation — all violet to match brand */}
        <nav className="flex items-center space-x-1">
          <button className="flex items-center space-x-2 px-4 py-1.5 rounded-lg text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 transition-all duration-200">
            <Zap className="w-3.5 h-3.5" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Quick Start</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#141E35] transition-all duration-200">
            <Settings className="w-3.5 h-3.5" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Settings</span>
          </button>
        </nav>
        {/* Actions */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 border-r border-[#1A2440] pr-4">
            <button className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-[#141E35] rounded-lg transition-all">
              <Keyboard className="w-3.5 h-3.5" />
            </button>
            <button className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-[#141E35] rounded-lg transition-all">
              <Sun className="w-3.5 h-3.5" />
            </button>
            <div className="relative">
              <button className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-[#141E35] rounded-lg transition-all">
                <Bell className="w-3.5 h-3.5" />
              </button>
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-violet-400 rounded-full" />
            </div>
          </div>
          <button className="flex items-center space-x-2 px-4 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-xs font-bold hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-[1.03]">
            <User className="w-3.5 h-3.5" />
            <span>Profile</span>
          </button>
        </div>
      </div>
    </motion.header>
  )
}
export default Header
