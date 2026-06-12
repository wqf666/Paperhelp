'use client';

import React from 'react';

interface ComplianceBannerProps {
  type?: 'info' | 'warning' | 'error';
  message: string;
}

export default function ComplianceBanner({
  type = 'info',
  message,
}: ComplianceBannerProps) {
  const styles: Record<
    string,
    { bg: string; border: string; text: string; icon: string }
  > = {
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-100',
      text: 'text-blue-700',
      icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-100',
      text: 'text-amber-700',
      icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-100',
      text: 'text-red-700',
      icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
    },
  };

  const style = styles[type];

  return (
    <div
      className={`flex items-start gap-2 p-3 rounded-lg border ${style.bg} ${style.border}`}
    >
      <svg
        className={`w-4 h-4 flex-shrink-0 mt-0.5 ${style.text}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d={style.icon}
        />
      </svg>
      <p className={`text-xs leading-relaxed ${style.text}`}>{message}</p>
    </div>
  );
}
