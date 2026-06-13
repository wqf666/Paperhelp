'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import useSWR, { mutate } from 'swr';
import { api } from '@/lib/api';
import type { ReviewerSimulation, Paper, ManuscriptState } from '@/lib/types';
import ReviewerCard from '@/components/ReviewerCard';
import ComplianceBanner from '@/components/ComplianceBanner';

export default function ReviewerPage() {
  const params = useParams();
  const projectId = Number(params.id);

  const [numReviewers, setNumReviewers] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);

  const {
    data: simulations,
    error,
    isLoading,
  } = useSWR<ReviewerSimulation[]>(
    projectId ? `reviewer-simulations-${projectId}` : null,
    () => api.listReviewerSimulations(projectId)
  );

  const { data: papers } = useSWR(
    projectId ? `papers-${projectId}` : null,
    () => api.listPapers(projectId),
    { onError: () => {} }
  );

  const { data: manuscript } = useSWR(
    projectId ? `manuscript-${projectId}` : null,
    () => api.getManuscript(projectId),
    { onError: () => {} }
  );

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerateError(null);

    try {
      await api.generateReviewerSimulation(projectId, numReviewers);
      mutate(`reviewer-simulations-${projectId}`);
    } catch (err: any) {
      setGenerateError(err.message || '生成失败');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClear = async () => {
    setIsClearing(true);
    setClearError(null);
    try {
      await api.deleteReviewerSimulations(projectId);
      mutate(`reviewer-simulations-${projectId}`);
      setShowClearConfirm(false);
    } catch (err: any) {
      setClearError(err.message || '清除失败');
    } finally {
      setIsClearing(false);
    }
  };

  // Check prerequisites for reviewer simulation
  const analyzedPapers = papers?.filter((p: any) => p.status === 'analyzed') || [];
  const hasAnalyzedPapers = analyzedPapers.length > 0;
  const hasManuscriptOutline = manuscript?.outline && manuscript.outline.length > 0;
  const canGenerateReview = hasAnalyzedPapers || hasManuscriptOutline;

  const tabs = [
    { name: '概览', href: `/projects/${projectId}` },
    { name: '论文库', href: `/projects/${projectId}/papers` },
    { name: '创新方向', href: `/projects/${projectId}/ideas` },
    { name: '实验计划', href: `/projects/${projectId}/experiments` },
    { name: '方法版本', href: `/projects/${projectId}/method-versions` },
    { name: '审稿模拟', href: `/projects/${projectId}/reviewer`, active: true },
    { name: '论文大纲', href: `/projects/${projectId}/manuscript` },
    { name: '引用管理', href: `/projects/${projectId}/citations` },
    { name: '导出', href: `/projects/${projectId}/export` },
  ];

  return (
    <div>
      {/* Back Link */}
      <Link
        href={`/projects/${projectId}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        返回项目
      </Link>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-100 mb-8">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {tabs.map((tab) => (
            <Link
              key={tab.name}
              href={tab.href}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
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
          message="审稿意见由 AI 模拟生成，仅供参考"
        />
      </div>

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">审稿模拟</h2>
        <p className="text-sm text-gray-500 mt-1">
          模拟审稿人视角，评估研究质量并获取改进建议
        </p>
      </div>

      {/* Generate Controls */}
      <div className="card p-5 mb-8">
        <h3 className="text-sm font-medium text-gray-900 mb-4">
          生成审稿意见
        </h3>

        {/* Prerequisite Check */}
        {!canGenerateReview && !isLoading && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-100 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-amber-800 mb-1">尚不满足审稿模拟条件</h4>
                <p className="text-xs text-amber-600 leading-relaxed mb-2">
                  审稿模拟需要基于已分析的论文内容或完善的论文大纲来进行。请至少满足以下条件之一：
                </p>
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${hasAnalyzedPapers ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                      {hasAnalyzedPapers ? '✓' : '○'}
                    </span>
                    <span className="text-xs text-gray-700">上传并分析至少一篇论文</span>
                    {!hasAnalyzedPapers && (
                      <Link
                        href={`/projects/${projectId}/papers`}
                        className="text-xs text-amber-700 hover:text-amber-900 font-medium"
                      >
                        前往论文库 →
                      </Link>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${hasManuscriptOutline ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                      {hasManuscriptOutline ? '✓' : '○'}
                    </span>
                    <span className="text-xs text-gray-700">完成论文大纲的生成与编辑</span>
                    {!hasManuscriptOutline && (
                      <Link
                        href={`/projects/${projectId}/manuscript`}
                        className="text-xs text-amber-700 hover:text-amber-900 font-medium"
                      >
                        前往论文大纲 →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Prerequisites met indicator */}
        {canGenerateReview && (
          <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-lg flex items-center gap-3">
            <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-xs text-green-700">
              {hasAnalyzedPapers && <span>已分析 <span className="font-semibold">{analyzedPapers.length}</span> 篇论文</span>}
              {hasAnalyzedPapers && hasManuscriptOutline && <span className="mx-1">·</span>}
              {hasManuscriptOutline && <span>论文大纲已就绪</span>}
              <span className="mx-1">·</span>
              可以开始审稿模拟
            </p>
          </div>
        )}

        <div className="flex items-end gap-4">
          <div className="w-40">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              审稿人数量
            </label>
            <select
              className="input-field"
              value={numReviewers}
              onChange={(e) => setNumReviewers(parseInt(e.target.value, 10))}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} 位审稿人
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !canGenerateReview}
            className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <span className="flex items-center gap-1">
                <svg
                  className="animate-spin w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                生成中...
              </span>
            ) : (
              '开始生成'
            )}
          </button>

          {simulations && simulations.length > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              {!showClearConfirm ? (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  disabled={isClearing || isGenerating}
                  className="btn-secondary text-sm text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-50"
                >
                  清除全部
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">确认清除所有审稿意见？</span>
                  <button
                    onClick={handleClear}
                    disabled={isClearing}
                    className="text-xs px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {isClearing ? '清除中...' : '确认清除'}
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    disabled={isClearing}
                    className="text-xs px-3 py-1.5 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
                  >
                    取消
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {generateError && (
          <p className="text-xs text-red-600 mt-3">{generateError}</p>
        )}
        {clearError && (
          <p className="text-xs text-red-600 mt-3">{clearError}</p>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <svg className="animate-spin w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm text-gray-500">加载审稿意见...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <p className="text-sm text-gray-600 mb-4">加载审稿意见失败</p>
          <button
            onClick={() => mutate(`reviewer-simulations-${projectId}`)}
            className="btn-secondary text-sm"
          >
            重试
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && simulations && simulations.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-50 rounded-full mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-sm text-gray-600 mb-2">还没有审稿意见</p>
          <p className="text-xs text-gray-400">
            {canGenerateReview
              ? '点击"开始生成"获取 AI 模拟审稿意见'
              : '请先上传并分析论文，或完善论文大纲后再进行审稿模拟'}
          </p>
        </div>
      )}

      {/* Simulations List */}
      {!isLoading && !error && simulations && simulations.length > 0 && (
        <div className="space-y-6">
          {simulations.map((sim) => (
            <ReviewerCard key={sim.id} simulation={sim} />
          ))}
        </div>
      )}
    </div>
  );
}
