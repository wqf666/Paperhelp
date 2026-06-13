'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import useSWR, { mutate } from 'swr';
import { api } from '@/lib/api';
import type { ManuscriptState as ManuscriptStateType, MethodVersion, ManuscriptSection } from '@/lib/types';
import ComplianceBanner from '@/components/ComplianceBanner';

// ── Status config for outline section cards ──
type SectionStatus = 'pending' | 'generated' | 'needs_modify' | 'confirmed' | 'missing_citation';

const STATUS_CONFIG: Record<SectionStatus, { label: string; bg: string; text: string; dot: string }> = {
  pending:           { label: '待生成',   bg: 'bg-gray-100',   text: 'text-gray-600',   dot: 'bg-gray-400' },
  generated:         { label: '已生成',   bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500' },
  needs_modify:      { label: '需修改',   bg: 'bg-amber-100',  text: 'text-amber-700',  dot: 'bg-amber-500' },
  confirmed:         { label: '已确认',   bg: 'bg-emerald-100',text: 'text-emerald-700',dot: 'bg-emerald-500' },
  missing_citation:  { label: '缺少引用', bg: 'bg-red-100',    text: 'text-red-600',    dot: 'bg-red-400' },
};

// ── Generation settings interface ──
interface GenerationSettings {
  length: 'short' | 'medium' | 'long';
  style: 'academic' | 'concise' | 'detailed';
  basis: 'outline_only' | 'with_papers' | 'with_ideas';
}

export default function ManuscriptPage() {
  const params = useParams();
  const projectId = Number(params.id);

  // ── Core state ──
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [editingOutlinePath, setEditingOutlinePath] = useState<string | null>(null);
  const [outlineEdits, setOutlineEdits] = useState<any>(null);
  const [savingOutline, setSavingOutline] = useState(false);
  const [selectedMethodVersion, setSelectedMethodVersion] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Metadata editing
  const [editingMetadata, setEditingMetadata] = useState(false);
  const [metadataEdits, setMetadataEdits] = useState({ title: '', abstract: '', contributions: '' });
  const [savingMetadata, setSavingMetadata] = useState(false);

  // Section content generation
  const [generatingSectionPath, setGeneratingSectionPath] = useState<string | null>(null);

  // Generation settings
  const [showGenSettings, setShowGenSettings] = useState(false);
  const [genSettings, setGenSettings] = useState<GenerationSettings>({ length: 'medium', style: 'academic', basis: 'with_papers' });

  // Manuscript section editing
  const [editingSectionId, setEditingSectionId] = useState<number | null>(null);
  const [sectionEdits, setSectionEdits] = useState<Record<number, { title: string; content: string }>>({});
  const [savingSectionId, setSavingSectionId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deletingSectionId, setDeletingSectionId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSectionKey, setNewSectionKey] = useState('');
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [addingSection, setAddingSection] = useState(false);

  // AI content editing
  const [editingAiContentId, setEditingAiContentId] = useState<number | null>(null);
  const [aiContentEdit, setAiContentEdit] = useState('');
  const [savingAiContentId, setSavingAiContentId] = useState<number | null>(null);

  // AI refinement
  const [refineSectionId, setRefineSectionId] = useState<number | null>(null);
  const [refineInstruction, setRefineInstruction] = useState('');
  const [refiningId, setRefiningId] = useState<number | null>(null);
  const [refineHistory, setRefineHistory] = useState<{ role: string; content: string }[]>([]);

  // Section status tracking (local state — maps outline path to status)
  const [sectionStatuses, setSectionStatuses] = useState<Record<string, SectionStatus>>({});

  // ── Data fetching ──
  const {
    data: manuscript,
    error,
    isLoading,
  } = useSWR<ManuscriptStateType>(
    projectId ? `manuscript-${projectId}` : null,
    () => api.getManuscript(projectId),
    { onError: () => {} }
  );

  const { data: methodVersions } = useSWR<MethodVersion[]>(
    projectId ? `method-versions-${projectId}` : null,
    () => api.listMethodVersions(projectId)
  );

  const { data: manuscriptSections, mutate: mutateSections } = useSWR<ManuscriptSection[]>(
    projectId ? `manuscript-sections-${projectId}` : null,
    () => api.getManuscriptSections(projectId),
    { onError: () => {} }
  );

  // ── Progress computation ──
  const progressStats = useMemo(() => {
    if (!manuscript?.outline || manuscript.outline.length === 0) {
      return { total: 0, generated: 0, pending: 0, needsModify: 0, confirmed: 0, missingCitation: 0, percent: 0 };
    }

    let total = 0;
    let generated = 0;
    let pending = 0;
    let needsModify = 0;
    let confirmed = 0;
    let missingCitation = 0;

    const countNodes = (nodes: any[], basePath: string) => {
      nodes.forEach((node: any, i: number) => {
        const path = basePath ? `${basePath}.${i}` : String(i);
        const children = node.sections || node.subsections || [];
        const hasChildren = Array.isArray(children) && children.length > 0;

        if (!hasChildren) {
          // Leaf node — count it
          total++;
          const status = sectionStatuses[path] || 'pending';
          switch (status) {
            case 'confirmed': confirmed++; break;
            case 'generated': generated++; break;
            case 'needs_modify': needsModify++; break;
            case 'missing_citation': missingCitation++; break;
            default: pending++; break;
          }
        } else {
          countNodes(children, path);
        }
      });
    };

    countNodes(manuscript.outline, '');
    const percent = total > 0 ? Math.round(((confirmed + generated) / total) * 100) : 0;

    return { total, generated, pending, needsModify, confirmed, missingCitation, percent };
  }, [manuscript?.outline, sectionStatuses]);

  // ── Handlers ──

  const handleGenerateOutline = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsGenerating(true);
    setGenerateError(null);

    try {
      const payload: Record<string, string> = {};
      if (additionalInstructions.trim()) {
        payload.additional_instructions = additionalInstructions.trim();
      }
      await api.generateManuscriptOutline(projectId, payload);
      mutate(`manuscript-${projectId}`);
      setAdditionalInstructions('');
      setShowGenSettings(false);
      // Reset statuses
      setSectionStatuses({});
    } catch (err: any) {
      setGenerateError(err.message || '生成失败');
    } finally {
      setIsGenerating(false);
    }
  };

  // Metadata editing
  const startEditMetadata = () => {
    if (!manuscript) return;
    setMetadataEdits({
      title: manuscript.title || '',
      abstract: manuscript.abstract || '',
      contributions: Array.isArray(manuscript.contributions) ? manuscript.contributions.join('\n') : '',
    });
    setEditingMetadata(true);
  };

  const cancelEditMetadata = () => {
    setEditingMetadata(false);
    setMetadataEdits({ title: '', abstract: '', contributions: '' });
  };

  const handleSaveMetadata = async () => {
    setSavingMetadata(true);
    try {
      await api.updateManuscript(projectId, {
        title: metadataEdits.title,
        abstract: metadataEdits.abstract,
        contributions: metadataEdits.contributions.split('\n').map((s) => s.trim()).filter(Boolean),
      });
      mutate(`manuscript-${projectId}`);
      setEditingMetadata(false);
    } catch (err: any) {
      setActionError('保存失败: ' + (err.message || '未知错误'));
    } finally {
      setSavingMetadata(false);
    }
  };

  // Outline helpers
  const pathToDisplayNumber = (path: string): string =>
    path.split('.').map((n) => String(Number(n) + 1)).join('.');

  const toggleSection = (path: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(path)) newExpanded.delete(path);
    else newExpanded.add(path);
    setExpandedSections(newExpanded);
  };

  const getOutlineNode = (outline: any[], path: string): any => {
    const indices = path.split('.').map(Number);
    let node: any = outline[indices[0]];
    for (let i = 1; i < indices.length; i++) {
      node = node?.sections?.[indices[i]];
    }
    return node;
  };

  const setOutlineNode = (outline: any[], path: string, updatedNode: any): any[] => {
    const newOutline = JSON.parse(JSON.stringify(outline));
    const indices = path.split('.').map(Number);
    if (indices.length === 1) {
      newOutline[indices[0]] = { ...newOutline[indices[0]], ...updatedNode };
    } else {
      let parent: any = newOutline[indices[0]];
      for (let i = 1; i < indices.length - 1; i++) {
        parent = parent.sections[indices[i]];
      }
      parent.sections[indices[indices.length - 1]] = {
        ...parent.sections[indices[indices.length - 1]],
        ...updatedNode,
      };
    }
    return newOutline;
  };

  const handleSaveOutlineSection = async (path: string) => {
    if (!outlineEdits || !manuscript?.outline) return;
    setSavingOutline(true);
    try {
      const patch: any = {
        title: outlineEdits.title,
        description: outlineEdits.description,
        key_points: Array.isArray(outlineEdits.key_points) ? outlineEdits.key_points : [],
        estimated_length: outlineEdits.estimated_length || null,
      };
      if (Array.isArray(outlineEdits.writing_plan) && outlineEdits.writing_plan.length > 0) {
        patch.writing_plan = outlineEdits.writing_plan.map((p: any) => ({
          paragraph_topic: p.paragraph_topic || '',
          word_count: p.word_count ? Number(p.word_count) : 0,
          key_references: Array.isArray(p.key_references)
            ? p.key_references
            : typeof p.key_references === 'string'
            ? p.key_references.split('\n').map((s: string) => s.trim()).filter(Boolean)
            : [],
        }));
      }
      const newOutline = setOutlineNode(manuscript.outline, path, patch);
      await api.updateManuscriptOutline(projectId, newOutline);
      mutate(`manuscript-${projectId}`);
      setEditingOutlinePath(null);
      setOutlineEdits(null);
    } catch (err: any) {
      setActionError('保存大纲失败: ' + (err.message || '未知错误'));
    } finally {
      setSavingOutline(false);
    }
  };

  // Section content generation
  const handleGenerateSectionContent = async (path: string) => {
    if (!manuscript?.outline) return;
    const node = getOutlineNode(manuscript.outline, path);
    if (!node) return;

    setGeneratingSectionPath(path);
    setActionError(null);
    try {
      const sectionTitle = node.title || node.name || `Section ${pathToDisplayNumber(path)}`;
      const contextContent = [
        node.description || '',
        node.key_points?.length ? 'Key points:\n' + node.key_points.map((p: string) => '- ' + p).join('\n') : '',
        node.writing_plan?.length
          ? 'Writing plan:\n' + node.writing_plan.map((wp: any, i: number) => `Para ${i + 1}: ${wp.paragraph_topic} (~${wp.word_count} words)`).join('\n')
          : '',
      ].filter(Boolean).join('\n\n');

      const created = await api.createManuscriptSection(projectId, {
        section_key: `section_${path.replace(/\./g, '_')}`,
        title: sectionTitle,
        content: contextContent,
        status: 'draft',
      });

      await api.generateSectionContent(projectId, created.id);
      mutate(`manuscript-sections-${projectId}`);
      mutate(`manuscript-${projectId}`);
      setSectionStatuses((prev) => ({ ...prev, [path]: 'generated' }));
    } catch (err: any) {
      setActionError('生成小节内容失败: ' + (err.message || '未知错误'));
    } finally {
      setGeneratingSectionPath(null);
    }
  };

  // Section CRUD
  const startEditSection = (section: ManuscriptSection) => {
    setEditingSectionId(section.id);
    setSectionEdits((prev) => ({ ...prev, [section.id]: { title: section.title, content: section.content } }));
  };

  const handleSaveSection = async (sectionId: number) => {
    const edits = sectionEdits[sectionId];
    if (!edits) return;
    setSavingSectionId(sectionId);
    try {
      await api.updateManuscriptSection(sectionId, { title: edits.title, content: edits.content });
      mutateSections();
      setEditingSectionId(null);
      setSectionEdits((prev) => { const n = { ...prev }; delete n[sectionId]; return n; });
    } catch (err: any) {
      setActionError('保存失败: ' + (err.message || '未知错误'));
    } finally {
      setSavingSectionId(null);
    }
  };

  const handleDeleteSection = async (sectionId: number) => {
    setDeletingSectionId(sectionId);
    try {
      await api.deleteManuscriptSection(sectionId);
      mutate(`manuscript-sections-${projectId}`);
      setDeleteConfirmId(null);
    } catch (err: any) {
      setActionError('删除失败: ' + (err.message || '未知错误'));
    } finally {
      setDeletingSectionId(null);
    }
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionKey.trim() || !newSectionTitle.trim()) return;
    setAddingSection(true);
    try {
      await api.createManuscriptSection(projectId, {
        section_key: newSectionKey.trim(),
        title: newSectionTitle.trim(),
        content: '',
        status: 'draft',
      });
      mutate(`manuscript-sections-${projectId}`);
      setNewSectionKey(''); setNewSectionTitle(''); setShowAddForm(false);
    } catch (err: any) {
      setActionError('添加章节失败: ' + (err.message || '未知错误'));
    } finally {
      setAddingSection(false);
    }
  };

  // AI content
  const startEditAiContent = (section: ManuscriptSection) => {
    setEditingAiContentId(section.id);
    setAiContentEdit(section.generated_content || '');
  };

  const handleSaveAiContent = async (sectionId: number) => {
    setSavingAiContentId(sectionId);
    try {
      await api.updateManuscriptSection(sectionId, { generated_content: aiContentEdit });
      mutateSections();
      setEditingAiContentId(null); setAiContentEdit('');
    } catch (err: any) {
      setActionError('保存AI内容失败: ' + (err.message || '未知错误'));
    } finally {
      setSavingAiContentId(null);
    }
  };

  const handleRefineContent = async (section: ManuscriptSection) => {
    if (!refineInstruction.trim() || !section.generated_content) return;
    setRefiningId(section.id);
    try {
      const result = await api.refineContent({
        content: section.generated_content,
        instruction: refineInstruction.trim(),
        content_type: 'manuscript_section',
        history: refineHistory,
      });
      await api.updateManuscriptSection(section.id, { generated_content: result.refined_content });
      mutateSections();
      setRefineHistory((prev) => [
        ...prev,
        { role: 'user', content: refineInstruction.trim() },
        { role: 'assistant', content: result.assistant_message },
      ]);
      setRefineInstruction('');
    } catch (err: any) {
      setActionError('润色失败: ' + (err.message || '未知错误'));
    } finally {
      setRefiningId(null);
    }
  };

  const closeRefinePanel = () => {
    setRefineSectionId(null); setRefineInstruction(''); setRefineHistory([]);
  };

  // ── Section status management ──
  const markSectionStatus = (path: string, status: SectionStatus) => {
    setSectionStatuses((prev) => ({ ...prev, [path]: status }));
  };

  const expandAll = () => {
    if (!manuscript?.outline) return;
    const allPaths = new Set<string>();
    const collect = (nodes: any[], bp: string) => {
      nodes.forEach((n: any, i: number) => {
        const p = bp ? `${bp}.${i}` : String(i);
        allPaths.add(p);
        const ch = n.sections || n.subsections || [];
        if (Array.isArray(ch) && ch.length > 0) collect(ch, p);
      });
    };
    collect(manuscript.outline, '');
    setExpandedSections(allPaths);
  };

  const collapseAll = () => setExpandedSections(new Set());

  // ── Render helpers ──

  const renderWritingPlan = (writingPlan: any[]) => (
    <div className="mt-3">
      <h6 className="text-xs font-medium text-gray-500 mb-2">写作计划</h6>
      <div className="space-y-2">
        {writingPlan.map((plan: any, i: number) => (
          <div key={i} className="relative pl-6 before:content-[''] before:absolute before:left-2 before:top-0 before:bottom-0 before:w-px before:bg-gray-200">
            <div className="relative flex items-center gap-2 before:content-[''] before:absolute before:-left-4 before:top-[7px] before:w-4 before:h-px before:bg-gray-200">
              <span className="text-xs text-gray-700">段落{i + 1}: {plan.paragraph_topic}</span>
              {plan.word_count != null && (
                <span className="inline-block px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-medium rounded leading-none">
                  ~{plan.word_count}字
                </span>
              )}
            </div>
            {plan.key_references && Array.isArray(plan.key_references) && plan.key_references.length > 0 && (
              <div className="mt-1 flex flex-wrap items-center gap-1">
                <span className="text-[10px] text-gray-400 mr-0.5">参考:</span>
                {plan.key_references.map((ref: string, ri: number) => (
                  <span key={ri} className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded leading-none">{ref}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderKeyPointsEditor = () => {
    const points: string[] = outlineEdits.key_points || [];
    return (
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">关键要点</label>
        <div className="space-y-1.5">
          {points.map((point: string, i: number) => (
            <div key={i} className="flex items-start gap-1.5">
              <span className="text-xs text-gray-400 mt-1.5 w-4 text-right flex-shrink-0">{i + 1}.</span>
              <input type="text" className="input-field text-xs flex-1" value={point}
                onChange={(e) => { const np = [...points]; np[i] = e.target.value; setOutlineEdits({ ...outlineEdits, key_points: np }); }} />
              <button onClick={() => { setOutlineEdits({ ...outlineEdits, key_points: points.filter((_: any, idx: number) => idx !== i) }); }}
                className="text-gray-300 hover:text-red-400 transition-colors p-1 mt-0.5 flex-shrink-0" title="删除">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
        </div>
        <button onClick={() => setOutlineEdits({ ...outlineEdits, key_points: [...points, ''] })}
          className="mt-1.5 text-xs text-blue-500 hover:text-blue-700 transition-colors">+ 添加要点</button>
      </div>
    );
  };

  const renderWritingPlanEditor = () => {
    const plans: any[] = outlineEdits.writing_plan || [];
    if (plans.length === 0) return null;
    return (
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">写作计划</label>
        <div className="space-y-3">
          {plans.map((plan: any, i: number) => (
            <div key={i} className="p-3 bg-white rounded-lg border border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">段落 {i + 1}</span>
                <button onClick={() => setOutlineEdits({ ...outlineEdits, writing_plan: plans.filter((_: any, idx: number) => idx !== i) })}
                  className="text-gray-300 hover:text-red-400 transition-colors p-0.5" title="删除此段">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 mb-0.5">段落主题</label>
                <input type="text" className="input-field text-xs" value={plan.paragraph_topic || ''}
                  onChange={(e) => { const np = [...plans]; np[i] = { ...np[i], paragraph_topic: e.target.value }; setOutlineEdits({ ...outlineEdits, writing_plan: np }); }} />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] text-gray-400 mb-0.5">预计字数</label>
                  <input type="number" className="input-field text-xs" value={plan.word_count || ''}
                    onChange={(e) => { const np = [...plans]; np[i] = { ...np[i], word_count: e.target.value ? Number(e.target.value) : 0 }; setOutlineEdits({ ...outlineEdits, writing_plan: np }); }} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 mb-0.5">参考文献 <span className="text-gray-300">(每行一条)</span></label>
                <textarea className="textarea-field text-[11px]" rows={2}
                  value={Array.isArray(plan.key_references) ? plan.key_references.join('\n') : plan.key_references || ''}
                  onChange={(e) => { const np = [...plans]; np[i] = { ...np[i], key_references: e.target.value.split('\n').map((s: string) => s.trim()).filter(Boolean) }; setOutlineEdits({ ...outlineEdits, writing_plan: np }); }} />
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => setOutlineEdits({ ...outlineEdits, writing_plan: [...plans, { paragraph_topic: '', word_count: 200, key_references: [] }] })}
          className="mt-2 text-xs text-blue-500 hover:text-blue-700 transition-colors">+ 添加段落</button>
      </div>
    );
  };

  // ── Outline section card (new design) ──
  const renderOutlineSection = (section: any, path: string, depth = 0) => {
    const rawChildren = section.sections || section.subsections || [];
    const normalizedChildren = Array.isArray(rawChildren)
      ? rawChildren.map((c: any) => typeof c === 'string' ? { title: c, sections: [], key_points: [], description: '' } : c)
      : [];
    const hasChildren = normalizedChildren.length > 0;
    const isExpanded = expandedSections.has(path);
    const isEditing = editingOutlinePath === path;
    const sectionTitle = section.title || section.section || section.name || `Section ${pathToDisplayNumber(path)}`;
    const status = sectionStatuses[path] || 'pending';
    const statusConf = STATUS_CONFIG[status];

    // Find associated manuscript section for this path
    const sectionKey = `section_${path.replace(/\./g, '_')}`;
    const associatedSection = manuscriptSections?.find((s) => s.section_key === sectionKey);

    const startEdit = () => {
      setEditingOutlinePath(path);
      setOutlineEdits({
        title: section.title || '',
        description: section.description || '',
        key_points: Array.isArray(section.key_points) ? [...section.key_points] : [],
        estimated_length: section.estimated_length ?? '',
        writing_plan: Array.isArray(section.writing_plan)
          ? section.writing_plan.map((p: any) => ({
              paragraph_topic: p.paragraph_topic || '',
              word_count: p.word_count || 0,
              key_references: Array.isArray(p.key_references) ? [...p.key_references] : [],
            }))
          : [],
      });
    };

    const cancelEdit = () => { setEditingOutlinePath(null); setOutlineEdits(null); };

    return (
      <div key={path} className={`border rounded-lg overflow-hidden transition-all ${isExpanded ? 'border-gray-200 shadow-sm' : 'border-gray-100 hover:border-gray-200'}`}
        style={{ marginLeft: depth > 0 ? `${depth * 16}px` : 0 }}>
        {/* Card header */}
        <div className={`flex items-center justify-between px-4 py-3 ${isExpanded ? 'bg-gray-50/50' : ''}`}>
          <button onClick={() => toggleSection(path)}
            className="flex items-center gap-2.5 flex-1 min-w-0 text-left hover:bg-gray-50 rounded-md transition-colors -ml-2 pl-2 pr-2 py-1">
            {/* Expand indicator */}
            <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-400 font-mono">{pathToDisplayNumber(path)}</span>
                <span className="text-sm font-medium text-gray-900 truncate">{sectionTitle}</span>
                {/* Status badge — only for leaf nodes */}
                {!hasChildren && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusConf.bg} ${statusConf.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusConf.dot}`} />
                    {statusConf.label}
                  </span>
                )}
              </div>
              {/* Summary line */}
              {section.description && (
                <p className="text-xs text-gray-500 mt-0.5 truncate">{section.description}</p>
              )}
            </div>
          </button>

          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
            {/* Word count */}
            {section.estimated_length && !isEditing && (
              <span className="text-[10px] text-gray-400 whitespace-nowrap" title="预计字数">
                ~{section.estimated_length}字
              </span>
            )}
            {/* Key points count */}
            {section.key_points?.length > 0 && !isEditing && (
              <span className="text-[10px] text-gray-400 whitespace-nowrap" title="关键要点数">
                {section.key_points.length}要点
              </span>
            )}
            {/* Edit button */}
            {!isEditing && (
              <button onClick={startEdit} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors" title="编辑此节">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Edit form */}
        {isEditing && outlineEdits && (
          <div className="border-t border-gray-100 p-4 bg-blue-50/40 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">标题</label>
              <input type="text" className="input-field text-sm" value={outlineEdits.title}
                onChange={(e) => setOutlineEdits({ ...outlineEdits, title: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">描述</label>
              <textarea className="textarea-field text-xs" rows={3} value={outlineEdits.description}
                onChange={(e) => setOutlineEdits({ ...outlineEdits, description: e.target.value })} />
            </div>
            {renderKeyPointsEditor()}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">预计字数</label>
              <input type="number" className="input-field text-sm max-w-[140px]" value={outlineEdits.estimated_length}
                onChange={(e) => setOutlineEdits({ ...outlineEdits, estimated_length: e.target.value ? Number(e.target.value) : '' })} />
            </div>
            {renderWritingPlanEditor()}
            <div className="flex items-center gap-2 pt-1">
              <button onClick={() => handleSaveOutlineSection(path)} disabled={savingOutline} className="btn-primary text-xs">
                {savingOutline ? '保存中...' : '保存'}
              </button>
              <button onClick={cancelEdit} className="btn-secondary text-xs">取消</button>
            </div>
          </div>
        )}

        {/* Expanded detail view */}
        {isExpanded && !isEditing && (
          <div className="border-t border-gray-100 bg-gray-50/30">
            {/* 写作目标 (description) */}
            {section.description && (
              <div className="px-4 pt-3">
                <h6 className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1.5">
                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  写作目标
                </h6>
                <p className="text-xs text-gray-600 leading-relaxed pl-[18px]">{section.description}</p>
              </div>
            )}

            {/* 关键要点 */}
            {section.key_points && Array.isArray(section.key_points) && section.key_points.length > 0 && (
              <div className="px-4 pt-3">
                <h6 className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1.5">
                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  关键要点
                </h6>
                <div className="pl-[18px] space-y-1">
                  {section.key_points.map((point: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                      <span className="text-indigo-400 mt-0.5 flex-shrink-0 font-medium">{i + 1}.</span>
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 写作计划 — only leaf */}
            {!hasChildren && section.writing_plan && Array.isArray(section.writing_plan) && section.writing_plan.length > 0 && (
              <div className="px-4 pt-3">
                {renderWritingPlan(section.writing_plan)}
              </div>
            )}

            {/* 正文内容 — associated manuscript section */}
            {associatedSection?.generated_content && (
              <div className="px-4 pt-3">
                <h6 className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1.5">
                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  正文内容
                </h6>
                <div className="pl-[18px] p-3 bg-white border border-gray-100 rounded-lg">
                  <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap line-clamp-6">
                    {associatedSection.generated_content}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <button onClick={() => startEditAiContent(associatedSection)} className="text-[10px] text-blue-500 hover:text-blue-700 font-medium">编辑内容</button>
                    <button onClick={() => { setRefineSectionId(refineSectionId === associatedSection.id ? null : associatedSection.id); if (refineSectionId === associatedSection.id) closeRefinePanel(); }}
                      className="text-[10px] text-indigo-500 hover:text-indigo-700 font-medium">AI润色</button>
                  </div>

                  {/* AI content edit */}
                  {editingAiContentId === associatedSection.id && (
                    <div className="mt-2 space-y-2">
                      <textarea className="textarea-field text-xs w-full" rows={8} value={aiContentEdit} onChange={(e) => setAiContentEdit(e.target.value)} />
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveAiContent(associatedSection.id)} disabled={savingAiContentId === associatedSection.id} className="btn-primary text-xs">
                          {savingAiContentId === associatedSection.id ? '保存中...' : '保存'}
                        </button>
                        <button onClick={() => { setEditingAiContentId(null); setAiContentEdit(''); }} className="btn-secondary text-xs">取消</button>
                      </div>
                    </div>
                  )}

                  {/* Refinement panel */}
                  {refineSectionId === associatedSection.id && (
                    <div className="mt-2 pt-2 border-t border-gray-100 space-y-2">
                      {refineHistory.length > 0 && (
                        <div className="space-y-1 max-h-24 overflow-y-auto">
                          {refineHistory.map((msg, i) => (
                            <div key={i} className={`text-[11px] px-2 py-1 rounded ${msg.role === 'user' ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600'}`}>
                              <span className="font-medium">{msg.role === 'user' ? '你: ' : 'AI: '}</span>{msg.content}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input type="text" className="input-field text-xs flex-1" placeholder="例如：改得更学术..." value={refineInstruction}
                          onChange={(e) => setRefineInstruction(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleRefineContent(associatedSection); } }} />
                        <button onClick={() => handleRefineContent(associatedSection)} disabled={refiningId === associatedSection.id || !refineInstruction.trim()}
                          className="btn-primary text-xs px-3 disabled:opacity-50">
                          {refiningId === associatedSection.id ? '...' : '发送'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 参考文献 */}
            {!hasChildren && section.writing_plan && Array.isArray(section.writing_plan) && (
              (() => {
                const allRefs = section.writing_plan.flatMap((wp: any) => wp.key_references || []);
                const uniqueRefs = [...new Set(allRefs.filter(Boolean))];
                if (uniqueRefs.length === 0) return null;
                return (
                  <div className="px-4 pt-3">
                    <h6 className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1.5">
                      <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      参考文献 ({uniqueRefs.length})
                    </h6>
                    <div className="pl-[18px] flex flex-wrap gap-1">
                      {uniqueRefs.map((ref: string, i: number) => (
                        <span key={i} className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded">{ref}</span>
                      ))}
                    </div>
                  </div>
                );
              })()
            )}

            {/* 操作区 — only leaf */}
            {!hasChildren && (
              <div className="px-4 py-3 mt-1 border-t border-gray-100 bg-white/50">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Generate content */}
                  <button onClick={() => handleGenerateSectionContent(path)} disabled={generatingSectionPath === path}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-medium rounded-md transition-colors disabled:opacity-50"
                    title="基于大纲和写作计划生成正文内容">
                    {generatingSectionPath === path ? (
                      <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    )}
                    {generatingSectionPath === path ? '生成中...' : '生成正文'}
                  </button>

                  {/* Mark status buttons */}
                  {status !== 'confirmed' && (
                    <button onClick={() => markSectionStatus(path, 'confirmed')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                      title="标记为已完成并确认">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      标记完成
                    </button>
                  )}
                  {status !== 'needs_modify' && (
                    <button onClick={() => markSectionStatus(path, 'needs_modify')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors"
                      title="标记为需要修改">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      需修改
                    </button>
                  )}
                  {status !== 'missing_citation' && (
                    <button onClick={() => markSectionStatus(path, 'missing_citation')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                      title="标记为缺少引用">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      缺引用
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Children */}
            {hasChildren && (
              <div className="p-3 space-y-2">
                {normalizedChildren.map((child: any, childIndex: number) =>
                  renderOutlineSection(child, `${path}.${childIndex}`, depth + 1)
                )}
              </div>
            )}
          </div>
        )}

        {/* Children visible when editing a different node */}
        {isExpanded && isEditing && hasChildren && (
          <div className="border-t border-gray-100 p-3 bg-gray-50">
            <div className="space-y-2">
              {normalizedChildren.map((child: any, childIndex: number) =>
                renderOutlineSection(child, `${path}.${childIndex}`, depth + 1)
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Tabs ──
  const tabs = [
    { name: '概览', href: `/projects/${projectId}` },
    { name: '论文库', href: `/projects/${projectId}/papers` },
    { name: '创新方向', href: `/projects/${projectId}/ideas` },
    { name: '实验计划', href: `/projects/${projectId}/experiments` },
    { name: '方法版本', href: `/projects/${projectId}/method-versions` },
    { name: '审稿模拟', href: `/projects/${projectId}/reviewer` },
    { name: '论文大纲', href: `/projects/${projectId}/manuscript`, active: true },
    { name: '引用管理', href: `/projects/${projectId}/citations` },
    { name: '导出', href: `/projects/${projectId}/export` },
  ];

  return (
    <div>
      {/* Back Link */}
      <Link href={`/projects/${projectId}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        返回项目
      </Link>

      {/* Tabs */}
      <div className="border-b border-gray-100 mb-8">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {tabs.map((tab) => (
            <Link key={tab.name} href={tab.href}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab.active ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'}`}>
              {tab.name}
            </Link>
          ))}
        </nav>
      </div>

      {/* Compliance Banner */}
      <div className="mb-6">
        <ComplianceBanner type="error" message="论文内容由 AI 辅助生成，必须人工审核。AI 不能作为论文作者。所有学术成果应由研究人员独立验证和确认。" />
      </div>

      {/* ── PROGRESS OVERVIEW ── */}
      {manuscript?.outline && manuscript.outline.length > 0 && (
        <div className="card p-5 mb-6 bg-gradient-to-r from-gray-50 to-white border-gray-100">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-base font-semibold text-gray-900">论文写作控制台</h3>
                {manuscript.updated_at && (
                  <span className="text-[10px] text-gray-400">
                    最近更新: {new Date(manuscript.updated_at).toLocaleString('zh-CN')}
                  </span>
                )}
              </div>

              {/* Progress bar */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${progressStats.percent}%` }} />
                </div>
                <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">{progressStats.percent}%</span>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-gray-400" />
                  <span className="text-xs text-gray-500">待生成 <span className="font-medium text-gray-700">{progressStats.pending}</span></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-xs text-gray-500">已生成 <span className="font-medium text-blue-700">{progressStats.generated}</span></span>
                </div>
                {progressStats.needsModify > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-xs text-gray-500">需修改 <span className="font-medium text-amber-700">{progressStats.needsModify}</span></span>
                  </div>
                )}
                {progressStats.missingCitation > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                    <span className="text-xs text-gray-500">缺引用 <span className="font-medium text-red-600">{progressStats.missingCitation}</span></span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs text-gray-500">已确认 <span className="font-medium text-emerald-700">{progressStats.confirmed}</span></span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={expandAll}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                title="展开所有章节">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                全部展开
              </button>
              <button onClick={collapseAll}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                title="折叠所有章节">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" /></svg>
                全部折叠
              </button>
              <button onClick={() => setShowGenSettings(!showGenSettings)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                {manuscript ? '重新生成' : '生成大纲'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── GENERATION SETTINGS PANEL ── */}
      {showGenSettings && (
        <div className="card p-5 mb-6 border-indigo-100 bg-indigo-50/20">
          <h4 className="text-sm font-medium text-gray-900 mb-4">生成设置</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            {/* Length */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">篇幅长度</label>
              <div className="space-y-1.5">
                {[
                  { value: 'short', label: '精简', desc: '每节 300-500 字' },
                  { value: 'medium', label: '标准', desc: '每节 500-800 字' },
                  { value: 'long', label: '详细', desc: '每节 800-1200 字' },
                ].map((opt) => (
                  <label key={opt.value} className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${genSettings.length === opt.value ? 'bg-indigo-100 border border-indigo-200' : 'bg-white border border-gray-100 hover:bg-gray-50'}`}>
                    <input type="radio" name="gen-length" value={opt.value} checked={genSettings.length === opt.value}
                      onChange={() => setGenSettings({ ...genSettings, length: opt.value as any })} className="sr-only" />
                    <div>
                      <span className="text-xs font-medium text-gray-800">{opt.label}</span>
                      <span className="text-[10px] text-gray-500 ml-1">{opt.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Style */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">写作风格</label>
              <div className="space-y-1.5">
                {[
                  { value: 'academic', label: '学术正式', desc: '严谨学术用语' },
                  { value: 'concise', label: '简洁清晰', desc: '精炼表达' },
                  { value: 'detailed', label: '详细论述', desc: '充分展开论证' },
                ].map((opt) => (
                  <label key={opt.value} className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${genSettings.style === opt.value ? 'bg-indigo-100 border border-indigo-200' : 'bg-white border border-gray-100 hover:bg-gray-50'}`}>
                    <input type="radio" name="gen-style" value={opt.value} checked={genSettings.style === opt.value}
                      onChange={() => setGenSettings({ ...genSettings, style: opt.value as any })} className="sr-only" />
                    <div>
                      <span className="text-xs font-medium text-gray-800">{opt.label}</span>
                      <span className="text-[10px] text-gray-500 ml-1">{opt.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Basis */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">生成依据</label>
              <div className="space-y-1.5">
                {[
                  { value: 'outline_only', label: '仅大纲结构', desc: '基于大纲和要点' },
                  { value: 'with_papers', label: '结合论文库', desc: '参考已上传的论文' },
                  { value: 'with_ideas', label: '结合创新方向', desc: '融入研究创新点' },
                ].map((opt) => (
                  <label key={opt.value} className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${genSettings.basis === opt.value ? 'bg-indigo-100 border border-indigo-200' : 'bg-white border border-gray-100 hover:bg-gray-50'}`}>
                    <input type="radio" name="gen-basis" value={opt.value} checked={genSettings.basis === opt.value}
                      onChange={() => setGenSettings({ ...genSettings, basis: opt.value as any })} className="sr-only" />
                    <div>
                      <span className="text-xs font-medium text-gray-800">{opt.label}</span>
                      <span className="text-[10px] text-gray-500 ml-1">{opt.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Additional instructions */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">补充说明</label>
            <textarea placeholder="可以指定论文侧重点、特殊要求、目标读者等..." className="textarea-field" rows={3}
              value={additionalInstructions} onChange={(e) => setAdditionalInstructions(e.target.value)} />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button onClick={handleGenerateOutline} disabled={isGenerating}
              className="btn-primary text-sm inline-flex items-center gap-1.5">
              {isGenerating ? (
                <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>生成中...</>
              ) : (
                <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>{manuscript ? '重新生成大纲' : '开始生成'}</>
              )}
            </button>
            <button onClick={() => setShowGenSettings(false)} className="btn-secondary text-sm">取消</button>
            {generateError && <span className="text-xs text-red-600">{generateError}</span>}
          </div>
        </div>
      )}

      {/* Method Version Selector */}
      {methodVersions && methodVersions.length > 0 && (
        <div className="card p-4 mb-6">
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gray-700 whitespace-nowrap">方法版本</label>
            <select className="input-field max-w-xs" value={selectedMethodVersion ?? ''}
              onChange={(e) => setSelectedMethodVersion(e.target.value ? parseInt(e.target.value, 10) : null)}>
              <option value="">全部版本</option>
              {methodVersions.map((v) => (
                <option key={v.id} value={v.id}>v{v.version_number} - {v.name} ({v.status === 'active' ? '活跃' : v.status === 'draft' ? '草稿' : '已归档'})</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Action Error */}
      {actionError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start justify-between gap-2">
          <p className="text-xs text-red-600">{actionError}</p>
          <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600 flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* ── MANUSCRIPT METADATA ── */}
      {manuscript && (
        <div className="card p-5 mb-6">
          {editingMetadata ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">论文标题</label>
                <input type="text" className="input-field text-sm" value={metadataEdits.title}
                  onChange={(e) => setMetadataEdits({ ...metadataEdits, title: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">摘要</label>
                <textarea className="textarea-field text-sm" rows={6} value={metadataEdits.abstract}
                  onChange={(e) => setMetadataEdits({ ...metadataEdits, abstract: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">主要贡献 <span className="text-gray-400 font-normal">(每行一条)</span></label>
                <textarea className="textarea-field text-sm" rows={4} value={metadataEdits.contributions}
                  onChange={(e) => setMetadataEdits({ ...metadataEdits, contributions: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleSaveMetadata} disabled={savingMetadata} className="btn-primary text-xs">{savingMetadata ? '保存中...' : '保存'}</button>
                <button onClick={cancelEditMetadata} className="btn-secondary text-xs">取消</button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xs font-medium text-gray-500 mb-1">论文标题</h3>
                  <p className="text-base font-medium text-gray-900">{manuscript.title || '(未设置)'}</p>
                </div>
                <button onClick={startEditMetadata} className="text-gray-400 hover:text-blue-500 transition-colors p-1 flex-shrink-0 ml-3" title="编辑标题、摘要和贡献">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
              </div>
              {manuscript.abstract && (
                <div className="mb-4">
                  <h3 className="text-xs font-medium text-gray-500 mb-1">摘要</h3>
                  <p className="text-sm text-gray-700 leading-relaxed">{manuscript.abstract}</p>
                </div>
              )}
              {manuscript.contributions && manuscript.contributions.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-gray-500 mb-1">主要贡献</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {manuscript.contributions.map((c, i) => <li key={i} className="text-sm text-gray-700">{c}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── OUTLINE SECTIONS ── */}
      {manuscript?.outline && manuscript.outline.length > 0 && (
        <div className="mb-8">
          <div className="space-y-3">
            {manuscript.outline.map((section, index) => renderOutlineSection(section, String(index)))}
          </div>
        </div>
      )}

      {/* ── MANUSCRIPT SECTIONS EDITOR ── */}
      {manuscriptSections && manuscriptSections.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-medium text-gray-900 mb-4">已生成章节</h3>
          <div className="space-y-3">
            {manuscriptSections
              .filter((s) => !selectedMethodVersion || s.method_version_id === null || s.method_version_id === selectedMethodVersion)
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((section) => {
                const isEditing = editingSectionId === section.id;
                const edits = sectionEdits[section.id];
                const isSaving = savingSectionId === section.id;
                const isDeleteConfirm = deleteConfirmId === section.id;
                const isDeleting = deletingSectionId === section.id;
                const statusLabels: Record<string, { label: string; className: string }> = {
                  draft: { label: '草稿', className: 'bg-gray-100 text-gray-600' },
                  in_progress: { label: '进行中', className: 'bg-blue-100 text-blue-700' },
                  completed: { label: '已完成', className: 'bg-green-100 text-green-700' },
                  reviewed: { label: '已审核', className: 'bg-purple-100 text-purple-700' },
                };
                const statusConfig = statusLabels[section.status] || statusLabels.draft;

                return (
                  <div key={section.id} className="card p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <input type="text" className="input-field text-sm font-medium max-w-sm" value={edits?.title || ''}
                            onChange={(e) => setSectionEdits((prev) => ({ ...prev, [section.id]: { ...prev[section.id], title: e.target.value } }))} />
                        ) : (
                          <h4 className="text-sm font-medium text-gray-900">{section.title}</h4>
                        )}
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusConfig.className}`}>{statusConfig.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <button onClick={() => handleSaveSection(section.id)} disabled={isSaving} className="btn-primary text-xs">{isSaving ? '保存中...' : '保存'}</button>
                            <button onClick={() => { setEditingSectionId(null); setSectionEdits((p) => { const n = { ...p }; delete n[section.id]; return n; }); }} className="btn-secondary text-xs">取消</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEditSection(section)} className="text-xs text-gray-500 hover:text-gray-700">编辑</button>
                            {isDeleteConfirm ? (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-red-500">确认?</span>
                                <button onClick={() => handleDeleteSection(section.id)} disabled={isDeleting} className="text-xs text-red-600 hover:text-red-800 font-medium">{isDeleting ? '...' : '确认'}</button>
                                <button onClick={() => setDeleteConfirmId(null)} className="text-xs text-gray-500 hover:text-gray-700">取消</button>
                              </div>
                            ) : (
                              <button onClick={() => setDeleteConfirmId(section.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1" title="删除">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    {isEditing ? (
                      <textarea className="textarea-field text-xs mt-2" rows={8} value={edits?.content || ''}
                        onChange={(e) => setSectionEdits((prev) => ({ ...prev, [section.id]: { ...prev[section.id], content: e.target.value } }))} />
                    ) : (
                      <div className="mt-2">
                        <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{section.content || '暂无内容'}</p>
                        {section.generated_content && (
                          <div className="mt-3 p-3 bg-green-50 border border-green-100 rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <h6 className="text-xs font-medium text-green-700">AI 生成内容</h6>
                              <div className="flex items-center gap-1">
                                {editingAiContentId === section.id ? (
                                  <>
                                    <button onClick={() => handleSaveAiContent(section.id)} disabled={savingAiContentId === section.id} className="text-xs text-green-600 hover:text-green-800 font-medium disabled:opacity-50">{savingAiContentId === section.id ? '保存中...' : '保存'}</button>
                                    <button onClick={() => { setEditingAiContentId(null); setAiContentEdit(''); }} className="text-xs text-gray-500 hover:text-gray-700">取消</button>
                                  </>
                                ) : (
                                  <>
                                    <button onClick={() => startEditAiContent(section)} className="text-gray-400 hover:text-blue-500 transition-colors p-0.5" title="编辑AI内容">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    </button>
                                    <button onClick={() => { setRefineSectionId(refineSectionId === section.id ? null : section.id); if (refineSectionId === section.id) closeRefinePanel(); }}
                                      className={`p-0.5 transition-colors ${refineSectionId === section.id ? 'text-indigo-500' : 'text-gray-400 hover:text-indigo-500'}`} title="AI润色">
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            {editingAiContentId === section.id ? (
                              <textarea className="textarea-field text-xs w-full" rows={10} value={aiContentEdit} onChange={(e) => setAiContentEdit(e.target.value)} />
                            ) : (
                              <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{section.generated_content}</p>
                            )}
                            {refineSectionId === section.id && (
                              <div className="mt-3 pt-3 border-t border-green-200 space-y-2">
                                <p className="text-[10px] text-green-600 font-medium">向 AI 发送润色指令</p>
                                {refineHistory.length > 0 && (
                                  <div className="space-y-1 max-h-32 overflow-y-auto">
                                    {refineHistory.map((msg, i) => (
                                      <div key={i} className={`text-[11px] px-2 py-1 rounded ${msg.role === 'user' ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600'}`}>
                                        <span className="font-medium">{msg.role === 'user' ? '你: ' : 'AI: '}</span>{msg.content}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  <input type="text" className="input-field text-xs flex-1" placeholder="例如：将这段文字改为更学术的风格..." value={refineInstruction}
                                    onChange={(e) => setRefineInstruction(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleRefineContent(section); } }} />
                                  <button onClick={() => handleRefineContent(section)} disabled={refiningId === section.id || !refineInstruction.trim()}
                                    className="btn-primary text-xs px-3 disabled:opacity-50">
                                    {refiningId === section.id ? '...' : '发送'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Add Section */}
      <div className="mb-8">
        {showAddForm ? (
          <form onSubmit={handleAddSection} className="card p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">添加新章节</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">章节标识</label>
                <input type="text" className="input-field text-sm" placeholder="例如: introduction" value={newSectionKey} onChange={(e) => setNewSectionKey(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">章节标题</label>
                <input type="text" className="input-field text-sm" placeholder="例如: 引言" value={newSectionTitle} onChange={(e) => setNewSectionTitle(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <button type="submit" disabled={addingSection || !newSectionKey.trim() || !newSectionTitle.trim()} className="btn-primary text-xs">
                  {addingSection ? '添加中...' : '添加'}
                </button>
                <button type="button" onClick={() => { setShowAddForm(false); setNewSectionKey(''); setNewSectionTitle(''); }} className="btn-secondary text-xs">取消</button>
              </div>
            </div>
          </form>
        ) : (
          <button onClick={() => setShowAddForm(true)}
            className="w-full py-3 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors">
            + 添加章节
          </button>
        )}
      </div>

      {/* Unresolved Issues */}
      {manuscript?.unresolved_issues && manuscript.unresolved_issues.length > 0 && (
        <div className="card p-5 mb-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">待解决问题</h3>
          <div className="space-y-2">
            {manuscript.unresolved_issues.map((issue, i) => (
              <div key={i} className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-xs text-amber-700">{issue}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <svg className="animate-spin w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm text-gray-500">加载论文大纲...</span>
          </div>
        </div>
      )}

      {/* Empty State — no manuscript */}
      {!isLoading && !error && !manuscript && (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-50 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <p className="text-sm text-gray-700 font-medium mb-2">还没有论文大纲</p>
          <p className="text-xs text-gray-400 mb-6">点击下方按钮开始生成你的论文大纲</p>
          <button onClick={() => setShowGenSettings(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            开始生成大纲
          </button>
        </div>
      )}

      {/* Generate settings modal for empty state */}
      {!isLoading && !error && !manuscript && showGenSettings && (
        <div className="card p-5 mb-8">
          <h3 className="text-sm font-medium text-gray-900 mb-4">生成设置</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">篇幅长度</label>
              <div className="space-y-1.5">
                {[{ value: 'short', label: '精简' }, { value: 'medium', label: '标准' }, { value: 'long', label: '详细' }].map((opt) => (
                  <label key={opt.value} className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${genSettings.length === opt.value ? 'bg-indigo-100 border border-indigo-200' : 'bg-white border border-gray-100'}`}>
                    <input type="radio" name="gen-length-empty" value={opt.value} checked={genSettings.length === opt.value}
                      onChange={() => setGenSettings({ ...genSettings, length: opt.value as any })} className="sr-only" />
                    <span className="text-xs font-medium text-gray-800">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">写作风格</label>
              <div className="space-y-1.5">
                {[{ value: 'academic', label: '学术正式' }, { value: 'concise', label: '简洁清晰' }, { value: 'detailed', label: '详细论述' }].map((opt) => (
                  <label key={opt.value} className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${genSettings.style === opt.value ? 'bg-indigo-100 border border-indigo-200' : 'bg-white border border-gray-100'}`}>
                    <input type="radio" name="gen-style-empty" value={opt.value} checked={genSettings.style === opt.value}
                      onChange={() => setGenSettings({ ...genSettings, style: opt.value as any })} className="sr-only" />
                    <span className="text-xs font-medium text-gray-800">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">生成依据</label>
              <div className="space-y-1.5">
                {[{ value: 'outline_only', label: '仅大纲' }, { value: 'with_papers', label: '结合论文' }, { value: 'with_ideas', label: '结合创新方向' }].map((opt) => (
                  <label key={opt.value} className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${genSettings.basis === opt.value ? 'bg-indigo-100 border border-indigo-200' : 'bg-white border border-gray-100'}`}>
                    <input type="radio" name="gen-basis-empty" value={opt.value} checked={genSettings.basis === opt.value}
                      onChange={() => setGenSettings({ ...genSettings, basis: opt.value as any })} className="sr-only" />
                    <span className="text-xs font-medium text-gray-800">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">补充说明</label>
            <textarea placeholder="可以指定论文侧重点、特殊要求等..." className="textarea-field" rows={3}
              value={additionalInstructions} onChange={(e) => setAdditionalInstructions(e.target.value)} />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleGenerateOutline} disabled={isGenerating} className="btn-primary text-sm">
              {isGenerating ? '生成中...' : '开始生成'}
            </button>
            <button onClick={() => setShowGenSettings(false)} className="btn-secondary text-sm">取消</button>
            {generateError && <span className="text-xs text-red-600">{generateError}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
