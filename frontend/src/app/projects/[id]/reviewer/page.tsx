'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import useSWR, { mutate } from 'swr';
import { api } from '@/lib/api';
import type { ReviewerSimulation } from '@/lib/types';
import ReviewerCard from '@/components/ReviewerCard';
import ComplianceBanner from '@/components/ComplianceBanner';

export default function ReviewerPage() {
  const params = useParams();
  const projectId = Number(params.id);

  const [numReviewers, setNumReviewers] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const {
    data: simulations,
    error,
    isLoading,
  } = useSWR<ReviewerSimulation[]>(
    projectId ? `reviewer-simulations-${projectId}` : null,
    () => api.listReviewerSimulations(projectId)
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
            disabled={isGenerating}
            className="btn-primary text-sm"
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
        </div>

        {generateError && (
          <p className="text-xs text-red-600 mt-3">{generateError}</p>
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
            点击"开始生成"获取 AI 模拟审稿意见
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
