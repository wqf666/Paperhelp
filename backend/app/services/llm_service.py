"""
LLM service module providing both mock and real (DeepSeek/OpenAI-compatible) implementations.
A factory function selects the appropriate backend based on application settings.
"""

import json
import re
from abc import ABC, abstractmethod

from app.config import Settings


class BaseLLMService(ABC):
    """Abstract LLM service defining the interface for all LLM operations."""

    @abstractmethod
    def generate_paper_card(self, paper_text: str, paper_title: str) -> dict:
        """Generate structured paper card analysis from raw paper text."""
        pass

    @abstractmethod
    def generate_ideas(
        self,
        paper_cards: list[dict],
        research_field: str,
        additional_context: str = "",
    ) -> list[dict]:
        """Generate research ideas based on analysed paper cards."""
        pass

    @abstractmethod
    def generate_experiment_plan(self, idea: dict, related_cards: list[dict]) -> dict:
        """Generate a detailed experiment plan for a research idea."""
        pass

    @abstractmethod
    def generate_outline(
        self,
        project: dict,
        ideas: list[dict],
        paper_cards: list[dict],
    ) -> dict:
        """Generate a manuscript outline from project context."""
        pass

    @abstractmethod
    def analyze_experiment_results(
        self,
        experiment_data: list[dict],
        method_description: str,
        experiment_type: str,
    ) -> dict:
        """Analyze experiment results and return structured findings."""
        pass

    @abstractmethod
    def simulate_reviewer(
        self,
        project_context: dict,
        paper_cards: list[dict],
        ideas: list[dict],
        method_versions: list[dict],
        experiment_results: list[dict],
        manuscript_outline: dict,
        reviewer_index: int,
    ) -> dict:
        """Simulate a peer reviewer's assessment of a research project."""
        pass

    @abstractmethod
    def check_differentiation(self, idea: dict, paper_cards: list[dict]) -> dict:
        """Check whether a research idea is sufficiently differentiated from existing papers."""
        pass

    @abstractmethod
    def generate_evidence_spans(
        self, paper_text: str, paper_title: str, card_data: dict
    ) -> list[dict]:
        """Generate evidence spans linking claims in a paper card to source text."""
        pass

    @abstractmethod
    def generate_cover_letter(
        self,
        manuscript_title: str,
        manuscript_abstract: str,
        recipient_name: str,
        recipient_title: str,
        journal_or_conference: str,
        additional_notes: str,
    ) -> str:
        """Generate a cover letter for manuscript submission."""
        pass

    @abstractmethod
    def generate_response_letter(
        self,
        manuscript_title: str,
        simulations: list,
        additional_context: str,
    ) -> str:
        """Generate a point-by-point response letter to reviewer comments."""
        pass

    @abstractmethod
    def generate_section_content(
        self,
        section_title: str,
        section_context: dict,
    ) -> str:
        """Generate content for a manuscript section based on context."""
        pass


def _extract_json_from_text(text: str) -> dict | list:
    """Attempt to parse JSON from text that may contain markdown fences or surrounding prose."""
    # Strip markdown code fences
    fence_pattern = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    candidate = fence_pattern.group(1).strip() if fence_pattern else text.strip()
    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        pass
    # Try to find the outermost JSON object or array
    for start_char, end_char in [("{", "}"), ("[", "]")]:
        start_idx = candidate.find(start_char)
        end_idx = candidate.rfind(end_char)
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            try:
                return json.loads(candidate[start_idx : end_idx + 1])
            except json.JSONDecodeError:
                continue
    raise ValueError(f"Could not parse JSON from LLM response: {text[:300]}")


# ---------------------------------------------------------------------------
# Mock implementation
# ---------------------------------------------------------------------------

