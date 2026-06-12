"""Tests for the /projects/{id}/ideas endpoints."""

import pytest


def _create_project(client) -> int:
    """Helper: create a project and return its id."""
    resp = client.post("/projects/", json={"name": "Ideas Test Project", "target_field": "NLP"})
    return resp.json()["id"]


class TestGenerateIdeas:
    """POST /projects/{project_id}/ideas/generate"""

    def test_generate_ideas(self, client):
        project_id = _create_project(client)

        response = client.post(
            f"/projects/{project_id}/ideas/generate",
            json={"research_field": "NLP", "additional_context": "Focus on efficiency"},
        )
        assert response.status_code == 201
        ideas = response.json()
        assert isinstance(ideas, list)
        assert len(ideas) > 0

        for idea in ideas:
            assert "id" in idea
            assert idea["project_id"] == project_id
            assert len(idea["name"]) > 0
            assert len(idea["research_gap"]) > 0
            assert len(idea["proposed_solution"]) > 0
            assert isinstance(idea["expected_contributions"], list)
            assert isinstance(idea["novelty_score"], (int, float))
            assert 0.0 <= idea["novelty_score"] <= 10.0
            assert isinstance(idea["feasibility_score"], (int, float))
            assert 0.0 <= idea["feasibility_score"] <= 10.0
            assert idea["risk_level"] in ("low", "medium", "high")

    def test_generate_ideas_default_field(self, client):
        """When research_field is empty in request, falls back to project target_field."""
        project_id = _create_project(client)

        response = client.post(
            f"/projects/{project_id}/ideas/generate",
            json={},
        )
        assert response.status_code == 201
        ideas = response.json()
        assert len(ideas) > 0

    def test_generate_ideas_nonexistent_project(self, client):
        response = client.post(
            "/projects/99999/ideas/generate",
            json={"research_field": "AI"},
        )
        assert response.status_code == 404


class TestListIdeas:
    """GET /projects/{project_id}/ideas"""

    def test_list_empty(self, client):
        project_id = _create_project(client)
        response = client.get(f"/projects/{project_id}/ideas")
        assert response.status_code == 200
        assert response.json() == []

    def test_list_after_generation(self, client):
        project_id = _create_project(client)

        # Generate ideas
        client.post(
            f"/projects/{project_id}/ideas/generate",
            json={"research_field": "NLP"},
        )

        # List them
        response = client.get(f"/projects/{project_id}/ideas")
        assert response.status_code == 200
        ideas = response.json()
        assert len(ideas) > 0
        for idea in ideas:
            assert idea["project_id"] == project_id

    def test_list_ideas_nonexistent_project(self, client):
        response = client.get("/projects/99999/ideas")
        assert response.status_code == 404
