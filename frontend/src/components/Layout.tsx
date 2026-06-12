'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { initDesktopPort, desktopApi } from '@/lib/desktop-api';

interface LayoutProps {
  children: React.ReactNode;
}

type SidecarStatus = 'ready' | 'loading' | 'error';

export default function Layout({ children }: LayoutProps) {
  const pathname = usePathname();
  const [sidecarStatus, setSidecarStatus] = useState<SidecarStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const checkSidecar = useCallback(async () => {
    // Detect Tauri environment
    const isTauri =
      typeof window !== 'undefined' && '__TAURI__' in window;
    if (!isTauri) {
      // Web/dev mode — no sidecar needed
      setSidecarStatus('ready');
      return;
    }

    // Poll until ready or timeout
    const maxAttempts = 60;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const ready = await desktopApi.checkSidecarReady();
        if (ready) {
          await initDesktopPort();
          setSidecarStatus('ready');
          return;
        }
      } catch {
        // Tauri command failed, keep polling
      }
      await new Promise((r) => setTimeout(r, 1000));
    }

    setSidecarStatus('error');
    setErrorMessage('后端服务启动超时，请关闭后重试。如问题持续，请联系技术支持。');
  }, []);

  useEffect(() => {
    checkSidecar();
  }, [checkSidecar]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link
              href="/projects"
              className="flex items-center gap-2 text-gray-900 hover:text-gray-700 transition-colors"
            >
              <svg
                className="w-5 h-5"
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
              <span className="font-semibold text-sm">科研论文写作 Agent</span>
            </Link>

            <nav className="flex items-center gap-1">
              <Link
                href="/projects"
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  pathname === '/projects' || pathname.startsWith('/projects')
                    ? 'bg-gray-100 text-gray-900 font-medium'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                项目列表
              </Link>
              <Link
                href="/settings"
                className={`p-1.5 rounded-md transition-colors ${
                  pathname === '/settings'
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
                title="设置"
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
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {sidecarStatus === 'loading' && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-blue-500 mb-6"></div>
              <h2 className="text-lg font-medium text-gray-700 mb-2">
                正在启动服务...
              </h2>
              <p className="text-sm text-gray-400">
                首次启动可能需要几秒钟，请稍候
              </p>
            </div>
          )}
          {sidecarStatus === 'error' && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-6 h-6 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-medium text-gray-700 mb-2">
                服务启动失败
              </h2>
              <p className="text-sm text-gray-400 mb-6 max-w-sm">
                {errorMessage}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
              >
                重新启动
              </button>
            </div>
          )}
          {sidecarStatus === 'ready' && children}
        </div>
      </main>

      {/* Footer Compliance Banner */}
      <footer className="border-t border-gray-100 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <p className="text-center text-xs text-gray-400">
            AI 辅助工具 — 生成内容请人工审核
          </p>
        </div>
      </footer>
    </div>
  );
}
