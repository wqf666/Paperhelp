'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import useSWR, { mutate } from 'swr';
import { api } from '@/lib/api';
import type {
  ResearchIdea,
  ExperimentPlan,
  ExperimentResult,
  ResultsAnalysis,
  MethodVersion,
} from '@/lib/types';
import ComplianceBanner from '@/components/ComplianceBanner';
import FileUploader from '@/components/FileUploader';
import ExperimentResultTable from '@/components/ExperimentResultTable';

interface IdeaWithPlan {
  idea: ResearchIdea;
  plan: ExperimentPlan | null;
}

export default function ExperimentsPage() {
  const params = useParams();
  const projectId = Number(params.id);

  const [ideasWithPlans, setIdeasWithPlans] = useState<IdeaWithPlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState<number | null>(null);

  // Upload form state
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    name: '',
    description: '',
    experiment_type: 'main',
    method_version_id: '',
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Analysis state
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const [analyses, setAnalyses] = useState<Record<number, ResultsAnalysis>>({});
  const [expandedResultId, setExpandedResultId] = useState<number | null>(null);

  // Delete state
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [resultErrors, setResultErrors] = useState<Record<number, string>>({});

  const {
    data: ideas,
    error,
    isLoading,
  } = useSWR<ResearchIdea[]>(
    projectId ? `ideas-${projectId}` : null,
    () => api.listIdeas(projectId)
  );

  const { data: methodVersions } = useSWR<MethodVersion[]>(
    projectId ? `method-versions-${projectId}` : null,
    () => api.listMethodVersions(projectId)
  );

  const { data: experimentResults } = useSWR<ExperimentResult[]>(
    projectId ? `experiment-results-${projectId}` : null,
    () => api.listExperimentResults(projectId)
  );

  useEffect(() => {
    if (!ideas || ideas.length === 0) return;

    const loadPlans = async () => {
      setIsLoadingPlans(true);
      const results: IdeaWithPlan[] = [];

      for (const idea of ideas) {
        try {
          const plan = await api.getExperimentPlan(idea.id);
          results.push({ idea, plan });
        } catch {
          results.push({ idea, plan: null });
        }
      }

      setIdeasWithPlans(results);
      setIsLoadingPlans(false);
    };

    loadPlans();
  }, [ideas]);

  // Load existing analyses
  useEffect(() => {
    if (!experimentResults) return;
    const loadAnalyses = async () => {
      const newAnalyses: Record<number, ResultsAnalysis> = {};
      for (const result of experimentResults) {
        try {
          const analysis = await api.getResultsAnalysis(result.id);
          newAnalyses[result.id] = analysis;
        } catch {
          // No analysis yet, that's ok
        }
      }
      setAnalyses(newAnalyses);
    };
    loadAnalyses();
  }, [experimentResults]);

  const handleUploadResult = async () => {
    if (!uploadFile || !uploadForm.name.trim() || !uploadForm.method_version_id) {
      setUploadError('请填写必要信息并选择文件');
      return;
    }
    setIsUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('name', uploadForm.name);
      formData.append('description', uploadForm.description);
      formData.append('experiment_type', uploadForm.experiment_type);
      formData.append('method_version_id', uploadForm.method_version_id);

      await api.uploadExperimentResult(projectId, formData);
      mutate(`experiment-results-${projectId}`);
      setUploadForm({ name: '', description: '', experiment_type: 'main', method_version_id: '' });
      setUploadFile(null);
      setShowUploadForm(false);
    } catch (err: any) {
      setUploadError(err.message || '上传失败');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAnalyze = async (resultId: number) => {
    setAnalyzingId(resultId);
    setResultErrors((prev) => {
      const next = { ...prev };
      delete next[resultId];
      return next;
    });
    try {
      const analysis = await api.analyzeExperimentResult(resultId);
      setAnalyses((prev) => ({ ...prev, [resultId]: analysis }));
    } catch (err: any) {
      setResultErrors((prev) => ({
        ...prev,
        [resultId]: '分析失败: ' + (err.message || '未知错误'),
      }));
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleDeleteResult = async (resultId: number) => {
    setDeletingId(resultId);
    setResultErrors((prev) => {
      const next = { ...prev };
      delete next[resultId];
      return next;
    });
    try {
      await api.deleteExperimentResult(resultId);
      mutate(`experiment-results-${projectId}`);
      // Clean up cached analysis for this result
      setAnalyses((prev) => {
        const next = { ...prev };
        delete next[resultId];
        return next;
      });
      if (expandedResultId === resultId) {
        setExpandedResultId(null);
      }
    } catch (err: any) {
      setResultErrors((prev) => ({
        ...prev,
        [resultId]: '删除失败: ' + (err.message || '未知错误'),
      }));
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const renderExperimentItem = (item: any, i: number) => {
    if (typeof item === 'string') {
      return (
        <div key={i} className="p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
          <p>{item}</p>
        </div>
      );
    }

    // Structured experiment object with name, description, expected_outcome
    return (
      <div key={i} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
        {item.name && (
          <h6 className="text-xs font-semibold text-gray-800 mb-2">{item.name}</h6>
        )}
        {item.description && (
          <div className="mb-2">
            <span className="text-xs font-medium text-gray-500">实验方案：</span>
            <p className="text-xs text-gray-600 leading-relaxed mt-0.5">{item.description}</p>
          </div>
        )}
        {item.expected_outcome && (
          <div>
            <span className="text-xs font-medium text-gray-500">预期结果：</span>
            <p className="text-xs text-gray-600 leading-relaxed mt-0.5">{item.expected_outcome}</p>
          </div>
        )}
        {/* Render any remaining fields generically */}
        {Object.entries(item)
          .filter(([k]) => !['name', 'description', 'expected_outcome'].includes(k))
          .map(([key, value]) => (
            <div key={key} className="mt-2">
              <span className="text-xs font-medium text-gray-500">
                {key.replace(/_/g, ' ')}：
              </span>
              <p className="text-xs text-gray-600 mt-0.5">
                {typeof value === 'string' ? value : JSON.stringify(value)}
              </p>
            </div>
          ))}
      </div>
    );
  };

  const renderList = (items: any[], label: string) => {
    if (!items || items.length === 0) return null;

    return (
      <div className="mb-4">
        <h5 className="text-xs font-medium text-gray-700 mb-2">{label}</h5>
        <div className="space-y-2">
          {items.map((item, i) => renderExperimentItem(item, i))}
        </div>
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
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {[
            { name: '概览', href: `/projects/${projectId}` },
            { name: '论文库', href: `/projects/${projectId}/papers` },
            { name: '创新方向', href: `/projects/${projectId}/ideas` },
            {
              name: '实验计划',
              href: `/projects/${projectId}/experiments`,
              active: true,
            },
            { name: '方法版本', href: `/projects/${projectId}/method-versions` },
            { name: '审稿模拟', href: `/projects/${projectId}/reviewer` },
            { name: '论文大纲', href: `/projects/${projectId}/manuscript` },
            { name: '引用管理', href: `/projects/${projectId}/citations` },
            { name: '导出', href: `/projects/${projectId}/export` },
          ].map((tab) => (
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
          message="实验计划由 AI 生成，实验结果不可编造，请基于实际实验数据。所有实验方案需经过人工审核后方可执行。"
        />
      </div>

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">实验计划</h2>
        <p className="text-sm text-gray-500 mt-1">
          查看和管理各创新方向的实验方案
        </p>
      </div>

      {/* Upload Experiment Results Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-900">实验结果</h3>
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="btn-primary text-sm"
          >
            {showUploadForm ? '收起表单' : '上传实验结果'}
          </button>
        </div>

        {showUploadForm && (
          <div className="card p-5 mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-4">
              上传实验结果
            </h4>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    结果名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="例如：主要实验结果"
                    className="input-field"
                    value={uploadForm.name}
                    onChange={(e) =>
                      setUploadForm({ ...uploadForm, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    实验类型
                  </label>
                  <select
                    className="input-field"
                    value={uploadForm.experiment_type}
                    onChange={(e) =>
                      setUploadForm({ ...uploadForm, experiment_type: e.target.value })
                    }
                  >
                    <option value="main">主要实验</option>
                    <option value="ablation">消融实验</option>
                    <option value="robustness">鲁棒性测试</option>
                    <option value="efficiency">效率测试</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  描述
                </label>
                <textarea
                  placeholder="描述实验结果的概要信息..."
                  className="textarea-field"
                  rows={2}
                  value={uploadForm.description}
                  onChange={(e) =>
                    setUploadForm({ ...uploadForm, description: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  关联方法版本 <span className="text-red-500">*</span>
                </label>
                <select
                  className="input-field"
                  value={uploadForm.method_version_id}
                  onChange={(e) =>
                    setUploadForm({ ...uploadForm, method_version_id: e.target.value })
                  }
                >
                  <option value="">请选择方法版本</option>
                  {methodVersions
                    ?.filter((v) => v.status !== 'archived')
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        v{v.version_number} - {v.name}
                      </option>
                    ))}
                </select>
              </div>

              <FileUploader
                accept=".csv,.json,.xlsx"
                onUpload={async (file) => {
                  setUploadFile(file);
                }}
                label="上传数据文件"
                description="支持 CSV、JSON、XLSX 格式"
              />

              {uploadError && (
                <p className="text-xs text-red-600">{uploadError}</p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleUploadResult}
                  disabled={isUploading || !uploadFile || !uploadForm.name.trim() || !uploadForm.method_version_id}
                  className="btn-primary text-sm"
                >
                  {isUploading ? '上传中...' : '上传结果'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowUploadForm(false)}
                  className="btn-secondary text-sm"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Experiment Results List */}
        {experimentResults && experimentResults.length > 0 && (
          <div className="space-y-4">
            {experimentResults.map((result) => {
              const analysis = analyses[result.id];
              const isExpanded = expandedResultId === result.id;
              const typeLabels: Record<string, string> = {
                main: '主要实验',
                ablation: '消融实验',
                robustness: '鲁棒性测试',
                efficiency: '效率测试',
              };

              return (
                <div key={result.id} className="card p-5">
                  {/* Inline error for this result */}
                  {resultErrors[result.id] && (
                    <div className="mb-3 flex items-center justify-between p-2 bg-red-50 rounded text-xs text-red-600">
                      <span>{resultErrors[result.id]}</span>
                      <button
                        onClick={() =>
                          setResultErrors((prev) => {
                            const next = { ...prev };
                            delete next[result.id];
                            return next;
                          })
                        }
                        className="text-red-400 hover:text-red-600 ml-2"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium text-gray-900">
                          {result.name}
                        </h4>
                        <span className="badge badge-blue text-xs">
                          {typeLabels[result.experiment_type] || result.experiment_type}
                        </span>
                      </div>
                      {result.description && (
                        <p className="text-xs text-gray-500">{result.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAnalyze(result.id)}
                        disabled={analyzingId === result.id}
                        className="btn-secondary text-xs"
                      >
                        {analyzingId === result.id ? '分析中...' : '生成分析'}
                      </button>
                      <button
                        onClick={() =>
                          setExpandedResultId(isExpanded ? null : result.id)
                        }
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        {isExpanded ? '收起' : '展开'}
                      </button>
                      {confirmDeleteId === result.id ? (
                        <div className="flex items-center gap-1 ml-1">
                          <button
                            onClick={() => handleDeleteResult(result.id)}
                            disabled={deletingId === result.id}
                            className="text-xs text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                          >
                            {deletingId === result.id ? '删除中...' : '确认'}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs text-gray-400 hover:text-gray-600"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setResultErrors((prev) => {
                              const next = { ...prev };
                              delete next[result.id];
                              return next;
                            });
                            setConfirmDeleteId(result.id);
                          }}
                          disabled={deletingId !== null}
                          className="p-1 text-gray-300 hover:text-gray-500 transition-colors disabled:opacity-50"
                          title="删除"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-100 pt-4">
                      {/* Raw Data Table */}
                      {result.raw_data && result.raw_data.length > 0 && (
                        <div className="mb-4">
                          <ExperimentResultTable
                            data={result.raw_data}
                            title="原始数据"
                          />
                        </div>
                      )}

                      {/* Analysis Display */}
                      {analysis && (
                        <div className="space-y-4">
                          <div>
                            <h5 className="text-xs font-medium text-gray-700 mb-1">
                              分析总结
                            </h5>
                            <p className="text-xs text-gray-600 leading-relaxed">
                              {analysis.summary}
                            </p>
                          </div>

                          {analysis.key_findings && analysis.key_findings.length > 0 && (
                            <div>
                              <h5 className="text-xs font-medium text-gray-700 mb-1">
                                关键发现
                              </h5>
                              <ul className="space-y-1">
                                {analysis.key_findings.map((f, i) => (
                                  <li
                                    key={i}
                                    className="text-xs text-gray-600 flex items-start gap-1.5"
                                  >
                                    <span className="text-blue-400 mt-0.5">&#9679;</span>
                                    <span>{f}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {analysis.comparison_table && analysis.comparison_table.length > 0 && (
                            <ExperimentResultTable
                              data={analysis.comparison_table}
                              title="对比表"
                            />
                          )}

                          <div className="grid grid-cols-2 gap-4">
                            {analysis.strengths && analysis.strengths.length > 0 && (
                              <div>
                                <h5 className="text-xs font-medium text-green-700 mb-1">
                                  优势
                                </h5>
                                <ul className="space-y-1">
                                  {analysis.strengths.map((s, i) => (
                                    <li
                                      key={i}
                                      className="text-xs text-gray-600 flex items-start gap-1.5"
                                    >
                                      <span className="text-green-400 mt-0.5">+</span>
                                      <span>{s}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {analysis.weaknesses && analysis.weaknesses.length > 0 && (
                              <div>
                                <h5 className="text-xs font-medium text-red-700 mb-1">
                                  不足
                                </h5>
                                <ul className="space-y-1">
                                  {analysis.weaknesses.map((w, i) => (
                                    <li
                                      key={i}
                                      className="text-xs text-gray-600 flex items-start gap-1.5"
                                    >
                                      <span className="text-red-400 mt-0.5">-</span>
                                      <span>{w}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
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

      {/* Experiment Plans Section */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">实验计划</h3>
      </div>

      {/* Loading State */}
      {(isLoading || isLoadingPlans) && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
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
            <span className="text-sm text-gray-500">加载实验计划...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <p className="text-sm text-gray-600 mb-4">加载失败</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-secondary text-sm"
          >
            重试
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading &&
        !isLoadingPlans &&
        !error &&
        ideasWithPlans.filter((iwp) => iwp.plan).length === 0 && (
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
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                />
              </svg>
            </div>
            <p className="text-sm text-gray-600 mb-2">暂无实验计划</p>
            <p className="text-xs text-gray-400 mb-4">
              请先在创新方向页面为创新点生成实验计划
            </p>
            <Link
              href={`/projects/${projectId}/ideas`}
              className="btn-secondary text-sm"
            >
              前往创新方向
            </Link>
          </div>
        )}

      {/* Experiment Plans List */}
      {!isLoading &&
        !isLoadingPlans &&
        ideasWithPlans.filter((iwp) => iwp.plan).length > 0 && (
          <div className="space-y-4">
            {ideasWithPlans
              .filter((iwp) => iwp.plan)
              .map(({ idea, plan }) => (
                <div key={idea.id} className="card p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        {idea.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {idea.research_gap}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setExpandedPlan(
                          expandedPlan === idea.id ? null : idea.id
                        )
                      }
                      className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                    >
                      {expandedPlan === idea.id ? '收起' : '展开'}
                      <svg
                        className={`w-3 h-3 transition-transform ${
                          expandedPlan === idea.id ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Always visible: datasets, metrics, baselines */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    {plan!.datasets.length > 0 && (
                      <div>
                        <h5 className="text-xs font-medium text-gray-500 mb-1.5">
                          数据集
                        </h5>
                        <div className="flex flex-wrap gap-1">
                          {plan!.datasets.map((ds, i) => (
                            <span
                              key={i}
                              className="badge badge-blue text-xs"
                            >
                              {ds}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {plan!.metrics.length > 0 && (
                      <div>
                        <h5 className="text-xs font-medium text-gray-500 mb-1.5">
                          评估指标
                        </h5>
                        <div className="flex flex-wrap gap-1">
                          {plan!.metrics.map((m, i) => (
                            <span
                              key={i}
                              className="badge badge-gray text-xs"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {plan!.baselines.length > 0 && (
                      <div>
                        <h5 className="text-xs font-medium text-gray-500 mb-1.5">
                          基线方法
                        </h5>
                        <div className="flex flex-wrap gap-1">
                          {plan!.baselines.map((b, i) => (
                            <span
                              key={i}
                              className="badge badge-gray text-xs"
                            >
                              {b}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Expandable Details */}
                  {expandedPlan === idea.id && (
                    <div className="border-t border-gray-100 pt-4">
                      {renderList(plan!.main_experiments, '主要实验')}
                      {renderList(plan!.ablation_studies, '消融实验')}
                      {renderList(plan!.robustness_tests, '鲁棒性测试')}
                      {renderList(plan!.efficiency_tests, '效率测试')}
                      {renderList(plan!.risk_and_fallbacks, '风险与应对方案')}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
    </div>
  );
}
