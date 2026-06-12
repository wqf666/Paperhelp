'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { api } from '@/lib/api';
import type { ManuscriptState, ExportTemplate, ExportRecord } from '@/lib/types';

export default function ExportPage() {
  const params = useParams();
  const projectId = Number(params.id);

  const [docxTemplateId, setDocxTemplateId] = useState<string>('');
  const [latexTemplateId, setLatexTemplateId] = useState<string>('');
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [isExportingLatex, setIsExportingLatex] = useState(false);
  const [docxResult, setDocxResult] = useState<ExportRecord | null>(null);
  const [latexResult, setLatexResult] = useState<ExportRecord | null>(null);
  const [docxError, setDocxError] = useState<string | null>(null);
  const [latexError, setLatexError] = useState<string | null>(null);

  const [coverForm, setCoverForm] = useState({
    recipient_name: '',
    recipient_title: '',
    journal_or_conference: '',
    additional_notes: '',
  });
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [coverResult, setCoverResult] = useState<any>(null);
  const [coverError, setCoverError] = useState<string | null>(null);

  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
  const [responseResult, setResponseResult] = useState<any>(null);
  const [responseError, setResponseError] = useState<string | null>(null);

  const {
    data: manuscript,
    error: manuscriptError,
    isLoading: isLoadingManuscript,
  } = useSWR<ManuscriptState>(
    projectId ? `manuscript-${projectId}` : null,
    () => api.getManuscript(projectId),
    {
      onError: () => {
        // Manuscript might not exist yet
      },
    }
  );

  const {
    data: templates,
    error: templatesError,
    isLoading: isLoadingTemplates,
  } = useSWR<ExportTemplate[]>(
    'export-templates',
    () => api.listTemplates()
  );

  const docxTemplates = templates?.filter(
    (t) => t.template_type === 'docx' && t.is_active
  );
  const latexTemplates = templates?.filter(
    (t) => t.template_type === 'latex' && t.is_active
  );

  const handleExportDocx = async () => {
    setIsExportingDocx(true);
    setDocxError(null);
    setDocxResult(null);

    try {
      const payload: Record<string, any> = {};
      if (docxTemplateId) payload.template_id = parseInt(docxTemplateId, 10);
      const result = await api.exportDocx(projectId, payload);
      setDocxResult(result);
    } catch (err: any) {
      setDocxError(err.message || '导出 Word 失败');
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handleExportLatex = async () => {
    setIsExportingLatex(true);
    setLatexError(null);
    setLatexResult(null);

    try {
      const payload: Record<string, any> = {};
      if (latexTemplateId) payload.template_id = parseInt(latexTemplateId, 10);
      const result = await api.exportLatex(projectId, payload);
      setLatexResult(result);
    } catch (err: any) {
      setLatexError(err.message || '导出 LaTeX 失败');
    } finally {
      setIsExportingLatex(false);
    }
  };

  const handleExportCoverLetter = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeneratingCover(true);
    setCoverError(null);
    setCoverResult(null);

    try {
      const payload: Record<string, string> = {};
      if (coverForm.recipient_name.trim())
        payload.recipient_name = coverForm.recipient_name.trim();
      if (coverForm.recipient_title.trim())
        payload.recipient_title = coverForm.recipient_title.trim();
      if (coverForm.journal_or_conference.trim())
        payload.journal_or_conference = coverForm.journal_or_conference.trim();
      if (coverForm.additional_notes.trim())
        payload.additional_notes = coverForm.additional_notes.trim();

      const result = await api.exportCoverLetter(projectId, payload);
      setCoverResult(result);
    } catch (err: any) {
      setCoverError(err.message || '生成 Cover Letter 失败');
    } finally {
      setIsGeneratingCover(false);
    }
  };

  const handleExportResponseLetter = async () => {
    setIsGeneratingResponse(true);
    setResponseError(null);
    setResponseResult(null);

    try {
      const result = await api.exportResponseLetter(projectId, {});
      setResponseResult(result);
    } catch (err: any) {
      setResponseError(err.message || '生成 Response Letter 失败');
    } finally {
      setIsGeneratingResponse(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      completed: { label: '完成', className: 'bg-green-100 text-green-700' },
      pending: { label: '等待中', className: 'bg-yellow-100 text-yellow-700' },
      processing: { label: '处理中', className: 'bg-blue-100 text-blue-700' },
      failed: { label: '失败', className: 'bg-red-100 text-red-700' },
    };
    const config = statusConfig[status] || {
      label: status,
      className: 'bg-gray-100 text-gray-700',
    };
    return (
      <span
        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${config.className}`}
      >
        {config.label}
      </span>
    );
  };

  const tabs = [
    { name: '概览', href: `/projects/${projectId}` },
    { name: '论文库', href: `/projects/${projectId}/papers` },
    { name: '创新方向', href: `/projects/${projectId}/ideas` },
    { name: '实验计划', href: `/projects/${projectId}/experiments` },
    { name: '方法版本', href: `/projects/${projectId}/method-versions` },
    { name: '审稿模拟', href: `/projects/${projectId}/reviewer` },
    { name: '论文大纲', href: `/projects/${projectId}/manuscript` },
    { name: '引用管理', href: `/projects/${projectId}/citations` },
    { name: '导出', href: `/projects/${projectId}/export`, active: true },
  ];

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

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">导出</h2>
        <p className="text-sm text-gray-500 mt-1">
          将论文内容导出为 Word、LaTeX 或生成投稿信件
        </p>
      </div>

      {/* Manuscript Warning */}
      {!isLoadingManuscript && !manuscript && (
        <div className="flex items-start gap-3 p-4 mb-6 bg-amber-50 border border-amber-100 rounded-lg">
          <svg
            className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5"
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
          <div>
            <p className="text-sm font-medium text-amber-800">
              尚未生成论文大纲
            </p>
            <p className="text-xs text-amber-700 mt-1">
              请先在"论文大纲"页面生成大纲后再进行导出操作。
            </p>
            <Link
              href={`/projects/${projectId}/manuscript`}
              className="text-xs text-amber-800 underline mt-2 inline-block hover:text-amber-900"
            >
              前往论文大纲
            </Link>
          </div>
        </div>
      )}

      {/* Loading State */}
      {(isLoadingManuscript || isLoadingTemplates) && (
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

      {/* Main Content */}
      {!isLoadingManuscript && !isLoadingTemplates && (
        <div className="space-y-8">
          {/* Export DOCX Section */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
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
                <h3 className="text-sm font-medium text-gray-900">
                  导出 Word (DOCX)
                </h3>
                <p className="text-xs text-gray-500">
                  将论文大纲与章节内容导出为 Word 文档
                </p>
              </div>
            </div>

            <div className="flex items-end gap-4">
              <div className="flex-1 max-w-xs">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  选择模板
                </label>
                <select
                  className="input-field"
                  value={docxTemplateId}
                  onChange={(e) => setDocxTemplateId(e.target.value)}
                >
                  <option value="">默认模板</option>
                  {docxTemplates?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.description ? ` - ${t.description}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleExportDocx}
                disabled={isExportingDocx || !manuscript}
                className="btn-primary text-sm"
              >
                {isExportingDocx ? (
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
                    导出中...
                  </span>
                ) : (
                  '导出 Word'
                )}
              </button>
            </div>

            {docxError && (
              <p className="text-xs text-red-600 mt-3">{docxError}</p>
            )}

            {docxResult && (
              <div className="mt-4 flex items-center gap-3 p-3 bg-green-50 border border-green-100 rounded-lg">
                <svg
                  className="w-4 h-4 text-green-500 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <div className="flex-1">
                  <p className="text-xs text-green-700">
                    Word 导出完成
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(docxResult.status)}
                    {docxResult.file_name && (
                      <span className="text-xs text-gray-500">
                        {docxResult.file_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Export LaTeX Section */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-4 h-4 text-emerald-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900">
                  导出 LaTeX
                </h3>
                <p className="text-xs text-gray-500">
                  导出为 LaTeX 源文件，适用于学术期刊投稿
                </p>
              </div>
            </div>

            <div className="flex items-end gap-4">
              <div className="flex-1 max-w-xs">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  选择模板
                </label>
                <select
                  className="input-field"
                  value={latexTemplateId}
                  onChange={(e) => setLatexTemplateId(e.target.value)}
                >
                  <option value="">默认模板</option>
                  {latexTemplates?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.description ? ` - ${t.description}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleExportLatex}
                disabled={isExportingLatex || !manuscript}
                className="btn-primary text-sm"
              >
                {isExportingLatex ? (
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
                    导出中...
                  </span>
                ) : (
                  '导出 LaTeX'
                )}
              </button>
            </div>

            {latexError && (
              <p className="text-xs text-red-600 mt-3">{latexError}</p>
            )}

            {latexResult && (
              <div className="mt-4 flex items-center gap-3 p-3 bg-green-50 border border-green-100 rounded-lg">
                <svg
                  className="w-4 h-4 text-green-500 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <div className="flex-1">
                  <p className="text-xs text-green-700">
                    LaTeX 导出完成
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(latexResult.status)}
                    {latexResult.file_name && (
                      <span className="text-xs text-gray-500">
                        {latexResult.file_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Cover Letter Section */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
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
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900">
                  Cover Letter（投稿信）
                </h3>
                <p className="text-xs text-gray-500">
                  生成投稿期刊或会议的 Cover Letter
                </p>
              </div>
            </div>

            <form onSubmit={handleExportCoverLetter} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    收件人姓名
                  </label>
                  <input
                    type="text"
                    placeholder="例如：Prof. John Smith"
                    className="input-field"
                    value={coverForm.recipient_name}
                    onChange={(e) =>
                      setCoverForm({
                        ...coverForm,
                        recipient_name: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    收件人职称
                  </label>
                  <input
                    type="text"
                    placeholder="例如：Editor-in-Chief"
                    className="input-field"
                    value={coverForm.recipient_title}
                    onChange={(e) =>
                      setCoverForm({
                        ...coverForm,
                        recipient_title: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  目标期刊/会议
                </label>
                <input
                  type="text"
                  placeholder="例如：ACL 2024 / Nature Machine Intelligence"
                  className="input-field"
                  value={coverForm.journal_or_conference}
                  onChange={(e) =>
                    setCoverForm({
                      ...coverForm,
                      journal_or_conference: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  补充说明
                </label>
                <textarea
                  placeholder="可以添加额外的投稿说明，例如特殊要求、审稿偏好等..."
                  className="textarea-field"
                  rows={3}
                  value={coverForm.additional_notes}
                  onChange={(e) =>
                    setCoverForm({
                      ...coverForm,
                      additional_notes: e.target.value,
                    })
                  }
                />
              </div>

              {coverError && (
                <p className="text-xs text-red-600">{coverError}</p>
              )}

              <button
                type="submit"
                disabled={isGeneratingCover}
                className="btn-primary text-sm"
              >
                {isGeneratingCover ? (
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
                  '生成 Cover Letter'
                )}
              </button>
            </form>

            {coverResult && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <h4 className="text-xs font-medium text-gray-700 mb-2">
                  Cover Letter 结果
                </h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                    {typeof coverResult === 'string'
                      ? coverResult
                      : coverResult.content ||
                        coverResult.letter ||
                        JSON.stringify(coverResult, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Response Letter Section */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
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
                    d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900">
                  Response Letter（回复信）
                </h3>
                <p className="text-xs text-gray-500">
                  基于审稿模拟结果，生成逐条回复的 Response Letter
                </p>
              </div>
            </div>

            <button
              onClick={handleExportResponseLetter}
              disabled={isGeneratingResponse}
              className="btn-primary text-sm"
            >
              {isGeneratingResponse ? (
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
                '生成 Response Letter'
              )}
            </button>

            {responseError && (
              <p className="text-xs text-red-600 mt-3">{responseError}</p>
            )}

            {responseResult && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <h4 className="text-xs font-medium text-gray-700 mb-2">
                  Response Letter 结果
                </h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                    {typeof responseResult === 'string'
                      ? responseResult
                      : responseResult.content ||
                        responseResult.letter ||
                        JSON.stringify(responseResult, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Export History Section */}
          {(docxResult || latexResult) && (
            <div className="card p-5">
              <h3 className="text-sm font-medium text-gray-900 mb-4">
                最近导出记录
              </h3>
              <div className="space-y-3">
                {docxResult && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="badge badge-blue text-xs">DOCX</span>
                      <span className="text-xs text-gray-700">
                        {docxResult.file_name || 'Word 文档'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(docxResult.status)}
                      {docxResult.created_at && (
                        <span className="text-xs text-gray-400">
                          {new Date(docxResult.created_at).toLocaleString(
                            'zh-CN'
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {latexResult && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="badge badge-gray text-xs">LaTeX</span>
                      <span className="text-xs text-gray-700">
                        {latexResult.file_name || 'LaTeX 源文件'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(latexResult.status)}
                      {latexResult.created_at && (
                        <span className="text-xs text-gray-400">
                          {new Date(latexResult.created_at).toLocaleString(
                            'zh-CN'
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
