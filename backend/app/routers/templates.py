"""Export template management endpoints."""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.export_template import ExportTemplateResponse
from app.services.template_service import TemplateService
from app.storage.local_storage import LocalStorage

router = APIRouter(tags=["templates"])


@router.get(
    "/templates",
    response_model=list[ExportTemplateResponse],
)
def list_templates(
    template_type: str = "",
    db: Session = Depends(get_db),
):
    """List all active templates, optionally filtered by type."""
    service = TemplateService()
    return service.list_templates(db, template_type=template_type)


@router.post(
    "/templates",
    response_model=ExportTemplateResponse,
    status_code=201,
)
async def upload_template(
    name: str = Form(...),
    template_type: str = Form(...),
    description: str = Form(""),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Upload a custom export template."""
    storage = LocalStorage()
    file_content = await file.read()
    file_path = storage.save(file.filename or "template", file_content)

    service = TemplateService()
    data = {
        "name": name,
        "template_type": template_type,
        "description": description,
        "file_path": file_path,
    }
    template = service.create_template(data, db)
    return template


@router.get(
    "/templates/{template_id}",
    response_model=ExportTemplateResponse,
)
def get_template(template_id: int, db: Session = Depends(get_db)):
    """Get a single template."""
    service = TemplateService()
    try:
        template = service.get_template(template_id, db)
    except ValueError:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.delete(
    "/templates/{template_id}",
)
def delete_template(template_id: int, db: Session = Depends(get_db)):
    """Delete a custom template (built-in templates cannot be deleted)."""
    service = TemplateService()
    try:
        service.delete_template(template_id, db)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {"message": "Deleted"}
