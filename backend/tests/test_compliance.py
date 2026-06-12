"""Tests for the compliance checker module."""

from app.compliance.checker import (
    check_fake_numbers,
    check_ai_authorship,
    check_experiment_plan,
    check_manuscript,
    run_compliance_check,
)


class TestFakeNumbersDetection:
    """check_fake_numbers: flags suspicious numeric claims in experiment plans."""

    def test_detects_achieved_percentage(self):
        text = (
            "Our model achieved 95.3% accuracy on the test set, representing a "
            "significant improvement of 12.5% over the previous state-of-the-art. "
            "The p-value < 0.001 confirms statistical significance."
        )
        violations = check_fake_numbers(text)
        assert len(violations) > 0
        assert any("numeric" in v.lower() or "fabricated" in v.lower() for v in violations)

    def test_detects_p_value(self):
        text = "The improvement was significant with p-value < 0.05 across all benchmarks."
        violations = check_fake_numbers(text)
        assert len(violations) > 0

    def test_detects_improvement_percentage(self):
        text = "We observed an improvement of 23.7% in F1 score on the held-out set."
        violations = check_fake_numbers(text)
        assert len(violations) > 0

    def test_normal_text_passes(self):
        text = (
            "We evaluate our approach on standard benchmark datasets including GLUE and "
            "SuperGLUE. We report accuracy and F1 score as our primary metrics. The "
            "experimental setup follows established protocols from prior work."
        )
        violations = check_fake_numbers(text)
        assert len(violations) == 0


class TestAIAuthorshipDetection:
    """check_ai_authorship: rejects content claiming AI as an author."""

    def test_detects_chatgpt_author(self):
        text = "This paper was written by ChatGPT with guidance from the research team."
        violations = check_ai_authorship(text)
        assert len(violations) > 0

    def test_detects_gpt4_coauthor(self):
        text = "GPT-4 as co-author contributed to the literature review section."
        violations = check_ai_authorship(text)
        assert len(violations) > 0

    def test_detects_language_model_author(self):
        text = "The primary author is a language model trained by OpenAI."
        violations = check_ai_authorship(text)
        assert len(violations) > 0

    def test_detects_ai_authored(self):
        text = "This manuscript was authored by AI and reviewed by human editors."
        violations = check_ai_authorship(text)
        assert len(violations) > 0

    def test_normal_attribution_passes(self):
        text = (
            "We used AI tools to assist with data analysis and code generation. "
            "All authors are affiliated with the university research lab. The "
            "corresponding author can be reached via email."
        )
        violations = check_ai_authorship(text)
        assert len(violations) == 0


class TestExperimentPlanCompliance:
    """check_experiment_plan: validates full experiment plan dicts."""

    def test_plan_with_fake_numbers_fails(self):
        plan = {
            "main_experiments": [
                {
                    "name": "Main Benchmark",
                    "description": "Evaluate on GLUE benchmark.",
                    "expected_outcome": "Our model achieved 95.3% accuracy on the GLUE benchmark.",
                }
            ],
            "ablation_studies": [],
            "robustness_tests": [],
            "efficiency_tests": [],
            "datasets": ["GLUE"],
            "metrics": ["Accuracy"],
            "baselines": ["BERT"],
            "risk_and_fallbacks": [],
        }
        result = check_experiment_plan(plan)
        assert result["passed"] is False
        assert result["status"] == "failed"
        assert len(result["violations"]) > 0

    def test_clean_plan_passes(self):
        plan = {
            "main_experiments": [
                {
                    "name": "Main Benchmark",
                    "description": "Evaluate the proposed method on standard benchmark datasets.",
                    "expected_outcome": "The method is expected to outperform existing baselines.",
                }
            ],
            "ablation_studies": [
                {
                    "name": "Component Ablation",
                    "description": "Remove each component to verify its contribution.",
                    "expected_outcome": "Each component should contribute to overall performance.",
                }
            ],
            "robustness_tests": [],
            "efficiency_tests": [],
            "datasets": ["GLUE", "SuperGLUE"],
            "metrics": ["Accuracy", "F1"],
            "baselines": ["BERT", "RoBERTa"],
            "risk_and_fallbacks": [
                {"risk": "Training instability", "fallback": "Use gradient clipping"}
            ],
        }
        result = check_experiment_plan(plan)
        assert result["passed"] is True
        assert result["status"] == "passed"
        assert len(result["violations"]) == 0


class TestManuscriptCompliance:
    """check_manuscript: validates manuscript state dicts."""

    def test_manuscript_with_ai_author_fails(self):
        manuscript = {
            "current_draft": (
                "This paper was written by ChatGPT. We present a novel approach to NLP."
            ),
            "outline": [],
        }
        result = check_manuscript(manuscript)
        assert result["passed"] is False
        assert result["status"] == "failed"
        assert len(result["violations"]) > 0

    def test_clean_manuscript_passes(self):
        manuscript = {
            "current_draft": (
                "We present a novel approach to natural language understanding. Our method "
                "leverages pre-trained language models with task-specific adapters. We evaluate "
                "on standard benchmarks and demonstrate competitive performance."
            ),
            "outline": [
                {
                    "section": "Introduction",
                    "subsections": ["Background", "Contributions"],
                    "key_points": ["Motivate the problem", "Summarize contributions"],
                }
            ],
        }
        result = check_manuscript(manuscript)
        assert result["passed"] is True
        assert result["status"] == "passed"
        assert len(result["violations"]) == 0


class TestRunComplianceCheck:
    """run_compliance_check: general-purpose auto-detection entry point."""

    def test_experiment_plan_auto_detected(self):
        content = {
            "main_experiments": [
                {
                    "name": "Test",
                    "description": "Standard evaluation.",
                    "expected_outcome": "Competitive results on benchmarks.",
                }
            ],
            "datasets": ["GLUE"],
            "metrics": ["Accuracy"],
            "baselines": ["BERT"],
        }
        result = run_compliance_check(content)
        assert result["passed"] is True

    def test_manuscript_auto_detected(self):
        content = {
            "current_draft": "We used AI tools for assistance. All authors are human researchers.",
            "outline": [],
        }
        result = run_compliance_check(content)
        assert result["passed"] is True

    def test_combined_violations_detected(self):
        content = {
            "current_draft": "Written by ChatGPT as author of this work.",
            "outline": [],
            "main_experiments": [
                {
                    "name": "Test",
                    "description": "Our model achieved 98.7% accuracy.",
                    "expected_outcome": "We achieved 99.1% improvement over baseline.",
                }
            ],
        }
        result = run_compliance_check(content)
        assert result["passed"] is False
        assert len(result["violations"]) > 0
