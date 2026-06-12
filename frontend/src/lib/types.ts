export interface PaperBrief {
  id: number;
  title: string;
  status: string;
  created_at?: string;
}

export interface IdeaBrief {
  id: number;
  name: string;
  novelty_score?: number;
  feasibility_score?: number;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  target_field: string | null;
  target_venue: string | null;
  created_at: string;
  updated_at: string;
  paper_count?: number;
  idea_count?: number;
  papers?: PaperBrief[];
  research_ideas?: IdeaBrief[];
}

export interface Paper {
  id: number;
  project_id: number;
  title: string;
  authors: string | null;
  year: number | null;
  venue: string | null;
  doi: string | null;
  abstract?: string | null;
  file_path: string | null;
  status: string;
  created_at: string;
  chunk_count?: number;
  pdf_parse_status?: string;
}

export interface PaperCard {
  id: number;
  paper_id: number;
  research_problem: string | null;
  method_summary: string | null;
  novelty_points: string[];
  limitations: string[];
  datasets: string[];
  metrics: string[];
  baselines: string[];
  main_results: string[];
  reproducibility: string | null;
  evidence_spans: string[];
  created_at?: string;
}

export interface ResearchIdea {
  id: number;
  project_id: number;
  name: string;
  research_gap: string | null;
  proposed_solution: string | null;
  related_papers: number[];
  expected_contributions: string[];
  novelty_score: number;
  feasibility_score: number;
  risk_level: string;
  experiment_plan_summary: string | null;
  created_at?: string;
  differentiation_check?: any;
}

export interface ExperimentPlan {
  id: number;
  idea_id: number;
  main_experiments: any[];
  ablation_studies: any[];
  robustness_tests: any[];
  efficiency_tests: any[];
  datasets: string[];
  metrics: string[];
  baselines: string[];
  risk_and_fallbacks: any[];
  created_at?: string;
}

export interface ManuscriptState {
  id: number;
  project_id: number;
  title: string | null;
  abstract: string | null;
  contributions: string[];
  outline: any[];
  current_draft?: string | null;
  compliance_status?: string | null;
  compliance_details?: any[];
  method_version: number;
  unresolved_issues: string[];
  created_at?: string;
  updated_at?: string;
  active_method_version_id?: number | null;
  sections?: ManuscriptSection[];
  export_status?: string;
  template_id?: number;
}

export interface PaperChunk {
  id: number;
  paper_id: number;
  chunk_index: number;
  section_title: string;
  content: string;
  start_page: number | null;
  end_page: number | null;
  chunk_type: string;
  created_at?: string;
}

export interface EvidenceSpan {
  id: number;
  paper_card_id: number;
  chunk_id: number | null;
  paper_id: number;
  claim_type: string;
  claim_text: string;
  source_page: number | null;
  source_section: string;
  source_text_span: string;
  confidence: number;
  created_at?: string;
}

export interface MethodVersion {
  id: number;
  project_id: number;
  version_number: number;
  name: string;
  description: string;
  key_changes: string[];
  rationale: string;
  based_on_idea_id: number | null;
  parent_version_id: number | null;
  status: string;
  created_at?: string;
}

export interface ExperimentResult {
  id: number;
  project_id: number;
  method_version_id: number;
  experiment_plan_id: number | null;
  name: string;
  description: string;
  experiment_type: string;
  raw_data: any[];
  file_path: string;
  upload_format: string;
  status: string;
  created_at?: string;
}

export interface ResultsAnalysis {
  id: number;
  experiment_result_id: number;
  summary: string;
  key_findings: string[];
  comparison_table: any[];
  strengths: string[];
  weaknesses: string[];
  statistical_notes: string[];
  recommendations: string[];
  compliance_status: string;
  compliance_details: any[];
  created_at?: string;
}

export interface ReviewerSimulation {
  id: number;
  project_id: number;
  reviewer_role: string;
  expertise_area: string;
  overall_assessment: string;
  novelty_concerns: any[];
  method_concerns: any[];
  experiment_concerns: any[];
  writing_concerns: any[];
  major_issues: any[];
  minor_issues: any[];
  suggested_experiments: any[];
  overall_score: number;
  recommendation: string;
  created_at?: string;
}

export interface ManuscriptSection {
  id: number;
  manuscript_state_id: number;
  section_key: string;
  title: string;
  content: string;
  method_version_id: number | null;
  status: string;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
  figure_refs?: any[];
  table_refs?: any[];
  equation_refs?: any[];
  citation_keys?: string[];
  generated_content?: string;
  section_citations?: SectionCitation[];
}

export interface Citation {
  id: number;
  project_id: number;
  cite_key: string;
  entry_type: string;
  title: string;
  authors: string;
  year?: number;
  venue?: string;
  doi?: string;
  url?: string;
  abstract?: string;
  raw_bibtex?: string;
  extra_fields?: any;
  source?: string;
  linked_paper_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface SectionCitation {
  id: number;
  manuscript_section_id: number;
  citation_id: number;
  citation_context?: string;
  sort_order: number;
}

export interface ExportTemplate {
  id: number;
  name: string;
  template_type: string;
  description?: string;
  file_path?: string;
  section_mapping?: any;
  style_config?: any;
  is_builtin: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ExportRecord {
  id: number;
  project_id: number;
  manuscript_state_id?: number;
  template_id?: number;
  export_type: string;
  file_path?: string;
  file_name?: string;
  file_size?: number;
  status: string;
  error_message?: string;
  compilation_log?: string;
  export_metadata?: any;
  created_at?: string;
  updated_at?: string;
}
