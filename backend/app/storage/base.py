from abc import ABC, abstractmethod


class BaseStorage(ABC):
    """Abstract base class for file storage backends.

    Implementations are responsible for persisting uploaded files (e.g. PDFs,
    DOCX) and returning a retrievable path or identifier.
    """

    @abstractmethod
    def save(self, file_name: str, file_content: bytes) -> str:
        """Persist file content and return a storage path.

        Args:
            file_name: Original name of the file being saved.
            file_content: Raw bytes of the file.

        Returns:
            A string path or identifier that can later be passed to ``load``
            or ``delete`` to retrieve or remove the file.

        Raises:
            OSError: If the underlying storage medium is unavailable.
        """
        raise NotImplementedError

    @abstractmethod
    def load(self, path: str) -> bytes:
        """Load and return the raw bytes of a previously saved file.

        Args:
            path: The path or identifier returned by ``save``.

        Returns:
            The raw bytes of the stored file.

        Raises:
            FileNotFoundError: If no file exists at the given *path*.
        """
        raise NotImplementedError

    @abstractmethod
    def delete(self, path: str) -> bool:
        """Delete a previously saved file.

        Args:
            path: The path or identifier returned by ``save``.

        Returns:
            ``True`` if the file was successfully deleted, ``False`` otherwise.
        """
        raise NotImplementedError
