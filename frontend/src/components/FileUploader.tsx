'use client';

import React, { useState, useRef, useCallback } from 'react';

interface FileUploaderProps {
  accept: string;
  onUpload: (files: File[]) => Promise<void>;
  label: string;
  description?: string;
  multiple?: boolean;
}

export default function FileUploader({
  accept,
  onUpload,
  label,
  description,
  multiple = false,
}: FileUploaderProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const newFiles = Array.from(fileList);
    setSelectedFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const deduped = newFiles.filter((f) => !existingNames.has(f.name));
      return [...prev, ...deduped];
    });
    setError(null);
  }, []);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files);
    // Reset so the same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setIsUploading(true);
    setError(null);
    try {
      await onUpload(selectedFiles);
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setError(err.message || '上传失败');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          {label}
        </label>
        {description && (
          <p className="text-xs text-gray-500 mb-2">{description}</p>
        )}
      </div>

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          multiple={multiple}
          className="hidden"
        />

        <svg
          className="w-8 h-8 text-gray-400 mx-auto mb-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>

        {selectedFiles.length > 0 ? (
          <div>
            <p className="text-sm text-gray-700 font-medium mb-1">
              已选择 {selectedFiles.length} 个文件
            </p>
            <p className="text-xs text-gray-400">点击继续添加更多文件</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              拖放文件到此处，或点击选择文件{multiple ? '（可多选）' : ''}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              支持格式：{accept}
            </p>
          </>
        )}
      </div>

      {/* Selected files list */}
      {selectedFiles.length > 0 && (
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {selectedFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center justify-between px-3 py-1.5 bg-white border border-gray-200 rounded-lg"
            >
              <div className="flex items-center gap-2 min-w-0">
                <svg
                  className="w-3.5 h-3.5 text-gray-400 flex-shrink-0"
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
                <span className="text-xs text-gray-700 truncate">
                  {file.name}
                </span>
                <span className="text-[10px] text-gray-400 flex-shrink-0">
                  {(file.size / 1024 / 1024).toFixed(1)}MB
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
                className="text-gray-300 hover:text-red-400 transition-colors p-0.5 flex-shrink-0"
                title="移除"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-100 rounded-lg">
          <svg
            className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Upload Button */}
      {selectedFiles.length > 0 && (
        <button
          onClick={handleUpload}
          disabled={isUploading}
          className="btn-primary text-sm w-full"
        >
          {isUploading ? (
            <span className="flex items-center justify-center gap-1">
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
              上传中...
            </span>
          ) : (
            `上传 ${selectedFiles.length} 个文件`
          )}
        </button>
      )}
    </div>
  );
}
