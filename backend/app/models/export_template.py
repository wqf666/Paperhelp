from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, Boolean, func
from app.database import Base


class ExportTemplate(Base):
    __tablename__ = "export_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    template_type = Column(String(50), nullable=False)  # docx, latex
    description = Column(Text, default="")
    file_path = Column(String(1000), default="")
    section_mapping = Column(JSON, default=dict)
    style_config = Column(JSON, default=dict)
    is_builtin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
