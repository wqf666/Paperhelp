"""Service for analysing papers: retrieving content, calling the LLM, and persisting paper cards."""

from sqlalchemy.orm import Session

from app.config import settings
from app.models.paper import Paper, PaperStatus
from app.models.paper_card import PaperCard
from app.services.llm_service import get_llm_service
from app.services.evidence_service import EvidenceService


class PaperAnalysisService:
    """Orchestrates the end-to-end paper analysis pipeline."""

    def analyze_paper(self, paper_id: int, db: Session) -> PaperCard:
        """
        Full analysis pipeline for a single paper:
        1. Retrieve the paper from the database.
        2. Extract text content (MVP: uses abstract + metadata as a stand-in for full text).
        3. Call the LLM to generate a structured paper card.
        4. Persist the PaperCard record.
        5. Update the paper status to 'analyzed'.
        6. Return the created PaperCard.
        """
        # 1. Fetch paper
        paper = db.query(Paper).filter(Paper.id == paper_id).first()
        if not paper:
            raise ValueError(f"Paper with id {paper_id} not found")

        # 2. Build paper text from available metadata
        #    In a production system this would call a PDF parser; for MVP we synthesise from metadata.
        paper_text = self._extract_text(paper)

        # 3. Update status to analyzing
        paper.status = PaperStatus.analyzing
        db.commit()

        # 4. Call LLM
        try:
            llm = get_llm_service(settings)
            card_data = llm.generate_paper_card(paper_text, paper.title)
        except Exception as exc:
            paper.status = PaperStatus.error
            db.commit()
            raise RuntimeError(f"LLM analysis failed: {exc}") from exc

        # 5. Persist paper card (upsert — replace if one already exists)
        existing_card = db.query(PaperCard).filter(PaperCard.paper_id == paper_id).first()
        if existing_card:
            db.delete(existing_card)
            db.flush()

        card = PaperCard(
            paper_id=paper.id,
            research_problem=card_data.get("research_problem", ""),
            method_summary=card_data.get("method_summary", ""),
            novelty_points=card_data.get("novelty_points", []),
            limitations=card_data.get("limitations", []),
            datasets=card_data.get("datasets", []),
            metrics=card_data.get("metrics", []),
            baselines=card_data.get("baselines", []),
            main_results=card_data.get("main_results", []),
            reproducibility=card_data.get("reproducibility", ""),
            evidence_spans=card_data.get("evidence_spans", []),
        )
        db.add(card)

        # 6. Mark paper as analyzed
        paper.status = PaperStatus.analyzed
        db.commit()
        db.refresh(card)

        # 7. Store evidence spans as proper DB records via EvidenceService
        evidence_data = card_data.get("evidence_spans", [])
        if evidence_data:
            # If evidence_spans are plain strings (e.g. from MockLLM), convert
            # them into structured dicts via the dedicated LLM method.
            if evidence_data and not isinstance(evidence_data[0], dict):
                evidence_data = llm.generate_evidence_spans(paper_text, paper.title, card_data)

            if evidence_data:  # may still be empty after conversion
                evidence_service = EvidenceService()
                evidence_service.store_evidence_spans(
                    paper_card_id=card.id,
                    paper_id=paper.id,
                    evidence_data_list=evidence_data,
                    db=db,
                )

        return card

    # ------------------------------------------------------------------

    @staticmethod
    def _extract_text(paper: Paper) -> str:
        """
        Build a text representation of the paper from available metadata.
        A production implementation would parse the uploaded PDF here.
        """
        parts = [
            f"Title: {paper.title}",
            f"Authors: {paper.authors}",
            f"Year: {paper.year}",
            f"Abstract: {paper.abstract}",
        ]
        return "\n".join(parts)
