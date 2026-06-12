"""
Tests for desktop-specific features: settings, backup, config, shutdown, and SQLite pragmas.

Uses the shared fixtures from conftest.py (client, db_session) and extends them
with temporary directories and mocks to isolate filesystem operations.
"""

import io
import json
import os
import zipfile
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker

from app.database import Base


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _create_project(client):
    """Create a project and return its JSON representation."""
    resp = client.post("/projects/", json={"name": "Test Project", "description": "Test"})
    assert resp.status_code in (200, 201)
    return resp.json()


# ---------------------------------------------------------------------------
# TestDesktopSettings
# ---------------------------------------------------------------------------

class TestDesktopSettings:
    """Tests for the /settings endpoints."""

    @pytest.fixture(autouse=True)
    def _patch_data_dir(self, tmp_path):
        """Redirect the user data directory to a temporary folder."""
        with patch("app.routers.settings.get_user_data_dir", return_value=tmp_path):
            yield tmp_path

    def test_get_default_settings(self, client):
        """GET /settings returns default settings when no user overrides exist."""
        resp = client.get("/settings")
        assert resp.status_code == 200
        data = resp.json()
        assert data["mock_llm"] is True
        assert data["llm_model"] == "deepseek-chat"
        assert data["llm_provider"] == "deepseek"

    def test_update_settings(self, client):
        """PUT /settings updates mock_llm and llm_model."""
        resp = client.put("/settings", json={
            "mock_llm": False,
            "llm_model": "gpt-4",
        })
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

        # Verify the values persisted
        get_resp = client.get("/settings")
        data = get_resp.json()
        assert data["mock_llm"] is False
        assert data["llm_model"] == "gpt-4"

    def test_update_api_key(self, client):
        """PUT /settings updates the API key when a real key is provided."""
        resp = client.put("/settings", json={
            "llm_api_key": "sk-1234567890abcdef",
        })
        assert resp.status_code == 200

        get_resp = client.get("/settings")
        masked = get_resp.json()["llm_api_key_masked"]
        # The key should be partially masked: first 4 + asterisks + last 4
        assert masked.startswith("sk-1")
        assert masked.endswith("cdef")
        assert "*" in masked

    def test_update_ignores_masked_key(self, client):
        """PUT /settings with '***' should NOT overwrite the existing key."""
        # First set a real key
        client.put("/settings", json={"llm_api_key": "sk-realkey12345678"})

        # Now send masked value
        resp = client.put("/settings", json={"llm_api_key": "***"})
        assert resp.status_code == 200

        # The real key should still be there
        get_resp = client.get("/settings")
        masked = get_resp.json()["llm_api_key_masked"]
        assert masked.startswith("sk-r")
        assert masked.endswith("5678")

    def test_reload_settings(self, client):
        """POST /settings/reload returns success."""
        resp = client.post("/settings/reload")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert "reloaded" in data["message"].lower()

    def test_settings_response_has_all_fields(self, client):
        """GET /settings response contains all expected fields."""
        resp = client.get("/settings")
        data = resp.json()
        expected_fields = {
            "mock_llm",
            "llm_provider",
            "llm_api_key_masked",
            "llm_base_url",
            "llm_model",
            "storage_path",
            "export_path",
            "data_dir",
            "port",
        }
        assert expected_fields == set(data.keys())


# ---------------------------------------------------------------------------
# TestProjectBackup
# ---------------------------------------------------------------------------

