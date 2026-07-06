import React, { useState } from 'react';
import { Commit, BranchInfo, SandboxFile, VCSInternals } from '../types';

interface RepositoryAnalyticsProps {
  history: Commit[];
  branches: BranchInfo[];
  files: SandboxFile[];
  internals: VCSInternals | null;
}

export const RepositoryAnalytics: React.FC<RepositoryAnalyticsProps> = ({
  history,
  branches,
  files,
  internals
}) => {
  // Live computed metrics
  const totalCommits = history.length;
  const totalBranches = branches.length;
  const totalTrackedFiles = files.length;
  const totalObjects = internals?.objectCount || 0;

  // State to track hovered bar for tooltip
  const [hoveredBar, setHoveredBar] = useState<{
    date: string;
    count: number;
    x: number;
    y: number;
    index: number;
  } | null>(null);

  // Live Line-of-code counter
  const totalLinesOfCode = files.reduce((acc, f) => {
    const lines = f.content ? f.content.split('\n').length : 0;
    return acc + lines;
  }, 0);

  // Repo raw size
  const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Compute Commit Distribution over active days
  const commitDays: { [date: string]: number } = {};
  history.forEach(commit => {
    try {
      const dateStr = new Date(commit.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      commitDays[dateStr] = (commitDays[dateStr] || 0) + 1;
    } catch (e) {
      // ignore
    }
  });

  const sortedDays = Object.entries(commitDays)
    .map(([date, count]) => ({ date, count }))
    .slice(0, 7); // Last 7 active days

  const maxCommitCount = Math.max(...sortedDays.map(d => d.count), 1);

  // File Type proportions
  const extensionBreakdown: { [ext: string]: number } = {};
  files.forEach(f => {
    const ext = f.relativePath.includes('.') 
      ? '.' + f.relativePath.split('.').pop()?.toLowerCase() 
      : 'no ext';
    extensionBreakdown[ext] = (extensionBreakdown[ext] || 0) + 1;
  });

  const sortedExtensions = Object.entries(extensionBreakdown)
    .map(([name, count]) => ({
      name,
      count,
      percentage: totalTrackedFiles ? Math.round((count / totalTrackedFiles) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count);

  // Compute change frequency of files by scanning snapshot hashes
  const fileChanges: { [path: string]: number } = {};
  const sortedHistory = [...history].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const commitMap = new Map<string, Commit>();
  sortedHistory.forEach(c => commitMap.set(c.id, c));

  sortedHistory.forEach(c => {
    const parent = c.parent ? commitMap.get(c.parent) : null;
    if (!parent) {
      Object.keys(c.snapshot || {}).forEach(f => {
        fileChanges[f] = (fileChanges[f] || 0) + 1;
      });
    } else {
      const currentKeys = Object.keys(c.snapshot || {});
      const parentKeys = Object.keys(parent.snapshot || {});
      const allKeys = new Set([...currentKeys, ...parentKeys]);
      allKeys.forEach(f => {
        if (c.snapshot[f] !== parent.snapshot[f]) {
          fileChanges[f] = (fileChanges[f] || 0) + 1;
        }
      });
    }
  });

  const sortedChangeFreqs = Object.entries(fileChanges)
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5); // top 5

  const maxChangeCount = Math.max(...sortedChangeFreqs.map(f => f.count), 1);

  return (
    <div className="space-y-6" id="analytics-tab-container">
      {/* Header */}
      <div className="border-b border-[#141414] pb-5">
        <h2 className="text-xl font-mono font-bold uppercase text-[#141414]">Repository Insights & Live Analytics</h2>
        <p className="text-xs font-serif italic text-zinc-700 font-semibold">Genuinely computed metrics and charts reflecting the repository database and local disk state.</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="border border-[#141414] bg-white p-4 space-y-1 shadow-[2px_2px_0px_#141414]">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider font-bold">Total Commits</span>
          <div className="text-2xl font-mono font-bold text-[#141414]">{totalCommits}</div>
        </div>
        <div className="border border-[#141414] bg-white p-4 space-y-1 shadow-[2px_2px_0px_#141414]">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider font-bold">Active Branches</span>
          <div className="text-2xl font-mono font-bold text-[#141414]">{totalBranches}</div>
        </div>
        <div className="border border-[#141414] bg-white p-4 space-y-1 shadow-[2px_2px_0px_#141414]">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider font-bold">Tracked Files</span>
          <div className="text-2xl font-mono font-bold text-[#141414]">{totalTrackedFiles}</div>
        </div>
        <div className="border border-[#141414] bg-white p-4 space-y-1 shadow-[2px_2px_0px_#141414]">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider font-bold">VCS SHA-1 Objects</span>
          <div className="text-2xl font-mono font-bold text-[#141414]">{totalObjects}</div>
        </div>
        <div className="border border-[#141414] bg-white p-4 space-y-1 shadow-[2px_2px_0px_#141414]">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider font-bold">Total Code Lines</span>
          <div className="text-2xl font-mono font-bold text-[#141414]">{totalLinesOfCode}</div>
        </div>
        <div className="border border-[#141414] bg-white p-4 space-y-1 shadow-[2px_2px_0px_#141414]">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider font-bold">Workspace Size</span>
          <div className="text-2xl font-mono font-bold text-[#141414] truncate" title={`${totalBytes} bytes`}>{formatSize(totalBytes)}</div>
        </div>
      </div>

      {/* Chart & File Breakdown Bento */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Commit Activity Distribution SVG */}
        <div className="border border-[#141414] bg-white p-5 space-y-4 shadow-[4px_4px_0px_#141414] relative">
          <div className="flex justify-between items-center pb-2 border-b border-[#141414]/10">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#141414]">
              Commit Activity Timeline (Last 7 Active Days)
            </h3>
            <span className="text-[10px] text-zinc-500 font-bold font-mono">HOVER BARS FOR DETAIL</span>
          </div>
          {sortedDays.length > 0 ? (
            <div className="pt-2 relative">
              {/* Simple, robust, responsive SVG bar chart */}
              <svg viewBox="0 0 500 200" className="w-full h-48 overflow-visible font-mono text-[10px]">
                {/* Horizontal Grid lines */}
                <line x1="40" y1="30" x2="480" y2="30" stroke="#141414" strokeOpacity="0.08" strokeDasharray="3,3" />
                <line x1="40" y1="80" x2="480" y2="80" stroke="#141414" strokeOpacity="0.08" strokeDasharray="3,3" />
                <line x1="40" y1="130" x2="480" y2="130" stroke="#141414" strokeOpacity="0.08" strokeDasharray="3,3" />
                <line x1="40" y1="160" x2="480" y2="160" stroke="#141414" strokeWidth="1.5" />

                {sortedDays.map((d, index) => {
                  const barWidth = 32;
                  const barSpacing = 60;
                  const x = 55 + index * barSpacing;
                  const barHeight = (d.count / maxCommitCount) * 110;
                  const y = 160 - barHeight;

                  const isHovered = hoveredBar?.index === index;

                  return (
                    <g 
                      key={d.date} 
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredBar({ date: d.date, count: d.count, x, y, index })}
                      onMouseLeave={() => setHoveredBar(null)}
                    >
                      {/* Interactive full-height hit area for easier hover triggers */}
                      <rect
                        x={x - 10}
                        y={20}
                        width={barWidth + 20}
                        height={150}
                        fill="transparent"
                      />

                      {/* SVG Bar */}
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={barHeight}
                        fill={isHovered ? '#059669' : '#141414'}
                        className="transition-all duration-200"
                        stroke={isHovered ? '#10b981' : 'none'}
                        strokeWidth={1.5}
                      />
                      
                      {/* Value label */}
                      <text
                        x={x + barWidth / 2}
                        y={y - 8}
                        textAnchor="middle"
                        className={`font-bold text-[10px] transition-colors duration-200 ${isHovered ? 'fill-emerald-600 text-xs' : 'fill-[#141414]'}`}
                      >
                        {d.count}
                      </text>

                      {/* X-Axis Date label */}
                      <text
                        x={x + barWidth / 2}
                        y={178}
                        textAnchor="middle"
                        className={`text-[9px] font-bold transition-colors duration-200 ${isHovered ? 'fill-emerald-600 font-extrabold scale-105' : 'fill-zinc-600'}`}
                      >
                        {d.date}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* HIGH-CONTRAST FLOATING HTML TOOLTIP */}
              {hoveredBar && (
                <div 
                  className="absolute pointer-events-none bg-[#141414] text-[#E4E3E0] border-2 border-emerald-500 p-2.5 shadow-[4px_4px_0px_#141414] font-mono rounded-none text-xs transition-all duration-100 z-10"
                  style={{
                    left: `${(hoveredBar.x / 500) * 100}%`,
                    top: `${Math.max(10, (hoveredBar.y / 200) * 100 - 32)}%`,
                    transform: 'translateX(-25%)',
                  }}
                >
                  <div className="font-extrabold text-emerald-400 border-b border-zinc-800 pb-1 mb-1">
                    {hoveredBar.date}
                  </div>
                  <div>
                    Commits: <span className="font-bold text-white">{hoveredBar.count}</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">
                    {Math.round((hoveredBar.count / totalCommits) * 100)}% of total activity
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center font-serif italic text-zinc-500">
              No commits recorded. Create some commit snapshots to compute timeline charts.
            </div>
          )}
        </div>

        {/* File Type Proportional Breakdown */}
        <div className="border border-[#141414] bg-white p-5 space-y-4 shadow-[4px_4px_0px_#141414]">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#141414] pb-2 border-b border-[#141414]/10">
            Tracked File Types Proportion
          </h3>
          {sortedExtensions.length > 0 ? (
            <div className="space-y-4 pt-1">
              {sortedExtensions.map((ext, idx) => {
                // Define some distinct, warm, and tech-focused dark tones
                const colors = ['bg-[#141414]', 'bg-zinc-700', 'bg-zinc-500', 'bg-zinc-400'];
                const barColor = colors[idx % colors.length];

                return (
                  <div key={ext.name} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="font-bold text-[#141414]">{ext.name}</span>
                      <span className="text-zinc-600 font-bold">{ext.count} file{ext.count > 1 ? 's' : ''} ({ext.percentage}%)</span>
                    </div>
                    <div className="h-2.5 w-full bg-zinc-100 border border-[#141414]/15 overflow-hidden">
                      <div 
                        className={`h-full ${barColor} transition-all duration-500`}
                        style={{ width: `${ext.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center font-serif italic text-zinc-500">
              Working tree has no files tracked yet. Create files and stage them in the Sandbox workspace.
            </div>
          )}
        </div>
      </div>

      {/* File Modification Leaderboard */}
      <div className="border border-[#141414] bg-white p-5 space-y-4 shadow-[4px_4px_0px_#141414]">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#141414] pb-2 border-b border-[#141414]/10">
          Most Frequently Modified Files (VCS Hotspot Leaderboard)
        </h3>
        {sortedChangeFreqs.length > 0 ? (
          <div className="space-y-4 pt-2">
            {sortedChangeFreqs.map((item, idx) => {
              const pct = Math.round((item.count / maxChangeCount) * 100);
              return (
                <div key={item.path} className="flex items-center gap-4 text-xs">
                  <span className="font-mono font-bold text-zinc-400 w-6">#{idx + 1}</span>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex justify-between font-mono">
                      <span className="font-bold text-[#141414] truncate" title={item.path}>{item.path}</span>
                      <span className="text-zinc-600 font-bold font-mono">{item.count} modifications</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-100 border border-[#141414]/10 overflow-hidden">
                      <div 
                        className="h-full bg-zinc-800"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center font-serif italic text-zinc-500">
            Create commits to track live file modification statistics!
          </div>
        )}
      </div>
    </div>
  );
};
