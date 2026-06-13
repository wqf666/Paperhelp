'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import useSWR, { mutate } from 'swr';
import { api } from '@/lib/api';
import type { MethodVersion, ResearchIdea } from '@/lib/types';
import MethodVersionCard from '@/components/MethodVersionCard';
import ComplianceBanner from '@/components/ComplianceBanner';

export default function MethodVersionsPage() {
  const params = useParams();
  const projectId = Number(params.id);

  const [showForm, setShowForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<number | null>(null);
  const [activatingId, setActivatingId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    key_changes: '',
    rationale: '',
    parent_version_id: '',
    based_on_idea_id: '',
  });

  const {
    data: versions,
    error,
    isLoading,
  } = useSWR<MethodVersion[]>(
    projectId ? `method-versions-${projectId}` : null,
    () => api.listMethodVersions(projectId)
  );

  const { data: ideas } = useSWR<ResearchIdea[]>(
    projectId ? `ideas-${projectId}` : null,
    () => api.listIdeas(projectId)
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setCreateError(null);

    try {
      const payload: {
        name: string;
        description?: string;
        key_changes?: string[];
        rationale?: string;
        parent_version_id?: number;
        based_on_idea_id?: number;
      } = { name: formData.name };

      if (formData.description.trim()) payload.description = formData.description.trim();
      if (formData.key_changes.trim()) {
        payload.key_changes = formData.key_changes
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
      }
      if (formData.rationale.trim()) payload.rationale = formData.rationale.trim();
      if (formData.parent_version_id) payload.parent_version_id = parseInt(formData.parent_version_id, 10);
      if (formData.based_on_idea_id) payload.based_on_idea_id = parseInt(formData.based_on_idea_id, 10);

      await api.createMethodVersion(projectId, payload);
      setFormData({
        name: '',
        description: '',
        key_changes: '',
        rationale: '',
        parent_version_id: '',
        based_on_idea_id: '',
      });
      setShowForm(false);
      mutate(`method-versions-${projectId}`);
    } catch (err: any) {
      setCreateError(err.message || '创建失败');
    } finally {
      setIsCreating(false);
    }
  };

  const handleArchive = async (versionId: number) => {
    if (!confirm('确定要归档此方法版本吗？')) return;
    setArchivingId(versionId);
    try {
      await api.archiveMethodVersion(projectId, versionId);
      mutate(`method-versions-${projectId}`);
    } catch (err: any) {
      alert('归档失败: ' + (err.message || '未知错误'));
    } finally {
      setArchivingId(null);
    }
  };

  const handleActivate = async (versionId: number) => {
    setActivatingId(versionId);
    try {
      await api.activateMethodVersion(projectId, versionId);
      mutate(`method-versions-${projectId}`);
      mutate(`project-${projectId}`);
    } catch (err: any) {
      alert('激活失败: ' + (err.message || '未知错误'));
    } finally {
      setActivatingId(null);
    }
  };

  const handleUpdate = async (versionId: number, data: { name?: string; description?: string; key_changes?: string[]; rationale?: string }) => {
    setUpdatingId(versionId);
    try {
      await api.updateMethodVersion(projectId, versionId, data);
      mutate(`method-versions-${projectId}`);
    } catch (err: any) {
      alert('更新失败: ' + (err.message || '未知错误'));
      throw err;
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (versionId: number) => {
    setDeletingId(versionId);
    try {
      await api.deleteMethodVersion(projectId, versionId);
      mutate(`method-versions-${projectId}`);
      mutate(`project-${projectId}`);
    } catch (err: any) {
      alert('删除失败: ' + (err.message || '未知错误'));
    } finally {
      setDeletingId(null);
    }
  };

  const tabs = [
    { name: '概览', href: `/projects/${projectId}` },
    { name: '论文库', href: `/projects/${projectId}/papers` },
    { name: '创新方向', href: `/projects/${projectId}/ideas` },
    { name: '实验计划', href: `/projects/${projectId}/experiments` },
    { name: '方法版本', href: `/projects/${projectId}/method-versions`, active: true },
    { name: '审稿模拟', href: `/projects/${projectId}/reviewer` },
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
          type="info"
          message="方法版本记录研究演进过程"
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">方法版本</h2>
          <p className="text-sm text-gray-500 mt-1">
            管理和追踪研究方法的演进历程
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary text-sm"
        >
          {showForm ? '收起表单' : '创建版本'}
        </button>
      </div>

      {/* Version Summary */}
      {!isLoading && !error && versions && versions.length > 0 && (
        <div className="card p-4 mb-6 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">{versions.length}</p>
                <p className="text-xs text-gray-500">总版本数</p>
              </div>
            </div>

            {(() => {
              const active = versions.find((v) => v.status === 'active');
              const drafts = versions.filter((v) => v.status === 'draft').length;
              const archived = versions.filter((v) => v.status === 'archived').length;
              return (
                <>
                  {active && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-lg">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <div>
                        <p className="text-xs font-medium text-emerald-700">当前活跃</p>
                        <p className="text-xs text-emerald-600">v{active.version_number} {active.name}</p>
                      </div>
                    </div>
                  )}
                  {!active && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
                      <span className="w-2 h-2 rounded-full bg-gray-400" />
                      <p className="text-xs text-gray-500">暂无活跃版本，请点击「激活」设定当前使用版本</p>
                    </div>
                  )}
                  {drafts > 0 && (
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-700">{drafts}</p>
                      <p className="text-xs text-gray-500">草稿</p>
                    </div>
                  )}
                  {archived > 0 && (
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-700">{archived}</p>
                      <p className="text-xs text-gray-500">已归档</p>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div className="card p-5 mb-8">
          <h3 className="text-sm font-medium text-gray-900 mb-4">
            创建新方法版本
          </h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                版本名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="例如：引入注意力机制的改进方案"
                className="input-field"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                描述
              </label>
              <textarea
                placeholder="描述此方法版本的核心内容和特点..."
                className="textarea-field"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                关键变更（每行一条）
              </label>
              <textarea
                placeholder={"例如：\n增加了多头注意力机制\n调整了学习率调度策略"}
                className="textarea-field"
                rows={3}
                value={formData.key_changes}
                onChange={(e) => setFormData({ ...formData, key_changes: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                变更理由
              </label>
              <textarea
                placeholder="说明为什么做出这些变更..."
                className="textarea-field"
                rows={2}
                value={formData.rationale}
                onChange={(e) => setFormData({ ...formData, rationale: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  基于版本
                </label>
                <select
                  className="input-field"
                  value={formData.parent_version_id}
                  onChange={(e) => setFormData({ ...formData, parent_version_id: e.target.value })}
                >
                  <option value="">无（初始版本）</option>
                  {versions
                    ?.filter((v) => v.status !== 'archived')
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        v{v.version_number} - {v.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  基于创新方向
                </label>
                <select
                  className="input-field"
                  value={formData.based_on_idea_id}
                  onChange={(e) => setFormData({ ...formData, based_on_idea_id: e.target.value })}
                >
                  <option value="">不关联</option>
                  {ideas?.map((idea) => (
                    <option key={idea.id} value={idea.id}>
                      {idea.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {createError && (
              <p className="text-xs text-red-600">{createError}</p>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isCreating || !formData.name.trim()}
                className="btn-primary text-sm"
              >
                {isCreating ? '创建中...' : '创建版本'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary text-sm"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <svg className="animate-spin w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <p className="text-sm text-gray-600 mb-4">加载方法版本失败</p>
          <button
            onClick={() => mutate(`method-versions-${projectId}`)}
            className="btn-secondary text-sm"
          >
            重试
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && versions && versions.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-50 rounded-full mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p className="text-sm text-gray-600 mb-2">还没有方法版本</p>
          <p className="text-xs text-gray-400">
            点击上方"创建版本"按钮开始记录方法演进
          </p>
        </div>
      )}

      {/* Versions List */}
      {!isLoading && !error && versions && versions.length > 0 && (
        <div className="space-y-4">
          {versions
            .sort((a, b) => b.version_number - a.version_number)
            .map((version) => (
              <MethodVersionCard
                key={version.id}
                version={version}
                allVersions={versions}
                ideas={ideas || []}
                onArchive={archivingId === null ? handleArchive : undefined}
                onActivate={activatingId === null ? handleActivate : undefined}
                onUpdate={updatingId === null ? handleUpdate : undefined}
                onDelete={deletingId === null ? handleDelete : undefined}
              />
            ))}
        </div>
      )}
    </div>
  );
}
