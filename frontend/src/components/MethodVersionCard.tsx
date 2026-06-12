'use client';

import React from 'react';
import type { MethodVersion } from '@/lib/types';

interface MethodVersionCardProps {
  version: MethodVersion;
  onArchive?: (id: number) => void;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: '草稿', className: 'bg-gray-100 text-gray-600' },
  active: { label: '活跃', className: 'bg-green-100 text-green-700' },
  archived: { label: '已归档', className: 'bg-yellow-100 text-yellow-700' },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || { label: status, className: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

export default function MethodVersionCard({ version, onArchive }: MethodVersionCardProps) {
  const isArchived = version.status === 'archived';

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-400 font-mono">
              v{version.version_number}
            </span>
            <h4 className="text-sm font-medium text-gray-900">{version.name}</h4>
          </div>
          <StatusBadge status={version.status} />
        </div>

        {/* Archive Button */}
        {onArchive && !isArchived && (
          <button
            onClick={() => onArchive(version.id)}
            className="text-xs text-gray-500 hover:text-red-600 transition-colors flex items-center gap-1"
            title="归档此版本"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            归档
          </button>
        )}
      </div>

      {/* Description */}
      {version.description && (
        <div className="mb-3">
          <h5 className="text-xs font-medium text-gray-500 mb-1">描述</h5>
          <p className="text-xs text-gray-700 leading-relaxed">{version.description}</p>
        </div>
      )}

      {/* Key Changes */}
      {version.key_changes && version.key_changes.length > 0 && (
        <div className="mb-3">
          <h5 className="text-xs font-medium text-gray-500 mb-1">关键变更</h5>
          <ul className="space-y-0.5">
            {version.key_changes.map((change, i) => (
              <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                <span className="text-gray-400 mt-0.5">&#8226;</span>
                <span>{change}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Rationale */}
      {version.rationale && (
        <div className="mb-3">
          <h5 className="text-xs font-medium text-gray-500 mb-1">变更理由</h5>
          <p className="text-xs text-gray-700 leading-relaxed">{version.rationale}</p>
        </div>
      )}

      {/* Parent Version Link */}
      {version.parent_version_id !== null && (
        <div className="pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            基于版本 #{version.parent_version_id}
          </p>
        </div>
      )}
    </div>
  );
}
