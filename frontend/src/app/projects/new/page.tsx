'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function NewProjectPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    target_field: '',
    target_venue: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload: Record<string, string> = { name: formData.name };
      if (formData.description.trim()) {
        payload.description = formData.description.trim();
      }
      if (formData.target_field.trim()) {
        payload.target_field = formData.target_field.trim();
      }
      if (formData.target_venue.trim()) {
        payload.target_venue = formData.target_venue.trim();
      }

      const project = await api.createProject(payload as any);
      router.push(`/projects/${project.id}`);
    } catch (err: any) {
      setError(err.message || '创建失败，请重试');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
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

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-gray-900">新建项目</h1>
        <p className="text-sm text-gray-500 mt-1">
          创建一个新的科研论文写作项目
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project Name */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            项目名称 <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            required
            placeholder="例如：基于 Transformer 的文本摘要研究"
            className="input-field"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
          />
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            项目描述
          </label>
          <textarea
            id="description"
            placeholder="简要描述这个项目的研究目标和范围..."
            className="textarea-field"
            rows={3}
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
          />
        </div>

        {/* Target Field */}
        <div>
          <label
            htmlFor="target_field"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            研究领域
          </label>
          <input
            id="target_field"
            type="text"
            placeholder="例如：自然语言处理、计算机视觉"
            className="input-field"
            value={formData.target_field}
            onChange={(e) =>
              setFormData({ ...formData, target_field: e.target.value })
            }
          />
        </div>

        {/* Target Venue */}
        <div>
          <label
            htmlFor="target_venue"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            目标投稿会议/期刊
          </label>
          <input
            id="target_venue"
            type="text"
            placeholder="例如：ACL 2025、NeurIPS、IEEE TPAMI"
            className="input-field"
            value={formData.target_venue}
            onChange={(e) =>
              setFormData({ ...formData, target_venue: e.target.value })
            }
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting || !formData.name.trim()}
            className="btn-primary"
          >
            {isSubmitting ? (
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
                创建中...
              </span>
            ) : (
              '创建项目'
            )}
          </button>
          <Link href="/projects" className="btn-secondary">
            取消
          </Link>
        </div>
      </form>
    </div>
  );
}