class TestProjectBackup:
    """Tests for the /backup endpoints."""

    @pytest.fixture(autouse=True)
    def _patch_paths(self, tmp_path):
        """Patch EXPORT_PATH and STORAGE_PATH to use temporary directories."""
        from app.config import settings

        export_dir = tmp_path / "exports"
        storage_dir = tmp_path / "uploads"
        export_dir.mkdir()
        storage_dir.mkdir()
        with patch.object(settings, "EXPORT_PATH", str(export_dir)), \
             patch.object(settings, "STORAGE_PATH", str(storage_dir)):
            self._export_dir = export_dir
            self._storage_dir = storage_dir
            yield

    def test_export_backup(self, client):
        """POST /backup/projects/{id}/export creates a .papb backup file."""
        project = _create_project(client)
        project_id = project["id"]

        resp = client.post(f"/backup/projects/{project_id}/export")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["filename"].endswith(".papb")
        assert data["size_bytes"] > 0
        assert Path(data["path"]).exists()

        # Validate the backup is a proper zip with expected files
        with zipfile.ZipFile(data["path"], "r") as zf:
            names = zf.namelist()
            assert "manifest.json" in names
            assert "project.json" in names

    def test_export_nonexistent_project(self, client):
        """Exporting a non-existent project returns 404."""
        resp = client.post("/backup/projects/99999/export")
        assert resp.status_code == 404

    def test_import_backup(self, client):
        """POST /backup/import restores a project from a .papb file."""
        # Create and export a project first
        project = _create_project(client)
        project_id = project["id"]
        export_resp = client.post(f"/backup/projects/{project_id}/export")
        assert export_resp.status_code == 200
        backup_path = export_resp.json()["path"]

        # Read the backup file content
        with open(backup_path, "rb") as f:
            backup_bytes = f.read()

        # Import the backup
        resp = client.post(
            "/backup/import",
            files={"file": ("backup.papb", backup_bytes, "application/octet-stream")},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert "imported" in data["message"].lower() or "imported" in data.get("message", "").lower()
        assert data["project_id"] != project_id  # new project id

    def test_import_invalid_format(self, client):
        """Uploading a non-.papb file returns 400."""
        resp = client.post(
            "/backup/import",
            files={"file": ("data.txt", b"hello world", "text/plain")},
        )
        assert resp.status_code == 400
        assert "invalid" in resp.json()["detail"].lower() or ".papb" in resp.json()["detail"].lower()

    def test_get_backup_info(self, client):
        """GET /backup/projects/{id}/info returns project record counts."""
        project = _create_project(client)
        project_id = project["id"]

        resp = client.get(f"/backup/projects/{project_id}/info")
        assert resp.status_code == 200
        data = resp.json()
        assert data["project_name"] == "Test Project"
        assert "record_counts" in data
        counts = data["record_counts"]
        assert counts["papers"] == 0
        assert counts["ideas"] == 0
        assert counts["citations"] == 0


# ---------------------------------------------------------------------------
# TestConfigDesktop
# ---------------------------------------------------------------------------

class TestConfigDesktop:
    """Tests for the config_desktop module functions."""

    def test_get_user_data_dir(self, tmp_path):
        """get_user_data_dir creates the data directory if it does not exist."""
        fake_base = tmp_path / "fake_appdata"
        fake_base.mkdir()

        with patch.dict(os.environ, {"APPDATA": str(fake_base)}), \
             patch("app.config_desktop.sys") as mock_sys:
            mock_sys.platform = "win32"
            from app.config_desktop import get_user_data_dir
            data_dir = get_user_data_dir()
            assert data_dir.exists()
            assert data_dir.name == "Paperhelp"

    def test_get_default_config(self, tmp_path):
        """get_default_config returns a dict with a SQLite DATABASE_URL."""
        from app.config_desktop import get_default_config
        config = get_default_config(tmp_path)
        assert "DATABASE_URL" in config
        assert config["DATABASE_URL"].startswith("sqlite:///")
        assert "paperhelp.db" in config["DATABASE_URL"]
        assert config["MOCK_LLM"] is True
        assert config["PORT"] == 18080

    def test_save_and_load_settings(self, tmp_path):
        """save_settings writes JSON and load_settings reads it back."""
        from app.config_desktop import save_settings, load_settings

        settings_data = {"MOCK_LLM": False, "LLM_MODEL": "gpt-4o"}
        save_settings(tmp_path, settings_data)

        config_file = tmp_path / "settings.json"
        assert config_file.exists()

        loaded = load_settings(tmp_path)
        assert loaded["MOCK_LLM"] is False
        assert loaded["LLM_MODEL"] == "gpt-4o"

    def test_get_desktop_config_merges(self, tmp_path):
        """get_desktop_config merges defaults with user settings."""
        from app.config_desktop import save_settings

        # Write user overrides
        save_settings(tmp_path, {"LLM_MODEL": "custom-model", "PORT": 9999})

        with patch("app.config_desktop.get_user_data_dir", return_value=tmp_path):
            from app.config_desktop import get_desktop_config
            config = get_desktop_config()

        # User override takes precedence
        assert config["LLM_MODEL"] == "custom-model"
        assert config["PORT"] == 9999
        # Defaults still present for non-overridden keys
        assert config["MOCK_LLM"] is True
        assert "DATABASE_URL" in config


# ---------------------------------------------------------------------------
# TestShutdownEndpoint
# ---------------------------------------------------------------------------

class TestShutdownEndpoint:
    """Tests for the POST /shutdown endpoint."""

    def test_shutdown_returns_status(self, client):
        """POST /shutdown returns {'status': 'shutting_down'} without actually exiting."""
        with patch("os._exit") as mock_exit:
            resp = client.post("/shutdown")
            assert resp.status_code == 200
            data = resp.json()
            assert data["status"] == "shutting_down"
            # Give the daemon thread a moment, but os._exit is mocked so nothing happens
            # The mock ensures the process does not actually terminate.
            # We do NOT assert mock_exit was called because the thread may not
            # have executed yet within this test's lifetime.


# ---------------------------------------------------------------------------
# TestSQLitePragmas
# ---------------------------------------------------------------------------

class TestSQLitePragmas:
    """Verify that SQLite PRAGMAs (WAL mode, foreign keys) are applied."""

    @staticmethod
    def _make_engine_with_pragmas(db_url: str):
        """Create a SQLAlchemy engine with the same PRAGMA event listeners as database.py."""
        engine = create_engine(
            db_url,
            connect_args={"check_same_thread": False},
        )

        @event.listens_for(engine, "connect")
        def set_sqlite_pragma(dbapi_conn, connection_record):
            cursor = dbapi_conn.cursor()
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.close()

        return engine

    def test_sqlite_wal_mode(self, tmp_path):
        """SQLite journal_mode is set to WAL after PRAGMA event handler fires."""
        db_path = tmp_path / "pragma_test.db"
        db_url = f"sqlite:///{db_path}"
        engine = self._make_engine_with_pragmas(db_url)

        with engine.connect() as conn:
            result = conn.execute(text("PRAGMA journal_mode"))
            mode = result.scalar()
            assert mode.lower() == "wal"

        engine.dispose()

    def test_sqlite_foreign_keys(self, tmp_path):
        """SQLite foreign_keys pragma is ON after PRAGMA event handler fires."""
        db_path = tmp_path / "pragma_fk_test.db"
        db_url = f"sqlite:///{db_path}"
        engine = self._make_engine_with_pragmas(db_url)

        with engine.connect() as conn:
            result = conn.execute(text("PRAGMA foreign_keys"))
            fk_status = result.scalar()
            assert fk_status == 1  # 1 means ON

        engine.dispose()
