'use client';

import React, { useState } from 'react';
import type { ReviewerSimulation } from '@/lib/types';
import ScoreBar from './ScoreBar';

interface ReviewerCardProps {
  simulation: ReviewerSimulation;
}

const RECOMMENDATION_CONFIG: Record<string, { label: string; className: string }> = {
  accept: { label: '接受', className: 'bg-green-100 text-green-700' },
  minor_revision: { label: '小修', className: 'bg-blue-100 text-blue-700' },
  major_revision: { label: '大修', className: 'bg-yellow-100 text-yellow-700' },
  reject: { label: '拒绝', className: 'bg-red-100 text-red-700' },
  borderline: { label: '边界', className: 'bg-gray-100 text-gray-700' },
};

function RecommendationBadge({ recommendation }: { recommendation: string }) {
  const config = RECOMMENDATION_CONFIG[recommendation] || {
    label: recommendation,
    className: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const config: Record<string, { label: string; className: string }> = {
    major: { label: '主要', className: 'bg-red-100 text-red-700' },
    minor: { label: '次要', className: 'bg-yellow-100 text-yellow-700' },
  };
  const c = config[severity] || { label: severity, className: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${c.className}`}>
      {c.label}
    </span>
  );
}

interface CollapsibleSectionProps {
  title: string;
  items: any[];
  defaultOpen?: boolean;
}

function CollapsibleSection({ title, items, defaultOpen = false }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (!items || items.length === 0) return null;

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-xs font-medium text-gray-700">
          {title}（{items.length}）
        </span>
        <svg
          className={`w-3 h-3 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="border-t border-gray-100 p-3 bg-gray-50 space-y-3">
          {items.map((item, i) => {
            const concern = typeof item === 'string' ? { concern: item } : item;
            return (
              <div key={i} className="p-2 bg-white rounded-lg border border-gray-50">
                <div className="flex items-start gap-2 mb-1">
                  {concern.severity && <SeverityBadge severity={concern.severity} />}
                  <p className="text-xs text-gray-700 flex-1">
                    {concern.concern || concern.text || (typeof item === 'string' ? item : JSON.stringify(item))}
                  </p>
                </div>
                {concern.suggestion && (
                  <p className="text-xs text-gray-500 mt-1 pl-1 border-l border-gray-200 ml-1">
                    建议：{concern.suggestion}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ReviewerCard({ simulation }: ReviewerCardProps) {
  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-1">
            {simulation.reviewer_role}
          </h4>
          <p className="text-xs text-gray-500">
            专业领域：{simulation.expertise_area}
          </p>
        </div>
        <RecommendationBadge recommendation={simulation.recommendation} />
      </div>

      {/* Overall Score */}
      <div className="mb-4">
        <ScoreBar
          label="总评分"
          value={simulation.overall_score}
          color={
            simulation.overall_score >= 7
              ? 'bg-green-500'
              : simulation.overall_score >= 5
              ? 'bg-yellow-500'
              : 'bg-red-500'
          }
        />
      </div>

      {/* Overall Assessment */}
      <div className="mb-4">
        <h5 className="text-xs font-medium text-gray-500 mb-1">总体评价</h5>
        <p className="text-xs text-gray-700 leading-relaxed">
          {simulation.overall_assessment}
        </p>
      </div>

      {/* Concern Sections */}
      <div className="space-y-2 mb-4">
        <CollapsibleSection title="创新性关注" items={simulation.novelty_concerns} />
        <CollapsibleSection title="方法关注" items={simulation.method_concerns} />
        <CollapsibleSection title="实验关注" items={simulation.experiment_concerns} />
        <CollapsibleSection title="写作关注" items={simulation.writing_concerns} />
      </div>

      {/* Major Issues */}
      {simulation.major_issues && simulation.major_issues.length > 0 && (
        <div className="mb-3">
          <h5 className="text-xs font-medium text-red-600 mb-1">主要问题</h5>
          <ul className="space-y-1">
            {simulation.major_issues.map((issue, i) => (
              <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                <span className="text-red-400 mt-0.5">&#9679;</span>
                <span>{typeof issue === 'string' ? issue : JSON.stringify(issue)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Minor Issues */}
      {simulation.minor_issues && simulation.minor_issues.length > 0 && (
        <div className="mb-3">
          <h5 className="text-xs font-medium text-yellow-600 mb-1">次要问题</h5>
          <ul className="space-y-1">
            {simulation.minor_issues.map((issue, i) => (
              <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                <span className="text-yellow-400 mt-0.5">&#9679;</span>
                <span>{typeof issue === 'string' ? issue : JSON.stringify(issue)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggested Experiments */}
      {simulation.suggested_experiments && simulation.suggested_experiments.length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-gray-500 mb-1">建议实验</h5>
          <ul className="space-y-1">
            {simulation.suggested_experiments.map((exp, i) => (
              <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                <span className="text-blue-400 mt-0.5">&#9656;</span>
                <span>{typeof exp === 'string' ? exp : JSON.stringify(exp)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
