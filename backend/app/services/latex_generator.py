"""Service for generating LaTeX project packages."""
import os
import io
import zipfile
import logging
import subprocess
import shutil
from datetime import datetime
from sqlalchemy.orm import Session

from jinja2 import Environment, FileSystemLoader, BaseLoader

from app.config import settings
from app.models.manuscript_state import ManuscriptState
from app.models.manuscript_section import ManuscriptSection
from app.models.citation import Citation
from app.models.export_record import ExportRecord
from app.models.export_template import ExportTemplate
from app.export.pre_export_validator import PreExportValidator
from app.parsers.bibtex_parser import BibTeXParser

logger = logging.getLogger(__name__)

# Default LaTeX template (used when no Jinja2 file template is available)
DEFAULT_LATEX_TEMPLATE = r"""\documentclass[11pt]{article}
\usepackage[utf8]{inputenc}
\usepackage{graphicx}
\usepackage{amsmath}
\usepackage{natbib}
\usepackage{hyperref}

\title{ {{ title }} }
\date{}

\begin{document}
\maketitle

\begin{abstract}
{{ abstract }}
\end{abstract}

{% for section in sections %}
\section{ {{ section.title }} }
{{ section.content }}

{% for figure in section.figures %}
\begin{figure}[htbp]
\centering
% \includegraphics[width=\textwidth]{ {{ figure.file_path }} }
\caption{ {{ figure.caption }} }
\label{ {{ "fig:" ~ figure.id }} }
\end{figure}
{% endfor %}

{% for table in section.tables %}
\begin{table}[htbp]
\centering
\caption{ {{ table.caption }} }
\label{ {{ "tab:" ~ table.id }} }
\begin{tabular}{| {{ "c|" * table.col_count }} }
\hline
{% for row in table.rows %}
{{ " & ".join(row) }} \\
\hline
{% endfor %}
\end{tabular}
\end{table}
{% endfor %}

{% for eq in section.equations %}
\begin{equation}
\label{ {{ "eq:" ~ eq.id }} }
{{ eq.latex }}
\end{equation}
{% endfor %}

{% endfor %}

\bibliographystyle{plainnat}
\bibliography{references}

\input{ai_disclosure}

\end{document}
"""


