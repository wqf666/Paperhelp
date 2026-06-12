"""Experiment result upload, retrieval, and analysis endpoints."""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.project import Project
from app.models.method_version import MethodVersion
from app.models.experiment_result import ExperimentResult
from app.models.results_analysis import ResultsAnalysis
from app.schemas.experiment_result import ExperimentResultResponse
from app.schemas.results_analysis import ResultsAnalysisResponse
from app.storage.local_storage import LocalStorage
from app.parsers.experiment_result_parser import ExperimentResultParser
from app.services.results_analysis_service import ResultsAnalysisService

router = APIRouter(tags=["experiment-results"])


@router.post(
    "/projects/{project_id}/experiment-results/upload",
    response_model=ExperimentResultResponse,
    status_code=201,
)
async def upload_experiment_result(
    project_id: int,
    method_version_id: int = Form(...),
    name: str = Form(...),
    description: str = Form(""),
    experiment_type: str = Form("main"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Upload an experiment result file."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    method_version = (
        db.query(MethodVersion).filter(MethodVersion.id == method_version_id).first()
    )
    if not method_version:
        raise HTTPException(status_code=404, detail="Method version not found")

    storage = LocalStorage()
    file_content = await file.read()
    file_path = storage.save(file.filename or "experiment_result", file_content)

    parser = ExperimentResultParser()
    parsed = parser.parse(file_content, file.filename or "")

    result = ExperimentResult(
        project_id=project_id,
        method_version_id=method_version_id,
        name=name,
        description=description,
        experiment_type=experiment_type,
        raw_data=parsed.get("raw_data", []),
        file_path=file_path,
        upload_format=file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "",
    )
    db.add(result)
    db.commit()
    db.refresh(result)
    return result


@router.get(
    "/projects/{project_id}/experiment-results",
    response_model=list[ExperimentResultResponse],
)
def list_experiment_results(project_id: int, db: Session = Depends(get_db)):
    """List all experiment results for a project."""
    return (
        db.query(ExperimentResult)
        .filter(ExperimentResult.project_id == project_id)
        .all()
    )


@router.get(
    "/experiment-results/{result_id}",
    response_model=ExperimentResultResponse,
)
def get_experiment_result(result_id: int, db: Session = Depends(get_db)):
    """Get a single experiment result."""
    result = (
        db.query(ExperimentResult).filter(ExperimentResult.id == result_id).first()
    )
    if not result:
        raise HTTPException(status_code=404, detail="Experiment result not found")
    return result


@router.post(
    "/experiment-results/{result_id}/analyze",
    response_model=ResultsAnalysisResponse,
)
def analyze_experiment_result(result_id: int, db: Session = Depends(get_db)):
    """Trigger analysis of an experiment result."""
    result = (
        db.query(ExperimentResult).filter(ExperimentResult.id == result_id).first()
    )
    if not result:
        raise HTTPException(status_code=404, detail="Experiment result not found")

    try:
        service = ResultsAnalysisService()
        analysis = service.analyze_result(result_id, db)
        return analysis
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get(
    "/experiment-results/{result_id}/analysis",
    response_model=ResultsAnalysisResponse,
)
def get_analysis(result_id: int, db: Session = Depends(get_db)):
    """Get analysis results for an experiment result."""
    analysis = (
        db.query(ResultsAnalysis)
        .filter(ResultsAnalysis.experiment_result_id == result_id)
        .first()
    )
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis
