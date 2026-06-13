"""Service for experiment result upload, parsing, and LLM-based analysis."""

import logging
import os
from pathlib import Path
from sqlalchemy.orm import Session

from app.config import settings
from app.models.experiment_result import ExperimentResult
from app.models.results_analysis import ResultsAnalysis
from app.models.method_version import MethodVersion
from app.parsers.experiment_result_parser import ExperimentResultParser
from app.services.llm_service import get_llm_service
from app.compliance.checker import check_results_without_data

logger = logging.getLogger(__name__)


class ResultsAnalysisService:
    """Handles experiment result upload, parsing, and LLM-driven analysis."""

    def upload_result(
        self,
        project_id: int,
        method_version_id: int,
        name: str,
        description: str,
        experiment_type: str,
        file_path: str,
        db: Session,
    ) -> ExperimentResult:
        """
        Parse an experiment result file and store it in the database.

        1. Validate the method version exists.
        2. Read and parse the file using ExperimentResultParser.
        3. Create an ExperimentResult record with raw_data.
        """
        # Validate method version
        method_version = (
            db.query(MethodVersion)
            .filter(MethodVersion.id == method_version_id)
            .first()
        )
        if not method_version:
            raise ValueError(f"MethodVersion with id {method_version_id} not found")

        # Read file content and parse
        parser = ExperimentResultParser()
        file_name = os.path.basename(file_path)
        try:
            with open(file_path, "rb") as f:
                file_content = f.read()
        except FileNotFoundError:
            raise ValueError(f"File not found: {file_path}")

        parsed = parser.parse(file_content, file_name)
        raw_data = parsed.get("raw_data", [])

        # Derive format from file extension
        fmt = file_name.rsplit(".", 1)[-1].lower() if "." in file_name else "unknown"

        # Create record
        result = ExperimentResult(
            project_id=project_id,
            method_version_id=method_version_id,
            name=name,
            description=description or "",
            experiment_type=experiment_type or "main",
            raw_data=raw_data,
            file_path=file_path,
            upload_format=fmt,
            status="parsed",
        )
        db.add(result)
        db.commit()
        db.refresh(result)
        return result

    def analyze_result(self, result_id: int, db: Session) -> ResultsAnalysis:
        """
        Analyze an experiment result using the LLM.

        1. Get the ExperimentResult record.
        2. Ensure raw_data exists; if not, generate a template-only analysis.
        3. Call LLM analyze_experiment_results().
        4. Store ResultsAnalysis record.
        5. Run compliance check (check_results_without_data).
        """
        result = (
            db.query(ExperimentResult)
            .filter(ExperimentResult.id == result_id)
            .first()
        )
        if not result:
            raise ValueError(f"ExperimentResult with id {result_id} not found")

        has_raw_data = bool(result.raw_data and len(result.raw_data) > 0)

        # Get method description for context
        method_version = (
            db.query(MethodVersion)
            .filter(MethodVersion.id == result.method_version_id)
            .first()
        )
        method_description = method_version.description if method_version else ""

        llm = get_llm_service(settings)

        if has_raw_data:
            analysis_data = llm.analyze_experiment_results(
                experiment_data=result.raw_data,
                method_description=method_description,
                experiment_type=result.experiment_type or "main",
            )
        else:
            # Template-only analysis when no raw data is available
            analysis_data = {
                "summary": "No raw data available for analysis. Please upload experiment result data.",
                "key_findings": ["Insufficient data for automated analysis"],
                "comparison_table": [],
                "strengths": [],
                "weaknesses": ["No raw experiment data provided"],
                "statistical_notes": ["Statistical analysis requires raw data"],
                "recommendations": ["Upload experiment results in CSV, XLSX, or JSON format"],
            }

        # Run compliance check
        compliance_result = check_results_without_data(analysis_data, has_raw_data)
        compliance_status = compliance_result.get("status", "unchecked")
        compliance_details = compliance_result.get("violations", [])

        # Upsert ResultsAnalysis
        existing = (
            db.query(ResultsAnalysis)
            .filter(ResultsAnalysis.experiment_result_id == result_id)
            .first()
        )
        if existing:
            existing.summary = analysis_data.get("summary", "")
            existing.key_findings = analysis_data.get("key_findings", [])
            existing.comparison_table = analysis_data.get("comparison_table", [])
            existing.strengths = analysis_data.get("strengths", [])
            existing.weaknesses = analysis_data.get("weaknesses", [])
            existing.statistical_notes = analysis_data.get("statistical_notes", [])
            existing.recommendations = analysis_data.get("recommendations", [])
            existing.compliance_status = compliance_status
            existing.compliance_details = compliance_details
            analysis_record = existing
        else:
            analysis_record = ResultsAnalysis(
                experiment_result_id=result_id,
                summary=analysis_data.get("summary", ""),
                key_findings=analysis_data.get("key_findings", []),
                comparison_table=analysis_data.get("comparison_table", []),
                strengths=analysis_data.get("strengths", []),
                weaknesses=analysis_data.get("weaknesses", []),
                statistical_notes=analysis_data.get("statistical_notes", []),
                recommendations=analysis_data.get("recommendations", []),
                compliance_status=compliance_status,
                compliance_details=compliance_details,
            )
            db.add(analysis_record)

        # Update result status
        result.status = "analyzed"

        db.commit()
        db.refresh(analysis_record)
        return analysis_record

    def get_analysis(self, result_id: int, db: Session) -> ResultsAnalysis:
        """Return the ResultsAnalysis for a given experiment result ID."""
        analysis = (
            db.query(ResultsAnalysis)
            .filter(ResultsAnalysis.experiment_result_id == result_id)
            .first()
        )
        if not analysis:
            raise ValueError(f"ResultsAnalysis for result_id {result_id} not found")
        return analysis
