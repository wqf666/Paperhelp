'use client';

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import useSWR, { mutate } from 'swr';
import { api } from '@/lib/api';
import type { ResearchIdea, Paper } from '@/lib/types';
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
  const [confirmDeleteIdeaId, setConfirmDeleteIdeaId] = useState<number | null>(null);
  const [deletingIdeaId, setDeletingIdeaId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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

  // Fetch papers for this project to show status
  const { data: papers } = useSWR<Paper[]>(
    projectId ? `papers-${projectId}` : null,
    () => api.listPapers(projectId)
  );

  // Compute paper analysis stats
  const paperStats = useMemo(() => {
    if (!papers || papers.length === 0) return { total: 0, analyzed: 0, unanalyzed: 0 };
    const analyzed = papers.filter(
      (p) => p.status === 'analyzed' || (p as any).paper_card != null
    ).length;
    return { total: papers.length, analyzed, unanalyzed: papers.length - analyzed };
  }, [papers]);

  const hasAnalyzedPapers = paperStats.analyzed > 0;

  const handleGenerateIdeas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAnalyzedPapers) return;
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
    setActionError(null);

    try {
      await api.generateExperimentPlan(ideaId);
      mutate(`ideas-${projectId}`);
    } catch (err: any) {
      setActionError('生成实验计划失败: ' + (err.message || '未知错误'));
    } finally {
      setGeneratingPlanIdeaId(null);
    }
  };

  const handleDifferentiationCheck = async (ideaId: number) => {
    setCheckingDiffIdeaId(ideaId);
    setActionError(null);
    try {
      const result = await api.checkDifferentiation(ideaId);
      setDiffResults((prev) => ({ ...prev, [ideaId]: result }));
      setExpandedDiffIdeaId(ideaId);
    } catch (err: any) {
      setActionError('差异性检查失败: ' + (err.message || '未知错误'));
    } finally {
      setCheckingDiffIdeaId(null);
    }
  };

  const handleDeleteIdea = async (ideaId: number) => {
    setDeletingIdeaId(ideaId);
    setActionError(null);
    try {
      await api.deleteIdea(ideaId);
      mutate(`ideas-${projectId}`);
      setConfirmDeleteIdeaId(null);
    } catch (err: any) {
      setActionError('删除创新方向失败: ' + (err.message || '未知错误'));
    } finally {
      setDeletingIdeaId(null);
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
          基于论文库中上传的论文分析，发现潜在的研究创新点
        </p>
      </div>

      {/* Paper Status Banner */}
      {paperStats.total === 0 ? (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-blue-800 mb-1">请先上传论文</h4>
              <p className="text-xs text-blue-600 leading-relaxed">
                创新方向的生成基于论文库中上传并分析过的论文。请先前往论文库上传相关领域论文，并进行 AI 分析，再回来生成创新方向。
              </p>
              <Link
                href={`/projects/${projectId}/papers`}
                className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-blue-700 hover:text-blue-900 transition-colors"
              >
                前往论文库
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      ) : paperStats.analyzed === 0 ? (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-amber-800 mb-1">论文尚未分析</h4>
              <p className="text-xs text-amber-600 leading-relaxed">
                论文库中已有 {paperStats.total} 篇论文，但尚未进行 AI 分析。请先对论文进行分析，AI 将从论文内容中提炼研究空白和局限性，据此生成创新方向。
              </p>
              <Link
                href={`/projects/${projectId}/papers`}
                className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-amber-700 hover:text-amber-900 transition-colors"
              >
                前往分析论文
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6 p-3 bg-green-50 border border-green-100 rounded-lg flex items-center gap-3">
          <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-xs text-green-700">
            已分析 <span className="font-semibold">{paperStats.analyzed}</span> 篇论文
            {paperStats.unanalyzed > 0 && (
              <span className="text-green-500 ml-1">（另有 {paperStats.unanalyzed} 篇待分析）</span>
            )}
            <span className="mx-1">·</span>
            AI 将从这些论文的研究空白和局限性出发，生成创新方向
          </p>
        </div>
      )}

      {/* Generate Form */}
      <div className="card p-5 mb-8">
        <h3 className="text-sm font-medium text-gray-900 mb-1">
          生成创新方向
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          AI 将分析论文库中已分析的论文，识别研究空白，生成 2-3 个创新方向
        </p>
        <form onSubmit={handleGenerateIdeas} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              研究方向 <span className="text-gray-400 font-normal">(可选，补充说明你的研究侧重)</span>
            </label>
            <input
              type="text"
              placeholder="例如：大语言模型的幻觉问题、多模态融合（不填则自动从论文中推断）"
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
            disabled={isGenerating || !hasAnalyzedPapers}
            className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
            ) : !hasAnalyzedPapers ? (
              '请先上传并分析论文'
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
            {hasAnalyzedPapers
              ? '点击上方按钮，AI 将根据已分析的论文生成创新方向'
              : '请先上传并分析论文，再生成创新方向'}
          </p>
        </div>
      )}

      {/* Action Error Message */}
      {actionError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2">
          <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-red-700 flex-1">{actionError}</p>
          <button
            onClick={() => setActionError(null)}
            className="text-red-400 hover:text-red-600 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Ideas List */}
      {!isLoading && !error && ideas && ideas.length > 0 && (
        <div className="space-y-4">
          {ideas.map((idea) => {
            const diffResult = diffResults[idea.id];
            const isDiffExpanded = expandedDiffIdeaId === idea.id;
            const isDeleting = deletingIdeaId === idea.id;
            const isConfirming = confirmDeleteIdeaId === idea.id;

            return (
              <div key={idea.id}>
                <IdeaCard
                  idea={idea}
                  onGenerateExperimentPlan={handleGenerateExperimentPlan}
                  isGeneratingPlan={generatingPlanIdeaId === idea.id}
                />

                {/* Action Buttons Row */}
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

                  {/* Delete Button */}
                  <div className="ml-auto">
                    {isConfirming ? (
                      <span className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-600">确认删除?</span>
                        <button
                          onClick={() => handleDeleteIdea(idea.id)}
                          disabled={isDeleting}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded transition-colors disabled:opacity-50"
                        >
                          {isDeleting ? (
                            <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          ) : (
                            '删除'
                          )}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteIdeaId(null)}
                          disabled={isDeleting}
                          className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded transition-colors"
                        >
                          取消
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteIdeaId(idea.id)}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="删除"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
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
