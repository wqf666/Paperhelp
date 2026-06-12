"""Tests for the /projects endpoints."""

import pytest


class TestCreateProject:
    """POST /projects/"""

    def test_create_project_minimal(self, client):
        response = client.post("/projects/", json={"name": "Test Project"})
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test Project"
        assert data["description"] == ""
        assert data["target_field"] == ""
        assert data["target_venue"] == ""
        assert data["paper_count"] == 0
        assert data["idea_count"] == 0
        assert "id" in data
        assert "created_at" in data

    def test_create_project_full(self, client):
        payload = {
            "name": "NLP Research",
            "description": "Research on natural language processing",
            "target_field": "NLP",
            "target_venue": "ACL 2025",
        }
        response = client.post("/projects/", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "NLP Research"
        assert data["description"] == "Research on natural language processing"
        assert data["target_field"] == "NLP"
        assert data["target_venue"] == "ACL 2025"


class TestListProjects:
    """GET /projects/"""

    def test_list_empty(self, client):
        response = client.get("/projects/")
        assert response.status_code == 200
        assert response.json() == []

    def test_list_multiple_projects(self, client):
        client.post("/projects/", json={"name": "Project Alpha"})
        client.post("/projects/", json={"name": "Project Beta"})
        client.post("/projects/", json={"name": "Project Gamma"})

        response = client.get("/projects/")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3
        names = {p["name"] for p in data}
        assert names == {"Project Alpha", "Project Beta", "Project Gamma"}

    def test_list_with_pagination(self, client):
        for i in range(5):
            client.post("/projects/", json={"name": f"Project {i}"})

        response = client.get("/projects/?skip=2&limit=2")
        assert response.status_code == 200
        assert len(response.json()) == 2


class TestGetProject:
    """GET /projects/{project_id}"""

    def test_get_existing_project(self, client):
        create_resp = client.post("/projects/", json={"name": "My Project"})
        project_id = create_resp.json()["id"]

        response = client.get(f"/projects/{project_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == project_id
        assert data["name"] == "My Project"
        assert data["paper_count"] == 0
        assert data["idea_count"] == 0

    def test_get_nonexistent_project_returns_404(self, client):
        response = client.get("/projects/99999")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_get_project_with_papers_count(self, client):
        """Project detail should include accurate paper and idea counts."""
        proj_resp = client.post("/projects/", json={"name": "Counts Test"})
        project_id = proj_resp.json()["id"]

        # Add two papers
        client.post(f"/projects/{project_id}/papers", json={"title": "Paper 1"})
        client.post(f"/projects/{project_id}/papers", json={"title": "Paper 2"})

        response = client.get(f"/projects/{project_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["paper_count"] == 2
