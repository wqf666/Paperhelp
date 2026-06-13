'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { desktopApi } from '@/lib/desktop-api';

interface ProviderPreset {
  id: string;
  name: string;
  base_url: string;
  models: string[];
  key_placeholder: string;
  note: string;
}

export default function SettingsPage() {
  const {
    data: settings,
    error,
    isLoading,
    mutate,
  } = useSWR<any>('settings', () => api.getSettings());

  const { data: providersData } = useSWR<{ providers: ProviderPreset[] }>(
    'providers',
    () => api.getProviders()
  );

  const providers = providersData?.providers || [];

  const [formData, setFormData] = useState({
    mock_llm: false,
    llm_provider: 'deepseek',
    llm_api_key: '',
    llm_base_url: '',
    llm_model: '',
    storage_path: '',
    export_path: '',
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [appVersion, setAppVersion] = useState<string>('Web 版');

  // Connection test
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ status: string; message: string } | null>(null);

  // Custom model input toggle
  const [useCustomModel, setUseCustomModel] = useState(false);

  // Sync settings → formData
  useEffect(() => {
    if (settings) {
      setFormData({
        mock_llm: settings.mock_llm ?? false,
        llm_provider: settings.llm_provider ?? 'deepseek',
        llm_api_key: '',
        llm_base_url: settings.llm_base_url ?? '',
        llm_model: settings.llm_model ?? '',
        storage_path: settings.storage_path ?? '',
        export_path: settings.export_path ?? '',
      });
    }
  }, [settings]);

  // When providers load, check if current model is in the preset list
  useEffect(() => {
    if (providers.length > 0 && formData.llm_model) {
      const currentProvider = providers.find((p) => p.id === formData.llm_provider);
      if (currentProvider && currentProvider.models.length > 0) {
        const isInList = currentProvider.models.includes(formData.llm_model);
        setUseCustomModel(!isInList);
      }
    }
  }, [providers, formData.llm_provider, formData.llm_model]);

  useEffect(() => {
    if (desktopApi.isDesktop()) {
      desktopApi.getAppVersion().then(setAppVersion).catch(() => {});
    }
  }, []);

  // When user switches provider, auto-fill base_url and reset model
  const handleProviderChange = useCallback(
    (providerId: string) => {
      const preset = providers.find((p) => p.id === providerId);
      if (preset) {
        setFormData((prev) => ({
          ...prev,
          llm_provider: providerId,
          llm_base_url: preset.base_url || prev.llm_base_url,
          llm_model: preset.models[0] || '',
          llm_api_key: '', // clear key when switching provider
        }));
        setUseCustomModel(false);
      } else {
        setFormData((prev) => ({
          ...prev,
          llm_provider: providerId,
          llm_api_key: '',
        }));
      }
      setTestResult(null);
    },
    [providers]
  );

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    setSaveError('');
    try {
      const payload: Record<string, any> = {
        mock_llm: formData.mock_llm,
        llm_provider: formData.llm_provider,
        llm_base_url: formData.llm_base_url,
        llm_model: formData.llm_model,
        storage_path: formData.storage_path,
        export_path: formData.export_path,
      };
      if (formData.llm_api_key) {
        payload.llm_api_key = formData.llm_api_key;
      }
      await api.updateSettings(payload);
      await mutate();
      setSaveSuccess(true);
      setFormData((prev) => ({ ...prev, llm_api_key: '' }));
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      const msg = err?.body?.detail || err?.message || '保存失败';
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // Save first, then test
      await handleSave();
      const result = await api.testConnection();
      setTestResult(result);
    } catch (err: any) {
      setTestResult({ status: 'error', message: err?.message || '测试请求失败' });
    } finally {
      setTesting(false);
    }
  };

  const currentProvider = providers.find((p) => p.id === formData.llm_provider);

  return (
    <div>
      {/* Back Link */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        返回项目列表
      </Link>

      <h1 className="text-xl font-semibold text-gray-900 mb-8">设置</h1>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <svg className="animate-spin w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm text-gray-500">加载中...</span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center py-12">
          <p className="text-sm text-gray-600 mb-2">加载设置失败</p>
          <p className="text-xs text-gray-400">{error.message}</p>
        </div>
      )}

      {/* Content */}
      {!isLoading && !error && (
        <div className="space-y-6 max-w-2xl">

          {/* ── Card 1: AI Model ── */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-medium text-gray-900">AI 模型配置</h3>
              {/* Mock Mode Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Mock 模式</span>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, mock_llm: !prev.mock_llm }))
                  }
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    formData.mock_llm ? 'bg-amber-500' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      formData.mock_llm ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {formData.mock_llm && (
              <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                Mock 模式已开启 — 所有 AI 功能使用模拟数据，不会调用真实 API。关闭后即可配置模型。
              </div>
            )}

            <div className="space-y-4">
              {/* Provider Selection */}
              <div>
                <label className="block text-sm text-gray-700 mb-2">选择 AI 服务商</label>
                <div className="grid grid-cols-2 gap-2">
                  {providers.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleProviderChange(p.id)}
                      className={`text-left rounded-md border px-3 py-2.5 transition-all ${
                        formData.llm_provider === p.id
                          ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="text-sm font-medium text-gray-800">{p.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{p.note}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* API Key */}
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">API Key</label>
                <input
                  type="password"
                  value={formData.llm_api_key}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, llm_api_key: e.target.value }))
                  }
                  placeholder={
                    settings?.llm_api_key_masked && settings.llm_api_key_masked !== '***'
                      ? `当前: ${settings.llm_api_key_masked}（留空保持不变）`
                      : currentProvider?.key_placeholder || 'sk-...'
                  }
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-300 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
              </div>

              {/* Base URL */}
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">API Base URL</label>
                <input
                  type="text"
                  value={formData.llm_base_url}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, llm_base_url: e.target.value }))
                  }
                  placeholder="https://api.example.com/v1"
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-300 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 font-mono text-xs"
                />
                <p className="text-xs text-gray-400 mt-1">
                  切换服务商时自动填入，也可手动修改
                </p>
              </div>

              {/* Model Selection */}
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">模型</label>
                {currentProvider && currentProvider.models.length > 0 && !useCustomModel ? (
                  <div className="flex gap-2">
                    <select
                      value={formData.llm_model}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, llm_model: e.target.value }))
                      }
                      className="flex-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
                    >
                      {currentProvider.models.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setUseCustomModel(true)}
                      className="flex-shrink-0 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                      自定义
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.llm_model}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, llm_model: e.target.value }))
                      }
                      placeholder="输入模型名称"
                      className="flex-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-300 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
                    />
                    {currentProvider && currentProvider.models.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setUseCustomModel(false);
                          setFormData((prev) => ({
                            ...prev,
                            llm_model: currentProvider.models[0] || '',
                          }));
                        }}
                        className="flex-shrink-0 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
                      >
                        选择预设
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Test Connection */}
              <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing || formData.mock_llm}
                  className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {testing ? '测试中...' : '测试连接'}
                </button>
                {testResult && (
                  <span
                    className={`text-xs ${
                      testResult.status === 'ok' ? 'text-green-600' : 'text-red-500'
                    }`}
                  >
                    {testResult.message}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── Card 2: Data & Storage ── */}
          <div className="card p-5">
            <h3 className="text-sm font-medium text-gray-900 mb-5">数据与存储</h3>

            <div className="space-y-4">
              {/* Data Directory (read-only) */}
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">配置目录</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={settings?.data_dir || ''}
                    className="flex-1 rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed font-mono text-xs"
                  />
                  {desktopApi.isDesktop() && (
                    <button
                      type="button"
                      onClick={async () => {
                        try { await desktopApi.openDataDir(); } catch {}
                      }}
                      className="flex-shrink-0 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      打开
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">settings.json 所在位置，不可更改</p>
              </div>

              {/* Storage Path (editable) */}
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">论文文件存储路径</label>
                <input
                  type="text"
                  value={formData.storage_path}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, storage_path: e.target.value }))
                  }
                  placeholder="上传的 PDF 文件存放位置"
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-300 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 font-mono text-xs"
                />
                <p className="text-xs text-gray-400 mt-1">
                  上传的论文 PDF 将保存到此目录，修改后新文件存放至新路径
                </p>
              </div>

              {/* Export Path (editable) */}
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">导出文件路径</label>
                <input
                  type="text"
                  value={formData.export_path}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, export_path: e.target.value }))
                  }
                  placeholder="导出的 DOCX / LaTeX 文件存放位置"
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-300 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 font-mono text-xs"
                />
                <p className="text-xs text-gray-400 mt-1">
                  DOCX、LaTeX 等导出文件将保存到此目录
                </p>
              </div>
            </div>
          </div>

          {/* ── Card 3: About ── */}
          <div className="card p-5">
            <h3 className="text-sm font-medium text-gray-900 mb-4">关于</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700">版本号</p>
                <p className="text-xs text-gray-400 mt-0.5">{appVersion}</p>
              </div>
              <button
                type="button"
                className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                检查更新
              </button>
            </div>
          </div>

          {/* ── Save Button ── */}
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
            {saveError && (
              <span className="text-sm text-red-500">{saveError}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
