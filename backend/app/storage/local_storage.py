import os
import uuid

from app.config import settings
from app.storage.base import BaseStorage


class LocalStorage(BaseStorage):
    """Filesystem-based storage that saves files under ``STORAGE_PATH``.

    The storage directory is created automatically on first use if it does not
    already exist.  Each saved file receives a unique name (UUID prefix) to
    avoid collisions while preserving the original extension.
    """

    def __init__(self, storage_path: str | None = None) -> None:
        self._storage_path = storage_path or settings.STORAGE_PATH
        os.makedirs(self._storage_path, exist_ok=True)

    @property
    def storage_path(self) -> str:
        """Return the root directory used for file storage."""
        return self._storage_path

    def save(self, file_name: str, file_content: bytes) -> str:
        """Save *file_content* to disk and return the absolute file path.

        A UUID4 prefix is prepended to *file_name* to guarantee uniqueness
        across concurrent uploads.

        Args:
            file_name: Original name of the file (used to preserve the
                extension).
            file_content: Raw bytes to persist.

        Returns:
            The absolute path of the saved file.
        """
        unique_name = f"{uuid.uuid4().hex}_{file_name}"
        file_path = os.path.join(self._storage_path, unique_name)
        with open(file_path, "wb") as fh:
            fh.write(file_content)
        return file_path

    def load(self, path: str) -> bytes:
        """Read and return the raw bytes stored at *path*.

        Args:
            path: Absolute path previously returned by ``save``.

        Returns:
            Raw bytes of the file.

        Raises:
            FileNotFoundError: If *path* does not exist.
        """
        if not os.path.isfile(path):
            raise FileNotFoundError(f"No file found at path: {path}")
        with open(path, "rb") as fh:
            return fh.read()

    def delete(self, path: str) -> bool:
        """Remove the file at *path* from disk.

        Args:
            path: Absolute path previously returned by ``save``.

        Returns:
            ``True`` if the file was deleted, ``False`` if it did not exist.
        """
        if not os.path.isfile(path):
            return False
        os.remove(path)
        return True
