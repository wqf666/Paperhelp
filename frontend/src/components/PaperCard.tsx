'use client';

import React, { useState, useEffect } from 'react';
import type { Paper, PaperCard as PaperCardType } from '@/lib/types';
import { api } from '@/lib/api';
import ChunkViewer from '@/components/ChunkViewer';

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showChunks, setShowChunks] = useState(false);

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

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.deletePaper(paper.id);
      onAnalysisComplete?.();
    } catch (err: any) {
      setDeleteError(err.message || '删除失败，请重试');
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
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

          {/* Delete button */}
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting || isAnalyzing}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="删除论文"
            >
              {isDeleting ? (
                <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
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
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-xs px-2 py-0.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isDeleting ? '删除中...' : '确认删除'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="text-xs px-2 py-0.5 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
              >
                取消
              </button>
            </div>
          )}
        </div>
      </div>

      {deleteError && (
        <p className="mt-2 text-xs text-red-600">{deleteError}</p>
      )}

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

      {/* Parsed Content Viewer */}
      {(paper.pdf_parse_status === 'completed' || paper.pdf_parse_status === 'parsed') && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <button
            onClick={() => setShowChunks(!showChunks)}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            <svg
              className={`w-3 h-3 transition-transform ${showChunks ? 'rotate-90' : ''}`}
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
            {showChunks ? '收起解析内容' : '查看解析内容'}
          </button>
          {showChunks && (
            <div className="mt-3">
              <ChunkViewer paperId={paper.id} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