class MockLLMService(BaseLLMService):
    """Returns realistic mock data for development and testing without calling any LLM API."""

    def generate_paper_card(self, paper_text: str, paper_title: str) -> dict:
        return {
            "research_problem": (
                f"The paper '{paper_title}' addresses the challenge of developing robust and "
                "generalizable models for complex natural language understanding tasks, where "
                "existing approaches struggle with out-of-distribution generalization and "
                "compositional reasoning."
            ),
            "method_summary": (
                "The authors propose a novel multi-stage framework that combines pre-trained "
                "language models with task-specific adapters and a contrastive learning objective. "
                "The method first pre-trains on a large corpus, then fine-tunes with adapter modules "
                "while applying a contrastive loss to learn more discriminative representations."
            ),
            "novelty_points": [
                "Introduction of a contrastive adapter mechanism that decouples representation learning from task-specific fine-tuning",
                "A new data augmentation strategy based on semantic paraphrase generation with controlled diversity",
                "Theoretical analysis proving convergence guarantees for the proposed two-stage optimization procedure",
            ],
            "limitations": [
                "Experiments are limited to English-language benchmarks only",
                "Computational cost analysis is incomplete for very large-scale models",
                "The contrastive objective requires careful hyperparameter tuning that is not fully automated",
            ],
            "datasets": ["GLUE", "SuperGLUE", "SQuAD 2.0", "HANS", "MNLI"],
            "metrics": ["Accuracy", "F1 Score", "Exact Match", "ROUGE-L", "BLEU"],
            "baselines": ["BERT-base", "RoBERTa-large", "GPT-2", "DeBERTa-v3", "T5-base"],
            "main_results": [
                "Achieves 91.3% average accuracy on GLUE benchmark, surpassing RoBERTa-large by 2.1 points",
                "Shows 15% relative improvement on out-of-distribution test sets compared to standard fine-tuning",
                "Adapter modules add only 3.2% additional parameters while maintaining full model performance",
                "Contrastive pre-training reduces fine-tuning data requirements by approximately 40%",
            ],
            "reproducibility": (
                "The paper provides detailed hyperparameters, training procedures, and ablation studies. "
                "Code and pre-trained checkpoints are mentioned as available but links are not verified. "
                "Random seeds and variance across runs are reported for main experiments."
            ),
            "evidence_spans": [
                "Table 2: Main results on GLUE benchmark showing 91.3% average accuracy",
                "Section 4.3: Ablation study demonstrating the contribution of each component",
                "Figure 3: Learning curves comparing convergence speed with and without contrastive pre-training",
                "Table 5: Out-of-distribution evaluation on HANS dataset showing robustness improvements",
            ],
        }

    def generate_ideas(
        self,
        paper_cards: list[dict],
        research_field: str,
        additional_context: str = "",
    ) -> list[dict]:
        context_note = f" Context note: {additional_context}" if additional_context else ""
        field_label = research_field or "natural language processing"
        return [
            {
                "name": f"Cross-lingual Transfer with Adaptive Contrastive Learning in {field_label}",
                "research_gap": (
                    f"Current contrastive learning approaches in {field_label} are predominantly monolingual "
                    "and fail to leverage cross-lingual semantic alignment, limiting applicability to "
                    f"low-resource languages.{context_note}"
                ),
                "proposed_solution": (
                    "We propose a cross-lingual adaptive contrastive framework that automatically "
                    "identifies transferable semantic features across language pairs. The method uses "
                    "a language-agnostic projection head combined with a dynamic margin contrastive loss "
                    "that adapts to the linguistic distance between language pairs."
                ),
                "expected_contributions": [
                    "A novel cross-lingual contrastive learning framework for low-resource language adaptation",
                    "A dynamic margin strategy that adjusts to linguistic distance between language pairs",
                    "Comprehensive evaluation across 10 typologically diverse languages",
                ],
                "novelty_score": 8.2,
                "feasibility_score": 7.5,
                "risk_level": "medium",
                "experiment_plan_summary": (
                    "Evaluate on XTREME benchmark across 10 languages, comparing against mBERT, XLM-R, "
                    "and MAD-X. Include ablation on contrastive loss variants and few-shot transfer experiments."
                ),
            },
            {
                "name": f"Efficient Knowledge Distillation via Structured Pruning in {field_label}",
                "research_gap": (
                    f"Existing knowledge distillation methods in {field_label} focus on output-level "
                    "distillation and ignore the internal structural knowledge that larger models capture, "
                    f"resulting in suboptimal student model performance.{context_note}"
                ),
                "proposed_solution": (
                    "We propose a structured pruning-aware distillation method that first identifies "
                    "critical sub-networks in the teacher model via importance scoring, then transfers "
                    "both output distributions and intermediate structural knowledge to a compact student. "
                    "A progressive distillation schedule gradually shifts focus from shallow to deep layers."
                ),
                "expected_contributions": [
                    "A structured importance scoring method for identifying critical teacher sub-networks",
                    "A progressive distillation schedule for more effective knowledge transfer",
                    "State-of-the-art results on model compression benchmarks with 10x parameter reduction",
                ],
                "novelty_score": 7.0,
                "feasibility_score": 8.5,
                "risk_level": "low",
                "experiment_plan_summary": (
                    "Compress BERT-base and RoBERTa-large models. Evaluate on GLUE and SQuAD benchmarks. "
                    "Compare against standard KD, patient KD, and MobileBERT baselines. Measure latency and throughput."
                ),
            },
            {
                "name": f"Uncertainty-Aware Multi-Expert Ensemble for {field_label}",
                "research_gap": (
                    f"State-of-the-art models in {field_label} produce overconfident predictions on "
                    "ambiguous inputs, which is problematic for safety-critical applications. Current "
                    f"uncertainty estimation methods are computationally prohibitive at scale.{context_note}"
                ),
                "proposed_solution": (
                    "We propose an efficient multi-expert ensemble that uses lightweight expert routing "
                    "to partition the input space. Each expert specializes in a region of the input "
                    "distribution and reports calibrated uncertainty estimates. A meta-learner aggregates "
                    "expert predictions with learned reliability weights."
                ),
                "expected_contributions": [
                    "An efficient multi-expert architecture with learned input routing for uncertainty estimation",
                    "A calibration-aware training objective that improves prediction reliability",
                    "Demonstration of improved safety metrics on adversarial and out-of-distribution benchmarks",
                ],
                "novelty_score": 7.8,
                "feasibility_score": 6.5,
                "risk_level": "high",
                "experiment_plan_summary": (
                    "Evaluate calibration on GLUE with temperature scaling metrics. Test robustness on "
                    "adversarial NLI datasets and OOD detection on genre-shifted corpora. Compare against "
                    "Monte Carlo dropout, deep ensembles, and evidential deep learning baselines."
                ),
            },
        ]

    def generate_experiment_plan(self, idea: dict, related_cards: list[dict]) -> dict:
        return {
            "main_experiments": [
                {
                    "name": "Benchmark Evaluation",
                    "description": (
                        "Evaluate the proposed method on standard benchmark datasets to establish "
                        "overall performance. Use the full training set and report results on the "
                        "official test sets with standard evaluation metrics."
                    ),
                    "expected_outcome": (
                        "The proposed method is expected to outperform strong baselines by a meaningful "
                        "margin, particularly on tasks requiring cross-domain generalization."
                    ),
                },
                {
                    "name": "Cross-Domain Transfer",
                    "description": (
                        "Train on one domain and evaluate on multiple target domains to assess the "
                        "transferability of learned representations. Use held-out domains for zero-shot "
                        "evaluation."
                    ),
                    "expected_outcome": (
                        "The method should demonstrate superior transfer performance compared to "
                        "standard fine-tuning, with smaller performance degradation on distant domains."
                    ),
                },
                {
                    "name": "Few-Shot Adaptation",
                    "description": (
                        "Evaluate the method's ability to adapt to new tasks with limited labeled data. "
                        "Use k-shot settings with k in {4, 8, 16, 32, 64} and report average performance "
                        "across multiple random seeds."
                    ),
                    "expected_outcome": (
                        "The method should show strong few-shot performance, requiring approximately "
                        "50% fewer labeled examples to match full-data baseline performance."
                    ),
                },
            ],
            "ablation_studies": [
                {
                    "name": "Component Ablation",
                    "description": (
                        "Remove each proposed component one at a time to verify its individual "
                        "contribution to overall performance."
                    ),
                    "expected_outcome": (
                        "Each component should show a measurable contribution, with the full model "
                        "outperforming all ablated variants."
                    ),
                },
                {
                    "name": "Hyperparameter Sensitivity",
                    "description": (
                        "Vary key hyperparameters including learning rate, batch size, and loss "
                        "weighting coefficients to assess sensitivity and identify optimal ranges."
                    ),
                    "expected_outcome": (
                        "The method should be relatively robust to hyperparameter choices within a "
                        "reasonable range, with clear guidelines for tuning."
                    ),
                },
            ],
            "robustness_tests": [
                {
                    "name": "Adversarial Evaluation",
                    "description": (
                        "Test model robustness using established adversarial datasets designed to "
                        "exploit known biases and spurious correlations in standard benchmarks."
                    ),
                    "expected_outcome": (
                        "The model should show improved robustness compared to standard fine-tuning, "
                        "with at least 10 percentage point improvement on adversarial test sets."
                    ),
                },
                {
                    "name": "Noise Injection",
                    "description": (
                        "Evaluate performance under varying levels of input noise, including typos, "
                        "paraphrases, and irrelevant context insertion."
                    ),
                    "expected_outcome": (
                        "Graceful performance degradation as noise increases, maintaining reasonable "
                        "accuracy even at high noise levels."
                    ),
                },
            ],
            "efficiency_tests": [
                {
                    "name": "Training Efficiency",
                    "description": (
                        "Measure wall-clock training time and GPU memory usage compared to baseline "
                        "methods, using identical hardware configurations."
                    ),
                    "expected_outcome": (
                        "Training overhead should be minimal, adding no more than 20% additional "
                        "compute compared to the base model fine-tuning."
                    ),
                },
                {
                    "name": "Inference Latency",
                    "description": (
                        "Measure inference throughput and latency on a standard GPU and CPU setup "
                        "with varying batch sizes."
                    ),
                    "expected_outcome": (
                        "Inference latency should be comparable to the base model, with less than "
                        "5% increase in per-sample processing time."
                    ),
                },
            ],
            "datasets": ["GLUE", "SuperGLUE", "SQuAD 2.0", "XTREME", "HANS", "MNLI"],
            "metrics": ["Accuracy", "F1 Score", "Exact Match", "Expected Calibration Error", "Inference Latency (ms)"],
            "baselines": ["BERT-base", "RoBERTa-large", "DeBERTa-v3", "T5-base", "mBERT", "XLM-R"],
            "risk_and_fallbacks": [
                {
                    "risk": "Cross-lingual transfer may not generalize to typologically distant languages",
                    "fallback": (
                        "Fall back to language-family-specific adapters and report results per "
                        "language family to identify where the method excels."
                    ),
                },
                {
                    "risk": "Contrastive objective may be unstable during early training stages",
                    "fallback": (
                        "Use a warmup schedule for the contrastive loss weight, starting from zero "
                        "and linearly increasing over the first 10% of training steps."
                    ),
                },
                {
                    "risk": "Computational overhead may exceed budget for large-scale experiments",
                    "fallback": (
                        "Reduce the number of contrastive pairs per batch and use a memory-efficient "
                        "approximation of the contrastive loss with a momentum-updated queue."
                    ),
                },
            ],
        }

    def generate_outline(
        self,
        project: dict,
        ideas: list[dict],
        paper_cards: list[dict],
    ) -> dict:
        project_name = project.get("name", "Research Project")
        idea_titles = [idea.get("name", "Proposed Method") for idea in ideas]
        primary_idea = idea_titles[0] if idea_titles else "Our Proposed Approach"

        return {
            "title": f"{primary_idea}: A Comprehensive Study",
            "abstract": (
                f"We present a novel approach within the domain of {project.get('research_field', 'AI research')}. "
                f"Our work, titled '{project_name}', addresses key limitations identified in recent literature "
                f"by proposing {primary_idea}. Through extensive experiments on multiple benchmark datasets, "
                "we demonstrate significant improvements over existing baselines across standard evaluation "
                "metrics. Our analysis reveals important insights about the underlying mechanisms that "
                "contribute to the observed performance gains, and we provide detailed ablation studies "
                "to validate each component of our approach."
            ),
            "contributions": [
                f"We propose {primary_idea}, a novel framework that addresses identified gaps in the current literature",
                "We conduct comprehensive experiments on multiple benchmark datasets demonstrating state-of-the-art performance",
                "We provide in-depth analysis and ablation studies that validate the contribution of each proposed component",
                "We release code and experimental configurations to facilitate reproducibility",
            ],
            "outline": [
                {
                    "section": "1. Introduction",
                    "subsections": [
                        "1.1 Background and Motivation",
                        "1.2 Problem Statement",
                        "1.3 Our Contributions",
                    ],
                    "key_points": [
                        "Establish the importance of the research problem and its real-world applications",
                        "Review the current state of the art and highlight key limitations",
                        "Summarize our main contributions and the significance of our results",
                    ],
                },
                {
                    "section": "2. Related Work",
                    "subsections": [
                        "2.1 Foundational Approaches",
                        "2.2 Recent Advances",
                        "2.3 Comparison with Our Approach",
                    ],
                    "key_points": [
                        "Cover seminal works that established the research direction",
                        "Discuss the most recent and relevant publications in the area",
                        "Clearly articulate how our approach differs from and improves upon prior work",
                    ],
                },
                {
                    "section": "3. Method",
                    "subsections": [
                        "3.1 Problem Formulation",
                        "3.2 Proposed Framework",
                        "3.3 Training Procedure",
                        "3.4 Theoretical Analysis",
                    ],
                    "key_points": [
                        "Formally define the problem setting and notation",
                        "Describe each component of the proposed framework in detail",
                        "Explain the training algorithm and optimization objectives",
                        "Provide theoretical justification for the design choices",
                    ],
                },
                {
                    "section": "4. Experiments",
                    "subsections": [
                        "4.1 Experimental Setup",
                        "4.2 Main Results",
                        "4.3 Ablation Studies",
                        "4.4 Analysis and Discussion",
                    ],
                    "key_points": [
                        "Describe datasets, baselines, evaluation metrics, and implementation details",
                        "Present main experimental results with statistical significance testing",
                        "Ablation studies validating the contribution of each component",
                        "Qualitative analysis and case studies illustrating model behavior",
                    ],
                },
                {
                    "section": "5. Conclusion",
                    "subsections": [
                        "5.1 Summary of Findings",
                        "5.2 Limitations and Future Work",
                    ],
                    "key_points": [
                        "Recap the main contributions and experimental findings",
                        "Acknowledge limitations and outline promising directions for future research",
                    ],
                },
            ],
        }

    # -- Experiment results analysis (mock) ------------------------------------

    def analyze_experiment_results(
        self,
        experiment_data: list[dict],
        method_description: str,
        experiment_type: str,
    ) -> dict:
        # Build a comparison table from actual data keys if available
        comparison_table = []
        if experiment_data:
            # Use the first row's keys as column headers
            columns = list(experiment_data[0].keys()) if experiment_data else []
            comparison_table.append(columns)
            for row in experiment_data[:10]:
                comparison_table.append([row.get(c, "") for c in columns])

        # Derive key findings from data
        key_findings = []
        if experiment_data and len(experiment_data) > 0:
            key_findings.append(
                f"Experiment data contains {len(experiment_data)} result records "
                f"for {experiment_type} experiments."
            )
            # Check for numeric columns to summarise
            if comparison_table and len(comparison_table) > 1:
                numeric_cols = [
                    i for i, header in enumerate(comparison_table[0])
                    if isinstance(header, str) and any(
                        isinstance(row[i], (int, float)) for row in comparison_table[1:] if len(row) > i
                    )
                ]
                for col_idx in numeric_cols[:3]:
                    col_name = comparison_table[0][col_idx]
                    values = [
                        row[col_idx] for row in comparison_table[1:]
                        if len(row) > col_idx and isinstance(row[col_idx], (int, float))
                    ]
                    if values:
                        key_findings.append(
                            f"Column '{col_name}': min={min(values)}, max={max(values)}, "
                            f"mean={sum(values)/len(values):.2f} across {len(values)} entries."
                        )
        else:
            key_findings.append("No experiment data provided for analysis.")

        return {
            "summary": (
                f"Analysis of {experiment_type} experiment results. The method under evaluation "
                f"({method_description[:100] if method_description else 'proposed method'}) "
                f"was assessed using {len(experiment_data)} data points. "
                f"Key metrics and comparative performance are detailed below."
            ),
            "key_findings": key_findings,
            "comparison_table": comparison_table,
            "strengths": [
                "The proposed method shows consistent performance across evaluated configurations",
                "Results demonstrate measurable improvement over baseline approaches",
                "Experimental methodology follows established evaluation protocols",
            ],
            "weaknesses": [
                "Some configurations show marginal improvements that may not be statistically significant",
                "Limited evaluation on edge cases and out-of-distribution scenarios",
                "Computational cost comparison is not fully detailed",
            ],
            "statistical_notes": [
                "Statistical significance tests (paired t-test) should be applied to confirm improvements",
                "Effect sizes should be reported alongside p-values for practical significance",
                "Consider reporting confidence intervals for all main metrics",
            ],
            "recommendations": [
                "Add ablation studies to isolate the contribution of each proposed component",
                "Extend evaluation to additional benchmark datasets for broader coverage",
                "Report variance across multiple random seeds to strengthen result reliability",
            ],
        }

    # -- Reviewer simulation (mock) --------------------------------------------

    def simulate_reviewer(
        self,
        project_context: dict,
        paper_cards: list[dict],
        ideas: list[dict],
        method_versions: list[dict],
        experiment_results: list[dict],
        manuscript_outline: dict,
        reviewer_index: int,
    ) -> dict:
        reviewer_roles = [
            {"role": "Reviewer 1", "expertise": "Novelty and Theoretical Contribution"},
            {"role": "Reviewer 2", "expertise": "Methodology and Technical Soundness"},
            {"role": "Reviewer 3", "expertise": "Experimental Design and Evaluation"},
        ]
        role_info = reviewer_roles[reviewer_index % len(reviewer_roles)]
        project_name = project_context.get("name", "the project")

        return {
            "reviewer_role": role_info["role"],
            "expertise_area": role_info["expertise"],
            "overall_assessment": (
                f"{role_info['role']} ({role_info['expertise']}) assessment of '{project_name}': "
                f"The project presents an interesting research direction with {len(ideas)} proposed ideas "
                f"and {len(method_versions)} method version(s). The experimental evaluation covers "
                f"{len(experiment_results)} result set(s). Overall, the work shows promise but has "
                "areas that need strengthening before publication."
            ),
            "novelty_concerns": [
                "The novelty of the proposed approach relative to recent work needs clearer articulation",
                "The contribution statement should more explicitly differentiate from closely related methods",
                "Some of the claimed novelty points overlap with existing techniques in the literature",
            ],
            "method_concerns": [
                "The theoretical justification for certain design choices is insufficient",
                "The complexity analysis of the proposed method is missing",
                "Some assumptions in the problem formulation may limit generalisability",
            ],
            "experiment_concerns": [
                "The experimental setup should include more diverse benchmark datasets",
                "Statistical significance testing is not consistently reported across experiments",
                "Ablation studies could be more thorough to validate each component's contribution",
            ],
            "writing_concerns": [
                "The related work section could be expanded to cover more recent publications",
                "Some notation is introduced without sufficient formal definition",
                "The manuscript would benefit from a clearer structure in the methodology section",
            ],
            "major_issues": [
                "Lack of comparison with the most recent state-of-the-art methods",
                "Insufficient analysis of failure cases and limitations",
                "Key experimental results lack error bars or confidence intervals",
            ],
            "minor_issues": [
                "Typos and grammatical issues in several sections",
                "Figures and tables should be more consistently formatted",
                "References to some datasets and tools are missing version numbers",
            ],
            "suggested_experiments": [
                "Cross-domain evaluation to test generalisation beyond the training distribution",
                "Human evaluation study to complement automatic metrics",
                "Efficiency comparison measuring wall-clock time and memory usage",
                "Case study analysis to provide qualitative insight into model behaviour",
            ],
            "overall_score": 5.5 + (reviewer_index * 0.5),
            "recommendation": ["minor_revision", "major_revision", "minor_revision"][reviewer_index % 3],
        }

    # -- Differentiation check (mock) ------------------------------------------

    def check_differentiation(self, idea: dict, paper_cards: list[dict]) -> dict:
        idea_name = idea.get("name", "the proposed idea")
        similar_papers = []
        for card in paper_cards[:3]:
            similar_papers.append({
                "paper_research_problem": card.get("research_problem", "")[:200],
                "overlap_description": (
                    f"Partial overlap in addressing similar research challenges, "
                    f"though the proposed approach differs in methodology."
                ),
                "similarity_score": 0.45,
            })

        differentiation_points = [
            f"The proposed solution introduces novel aspects not covered by existing literature reviewed in the project",
            "The expected contributions address gaps identified in current approaches",
            "The research gap targeted by this idea is distinct from the problems addressed by the analysed papers",
        ]

        return {
            "status": "checked",
            "idea_name": idea_name,
            "similar_papers": similar_papers,
            "differentiation_points": differentiation_points,
            "confidence": 0.75,
        }

    # -- Evidence spans (mock) -------------------------------------------------

    def generate_evidence_spans(
        self, paper_text: str, paper_title: str, card_data: dict
    ) -> list[dict]:
        spans = []

        # Generate evidence for novelty points
        for i, novelty in enumerate(card_data.get("novelty_points", [])):
            spans.append({
                "claim_type": "novelty",
                "claim_text": novelty,
                "source_section": "Introduction",
                "source_text_span": (
                    f"Evidence for novelty claim {i + 1}: '{novelty[:100]}...' "
                    f"identified in the introduction and methodology sections of '{paper_title}'."
                ),
                "source_page": 1,
                "confidence": 0.85,
            })

        # Generate evidence for limitations
        for i, limitation in enumerate(card_data.get("limitations", [])):
            spans.append({
                "claim_type": "limitation",
                "claim_text": limitation,
                "source_section": "Conclusion",
                "source_text_span": (
                    f"Evidence for limitation claim {i + 1}: '{limitation[:100]}...' "
                    f"identified in the discussion and conclusion sections."
                ),
                "source_page": 1,
                "confidence": 0.80,
            })

        # Generate evidence for main results
        for i, result in enumerate(card_data.get("main_results", [])):
            spans.append({
                "claim_type": "result",
                "claim_text": result,
                "source_section": "Results",
                "source_text_span": (
                    f"Evidence for result claim {i + 1}: '{result[:100]}...' "
                    f"identified in the results tables and experimental analysis."
                ),
                "source_page": 1,
                "confidence": 0.90,
            })

        # Generate evidence for method summary
        method = card_data.get("method_summary", "")
        if method:
            spans.append({
                "claim_type": "method",
                "claim_text": method[:200],
                "source_section": "Method",
                "source_text_span": (
                    f"Method description evidence found in the methodology section "
                    f"of '{paper_title}'."
                ),
                "source_page": 1,
                "confidence": 0.88,
            })

        return spans

    # -- Cover letter (mock) ---------------------------------------------------

    def generate_cover_letter(self, manuscript_title, manuscript_abstract, recipient_name, recipient_title, journal_or_conference, additional_notes):
        return (
            f"I am writing to submit our manuscript entitled \"{manuscript_title}\" for consideration "
            f"in {journal_or_conference or 'your esteemed journal/conference'}.\n\n"
            f"Our work presents novel contributions in the field, as summarized in the following abstract: "
            f"{manuscript_abstract[:300] if manuscript_abstract else 'Our research addresses important challenges.'}\n\n"
            f"We believe this manuscript is well-suited for {journal_or_conference or 'your venue'} "
            f"because it addresses timely and significant challenges with rigorous methodology "
            f"and comprehensive experimental validation.\n\n"
            f"We confirm that this manuscript is original, has not been published elsewhere, and "
            f"is not currently under consideration by another venue. All authors have approved "
            f"the manuscript and agree with its submission.\n\n"
            f"{('Additional notes: ' + additional_notes + '\n\n') if additional_notes else ''}"
            f"We look forward to your positive response."
        )

    # -- Response letter (mock) ------------------------------------------------

    def generate_response_letter(self, manuscript_title, simulations, additional_context):
        parts = [f"We thank the reviewers for their constructive feedback on our manuscript \"{manuscript_title}\". Below we provide point-by-point responses to each reviewer's comments.\n\n"]
        for sim in (simulations or []):
            role = sim.reviewer_role if hasattr(sim, 'reviewer_role') else "Reviewer"
            expertise = sim.expertise_area if hasattr(sim, 'expertise_area') else ""
            parts.append(f"## {role} ({expertise})\n\n")
            major = sim.major_issues if hasattr(sim, 'major_issues') and isinstance(sim.major_issues, list) else []
            for i, issue in enumerate(major, 1):
                parts.append(f"**Major Issue {i}:** {issue}\n\n")
                parts.append(f"**Our Response:** We thank the reviewer for this important observation. We have revised the manuscript to address this concern by [revision description].\n\n")
            minor = sim.minor_issues if hasattr(sim, 'minor_issues') and isinstance(sim.minor_issues, list) else []
            for i, issue in enumerate(minor, 1):
                parts.append(f"**Minor Issue {i}:** {issue}\n\n")
                parts.append(f"**Our Response:** We have corrected this in the revised manuscript.\n\n")
        if additional_context:
            parts.append(f"\n\nAdditional context: {additional_context}")
        return "\n".join(parts)

    # -- Section content (mock) ------------------------------------------------

    def generate_section_content(self, section_title, section_context):
        project_name = section_context.get("project_name", "the project")
        related_ideas = section_context.get("related_ideas", [])
        paper_cards = section_context.get("paper_cards", [])
        return (
            f"This section presents the {section_title.lower()} of our work within {project_name}. "
            f"The content is structured to provide a comprehensive overview of the key aspects "
            f"of our approach and findings.\n\n"
            f"Our work builds upon {len(paper_cards)} analyzed papers and {len(related_ideas)} "
            f"research directions identified through systematic literature analysis. "
            f"The methodology and experimental design were carefully chosen to address "
            f"the identified research gaps while ensuring reproducibility and scientific rigor.\n\n"
            f"[This is a mock-generated section draft. Please replace with your actual content.]"
        )


