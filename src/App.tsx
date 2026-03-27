import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  AreaChart,
  Area
} from 'recharts';
import { 
  Clock, 
  Calendar, 
  Gamepad2, 
  TrendingUp, 
  AlertCircle, 
  ExternalLink, 
  Moon, 
  Sun,
  Zap,
  History,
  Info,
  ChevronDown,
  Filter,
  Layers,
  LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

interface Stream {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  announcedTime: string;
  delayMinutes: number;
}

interface Stats {
  averageDelay: number;
  totalStreamTime: number;
  longestDelay: number;
  shortestDelay: number;
}

interface AppData {
  lastUpdated: string;
  streamer: string;
  streams: Stream[];
  stats: Stats;
}

const PURPLE_THEME = {
  primary: '#8b5cf6', // violet-500
  secondary: '#a78bfa', // violet-400
  accent: '#c4b5fd', // violet-300
  dark: '#4c1d95', // violet-900
};

export default function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'delay' | 'info' | 'visual'>('home');
  const [timeRange, setTimeRange] = useState<string>('all');
  const [heatmapMode, setHeatmapMode] = useState<'binary' | 'intensity'>('intensity');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Stream; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

  useEffect(() => {
    fetch('/public/stats.json')
      .then(res => res.json())
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load stats:", err);
        setLoading(false);
      });
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const chartData = useMemo(() => {
    if (!data) return [];
    
    const now = new Date();
    let cutoffDate = new Date(0);

    if (timeRange === '3d') cutoffDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    else if (timeRange === '7d') cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    else if (timeRange === '14d') cutoffDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    else if (timeRange === '1m') {
      cutoffDate = new Date(now);
      cutoffDate.setMonth(now.getMonth() - 1);
    }
    else if (timeRange === '6m') {
      cutoffDate = new Date(now);
      cutoffDate.setMonth(now.getMonth() - 6);
    }
    else if (timeRange === '1y') {
      cutoffDate = new Date(now);
      cutoffDate.setFullYear(now.getFullYear() - 1);
    }

    // Sort by date ascending for charts
    return [...data.streams]
      .filter(s => new Date(s.date) >= cutoffDate)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(s => {
        const d = new Date(s.date);
        return {
          name: `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`,
          delay: s.delayMinutes,
          duration: s.durationMinutes,
          fullDate: s.date
        };
      });
  }, [data, timeRange]);

  const sortedStreams = useMemo(() => {
    if (!data) return [];
    
    return [...data.streams].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (sortConfig.key === 'date' || sortConfig.key === 'startTime') {
        aValue = new Date(aValue as string).getTime();
        bValue = new Date(bValue as string).getTime();
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  const requestSort = (key: keyof Stream) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Clock className="w-12 h-12 text-violet-500" />
        </motion.div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Failed to load statistics</h1>
          <p className="text-slate-400">Please ensure public/stats.json exists.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'home', label: 'Home', icon: Clock },
    { id: 'delay', label: 'SST Delay', icon: TrendingUp },
    { id: 'visual', label: '3D Tower', icon: Layers },
    { id: 'info', label: 'Stream Info', icon: Info },
  ];

  const timeRangeOptions = [
    { id: '3d', label: '3 Days' },
    { id: '7d', label: '7 Days' },
    { id: '14d', label: '2 Weeks' },
    { id: '1m', label: '1 Month' },
    { id: '6m', label: '6 Months' },
    { id: '1y', label: '1 Year' },
    { id: 'all', label: 'All Time' },
  ];

  const TimeFilter = () => (
    <div className={cn(
      "flex items-center gap-2 border rounded-xl px-3 py-1.5 backdrop-blur-sm",
      isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-200 shadow-sm"
    )}>
      <Filter className={cn("w-3.5 h-3.5", isDarkMode ? "text-slate-400" : "text-slate-500")} />
      <select 
        value={timeRange}
        onChange={(e) => setTimeRange(e.target.value)}
        className={cn(
          "bg-transparent text-sm font-medium outline-none cursor-pointer appearance-none pr-6 relative",
          !isDarkMode && "text-slate-900"
        )}
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23${isDarkMode ? '94a3b8' : '64748b'}'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right center', backgroundSize: '12px' }}
      >
        {timeRangeOptions.map(opt => (
          <option key={opt.id} value={opt.id} className={isDarkMode ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>{opt.label}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-500",
      isDarkMode ? "bg-slate-950 text-slate-100" : "bg-white text-slate-900"
    )}>
      {/* Background Blurs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-violet-600/20 blur-[120px] rounded-full" />
        <div className="absolute top-[60%] -right-[10%] w-[30%] h-[30%] bg-purple-600/10 blur-[100px] rounded-full" />
      </div>

      <nav className={cn(
        "sticky top-0 z-50 backdrop-blur-md border-b px-6 py-4 transition-colors",
        isDarkMode ? "border-white/10" : "bg-white/80 border-slate-200"
      )}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <motion.div
              whileHover={{ rotate: 15 }}
              className="bg-violet-600 p-2 rounded-xl"
            >
              <Clock className="text-white w-6 h-6" />
            </motion.div>
            <h1 className={cn("text-xl font-bold tracking-tight", !isDarkMode && "text-slate-950")}>
              SST <span className="text-violet-500">Clock</span>
            </h1>
          </div>

          {/* Navigation Capsules */}
          <div className={cn(
            "flex p-1 border rounded-full backdrop-blur-sm transition-colors",
            isDarkMode ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-200"
          )}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300",
                  activeTab === tab.id 
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20" 
                    : isDarkMode 
                      ? "text-slate-400 hover:text-white hover:bg-white/5"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleDarkMode}
              className={cn(
                "p-2 rounded-full transition-colors",
                isDarkMode ? "hover:bg-white/10" : "hover:bg-slate-200 text-slate-600"
              )}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <a 
              href={`https://twitch.tv/${data.streamer}`}
              target="_blank"
              rel="noreferrer"
              className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-all"
            >
              Watch Live <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* Hero Section */}
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className={cn(
                  "lg:col-span-2 p-8 rounded-3xl border backdrop-blur-sm relative overflow-hidden group transition-colors",
                  isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-200 shadow-sm"
                )}>
                  <div className="relative z-10">
                    <h2 className="text-sm font-semibold text-violet-500 uppercase tracking-widest mb-2">Current Status</h2>
                    <h3 className={cn("text-4xl font-bold mb-4", !isDarkMode && "text-slate-950")}>Sara's Standard Time</h3>
                    <p className={cn("max-w-md mb-6", isDarkMode ? "text-slate-400" : "text-slate-700")}>
                      Tracking the legendary delay between "I'll be live soon" and the actual start of the stream for <span className={cn("font-medium", isDarkMode ? "text-white" : "text-slate-950")}>@{data.streamer}</span>.
                    </p>
                    <div className="flex flex-wrap gap-4">
                      <div className="px-4 py-2 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-violet-400" />
                        <span className={cn("text-sm font-medium", !isDarkMode && "text-violet-700")}>Avg Delay: {data.stats.averageDelay}m</span>
                      </div>
                      <div className="px-4 py-2 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center gap-2">
                        <History className="w-4 h-4 text-blue-400" />
                        <span className={cn("text-sm font-medium", !isDarkMode && "text-blue-700")}>Last Updated: {formatDate(data.lastUpdated)}</span>
                      </div>
                    </div>
                  </div>
                  <div className={cn(
                    "absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity",
                    !isDarkMode && "text-slate-200"
                  )}>
                    <Clock className="w-48 h-48" />
                  </div>
                </div>

                <div className="p-8 rounded-3xl bg-violet-600 text-white flex flex-col justify-between">
                  <div>
                    <Zap className="w-8 h-8 mb-4" />
                    <h3 className="text-2xl font-bold mb-2">SST Index</h3>
                    <p className="text-violet-100 text-sm">A measure of how "soon" soon actually is.</p>
                  </div>
                  <div className="mt-8">
                    <div className="text-6xl font-black mb-2">{Math.round(data.stats.averageDelay)}m</div>
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(data.stats.averageDelay, 100)}%` }}
                        className="h-full bg-white"
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { label: 'Longest Delay', value: `${data.stats.longestDelay}m`, icon: AlertCircle, color: 'text-red-400' },
                  { label: 'Shortest Delay', value: `${data.stats.shortestDelay}m`, icon: Zap, color: 'text-yellow-400' },
                  { label: 'Total Streamed', value: `${Math.round(data.stats.totalStreamTime / 60)}h`, icon: Clock, color: 'text-blue-400' },
                ].map((stat, i) => (
                  <div 
                    key={stat.label}
                    className={cn(
                      "p-6 rounded-3xl border backdrop-blur-sm transition-colors",
                      isDarkMode ? "bg-white/5 border-white/10" : "bg-slate-50/50 border-slate-200 shadow-sm"
                    )}
                  >
                    <stat.icon className={cn("w-6 h-6 mb-4", stat.color)} />
                    <div className={cn("text-sm mb-1", isDarkMode ? "text-slate-400" : "text-slate-600")}>{stat.label}</div>
                    <div className={cn("text-2xl font-bold", !isDarkMode && "text-slate-950")}>{stat.value}</div>
                  </div>
                ))}
              </section>

              {/* Heatmap Section */}
              <section className={cn(
                "p-8 rounded-3xl border backdrop-blur-sm transition-colors",
                isDarkMode ? "bg-white/5 border-white/10" : "bg-slate-50/50 border-slate-200 shadow-sm"
              )}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                  <div>
                    <h3 className={cn("text-xl font-bold flex items-center gap-2", !isDarkMode && "text-slate-950")}>
                      <LayoutGrid className="w-5 h-5 text-violet-500" />
                      Stream Consistency Map
                    </h3>
                    <p className={cn("text-sm mt-1", isDarkMode ? "text-slate-400" : "text-slate-600")}>
                      Visualizing the last 6 months of stream activity.
                    </p>
                  </div>
                  <div className={cn(
                    "flex p-1 border rounded-xl backdrop-blur-sm transition-colors",
                    isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-200"
                  )}>
                    <button
                      onClick={() => setHeatmapMode('binary')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                        heatmapMode === 'binary' 
                          ? "bg-violet-600 text-white shadow-sm" 
                          : isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      Activity
                    </button>
                    <button
                      onClick={() => setHeatmapMode('intensity')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                        heatmapMode === 'intensity' 
                          ? "bg-violet-600 text-white shadow-sm" 
                          : isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      Delay Intensity
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto pb-4">
                  <div className="flex gap-1.5 min-w-max">
                    {Array.from({ length: 26 }).map((_, weekIndex) => (
                      <div key={weekIndex} className="flex flex-col gap-1.5">
                        {Array.from({ length: 7 }).map((_, dayIndex) => {
                          const date = new Date();
                          date.setDate(date.getDate() - (25 - weekIndex) * 7 - (6 - dayIndex));
                          const dateStr = date.toISOString().split('T')[0];
                          const stream = data.streams.find(s => s.date === dateStr);
                          
                          let color = isDarkMode ? "bg-white/5" : "bg-slate-200";
                          if (stream) {
                            if (heatmapMode === 'binary') {
                              color = "bg-violet-600";
                            } else {
                              const delay = stream.delayMinutes;
                              if (delay <= 15) color = "bg-emerald-500";
                              else if (delay <= 30) color = "bg-yellow-500";
                              else if (delay <= 45) color = "bg-orange-500";
                              else color = "bg-red-500";
                            }
                          }

                          return (
                            <motion.div
                              key={dayIndex}
                              whileHover={{ scale: 1.2, zIndex: 10 }}
                              className={cn(
                                "w-3.5 h-3.5 rounded-sm cursor-help transition-colors",
                                color
                              )}
                              title={stream ? `${formatDate(dateStr)}: ${stream.delayMinutes}m delay` : formatDate(dateStr)}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-end gap-4 text-[10px] font-medium text-slate-500 uppercase tracking-widest">
                  <span>Less Late</span>
                  <div className="flex gap-1">
                    <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-yellow-500" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-orange-500" />
                    <div className="w-2.5 h-2.5 rounded-sm bg-red-500" />
                  </div>
                  <span>More Late</span>
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'visual' && (
            <motion.div
              key="visual"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <div className={cn(
                "p-8 rounded-3xl border backdrop-blur-sm transition-colors relative overflow-hidden",
                isDarkMode ? "bg-white/5 border-white/10" : "bg-slate-50/50 border-slate-200 shadow-sm"
              )}>
                <div className="mb-8">
                  <h3 className={cn("text-2xl font-bold flex items-center gap-2", !isDarkMode && "text-slate-950")}>
                    <Layers className="w-6 h-6 text-violet-500" />
                    The 3D Delay Tower
                  </h3>
                  <p className={cn("text-sm mt-2", isDarkMode ? "text-slate-400" : "text-slate-600")}>
                    A vertical stack of every stream delay. The taller the block, the longer the wait.
                  </p>
                </div>

                <div className="flex flex-col lg:flex-row gap-12 items-center justify-center py-12">
                  {/* 3D Container */}
                  <div className="relative w-full max-w-[400px] h-[600px] [perspective:1000px] flex items-end justify-center">
                    <div className="relative w-48 h-full [transform-style:preserve-3d] flex flex-col-reverse items-center">
                      {sortedStreams.slice(0, 20).map((stream, idx) => {
                        const height = Math.max(stream.delayMinutes * 2, 4);
                        const delay = stream.delayMinutes;
                        let color = "bg-emerald-500";
                        if (delay > 45) color = "bg-red-500";
                        else if (delay > 20) color = "bg-yellow-500";

                        return (
                          <motion.div
                            key={stream.id}
                            initial={{ opacity: 0, scaleY: 0 }}
                            animate={{ opacity: 1, scaleY: 1 }}
                            transition={{ delay: idx * 0.05 }}
                            style={{ 
                              height: `${height}px`,
                              width: '100%',
                              marginBottom: '2px',
                              transformStyle: 'preserve-3d'
                            }}
                            className="relative group"
                          >
                            {/* Front Face */}
                            <div className={cn(
                              "absolute inset-0 border border-white/10 shadow-lg transition-all duration-300 group-hover:brightness-125",
                              color
                            )} />
                            
                            {/* Top Face */}
                            <div 
                              className={cn("absolute top-0 left-0 w-full h-8 origin-top -rotate-x-90 brightness-125", color)}
                              style={{ transform: 'rotateX(-90deg) translateY(-32px)' }}
                            />
                            
                            {/* Side Face */}
                            <div 
                              className={cn("absolute top-0 right-0 w-8 h-full origin-right rotate-y-90 brightness-75", color)}
                              style={{ transform: 'rotateY(90deg) translateX(32px)' }}
                            />

                            <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
                              <div className={cn(
                                "px-3 py-2 rounded-lg border text-xs font-bold shadow-xl",
                                isDarkMode ? "bg-slate-900 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                              )}>
                                {formatDate(stream.date)}: +{stream.delayMinutes}m
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                      
                      {/* Base Plate */}
                      <div className="absolute -bottom-4 w-64 h-64 bg-slate-800/50 rounded-full blur-2xl -z-10" />
                    </div>
                  </div>

                  {/* Legend/Info */}
                  <div className="lg:w-1/3 space-y-6">
                    <div className={cn(
                      "p-6 rounded-2xl border",
                      isDarkMode ? "bg-white/5 border-white/10" : "bg-white border-slate-200"
                    )}>
                      <h4 className="font-bold mb-4 flex items-center gap-2">
                        <Info className="w-4 h-4 text-blue-400" />
                        Tower Legend
                      </h4>
                      <ul className="space-y-3 text-sm">
                        <li className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded bg-emerald-500" />
                          <span className={isDarkMode ? "text-slate-400" : "text-slate-600"}>0-20m: Punctual (for SST)</span>
                        </li>
                        <li className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded bg-yellow-500" />
                          <span className={isDarkMode ? "text-slate-400" : "text-slate-600"}>21-45m: Standard Delay</span>
                        </li>
                        <li className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded bg-red-500" />
                          <span className={isDarkMode ? "text-slate-400" : "text-slate-600"}>45m+: Legendary Lateness</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div className={cn(
                      "p-6 rounded-2xl border border-violet-500/20 bg-violet-500/5",
                      !isDarkMode && "bg-violet-50"
                    )}>
                      <p className="text-sm italic text-violet-400">
                        "The tower only shows the last 20 streams. Any taller and it would pierce the heavens (and your browser's RAM)."
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'delay' && (
            <motion.div
              key="delay"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <div className={cn(
                "p-8 rounded-3xl border backdrop-blur-sm transition-colors",
                isDarkMode ? "bg-white/5 border-white/10" : "bg-slate-50/50 border-slate-200 shadow-sm"
              )}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                  <h3 className={cn("text-2xl font-bold flex items-center gap-2", !isDarkMode && "text-slate-950")}>
                    <TrendingUp className="w-6 h-6 text-violet-500" />
                    Full Delay History
                  </h3>
                  <TimeFilter />
                </div>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorDelayFull" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#ffffff10" : "#00000015"} vertical={false} />
                      <XAxis dataKey="name" stroke={isDarkMode ? "#ffffff40" : "#00000060"} fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke={isDarkMode ? "#ffffff40" : "#00000060"} fontSize={12} tickLine={false} axisLine={false} unit="m" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: isDarkMode ? '#1e1b4b' : '#ffffff', 
                          border: isDarkMode ? 'none' : '1px solid #e2e8f0', 
                          borderRadius: '12px', 
                          color: isDarkMode ? '#fff' : '#0f172a',
                          boxShadow: isDarkMode ? 'none' : '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                        }}
                        itemStyle={{ color: '#8b5cf6' }}
                      />
                      <Area type="monotone" dataKey="delay" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorDelayFull)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={cn(
                  "p-6 rounded-3xl border backdrop-blur-sm transition-colors",
                  isDarkMode ? "bg-white/5 border-white/10" : "bg-slate-50/50 border-slate-200 shadow-sm"
                )}>
                  <h4 className={cn("text-sm mb-2", isDarkMode ? "text-slate-400" : "text-slate-600")}>Average Delay</h4>
                  <div className="text-3xl font-bold text-violet-500">{data.stats.averageDelay}m</div>
                </div>
                <div className={cn(
                  "p-6 rounded-3xl border backdrop-blur-sm transition-colors",
                  isDarkMode ? "bg-white/5 border-white/10" : "bg-slate-50/50 border-slate-200 shadow-sm"
                )}>
                  <h4 className={cn("text-sm mb-2", isDarkMode ? "text-slate-400" : "text-slate-600")}>Consistency</h4>
                  <div className="text-3xl font-bold text-blue-500">
                    {Math.round(100 - (data.stats.longestDelay - data.stats.shortestDelay))}%
                  </div>
                </div>
                <div className={cn(
                  "p-6 rounded-3xl border backdrop-blur-sm transition-colors",
                  isDarkMode ? "bg-white/5 border-white/10" : "bg-slate-50/50 border-slate-200 shadow-sm"
                )}>
                  <h4 className={cn("text-sm mb-2", isDarkMode ? "text-slate-400" : "text-slate-600")}>Total Delay Time</h4>
                  <div className="text-3xl font-bold text-red-500">
                    {Math.round(data.streams.reduce((acc, s) => acc + s.delayMinutes, 0) / 60)}h
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'info' && (
            <motion.div
              key="info"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <div className={cn(
                "p-8 rounded-3xl border backdrop-blur-sm transition-colors",
                isDarkMode ? "bg-white/5 border-white/10" : "bg-slate-50/50 border-slate-200 shadow-sm"
              )}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                  <h3 className={cn("text-2xl font-bold flex items-center gap-2", !isDarkMode && "text-slate-950")}>
                    <Clock className="w-6 h-6 text-blue-500" />
                    Stream Duration History
                  </h3>
                  <TimeFilter />
                </div>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#ffffff10" : "#00000015"} vertical={false} />
                      <XAxis dataKey="name" stroke={isDarkMode ? "#ffffff40" : "#00000060"} fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke={isDarkMode ? "#ffffff40" : "#00000060"} fontSize={12} tickLine={false} axisLine={false} unit="m" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: isDarkMode ? '#1e1b4b' : '#ffffff', 
                          border: isDarkMode ? 'none' : '1px solid #e2e8f0', 
                          borderRadius: '12px', 
                          color: isDarkMode ? '#fff' : '#0f172a',
                          boxShadow: isDarkMode ? 'none' : '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                        }}
                        itemStyle={{ color: '#3b82f6' }}
                      />
                      <Bar dataKey="duration" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className={cn(
                "rounded-3xl border backdrop-blur-sm overflow-hidden transition-colors",
                isDarkMode ? "bg-white/5 border-white/10" : "bg-slate-50/50 border-slate-200 shadow-sm"
              )}>
                <div className={cn(
                  "p-8 border-b flex items-center justify-between",
                  isDarkMode ? "border-white/10" : "border-slate-200 bg-slate-100/50"
                )}>
                  <h3 className={cn("text-xl font-bold flex items-center gap-2", !isDarkMode && "text-slate-950")}>
                    <Calendar className="w-5 h-5 text-violet-500" />
                    Full Stream History
                  </h3>
                  <div className={cn("text-xs", isDarkMode ? "text-slate-400" : "text-slate-600")}>{data.streams.length} total records</div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className={cn(
                        "text-sm border-b",
                        isDarkMode ? "text-slate-400 border-white/5" : "text-slate-600 border-slate-200 bg-slate-100/30"
                      )}>
                        <th 
                          className="px-8 py-4 font-semibold cursor-pointer hover:text-violet-500 transition-colors"
                          onClick={() => requestSort('date')}
                        >
                          <div className="flex items-center gap-1">
                            Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                          </div>
                        </th>
                        <th 
                          className="px-8 py-4 font-semibold cursor-pointer hover:text-violet-500 transition-colors"
                          onClick={() => requestSort('durationMinutes')}
                        >
                          <div className="flex items-center gap-1">
                            Duration {sortConfig.key === 'durationMinutes' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                          </div>
                        </th>
                        <th 
                          className="px-8 py-4 font-semibold cursor-pointer hover:text-violet-500 transition-colors"
                          onClick={() => requestSort('delayMinutes')}
                        >
                          <div className="flex items-center gap-1">
                            Delay (SST) {sortConfig.key === 'delayMinutes' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className={cn(
                      "divide-y",
                      isDarkMode ? "divide-white/5" : "divide-slate-200"
                    )}>
                      {sortedStreams.map((stream) => (
                        <tr key={stream.id} className={cn(
                          "transition-colors",
                          isDarkMode ? "hover:bg-white/5" : "hover:bg-slate-100/50"
                        )}>
                          <td className="px-8 py-6">
                            <div className={cn("font-semibold", !isDarkMode && "text-slate-950")}>{formatDate(stream.date)}</div>
                            <div className={cn("text-xs", isDarkMode ? "text-slate-500" : "text-slate-600")}>{new Date(stream.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                          </td>
                          <td className={cn("px-8 py-6", isDarkMode ? "text-slate-300" : "text-slate-700")}>
                            {Math.floor(stream.durationMinutes / 60)}h {stream.durationMinutes % 60}m
                          </td>
                          <td className="px-8 py-6">
                            <div className={cn(
                              "font-bold",
                              stream.delayMinutes > 45 ? (isDarkMode ? "text-red-400" : "text-red-600") : 
                              stream.delayMinutes > 20 ? (isDarkMode ? "text-yellow-400" : "text-amber-600") : 
                              (isDarkMode ? "text-emerald-400" : "text-emerald-600")
                            )}>
                              +{stream.delayMinutes}m
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Info */}
        <footer className="pt-12 pb-8 text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
            <Info className="w-4 h-4" />
            <span>Data is updated manually via the SST Tracker Python tool.</span>
          </div>
          <p className="text-slate-600 text-xs">
            Built for the omenkitty12 community. Sara's Standard Time is a registered trademark of "Soon™".
          </p>
        </footer>
      </main>
    </div>
  );
}
