'use client';

import { useState, useRef, useMemo } from 'react';
import { CATEGORY_MAP } from '@/lib/types';
import type { VoiceCategory } from '@/lib/types';

interface BatchResult {
  voices: Array<{
    id: string;
    content: string;
    category: string;
  }>;
  distribution: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  total: number;
}

interface BatchInputProps {
  onSuccess: (result: BatchResult) => void;
  onClose: () => void;
}

export function BatchInput({ onSuccess, onClose }: BatchInputProps) {
  const [inputMode, setInputMode] = useState<'text' | 'file'>('text');
  const [batchText, setBatchText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
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
    // Split by newlines, filter empty lines
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
        // Read files
        for (const file of files) {
          const ext = file.name.toLowerCase();
          if (ext.endsWith('.txt')) {
            const content = await file.text();
            texts.push(...parseTexts(content));
          } else if (ext.endsWith('.docx') || ext.endsWith('.doc')) {
            // Use server-side parsing via API
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

      // Send to batch input API
      const res = await fetch('/api/batch-input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts, mode: 'classify' }),
      });

      const data = await res.json();
      if (data.success) {
        onSuccess(data.data);
      } else {
        setError(data.error || '批量输入失败');
      }
    } catch {
      setError('处理失败，请稍后重试');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-card p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">批量输入心声</h3>
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
              每行一条心声，系统将自动分类
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
          <p className="mb-2 text-xs font-medium text-muted-foreground">AI 将按以下类别自动分类：</p>
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
                AI 分类中...
              </span>
            ) : (
              '开始分类'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Pie chart component for batch results
interface BatchResultChartProps {
  distribution: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  total: number;
}

export function BatchResultChart({ distribution, total }: BatchResultChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Calculate SVG pie chart
  const radius = 80;
  const centerX = 100;
  const centerY = 100;

  const slices = useMemo(() => {
    const filtered = distribution.filter((d) => d.count > 0);
    // Compute cumulative start angles purely (no mutable variables)
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
  }, [distribution, centerX, centerY, radius]);

  return (
    <div className="flex flex-col items-center gap-6 md:flex-row md:gap-10">
      {/* SVG Pie Chart */}
      <div className="relative">
        <svg width="200" height="200" viewBox="0 0 200 200">
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
          {/* Center circle for donut effect */}
          <circle cx={centerX} cy={centerY} r="45" fill="white" />
          <text
            x={centerX}
            y={centerY - 8}
            textAnchor="middle"
            className="fill-foreground text-2xl font-bold"
          >
            {total}
          </text>
          <text
            x={centerX}
            y={centerY + 12}
            textAnchor="middle"
            className="fill-muted-foreground text-xs"
          >
            条心声
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex-1 space-y-2.5">
        {slices.map((slice) => (
          <div
            key={slice.index}
            className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted/50"
            onMouseEnter={() => setHoveredIndex(slice.index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: slice.color }}
            />
            <span className="text-sm text-foreground">
              {slice.icon} {slice.label}
            </span>
            <span className="ml-auto text-sm font-medium text-foreground">
              {slice.count} 条
            </span>
            <span className="text-xs text-muted-foreground">
              {slice.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
