'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';

/* ─── Types ─── */
interface SliceData {
  key: string;
  label: string;
  count: number;
  color: string;
  icon?: string;
}

interface VoiceItem {
  id: string;
  content: string;
  category: string;
  department?: string;
  author: string;
  status: string;
  createdAt: string;
  isSensitive?: boolean;
}

interface InteractivePieChartProps {
  slices: SliceData[];
  total: number;
  title: string;
  filterType: 'category' | 'department';
}

/* ─── Category metadata for cross-dimension display ─── */
const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  performance: { label: '绩效问题', color: '#E8917A' },
  housing: { label: '住宿问题', color: '#7C9A5E' },
  attendance: { label: '考勤问题', color: '#6B8DB5' },
  management: { label: '管理问题', color: '#B8A9C9' },
  salary: { label: '工资问题', color: '#D4A574' },
  dining: { label: '用餐问题', color: '#E0A458' },
  rough_management: { label: '粗暴管理', color: '#C75B5B' },
  training: { label: '培训问题', color: '#0D9488' },
  office: { label: '办公问题', color: '#0891B2' },
  commute: { label: '通勤问题', color: '#DB2777' },
  other: { label: '其他', color: '#9CA3AF' },
};

const DEPT_COLORS: Record<string, string> = {
  '智能总装一厂': '#D4A574',
  '智能总装二厂': '#B8A9C9',
  '注塑厂': '#7C9A5E',
  '质量及运营中心': '#6B8DB5',
  '供应链': '#E0A458',
  '其他部门': '#9CA3AF',
  '行政部/后勤部': '#C75B5B',
  '人力资源部/培训部': '#0D9488',
  '未分配': '#D1D5DB',
};

