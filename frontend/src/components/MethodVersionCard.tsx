'use client';

import React, { useState } from 'react';
import type { MethodVersion, ResearchIdea } from '@/lib/types';

interface MethodVersionCardProps {
  version: MethodVersion;
  allVersions?: MethodVersion[];
  ideas?: ResearchIdea[];
  onArchive?: (id: number) => void;
  onActivate?: (id: number) => void;
  onUpdate?: (id: number, data: { name?: string; description?: string; key_changes?: string[]; rationale?: string }) => void;
  onDelete?: (id: number) => void;
}

const STATUS_CONFIG: Record<string, { label: string; className: string; dot: string }> = {
  draft: { label: '草稿', className: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
  active: { label: '当前活跃', className: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  archived: { label: '已归档', className: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400' },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || { label: status, className: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

export default function MethodVersionCard({
  version,
  allVersions = [],
  ideas = [],
  onArchive,
  onActivate,
  onUpdate,
  onDelete,
}: MethodVersionCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [editData, setEditData] = useState({
    name: version.name,
    description: version.description || '',
    key_changes: (version.key_changes || []).join('\n'),
    rationale: version.rationale || '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const isArchived = version.status === 'archived';
  const isActive = version.status === 'active';

  const parentVersion = version.parent_version_id
    ? allVersions.find((v) => v.id === version.parent_version_id)
    : null;

  const linkedIdea = version.based_on_idea_id
    ? ideas.find((i) => i.id === version.based_on_idea_id)
    : null;

  const handleSave = async () => {
    if (!onUpdate) return;
    setIsSaving(true);
    try {
      const payload: { name?: string; description?: string; key_changes?: string[]; rationale?: string } = {};
      if (editData.name.trim() !== version.name) payload.name = editData.name.trim();
      if (editData.description.trim() !== (version.description || '')) payload.description = editData.description.trim();
      const newKeyChanges = editData.key_changes.split('\n').map((s) => s.trim()).filter(Boolean);
      if (JSON.stringify(newKeyChanges) !== JSON.stringify(version.key_changes || [])) payload.key_changes = newKeyChanges;
      if (editData.rationale.trim() !== (version.rationale || '')) payload.rationale = editData.rationale.trim();

      if (Object.keys(payload).length > 0) {
        await onUpdate(version.id, payload);
      }
      setIsEditing(false);
    } catch (err: any) {
      alert('保存失败: ' + (err.message || '未知错误'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditData({
      name: version.name,
      description: version.description || '',
      key_changes: (version.key_changes || []).join('\n'),
      rationale: version.rationale || '',
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="card p-5 border-blue-200 bg-blue-50/30">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-gray-400 font-mono">v{version.version_number}</span>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving || !editData.name.trim()}
              className="btn-primary text-xs px-3 py-1.5"
            >
              {isSaving ? '保存中...' : '保存'}
            </button>
            <button
              onClick={handleCancel}
              className="btn-secondary text-xs px-3 py-1.5"
            >
              取消
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">版本名称</label>
            <input
              type="text"
              className="input-field"
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">描述</label>
            <textarea
              className="textarea-field"
              rows={2}
              value={editData.description}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">关键变更（每行一条）</label>
            <textarea
              className="textarea-field"
              rows={2}
              value={editData.key_changes}
              onChange={(e) => setEditData({ ...editData, key_changes: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">变更理由</label>
            <textarea
              className="textarea-field"
              rows={2}
              value={editData.rationale}
              onChange={(e) => setEditData({ ...editData, rationale: e.target.value })}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`card p-5 ${isActive ? 'ring-1 ring-emerald-200 bg-emerald-50/20' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-xs text-gray-400 font-mono font-semibold">
              v{version.version_number}
            </span>
            <h4 className="text-sm font-medium text-gray-900 truncate">{version.name}</h4>
            <StatusBadge status={version.status} />
          </div>

          {/* Context info row */}
          <div className="flex items-center gap-3 flex-wrap">
            {parentVersion && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                基于{' '}
                <span className="font-medium text-indigo-600 cursor-default" title={parentVersion.name}>
                  v{parentVersion.version_number} {parentVersion.name}
                </span>
              </span>
            )}
            {linkedIdea && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                关联: <span className="font-medium text-amber-600">{linkedIdea.name}</span>
              </span>
            )}
            {version.created_at && (
              <span className="text-xs text-gray-400">
                {new Date(version.created_at).toLocaleDateString('zh-CN')}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {onActivate && !isActive && !isArchived && (
            <button
              onClick={() => onActivate(version.id)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-md hover:bg-emerald-100 transition-colors"
              title="设为当前活跃版本"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              激活
            </button>
          )}
          {onUpdate && !isArchived && (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
              title="编辑此版本"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              编辑
            </button>
          )}
          {onArchive && !isArchived && (
            <button
              onClick={() => onArchive(version.id)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-500 bg-gray-50 rounded-md hover:bg-red-50 hover:text-red-600 transition-colors"
              title="归档此版本"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              归档
            </button>
          )}
          {onDelete && (
            deleteConfirm ? (
              <div className="flex items-center gap-1">
                <span className="text-xs text-red-600 mr-1">确认删除?</span>
                <button
                  onClick={() => { onDelete(version.id); setDeleteConfirm(false); }}
                  className="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                  title="确认删除"
                >
                  确认
                </button>
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-500 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                >
                  取消
                </button>
              </div>
            ) : (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-400 bg-gray-50 rounded-md hover:bg-red-50 hover:text-red-600 transition-colors"
                title="永久删除此版本"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                删除
              </button>
            )
          )}
        </div>
      </div>

      {/* Description */}
      {version.description && (
        <div className="mb-3">
          <p className="text-xs text-gray-700 leading-relaxed">{version.description}</p>
        </div>
      )}

      {/* Key Changes */}
      {version.key_changes && version.key_changes.length > 0 && (
        <div className="mb-3">
          <h5 className="text-xs font-medium text-gray-500 mb-1.5">关键变更</h5>
          <div className="space-y-1">
            {version.key_changes.map((change, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                <span className="text-indigo-400 mt-0.5 flex-shrink-0">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </span>
                <span>{change}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rationale */}
      {version.rationale && (
        <div className="pt-3 border-t border-gray-100">
          <h5 className="text-xs font-medium text-gray-500 mb-1">变更理由</h5>
          <p className="text-xs text-gray-600 leading-relaxed italic">{version.rationale}</p>
        </div>
      )}
    </div>
  );
}