# ---------------------------------------------------------------------------
# DeepSeek / OpenAI-compatible implementation
# ---------------------------------------------------------------------------

class DeepSeekLLMService(BaseLLMService):
    """Production LLM service using an OpenAI-compatible API (e.g. DeepSeek, OpenRouter)."""

    def __init__(self, api_key: str, base_url: str, model: str):
        from openai import OpenAI

        self.client = OpenAI(api_key=api_key, base_url=base_url)
        self.model = model

    def _call_llm(self, system_prompt: str, user_prompt: str) -> str:
        """Send a chat completion request and return the assistant's raw text response."""
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
            max_tokens=4096,
        )
        return response.choices[0].message.content or ""

    def _call_llm_json(self, system_prompt: str, user_prompt: str) -> dict | list:
        """Call the LLM and parse the response as JSON, with fallback extraction."""
        raw = self._call_llm(system_prompt, user_prompt)
        return _extract_json_from_text(raw)

    # -- Paper card -----------------------------------------------------------

    def generate_paper_card(self, paper_text: str, paper_title: str) -> dict:
        system_prompt = (
            "You are an expert research paper analyst. Your task is to produce a detailed, "
            "structured analysis of a scientific paper. You must respond with valid JSON only, "
            "no additional text or markdown fences.\n\n"
            "Required JSON schema:\n"
            "{\n"
            '  "research_problem": "<string: the core problem the paper addresses>",\n'
            '  "method_summary": "<string: concise description of the proposed method and key techniques>",\n'
            '  "novelty_points": ["<string>", ...],\n'
            '  "limitations": ["<string>", ...],\n'
            '  "datasets": ["<string: dataset name>", ...],\n'
            '  "metrics": ["<string: evaluation metric>", ...],\n'
            '  "baselines": ["<string: baseline method name>", ...],\n'
            '  "main_results": ["<string: quantitative result description>", ...],\n'
            '  "reproducibility": "<string: assessment of how reproducible the paper is>",\n'
            '  "evidence_spans": ["<string: section/table/figure reference with finding>", ...]\n'
            "}\n\n"
            "Provide at least 2 novelty points, 2 limitations, 2 main results, and 2 evidence spans."
        )
        user_prompt = (
            f"Paper Title: {paper_title}\n\n"
            f"Paper Content:\n{paper_text[:8000]}"
        )
        try:
            result = self._call_llm_json(system_prompt, user_prompt)
            if isinstance(result, list):
                result = result[0] if result else {}
            return result
        except Exception as exc:
            return {
                "research_problem": f"Analysis failed for '{paper_title}': {exc}",
                "method_summary": "LLM analysis was unavailable.",
                "novelty_points": [],
                "limitations": ["Automated analysis could not be completed"],
                "datasets": [],
                "metrics": [],
                "baselines": [],
                "main_results": [],
                "reproducibility": "Unable to assess due to analysis failure.",
                "evidence_spans": [],
            }

    # -- Ideas ----------------------------------------------------------------

    def generate_ideas(
        self,
        paper_cards: list[dict],
        research_field: str,
        additional_context: str = "",
    ) -> list[dict]:
        system_prompt = (
            "You are a senior research scientist tasked with generating novel and feasible "
            "research ideas. Analyse the provided paper summaries and produce research ideas "
            "that address identified gaps. Respond with valid JSON only — a JSON array of idea "
            "objects.\n\n"
            "Required JSON schema (array of objects):\n"
            "[{\n"
            '  "name": "<string: concise idea title>",\n'
            '  "research_gap": "<string: the gap this idea addresses>",\n'
            '  "proposed_solution": "<string: high-level description of the approach>",\n'
            '  "expected_contributions": ["<string>", ...],\n'
            '  "novelty_score": <float 0-10>,\n'
            '  "feasibility_score": <float 0-10>,\n'
            '  "risk_level": "<low|medium|high>",\n'
            '  "experiment_plan_summary": "<string: brief plan for experimental validation>"\n'
            "}]\n\n"
            "Generate 2-3 ideas. Scores must be floats between 0 and 10."
        )
        cards_summary = json.dumps(paper_cards[:10], ensure_ascii=False, default=str)
        user_prompt = (
            f"Research Field: {research_field}\n"
            f"Additional Context: {additional_context or 'None provided.'}\n\n"
            f"Paper Cards Summary:\n{cards_summary}"
        )
        try:
            result = self._call_llm_json(system_prompt, user_prompt)
            if isinstance(result, dict):
                result = [result]
            return result
        except Exception as exc:
            return [
                {
                    "name": "Idea generation failed",
                    "research_gap": f"Error during generation: {exc}",
                    "proposed_solution": "Please retry the generation.",
                    "expected_contributions": [],
                    "novelty_score": 0.0,
                    "feasibility_score": 0.0,
                    "risk_level": "high",
                    "experiment_plan_summary": "Generation failed; no plan available.",
                }
            ]

    # -- Experiment plan ------------------------------------------------------

    def generate_experiment_plan(self, idea: dict, related_cards: list[dict]) -> dict:
        system_prompt = (
            "You are an expert experimental designer for computer science research. Given a "
            "research idea and related literature summaries, produce a comprehensive experiment "
            "plan. Respond with valid JSON only.\n\n"
            "Required JSON schema:\n"
            "{\n"
            '  "main_experiments": [{"name": "<str>", "description": "<str>", "expected_outcome": "<str>"}, ...],\n'
            '  "ablation_studies": [{"name": "<str>", "description": "<str>", "expected_outcome": "<str>"}, ...],\n'
            '  "robustness_tests": [{"name": "<str>", "description": "<str>", "expected_outcome": "<str>"}, ...],\n'
            '  "efficiency_tests": [{"name": "<str>", "description": "<str>", "expected_outcome": "<str>"}, ...],\n'
            '  "datasets": ["<str>", ...],\n'
            '  "metrics": ["<str>", ...],\n'
            '  "baselines": ["<str>", ...],\n'
            '  "risk_and_fallbacks": [{"risk": "<str>", "fallback": "<str>"}, ...]\n'
            "}\n\n"
            "Provide at least 2 main experiments, 1 ablation study, 1 robustness test, and 1 risk."
        )
        user_prompt = (
            f"Research Idea:\n{json.dumps(idea, ensure_ascii=False, default=str)}\n\n"
            f"Related Paper Cards:\n{json.dumps(related_cards[:10], ensure_ascii=False, default=str)}"
        )
        try:
            result = self._call_llm_json(system_prompt, user_prompt)
            if isinstance(result, list):
                result = result[0] if result else {}
            return result
        except Exception as exc:
            return {
                "main_experiments": [],
                "ablation_studies": [],
                "robustness_tests": [],
                "efficiency_tests": [],
                "datasets": [],
                "metrics": [],
                "baselines": [],
                "risk_and_fallbacks": [
                    {"risk": f"Experiment plan generation failed: {exc}", "fallback": "Retry generation."}
                ],
            }

    # -- Outline --------------------------------------------------------------

    def generate_outline(
        self,
        project: dict,
        ideas: list[dict],
        paper_cards: list[dict],
    ) -> dict:
        system_prompt = (
            "You are an experienced academic writer. Generate a manuscript outline based on "
            "the project context, research ideas, and literature summaries provided. Respond "
            "with valid JSON only.\n\n"
            "Required JSON schema:\n"
            "{\n"
            '  "title": "<string: paper title>",\n'
            '  "abstract": "<string: paper abstract, 150-300 words>",\n'
            '  "contributions": ["<string>", ...],\n'
            '  "outline": [\n'
            "    {\n"
            '      "section": "<string: section heading>",\n'
            '      "subsections": ["<string>", ...],\n'
            '      "key_points": ["<string>", ...]\n'
            "    }, ...\n"
            "  ]\n"
            "}\n\n"
            "The outline should cover at least: Introduction, Related Work, Method, Experiments, Conclusion."
        )
        user_prompt = (
            f"Project: {json.dumps(project, ensure_ascii=False, default=str)}\n\n"
            f"Research Ideas:\n{json.dumps(ideas[:5], ensure_ascii=False, default=str)}\n\n"
            f"Paper Cards Summary:\n{json.dumps(paper_cards[:10], ensure_ascii=False, default=str)}"
        )
        try:
            result = self._call_llm_json(system_prompt, user_prompt)
            if isinstance(result, list):
                result = result[0] if result else {}
            return result
        except Exception as exc:
            return {
                "title": f"Outline generation failed: {exc}",
                "abstract": "Generation was unavailable. Please retry.",
                "contributions": [],
                "outline": [],
            }

    # -- Experiment results analysis --------------------------------------------

    def analyze_experiment_results(
        self,
        experiment_data: list[dict],
        method_description: str,
        experiment_type: str,
    ) -> dict:
        system_prompt = (
            "You are an expert data analyst for scientific experiments. Analyse the provided "
            "experiment data and produce a structured analysis. IMPORTANT: Only use the provided "
            "data. Do NOT invent numbers, metrics, or results that are not present in the data. "
            "If the data is insufficient for a particular analysis, state that clearly.\n\n"
            "Respond with valid JSON only.\n\n"
            "Required JSON schema:\n"
            "{\n"
            '  "summary": "<string: overall summary of findings>",\n'
            '  "key_findings": ["<string>", ...],\n'
            '  "comparison_table": [["col1", "col2", ...], [val1, val2, ...], ...],\n'
            '  "strengths": ["<string>", ...],\n'
            '  "weaknesses": ["<string>", ...],\n'
            '  "statistical_notes": ["<string>", ...],\n'
            '  "recommendations": ["<string>", ...]\n'
            "}"
        )
        data_str = json.dumps(experiment_data[:50], ensure_ascii=False, default=str)
        user_prompt = (
            f"Experiment Type: {experiment_type}\n"
            f"Method Description: {method_description or 'Not provided.'}\n\n"
            f"Experiment Data ({len(experiment_data)} records):\n{data_str}"
        )
        try:
            result = self._call_llm_json(system_prompt, user_prompt)
            if isinstance(result, list):
                result = result[0] if result else {}
            return result
        except Exception as exc:
            return {
                "summary": f"Analysis failed: {exc}",
                "key_findings": ["Automated analysis could not be completed"],
                "comparison_table": [],
                "strengths": [],
                "weaknesses": ["LLM analysis was unavailable"],
                "statistical_notes": [],
                "recommendations": ["Retry the analysis"],
            }

    # -- Reviewer simulation ---------------------------------------------------

    def simulate_reviewer(
        self,
        project_context: dict,
        paper_cards: list[dict],
        ideas: list[dict],
        method_versions: list[dict],
        experiment_results: list[dict],
        manuscript_outline: dict,
        reviewer_index: int,
    ) -> dict:
        focus_areas = {
            0: "Focus primarily on NOVELTY and theoretical contribution. Assess whether the work makes a genuine advance over the state of the art.",
            1: "Focus primarily on METHODOLOGY and technical soundness. Evaluate the rigour of the proposed methods and theoretical claims.",
            2: "Focus primarily on EXPERIMENTAL DESIGN and evaluation. Assess whether experiments adequately validate the claims.",
        }
        focus = focus_areas.get(reviewer_index, focus_areas[0])
        reviewer_num = reviewer_index + 1

        system_prompt = (
            f"You are simulating Reviewer {reviewer_num} for an academic paper submission. "
            f"{focus}\n\n"
            "Provide a thorough, constructive review. Respond with valid JSON only.\n\n"
            "Required JSON schema:\n"
            "{\n"
            f'  "reviewer_role": "Reviewer {reviewer_num}",\n'
            '  "expertise_area": "<string: your simulated expertise>",\n'
            '  "overall_assessment": "<string: 2-3 sentence overall assessment>",\n'
            '  "novelty_concerns": ["<string>", ...],\n'
            '  "method_concerns": ["<string>", ...],\n'
            '  "experiment_concerns": ["<string>", ...],\n'
            '  "writing_concerns": ["<string>", ...],\n'
            '  "major_issues": ["<string>", ...],\n'
            '  "minor_issues": ["<string>", ...],\n'
            '  "suggested_experiments": ["<string>", ...],\n'
            '  "overall_score": <float 1-10>,\n'
            '  "recommendation": "<accept|minor_revision|major_revision|reject>"\n'
            "}"
        )
        user_prompt = (
            f"Project Context: {json.dumps(project_context, ensure_ascii=False, default=str)}\n\n"
            f"Paper Cards ({len(paper_cards)}):\n{json.dumps(paper_cards[:5], ensure_ascii=False, default=str)}\n\n"
            f"Research Ideas ({len(ideas)}):\n{json.dumps(ideas[:3], ensure_ascii=False, default=str)}\n\n"
            f"Method Versions ({len(method_versions)}):\n{json.dumps(method_versions[:3], ensure_ascii=False, default=str)}\n\n"
            f"Experiment Results ({len(experiment_results)}):\n{json.dumps(experiment_results[:5], ensure_ascii=False, default=str)}\n\n"
            f"Manuscript Outline:\n{json.dumps(manuscript_outline, ensure_ascii=False, default=str)}"
        )
        try:
            result = self._call_llm_json(system_prompt, user_prompt)
            if isinstance(result, list):
                result = result[0] if result else {}
            return result
        except Exception as exc:
            return {
                "reviewer_role": f"Reviewer {reviewer_num}",
                "expertise_area": "Unknown",
                "overall_assessment": f"Review generation failed: {exc}",
                "novelty_concerns": [],
                "method_concerns": [],
                "experiment_concerns": [],
                "writing_concerns": [],
                "major_issues": ["Review could not be completed"],
                "minor_issues": [],
                "suggested_experiments": [],
                "overall_score": 0.0,
                "recommendation": "major_revision",
            }

    # -- Differentiation check -------------------------------------------------

    def check_differentiation(self, idea: dict, paper_cards: list[dict]) -> dict:
        system_prompt = (
            "You are a research novelty analyst. Given a proposed research idea and summaries "
            "of existing papers, assess whether the idea is sufficiently differentiated. "
            "Identify similar papers, overlapping aspects, and unique differentiators.\n\n"
            "Respond with valid JSON only.\n\n"
            "Required JSON schema:\n"
            "{\n"
            '  "status": "checked",\n'
            '  "idea_name": "<string>",\n'
            '  "similar_papers": [{"paper_research_problem": "<str>", "overlap_description": "<str>", "similarity_score": <float 0-1>}, ...],\n'
            '  "differentiation_points": ["<string>", ...],\n'
            '  "confidence": <float 0-1>\n'
            "}"
        )
        user_prompt = (
            f"Proposed Research Idea:\n{json.dumps(idea, ensure_ascii=False, default=str)}\n\n"
            f"Existing Papers ({len(paper_cards)}):\n{json.dumps(paper_cards[:10], ensure_ascii=False, default=str)}"
        )
        try:
            result = self._call_llm_json(system_prompt, user_prompt)
            if isinstance(result, list):
                result = result[0] if result else {}
            result.setdefault("status", "checked")
            return result
        except Exception as exc:
            return {
                "status": "checked",
                "idea_name": idea.get("name", "Unknown"),
                "similar_papers": [],
                "differentiation_points": [f"Differentiation check failed: {exc}"],
                "confidence": 0.0,
            }

    # -- Evidence spans --------------------------------------------------------

    def generate_evidence_spans(
        self, paper_text: str, paper_title: str, card_data: dict
    ) -> list[dict]:
        system_prompt = (
            "You are an evidence extraction specialist. Given a paper's text and a structured "
            "analysis (paper card), identify evidence spans that support each claim made in the "
            "card. For each novelty point, limitation, result, and the method summary, locate the "
            "specific section and text in the paper that provides evidence.\n\n"
            "Respond with valid JSON only — a JSON array of evidence span objects.\n\n"
            "Required JSON schema (array of objects):\n"
            "[{\n"
            '  "claim_type": "<novelty|limitation|method|result|dataset>",\n'
            '  "claim_text": "<string: the claim being evidenced>",\n'
            '  "source_section": "<string: section name in the paper>",\n'
            '  "source_text_span": "<string: the relevant text excerpt>",\n'
            '  "source_page": <int: approximate page number>,\n'
            '  "confidence": <float 0-1>\n'
            "}]"
        )
        card_summary = json.dumps(card_data, ensure_ascii=False, default=str)
        user_prompt = (
            f"Paper Title: {paper_title}\n\n"
            f"Paper Content:\n{paper_text[:6000]}\n\n"
            f"Paper Card Analysis:\n{card_summary}"
        )
        try:
            result = self._call_llm_json(system_prompt, user_prompt)
            if isinstance(result, dict):
                result = [result]
            return result
        except Exception as exc:
            return [
                {
                    "claim_type": "result",
                    "claim_text": f"Evidence extraction failed: {exc}",
                    "source_section": "",
                    "source_text_span": "",
                    "source_page": 0,
                    "confidence": 0.0,
                }
            ]

    # -- Cover letter -----------------------------------------------------------

    def generate_cover_letter(
        self,
        manuscript_title: str,
        manuscript_abstract: str,
        recipient_name: str,
        recipient_title: str,
        journal_or_conference: str,
        additional_notes: str,
    ) -> str:
        system_prompt = (
            "You are an experienced academic researcher writing a formal cover letter for a "
            "manuscript submission to a journal or conference. Write a professional, concise, "
            "and persuasive cover letter. Use formal academic tone. Do NOT include any JSON or "
            "structured output — write plain text only with paragraph breaks separated by blank lines."
        )
        user_prompt = (
            f"Manuscript Title: {manuscript_title}\n\n"
            f"Manuscript Abstract:\n{manuscript_abstract or 'No abstract provided.'}\n\n"
            f"Recipient Name: {recipient_name or 'Not specified'}\n"
            f"Recipient Title: {recipient_title or 'Editor'}\n"
            f"Journal/Conference: {journal_or_conference or 'Not specified'}\n\n"
            f"Additional Notes:\n{additional_notes or 'None.'}\n\n"
            "Write a formal cover letter for this manuscript submission. Include an opening salutation, "
            "a description of the manuscript's significance and fit for the venue, a statement of "
            "originality and exclusivity, and a closing."
        )
        try:
            return self._call_llm(system_prompt, user_prompt)
        except Exception as exc:
            return (
                f"I am writing to submit our manuscript entitled \"{manuscript_title}\" for consideration "
                f"in {journal_or_conference or 'your esteemed journal/conference'}.\n\n"
                f"Our work presents novel contributions in the field, as summarized in the following abstract: "
                f"{manuscript_abstract[:300] if manuscript_abstract else 'Our research addresses important challenges.'}\n\n"
                f"We believe this manuscript is well-suited for {journal_or_conference or 'your venue'} "
                f"because it addresses timely and significant challenges with rigorous methodology "
                f"and comprehensive experimental validation.\n\n"
                f"We confirm that this manuscript is original, has not been published elsewhere, and "
                f"is not currently under consideration by another venue. All authors have approved "
                f"the manuscript and agree with its submission.\n\n"
                f"{('Additional notes: ' + additional_notes + chr(10) + chr(10)) if additional_notes else ''}"
                f"We look forward to your positive response."
            )

    # -- Response letter --------------------------------------------------------

    def generate_response_letter(
        self,
        manuscript_title: str,
        simulations: list,
        additional_context: str,
    ) -> str:
        system_prompt = (
            "You are an experienced academic researcher writing a point-by-point response letter "
            "to reviewer comments. For each reviewer, address every major and minor issue with a "
            "professional, constructive tone. Describe what changes were made or why the concern "
            "is acknowledged. Use plain text with paragraph breaks. Use '## ' for reviewer headings "
            "and '### ' for sub-section headings."
        )
        simulations_summary = []
        for sim in (simulations or []):
            entry = {
                "reviewer_role": getattr(sim, "reviewer_role", "Reviewer"),
                "expertise_area": getattr(sim, "expertise_area", ""),
                "overall_assessment": getattr(sim, "overall_assessment", ""),
                "major_issues": getattr(sim, "major_issues", []) if isinstance(getattr(sim, "major_issues", []), list) else [],
                "minor_issues": getattr(sim, "minor_issues", []) if isinstance(getattr(sim, "minor_issues", []), list) else [],
                "suggested_experiments": getattr(sim, "suggested_experiments", []) if isinstance(getattr(sim, "suggested_experiments", []), list) else [],
            }
            simulations_summary.append(entry)
        user_prompt = (
            f"Manuscript Title: {manuscript_title}\n\n"
            f"Reviewer Simulations ({len(simulations_summary)}):\n"
            f"{json.dumps(simulations_summary, ensure_ascii=False, default=str)}\n\n"
            f"Additional Context:\n{additional_context or 'None provided.'}\n\n"
            "Write a comprehensive point-by-point response letter. For each reviewer, list each "
            "major issue, minor issue, and suggested experiment, and provide a professional response "
            "to each one."
        )
        try:
            return self._call_llm(system_prompt, user_prompt)
        except Exception as exc:
            parts = [
                f"We thank the reviewers for their constructive feedback on our manuscript "
                f"\"{manuscript_title}\". Below we provide point-by-point responses to each "
                f"reviewer's comments.\n\n"
            ]
            for sim in (simulations or []):
                role = getattr(sim, "reviewer_role", "Reviewer")
                expertise = getattr(sim, "expertise_area", "")
                parts.append(f"## {role} ({expertise})\n\n")
                major = getattr(sim, "major_issues", []) if isinstance(getattr(sim, "major_issues", []), list) else []
                for i, issue in enumerate(major, 1):
                    parts.append(f"**Major Issue {i}:** {issue}\n\n")
                    parts.append(
                        f"**Our Response:** We thank the reviewer for this important observation. "
                        f"We have revised the manuscript to address this concern.\n\n"
                    )
                minor = getattr(sim, "minor_issues", []) if isinstance(getattr(sim, "minor_issues", []), list) else []
                for i, issue in enumerate(minor, 1):
                    parts.append(f"**Minor Issue {i}:** {issue}\n\n")
                    parts.append(f"**Our Response:** We have corrected this in the revised manuscript.\n\n")
            if additional_context:
                parts.append(f"\n\nAdditional context: {additional_context}")
            return "\n".join(parts)

    # -- Section content --------------------------------------------------------

    def generate_section_content(
        self,
        section_title: str,
        section_context: dict,
    ) -> str:
        system_prompt = (
            "You are an experienced academic writer. Generate a draft for a specific section of "
            "a research manuscript. Use formal academic tone, cite relevant context where appropriate, "
            "and structure the content logically with clear paragraphs. Write plain text only — "
            "no JSON or structured output. Use paragraph breaks separated by blank lines."
        )
        context_summary = json.dumps(section_context, ensure_ascii=False, default=str)
        user_prompt = (
            f"Section Title: {section_title}\n\n"
            f"Section Context:\n{context_summary}\n\n"
            f"Write a comprehensive draft for the '{section_title}' section. "
            f"The section should be well-structured, academically rigorous, and integrate "
            f"the provided context naturally. Aim for 300-600 words."
        )
        try:
            return self._call_llm(system_prompt, user_prompt)
        except Exception as exc:
            project_name = section_context.get("project_name", "the project")
            related_ideas = section_context.get("related_ideas", [])
            paper_cards = section_context.get("paper_cards", [])
            return (
                f"This section presents the {section_title.lower()} of our work within {project_name}. "
                f"The content is structured to provide a comprehensive overview of the key aspects "
                f"of our approach and findings.\n\n"
                f"Our work builds upon {len(paper_cards)} analyzed papers and {len(related_ideas)} "
                f"research directions identified through systematic literature analysis. "
                f"The methodology and experimental design were carefully chosen to address "
                f"the identified research gaps while ensuring reproducibility and scientific rigor.\n\n"
                f"[This is a mock-generated section draft. Please replace with your actual content.]"
            )


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

def get_llm_service(settings: Settings) -> BaseLLMService:
    """Return the appropriate LLM service based on application settings."""
    if settings.MOCK_LLM:
        return MockLLMService()
    return DeepSeekLLMService(
        api_key=settings.LLM_API_KEY,
        base_url=settings.LLM_BASE_URL,
        model=settings.LLM_MODEL,
    )
