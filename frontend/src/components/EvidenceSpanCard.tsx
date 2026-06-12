'use client';

import React, { useState } from 'react';
import type { EvidenceSpan } from '@/lib/types';

interface EvidenceSpanCardProps {
  span: EvidenceSpan;
}

const CLAIM_TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  novelty: { label: '创新性', className: 'bg-blue-100 text-blue-700' },
  limitation: { label: '局限性', className: 'bg-red-100 text-red-700' },
  method: { label: '方法', className: 'bg-green-100 text-green-700' },
  result: { label: '结果', className: 'bg-yellow-100 text-yellow-700' },
  dataset: { label: '数据集', className: 'bg-gray-100 text-gray-700' },
};

function ClaimTypeBadge({ type }: { type: string }) {
  const config = CLAIM_TYPE_CONFIG[type] || { label: type, className: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const percentage = Math.round(value * 100);
  const color = percentage >= 80 ? 'bg-green-500' : percentage >= 60 ? 'bg-yellow-500' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">置信度</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-700">{percentage}%</span>
    </div>
  );
}

export default function EvidenceSpanCard({ span }: EvidenceSpanCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <ClaimTypeBadge type={span.claim_type} />
        </div>

        {/* Claim Text */}
        <p className="text-sm text-gray-900 font-medium leading-relaxed">
          {span.claim_text}
        </p>
      </div>

      {/* Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 flex items-center gap-1 transition-colors"
      >
        {isExpanded ? '收起来源' : '查看来源'}
        <svg
          className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Source Details */}
      {isExpanded && (
        <div className="border-t border-gray-100 p-3 bg-gray-50 space-y-3">
          {/* Source Section & Page */}
          <div className="flex flex-wrap gap-3">
            <div>
              <span className="text-xs text-gray-500">来源章节：</span>
              <span className="text-xs font-medium text-gray-700">{span.source_section}</span>
            </div>
            {span.source_page !== null && (
              <div>
                <span className="text-xs text-gray-500">来源页码：</span>
                <span className="text-xs font-medium text-gray-700">第 {span.source_page} 页</span>
              </div>
            )}
          </div>

          {/* Source Text Span */}
          <blockquote className="border-l-2 border-gray-300 pl-3 italic text-xs text-gray-600 leading-relaxed">
            {span.source_text_span}
          </blockquote>

          {/* Confidence */}
          <ConfidenceBar value={span.confidence} />
        </div>
      )}
    </div>
  );
}
