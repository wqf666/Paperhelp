"""Service for managing export templates."""
import logging
from sqlalchemy.orm import Session
from app.models.export_template import ExportTemplate

logger = logging.getLogger(__name__)

class TemplateService:
    """Manages export templates (built-in + user-uploaded)."""

    def list_templates(self, db: Session, template_type: str = "") -> list[ExportTemplate]:
        """List all active templates, optionally filtered by type."""
        query = db.query(ExportTemplate).filter(ExportTemplate.is_active == True)
        if template_type:
            query = query.filter(ExportTemplate.template_type == template_type)
        return query.order_by(ExportTemplate.is_builtin.desc(), ExportTemplate.name).all()

    def get_template(self, template_id: int, db: Session) -> ExportTemplate:
        """Get a single template."""
        template = db.query(ExportTemplate).filter(ExportTemplate.id == template_id).first()
        if not template:
            raise ValueError(f"Template {template_id} not found")
        return template

    def create_template(self, data: dict, db: Session) -> ExportTemplate:
        """Create a custom template."""
        template = ExportTemplate(**data, is_builtin=False)
        db.add(template)
        db.commit()
        db.refresh(template)
        return template

    def delete_template(self, template_id: int, db: Session):
        """Delete a custom template (cannot delete built-in)."""
        template = db.query(ExportTemplate).filter(ExportTemplate.id == template_id).first()
        if not template:
            raise ValueError(f"Template {template_id} not found")
        if template.is_builtin:
            raise ValueError("Cannot delete built-in templates")
        db.delete(template)
        db.commit()

    def seed_builtin_templates(self, db: Session):
        """Insert built-in templates if they don't exist."""
        existing = db.query(ExportTemplate).filter(ExportTemplate.is_builtin == True).count()
        if existing >= 4:
            return  # Already seeded
        
        templates = [
            {
                "name": "Generic Article",
                "template_type": "docx",
                "description": "Standard academic article format with Times New Roman 12pt, 1.5 line spacing.",
                "section_mapping": {
                    "introduction": {"required": True, "heading_level": 1},
                    "related_work": {"required": True, "heading_level": 1},
                    "method": {"required": True, "heading_level": 1},
                    "experiments": {"required": True, "heading_level": 1},
                    "conclusion": {"required": True, "heading_level": 1},
                },
                "style_config": {
                    "page": {"margin_top": 2.54, "margin_bottom": 2.54, "margin_left": 3.18, "margin_right": 3.18},
                    "title": {"font_name": "Times New Roman", "font_size": 16, "bold": True, "alignment": "center"},
                    "heading1": {"font_name": "Times New Roman", "font_size": 14, "bold": True},
                    "heading2": {"font_name": "Times New Roman", "font_size": 12, "bold": True},
                    "body": {"font_name": "Times New Roman", "font_size": 12, "line_spacing": 1.5},
                    "reference": {"font_name": "Times New Roman", "font_size": 10, "hanging_indent": 0.5},
                },
            },
            {
                "name": "Generic Article",
                "template_type": "latex",
                "description": "Standard LaTeX article using article document class.",
                "section_mapping": {
                    "introduction": {"latex_section": "\\section{Introduction}", "required": True},
                    "related_work": {"latex_section": "\\section{Related Work}", "required": True},
                    "method": {"latex_section": "\\section{Method}", "required": True},
                    "experiments": {"latex_section": "\\section{Experiments}", "required": True},
                    "conclusion": {"latex_section": "\\section{Conclusion}", "required": True},
                },
                "style_config": {
                    "document_class": "article",
                    "packages": ["graphicx", "amsmath", "natbib", "hyperref"],
                    "bibliography_style": "plainnat",
                },
            },
            {
                "name": "ACL Conference",
                "template_type": "latex",
                "description": "ACL conference submission format, two-column.",
                "section_mapping": {
                    "introduction": {"latex_section": "\\section{Introduction}", "required": True},
                    "related_work": {"latex_section": "\\section{Related Work}", "required": True},
                    "method": {"latex_section": "\\section{Method}", "required": True},
                    "experiments": {"latex_section": "\\section{Experiments}", "required": True},
                    "conclusion": {"latex_section": "\\section{Conclusion}", "required": True},
                },
                "style_config": {
                    "document_class": "article",
                    "packages": ["acl", "graphicx", "amsmath", "natbib"],
                    "bibliography_style": "acl_natbib",
                    "options": ["11pt"],
                },
            },
            {
                "name": "IEEE Conference",
                "template_type": "latex",
                "description": "IEEE conference paper format, two-column.",
                "section_mapping": {
                    "introduction": {"latex_section": "\\section{Introduction}", "required": True},
                    "related_work": {"latex_section": "\\section{Related Work}", "required": True},
                    "method": {"latex_section": "\\section{Method}", "required": True},
                    "experiments": {"latex_section": "\\section{Experiments}", "required": True},
                    "conclusion": {"latex_section": "\\section{Conclusion}", "required": True},
                },
                "style_config": {
                    "document_class": "IEEEtran",
                    "packages": ["graphicx", "amsmath", "cite"],
                    "bibliography_style": "IEEEtran",
                    "options": ["conference"],
                },
            },
        ]

        for t_data in templates:
            # Check if this exact template already exists
            exists = db.query(ExportTemplate).filter(
                ExportTemplate.name == t_data["name"],
                ExportTemplate.template_type == t_data["template_type"],
                ExportTemplate.is_builtin == True,
            ).first()
            if not exists:
                template = ExportTemplate(**t_data, is_builtin=True, is_active=True)
                db.add(template)

        db.commit()
