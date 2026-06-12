"""FastAPI application entry point for the Research Paper Writing Agent."""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import projects, papers, ideas, experiments, manuscript
from app.routers import chunks, method_versions, experiment_results, reviewer, sections
from app.routers import citations, templates, export, converter

logger = logging.getLogger(__name__)

app = FastAPI(
    title="\u79d1\u7814\u8bba\u6587\u5199\u4f5c Agent API",
    description=(
        "Backend API for the Research Paper Writing Agent platform.\n\n"
        "This system provides automated paper analysis, research idea generation, "
        "experiment planning, and manuscript outline generation powered by LLMs.\n\n"
        "---\n\n"
        "**Compliance Disclaimer**: This tool is designed to *assist* researchers in "
        "brainstorming, planning, and drafting. All generated content must be reviewed, "
        "verified, and approved by a qualified human researcher before use. The system "
        "does not replace expert judgment, and users are responsible for ensuring "
        "academic integrity and compliance with institutional and publication policies. "
        "AI-generated content should never be presented as original human work without "
        "proper attribution."
    ),
    version="0.1.0",
)

# CORS -- allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(projects.router)
app.include_router(papers.router)
app.include_router(ideas.router)
app.include_router(experiments.router)
app.include_router(manuscript.router)
app.include_router(chunks.router)
app.include_router(method_versions.router)
app.include_router(experiment_results.router)
app.include_router(reviewer.router)
app.include_router(sections.router)
app.include_router(citations.router)
app.include_router(templates.router)
app.include_router(export.router)
app.include_router(converter.router)


@app.on_event("startup")
def seed_builtin_templates():
    """Seed built-in export templates on application startup."""
    from app.database import SessionLocal
    from app.services.template_service import TemplateService

    db = SessionLocal()
    try:
        TemplateService().seed_builtin_templates(db)
    except Exception as exc:
        logger.warning(f"Failed to seed built-in templates: {exc}")
    finally:
        db.close()


@app.get("/health", tags=["system"])
def health_check():
    """Liveness probe for monitoring and load balancers."""
    return {"status": "ok", "message": "Research Paper Writing Agent API is running"}
