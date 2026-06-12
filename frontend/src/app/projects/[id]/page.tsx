'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { api } from '@/lib/api';
import type { Project } from '@/lib/types';

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = Number(params.id);

  const {
    data: project,
    error,
    isLoading,
  } = useSWR<Project>(
    projectId ? `project-${projectId}` : null,
    () => api.getProject(projectId)
  );

  const tabs = [
    { name: '概览', href: `/projects/${projectId}`, active: true },
    { name: '论文库', href: `/projects/${projectId}/papers`, active: false },
    { name: '创新方向', href: `/projects/${projectId}/ideas`, active: false },
    {
      name: '实验计划',
      href: `/projects/${projectId}/experiments`,
      active: false,
    },
    {
      name: '方法版本',
      href: `/projects/${projectId}/method-versions`,
      active: false,
    },
    {
      name: '审稿模拟',
      href: `/projects/${projectId}/reviewer`,
      active: false,
    },
    {
      name: '论文大纲',
      href: `/projects/${projectId}/manuscript`,
      active: false,
    },
    {
      name: '引用管理',
      href: `/projects/${projectId}/citations`,
      active: false,
    },
    {
      name: '导出',
      href: `/projects/${projectId}/export`,
      active: false,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
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
    );
  }

  if (error || !project) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-gray-600 mb-4">
          项目加载失败或项目不存在
        </p>
        <Link href="/projects" className="btn-secondary">
          返回项目列表
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Back Link */}
      <Link
        href="/projects"
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
        返回项目列表
      </Link>

      {/* Project Header */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          {project.name}
        </h1>
        {project.description && (
          <p className="text-sm text-gray-500 mb-4">{project.description}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {project.target_field && (
            <span className="badge badge-blue">{project.target_field}</span>
          )}
          {project.target_venue && (
            <span className="badge badge-gray">{project.target_venue}</span>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-100 mb-8">
        <nav className="flex gap-1 -mb-px">
          {tabs.map((tab) => (
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

      {/* Overview Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stats */}
        <div className="card p-5">
          <h3 className="text-sm font-medium text-gray-900 mb-4">项目统计</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <p className="text-2xl font-semibold text-gray-900">
                {project.paper_count ?? 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">论文数量</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <p className="text-2xl font-semibold text-gray-900">
                {project.idea_count ?? 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">创新方向</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <p className="text-2xl font-semibold text-gray-900">
                {(project as any).method_version_count ?? 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">方法版本</p>
            </div>
          </div>
        </div>

        {/* Project Info */}
        <div className="card p-5">
          <h3 className="text-sm font-medium text-gray-900 mb-4">项目信息</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-xs text-gray-500">创建时间</dt>
              <dd className="text-sm text-gray-700">
                {new Date(project.created_at).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </dd>
            </div>
            {project.target_field && (
              <div>
                <dt className="text-xs text-gray-500">研究领域</dt>
                <dd className="text-sm text-gray-700">
                  {project.target_field}
                </dd>
              </div>
            )}
            {project.target_venue && (
              <div>
                <dt className="text-xs text-gray-500">目标投稿</dt>
                <dd className="text-sm text-gray-700">
                  {project.target_venue}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Quick Actions */}
        <div className="card p-5 md:col-span-2">
          <h3 className="text-sm font-medium text-gray-900 mb-4">快速操作</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Link
              href={`/projects/${projectId}/papers`}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-4 h-4 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">管理论文</p>
                <p className="text-xs text-gray-500">添加并分析论文</p>
              </div>
            </Link>

            <Link
              href={`/projects/${projectId}/ideas`}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-4 h-4 text-amber-600"
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
              <div>
                <p className="text-sm font-medium text-gray-900">创新方向</p>
                <p className="text-xs text-gray-500">发现和评估创新点</p>
              </div>
            </Link>

            <Link
              href={`/projects/${projectId}/experiments`}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-4 h-4 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">实验计划</p>
                <p className="text-xs text-gray-500">制定实验方案</p>
              </div>
            </Link>

            <Link
              href={`/projects/${projectId}/method-versions`}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-4 h-4 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">方法版本</p>
                <p className="text-xs text-gray-500">追踪方法演进</p>
              </div>
            </Link>

            <Link
              href={`/projects/${projectId}/reviewer`}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <div className="w-8 h-8 bg-rose-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-4 h-4 text-rose-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">审稿模拟</p>
                <p className="text-xs text-gray-500">获取审稿意见</p>
              </div>
            </Link>

            <Link
              href={`/projects/${projectId}/manuscript`}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-4 h-4 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">论文大纲</p>
                <p className="text-xs text-gray-500">生成论文结构</p>
              </div>
            </Link>

            <Link
              href={`/projects/${projectId}/citations`}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-4 h-4 text-teal-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">引用管理</p>
                <p className="text-xs text-gray-500">管理参考文献</p>
              </div>
            </Link>

            <Link
              href={`/projects/${projectId}/export`}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <div className="w-8 h-8 bg-cyan-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-4 h-4 text-cyan-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">导出论文</p>
                <p className="text-xs text-gray-500">Word / LaTeX / PDF</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
