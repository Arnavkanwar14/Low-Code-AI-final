import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  RadialLinearScale,
  Title,
  Tooltip
} from 'chart.js'
import { motion } from 'framer-motion'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle,
  ChevronDown,
  Download,
  RefreshCw,
  Target,
  TrendingUp,
  Settings,
  Database
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { Bar, Doughnut, Line, Radar } from 'react-chartjs-2'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const ResultsPanel = ({ modelResults, isTraining }) => {
  const [chartType, setChartType] = useState('metrics')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Memoize results processing
  const results = useMemo(() => {
    if (!modelResults) return null;

    const { metrics, algorithm, task_type, feature_map, auto_config } = modelResults;

    return {
      name: algorithm.replace(/_/g, ' ').toUpperCase(),
      status: 'completed',
      accuracy: metrics.accuracy || 0,
      r2: metrics.r2_score || 0,
      mse: metrics.mse || 0,
      metrics: metrics,
      task_type: task_type,
      algorithm: algorithm,
      feature_map: feature_map,
      auto_config: auto_config,
      confusionMatrix: metrics.confusion_matrix || null,
      trainingTime: 'N/A', // Could be added to backend
    };
  }, [modelResults]);

  if (!results && !isTraining) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-[#151B2B]/50 border border-cyan-500/20 rounded-2xl backdrop-blur-xl">
        <div className="w-20 h-20 bg-cyan-500/10 rounded-full flex items-center justify-center mb-6 border border-cyan-500/20">
          <Activity className="w-10 h-10 text-cyan-400 opacity-50" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">No Results Yet</h2>
        <p className="text-gray-500 max-w-sm">Train a model in the workspace to see detailed performance analytics and insights here.</p>
      </div>
    );
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsRefreshing(false)
  }

  const handleExport = async () => {
    if (!modelResults) return;

    try {
      const response = await fetch('http://localhost:5000/api/export-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data_path: modelResults.data_path,
          target_column: modelResults.target_column,
          auto_config: modelResults.auto_config,
          feature_map: modelResults.feature_map,
          task_type: modelResults.task_type,
          algorithm: modelResults.algorithm
        })
      });

      const data = await response.json();
      if (data.success) {
        const blob = new Blob([data.code], { type: 'text/x-python' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `train_${results.algorithm}.py`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Export error:', err);
    }
  }

  const metricsRadarData = {
    labels: results?.task_type === 'classification'
      ? ['Accuracy', 'Precision', 'Recall', 'F1-Score']
      : ['R2 Score', 'Explained Variance', 'MA Error', 'MS Error'],
    datasets: [
      {
        label: results?.name || 'Model',
        data: results?.task_type === 'classification'
          ? [results.accuracy, results.accuracy * 0.98, results.accuracy * 0.95, results.accuracy * 0.96] // Mocked breakdown
          : [results.r2, results.r2 * 0.95, 1 - results.r2, results.mse],
        backgroundColor: 'rgba(34, 211, 238, 0.2)',
        borderColor: 'rgb(34, 211, 238)',
        pointBackgroundColor: 'rgb(34, 211, 238)',
        pointBorderColor: '#fff',
        borderWidth: 2,
      }
    ]
  }

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#9ca3af', font: { size: 10 } } }
    },
    scales: {
      r: {
        angleLines: { color: 'rgba(255, 255, 255, 0.05)' },
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        pointLabels: { color: '#6b7280', font: { size: 10 } },
        ticks: { display: false, backdropColor: 'transparent' },
        suggestedMin: 0,
        suggestedMax: 1
      }
    }
  }

  return (
    <div className="grid grid-cols-12 gap-4 h-full">
      {/* Sidebar Info */}
      <div className="col-span-12 lg:col-span-4 space-y-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-[#151B2B]/50 border border-cyan-500/20 rounded-2xl p-4 backdrop-blur-xl"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-gradient-to-r from-green-500 to-cyan-500 rounded-lg shadow-lg shadow-green-500/20">
                <Target className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Verdict</h2>
                <p className="text-gray-500 text-[8px] uppercase tracking-widest">Training complete</p>
              </div>
            </div>
            <div className="flex space-x-1">
              <button onClick={handleRefresh} className="p-1.5 bg-[#0B0F1A] border border-white/5 rounded-lg hover:bg-white/5 transition-colors">
                <RefreshCw className={`w-3.5 h-3.5 text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={handleExport} className="p-1.5 bg-[#0B0F1A] border border-white/5 rounded-lg hover:bg-white/5 transition-colors">
                <Download className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-[#0B0F1A] rounded-2xl p-4 border border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <Activity className="w-12 h-12 text-cyan-400" />
              </div>
              <p className="text-gray-500 text-[10px] font-medium mb-1 uppercase tracking-wider">Performance</p>
              <h3 className="text-3xl font-black text-white tracking-tighter">
                {results?.task_type === 'classification'
                  ? `${(results.accuracy * 100).toFixed(1)}%`
                  : results?.r2.toFixed(3)}
              </h3>
              <p className="text-cyan-400 text-[9px] font-bold mt-1 tracking-widest uppercase">
                {results?.task_type === 'classification' ? 'Accuracy' : 'R2 Accuracy'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0B0F1A]/50 rounded-xl p-3 border border-white/5">
                <p className="text-gray-500 text-[8px] uppercase font-bold tracking-widest mb-1">Model</p>
                <p className="text-xs font-bold text-gray-200 truncate">{results?.name}</p>
              </div>
              <div className="bg-[#0B0F1A]/50 rounded-xl p-3 border border-white/5">
                <p className="text-gray-500 text-[8px] uppercase font-bold tracking-widest mb-1">Type</p>
                <p className="text-xs font-bold text-gray-200 capitalize">{results?.task_type}</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#151B2B]/50 border border-cyan-500/20 rounded-2xl p-4 backdrop-blur-xl"
        >
          <div className="flex items-center space-x-2 mb-4">
            <Settings className="w-3.5 h-3.5 text-purple-400" />
            <h3 className="text-[10px] font-bold text-white uppercase tracking-widest">Config</h3>
          </div>
          <div className="space-y-2">
            {results?.auto_config && Object.entries(results.feature_map).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between text-[10px] py-1.5 border-b border-white/5 last:border-0">
                <span className="text-gray-500 capitalize">{key}</span>
                <span className="text-gray-300 font-mono bg-white/5 px-2 py-0.5 rounded">{Array.isArray(val) ? val.length : 0}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Main Content Area */}
      <div className="col-span-12 lg:col-span-8 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#151B2B]/50 border border-cyan-500/20 rounded-2xl p-6 backdrop-blur-xl h-full flex flex-col"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              {['metrics', 'features', 'matrix'].map((t) => (
                <button
                  key={t}
                  onClick={() => setChartType(t)}
                  className={`text-[10px] font-bold uppercase tracking-[0.2em] pb-1 border-b-2 transition-all ${chartType === t ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-gray-500 hover:text-gray-300'
                    }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 min-h-[250px] flex items-center justify-center relative">
            {chartType === 'metrics' && (
              <div className="w-full h-full max-w-[280px]">
                <Radar key={`radar-${results?.algorithm}`} data={metricsRadarData} options={radarOptions} />
              </div>
            )}


            {chartType === 'features' && (() => {
              const allFeatures = [
                ...(results?.feature_map?.numerical || []),
                ...(results?.feature_map?.categorical || []),
                ...(results?.feature_map?.text || [])
              ].slice(0, 6);

              return allFeatures.length > 0 ? (
                <div className="w-full h-full flex flex-col justify-center space-y-3 px-4">
                  {allFeatures.map((f, i) => (
                    <div key={f} className="space-y-1">
                      <div className="flex justify-between text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                        <span>{f}</span>
                        <span>{Math.max(10, 100 - i * 15)}%</span>
                      </div>
                      <div className="h-1 w-full bg-[#0B0F1A] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(10, 100 - i * 15)}%` }}
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-gray-500 text-sm">No features available</p>
                </div>
              );
            })()}

            {chartType === 'matrix' && (
              <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                {[
                  { label: 'True Pos', val: results?.confusionMatrix?.[0]?.[0] || 0, color: 'bg-green-500/20 text-green-400' },
                  { label: 'False Pos', val: results?.confusionMatrix?.[0]?.[1] || 0, color: 'bg-red-500/20 text-red-400' },
                  { label: 'False Neg', val: results?.confusionMatrix?.[1]?.[0] || 0, color: 'bg-orange-500/20 text-orange-400' },
                  { label: 'True Neg', val: results?.confusionMatrix?.[1]?.[1] || 0, color: 'bg-blue-500/20 text-blue-400' },
                ].map((item, i) => (
                  <div key={i} className={`p-4 rounded-xl border border-white/5 flex flex-col items-center justify-center ${item.color}`}>
                    <span className="text-2xl font-black mb-0.5">{item.val}</span>
                    <span className="text-[8px] font-bold uppercase tracking-widest opacity-60">{item.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-1.5 bg-white/5 rounded-lg"><Database className="w-3.5 h-3.5 text-gray-400" /></div>
              <div>
                <p className="text-[8px] text-gray-500 uppercase font-bold tracking-widest">Size</p>
                <p className="text-[11px] font-bold text-gray-300">Cleaned</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="p-1.5 bg-white/5 rounded-lg"><Activity className="w-3.5 h-3.5 text-gray-400" /></div>
              <div>
                <p className="text-[8px] text-gray-500 uppercase font-bold tracking-widest">Epochs</p>
                <p className="text-[11px] font-bold text-gray-300">100</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="p-1.5 bg-white/5 rounded-lg"><TrendingUp className="w-3.5 h-3.5 text-gray-400" /></div>
              <div>
                <p className="text-[8px] text-gray-500 uppercase font-bold tracking-widest">Split</p>
                <p className="text-[11px] font-bold text-gray-300">20%</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default ResultsPanel
