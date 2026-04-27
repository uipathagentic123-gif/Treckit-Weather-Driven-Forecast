/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Cloud, 
  Thermometer, 
  Droplets, 
  Wind, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Factory, 
  AlertCircle,
  MapPin,
  RefreshCw,
  BarChart3,
  PackageCheck,
  Layers,
  Sparkles,
  Download,
  FileText,
  Table as TableIcon,
  Boxes
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fetchWeather, getCoordsFromCity } from './services/weatherService';
import { analyzeSupplyChain } from './services/geminiService';
import { SupplyAnalysis, WeatherData } from './types';
import { COMPANY_ALIAS, OBFUSCATED_PRODUCTS } from './constants';
import { cn } from './lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';

export default function App() {
  const [city, setCity] = useState('London');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<SupplyAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'immediate' | 'manufacturing' | 'materials'>('immediate');

  const performAnalysis = async (searchCity: string) => {
    setLoading(true);
    setError(null);
    try {
      const coords = await getCoordsFromCity(searchCity);
      const weather = await fetchWeather(coords.lat, coords.lon);
      weather.locationName = coords.name;
      const result = await analyzeSupplyChain(weather);
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    performAnalysis('London');
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (city.trim()) {
      performAnalysis(city);
    }
  };

  const exportToPDF = () => {
    if (!analysis) return;
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229); // indigo-600
    doc.text(`${COMPANY_ALIAS} Strategic Report`, 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Region: ${analysis.currentWeather.locationName}`, 14, 30);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 35);
    
    // Weather
    doc.setFontSize(14);
    doc.setTextColor(30);
    doc.text('Current Weather Context', 14, 45);
    autoTable(doc, {
      startY: 50,
      head: [['Temperature', 'Condition', 'Humidity', 'Precipitation', 'Wind Speed']],
      body: [[
        `${analysis.currentWeather.temperature.toFixed(1)}°C`,
        analysis.currentWeather.condition,
        `${analysis.currentWeather.humidity}%`,
        `${analysis.currentWeather.precipitation}mm`,
        `${analysis.currentWeather.windSpeed}km/h`
      ]],
    });

    // Demand Distribution (The "Calculations")
    doc.setFontSize(14);
    doc.text('Demand Distribution Analysis', 14, (doc as any).lastAutoTable.finalY + 15);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Product', 'Category', 'Recommended Action', 'Demand Index (Calculated)']],
      body: analysis.productRecommendations.map(p => [
        p.productName,
        p.category,
        p.currentAction,
        p.currentAction === 'Increase Supply' ? '100 (Peak)' : p.currentAction === 'Maintain Supply' ? '50 (Normal)' : '20 (Low)'
      ]),
    });

    // Manufacturing Forecast
    doc.setFontSize(14);
    doc.text('Next Quarter Manufacturing Forecast', 14, (doc as any).lastAutoTable.finalY + 15);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Product', 'Forecast Action', 'Confidence level', 'Strategic Note']],
      body: analysis.manufacturingForecast.map(m => [
        m.productName,
        m.forecastAction,
        `${(m.confidence * 100).toFixed(0)}%`,
        m.strategicNote
      ]),
    });

    // Material Strategy
    doc.addPage();
    doc.setFontSize(14);
    doc.text('Material & Packaging Strategy', 14, 20);
    autoTable(doc, {
      startY: 25,
      head: [['Product', 'Raw Material', 'Packaging', 'Sales Impact Strategy']],
      body: analysis.materialStrategy.map(ms => [
        ms.productName,
        ms.rawMaterial,
        ms.packagingMaterial,
        ms.salesImpactNote
      ]),
    });

    doc.save(`${COMPANY_ALIAS}_Strategic_Report_${analysis.currentWeather.locationName.replace(/\s+/g, '_')}.pdf`);
  };

  const exportToExcel = () => {
    if (!analysis) return;
    
    let csvContent = "Type,Product,Category,Value/Action,Detail/Note\n";
    
    // Demand
    analysis.productRecommendations.forEach(p => {
      const val = p.currentAction === 'Increase Supply' ? '100' : p.currentAction === 'Maintain Supply' ? '50' : '20';
      csvContent += `Demand,"${p.productName}","${p.category}","${p.currentAction}","${val} Index"\n`;
    });
    
    // Manufacturing
    analysis.manufacturingForecast.forEach(m => {
      const product = OBFUSCATED_PRODUCTS.find(p => p.name === m.productName);
      csvContent += `Manufacturing,"${m.productName}","${product?.category || 'N/A'}","${m.forecastAction}","${m.strategicNote.replace(/"/g, '""')}"\n`;
    });
    
    // Materials
    analysis.materialStrategy.forEach(ms => {
      const product = OBFUSCATED_PRODUCTS.find(p => p.name === ms.productName);
      csvContent += `Materials,"${ms.productName}","${product?.category || 'N/A'}","${ms.rawMaterial}","${ms.packagingMaterial} - ${ms.salesImpactNote.replace(/"/g, '""')}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${COMPANY_ALIAS}_Data_${analysis.currentWeather.locationName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'Increase Supply':
      case 'Scale Up':
        return <TrendingUp className="w-5 h-5 text-emerald-500" />;
      case 'Decrease Supply':
      case 'Scale Down':
        return <TrendingDown className="w-5 h-5 text-rose-500" />;
      default:
        return <Minus className="w-5 h-5 text-slate-400" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'Increase Supply':
      case 'Scale Up':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Decrease Supply':
      case 'Scale Down':
        return 'bg-rose-50 text-rose-700 border-rose-100';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const chartData = analysis?.productRecommendations.map(p => ({
    name: p.productName,
    value: p.currentAction === 'Increase Supply' ? 100 : p.currentAction === 'Maintain Supply' ? 50 : 20,
    color: p.currentAction === 'Increase Supply' ? '#10b981' : p.currentAction === 'Maintain Supply' ? '#94a3b8' : '#f43f5e'
  })) || [];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-indigo-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-bottom border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100 ring-4 ring-indigo-50 transition-transform hover:scale-105 duration-300">
              <Boxes className="w-6 h-6 text-white" />
            </div>
            <span className="font-extrabold text-2xl tracking-tighter text-slate-800 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">{COMPANY_ALIAS}</span>
          </div>
          
          <form onSubmit={handleSearch} className="relative w-full max-w-md hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Search region..."
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
            />
          </form>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
              <button
                onClick={exportToPDF}
                disabled={!analysis || loading}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-white hover:text-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                title="Download PDF Report"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Report</span>
                <Download className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <button
                onClick={exportToExcel}
                disabled={!analysis || loading}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-white hover:text-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                title="Download Excel Data"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Excel</span>
                <Download className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>

            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">System Status</span>
              <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Live Intelligence
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mobile Search */}
        <form onSubmit={handleSearch} className="relative w-full mb-6 sm:hidden">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Search region..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
          />
        </form>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-700"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Weather & Summary */}
          <div className="lg:col-span-4 space-y-8">
            {/* Weather Card */}
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500" />
              
              <div className="relative">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2 text-slate-500">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm font-medium">{analysis?.currentWeather.locationName || 'Loading...'}</span>
                  </div>
                  {loading && <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin" />}
                </div>

                <div className="flex items-end gap-4 mb-8">
                  <span className="text-6xl font-bold tracking-tighter text-slate-800">
                    {analysis?.currentWeather.temperature.toFixed(1)}°
                  </span>
                  <div className="mb-2">
                    <p className="text-lg font-semibold text-slate-700 leading-none">{analysis?.currentWeather.condition}</p>
                    <p className="text-sm text-slate-400">Current Conditions</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-slate-50 rounded-2xl">
                    <Droplets className="w-4 h-4 text-blue-500 mb-1" />
                    <p className="text-xs text-slate-400 font-medium">Humidity</p>
                    <p className="text-sm font-bold text-slate-700">{analysis?.currentWeather.humidity}%</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl">
                    <Cloud className="w-4 h-4 text-indigo-400 mb-1" />
                    <p className="text-xs text-slate-400 font-medium">Precip.</p>
                    <p className="text-sm font-bold text-slate-700">{analysis?.currentWeather.precipitation}mm</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl">
                    <Wind className="w-4 h-4 text-emerald-400 mb-1" />
                    <p className="text-xs text-slate-400 font-medium">Wind</p>
                    <p className="text-sm font-bold text-slate-700">{analysis?.currentWeather.windSpeed}km/h</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Seasonal Outlook */}
            <section className="bg-indigo-900 rounded-3xl p-6 text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
              <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/10 rounded-full -mb-8 -mr-8" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-300 mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Strategic Outlook
              </h3>
              <p className="text-lg font-medium leading-relaxed opacity-90">
                {analysis?.seasonalOutlook || 'Gathering regional intelligence...'}
              </p>
            </section>

            {/* Demand Distribution Chart */}
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6">Demand Distribution</h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" hide />
                    <Tooltip 
                      cursor={{fill: '#f1f5f9'}}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-center text-slate-400 mt-4 uppercase tracking-tighter">Relative Demand Index by Product</p>
            </section>

            {/* Methodology Note */}
            <section className="bg-slate-50 rounded-3xl p-6 border border-slate-200/50">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                <AlertCircle className="w-3 h-3" />
                Intelligence Methodology
              </h3>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-1 h-auto bg-indigo-500 rounded-full shrink-0" />
                  <p className="text-xs text-slate-500 leading-relaxed">
                    <strong className="text-slate-700">Strategic Advisory:</strong> This system provides <span className="italic">recommendations</span> based on external demand drivers (weather, seasonality, regional health trends).
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="w-1 h-auto bg-slate-300 rounded-full shrink-0" />
                  <p className="text-xs text-slate-500 leading-relaxed">
                    <strong className="text-slate-700">Inventory Blindness:</strong> The AI does not have access to your internal ERP/WMS. "Decrease Supply" suggests reducing regional allocation relative to your standard baseline to prevent overstock.
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Recommendations & Forecast */}
          <div className="lg:col-span-8 space-y-8">
            {/* Tab Switcher */}
            <div className="flex p-1 bg-slate-100 rounded-2xl w-fit overflow-x-auto max-w-full no-scrollbar">
              <button
                onClick={() => setActiveTab('immediate')}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shrink-0",
                  activeTab === 'immediate' 
                    ? "bg-white text-indigo-600 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                <PackageCheck className="w-4 h-4" />
                Immediate Strategy
              </button>
              <button
                onClick={() => setActiveTab('manufacturing')}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shrink-0",
                  activeTab === 'manufacturing' 
                    ? "bg-white text-indigo-600 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                <Factory className="w-4 h-4" />
                Next Quarter Forecast
              </button>
              <button
                onClick={() => setActiveTab('materials')}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shrink-0",
                  activeTab === 'materials' 
                    ? "bg-white text-indigo-600 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                <Layers className="w-4 h-4" />
                Material Strategy
              </button>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'immediate' ? (
                <motion.section
                  key="immediate-tab"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <PackageCheck className="w-6 h-6 text-indigo-600" />
                      Immediate Supply Strategy
                    </h2>
                    <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Real-time Analysis
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analysis?.productRecommendations.map((rec, idx) => (
                      <motion.div
                        key={rec.productName}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow group"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{rec.productName}</h4>
                            <p className="text-xs text-slate-400 font-medium">{rec.category}</p>
                          </div>
                          <div className={cn("px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5", getActionColor(rec.currentAction))}>
                            {getActionIcon(rec.currentAction)}
                            {rec.currentAction}
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed italic">
                          "{rec.reason}"
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </motion.section>
              ) : activeTab === 'manufacturing' ? (
                <motion.section
                  key="manufacturing-tab"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100"
                >
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Factory className="w-6 h-6 text-indigo-600" />
                        Next Quarter Manufacturing Forecast
                      </h2>
                      <p className="text-sm text-slate-400 mt-1">Strategic production planning for the upcoming 3-month cycle</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Forecast Period</span>
                      <span className="text-sm font-bold text-indigo-600">Next Quarter 2026</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left border-b border-slate-100">
                          <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Product Line</th>
                          <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Action</th>
                          <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Confidence</th>
                          <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Strategic Note</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {analysis?.manufacturingForecast.map((item) => (
                          <tr key={item.productName} className="group hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 font-bold text-slate-700">{item.productName}</td>
                            <td className="py-4">
                              <div className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase", getActionColor(item.forecastAction))}>
                                {item.forecastAction}
                              </div>
                            </td>
                            <td className="py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-indigo-500 rounded-full" 
                                    style={{ width: `${item.confidence * 100}%` }} 
                                  />
                                </div>
                                <span className="text-xs font-bold text-slate-500">{(item.confidence * 100).toFixed(0)}%</span>
                              </div>
                            </td>
                            <td className="py-4 text-sm text-slate-500 leading-relaxed max-w-xs">
                              {item.strategicNote}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.section>
              ) : (
                <motion.section
                  key="materials-tab"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <Layers className="w-6 h-6 text-indigo-600" />
                      Material & Packaging Strategy
                    </h2>
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full text-[10px] font-bold uppercase tracking-widest">
                      Sales Optimization
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analysis?.materialStrategy.map((item, idx) => (
                      <motion.div
                        key={item.productName}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
                        
                        <div className="relative">
                          <div className="flex items-center justify-between mb-6">
                            <div>
                              <h4 className="text-lg font-bold text-slate-800">{item.productName}</h4>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Strategic Materials</p>
                            </div>
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                              <PackageCheck className="w-5 h-5 text-indigo-600" />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="p-1.5 bg-white rounded-lg shadow-sm">
                                  <Droplets className="w-3 h-3 text-blue-500" />
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Raw Materials</span>
                              </div>
                              <p className="text-sm font-bold text-slate-700 leading-tight">{item.rawMaterial}</p>
                            </div>
                            
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="p-1.5 bg-white rounded-lg shadow-sm">
                                  <PackageCheck className="w-3 h-3 text-indigo-500" />
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Packaging</span>
                              </div>
                              <p className="text-sm font-bold text-slate-700 leading-tight">{item.packagingMaterial}</p>
                            </div>
                          </div>

                          <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                            <div className="flex items-start gap-3">
                              <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-1">Sales Impact</p>
                                <p className="text-xs text-slate-600 leading-relaxed italic">
                                  {item.salesImpactNote}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-slate-200 mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-60 grayscale hover:grayscale-0 transition-all">
            <Boxes className="w-5 h-5 text-indigo-600" />
            <span className="text-xs font-bold tracking-widest uppercase text-slate-600">{COMPANY_ALIAS} Systems</span>
          </div>
          <p className="text-xs text-slate-400 max-w-md text-center md:text-right leading-relaxed">
            This intelligence dashboard provides predictive supply chain modeling based on meteorological data. 
            All product names are proprietary aliases for internal strategic use only.
          </p>
        </div>
      </footer>

      {/* Loading Overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="text-center">
              <div className="relative w-24 h-24 mx-auto mb-6">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border-4 border-indigo-100 border-t-indigo-600 rounded-full"
                />
                <Boxes className="absolute inset-0 m-auto w-10 h-10 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Analyzing Regional Intelligence</h2>
              <p className="text-slate-400 text-sm animate-pulse">Correlating weather patterns with product demand...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
