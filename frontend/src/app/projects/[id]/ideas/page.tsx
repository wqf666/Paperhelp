'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import useSWR, { mutate } from 'swr';
import { api } from '@/lib/api';
import type { ResearchIdea } from '@/lib/types';
import IdeaCard from '@/components/IdeaCard';
import ComplianceBanner from '@/components/ComplianceBanner';

export default function IdeasPage() {
  const params = useParams();
  const projectId = Number(params.id);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generatingPlanIdeaId, setGeneratingPlanIdeaId] = useState<
    number | null
  >(null);
  const [checkingDiffIdeaId, setCheckingDiffIdeaId] = useState<number | null>(null);
  const [diffResults, setDiffResults] = useState<Record<number, any>>({});
  const [expandedDiffIdeaId, setExpandedDiffIdeaId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    research_field: '',
    additional_context: '',
  });

  const {
    data: ideas,
    error,
    isLoading,
  } = useSWR<ResearchIdea[]>(
    projectId ? `ideas-${projectId}` : null,
    () => api.listIdeas(projectId)
  );

  const handleGenerateIdeas = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setGenerateError(null);

    try {
      const payload: { research_field: string; additional_context?: string } = {
        research_field: formData.research_field,
      };
      if (formData.additional_context.trim()) {
        payload.additional_context = formData.additional_context.trim();
      }

      await api.generateIdeas(projectId, payload);
      mutate(`ideas-${projectId}`);
      setFormData({ research_field: '', additional_context: '' });
    } catch (err: any) {
      setGenerateError(err.message || '生成失败');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateExperimentPlan = async (ideaId: number) => {
    setGeneratingPlanIdeaId(ideaId);

    try {
      await api.generateExperimentPlan(ideaId);
      mutate(`ideas-${projectId}`);
    } catch (err: any) {
      alert('生成实验计划失败: ' + (err.message || '未知错误'));
    } finally {
      setGeneratingPlanIdeaId(null);
    }
  };

  const handleDifferentiationCheck = async (ideaId: number) => {
    setCheckingDiffIdeaId(ideaId);
    try {
      const result = await api.checkDifferentiation(ideaId);
      setDiffResults((prev) => ({ ...prev, [ideaId]: result }));
      setExpandedDiffIdeaId(ideaId);
    } catch (err: any) {
      alert('差异性检查失败: ' + (err.message || '未知错误'));
    } finally {
      setCheckingDiffIdeaId(null);
    }
  };

  return (
    <div>
      {/* Back Link */}
      <Link
        href={`/projects/${projectId}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        返回项目
      </Link>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-100 mb-8">
        <nav className="flex gap-1 -mb-px">
          {[
            { name: '概览', href: `/projects/${projectId}` },
            { name: '论文库', href: `/projects/${projectId}/papers` },
            { name: '创新方向', href: `/projects/${projectId}/ideas`, active: true },
            { name: '实验计划', href: `/projects/${projectId}/experiments` },
            { name: '方法版本', href: `/projects/${projectId}/method-versions` },
            { name: '审稿模拟', href: `/projects/${projectId}/reviewer` },
            { name: '论文大纲', href: `/projects/${projectId}/manuscript` },
            { name: '引用管理', href: `/projects/${projectId}/citations` },
            { name: '导出', href: `/projects/${projectId}/export` },
          ].map((tab) => (
            <Link
              key={tab.name}
              href={tab.href}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab.active
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
              }`}
            >
              {tab.name}
            </Link>
          ))}
        </nav>
      </div>

      {/* Compliance Banner */}
      <div className="mb-6">
        <ComplianceBanner
          type="warning"
          message="创新方向由 AI 辅助生成，创新性和可行性评分仅供参考。请在深入研究后确认方向的科学价值。"
        />
      </div>

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">创新方向</h2>
        <p className="text-sm text-gray-500 mt-1">
          基于项目论文分析，发现潜在的研究创新点
        </p>
      </div>

      {/* Generate Form */}
      <div className="card p-5 mb-8">
        <h3 className="text-sm font-medium text-gray-900 mb-4">
          生成创新方向
        </h3>
        <form onSubmit={handleGenerateIdeas} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              研究方向 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="例如：大语言模型的幻觉问题、多模态融合"
              className="input-field"
              value={formData.research_field}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  research_field: e.target.value,
                })
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              补充说明
            </label>
            <textarea
              placeholder="可以提供更多背景信息，例如你的研究兴趣、已有资源、特定约束等..."
              className="textarea-field"
              rows={3}
              value={formData.additional_context}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  additional_context: e.target.value,
                })
              }
            />
          </div>

          {generateError && (
            <p className="text-xs text-red-600">{generateError}</p>
          )}

          <button
            type="submit"
            disabled={isGenerating || !formData.research_field.trim()}
            className="btn-primary text-sm"
          >
            {isGenerating ? (
              <span className="flex items-center gap-1">
                <svg
                  className="animate-spin w-4 h-4"
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
              '生成创新方向'
            )}
          </button>
        </form>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <svg
            className="animate-spin w-6 h-6 text-gray-400"
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
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <p className="text-sm text-gray-600 mb-4">加载创新方向失败</p>
          <button
            onClick={() => mutate(`ideas-${projectId}`)}
            className="btn-secondary text-sm"
          >
            重试
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && ideas && ideas.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-50 rounded-full mb-4">
            <svg
              className="w-6 h-6 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-600 mb-2">还没有创新方向</p>
          <p className="text-xs text-gray-400">
            在上方表单中输入研究方向，生成创新点
          </p>
        </div>
      )}

      {/* Ideas List */}
      {!isLoading && !error && ideas && ideas.length > 0 && (
        <div className="space-y-4">
          {ideas.map((idea) => {
            const diffResult = diffResults[idea.id];
            const isDiffExpanded = expandedDiffIdeaId === idea.id;

            return (
              <div key={idea.id}>
                <IdeaCard
                  idea={idea}
                  onGenerateExperimentPlan={handleGenerateExperimentPlan}
                  isGeneratingPlan={generatingPlanIdeaId === idea.id}
                />

                {/* Differentiation Check Button */}
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => handleDifferentiationCheck(idea.id)}
                    disabled={checkingDiffIdeaId === idea.id}
                    className="btn-secondary text-xs"
                  >
                    {checkingDiffIdeaId === idea.id ? (
                      <span className="flex items-center gap-1">
                        <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        检查中...
                      </span>
                    ) : (
                      '差异性检查'
                    )}
                  </button>
                  {diffResult && (
                    <button
                      onClick={() =>
                        setExpandedDiffIdeaId(isDiffExpanded ? null : idea.id)
                      }
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      {isDiffExpanded ? '收起结果' : '查看结果'}
                    </button>
                  )}
                </div>

                {/* Differentiation Results */}
                {diffResult && isDiffExpanded && (
                  <div className="card p-4 mt-2">
                    <h5 className="text-xs font-medium text-gray-700 mb-3">
                      差异性分析结果
                    </h5>

                    {/* Confidence */}
                    {diffResult.confidence !== undefined && (
                      <div className="mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">置信度</span>
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-xs">
                            <div
                              className={`h-full rounded-full ${
                                diffResult.confidence >= 0.7
                                  ? 'bg-green-500'
                                  : diffResult.confidence >= 0.5
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{
                                width: `${Math.round(diffResult.confidence * 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-700">
                            {Math.round(diffResult.confidence * 100)}%
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Differentiation Points */}
                    {diffResult.differentiation_points &&
                      diffResult.differentiation_points.length > 0 && (
                        <div className="mb-3">
                          <h6 className="text-xs font-medium text-gray-500 mb-1">
                            差异点
                          </h6>
                          <ul className="space-y-1">
                            {diffResult.differentiation_points.map(
                              (point: string, i: number) => (
                                <li
                                  key={i}
                                  className="text-xs text-gray-600 flex items-start gap-1.5"
                                >
                                  <span className="text-green-400 mt-0.5">&#9679;</span>
                                  <span>{point}</span>
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}

                    {/* Similar Papers */}
                    {diffResult.similar_papers &&
                      diffResult.similar_papers.length > 0 && (
                        <div>
                          <h6 className="text-xs font-medium text-gray-500 mb-1">
                            相似论文
                          </h6>
                          <div className="space-y-2">
                            {diffResult.similar_papers.map(
                              (paper: any, i: number) => (
                                <div
                                  key={i}
                                  className="p-2 bg-gray-50 rounded-lg"
                                >
                                  <p className="text-xs text-gray-700 font-medium">
                                    {typeof paper === 'string'
                                      ? paper
                                      : paper.title || JSON.stringify(paper)}
                                  </p>
                                  {paper.similarity !== undefined && (
                                    <p className="text-xs text-gray-500 mt-0.5">
                                      相似度：{Math.round(paper.similarity * 100)}%
                                    </p>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
