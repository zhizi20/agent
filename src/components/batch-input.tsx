'use client';

import { useState, useRef, useMemo } from 'react';
import { CATEGORY_MAP } from '@/lib/types';
import type { VoiceCategory } from '@/lib/types';

interface PendingVoice {
  tempId: string;
  content: string;
  category: VoiceCategory;
  urgency: string;
  department: string;
}

interface BatchAnalysisResult {
  voices: PendingVoice[];
  distribution: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  urgencyDistribution: { high: number; medium: number; low: number };
  deptDistribution: Record<string, number>;
  total: number;
}

interface BatchInputProps {
  onConfirm: () => void;
  onClose: () => void;
}

export function BatchInput({ onConfirm, onClose }: BatchInputProps) {
  const [phase, setPhase] = useState<'input' | 'analysis'>('input');
  const [inputMode, setInputMode] = useState<'text' | 'file'>('text');
  const [batchText, setBatchText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<BatchAnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles = selectedFiles.filter((f) => {
      const ext = f.name.toLowerCase();
      return ext.endsWith('.txt') || ext.endsWith('.docx') || ext.endsWith('.doc');
    });
    if (validFiles.length !== selectedFiles.length) {
      setError('仅支持 .txt 和 .docx 格式的文件');
    } else {
      setError('');
    }
    setFiles(validFiles);
  };

  const parseTexts = (text: string): string[] => {
    // 检查是否为"反馈 #N"格式
    const hasFeedbackFormat = /^反馈\s*#\d+/m.test(text);

    if (hasFeedbackFormat) {
      // 按"反馈 #N"分割，提取每个反馈的问题描述
      const blocks = text.split(/(?=^反馈\s*#\d+)/m).filter((b) => b.trim().length > 0);
      return blocks
        .map((block) => {
          // 提取"问题描述："后的内容
          const match = block.match(/问题描述[：:]\s*([\s\S]*?)(?:\n(?:处理人|评价分数|评价内容|----------------------------------)|$)/);
          if (match) {
            return match[1].trim();
          }
          // 如果没有"问题描述"字段，尝试提取"标题："后的内容
          const titleMatch = block.match(/标题[：:]\s*(.+?)(?:\n|$)/);
          if (titleMatch) {
            return titleMatch[1].trim();
          }
          return null;
        })
        .filter((content): content is string => content !== null && content.length > 0);
    }

    // 默认格式：一行一条
    return text
      .split(/[\n\r]+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  };

  const handleSubmit = async () => {
    setIsProcessing(true);
    setError('');

    try {
      let texts: string[] = [];

      if (inputMode === 'text') {
        texts = parseTexts(batchText);
        if (texts.length === 0) {
          setError('请输入至少一条心声内容');
          setIsProcessing(false);
          return;
        }
      } else {
        for (const file of files) {
          const ext = file.name.toLowerCase();
          if (ext.endsWith('.txt')) {
            const content = await file.text();
            texts.push(...parseTexts(content));
          } else if (ext.endsWith('.docx') || ext.endsWith('.doc')) {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/api/batch-input/parse-file', {
              method: 'POST',
              body: formData,
            });
            const data = await res.json();
            if (data.success) {
              texts.push(...parseTexts(data.data.content));
            } else {
              setError(`文件 ${file.name} 解析失败: ${data.error}`);
              setIsProcessing(false);
              return;
            }
          }
        }
        if (texts.length === 0) {
          setError('文件中未找到有效内容');
          setIsProcessing(false);
          return;
        }
      }

      if (texts.length > 50) {
        setError('单次最多处理 50 条心声，当前有 ' + texts.length + ' 条');
        setIsProcessing(false);
        return;
      }

      // Send to batch input API for classification (no saving)
      const res = await fetch('/api/batch-input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts, mode: 'classify' }),
      });

      const data = await res.json();
      if (data.success) {
        setAnalysis(data.data);
        setPhase('analysis');
      } else {
        setError(data.error || '批量分类失败');
      }
    } catch {
      setError('处理失败，请稍后重试');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = async () => {
    if (!analysis) return;
    setIsConfirming(true);
    try {
      const res = await fetch('/api/batch-input/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voices: analysis.voices.map((v) => ({
            content: v.content,
            category: v.category,
            department: v.department,
          })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        onConfirm();
      } else {
        setError(data.error || '确认失败');
      }
    } catch {
      setError('确认失败，请稍后重试');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleDiscard = () => {
    setAnalysis(null);
    setPhase('input');
    setBatchText('');
    setFiles([]);
    setError('');
  };

  // ─── Input Phase ───────────────────────────────────────────────
  if (phase === 'input') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
        <div className="w-full max-w-2xl rounded-2xl bg-card p-6 shadow-2xl">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">批量导入心声</h3>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Input mode tabs */}
          <div className="mb-5 flex gap-2 rounded-xl bg-muted/50 p-1">
            <button
              onClick={() => setInputMode('text')}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                inputMode === 'text'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              直接输入
            </button>
            <button
              onClick={() => setInputMode('file')}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                inputMode === 'file'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              上传文件
            </button>
          </div>

          {/* Text input mode */}
          {inputMode === 'text' && (
            <div className="mb-5">
              <label className="mb-2 block text-sm font-medium text-foreground">
                每行一条心声，系统将自动分类并分析
              </label>
              <textarea
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                placeholder={`例如：\n食堂的早餐品种太少了，希望能增加一些健康选择\n会议室预约系统经常卡顿，建议优化\n新员工的入职培训缺少实操环节`}
                className="h-48 w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                已识别 {parseTexts(batchText).length} 条心声（最多 50 条）
              </p>
            </div>
          )}

          {/* File upload mode */}
          {inputMode === 'file' && (
            <div className="mb-5">
              <label className="mb-2 block text-sm font-medium text-foreground">
                支持 .txt 和 .docx 格式，每行一条心声
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-10 transition-all hover:border-primary/50 hover:bg-muted/50"
              >
                <svg className="mb-3 h-10 w-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm font-medium text-foreground">点击选择文件</p>
                <p className="mt-1 text-xs text-muted-foreground">或拖拽文件到此处</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.docx,.doc"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              {files.length > 0 && (
                <div className="mt-3 space-y-2">
                  {files.map((file, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
                      <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="flex-1 truncate text-foreground">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Classification legend */}
          <div className="mb-5 rounded-xl bg-muted/30 px-4 py-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">AI 将自动分类并分析紧急程度：</p>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(CATEGORY_MAP) as [string, (typeof CATEGORY_MAP)[VoiceCategory]][]).map(([key, val]) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: val.color + '20', color: val.color }}
                >
                  {val.icon} {val.label}
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-muted"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={isProcessing}
              className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:shadow-md hover:brightness-105 disabled:opacity-50"
            >
              {isProcessing ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  AI 分析中...
                </span>
              ) : (
                '开始分析'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Analysis Phase ────────────────────────────────────────────
  if (!analysis) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-4xl rounded-2xl bg-card p-6 shadow-2xl my-8">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">批次分析报告</h3>
            <p className="text-xs text-muted-foreground mt-1">
              共 {analysis.total} 条心声已完成 AI 分类与紧急程度评估
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="rounded-xl bg-stone-50 border border-stone-100 p-3 text-center">
            <p className="text-2xl font-bold text-stone-800">{analysis.total}</p>
            <p className="text-xs text-stone-500 mt-1">总条数</p>
          </div>
          <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{analysis.urgencyDistribution.high}</p>
            <p className="text-xs text-stone-500 mt-1">高紧急</p>
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{analysis.urgencyDistribution.medium}</p>
            <p className="text-xs text-stone-500 mt-1">中紧急</p>
          </div>
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">{analysis.urgencyDistribution.low}</p>
            <p className="text-xs text-stone-500 mt-1">低紧急</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Category Distribution Pie */}
          <div className="rounded-xl bg-stone-50 border border-stone-100 p-4">
            <h4 className="text-sm font-semibold text-stone-700 mb-3">分类分布</h4>
            <BatchPieChart distribution={analysis.distribution} />
          </div>

          {/* Department Distribution */}
          <div className="rounded-xl bg-stone-50 border border-stone-100 p-4">
            <h4 className="text-sm font-semibold text-stone-700 mb-3">责任部门分布</h4>
            <div className="space-y-2">
              {Object.entries(analysis.deptDistribution)
                .sort(([, a], [, b]) => b - a)
                .map(([dept, count]) => {
                  const pct = ((count / analysis.total) * 100).toFixed(1);
                  return (
                    <div key={dept} className="flex items-center gap-2">
                      <span className="text-sm text-stone-600 flex-1 truncate">{dept}</span>
                      <span className="text-sm font-bold text-stone-800">{count}</span>
                      <span className="text-xs text-stone-400 w-12 text-right">{pct}%</span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Voice Items List */}
        <div className="rounded-xl bg-stone-50 border border-stone-100 p-4 mb-6 max-h-64 overflow-y-auto">
          <h4 className="text-sm font-semibold text-stone-700 mb-3">心声明细</h4>
          <div className="space-y-2">
            {analysis.voices.map((voice, i) => {
              const catInfo = CATEGORY_MAP[voice.category];
              const urgencyColor = voice.urgency === '高' ? 'bg-red-100 text-red-700' : voice.urgency === '中' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700';
              return (
                <div key={voice.tempId} className="flex items-start gap-2 p-2 rounded-lg bg-white border border-stone-100">
                  <span className="text-xs text-stone-400 w-5 shrink-0 mt-0.5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-stone-700 truncate">{voice.content}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: catInfo?.pieColor + '20', color: catInfo?.pieColor }}>
                        {catInfo?.icon} {catInfo?.label}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${urgencyColor}`}>
                        {voice.urgency}紧急
                      </span>
                      <span className="text-xs text-stone-400">{voice.department}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Confirmation Actions */}
        <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4">
          <p className="text-sm font-medium text-stone-700 mb-3">
            是否将该批次 {analysis.total} 条心声数据加入总数据库？
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDiscard}
              disabled={isConfirming}
              className="flex-1 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-600 transition-all hover:bg-stone-50 disabled:opacity-50"
            >
              放弃该批次
            </button>
            <button
              onClick={handleConfirm}
              disabled={isConfirming}
              className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50"
            >
              {isConfirming ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  导入中...
                </span>
              ) : (
                '确认加入数据库'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Pie Chart Component ─────────────────────────────────────────

function BatchPieChart({ distribution }: { distribution: Array<{ category: string; count: number; percentage: number }> }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const radius = 70;
  const centerX = 90;
  const centerY = 90;

  const slices = useMemo(() => {
    const filtered = distribution.filter((d) => d.count > 0);
    const sliceStartAngles = filtered.map((_, i) =>
      filtered.slice(0, i).reduce((sum, d) => sum + (d.percentage / 100) * 360, -90)
    );

    return filtered.map((d, i) => {
      const angle = (d.percentage / 100) * 360;
      const startAngle = sliceStartAngles[i];
      const endAngle = startAngle + angle;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1 = centerX + radius * Math.cos(startRad);
      const y1 = centerY + radius * Math.sin(startRad);
      const x2 = centerX + radius * Math.cos(endRad);
      const y2 = centerY + radius * Math.sin(endRad);

      const largeArcFlag = angle > 180 ? 1 : 0;

      const pathData = [
        `M ${centerX} ${centerY}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        'Z',
      ].join(' ');

      const catInfo = CATEGORY_MAP[d.category as VoiceCategory] || CATEGORY_MAP.other;

      return {
        pathData,
        color: catInfo.pieColor,
        label: catInfo.label,
        icon: catInfo.icon,
        count: d.count,
        percentage: d.percentage,
        index: i,
      };
    });
  }, [distribution]);

  const total = distribution.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width="180" height="180" viewBox="0 0 180 180">
        {slices.map((slice) => (
          <path
            key={slice.index}
            d={slice.pathData}
            fill={slice.color}
            stroke="white"
            strokeWidth="2"
            className="transition-all duration-200"
            style={{
              transform: hoveredIndex === slice.index ? 'scale(1.05)' : 'scale(1)',
              transformOrigin: 'center',
              opacity: hoveredIndex !== null && hoveredIndex !== slice.index ? 0.6 : 1,
            }}
            onMouseEnter={() => setHoveredIndex(slice.index)}
            onMouseLeave={() => setHoveredIndex(null)}
          />
        ))}
        <circle cx={centerX} cy={centerY} r="35" fill="white" />
        <text x={centerX} y={centerY - 5} textAnchor="middle" className="text-xl font-bold fill-stone-800">
          {total}
        </text>
        <text x={centerX} y={centerY + 10} textAnchor="middle" className="text-[9px] fill-stone-400">
          总计
        </text>
      </svg>
      <div className="flex flex-wrap gap-2 justify-center">
        {slices.map((slice) => (
          <div
            key={slice.index}
            className="flex items-center gap-1.5 text-xs"
            onMouseEnter={() => setHoveredIndex(slice.index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: slice.color }} />
            <span className="text-stone-600">{slice.icon} {slice.label}</span>
            <span className="text-stone-400">({slice.percentage}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}
