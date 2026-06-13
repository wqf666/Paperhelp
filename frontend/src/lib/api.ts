import type {
  Project,
  Paper,
  PaperCard as PaperCardType,
  ResearchIdea,
  ExperimentPlan,
  ManuscriptState,
  PaperChunk,
  EvidenceSpan,
  MethodVersion,
  ExperimentResult,
  ResultsAnalysis,
  ReviewerSimulation,
  ManuscriptSection,
  Citation,
  ExportTemplate,
  ExportRecord,
} from './types';

// In desktop mode, the port is injected by Tauri as window.__PAPERHELP_PORT__
declare global {
  interface Window {
    __PAPERHELP_PORT__?: number;
  }
}

function getApiBase(): string {
  // Priority: Tauri injected port > env var (build-time) > default
  if (typeof window !== 'undefined' && window.__PAPERHELP_PORT__) {
    return `http://127.0.0.1:${window.__PAPERHELP_PORT__}`;
  }
  if (typeof window !== 'undefined' && (window as any).__NEXT_PUBLIC_API_URL__) {
    return (window as any).__NEXT_PUBLIC_API_URL__;
  }
  // Build-time env (Next.js static export) or dev default
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
}

class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body?: any
  ) {
    super(`API Error: ${status} ${statusText}`);
    this.name = 'ApiError';
  }
}

/**
 * Parse a response body based on its content-type header.
 * - application/json → response.json()
 * - text/* → response.text()
 * - 204 / no content → undefined
 */
async function parseResponse(response: Response): Promise<any> {
  if (response.status === 204) {
    return undefined;
  }

  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  if (contentType.includes('text/') || contentType.includes('text/plain')) {
    return response.text();
  }

  // Fallback: try JSON, then text
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const fullUrl = `${getApiBase()}${url}`;

  // Only set Content-Type: application/json when the body is NOT FormData.
  // For FormData the browser auto-sets multipart/form-data with the correct boundary.
  const isFormData = options?.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string> || {}),
  };

  if (!isFormData && !headers['Content-Type'] && options?.body) {
    headers['Content-Type'] = 'application/json';
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  const response = await fetch(fullUrl, config);

  if (!response.ok) {
    const errorBody = await parseResponse(response);
    throw new ApiError(response.status, response.statusText, errorBody);
  }

  return parseResponse(response) as Promise<T>;
}