class LatexGeneratorService:
    """Generates LaTeX project packages from manuscript data."""

    def generate(self, manuscript_id: int, template_id: int | None, db: Session) -> ExportRecord:
        """Generate a LaTeX project zip for the manuscript."""
        # Validate
        validator = PreExportValidator()
        validation = validator.validate(manuscript_id, db)

        manuscript = db.query(ManuscriptState).filter(
            ManuscriptState.id == manuscript_id
        ).first()
        if not manuscript:
            raise ValueError("Manuscript not found")

        record = ExportRecord(
            project_id=manuscript.project_id,
            manuscript_state_id=manuscript_id,
            template_id=template_id,
            export_type="latex",
            status="generating",
        )
        db.add(record)
        db.commit()
        db.refresh(record)

        try:
            if not validation.is_valid:
                raise RuntimeError("Validation failed: " + "; ".join(validation.errors))

            # Load data
            sections = (
                db.query(ManuscriptSection)
                .filter(ManuscriptSection.manuscript_state_id == manuscript_id)
                .order_by(ManuscriptSection.sort_order)
                .all()
            )
            citations = (
                db.query(Citation)
                .filter(Citation.project_id == manuscript.project_id)
                .all()
            )

            # Determine style config
            style_config = {
                "document_class": "article",
                "packages": ["graphicx", "amsmath", "natbib"],
                "bibliography_style": "plainnat",
            }
            if template_id:
                template = db.query(ExportTemplate).filter(
                    ExportTemplate.id == template_id
                ).first()
                if template and template.style_config:
                    style_config = template.style_config

            # Prepare template context
            sections_data = self._build_sections_data(sections)

            # Render main.tex
            main_tex = self._render_main_tex(manuscript, sections_data, style_config)

            # Generate references.bib
            bibtex_parser = BibTeXParser()
            references_bib = bibtex_parser.serialize(citations)

            # Create AI disclosure as separate file
            ai_disclosure = self._generate_ai_disclosure_tex()

            # Package into zip
            export_dir = os.path.join(settings.EXPORT_PATH, str(manuscript.project_id))
            os.makedirs(export_dir, exist_ok=True)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            zip_name = f"{timestamp}_latex_project.zip"
            zip_path = os.path.join(export_dir, zip_name)

            with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
                zf.writestr("main.tex", main_tex)
                zf.writestr("references.bib", references_bib)
                zf.writestr("ai_disclosure.tex", ai_disclosure)
                zf.writestr("figures/.gitkeep", "")
                zf.writestr("README.txt", self._generate_readme(style_config))

            file_size = os.path.getsize(zip_path)

            # Try compilation check
            compilation_log = ""
            if shutil.which(settings.LATEX_COMPILER):
                compilation_log = self._check_compilation(zip_path, export_dir)

            record.file_path = zip_path
            record.file_name = zip_name
            record.file_size = file_size
            record.status = "completed"
            record.compilation_log = compilation_log
            record.completed_at = datetime.now()

            if validation.warnings:
                record.error_message = "Warnings: " + "; ".join(validation.warnings)

        except Exception as exc:
            record.status = "failed"
            record.error_message = str(exc)
            logger.error(f"LaTeX generation failed: {exc}")

        db.commit()
        db.refresh(record)
        return record

    def _build_sections_data(self, sections: list) -> list:
        result = []
        for s in sections:
            content = s.content or s.generated_content or ""
            figures = s.figure_refs if isinstance(s.figure_refs, list) else []
            tables_raw = s.table_refs if isinstance(s.table_refs, list) else []
            equations = s.equation_refs if isinstance(s.equation_refs, list) else []

            # Build table data with rows
            tables = []
            for t in tables_raw:
                caption = t.get("caption", "")
                tid = t.get("id", "unknown")
                # If data_source references an experiment result, build rows
                rows = t.get("rows", [])
                col_count = len(rows[0]) if rows else 1
                tables.append({
                    "id": tid,
                    "caption": caption,
                    "rows": rows,
                    "col_count": col_count,
                })

            result.append({
                "title": s.title or s.section_key,
                "content": content,
                "figures": figures,
                "tables": tables,
                "equations": equations,
            })
        return result

    def _render_main_tex(
        self, manuscript: ManuscriptState, sections_data: list, style_config: dict
    ) -> str:
        # Try to load a file-based Jinja2 template
        template_dir = os.path.join(
            os.path.dirname(os.path.dirname(__file__)), "templates", "latex"
        )
        template_name = self._get_template_filename(style_config)

        try:
            if (
                os.path.isdir(template_dir)
                and template_name
                and os.path.isfile(os.path.join(template_dir, template_name))
            ):
                env = Environment(loader=FileSystemLoader(template_dir))
                template = env.get_template(template_name)
            else:
                env = Environment(loader=BaseLoader())
                template = env.from_string(DEFAULT_LATEX_TEMPLATE)
        except Exception:
            env = Environment(loader=BaseLoader())
            template = env.from_string(DEFAULT_LATEX_TEMPLATE)

        return template.render(
            title=manuscript.title or "Untitled",
            abstract=manuscript.abstract or "",
            sections=sections_data,
            style_config=style_config,
        )

    def _get_template_filename(self, style_config: dict) -> str | None:
        doc_class = style_config.get("document_class", "article")
        packages = style_config.get("packages", [])
        if "acl" in packages:
            return "acl_conference.tex.j2"
        if doc_class == "IEEEtran":
            return "ieee_conference.tex.j2"
        if doc_class == "report" or "thesis" in str(style_config):
            return "thesis.tex.j2"
        return "generic_article.tex.j2"

    def _generate_ai_disclosure_tex(self) -> str:
        return (
            "\\section*{AI Usage Disclosure}\n\n"
            "This manuscript was prepared with AI-assisted tools for literature analysis, "
            "idea generation, and drafting support. All content has been reviewed and verified "
            "by the authors. The AI tools used are acknowledged as writing aids and are not "
            "listed as authors. All experimental results presented are based on actual data "
            "and have not been fabricated.\n"
        )

    def _generate_readme(self, style_config: dict) -> str:
        doc_class = style_config.get("document_class", "article")
        bib_style = style_config.get("bibliography_style", "plainnat")
        return (
            f"LaTeX Project\n"
            f"==============\n\n"
            f"Document class: {doc_class}\n"
            f"Bibliography style: {bib_style}\n\n"
            f"To compile:\n"
            f"  pdflatex main.tex\n"
            f"  bibtex main\n"
            f"  pdflatex main.tex\n"
            f"  pdflatex main.tex\n"
        )

    def _check_compilation(self, zip_path: str, work_dir: str) -> str:
        """Try to compile the LaTeX project and return log output."""
        try:
            extract_dir = os.path.join(work_dir, "_compile_check")
            os.makedirs(extract_dir, exist_ok=True)
            with zipfile.ZipFile(zip_path, "r") as zf:
                zf.extractall(extract_dir)

            result = subprocess.run(
                [settings.LATEX_COMPILER, "-interaction=nonstopmode", "main.tex"],
                cwd=extract_dir,
                capture_output=True,
                text=True,
                timeout=60,
            )
            log = result.stdout + result.stderr

            # Cleanup
            shutil.rmtree(extract_dir, ignore_errors=True)

            # Extract error lines
            error_lines = [line for line in log.split("\n") if line.startswith("!")]
            if error_lines:
                return "Compilation errors:\n" + "\n".join(error_lines[:10])
            return "Compilation check passed." if result.returncode == 0 else log[:2000]
        except Exception as exc:
            return f"Compilation check skipped: {exc}"