/* ─── Arc helper ─── */
function describeArc(startAngle: number, endAngle: number, center: number, radius: number) {
  const startRad = ((startAngle - 90) * Math.PI) / 180;
  const endRad = ((endAngle - 90) * Math.PI) / 180;
  const x1 = center + radius * Math.cos(startRad);
  const y1 = center + radius * Math.sin(startRad);
  const x2 = center + radius * Math.cos(endRad);
  const y2 = center + radius * Math.sin(endRad);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

/* ─── Detail Panel ─── */
function SliceDetailPanel({
  slice,
  filterType,
  onClose,
}: {
  slice: SliceData;
  filterType: 'category' | 'department';
  onClose: () => void;
}) {
  const [voices, setVoices] = useState<VoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const perPage = 10;

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterType === 'category') {
      params.set('category', slice.key);
    } else {
      params.set('department', slice.key);
    }
    params.set('includeSensitive', 'true');
    fetch(`/api/voices?${params.toString()}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setVoices(res.data);
      })
      .finally(() => setLoading(false));
  }, [slice.key, filterType]);

  const resolved = voices.filter((v) => v.status === 'resolved').length;
  const unresolved = voices.filter((v) => v.status === 'unresolved').length;
  const resolvedPct = voices.length > 0 ? ((resolved / voices.length) * 100).toFixed(1) : '0';
  const unresolvedPct = voices.length > 0 ? ((unresolved / voices.length) * 100).toFixed(1) : '0';

  /* ─── Cross-dimension breakdown ─── */
  const crossBreakdown = useMemo(() => {
    if (voices.length === 0) return [];
    if (filterType === 'category') {
      // Show department breakdown within this category
      const deptMap = new Map<string, number>();
      for (const v of voices) {
        const dept = v.department || '未分配';
        deptMap.set(dept, (deptMap.get(dept) || 0) + 1);
      }
      return Array.from(deptMap.entries())
        .sort(([, a], [, b]) => b - a)
        .map(([dept, count]) => ({
          key: dept,
          label: dept,
          count,
          color: DEPT_COLORS[dept] || '#999',
        }));
    } else {
      // Show category breakdown within this department
      const catMap = new Map<string, number>();
      for (const v of voices) {
        catMap.set(v.category, (catMap.get(v.category) || 0) + 1);
      }
      return Array.from(catMap.entries())
        .sort(([, a], [, b]) => b - a)
        .map(([cat, count]) => {
          const info = CATEGORY_LABELS[cat];
          return {
            key: cat,
            label: info?.label || cat,
            count,
            color: info?.color || '#999',
          };
        });
    }
  }, [voices, filterType]);

  const crossLabel = filterType === 'category' ? '部门分布' : '分类分布';

  const paginatedVoices = voices.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(voices.length / perPage);

  return (
    <div className="mt-4 bg-white rounded-xl border border-stone-200 p-5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: slice.color }} />
          <h4 className="font-semibold text-stone-800">
            {slice.icon ? `${slice.icon} ` : ''}{slice.label}
          </h4>
          <span className="text-sm text-stone-500">({voices.length} 条)</span>
        </div>
        <button
          onClick={onClose}
          className="text-stone-400 hover:text-stone-600 transition-colors p-1 rounded-md hover:bg-stone-100"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Status bar */}
      <div className="mb-4">
        <div className="flex items-center gap-4 mb-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-sm text-stone-600">已处理</span>
            <span className="text-sm font-bold text-emerald-600">{resolved}</span>
            <span className="text-xs text-stone-400">({resolvedPct}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-sm text-stone-600">未处理</span>
            <span className="text-sm font-bold text-amber-600">{unresolved}</span>
            <span className="text-xs text-stone-400">({unresolvedPct}%)</span>
          </div>
        </div>
        <div className="h-2.5 rounded-full bg-stone-100 overflow-hidden flex">
          {voices.length > 0 && (
            <>
              <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${resolvedPct}%` }} />
              <div className="bg-amber-500 transition-all duration-500" style={{ width: `${unresolvedPct}%` }} />
            </>
          )}
        </div>
      </div>

      {/* Cross-dimension breakdown */}
      {!loading && crossBreakdown.length > 0 && (
        <div className="mb-4 pb-4 border-b border-stone-100">
          <h5 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">{crossLabel}</h5>
          <div className="space-y-1.5">
            {crossBreakdown.map((item) => {
              const pct = ((item.count / voices.length) * 100).toFixed(1);
              return (
                <div key={item.key} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-stone-600 flex-1 truncate">{item.label}</span>
                  <span className="text-sm font-semibold text-stone-700">{item.count}</span>
                  <span className="text-xs text-stone-400 w-12 text-right">{pct}%</span>
                  {/* Mini bar */}
                  <div className="w-16 h-1.5 rounded-full bg-stone-100 overflow-hidden flex-shrink-0">
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Voice list */}
      {loading ? (
        <div className="text-center py-8 text-stone-400 text-sm">加载中...</div>
      ) : voices.length === 0 ? (
        <div className="text-center py-8 text-stone-400 text-sm">暂无反馈内容</div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {paginatedVoices.map((v) => (
            <div
              key={v.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-stone-50 hover:bg-stone-100 transition-colors"
            >
              <div
                className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                  v.status === 'resolved' ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-stone-700 line-clamp-2">{v.content}</p>
                <div className="flex items-center gap-2 mt-1">
                  {v.author && <span className="text-xs text-stone-400">{v.author}</span>}
                  <span className="text-xs text-stone-300">{new Date(v.createdAt).toLocaleDateString('zh-CN')}</span>
                  {filterType === 'category' && v.department && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-stone-200 text-stone-500">{v.department}</span>
                  )}
                  {filterType === 'department' && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-stone-200 text-stone-500">
                      {CATEGORY_LABELS[v.category]?.label || v.category}
                    </span>
                  )}
                </div>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                  v.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {v.status === 'resolved' ? '已处理' : '未处理'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-stone-100">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="text-xs px-3 py-1 rounded-md bg-stone-100 text-stone-600 hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            上一页
          </button>
          <span className="text-xs text-stone-500">{page + 1} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="text-xs px-3 py-1 rounded-md bg-stone-100 text-stone-600 hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Interactive Pie Chart ─── */
export default function InteractivePieChart({
  slices,
  total,
  title,
  filterType,
}: InteractivePieChartProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const handleSliceClick = useCallback((key: string) => {
    setActiveKey((prev) => (prev === key ? null : key));
  }, []);

  const activeSlice = useMemo(
    () => (activeKey ? slices.find((s) => s.key === activeKey) : null),
    [activeKey, slices]
  );

  // Pre-compute angles
  const sliceAngles = useMemo(() => {
    if (total === 0 || slices.length === 0) return [];
    const cumSum: number[] = [];
    let sum = 0;
    for (const s of slices) {
      cumSum.push(sum);
      sum += s.count;
    }
    return slices.map((s, i) => ({
      startAngle: (cumSum[i] / total) * 360,
      endAngle: ((cumSum[i] + s.count) / total) * 360,
      midAngle: ((cumSum[i] + s.count / 2) / total) * 360,
    }));
  }, [slices, total]);

  if (total === 0 || slices.length === 0) return null;

  const radius = 80;
  const center = 100;
  const hoverOffset = 6;

  return (
    <div>
      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* SVG Pie */}
        <svg viewBox="0 0 200 200" className="w-48 h-48 flex-shrink-0">
          {slices.map((slice, i) => {
            const { startAngle, endAngle, midAngle } = sliceAngles[i];
            const isActive = activeKey === slice.key;
            const angle = endAngle - startAngle;

            const midRad = ((midAngle - 90) * Math.PI) / 180;
            const offsetX = isActive ? hoverOffset * Math.cos(midRad) : 0;
            const offsetY = isActive ? hoverOffset * Math.sin(midRad) : 0;

            if (angle >= 360) {
              return (
                <circle
                  key={slice.key}
                  cx={center + offsetX}
                  cy={center + offsetY}
                  r={radius}
                  fill={slice.color}
                  className="cursor-pointer transition-all duration-200"
                  style={{ filter: isActive ? 'brightness(1.1)' : undefined }}
                  onClick={() => handleSliceClick(slice.key)}
                />
              );
            }

            return (
              <path
                key={slice.key}
                d={describeArc(startAngle, endAngle, center, radius)}
                fill={slice.color}
                stroke={isActive ? slice.color : 'white'}
                strokeWidth={isActive ? 2.5 : 1.5}
                className="cursor-pointer transition-all duration-200"
                style={{
                  filter: isActive ? 'brightness(1.1) drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : undefined,
                  transform: isActive
                    ? `translate(${offsetX}px, ${offsetY}px)`
                    : undefined,
                }}
                onClick={() => handleSliceClick(slice.key)}
              />
            );
          })}
          {/* Center hole */}
          <circle cx={center} cy={center} r="40" fill="white" />
          <text x={center} y={center - 6} textAnchor="middle" className="text-2xl font-bold" fill="#3D3632">
            {total}
          </text>
          <text x={center} y={center + 12} textAnchor="middle" className="text-[10px]" fill="#8A817A">
            总反馈
          </text>
        </svg>

        {/* Legend */}
        <div className={`flex-1 ${filterType === 'department' ? 'space-y-2' : 'grid grid-cols-2 gap-x-6 gap-y-2'}`}>
          {slices.map((slice) => {
            const isActive = activeKey === slice.key;
            return (
              <button
                key={slice.key}
                onClick={() => handleSliceClick(slice.key)}
                className={`flex items-center gap-2 w-full text-left px-2 py-1 rounded-md transition-all duration-200 ${
                  isActive ? 'bg-stone-100 ring-1 ring-stone-300' : 'hover:bg-stone-50'
                }`}
              >
                <div
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="text-sm text-stone-600 truncate">
                  {slice.icon ? `${slice.icon} ` : ''}{slice.label}
                </span>
                <span className="text-sm font-semibold text-stone-800 ml-auto">{slice.count}</span>
                {filterType === 'department' && (
                  <span className="text-xs text-stone-400 w-14 text-right">
                    {((slice.count / total) * 100).toFixed(1)}%
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Click hint */}
      {!activeKey && (
        <p className="text-xs text-stone-400 text-center mt-3">点击饼图扇区或图例查看详细反馈内容</p>
      )}

      {/* Detail Panel */}
      {activeSlice && (
        <SliceDetailPanel
          slice={activeSlice}
          filterType={filterType}
          onClose={() => setActiveKey(null)}
        />
      )}
    </div>
  );
}
