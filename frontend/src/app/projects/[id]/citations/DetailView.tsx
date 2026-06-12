'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import useSWR, { mutate } from 'swr';
import { api } from '@/lib/api';
import type { Citation } from '@/lib/types';

export default function CitationsPage() {
  const params = useParams();
  const projectId = Number(params.id);

  const [showImportForm, setShowImportForm] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [bibtexInput, setBibtexInput] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [exportingBibtex, setExportingBibtex] = useState(false);
  const [bibtexExport, setBibtexExport] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [addForm, setAddForm] = useState({
    cite_key: '',
    entry_type: 'article',
    title: '',
    authors: '',
    year: '',
    venue: '',
    doi: '',
  });
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const {
    data: citations,
    error,
    isLoading,
  } = useSWR<Citation[]>(
    projectId ? `citations-${projectId}` : null,
    () => api.listCitations(projectId)
  );

  const handleImportBibtex = async () => {
    if (!bibtexInput.trim()) return;
    setImporting(true);
    setImportError(null);
    setImportResult(null);

    try {
      const result = await api.importBibtex(projectId, bibtexInput.trim());
      setImportResult(`成功导入 ${result.length} 条引用`);
      setBibtexInput('');
      mutate(`citations-${projectId}`);
    } catch (err: any) {
      setImportError(err.message || '导入失败');
    } finally {
      setImporting(false);
    }
  };

  const handleAddCitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    setAddError(null);

    try {
      const payload: Record<string, any> = {
        cite_key: addForm.cite_key,
        entry_type: addForm.entry_type,
        title: addForm.title,
      };
      if (addForm.authors.trim()) payload.authors = addForm.authors.trim();
      if (addForm.year.trim()) payload.year = parseInt(addForm.year, 10);
      if (addForm.venue.trim()) payload.venue = addForm.venue.trim();
      if (addForm.doi.trim()) payload.doi = addForm.doi.trim();

      await api.createCitation(projectId, payload);
      setAddForm({
        cite_key: '',
        entry_type: 'article',
        title: '',
        authors: '',
        year: '',
        venue: '',
        doi: '',
      });
      setShowAddForm(false);
      mutate(`citations-${projectId}`);
    } catch (err: any) {
      setAddError(err.message || '添加失败');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (citationId: number) => {
    if (!confirm('确定要删除此引用吗？')) return;
    setDeletingId(citationId);
    try {
      await api.deleteCitation(projectId, citationId);
      mutate(`citations-${projectId}`);
    } catch (err: any) {
      alert('删除失败: ' + (err.message || '未知错误'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleExportBibtex = async () => {
    setExportingBibtex(true);
    try {
      const result = await api.exportBibtex(projectId);
      setBibtexExport(result);
    } catch (err: any) {
      alert('导出失败: ' + (err.message || '未知错误'));
    } finally {
      setExportingBibtex(false);
    }
  };

  const handleDownloadBibtex = () => {
    if (!bibtexExport) return;
    const blob = new Blob([bibtexExport], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `citations-${projectId}.bib`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredCitations = citations?.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      (c.authors && c.authors.toLowerCase().includes(q)) ||
      c.cite_key.toLowerCase().includes(q)
    );
  });

  const entryTypeLabels: Record<string, string> = {
    article: '期刊论文',
    inproceedings: '会议论文',
    book: '书籍',
    misc: '其他',
  };

  const tabs = [
    { name: '概览', href: `/projects/${projectId}` },
    { name: '论文库', href: `/projects/${projectId}/papers` },
    { name: '创新方向', href: `/projects/${projectId}/ideas` },
    { name: '实验计划', href: `/projects/${projectId}/experiments` },
    { name: '方法版本', href: `/projects/${projectId}/method-versions` },
    { name: '审稿模拟', href: `/projects/${projectId}/reviewer` },
    { name: '论文大纲', href: `/projects/${projectId}/manuscript` },
    { name: '引用管理', href: `/projects/${projectId}/citations`, active: true },
    { name: '导出', href: `/projects/${projectId}/export` },
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">引用管理</h2>
          <p className="text-sm text-gray-500 mt-1">
            管理项目引用文献，支持 BibTeX 导入导出
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowImportForm(!showImportForm);
              setShowAddForm(false);
            }}
            className="btn-secondary text-sm"
          >
            {showImportForm ? '收起' : '导入 BibTeX'}
          </button>
          <button
            onClick={() => {
              setShowAddForm(!showAddForm);
              setShowImportForm(false);
            }}
            className="btn-primary text-sm"
          >
            {showAddForm ? '收起表单' : '添加引用'}
          </button>
        </div>
      </div>

      {/* Import BibTeX */}
      {showImportForm && (
        <div className="card p-5 mb-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">
            导入 BibTeX
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                粘贴 BibTeX 内容
              </label>
              <textarea
                placeholder={`@article{author2024title,\n  title={Paper Title},\n  author={Author, A.},\n  year={2024},\n  journal={Journal Name}\n}`}
                className="textarea-field font-mono text-xs"
                rows={8}
                value={bibtexInput}
                onChange={(e) => setBibtexInput(e.target.value)}
              />
            </div>

            {importError && (
              <p className="text-xs text-red-600">{importError}</p>
            )}
            {importResult && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-lg">
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
                <p className="text-xs text-green-700">{importResult}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleImportBibtex}
                disabled={importing || !bibtexInput.trim()}
                className="btn-primary text-sm"
              >
                {importing ? '导入中...' : '导入'}
              </button>
              <button
                type="button"
                onClick={() => setShowImportForm(false)}
                className="btn-secondary text-sm"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Citation Form */}
      {showAddForm && (
        <div className="card p-5 mb-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">
            手动添加引用
          </h3>
          <form onSubmit={handleAddCitation} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  引用键 (cite_key) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如：zhang2024attention"
                  className="input-field"
                  value={addForm.cite_key}
                  onChange={(e) =>
                    setAddForm({ ...addForm, cite_key: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  类型 <span className="text-red-500">*</span>
                </label>
                <select
                  className="input-field"
                  value={addForm.entry_type}
                  onChange={(e) =>
                    setAddForm({ ...addForm, entry_type: e.target.value })
                  }
                >
                  <option value="article">期刊论文 (article)</option>
                  <option value="inproceedings">会议论文 (inproceedings)</option>
                  <option value="book">书籍 (book)</option>
                  <option value="misc">其他 (misc)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                标题 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="论文标题"
                className="input-field"
                value={addForm.title}
                onChange={(e) =>
                  setAddForm({ ...addForm, title: e.target.value })
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
                  value={addForm.authors}
                  onChange={(e) =>
                    setAddForm({ ...addForm, authors: e.target.value })
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
                  value={addForm.year}
                  onChange={(e) =>
                    setAddForm({ ...addForm, year: e.target.value })
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
                  value={addForm.venue}
                  onChange={(e) =>
                    setAddForm({ ...addForm, venue: e.target.value })
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
                  value={addForm.doi}
                  onChange={(e) =>
                    setAddForm({ ...addForm, doi: e.target.value })
                  }
                />
              </div>
            </div>

            {addError && <p className="text-xs text-red-600">{addError}</p>}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isAdding || !addForm.cite_key.trim() || !addForm.title.trim()}
                className="btn-primary text-sm"
              >
                {isAdding ? '添加中...' : '添加引用'}
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
        </div>
      )}

      {/* Search Bar */}
      {!isLoading && !error && citations && citations.length > 0 && (
        <div className="mb-6">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="搜索引用（标题、作者、引用键）..."
              className="input-field pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Export BibTeX */}
      {!isLoading && !error && citations && citations.length > 0 && (
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={handleExportBibtex}
            disabled={exportingBibtex}
            className="btn-secondary text-sm"
          >
            {exportingBibtex ? '导出中...' : '导出 BibTeX'}
          </button>
          {bibtexExport && (
            <button
              onClick={handleDownloadBibtex}
              className="btn-secondary text-sm"
            >
              下载 .bib 文件
            </button>
          )}
        </div>
      )}

      {/* BibTeX Export Preview */}
      {bibtexExport && (
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">BibTeX 导出预览</h3>
            <button
              onClick={() => setBibtexExport(null)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              关闭
            </button>
          </div>
          <pre className="bg-gray-50 rounded-lg p-4 text-xs font-mono text-gray-700 overflow-x-auto max-h-64 overflow-y-auto">
            {bibtexExport}
          </pre>
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
          <p className="text-sm text-gray-600 mb-4">加载引用列表失败</p>
          <button
            onClick={() => mutate(`citations-${projectId}`)}
            className="btn-secondary text-sm"
          >
            重试
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && citations && citations.length === 0 && (
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
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-600 mb-2">还没有引用</p>
          <p className="text-xs text-gray-400 mb-4">
            点击上方"导入 BibTeX"或"添加引用"开始管理引用文献
          </p>
        </div>
      )}

      {/* No results from search */}
      {!isLoading &&
        !error &&
        citations &&
        citations.length > 0 &&
        filteredCitations &&
        filteredCitations.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-gray-600 mb-2">
              没有找到匹配"{searchQuery}"的引用
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              清除搜索
            </button>
          </div>
        )}

      {/* Citations List */}
      {!isLoading &&
        !error &&
        filteredCitations &&
        filteredCitations.length > 0 && (
          <div className="space-y-4">
            {filteredCitations.map((citation) => (
              <div key={citation.id} className="card p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-xs font-mono font-medium text-gray-700">
                        {citation.cite_key}
                      </span>
                      <span className="badge badge-blue text-xs">
                        {entryTypeLabels[citation.entry_type] ||
                          citation.entry_type}
                      </span>
                      {citation.year && (
                        <span className="badge badge-gray text-xs">
                          {citation.year}
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-medium text-gray-900 mb-1">
                      {citation.title}
                    </h4>

                    {citation.authors && (
                      <p className="text-xs text-gray-500 mb-1">
                        {citation.authors}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-2">
                      {citation.venue && (
                        <span className="text-xs text-gray-400">
                          {citation.venue}
                        </span>
                      )}
                      {citation.doi && (
                        <a
                          href={`https://doi.org/${citation.doi}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:text-blue-700"
                        >
                          DOI: {citation.doi}
                        </a>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(citation.id)}
                    disabled={deletingId === citation.id}
                    className="ml-4 flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 border border-red-100 transition-colors disabled:opacity-50"
                  >
                    {deletingId === citation.id ? (
                      <span className="flex items-center gap-1">
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
                        删除中...
                      </span>
                    ) : (
                      '删除'
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
