'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import useSWR, { mutate } from 'swr';
import { api } from '@/lib/api';
import type { Paper } from '@/lib/types';
import PaperCardComponent from '@/components/PaperCard';
import ComplianceBanner from '@/components/ComplianceBanner';
import FileUploader from '@/components/FileUploader';

export default function PapersPage() {
  const params = useParams();
  const projectId = Number(params.id);

  const [showAddForm, setShowAddForm] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [uploadTab, setUploadTab] = useState<'manual' | 'pdf'>('manual');
  const [pdfUploadStatus, setPdfUploadStatus] = useState<string | null>(null);

  const [paperForm, setPaperForm] = useState({
    title: '',
    authors: '',
    year: '',
    venue: '',
    doi: '',
  });

  const {
    data: papers,
    error,
    isLoading,
  } = useSWR<Paper[]>(
    projectId ? `papers-${projectId}` : null,
    () => api.listPapers(projectId)
  );

  const handleAddPaper = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    setAddError(null);

    try {
      const payload: { title: string; authors?: string; year?: number; venue?: string; doi?: string } = { title: paperForm.title };
      if (paperForm.authors.trim()) payload.authors = paperForm.authors.trim();
      if (paperForm.year.trim()) payload.year = parseInt(paperForm.year, 10);
      if (paperForm.venue.trim()) payload.venue = paperForm.venue.trim();
      if (paperForm.doi.trim()) payload.doi = paperForm.doi.trim();

      await api.addPaper(projectId, payload);
      setPaperForm({ title: '', authors: '', year: '', venue: '', doi: '' });
      setShowAddForm(false);
      mutate(`papers-${projectId}`);
    } catch (err: any) {
      setAddError(err.message || '添加失败');
    } finally {
      setIsAdding(false);
    }
  };

  const handleAnalysisComplete = () => {
    mutate(`papers-${projectId}`);
  };

  const handlePdfUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    setPdfUploadStatus('解析中...');
    const result = await api.uploadPaperPdf(projectId, formData);
    mutate(`papers-${projectId}`);
    setPdfUploadStatus(`上传成功：${result.title || file.name}，正在解析...`);
    // Poll for parse completion
    const pollInterval = setInterval(async () => {
      try {
        const papers = await api.listPapers(projectId);
        const uploaded = papers.find((p) => p.id === result.id);
        if (uploaded && uploaded.pdf_parse_status === 'completed') {
          setPdfUploadStatus(`解析完成：${uploaded.title}`);
          clearInterval(pollInterval);
          mutate(`papers-${projectId}`);
        } else if (uploaded && uploaded.pdf_parse_status === 'failed') {
          setPdfUploadStatus('解析失败，请重试');
          clearInterval(pollInterval);
        }
      } catch {
        // ignore poll errors
      }
    }, 3000);
    // Stop polling after 2 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
    }, 120000);
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
            { name: '论文库', href: `/projects/${projectId}/papers`, active: true },
            { name: '创新方向', href: `/projects/${projectId}/ideas` },
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
          type="info"
          message="论文分析由 AI 辅助生成，请人工核实。分析结果仅供参考，不代表对论文内容的最终评价。"
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">论文库</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary text-sm"
        >
          {showAddForm ? (
            '收起表单'
          ) : (
            <span className="flex items-center gap-1">
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              添加论文
            </span>
          )}
        </button>
      </div>

      {/* Add Paper Form */}
      {showAddForm && (
        <div className="card p-5 mb-6">
          {/* Upload Mode Tabs */}
          <div className="flex gap-1 mb-4 border-b border-gray-100">
            <button
              onClick={() => setUploadTab('manual')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                uploadTab === 'manual'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              手动录入
            </button>
            <button
              onClick={() => setUploadTab('pdf')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                uploadTab === 'pdf'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              PDF上传
            </button>
          </div>

          {/* Manual Entry */}
          {uploadTab === 'manual' && (
            <form onSubmit={handleAddPaper} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  论文标题 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="输入论文标题"
                  className="input-field"
                  value={paperForm.title}
                  onChange={(e) =>
                    setPaperForm({ ...paperForm, title: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    作者
                  </label>
                  <input
                    type="text"
                    placeholder="例如：Zhang San, Li Si"
                    className="input-field"
                    value={paperForm.authors}
                    onChange={(e) =>
                      setPaperForm({ ...paperForm, authors: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    年份
                  </label>
                  <input
                    type="number"
                    placeholder="例如：2024"
                    className="input-field"
                    value={paperForm.year}
                    onChange={(e) =>
                      setPaperForm({ ...paperForm, year: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    会议/期刊
                  </label>
                  <input
                    type="text"
                    placeholder="例如：ACL 2024"
                    className="input-field"
                    value={paperForm.venue}
                    onChange={(e) =>
                      setPaperForm({ ...paperForm, venue: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    DOI
                  </label>
                  <input
                    type="text"
                    placeholder="例如：10.18653/..."
                    className="input-field"
                    value={paperForm.doi}
                    onChange={(e) =>
                      setPaperForm({ ...paperForm, doi: e.target.value })
                    }
                  />
                </div>
              </div>

              {addError && (
                <p className="text-xs text-red-600">{addError}</p>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isAdding || !paperForm.title.trim()}
                  className="btn-primary text-sm"
                >
                  {isAdding ? '添加中...' : '添加论文'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="btn-secondary text-sm"
                >
                  取消
                </button>
              </div>
            </form>
          )}

          {/* PDF Upload */}
          {uploadTab === 'pdf' && (
            <div className="space-y-4">
              <FileUploader
                accept=".pdf"
                onUpload={handlePdfUpload}
                label="上传 PDF 文件"
                description="支持直接上传论文 PDF，系统将自动解析论文内容"
              />

              {pdfUploadStatus && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <svg
                    className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5 animate-pulse"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-blue-700">{pdfUploadStatus}</p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="btn-secondary text-sm"
              >
                取消
              </button>
            </div>
          )}
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

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <p className="text-sm text-gray-600 mb-4">加载论文列表失败</p>
          <button
            onClick={() => mutate(`papers-${projectId}`)}
            className="btn-secondary text-sm"
          >
            重试
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && papers && papers.length === 0 && (
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-600 mb-2">还没有论文</p>
          <p className="text-xs text-gray-400">
            点击上方"添加论文"按钮开始添加
          </p>
        </div>
      )}

      {/* Papers List */}
      {!isLoading && !error && papers && papers.length > 0 && (
        <div className="space-y-4">
          {papers.map((paper) => (
            <PaperCardComponent
              key={paper.id}
              paper={paper}
              onAnalysisComplete={handleAnalysisComplete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
