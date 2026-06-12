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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const fullUrl = `${API_BASE}${url}`;

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options?.headers,
    },
  };

  const response = await fetch(fullUrl, config);

  if (!response.ok) {
    let errorBody: any;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = await response.text();
    }
    throw new ApiError(response.status, response.statusText, errorBody);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  // Projects
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

  // Papers
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

  getPaperCard: (paperId: number) =>
    request<PaperCardType>(`/papers/${paperId}/card`),

  // Ideas
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

  // Experiment Plans
  generateExperimentPlan: (ideaId: number) =>
    request<ExperimentPlan>(`/ideas/${ideaId}/experiment-plan/generate`, {
      method: 'POST',
    }),

  getExperimentPlan: (ideaId: number) =>
    request<ExperimentPlan>(`/ideas/${ideaId}/experiment-plan`),

  // Manuscript
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

  // PDF Upload & Chunks
  uploadPaperPdf: (projectId: number, formData: FormData) =>
    request<Paper>(`/projects/${projectId}/papers/upload`, {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: formData,
    }),
  getPaperChunks: (paperId: number) =>
    request<PaperChunk[]>(`/papers/${paperId}/chunks`),
  reparsePaper: (paperId: number) =>
    request<{ message: string; status: string }>(`/papers/${paperId}/reparse`, { method: 'POST' }),

  // Evidence Spans
  getEvidenceSpans: (paperId: number) =>
    request<EvidenceSpan[]>(`/papers/${paperId}/card/evidence-spans`),

  // Method Versions
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

  // Experiment Results
  uploadExperimentResult: (projectId: number, formData: FormData) =>
    request<ExperimentResult>(`/projects/${projectId}/experiment-results/upload`, {
      method: 'POST',
      headers: {},
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

  // Reviewer Simulation
  generateReviewerSimulation: (projectId: number, numReviewers?: number) =>
    request<ReviewerSimulation[]>(`/projects/${projectId}/reviewer-simulation/generate`, {
      method: 'POST',
      body: JSON.stringify({ num_reviewers: numReviewers || 3 }),
    }),
  listReviewerSimulations: (projectId: number) =>
    request<ReviewerSimulation[]>(`/projects/${projectId}/reviewer-simulations`),

  // Differentiation Check
  checkDifferentiation: (ideaId: number) =>
    request<any>(`/ideas/${ideaId}/differentiation-check`, { method: 'POST' }),

  // Manuscript Sections
  getManuscriptSections: (projectId: number) =>
    request<ManuscriptSection[]>(`/projects/${projectId}/manuscript/sections`),
  updateManuscriptSection: (sectionId: number, data: { title?: string; content?: string; status?: string }) =>
    request<ManuscriptSection>(`/manuscript-sections/${sectionId}`, { method: 'PUT', body: JSON.stringify(data) }),

  // ─── Citations ───
  importBibtex: (projectId: number, bibtex: string): Promise<Citation[]> =>
    request<Citation[]>(`/projects/${projectId}/citations/import-bibtex`, {
      method: 'POST',
      body: JSON.stringify({ bibtex }),
    }),

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
      body: data ? JSON.stringify(data) : undefined,
    }),

  exportLatex: (projectId: number, data?: any): Promise<ExportRecord> =>
    request<ExportRecord>(`/projects/${projectId}/export/latex`, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  exportCoverLetter: (projectId: number, data: any): Promise<any> =>
    request<any>(`/projects/${projectId}/export/cover-letter`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  exportResponseLetter: (projectId: number, data?: any): Promise<any> =>
    request<any>(`/projects/${projectId}/export/response-letter`, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  getExportRecord: (projectId: number, recordId: number): Promise<ExportRecord> =>
    request<ExportRecord>(`/projects/${projectId}/export/records/${recordId}`),

  // ─── Converter ───
  convertWordToLatex: (formData: FormData): Promise<any> =>
    request<any>('/converter/word-to-latex', {
      method: 'POST',
      body: formData,
      headers: {},
    }),

  generateSectionContent: (data: any): Promise<any> =>
    request<any>('/converter/generate-section', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ─── Manuscript Sections (extended) ───
  createManuscriptSection: (projectId: number, data: any): Promise<ManuscriptSection> =>
    request<ManuscriptSection>(`/projects/${projectId}/sections`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteManuscriptSection: (sectionId: number): Promise<void> =>
    request<void>(`/sections/${sectionId}`, {
      method: 'DELETE',
    }),

  reorderManuscriptSections: (projectId: number, sectionIds: number[]): Promise<any> =>
    request<any>(`/projects/${projectId}/sections/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ section_ids: sectionIds }),
    }),
};

export { ApiError };