export const api = {
  // ─── Projects ───
  createProject: (data: {
    name: string;
    description?: string;
    target_field?: string;
    target_venue?: string;
  }) =>
    request<Project>('/projects/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  listProjects: () => request<Project[]>('/projects/'),

  getProject: (id: number) => request<Project>(`/projects/${id}`),

  updateProject: (id: number, data: { name?: string; description?: string; target_field?: string; target_venue?: string }) =>
    request<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteProject: (id: number): Promise<void> =>
    request<void>(`/projects/${id}`, { method: 'DELETE' }),

  // ─── Papers ───
  addPaper: (
    projectId: number,
    data: {
      title: string;
      authors?: string;
      year?: number;
      venue?: string;
      doi?: string;
      abstract?: string;
    }
  ) =>
    request<Paper>(`/projects/${projectId}/papers`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  listPapers: (projectId: number) =>
    request<Paper[]>(`/projects/${projectId}/papers`),

  analyzePaper: (paperId: number) =>
    request<PaperCardType>(`/papers/${paperId}/analyze`, {
      method: 'POST',
    }),

  deletePaper: (paperId: number): Promise<void> =>
    request<void>(`/papers/${paperId}`, { method: 'DELETE' }),

  getPaperCard: (paperId: number) =>
    request<PaperCardType>(`/papers/${paperId}/card`),

  // ─── Ideas ───
  generateIdeas: (
    projectId: number,
    data: {
      research_field: string;
      additional_context?: string;
    }
  ) =>
    request<ResearchIdea[]>(`/projects/${projectId}/ideas/generate`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  listIdeas: (projectId: number) =>
    request<ResearchIdea[]>(`/projects/${projectId}/ideas`),

  deleteIdea: (ideaId: number): Promise<void> =>
    request<void>(`/ideas/${ideaId}`, { method: 'DELETE' }),

  // ─── Experiment Plans ───
  generateExperimentPlan: (ideaId: number) =>
    request<ExperimentPlan>(`/ideas/${ideaId}/experiment-plan/generate`, {
      method: 'POST',
    }),

  getExperimentPlan: (ideaId: number) =>
    request<ExperimentPlan>(`/ideas/${ideaId}/experiment-plan`),

  // ─── Manuscript ───
  generateManuscriptOutline: (
    projectId: number,
    data?: {
      additional_instructions?: string;
    }
  ) =>
    request<ManuscriptState>(`/projects/${projectId}/manuscript/outline/generate`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),

  getManuscript: (projectId: number) =>
    request<ManuscriptState>(`/projects/${projectId}/manuscript`),

  updateManuscript: (projectId: number, data: { title?: string; abstract?: string; contributions?: string[] }) =>
    request<ManuscriptState>(`/projects/${projectId}/manuscript`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // ─── PDF Upload & Chunks ───
  uploadPaperPdf: (projectId: number, formData: FormData) =>
    request<Paper>(`/projects/${projectId}/papers/upload`, {
      method: 'POST',
      body: formData,
    }),
  getPaperChunks: (paperId: number) =>
    request<PaperChunk[]>(`/papers/${paperId}/chunks`),
  reparsePaper: (paperId: number) =>
    request<{ message: string; status: string }>(`/papers/${paperId}/reparse`, { method: 'POST' }),

  // ─── Evidence Spans ───
  getEvidenceSpans: (paperId: number) =>
    request<EvidenceSpan[]>(`/papers/${paperId}/card/evidence-spans`),

  // ─── Method Versions ───
  createMethodVersion: (projectId: number, data: { name: string; description?: string; key_changes?: string[]; rationale?: string; based_on_idea_id?: number; parent_version_id?: number }) =>
    request<MethodVersion>(`/projects/${projectId}/method-versions`, { method: 'POST', body: JSON.stringify(data) }),
  listMethodVersions: (projectId: number) =>
    request<MethodVersion[]>(`/projects/${projectId}/method-versions`),
  getMethodVersion: (projectId: number, versionId: number) =>
    request<MethodVersion>(`/projects/${projectId}/method-versions/${versionId}`),
  updateMethodVersion: (projectId: number, versionId: number, data: { name?: string; description?: string; key_changes?: string[]; status?: string }) =>
    request<MethodVersion>(`/projects/${projectId}/method-versions/${versionId}`, { method: 'PUT', body: JSON.stringify(data) }),
  archiveMethodVersion: (projectId: number, versionId: number) =>
    request<MethodVersion>(`/projects/${projectId}/method-versions/${versionId}/archive`, { method: 'POST' }),
  activateMethodVersion: (projectId: number, versionId: number) =>
    request<MethodVersion>(`/projects/${projectId}/method-versions/${versionId}/activate`, { method: 'POST' }),
  deleteMethodVersion: (projectId: number, versionId: number): Promise<void> =>
    request<void>(`/projects/${projectId}/method-versions/${versionId}`, { method: 'DELETE' }),

  // ─── Experiment Results ───
  uploadExperimentResult: (projectId: number, formData: FormData) =>
    request<ExperimentResult>(`/projects/${projectId}/experiment-results/upload`, {
      method: 'POST',
      body: formData,
    }),
  listExperimentResults: (projectId: number) =>
    request<ExperimentResult[]>(`/projects/${projectId}/experiment-results`),
  getExperimentResult: (resultId: number) =>
    request<ExperimentResult>(`/experiment-results/${resultId}`),
  analyzeExperimentResult: (resultId: number) =>
    request<ResultsAnalysis>(`/experiment-results/${resultId}/analyze`, { method: 'POST' }),
  getResultsAnalysis: (resultId: number) =>
    request<ResultsAnalysis>(`/experiment-results/${resultId}/analysis`),

  deleteExperimentResult: (resultId: number): Promise<void> =>
    request<void>(`/experiment-results/${resultId}`, { method: 'DELETE' }),

  // ─── Reviewer Simulation ───
  generateReviewerSimulation: (projectId: number, numReviewers?: number) =>
    request<ReviewerSimulation[]>(`/projects/${projectId}/reviewer-simulation/generate`, {
      method: 'POST',
      body: JSON.stringify({ num_reviewers: numReviewers || 3 }),
    }),
  listReviewerSimulations: (projectId: number) =>
    request<ReviewerSimulation[]>(`/projects/${projectId}/reviewer-simulations`),

  deleteReviewerSimulations: (projectId: number): Promise<void> =>
    request<void>(`/projects/${projectId}/reviewer-simulations`, { method: 'DELETE' }),

  // ─── Differentiation Check ───
  checkDifferentiation: (ideaId: number) =>
    request<any>(`/ideas/${ideaId}/differentiation-check`, { method: 'POST' }),

  // ─── Manuscript Sections ───
  getManuscriptSections: (projectId: number) =>
    request<ManuscriptSection[]>(`/projects/${projectId}/manuscript/sections`),

  createManuscriptSection: (projectId: number, data: any): Promise<ManuscriptSection> =>
    request<ManuscriptSection>(`/projects/${projectId}/manuscript/sections`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateManuscriptSection: (sectionId: number, data: { title?: string; content?: string; generated_content?: string; status?: string }) =>
    request<ManuscriptSection>(`/manuscript-sections/${sectionId}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteManuscriptSection: (sectionId: number): Promise<void> =>
    request<void>(`/manuscript-sections/${sectionId}`, {
      method: 'DELETE',
    }),

  reorderManuscriptSections: (projectId: number, sectionIds: number[]): Promise<ManuscriptSection[]> => {
    // Convert number[] to the array-of-objects format the backend expects
    const body = sectionIds.map((id, index) => ({ id, sort_order: index }));
    return request<ManuscriptSection[]>(`/projects/${projectId}/manuscript/sections/reorder`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  // ─── Citations ───
  importBibtex: (projectId: number, bibtex: string): Promise<Citation[]> => {
    // Send BibTeX text as a file via FormData (backend expects UploadFile)
    const blob = new Blob([bibtex], { type: 'application/x-bibtex' });
    const fd = new FormData();
    fd.append('file', blob, 'import.bib');
    return request<Citation[]>(`/projects/${projectId}/citations/import-bibtex`, {
      method: 'POST',
      body: fd,
    });
  },

  createCitation: (projectId: number, data: any): Promise<Citation> =>
    request<Citation>(`/projects/${projectId}/citations`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  listCitations: (projectId: number, search?: string): Promise<Citation[]> => {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    return request<Citation[]>(`/projects/${projectId}/citations${params}`);
  },

  getCitation: (projectId: number, citationId: number): Promise<Citation> =>
    request<Citation>(`/projects/${projectId}/citations/${citationId}`),

  updateCitation: (projectId: number, citationId: number, data: any): Promise<Citation> =>
    request<Citation>(`/projects/${projectId}/citations/${citationId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteCitation: (projectId: number, citationId: number): Promise<void> =>
    request<void>(`/projects/${projectId}/citations/${citationId}`, {
      method: 'DELETE',
    }),

  exportBibtex: (projectId: number): Promise<string> =>
    // Backend returns text/plain, request() now handles this correctly
    request<string>(`/projects/${projectId}/citations/export-bibtex`),

  // ─── Templates ───
  listTemplates: (templateType?: string): Promise<ExportTemplate[]> => {
    const params = templateType ? `?template_type=${encodeURIComponent(templateType)}` : '';
    return request<ExportTemplate[]>(`/templates${params}`);
  },

  getTemplate: (templateId: number): Promise<ExportTemplate> =>
    request<ExportTemplate>(`/templates/${templateId}`),

  // ─── Export ───
  exportDocx: (projectId: number, data?: any): Promise<ExportRecord> =>
    request<ExportRecord>(`/projects/${projectId}/export/docx`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),

  exportLatex: (projectId: number, data?: any): Promise<ExportRecord> =>
    request<ExportRecord>(`/projects/${projectId}/export/latex`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),

  exportCoverLetter: (projectId: number, data: any): Promise<ExportRecord> =>
    request<ExportRecord>(`/projects/${projectId}/export/cover-letter`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  exportResponseLetter: (projectId: number, data?: any): Promise<ExportRecord> =>
    request<ExportRecord>(`/projects/${projectId}/export/response-letter`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),

  getExportRecord: (recordId: number): Promise<ExportRecord> =>
    request<ExportRecord>(`/exports/${recordId}`),

  downloadExportUrl: (recordId: number): string =>
    `${getApiBase()}/exports/${recordId}/download`,

  // ─── Converter ───
  convertWordToLatex: (formData: FormData): Promise<any> =>
    request<any>('/convert/word-to-latex', {
      method: 'POST',
      body: formData,
    }),

  generateSectionContent: (projectId: number, sectionId: number): Promise<ManuscriptSection> =>
    request<ManuscriptSection>(`/projects/${projectId}/manuscript/sections/${sectionId}/generate-content`, {
      method: 'POST',
    }),

  // ─── Refine ───
  refineContent: (data: { content: string; instruction: string; content_type?: string; history?: any[] }) =>
    request<{ refined_content: string; assistant_message: string }>('/refine', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateManuscriptOutline: (projectId: number, outline: any[]) =>
    request<any>(`/projects/${projectId}/manuscript/outline`, {
      method: 'PUT',
      body: JSON.stringify({ outline }),
    }),

  // ─── Settings ───
  getSettings: () =>
    request<any>('/settings'),

  updateSettings: (data: any) =>
    request<any>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getProviders: () =>
    request<{ providers: any[] }>('/settings/providers'),

  testConnection: () =>
    request<{ status: string; message: string }>('/settings/test-connection', {
      method: 'POST',
    }),

  // ─── Backup ───
  exportProjectBackup: (projectId: number) =>
    request<any>(`/backup/projects/${projectId}/export`, {
      method: 'POST',
    }),

  importProjectBackup: (formData: FormData) =>
    request<any>('/backup/import', {
      method: 'POST',
      body: formData,
    }),

  getBackupInfo: (projectId: number) =>
    request<any>(`/backup/projects/${projectId}/info`),
};

export { ApiError };
