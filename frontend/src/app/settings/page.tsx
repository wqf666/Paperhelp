'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { desktopApi } from '@/lib/desktop-api';

export default function SettingsPage() {
  const {
    data: settings,
    error,
    isLoading,
    mutate,
  } = useSWR<any>('settings', () => api.getSettings());

  const [formData, setFormData] = useState({
    mock_mode: false,
    api_provider: 'deepseek',
    api_key: '',
    api_base_url: '',
    model_name: '',
    data_dir: '',
    upload_dir: '',
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [appVersion, setAppVersion] = useState<string>('Web 版');
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        mock_mode: settings.mock_mode ?? false,
        api_provider: settings.api_provider ?? 'deepseek',
        api_key: settings.api_key ?? '',
        api_base_url: settings.api_base_url ?? '',
        model_name: settings.model_name ?? '',
        data_dir: settings.data_dir ?? '',
        upload_dir: settings.upload_dir ?? '',
      });
    }
  }, [settings]);

  useEffect(() => {
    if (desktopApi.isDesktop()) {
      desktopApi.getAppVersion().then(setAppVersion).catch(() => {});
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      await api.updateSettings(formData);
      await mutate();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDataDir = async () => {
    if (desktopApi.isDesktop()) {
      try {
        await desktopApi.openDataDir();
      } catch (err) {
        console.error('Failed to open data dir:', err);
      }
    }
  };

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setTimeout(() => setCheckingUpdate(false), 1500);
  };

  const maskedKey = (key: string) => {
    if (!key || key.length <= 8) return key ? '********' : '';
    return key.slice(0, 4) + '****' + key.slice(-4);
  };

  return (
    <div>
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

      <h1 className="text-xl font-semibold text-gray-900 mb-8">设置</h1>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
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
            <span className="text-sm text-gray-500">加载中...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-red-50 rounded-full mb-4">
            <svg
              className="w-6 h-6 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-600 mb-2">加载设置失败</p>
          <p className="text-xs text-gray-400">{error.message}</p>
        </div>
      )}

      {/* Settings Content */}
      {!isLoading && !error && (
        <div className="space-y-6 max-w-2xl">
          {/* Card 1: AI Model Configuration */}
          <div className="card p-5">
            <h3 className="text-sm font-medium text-gray-900 mb-5">AI 模型配置</h3>

            <div className="space-y-4">
              {/* Mock Mode Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm text-gray-700">Mock 模式</label>
                  <p className="text-xs text-gray-400 mt-0.5">
                    启用后不调用真实 AI API，使用模拟数据
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, mock_mode: !prev.mock_mode }))
                  }
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    formData.mock_mode ? 'bg-gray-900' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      formData.mock_mode ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* API Provider */}
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">
                  API Provider
                </label>
                <select
                  value={formData.api_provider}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, api_provider: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
                >
                  <option value="deepseek">DeepSeek</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {/* API Key */}
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">API Key</label>
                <input
                  type="password"
                  value={formData.api_key}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, api_key: e.target.value }))
                  }
                  placeholder={
                    settings?.api_key ? maskedKey(settings.api_key) : 'sk-...'
                  }
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-300 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
                {settings?.api_key && !formData.api_key && (
                  <p className="text-xs text-gray-400 mt-1">
                    留空保持原密钥不变
                  </p>
                )}
              </div>

              {/* API Base URL */}
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">
                  API Base URL
                </label>
                <input
                  type="text"
                  value={formData.api_base_url}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, api_base_url: e.target.value }))
                  }
                  placeholder="https://api.deepseek.com"
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-300 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
              </div>

              {/* Model Name */}
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">模型名称</label>
                <input
                  type="text"
                  value={formData.model_name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, model_name: e.target.value }))
                  }
                  placeholder="deepseek-chat"
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-300 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Data & Storage */}
          <div className="card p-5">
            <h3 className="text-sm font-medium text-gray-900 mb-5">数据与存储</h3>

            <div className="space-y-4">
              {/* Data Directory */}
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">
                  数据目录路径
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={formData.data_dir || '默认目录'}
                    className="flex-1 rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
                  />
                  {desktopApi.isDesktop() && (
                    <button
                      type="button"
                      onClick={handleOpenDataDir}
                      className="flex-shrink-0 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      打开
                    </button>
                  )}
                </div>
              </div>

              {/* Upload Directory */}
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">
                  上传目录路径
                </label>
                <input
                  type="text"
                  readOnly
                  value={formData.upload_dir || '默认目录'}
                  className="w-full rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Card 3: About */}
          <div className="card p-5">
            <h3 className="text-sm font-medium text-gray-900 mb-5">关于</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-700">版本号</p>
                  <p className="text-xs text-gray-400 mt-0.5">{appVersion}</p>
                </div>
                <button
                  type="button"
                  onClick={handleCheckUpdate}
                  disabled={checkingUpdate}
                  className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {checkingUpdate ? '检查中...' : '检查更新'}
                </button>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? '保存中...' : '保存设置'}
            </button>
            {saveSuccess && (
              <span className="text-sm text-green-600">设置已保存</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
