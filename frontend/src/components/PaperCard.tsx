'use client';

import React, { useState, useEffect } from 'react';
import type { Paper, PaperCard as PaperCardType } from '@/lib/types';
import { api } from '@/lib/api';

interface PaperCardComponentProps {
  paper: Paper;
  paperCard?: PaperCardType | null;
  onAnalysisComplete?: () => void;
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    uploaded: { label: '已上传', className: 'badge-gray' },
    parsing: { label: '解析中', className: 'badge-yellow' },
    parsed: { label: '已解析', className: 'badge-blue' },
    analyzing: { label: '分析中', className: 'badge-yellow' },
    analyzed: { label: '已分析', className: 'badge-green' },
    error: { label: '错误', className: 'badge-red' },
  };

  const config = statusConfig[status] || statusConfig.uploaded;

  return <span className={`badge ${config.className}`}>{config.label}</span>;
}

export default function PaperCardComponent({
  paper,
  paperCard: initialPaperCard,
  onAnalysisComplete,
}: PaperCardComponentProps) {
  const [paperCard, setPaperCard] = useState<PaperCardType | null>(
    initialPaperCard || null
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState(paper.status);

  useEffect(() => {
    setCurrentStatus(paper.status);
  }, [paper.status]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);
    setCurrentStatus('analyzing');

    try {
      const result = await api.analyzePaper(paper.id);
      setPaperCard(result);
      setCurrentStatus('analyzed');
      onAnalysisComplete?.();
    } catch (err: any) {
      setError(err.message || '分析失败，请重试');
      setCurrentStatus('error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 mb-1">
            {paper.title}
          </h4>
          {paper.authors && (
            <p className="text-xs text-gray-500 mb-1 truncate">
              {paper.authors}
            </p>
          )}
          <div className="flex items-center gap-2 text-xs text-gray-400">
            {paper.year && <span>{paper.year}</span>}
            {paper.venue && (
              <>
                <span>·</span>
                <span>{paper.venue}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge status={currentStatus} />
          {currentStatus !== 'analyzed' && (
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="btn-secondary text-xs px-3 py-1"
            >
              {isAnalyzing ? (
                <span className="flex items-center gap-1">
                  <svg
                    className="animate-spin w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  分析中...
                </span>
              ) : (
                '分析'
              )}
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}

      {/* Paper Card Details */}
      {paperCard && (
        <div className="mt-4">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg
              className={`w-3 h-3 transition-transform ${
                showDetails ? 'rotate-90' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            {showDetails ? '收起详情' : '展开详情'}
          </button>

          {showDetails && (
            <div className="mt-3 space-y-4 text-sm">
              {/* Research Problem */}
              <div>
                <h5 className="text-xs font-medium text-gray-700 mb-1">
                  研究问题
                </h5>
                <p className="text-gray-600 text-xs leading-relaxed">
                  {paperCard.research_problem}
                </p>
              </div>

              {/* Method Summary */}
              <div>
                <h5 className="text-xs font-medium text-gray-700 mb-1">
                  方法概述
                </h5>
                <p className="text-gray-600 text-xs leading-relaxed">
                  {paperCard.method_summary}
                </p>
              </div>

              {/* Novelty Points */}
              {paperCard.novelty_points.length > 0 && (
                <div>
                  <h5 className="text-xs font-medium text-gray-700 mb-1">
                    创新点
                  </h5>
                  <ul className="list-disc list-inside space-y-0.5">
                    {paperCard.novelty_points.map((point, i) => (
                      <li key={i} className="text-xs text-gray-600">
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Limitations */}
              {paperCard.limitations.length > 0 && (
                <div>
                  <h5 className="text-xs font-medium text-gray-700 mb-1">
                    局限性
                  </h5>
                  <ul className="list-disc list-inside space-y-0.5">
                    {paperCard.limitations.map((item, i) => (
                      <li key={i} className="text-xs text-gray-600">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Datasets */}
              {paperCard.datasets.length > 0 && (
                <div>
                  <h5 className="text-xs font-medium text-gray-700 mb-1">
                    数据集
                  </h5>
                  <div className="flex flex-wrap gap-1">
                    {paperCard.datasets.map((ds, i) => (
                      <span key={i} className="badge badge-blue text-xs">
                        {ds}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Metrics */}
              {paperCard.metrics.length > 0 && (
                <div>
                  <h5 className="text-xs font-medium text-gray-700 mb-1">
                    评估指标
                  </h5>
                  <div className="flex flex-wrap gap-1">
                    {paperCard.metrics.map((m, i) => (
                      <span key={i} className="badge badge-gray text-xs">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Baselines */}
              {paperCard.baselines.length > 0 && (
                <div>
                  <h5 className="text-xs font-medium text-gray-700 mb-1">
                    基线方法
                  </h5>
                  <div className="flex flex-wrap gap-1">
                    {paperCard.baselines.map((b, i) => (
                      <span key={i} className="badge badge-gray text-xs">
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Main Results */}
              {paperCard.main_results.length > 0 && (
                <div>
                  <h5 className="text-xs font-medium text-gray-700 mb-1">
                    主要结果
                  </h5>
                  <ul className="list-disc list-inside space-y-0.5">
                    {paperCard.main_results.map((r, i) => (
                      <li key={i} className="text-xs text-gray-600">
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Reproducibility */}
              <div>
                <h5 className="text-xs font-medium text-gray-700 mb-1">
                  可复现性
                </h5>
                <p className="text-xs text-gray-600">
                  {paperCard.reproducibility}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
