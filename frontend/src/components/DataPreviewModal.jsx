import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Download, Filter, FileText, Database, Layers } from 'lucide-react';

const DataPreviewModal = ({ dataset, onClose }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!dataset) return;
      setLoading(true);
      setError(null);
      
        try {
          if (dataset.file) {
            // If it's a locally uploaded file not yet sent to backend
            const text = await dataset.file.text();
            if (dataset.file.type === 'text/csv' || dataset.file.name.endsWith('.csv')) {
              const rows = text.split('\n').filter(row => row.trim());
              const headers = rows[0].split(',');
              const previewData = rows.slice(1, 51).map(row => {
                const values = row.split(',');
                return headers.reduce((obj, header, i) => {
                  obj[header.trim()] = values[i]?.trim();
                  return obj;
                }, {});
              });
              setData(previewData);
            } else if (dataset.file.type === 'application/json' || dataset.file.name.endsWith('.json')) {
              const jsonData = JSON.parse(text);
              setData(Array.isArray(jsonData) ? jsonData.slice(0, 50) : [jsonData]);
            }
          } else {
            // Fetch from backend using analyze-data endpoint
            const formData = new FormData();
            formData.append('filename', dataset.name + (dataset.name.endsWith('.csv') ? '' : '.csv'));
            
            const response = await fetch('http://localhost:5000/api/analyze-data', {
              method: 'POST',
              body: formData
            });
            const result = await response.json();
            if (result.success) {
              setData(result.preview);
            } else {
              setError(result.error || 'Failed to fetch preview from server');
            }
          }
        } catch (err) {

        setError('Failed to load data preview: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dataset]);

  if (!dataset) return null;

  const filteredData = data.filter(row => 
    Object.values(row).some(val => 
      String(val).toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-[#0F172A] border border-cyan-500/20 rounded-3xl w-full max-w-6xl h-[80vh] flex flex-col overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.1)]"
      >
        {/* Header */}
        <div className="p-6 border-b border-cyan-500/10 flex items-center justify-between bg-gradient-to-r from-cyan-500/5 to-transparent">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20">
              <Database className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">{dataset.name}</h2>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-widest mt-0.5">Dataset Preview • {dataset.size} • {dataset.samples} Samples</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-xl transition-colors group"
          >
            <X className="w-6 h-6 text-gray-500 group-hover:text-white" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-cyan-500/10 flex items-center justify-between gap-4 bg-[#0B0F1A]/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search in data..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#151B2B] border border-gray-700/50 rounded-xl pl-10 pr-4 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 transition-all"
            />
          </div>
          <div className="flex items-center space-x-2">
            <button className="flex items-center space-x-2 px-4 py-2 bg-[#151B2B] border border-gray-700/50 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:border-cyan-500/30 transition-all">
              <Filter className="w-4 h-4" />
              <span>Filter</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 bg-cyan-500 text-white rounded-xl text-xs font-bold hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20">
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto custom-scrollbar p-6">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
              <p className="text-gray-500 text-sm font-medium animate-pulse">Loading data preview...</p>
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
              <div className="p-4 bg-red-500/10 rounded-full">
                <FileText className="w-12 h-12 text-red-400" />
              </div>
              <p className="text-red-400 font-medium">{error}</p>
            </div>
          ) : data.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
              <Layers className="w-16 h-16 text-gray-700 mb-2" />
              <p className="text-gray-500 font-medium text-lg">No data matches your search</p>
            </div>
          ) : (
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden border border-gray-800 rounded-2xl bg-[#0B0F1A]">
                <table className="min-w-full divide-y divide-gray-800">
                  <thead className="bg-[#151B2B]">
                    <tr>
                      {Object.keys(data[0]).map((header) => (
                        <th key={header} className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800 bg-[#0B0F1A]">
                    {filteredData.map((row, i) => (
                      <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                        {Object.values(row).map((val, j) => (
                          <td key={j} className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 font-medium">
                            {String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-cyan-500/10 bg-[#0B0F1A] flex items-center justify-between">
          <p className="text-xs text-gray-600 font-medium">Showing first 50 rows • Use filters for specific analysis</p>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">System Ready</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DataPreviewModal;