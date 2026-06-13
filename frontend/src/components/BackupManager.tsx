'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';

interface BackupManagerProps {
  projectId: number;
}

export default function BackupManager({ projectId }: BackupManagerProps) {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exportResult, setExportResult] = useState<any | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: backupInfo } = useSWR<any>(
    `backup-info-${projectId}`,
    () => api.getBackupInfo(projectId)
  );

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    setExportResult(null);
    try {
      const result = await api.exportProjectBackup(projectId);
      setExportResult(result);
    } catch (err: any) {
      setError(err.message || '导出失败');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    // Create a hidden file input and trigger it
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.papb';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setImporting(true);
      setError(null);
      setImportResult(null);

      try {
        const formData = new FormData();
        formData.append('file', file);
        const result = await api.importProjectBackup(formData);
        setImportResult(result?.message || '导入成功');
      } catch (err: any) {
        setError(err.message || '导入失败');
      } finally {
        setImporting(false);
      }
    };
    input.click();
  };

  return (
    <div className="card p-5">
      <h3 className="text-sm font-medium text-gray-900 mb-4">备份管理</h3>

      {/* Stats */}
      {backupInfo && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 bg-gray-50 rounded-lg text-center">
            <p className="text-lg font-semibold text-gray-900">
              {backupInfo?.record_counts?.papers ?? 0}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">论文数</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg text-center">
            <p className="text-lg font-semibold text-gray-900">
              {backupInfo?.record_counts?.ideas ?? 0}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">想法数</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg text-center">
            <p className="text-lg font-semibold text-gray-900">
              {backupInfo?.record_counts?.citations ?? 0}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">引用数</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleExport}
          disabled={exporting || importing}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              strokeWidth={1.5}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          {exporting ? '导出中...' : '导出备份'}
        </button>

        <button
          onClick={handleImport}
          disabled={exporting || importing}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              strokeWidth={1.5}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          {importing ? '导入中...' : '导入备份'}
        </button>
      </div>

      {/* Result Messages */}
      {exportResult && (
        <div className="mt-3 p-3 bg-green-50 border border-green-100 rounded-md">
          <p className="text-sm text-green-700">
            导出成功: {exportResult.filename}
            {exportResult.size_bytes != null && (
              <span className="ml-2 text-gray-500">
                ({(exportResult.size_bytes / (1024 * 1024)).toFixed(2)} MB)
              </span>
            )}
          </p>
          {exportResult.filename && (
            <a
              href={`${(window as any).__PAPERHELP_PORT__ ? `http://127.0.0.1:${(window as any).__PAPERHELP_PORT__}` : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')}/backup/download/${encodeURIComponent(exportResult.filename)}`}
              download
              className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 underline"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              下载备份文件
            </a>
          )}
        </div>
      )}

      {importResult && (
        <div className="mt-3 p-3 bg-green-50 border border-green-100 rounded-md">
          <p className="text-sm text-green-700">{importResult}</p>
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
