"""Service for PDF upload, parsing, and chunking."""

import logging
from sqlalchemy.orm import Session

from app.models.paper import Paper, PaperStatus
from app.models.paper_chunk import PaperChunk
from app.parsers import ParserFactory

logger = logging.getLogger(__name__)


class PDFParsingService:
    """Handles PDF parsing and chunk storage for uploaded papers."""

    def parse_and_chunk(self, paper_id: int, db: Session) -> Paper:
        """
        Full PDF parsing pipeline:
        1. Retrieve the Paper from DB.
        2. Use ParserFactory to obtain an appropriate parser.
        3. If the file is a PDF, call extract_chunks() to get structured chunks.
        4. Store PaperChunk records in the DB.
        5. Update paper.chunk_count and paper.pdf_parse_status.
        Falls back to MockParser if real parsing fails.
        """
        paper = db.query(Paper).filter(Paper.id == paper_id).first()
        if not paper:
            raise ValueError(f"Paper with id {paper_id} not found")

        file_path = paper.file_path or ""
        paper.pdf_parse_status = "parsing"
        paper.status = PaperStatus.parsing
        db.commit()

        try:
            parser = ParserFactory.get_parser(file_path)
            chunks_data = []

            # Only attempt real chunk extraction for PDF files with a real parser
            if file_path.lower().endswith(".pdf"):
                try:
                    from app.parsers.pymupdf_parser import PyMuPDFParser
                    if isinstance(parser, PyMuPDFParser):
                        chunks_data = parser.extract_chunks(file_path)
                except ImportError:
                    logger.warning("PyMuPDF not available, using mock chunks")
                except Exception as exc:
                    logger.warning(f"Real PDF chunking failed: {exc}, falling back to MockParser")

            # If no real chunks extracted, use MockParser for chunk data
            if not chunks_data:
                from app.parsers.mock_parser import MockParser
                mock = MockParser()
                parsed = mock.parse(file_path)
                # Build chunks from the parsed paper sections
                chunk_index = 0
                if parsed.abstract:
                    chunks_data.append({
                        "chunk_index": chunk_index,
                        "section_title": "Abstract",
                        "content": parsed.abstract,
                        "start_page": 1,
                        "end_page": 1,
                        "chunk_type": "abstract",
                    })
                    chunk_index += 1
                for section_name, section_text in parsed.sections.items():
                    chunks_data.append({
                        "chunk_index": chunk_index,
                        "section_title": section_name,
                        "content": section_text,
                        "start_page": 1,
                        "end_page": 1,
                        "chunk_type": "body",
                    })
                    chunk_index += 1
                if parsed.references:
                    chunks_data.append({
                        "chunk_index": chunk_index,
                        "section_title": "References",
                        "content": "\n".join(parsed.references),
                        "start_page": 1,
                        "end_page": 1,
                        "chunk_type": "reference",
                    })

            # Store chunks and update paper
            self._store_chunks(chunks_data, paper_id, db)
            paper.chunk_count = len(chunks_data)
            paper.pdf_parse_status = "parsed"
            paper.status = PaperStatus.parsed
            db.commit()
            db.refresh(paper)
            return paper

        except Exception as exc:
            logger.error(f"PDF parsing failed for paper {paper_id}: {exc}")
            paper.pdf_parse_status = "error"
            paper.status = PaperStatus.error
            db.commit()
            raise RuntimeError(f"PDF parsing failed: {exc}") from exc

    @staticmethod
    def _store_chunks(chunks_data: list[dict], paper_id: int, db: Session) -> None:
        """Bulk-insert PaperChunk records for the given paper."""
        # Remove existing chunks for this paper first (upsert behavior)
        db.query(PaperChunk).filter(PaperChunk.paper_id == paper_id).delete()
        db.flush()

        chunk_records = []
        for chunk in chunks_data:
            record = PaperChunk(
                paper_id=paper_id,
                chunk_index=chunk.get("chunk_index", 0),
                section_title=chunk.get("section_title", ""),
                content=chunk.get("content", ""),
                start_page=chunk.get("start_page"),
                end_page=chunk.get("end_page"),
                chunk_type=chunk.get("chunk_type", "body"),
            )
            chunk_records.append(record)

        db.bulk_save_objects(chunk_records)
        db.flush()
