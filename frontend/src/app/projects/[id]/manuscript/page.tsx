'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import useSWR, { mutate } from 'swr';
import { api } from '@/lib/api';
import type { ManuscriptState as ManuscriptStateType, MethodVersion, ManuscriptSection } from '@/lib/types';
import ComplianceBanner from '@/components/ComplianceBanner';

export default function ManuscriptPage() {
  const params = useParams();
  const projectId = Number(params.id);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set()
  );
  const [selectedMethodVersion, setSelectedMethodVersion] = useState<number | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<number | null>(null);
  const [sectionEdits, setSectionEdits] = useState<Record<number, { title: string; content: string }>>({});
  const [savingSectionId, setSavingSectionId] = useState<number | null>(null);

  const {
    data: manuscript,
    error,
    isLoading,
  } = useSWR<ManuscriptStateType>(
    projectId ? `manuscript-${projectId}` : null,
    () => api.getManuscript(projectId),
    {
      onError: () => {
        // Manuscript might not exist yet, which is OK
      },
    }
  );

  const { data: methodVersions } = useSWR<MethodVersion[]>(
    projectId ? `method-versions-${projectId}` : null,
    () => api.listMethodVersions(projectId)
  );

  const { data: manuscriptSections, mutate: mutateSections } = useSWR<ManuscriptSection[]>(
    projectId ? `manuscript-sections-${projectId}` : null,
    () => api.getManuscriptSections(projectId),
    {
      onError: () => {
        // Sections might not exist yet
      },
    }
  );

  const handleGenerateOutline = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setGenerateError(null);

    try {
      const payload: Record<string, string> = {};
      if (additionalInstructions.trim()) {
        payload.additional_instructions = additionalInstructions.trim();
      }

      await api.generateManuscriptOutline(projectId, payload);
      mutate(`manuscript-${projectId}`);
      setAdditionalInstructions('');
    } catch (err: any) {
      setGenerateError(err.message || '生成失败');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveSection = async (sectionId: number) => {
    const edits = sectionEdits[sectionId];
    if (!edits) return;
    setSavingSectionId(sectionId);
    try {
      await api.updateManuscriptSection(sectionId, {
        title: edits.title,
        content: edits.content,
      });
      mutateSections();
      setEditingSectionId(null);
      setSectionEdits((prev) => {
        const next = { ...prev };
        delete next[sectionId];
        return next;
      });
    } catch (err: any) {
      alert('保存失败: ' + (err.message || '未知错误'));
    } finally {
      setSavingSectionId(null);
    }
  };

  const startEditSection = (section: ManuscriptSection) => {
    setEditingSectionId(section.id);
    setSectionEdits((prev) => ({
      ...prev,
      [section.id]: { title: section.title, content: section.content },
    }));
  };

  const toggleSection = (index: number) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSections(newExpanded);
  };

  const renderOutlineSection = (section: any, index: number, depth = 0) => {
    const hasChildren =
      section.sections && Array.isArray(section.sections) && section.sections.length > 0;
    const isExpanded = expandedSections.has(index);

    return (
      <div
        key={index}
        className="border border-gray-100 rounded-lg overflow-hidden"
        style={{ marginLeft: depth > 0 ? `${depth * 16}px` : 0 }}
      >
        <button
          onClick={() => hasChildren && toggleSection(index)}
          className={`w-full flex items-center justify-between p-3 text-left ${
            hasChildren ? 'hover:bg-gray-50' : ''
          } transition-colors`}
        >
          <div className="flex items-center gap-2">
            {hasChildren && (
              <svg
                className={`w-3 h-3 text-gray-400 transition-transform ${
                  isExpanded ? 'rotate-90' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            )}
            <span className="text-sm font-medium text-gray-900">
              {section.title || section.name || `第 ${index + 1} 节`}
            </span>
          </div>
          {section.estimated_length && (
            <span className="text-xs text-gray-400">
              约 {section.estimated_length} 字
            </span>
          )}
        </button>

        {isExpanded && hasChildren && (
          <div className="border-t border-gray-100 p-3 bg-gray-50">
            {section.description && (
              <p className="text-xs text-gray-600 mb-3">{section.description}</p>
            )}
            {section.key_points && Array.isArray(section.key_points) && (
              <div className="mb-3">
                <h6 className="text-xs font-medium text-gray-500 mb-1">
                  关键要点
                </h6>
                <ul className="list-disc list-inside space-y-0.5">
                  {section.key_points.map((point: string, i: number) => (
                    <li key={i} className="text-xs text-gray-600">
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="space-y-2">
              {section.sections.map((child: any, childIndex: number) =>
                renderOutlineSection(child, index * 100 + childIndex, depth + 1)
              )}
            </div>
          </div>
        )}

        {!hasChildren && section.description && (
          <div className="border-t border-gray-100 p-3 bg-gray-50">
            <p className="text-xs text-gray-600">{section.description}</p>
            {section.key_points && Array.isArray(section.key_points) && (
              <ul className="list-disc list-inside space-y-0.5 mt-2">
                {section.key_points.map((point: string, i: number) => (
                  <li key={i} className="text-xs text-gray-600">
                    {point}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    );
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
            { name: '创新方向', href: `/projects/${projectId}/ideas` },
            { name: '实验计划', href: `/projects/${projectId}/experiments` },
            { name: '方法版本', href: `/projects/${projectId}/method-versions` },
            { name: '审稿模拟', href: `/projects/${projectId}/reviewer` },
            {
              name: '论文大纲',
              href: `/projects/${projectId}/manuscript`,
              active: true,
            },
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
          type="error"
          message="论文内容由 AI 辅助生成，必须人工审核。AI 不能作为论文作者。所有学术成果应由研究人员独立验证和确认。"
        />
      </div>

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">论文大纲</h2>
        <p className="text-sm text-gray-500 mt-1">
          生成和管理论文结构与大纲
        </p>
      </div>

      {/* Generate Form */}
      <div className="card p-5 mb-8">
        <h3 className="text-sm font-medium text-gray-900 mb-4">
          {manuscript ? '重新生成大纲' : '生成论文大纲'}
        </h3>
        <form onSubmit={handleGenerateOutline} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              补充说明
            </label>
            <textarea
              placeholder="可以指定论文侧重点、特殊要求、目标读者等..."
              className="textarea-field"
              rows={3}
              value={additionalInstructions}
              onChange={(e) => setAdditionalInstructions(e.target.value)}
            />
          </div>

          {generateError && (
            <p className="text-xs text-red-600">{generateError}</p>
          )}

          <button
            type="submit"
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
            ) : manuscript ? (
              '重新生成'
            ) : (
              '生成大纲'
            )}
          </button>
        </form>
      </div>

      {/* Method Version Selector */}
      {methodVersions && methodVersions.length > 0 && (
        <div className="card p-4 mb-6">
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gray-700 whitespace-nowrap">
              方法版本
            </label>
            <select
              className="input-field max-w-xs"
              value={selectedMethodVersion ?? ''}
              onChange={(e) =>
                setSelectedMethodVersion(e.target.value ? parseInt(e.target.value, 10) : null)
              }
            >
              <option value="">全部版本</option>
              {methodVersions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.version_number} - {v.name} ({v.status === 'active' ? '活跃' : v.status === 'draft' ? '草稿' : '已归档'})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Manuscript Sections Editor */}
      {manuscriptSections && manuscriptSections.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-medium text-gray-900 mb-4">论文章节</h3>
          <div className="space-y-3">
            {manuscriptSections
              .filter(
                (s) =>
                  !selectedMethodVersion ||
                  s.method_version_id === null ||
                  s.method_version_id === selectedMethodVersion
              )
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((section) => {
                const isEditing = editingSectionId === section.id;
                const edits = sectionEdits[section.id];
                const isSaving = savingSectionId === section.id;

                const statusLabels: Record<string, { label: string; className: string }> = {
                  draft: { label: '草稿', className: 'bg-gray-100 text-gray-600' },
                  in_progress: { label: '进行中', className: 'bg-blue-100 text-blue-700' },
                  completed: { label: '已完成', className: 'bg-green-100 text-green-700' },
                  reviewed: { label: '已审核', className: 'bg-purple-100 text-purple-700' },
                };
                const statusConfig = statusLabels[section.status] || statusLabels.draft;

                return (
                  <div key={section.id} className="card p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <input
                            type="text"
                            className="input-field text-sm font-medium max-w-sm"
                            value={edits?.title || ''}
                            onChange={(e) =>
                              setSectionEdits((prev) => ({
                                ...prev,
                                [section.id]: { ...prev[section.id], title: e.target.value },
                              }))
                            }
                          />
                        ) : (
                          <h4 className="text-sm font-medium text-gray-900">
                            {section.title}
                          </h4>
                        )}
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusConfig.className}`}
                        >
                          {statusConfig.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleSaveSection(section.id)}
                              disabled={isSaving}
                              className="btn-primary text-xs"
                            >
                              {isSaving ? '保存中...' : '保存'}
                            </button>
                            <button
                              onClick={() => {
                                setEditingSectionId(null);
                                setSectionEdits((prev) => {
                                  const next = { ...prev };
                                  delete next[section.id];
                                  return next;
                                });
                              }}
                              className="btn-secondary text-xs"
                            >
                              取消
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => startEditSection(section)}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            编辑
                          </button>
                        )}
                      </div>
                    </div>

                    {isEditing ? (
                      <textarea
                        className="textarea-field text-xs mt-2"
                        rows={8}
                        value={edits?.content || ''}
                        onChange={(e) =>
                          setSectionEdits((prev) => ({
                            ...prev,
                            [section.id]: { ...prev[section.id], content: e.target.value },
                          }))
                        }
                      />
                    ) : (
                      <div className="mt-2">
                        <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
                          {section.content || '暂无内容'}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

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

      {/* Manuscript Display */}
      {manuscript && (
        <div className="space-y-6">
          {/* Title and Abstract */}
          <div className="card p-5">
            <div className="mb-4">
              <h3 className="text-xs font-medium text-gray-500 mb-1">
                论文标题
              </h3>
              <p className="text-base font-medium text-gray-900">
                {manuscript.title}
              </p>
            </div>

            <div className="mb-4">
              <h3 className="text-xs font-medium text-gray-500 mb-1">摘要</h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {manuscript.abstract}
              </p>
            </div>

            {manuscript.contributions.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-gray-500 mb-1">
                  主要贡献
                </h3>
                <ul className="list-disc list-inside space-y-1">
                  {manuscript.contributions.map((c, i) => (
                    <li key={i} className="text-sm text-gray-700">
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Outline */}
          {manuscript.outline && manuscript.outline.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-900">
                  论文大纲
                </h3>
                <span className="text-xs text-gray-400">
                  版本 {manuscript.method_version}
                </span>
              </div>
              <div className="space-y-2">
                {manuscript.outline.map((section, index) =>
                  renderOutlineSection(section, index)
                )}
              </div>
            </div>
          )}

          {/* Unresolved Issues */}
          {manuscript.unresolved_issues &&
            manuscript.unresolved_issues.length > 0 && (
              <div className="card p-5">
                <h3 className="text-sm font-medium text-gray-900 mb-4">
                  待解决问题
                </h3>
                <div className="space-y-2">
                  {manuscript.unresolved_issues.map((issue, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg"
                    >
                      <svg
                        className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                        />
                      </svg>
                      <p className="text-xs text-amber-700">{issue}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
      )}

      {/* No manuscript yet */}
      {!isLoading && !error && !manuscript && (
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
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-600 mb-2">还没有论文大纲</p>
          <p className="text-xs text-gray-400">
            在上方表单中输入补充说明后，点击"生成大纲"开始
          </p>
        </div>
      )}
    </div>
  );
}
