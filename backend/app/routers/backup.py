import os
import json
import zipfile
import tempfile
import shutil
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Dict, Any
import logging

from app.database import get_db
from app.models import (
    Project, Paper, ResearchIdea, ExperimentPlan,
    ManuscriptState, ManuscriptSection, Citation,
    ReviewerSimulation, MethodVersion,
)
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/backup", tags=["backup"])


@router.post("/projects/{project_id}/export")
def export_project_backup(project_id: int, db: Session = Depends(get_db)):
    """Export a project as a .papb backup file."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Create temp file for the backup
    export_dir = Path(settings.EXPORT_PATH) / "backups"
    export_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"{project.name}_{timestamp}.papb"
    backup_path = export_dir / backup_filename

    with zipfile.ZipFile(str(backup_path), 'w', zipfile.ZIP_DEFLATED) as zf:
        # Manifest
        manifest = {
            "version": "1.0",
            "app_version": "0.1.0",
            "created_at": datetime.now().isoformat(),
            "project_id": project_id,
            "project_name": project.name,
        }
        zf.writestr("manifest.json", json.dumps(manifest, indent=2, ensure_ascii=False))

        # Project data
        project_data = {
            "name": project.name,
            "description": project.description,
            "target_field": project.target_field if hasattr(project, 'target_field') else None,
            "target_venue": project.target_venue if hasattr(project, 'target_venue') else None,
        }
        zf.writestr("project.json", json.dumps(project_data, indent=2, ensure_ascii=False))

        # Papers
        papers = db.query(Paper).filter(Paper.project_id == project_id).all()
        papers_data = []
        for p in papers:
            papers_data.append({
                "title": p.title,
                "status": p.status.value if hasattr(p.status, 'value') else str(p.status),
                "file_path": p.file_path if hasattr(p, 'file_path') else None,
            })
        zf.writestr("papers.json", json.dumps(papers_data, indent=2, ensure_ascii=False))

        # Ideas
        ideas = db.query(ResearchIdea).filter(ResearchIdea.project_id == project_id).all()
        ideas_data = []
        for idea in ideas:
            idea_dict = {}
            for col in idea.__table__.columns:
                val = getattr(idea, col.name)
                if hasattr(val, 'isoformat'):
                    val = val.isoformat()
                idea_dict[col.name] = val
            ideas_data.append(idea_dict)
        zf.writestr("ideas.json", json.dumps(ideas_data, indent=2, ensure_ascii=False))

        # Experiments (linked through ideas, not directly to project)
        idea_ids = [idea.id for idea in ideas]
        if idea_ids:
            experiments = db.query(ExperimentPlan).filter(
                ExperimentPlan.idea_id.in_(idea_ids)
            ).all()
        else:
            experiments = []
        exp_data = []
        for exp in experiments:
            exp_dict = {}
            for col in exp.__table__.columns:
                val = getattr(exp, col.name)
                if hasattr(val, 'isoformat'):
                    val = val.isoformat()
                exp_dict[col.name] = val
            exp_data.append(exp_dict)
        zf.writestr("experiments.json", json.dumps(exp_data, indent=2, ensure_ascii=False))

        # Citations
        citations = db.query(Citation).filter(Citation.project_id == project_id).all()
        cit_data = []
        for c in citations:
            c_dict = {}
            for col in c.__table__.columns:
                val = getattr(c, col.name)
                if hasattr(val, 'isoformat'):
                    val = val.isoformat()
                c_dict[col.name] = val
            cit_data.append(c_dict)
        zf.writestr("citations.json", json.dumps(cit_data, indent=2, ensure_ascii=False))

        # Reviewers
        reviewers = db.query(ReviewerSimulation).filter(ReviewerSimulation.project_id == project_id).all()
        rev_data = []
        for r in reviewers:
            r_dict = {}
            for col in r.__table__.columns:
                val = getattr(r, col.name)
                if hasattr(val, 'isoformat'):
                    val = val.isoformat()
                r_dict[col.name] = val
            rev_data.append(r_dict)
        zf.writestr("reviewers.json", json.dumps(rev_data, indent=2, ensure_ascii=False))

        # Manuscript state + sections (full data)
        manuscript = db.query(ManuscriptState).filter(ManuscriptState.project_id == project_id).first()
        if manuscript:
            sections = db.query(ManuscriptSection).filter(
                ManuscriptSection.manuscript_state_id == manuscript.id
            ).all()
            ms_data = {
                "title": manuscript.title or "",
                "abstract": manuscript.abstract or "",
                "contributions": manuscript.contributions if isinstance(manuscript.contributions, list) else [],
                "outline": manuscript.outline if isinstance(manuscript.outline, list) else [],
                "current_draft": manuscript.current_draft or "",
                "compliance_status": manuscript.compliance_status or "unchecked",
                "compliance_details": manuscript.compliance_details if isinstance(manuscript.compliance_details, list) else [],
                "method_version": manuscript.method_version,
                "unresolved_issues": manuscript.unresolved_issues if isinstance(manuscript.unresolved_issues, list) else [],
                "sections": [],
            }
            for s in sections:
                s_dict = {}
                for col in s.__table__.columns:
                    val = getattr(s, col.name)
                    if hasattr(val, 'isoformat'):
                        val = val.isoformat()
                    s_dict[col.name] = val
                ms_data["sections"].append(s_dict)
            zf.writestr("manuscript.json", json.dumps(ms_data, indent=2, ensure_ascii=False))

        # Upload files — only include files belonging to this project's papers
        upload_dir = Path(settings.STORAGE_PATH)
        project_file_paths = set()
        for p in papers:
            if hasattr(p, 'file_path') and p.file_path:
                project_file_paths.add(p.file_path)

        if upload_dir.exists() and project_file_paths:
            for rel_path in project_file_paths:
                file_path = upload_dir / rel_path
                if file_path.exists() and file_path.is_file():
                    arcname = f"uploads/{rel_path}"
                    zf.write(str(file_path), arcname)

    return {
        "status": "ok",
        "filename": backup_filename,
        "path": str(backup_path),
        "size_bytes": backup_path.stat().st_size,
    }


@router.post("/import")
async def import_project_backup(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Import a project from a .papb backup file."""
    if not file.filename or not file.filename.endswith('.papb'):
        raise HTTPException(status_code=400, detail="Invalid backup file format. Expected .papb file.")

    content = await file.read()

    with tempfile.TemporaryDirectory() as tmp_dir:
        backup_path = Path(tmp_dir) / "backup.papb"
        backup_path.write_bytes(content)

        with zipfile.ZipFile(str(backup_path), 'r') as zf:
            # Validate manifest
            try:
                manifest = json.loads(zf.read("manifest.json"))
            except (KeyError, json.JSONDecodeError):
                raise HTTPException(status_code=400, detail="Invalid backup file: missing or corrupt manifest")

            if manifest.get("version") != "1.0":
                raise HTTPException(status_code=400, detail=f"Unsupported backup version: {manifest.get('version')}")

            # Create project
            project_data = json.loads(zf.read("project.json"))
            project = Project(
                name=f"{project_data['name']} (imported)",
                description=project_data.get('description', ''),
            )
            if hasattr(project, 'target_field') and project_data.get('target_field'):
                project.target_field = project_data['target_field']
            if hasattr(project, 'target_venue') and project_data.get('target_venue'):
                project.target_venue = project_data['target_venue']
            db.add(project)
            db.flush()  # Get project.id
            new_project_id = project.id

            # Import ideas
            try:
                ideas_data = json.loads(zf.read("ideas.json"))
                for idea_dict in ideas_data:
                    idea_dict.pop('id', None)
                    idea_dict['project_id'] = new_project_id
                    idea = ResearchIdea(**idea_dict)
                    db.add(idea)
            except KeyError:
                pass

            # Import citations
            try:
                cit_data = json.loads(zf.read("citations.json"))
                for c_dict in cit_data:
                    c_dict.pop('id', None)
                    c_dict['project_id'] = new_project_id
                    citation = Citation(**c_dict)
                    db.add(citation)
            except KeyError:
                pass

            # Import reviewers
            try:
                rev_data = json.loads(zf.read("reviewers.json"))
                for r_dict in rev_data:
                    r_dict.pop('id', None)
                    r_dict['project_id'] = new_project_id
                    reviewer = ReviewerSimulation(**r_dict)
                    db.add(reviewer)
            except KeyError:
                pass

            # Import papers
            idea_id_map = {}  # old_idea_id -> new_idea_id
            try:
                new_ideas = db.query(ResearchIdea).filter(
                    ResearchIdea.project_id == new_project_id
                ).all()
                # Build mapping by name match (since IDs change)
                for ni in new_ideas:
                    idea_id_map[ni.name] = ni.id
            except Exception:
                pass

            try:
                papers_data = json.loads(zf.read("papers.json"))
                for p_dict in papers_data:
                    paper = Paper(
                        project_id=new_project_id,
                        title=p_dict.get("title", ""),
                        status=p_dict.get("status", "uploaded"),
                        file_path=p_dict.get("file_path"),
                    )
                    db.add(paper)
            except KeyError:
                pass

            # Import experiments (linked through ideas)
            try:
                exp_data = json.loads(zf.read("experiments.json"))
                # Build old_idea_id -> new_idea_id mapping from imported ideas
                ideas_raw = json.loads(zf.read("ideas.json"))
                old_to_new_idea = {}
                for old_idea in ideas_raw:
                    old_name = old_idea.get("name", "")
                    if old_name in idea_id_map:
                        old_to_new_idea[old_idea["id"]] = idea_id_map[old_name]

                for exp_dict in exp_data:
                    old_idea_id = exp_dict.get("idea_id")
                    new_idea_id = old_to_new_idea.get(old_idea_id)
                    if new_idea_id:
                        exp_dict.pop("id", None)
                        exp_dict["idea_id"] = new_idea_id
                        exp = ExperimentPlan(**exp_dict)
                        db.add(exp)
            except (KeyError, json.JSONDecodeError):
                pass

            # Import manuscript state and sections
            try:
                ms_data = json.loads(zf.read("manuscript.json"))
                ms_sections = ms_data.get("sections", [])
                manuscript = ManuscriptState(
                    project_id=new_project_id,
                    title=ms_data.get("title", ""),
                    abstract=ms_data.get("abstract", ""),
                    contributions=ms_data.get("contributions", []),
                    outline=ms_data.get("outline", []),
                    current_draft=ms_data.get("current_draft", ""),
                    compliance_status=ms_data.get("compliance_status", "unchecked"),
                    compliance_details=ms_data.get("compliance_details", []),
                    method_version=ms_data.get("method_version", 1),
                    unresolved_issues=ms_data.get("unresolved_issues", []),
                )
                db.add(manuscript)
                db.flush()  # Get manuscript.id

                for s_dict in ms_sections:
                    s_dict.pop("id", None)
                    s_dict["manuscript_state_id"] = manuscript.id
                    s_dict.pop("method_version_id", None)  # FK may not map
                    section = ManuscriptSection(**s_dict)
                    db.add(section)
            except (KeyError, json.JSONDecodeError):
                pass

            # Extract upload files
            upload_dir = Path(settings.STORAGE_PATH)
            for name in zf.namelist():
                if name.startswith("uploads/") and not name.endswith("/"):
                    relative_path = name[len("uploads/"):]
                    target_path = upload_dir / relative_path
                    target_path.parent.mkdir(parents=True, exist_ok=True)
                    target_path.write_bytes(zf.read(name))

            db.commit()

    return {
        "status": "ok",
        "project_id": new_project_id,
        "message": f"Project '{project_data['name']}' imported successfully",
    }


@router.get("/download/{filename}")
def download_backup(filename: str):
    """Download an exported backup file."""
    export_dir = Path(settings.EXPORT_PATH) / "backups"
    file_path = export_dir / filename
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Backup file not found")
    return FileResponse(
        str(file_path),
        media_type="application/octet-stream",
        filename=filename,
    )


@router.get("/projects/{project_id}/info")
def get_backup_info(project_id: int, db: Session = Depends(get_db)):
    """Get backup-related info for a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    paper_count = db.query(Paper).filter(Paper.project_id == project_id).count()
    idea_count = db.query(ResearchIdea).filter(ResearchIdea.project_id == project_id).count()
    citation_count = db.query(Citation).filter(Citation.project_id == project_id).count()

    return {
        "project_name": project.name,
        "record_counts": {
            "papers": paper_count,
            "ideas": idea_count,
            "citations": citation_count,
        },
    }
