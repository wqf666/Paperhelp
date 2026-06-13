'use client';

import React, { useState, useRef, useEffect } from 'react';
import { api } from '@/lib/api';

interface RefinementChatProps {
  content: string;
  contentType: string;
  onApply: (newContent: string) => void;
  placeholder?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function RefinementChat({
  content,
  contentType,
  onApply,
  placeholder = '描述你希望如何调整内容...',
}: RefinementChatProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentRefined, setCurrentRefined] = useState<string | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, currentRefined]);

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const instruction = inputValue.trim();
    if (!instruction || isRefining) return;

    setInputValue('');
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', content: instruction }]);
    setIsRefining(true);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const result = await api.refineContent({
        content,
        instruction,
        content_type: contentType,
        history,
      });

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: result.assistant_message },
      ]);
      setCurrentRefined(result.refined_content);
    } catch (err: any) {
      const msg = err?.body?.detail || err?.message || '调整失败，请重试';
      setError(msg);
    } finally {
      setIsRefining(false);
    }
  };

  const handleApply = () => {
    if (currentRefined) {
      onApply(currentRefined);
      setIsExpanded(false);
    }
  };

  const handleCancel = () => {
    setIsExpanded(false);
  };

  const handleReset = () => {
    setMessages([]);
    setCurrentRefined(null);
    setError(null);
    setInputValue('');
  };

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      {/* Toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 transition-colors"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <span className="font-medium">AI 调整</span>
        <svg
          className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded panel */}
      {isExpanded && (
        <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
          {/* Messages thread */}
          {messages.length > 0 && (
            <div className="max-h-48 overflow-y-auto px-3 pt-3 space-y-2">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-700'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Refined content preview */}
          {currentRefined && (
            <div className="mx-3 mt-2 p-2.5 bg-white rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-blue-700">调整结果预览</span>
                <span className="badge badge-blue text-[10px]">已生成</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed line-clamp-4 whitespace-pre-wrap">
                {currentRefined}
              </p>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="mx-3 mt-2 p-2 bg-red-50 rounded-lg border border-red-200">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          {/* Input area */}
          <form onSubmit={handleSubmit} className="p-3">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={placeholder}
                disabled={isRefining}
                className="input-field flex-1 text-xs py-1.5 px-2.5"
              />
              <button
                type="submit"
                disabled={isRefining || !inputValue.trim()}
                className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1 disabled:opacity-50"
              >
                {isRefining ? (
                  <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
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
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                )}
                <span>发送</span>
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 mt-2">
              {currentRefined && (
                <button
                  type="button"
                  onClick={handleApply}
                  className="btn-primary text-xs px-2.5 py-1"
                >
                  应用修改
                </button>
              )}
              <button
                type="button"
                onClick={handleCancel}
                className="btn-secondary text-xs px-2.5 py-1"
              >
                取消
              </button>
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors ml-auto"
                >
                  清除记录
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
