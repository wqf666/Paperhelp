'use client';

import React, { useState } from 'react';
import type { ResearchIdea } from '@/lib/types';
import ScoreBar from './ScoreBar';
import RefinementChat from './RefinementChat';

interface IdeaCardProps {
  idea: ResearchIdea;
  onGenerateExperimentPlan?: (ideaId: number) => void;
  isGeneratingPlan?: boolean;
}

function RiskBadge({ level }: { level: string }) {
  const config: Record<string, { label: string; className: string }> = {
    low: { label: '低风险', className: 'badge-green' },
    medium: { label: '中风险', className: 'badge-yellow' },
    high: { label: '高风险', className: 'badge-red' },
  };

  const c = config[level] || config.medium;

  return <span className={`badge ${c.className}`}>{c.label}</span>;
}

export default function IdeaCard({
  idea,
  onGenerateExperimentPlan,
  isGeneratingPlan,
}: IdeaCardProps) {
  const [appliedContent, setAppliedContent] = useState<string | null>(null);

  // Build a structured content string from the idea's key fields for refinement
  const ideaContent = [
    `名称: ${idea.name}`,
    `研究空白: ${idea.research_gap}`,
    `建议方案: ${idea.proposed_solution}`,
    idea.expected_contributions.length > 0
      ? `预期贡献: ${idea.expected_contributions.join('; ')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  const handleApplyRefinement = (newContent: string) => {
    setAppliedContent(newContent);
  };

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h4 className="text-sm font-medium text-gray-900">{idea.name}</h4>
        <RiskBadge level={idea.risk_level} />
      </div>

      {/* Research Gap */}
      <div className="mb-3">
        <h5 className="text-xs font-medium text-gray-500 mb-1">研究空白</h5>
        <p className="text-xs text-gray-700 leading-relaxed">
          {idea.research_gap}
        </p>
      </div>

      {/* Proposed Solution */}
      <div className="mb-4">
        <h5 className="text-xs font-medium text-gray-500 mb-1">建议方案</h5>
        <p className="text-xs text-gray-700 leading-relaxed">
          {idea.proposed_solution}
        </p>
      </div>

      {/* Expected Contributions */}
      {idea.expected_contributions.length > 0 && (
        <div className="mb-4">
          <h5 className="text-xs font-medium text-gray-500 mb-1">
            预期贡献
          </h5>
          <ul className="list-disc list-inside space-y-0.5">
            {idea.expected_contributions.map((c, i) => (
              <li key={i} className="text-xs text-gray-600">
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Scores */}
      <div className="space-y-2 mb-4">
        <ScoreBar label="创新性" value={idea.novelty_score} color="bg-blue-500" />
        <ScoreBar
          label="可行性"
          value={idea.feasibility_score}
          color="bg-green-500"
        />
      </div>

      {/* Experiment Plan Summary */}
      {idea.experiment_plan_summary && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <h5 className="text-xs font-medium text-gray-500 mb-1">
            实验计划摘要
          </h5>
          <p className="text-xs text-gray-600 leading-relaxed">
            {idea.experiment_plan_summary}
          </p>
        </div>
      )}

      {/* Applied refinement result */}
      {appliedContent && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-1.5">
            <h5 className="text-xs font-medium text-blue-700">AI 调整后的内容</h5>
            <button
              onClick={() => setAppliedContent(null)}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              收起
            </button>
          </div>
          <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
            {appliedContent}
          </p>
          <p className="text-[10px] text-gray-400 mt-2">
            请手动复制上述内容以替换原有字段
          </p>
        </div>
      )}

      {/* Action Button */}
      {onGenerateExperimentPlan && (
        <button
          onClick={() => onGenerateExperimentPlan(idea.id)}
          disabled={isGeneratingPlan}
          className="btn-secondary w-full text-xs"
        >
          {isGeneratingPlan ? (
            <span className="flex items-center justify-center gap-1">
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
              生成中...
            </span>
          ) : (
            '生成实验计划'
          )}
        </button>
      )}

      {/* AI Refinement Chat */}
      <RefinementChat
        content={ideaContent}
        contentType="idea"
        onApply={handleApplyRefinement}
        placeholder="例如：让方案更具创新性，或补充可行性分析..."
      />
    </div>
  );
}
