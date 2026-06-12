# -*- coding: utf-8 -*-
import re
from dataclasses import dataclass, field


@dataclass
class ComplianceResult:
    """Result of a compliance check on AI-generated content."""

    is_compliant: bool
    warnings: list[str] = field(default_factory=list)
    disclaimer: str = ""


class ComplianceChecker:
    """Validates AI-generated outputs against content-safety and academic-
    integrity rules.

    Rules enforced
    ---------------
    1. Every output carries the standard AI-generated disclaimer.
    2. Experiment plans must not contain unverified numeric improvement claims
       (e.g. "提升了15%").
    3. Manuscripts must not list AI as an author.
    4. A standing reminder that AI cannot be a paper author is always appended
       as a warning.
    """

    DISCLAIMER: str = "此内容由 AI 辅助生成，请人工审核后再使用"
    AUTHORSHIP_REMINDER: str = "AI 不能作为论文作者"

    # Pattern that matches Chinese-style numeric improvement claims such as
    # "提升了15%", "提高10.5个百分点", "improved by 20%", etc.
    _NUMERIC_CLAIM_PATTERNS: list[re.Pattern[str]] = [
        re.compile(r"提升\s*了?\s*\d+(\.\d+)?\s*%"),
        re.compile(r"提高\s*了?\s*\d+(\.\d+)?\s*%"),
        re.compile(r"improve[sd]?\s+(by\s+)?\d+(\.\d+)?\s*%"),
        re.compile(r"increased?\s+(by\s+)?\d+(\.\d+)?\s*%"),
        re.compile(r"gain[sed]*\s+(of\s+)?\d+(\.\d+)?\s*%"),
    ]

    # Patterns that detect AI claiming authorship
    _AI_AUTHOR_PATTERNS: list[re.Pattern[str]] = [
        re.compile(r"作者[：:]\s*AI", re.IGNORECASE),
        re.compile(r"author[s]?\s*[:：]\s*(AI|artificial intelligence|GPT|LLM|ChatGPT)", re.IGNORECASE),
        re.compile(r"written by\s+(AI|artificial intelligence|GPT|LLM|ChatGPT)", re.IGNORECASE),
        re.compile(r"由\s*(AI|人工智能|大模型|语言模型)\s*(撰写|编写|创作)", re.IGNORECASE),
    ]

    def check_output(self, content: str, output_type: str) -> ComplianceResult:
        """Run all applicable compliance rules on *content*.

        Args:
            content: The text body of the AI-generated output.
            output_type: Category of the output. Recognised values include
                ``"experiment_plan"``, ``"manuscript"``, ``"paper_card"``,
                ``"research_idea"``, and any other free-form string.

        Returns:
            A ``ComplianceResult`` with compliance status, any warnings, and
            the mandatory disclaimer.
        """
        warnings: list[str] = []
        is_compliant: bool = True

        # ------------------------------------------------------------------
        # Rule 2 – experiment_plan numeric improvement claims
        # ------------------------------------------------------------------
        if output_type == "experiment_plan":
            for pattern in self._NUMERIC_CLAIM_PATTERNS:
                matches = pattern.findall(content)
                if matches:
                    warnings.append(
                        "实验计划中包含未经证实的数值改进声明"
                        + "（如'提升了X%'），"
                        + "请确保所有数值声明有充分的实验数据支撑。"
                    )
                    break  # one warning is sufficient

        # ------------------------------------------------------------------
        # Rule 3 – manuscript AI-authorship check
        # ------------------------------------------------------------------
        if output_type == "manuscript":
            for pattern in self._AI_AUTHOR_PATTERNS:
                if pattern.search(content):
                    is_compliant = False
                    warnings.append(
                        "稿件中将 AI 列为作者，这违反了学术诚信规范。"
                        + "AI 工具不能作为论文作者，请移除相关声明。"
                    )
                    break  # one warning is sufficient

        # ------------------------------------------------------------------
        # Rule 4 – standing authorship reminder (always appended)
        # ------------------------------------------------------------------
        warnings.append(self.AUTHORSHIP_REMINDER)

        return ComplianceResult(
            is_compliant=is_compliant,
            warnings=warnings,
            disclaimer=self.DISCLAIMER,
        )
