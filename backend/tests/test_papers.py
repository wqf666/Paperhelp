"""Tests for the /papers and /papers/{id}/analyze endpoints."""

import pytest


def _create_project(client) -> int:
    """Helper: create a project and return its id."""
    resp = client.post("/projects/", json={"name": "Paper Test Project"})
    return resp.json()["id"]


class TestAddPaper:
    """POST /projects/{project_id}/papers"""

    def test_add_paper_minimal(self, client):
        project_id = _create_project(client)
        response = client.post(
            f"/projects/{project_id}/papers",
            json={"title": "Attention Is All You Need"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Attention Is All You Need"
        assert data["project_id"] == project_id
        assert data["status"] == "uploaded"

    def test_add_paper_full(self, client):
        project_id = _create_project(client)
        payload = {
            "title": "BERT: Pre-training of Deep Bidirectional Transformers",
            "authors": "Devlin et al.",
            "year": 2019,
            "venue": "NAACL",
            "doi": "10.18653/v1/N19-1423",
            "abstract": "We introduce BERT, a new language representation model.",
        }
        response = client.post(f"/projects/{project_id}/papers", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "BERT: Pre-training of Deep Bidirectional Transformers"
        assert data["authors"] == "Devlin et al."
        assert data["year"] == 2019
        assert data["venue"] == "NAACL"

    def test_add_paper_nonexistent_project(self, client):
        response = client.post("/projects/99999/papers", json={"title": "Orphan Paper"})
        assert response.status_code == 404


class TestListPapers:
    """GET /projects/{project_id}/papers"""

    def test_list_empty(self, client):
        project_id = _create_project(client)
        response = client.get(f"/projects/{project_id}/papers")
        assert response.status_code == 200
        assert response.json() == []

    def test_list_multiple_papers(self, client):
        project_id = _create_project(client)
        client.post(f"/projects/{project_id}/papers", json={"title": "Paper A"})
        client.post(f"/projects/{project_id}/papers", json={"title": "Paper B"})

        response = client.get(f"/projects/{project_id}/papers")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        titles = {p["title"] for p in data}
        assert titles == {"Paper A", "Paper B"}


class TestAnalyzePaper:
    """POST /papers/{paper_id}/analyze"""

    def test_analyze_paper_creates_card(self, client):
        project_id = _create_project(client)
        paper_resp = client.post(
            f"/projects/{project_id}/papers",
            json={"title": "Test Paper for Analysis", "abstract": "This paper studies transformers."},
        )
        paper_id = paper_resp.json()["id"]

        response = client.post(f"/papers/{paper_id}/analyze")
        assert response.status_code == 200
        card = response.json()

        assert card["paper_id"] == paper_id
        assert len(card["research_problem"]) > 0
        assert len(card["method_summary"]) > 0
        assert isinstance(card["novelty_points"], list)
        assert len(card["novelty_points"]) > 0
        assert isinstance(card["limitations"], list)
        assert len(card["limitations"]) > 0
        assert isinstance(card["datasets"], list)
        assert isinstance(card["metrics"], list)
        assert isinstance(card["baselines"], list)
        assert isinstance(card["main_results"], list)
        assert len(card["reproducibility"]) > 0
        assert isinstance(card["evidence_spans"], list)

    def test_analyze_paper_updates_status(self, client):
        project_id = _create_project(client)
        paper_resp = client.post(
            f"/projects/{project_id}/papers",
            json={"title": "Status Check Paper"},
        )
        paper_id = paper_resp.json()["id"]

        # Before analysis
        papers = client.get(f"/projects/{project_id}/papers").json()
        assert papers[0]["status"] == "uploaded"

        # After analysis
        client.post(f"/papers/{paper_id}/analyze")
        papers = client.get(f"/projects/{project_id}/papers").json()
        assert papers[0]["status"] == "analyzed"

    def test_analyze_nonexistent_paper(self, client):
        response = client.post("/papers/99999/analyze")
        assert response.status_code == 404


class TestGetPaperCard:
    """GET /papers/{paper_id}/card"""

    def test_get_card_after_analysis(self, client):
        project_id = _create_project(client)
        paper_resp = client.post(
            f"/projects/{project_id}/papers",
            json={"title": "Card Test Paper"},
        )
        paper_id = paper_resp.json()["id"]

        # Generate card
        client.post(f"/papers/{paper_id}/analyze")

        # Retrieve card
        response = client.get(f"/papers/{paper_id}/card")
        assert response.status_code == 200
        card = response.json()
        assert card["paper_id"] == paper_id
        assert len(card["research_problem"]) > 0

    def test_get_card_before_analysis_returns_404(self, client):
        project_id = _create_project(client)
        paper_resp = client.post(
            f"/projects/{project_id}/papers",
            json={"title": "Unanalysed Paper"},
        )
        paper_id = paper_resp.json()["id"]

        response = client.get(f"/papers/{paper_id}/card")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_get_card_nonexistent_paper(self, client):
        response = client.get("/papers/99999/card")
        assert response.status_code == 404
