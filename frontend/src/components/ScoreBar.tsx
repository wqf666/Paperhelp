'use client';

import React from 'react';

interface ScoreBarProps {
  label: string;
  value: number;
  color?: string;
}

export default function ScoreBar({
  label,
  value,
  color = 'bg-gray-800',
}: ScoreBarProps) {
  const percentage = Math.min(Math.max(value * 10, 0), 100);

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-12 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-700 w-8 text-right">
        {value.toFixed(1)}
      </span>
    </div>
  );
}
