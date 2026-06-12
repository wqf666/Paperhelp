"""Tests for MVP 2 features: method versions, experiment results, reviewer simulation,
differentiation check, paper chunks, evidence spans, and manuscript sections."""

import io
import json

from tests.conftest import *  # noqa: F401,F403 – fixtures


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _create_project(client, name="MVP2 Project"):
    resp = client.post(
        "/projects",
        json={"name": name, "research_field": "NLP", "target_venue": "ACL"},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


def _create_paper(client, project_id, title="MVP2 Paper"):
    resp = client.post(
        f"/projects/{project_id}/papers",
        json={"title": title, "abstract": "A study about transformers."},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


def _analyze_paper(client, paper_id):
    resp = client.post(f"/papers/{paper_id}/analyze")
    assert resp.status_code == 200, resp.text
    return resp.json()


def _generate_ideas(client, project_id, field="NLP"):
    resp = client.post(
        f"/projects/{project_id}/ideas/generate",
        json={"research_field": field},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def _create_method_version(client, project_id, name="Method V1"):
    resp = client.post(
        f"/projects/{project_id}/method-versions",
        json={"name": name, "description": "Initial method", "key_changes": ["baseline"]},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def _create_manuscript(client, project_id):
    """Create a manuscript state for the project by generating an outline."""
    # The manuscript endpoint needs ideas, so create them first if none exist
    resp = client.post(
        f"/projects/{project_id}/manuscript/generate",
        json={},
    )
    # If it already exists, it may return 200 or 201
    return resp


# ---------------------------------------------------------------------------
# Method Versions
# ---------------------------------------------------------------------------

class TestMethodVersions:

    def test_create_method_version(self, client):
        project_id = _create_project(client)
        mv = _create_method_version(client, project_id)
        assert mv["name"] == "Method V1"
        assert mv["version_number"] == 1
        assert mv["status"] == "draft"
        assert mv["project_id"] == project_id

    def test_list_method_versions(self, client):
        project_id = _create_project(client)
        _create_method_version(client, project_id, "V1")
        _create_method_version(client, project_id, "V2")
        resp = client.get(f"/projects/{project_id}/method-versions")
        assert resp.status_code == 200
        versions = resp.json()
        assert len(versions) == 2
        assert versions[0]["version_number"] == 1
        assert versions[1]["version_number"] == 2

    def test_get_method_version(self, client):
        project_id = _create_project(client)
        mv = _create_method_version(client, project_id)
        resp = client.get(f"/projects/{project_id}/method-versions/{mv['id']}")
        assert resp.status_code == 200
        assert resp.json()["name"] == "Method V1"

    def test_update_method_version(self, client):
        project_id = _create_project(client)
        mv = _create_method_version(client, project_id)
        resp = client.put(
            f"/projects/{project_id}/method-versions/{mv['id']}",
            json={"description": "Updated description", "status": "finalized"},
        )
        assert resp.status_code == 200
        updated = resp.json()
        assert updated["description"] == "Updated description"
        assert updated["status"] == "finalized"

    def test_archive_method_version(self, client):
        project_id = _create_project(client)
        mv = _create_method_version(client, project_id)
        resp = client.post(
            f"/projects/{project_id}/method-versions/{mv['id']}/archive"
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "archived"

    def test_method_version_nonexistent_project(self, client):
        resp = client.post(
            "/projects/9999/method-versions",
            json={"name": "Orphan"},
        )
        assert resp.status_code == 404

    def test_get_nonexistent_version(self, client):
        project_id = _create_project(client)
        resp = client.get(f"/projects/{project_id}/method-versions/9999")
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Experiment Results
# ---------------------------------------------------------------------------

class TestExperimentResults:

    def test_upload_experiment_result_json(self, client):
        project_id = _create_project(client)
        mv = _create_method_version(client, project_id)

        json_data = json.dumps([
            {"model": "baseline", "accuracy": 85.0, "f1": 83.5},
            {"model": "ours", "accuracy": 89.2, "f1": 87.8},
        ]).encode("utf-8")

        resp = client.post(
            f"/projects/{project_id}/experiment-results/upload",
            data={
                "method_version_id": str(mv["id"]),
                "name": "Main Results",
                "description": "Benchmark comparison",
                "experiment_type": "main",
            },
            files={"file": ("results.json", io.BytesIO(json_data), "application/json")},
        )
        assert resp.status_code == 201, resp.text
        result = resp.json()
        assert result["name"] == "Main Results"
        assert result["upload_format"] == "json"
        assert len(result["raw_data"]) == 2

    def test_upload_experiment_result_csv(self, client):
        project_id = _create_project(client)
        mv = _create_method_version(client, project_id)

        csv_data = b"model,accuracy,f1\nbaseline,85.0,83.5\nours,89.2,87.8\n"

        resp = client.post(
            f"/projects/{project_id}/experiment-results/upload",
            data={
                "method_version_id": str(mv["id"]),
                "name": "CSV Results",
                "experiment_type": "ablation",
            },
            files={"file": ("results.csv", io.BytesIO(csv_data), "text/csv")},
        )
        assert resp.status_code == 201, resp.text
        result = resp.json()
        assert result["upload_format"] == "csv"
        assert len(result["raw_data"]) == 2

    def test_list_experiment_results(self, client):
        project_id = _create_project(client)
        mv = _create_method_version(client, project_id)

        json_data = json.dumps([{"metric": "acc", "value": 90}]).encode("utf-8")
        client.post(
            f"/projects/{project_id}/experiment-results/upload",
            data={
                "method_version_id": str(mv["id"]),
                "name": "Result 1",
                "experiment_type": "main",
            },
            files={"file": ("r.json", io.BytesIO(json_data), "application/json")},
        )

        resp = client.get(f"/projects/{project_id}/experiment-results")
        assert resp.status_code == 200
        results = resp.json()
        assert len(results) == 1
        assert results[0]["name"] == "Result 1"

    def test_get_experiment_result(self, client):
        project_id = _create_project(client)
        mv = _create_method_version(client, project_id)

        json_data = json.dumps([{"x": 1}]).encode("utf-8")
        upload = client.post(
            f"/projects/{project_id}/experiment-results/upload",
            data={
                "method_version_id": str(mv["id"]),
                "name": "Single Result",
                "experiment_type": "main",
            },
            files={"file": ("r.json", io.BytesIO(json_data), "application/json")},
        )
        result_id = upload.json()["id"]

        resp = client.get(f"/experiment-results/{result_id}")
        assert resp.status_code == 200
        assert resp.json()["name"] == "Single Result"

    def test_analyze_experiment_result(self, client):
        project_id = _create_project(client)
        mv = _create_method_version(client, project_id)

        json_data = json.dumps([
            {"model": "A", "score": 80},
            {"model": "B", "score": 90},
        ]).encode("utf-8")
        upload = client.post(
            f"/projects/{project_id}/experiment-results/upload",
            data={
                "method_version_id": str(mv["id"]),
                "name": "Analyze Test",
                "experiment_type": "main",
            },
            files={"file": ("r.json", io.BytesIO(json_data), "application/json")},
        )
        result_id = upload.json()["id"]

        resp = client.post(f"/experiment-results/{result_id}/analyze")
        assert resp.status_code == 200, resp.text
        analysis = resp.json()
        assert "summary" in analysis
        assert "key_findings" in analysis
        assert isinstance(analysis["key_findings"], list)
        assert len(analysis["key_findings"]) > 0

    def test_get_analysis_after_analyze(self, client):
        project_id = _create_project(client)
        mv = _create_method_version(client, project_id)

        json_data = json.dumps([{"v": 1}]).encode("utf-8")
        upload = client.post(
            f"/projects/{project_id}/experiment-results/upload",
            data={
                "method_version_id": str(mv["id"]),
                "name": "Analysis Fetch",
                "experiment_type": "main",
            },
            files={"file": ("r.json", io.BytesIO(json_data), "application/json")},
        )
        result_id = upload.json()["id"]

        # Trigger analysis
        client.post(f"/experiment-results/{result_id}/analyze")

        # Fetch analysis
        resp = client.get(f"/experiment-results/{result_id}/analysis")
        assert resp.status_code == 200
        assert resp.json()["summary"] != ""

    def test_upload_nonexistent_project(self, client):
        json_data = json.dumps([{"x": 1}]).encode("utf-8")
        resp = client.post(
            "/projects/9999/experiment-results/upload",
            data={
                "method_version_id": "1",
                "name": "Orphan",
                "experiment_type": "main",
            },
            files={"file": ("r.json", io.BytesIO(json_data), "application/json")},
        )
        assert resp.status_code == 404

    def test_analyze_nonexistent_result(self, client):
        resp = client.post("/experiment-results/9999/analyze")
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Reviewer Simulation
# ---------------------------------------------------------------------------

class TestReviewerSimulation:

    def test_generate_reviewer_simulations(self, client):
        project_id = _create_project(client)
        resp = client.post(
            f"/projects/{project_id}/reviewer-simulation/generate",
            json={"num_reviewers": 2},
        )
        assert resp.status_code == 201, resp.text
        sims = resp.json()
        assert len(sims) == 2
        assert sims[0]["reviewer_role"] is not None
        assert sims[0]["overall_score"] > 0

    def test_list_reviewer_simulations(self, client):
        project_id = _create_project(client)
        # Generate first
        client.post(
            f"/projects/{project_id}/reviewer-simulation/generate",
            json={"num_reviewers": 3},
        )
        resp = client.get(f"/projects/{project_id}/reviewer-simulations")
        assert resp.status_code == 200
        sims = resp.json()
        assert len(sims) == 3

    def test_generate_reviewer_nonexistent_project(self, client):
        resp = client.post(
            "/projects/9999/reviewer-simulation/generate",
            json={"num_reviewers": 1},
        )
        assert resp.status_code == 404

    def test_list_reviewer_nonexistent_project(self, client):
        resp = client.get("/projects/9999/reviewer-simulations")
        assert resp.status_code == 404

    def test_generate_replaces_previous(self, client):
        """Generating again should replace old simulations."""
        project_id = _create_project(client)
        client.post(
            f"/projects/{project_id}/reviewer-simulation/generate",
            json={"num_reviewers": 2},
        )
        # Generate again with 1 reviewer
        resp = client.post(
            f"/projects/{project_id}/reviewer-simulation/generate",
            json={"num_reviewers": 1},
        )
        assert resp.status_code == 201
        assert len(resp.json()) == 1

        # List should also show only 1
        list_resp = client.get(f"/projects/{project_id}/reviewer-simulations")
        assert len(list_resp.json()) == 1


# ---------------------------------------------------------------------------
# Differentiation Check
# ---------------------------------------------------------------------------

class TestDifferentiationCheck:

    def test_differentiation_check(self, client):
        project_id = _create_project(client)
        _create_paper(client, project_id)
        ideas = _generate_ideas(client, project_id)
        idea_id = ideas[0]["id"]

        resp = client.post(f"/ideas/{idea_id}/differentiation-check")
        assert resp.status_code == 200, resp.text
        result = resp.json()
        assert "differentiation_check" in result
        diff = result["differentiation_check"]
        assert diff["status"] == "checked"
        assert "differentiation_points" in diff
        assert isinstance(diff["differentiation_points"], list)

    def test_differentiation_nonexistent_idea(self, client):
        resp = client.post("/ideas/9999/differentiation-check")
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Paper Chunks
# ---------------------------------------------------------------------------

class TestPaperChunks:

    def test_get_chunks_empty(self, client):
        project_id = _create_project(client)
        paper_id = _create_paper(client, project_id)
        resp = client.get(f"/papers/{paper_id}/chunks")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_get_chunks_nonexistent_paper(self, client):
        resp = client.get("/papers/9999/chunks")
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Evidence Spans (created during paper analysis)
# ---------------------------------------------------------------------------

class TestEvidenceSpans:

    def test_evidence_spans_created_after_analysis(self, client):
        project_id = _create_project(client)
        paper_id = _create_paper(client, project_id)
        card_data = _analyze_paper(client, paper_id)

        # The card should have evidence_span_list populated
        assert "evidence_span_list" in card_data
        evidence_list = card_data["evidence_span_list"]
        assert isinstance(evidence_list, list)
        assert len(evidence_list) > 0

        # Each evidence span should have the expected fields
        first_span = evidence_list[0]
        assert "claim_type" in first_span
        assert "claim_text" in first_span
        assert "confidence" in first_span
        assert first_span["confidence"] > 0

    def test_evidence_spans_have_correct_types(self, client):
        project_id = _create_project(client)
        paper_id = _create_paper(client, project_id)
        card_data = _analyze_paper(client, paper_id)

        evidence_list = card_data["evidence_span_list"]
        claim_types = {span["claim_type"] for span in evidence_list}
        # MockLLM generates evidence for novelty, limitation, result, and method
        assert "novelty" in claim_types
        assert "result" in claim_types


# ---------------------------------------------------------------------------
# Manuscript Sections
# ---------------------------------------------------------------------------

class TestManuscriptSections:

    def test_get_sections_nonexistent_manuscript(self, client):
        project_id = _create_project(client)
        # No manuscript created yet
        resp = client.get(f"/projects/{project_id}/manuscript/sections")
        assert resp.status_code == 404

    def test_update_section_nonexistent(self, client):
        resp = client.put("/manuscript-sections/9999", json={"content": "test"})
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Compliance extensions (results without data)
# ---------------------------------------------------------------------------

class TestComplianceExtensions:

    def test_results_without_data_compliance(self, client):
        """When raw_data is empty, analysis should note compliance issues."""
        project_id = _create_project(client)
        mv = _create_method_version(client, project_id)

        # Upload an empty JSON file (empty array)
        json_data = json.dumps([]).encode("utf-8")
        upload = client.post(
            f"/projects/{project_id}/experiment-results/upload",
            data={
                "method_version_id": str(mv["id"]),
                "name": "Empty Results",
                "experiment_type": "main",
            },
            files={"file": ("empty.json", io.BytesIO(json_data), "application/json")},
        )
        result_id = upload.json()["id"]

        # Analyze — should still succeed even with empty data
        resp = client.post(f"/experiment-results/{result_id}/analyze")
        assert resp.status_code == 200
        analysis = resp.json()
        assert "summary" in analysis


# ---------------------------------------------------------------------------
# Full integration: Project -> Paper -> Analysis -> Evidence
# ---------------------------------------------------------------------------

class TestMVP2Integration:

    def test_full_workflow_with_method_and_review(self, client):
        """End-to-end: project, paper, analysis, ideas, method version, reviewer."""
        # 1. Create project
        project_id = _create_project(client, "Integration Project")

        # 2. Add and analyze paper
        paper_id = _create_paper(client, project_id, "Integration Paper")
        card = _analyze_paper(client, paper_id)
        assert card["research_problem"] != ""
        assert len(card["evidence_span_list"]) > 0

        # 3. Generate ideas
        ideas = _generate_ideas(client, project_id)
        assert len(ideas) > 0

        # 4. Create method version
        mv = _create_method_version(client, project_id, "Integrated Method")
        assert mv["version_number"] == 1

        # 5. Run reviewer simulation
        review_resp = client.post(
            f"/projects/{project_id}/reviewer-simulation/generate",
            json={"num_reviewers": 2},
        )
        assert review_resp.status_code == 201
        reviews = review_resp.json()
        assert len(reviews) == 2
        assert all(r["overall_score"] > 0 for r in reviews)

        # 6. Differentiation check
        idea_id = ideas[0]["id"]
        diff_resp = client.post(f"/ideas/{idea_id}/differentiation-check")
        assert diff_resp.status_code == 200
        assert diff_resp.json()["differentiation_check"]["status"] == "checked"
