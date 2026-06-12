'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';
import type { PaperChunk } from '@/lib/types';

interface ChunkViewerProps {
  paperId: number;
}

const CHUNK_TYPE_COLORS: Record<string, string> = {
  abstract: 'bg-blue-100 text-blue-700',
  introduction: 'bg-purple-100 text-purple-700',
  method: 'bg-green-100 text-green-700',
  experiment: 'bg-yellow-100 text-yellow-700',
  result: 'bg-orange-100 text-orange-700',
  conclusion: 'bg-gray-100 text-gray-700',
  reference: 'bg-slate-100 text-slate-700',
};

function ChunkTypeBadge({ type }: { type: string }) {
  const colors = CHUNK_TYPE_COLORS[type] || 'bg-gray-100 text-gray-600';
  const labels: Record<string, string> = {
    abstract: '摘要',
    introduction: '引言',
    method: '方法',
    experiment: '实验',
    result: '结果',
    conclusion: '结论',
    reference: '参考文献',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors}`}>
      {labels[type] || type}
    </span>
  );
}

export default function ChunkViewer({ paperId }: ChunkViewerProps) {
  const [expandedChunkId, setExpandedChunkId] = useState<number | null>(null);

  const {
    data: chunks,
    error,
    isLoading,
  } = useSWR<PaperChunk[]>(
    paperId ? `chunks-${paperId}` : null,
    () => api.getPaperChunks(paperId)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <svg
          className="animate-spin w-5 h-5 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="ml-2 text-sm text-gray-500">加载文本块...</span>
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-xs text-red-600 py-4 text-center">加载文本块失败</p>
    );
  }

  if (!chunks || chunks.length === 0) {
    return (
      <p className="text-xs text-gray-500 py-4 text-center">暂无文本块数据</p>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-gray-700 mb-2">
        论文文本块（共 {chunks.length} 块）
      </h4>
      {chunks.map((chunk) => {
        const isExpanded = expandedChunkId === chunk.id;
        const previewLength = 150;
        const needsTruncation = chunk.content.length > previewLength;

        return (
          <div
            key={chunk.id}
            className="border border-gray-100 rounded-lg overflow-hidden"
          >
            <button
              onClick={() => setExpandedChunkId(isExpanded ? null : chunk.id)}
              className="w-full flex items-start justify-between p-3 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <ChunkTypeBadge type={chunk.chunk_type} />
                  <span className="text-xs text-gray-500 font-medium">
                    {chunk.section_title}
                  </span>
                </div>
                <p className="text-xs text-gray-600 line-clamp-2">
                  {isExpanded || !needsTruncation
                    ? chunk.content
                    : `${chunk.content.slice(0, previewLength)}...`}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 ml-3 flex-shrink-0">
                {chunk.start_page !== null && (
                  <span className="text-xs text-gray-400">
                    第 {chunk.start_page}
                    {chunk.end_page !== null && chunk.end_page !== chunk.start_page
                      ? `-${chunk.end_page}`
                      : ''}
                    {' '}页
                  </span>
                )}
                <svg
                  className={`w-3 h-3 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-gray-100 p-3 bg-gray-50">
                <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {chunk.content}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
