'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="max-w-lg">
        {/* Icon */}
        <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-6 h-6 text-gray-700"
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
        </div>

        {/* Title */}
        <h1 className="text-2xl font-semibold text-gray-900 mb-3">
          科研论文写作 Agent
        </h1>

        {/* Description */}
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
          AI 辅助科研写作全流程工具。上传论文、分析文献、发现创新方向、
          制定实验计划、生成论文大纲，帮助你高效开展科研工作。
        </p>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3 mb-8 text-left">
          <div className="p-3 bg-gray-50 rounded-lg">
            <h3 className="text-xs font-medium text-gray-700 mb-1">论文分析</h3>
            <p className="text-xs text-gray-500">
              自动提取研究问题、方法、创新点与局限性
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <h3 className="text-xs font-medium text-gray-700 mb-1">创新发现</h3>
            <p className="text-xs text-gray-500">
              基于文献分析，智能推荐研究方向与创新点
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <h3 className="text-xs font-medium text-gray-700 mb-1">实验规划</h3>
            <p className="text-xs text-gray-500">
              生成完整的实验方案，包括消融实验与鲁棒性测试
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <h3 className="text-xs font-medium text-gray-700 mb-1">论文撰写</h3>
            <p className="text-xs text-gray-500">
              辅助生成论文大纲、摘要与各章节内容
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <Link href="/projects" className="btn-primary">
          进入工作台
          <svg
            className="w-4 h-4 ml-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
}
