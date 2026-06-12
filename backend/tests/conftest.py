"""
Shared pytest fixtures for the test suite.

Uses a SQLite in-memory database to replace the MySQL engine, providing fast
and isolated tests. All tables are created from the ORM Base metadata.
"""

import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

# Force MOCK_LLM before importing the app
os.environ["MOCK_LLM"] = "True"
os.environ["DATABASE_URL"] = "sqlite:///./test_research_agent.db"

from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402

# Import all models so Base.metadata knows about every table
from app.models.project import Project  # noqa: F401, E402
from app.models.paper import Paper  # noqa: F401, E402
from app.models.paper_card import PaperCard  # noqa: F401, E402
from app.models.research_idea import ResearchIdea  # noqa: F401, E402
from app.models.experiment_plan import ExperimentPlan  # noqa: F401, E402
from app.models.manuscript_state import ManuscriptState  # noqa: F401, E402
# MVP 2 models
from app.models.paper_chunk import PaperChunk  # noqa: F401, E402
from app.models.evidence_span import EvidenceSpan  # noqa: F401, E402
from app.models.method_version import MethodVersion  # noqa: F401, E402
from app.models.experiment_result import ExperimentResult  # noqa: F401, E402
from app.models.results_analysis import ResultsAnalysis  # noqa: F401, E402
from app.models.reviewer_simulation import ReviewerSimulation  # noqa: F401, E402
from app.models.manuscript_section import ManuscriptSection  # noqa: F401, E402
# MVP 3 models
from app.models.citation import Citation  # noqa: F401, E402
from app.models.section_citation import SectionCitation  # noqa: F401, E402
from app.models.export_template import ExportTemplate  # noqa: F401, E402
from app.models.export_record import ExportRecord  # noqa: F401, E402

TEST_DATABASE_URL = "sqlite:///./test_research_agent.db"


@pytest.fixture(scope="function")
def db_session():
    """Provide a clean database session for each test function."""
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    Base.metadata.create_all(bind=engine)

    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture(scope="function")
def client(db_session):
    """Provide a FastAPI TestClient wired to the test database session."""

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
