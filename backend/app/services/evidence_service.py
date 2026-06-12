"""Service for managing evidence spans linked to paper cards and chunks."""

import logging
from sqlalchemy.orm import Session

from app.models.evidence_span import EvidenceSpan
from app.models.paper_card import PaperCard
from app.models.paper_chunk import PaperChunk

logger = logging.getLogger(__name__)


class EvidenceService:
    """Manages evidence spans that link LLM-generated claims to source paper text."""

    def get_evidence_spans(self, paper_card_id: int, db: Session) -> list[EvidenceSpan]:
        """Return all EvidenceSpan records for a given paper card."""
        return (
            db.query(EvidenceSpan)
            .filter(EvidenceSpan.paper_card_id == paper_card_id)
            .all()
        )

    def store_evidence_spans(
        self,
        paper_card_id: int,
        paper_id: int,
        evidence_data_list: list[dict],
        db: Session,
    ) -> list[EvidenceSpan]:
        """
        Create EvidenceSpan records from LLM output dicts.

        Each dict in evidence_data_list should contain:
        - claim_type: str (novelty/limitation/method/result/dataset)
        - claim_text: str
        - source_page: int (optional)
        - source_section: str
        - source_text_span: str
        - confidence: float

        Tries to link chunk_id by matching section_title from PaperChunk records.
        """
        # Remove existing evidence spans for this paper card (upsert)
        db.query(EvidenceSpan).filter(
            EvidenceSpan.paper_card_id == paper_card_id
        ).delete()
        db.flush()

        # Pre-fetch all chunks for this paper to match section titles
        chunks = (
            db.query(PaperChunk)
            .filter(PaperChunk.paper_id == paper_id)
            .all()
        )
        section_to_chunk_id: dict[str, int] = {}
        for chunk in chunks:
            if chunk.section_title:
                section_to_chunk_id[chunk.section_title.lower()] = chunk.id

        created_spans: list[EvidenceSpan] = []
        for ev_data in evidence_data_list:
            # Try to find a matching chunk by section title
            source_section = ev_data.get("source_section", "")
            chunk_id = None
            if source_section:
                chunk_id = section_to_chunk_id.get(source_section.lower())

            span = EvidenceSpan(
                paper_card_id=paper_card_id,
                chunk_id=chunk_id,
                paper_id=paper_id,
                claim_type=ev_data.get("claim_type", "result"),
                claim_text=ev_data.get("claim_text", ""),
                source_page=ev_data.get("source_page"),
                source_section=source_section,
                source_text_span=ev_data.get("source_text_span", ""),
                confidence=float(ev_data.get("confidence", 0.0)),
            )
            db.add(span)
            created_spans.append(span)

        db.commit()
        for span in created_spans:
            db.refresh(span)

        return created_spans
