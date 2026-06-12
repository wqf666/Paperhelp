from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class ParsedPaper:
    """Structured representation of a parsed research paper."""

    title: str
    abstract: str
    sections: dict[str, str] = field(default_factory=dict)
    full_text: str = ""
    references: list[str] = field(default_factory=list)


class BaseParser(ABC):
    """Abstract base class for paper parsers.

    All parser implementations must inherit from this class and implement
    the ``parse`` method, which extracts structured information from a
    research paper file and returns a ``ParsedPaper`` dataclass instance.
    """

    @abstractmethod
    def parse(self, file_path: str) -> ParsedPaper:
        """Parse a research paper file and return structured content.

        Args:
            file_path: Absolute or relative path to the paper file on disk.

        Returns:
            A ``ParsedPaper`` instance containing the extracted title,
            abstract, section mapping, full text, and reference list.

        Raises:
            FileNotFoundError: If *file_path* does not exist.
            ValueError: If the file format is unsupported or the content
                cannot be parsed.
        """
        raise NotImplementedError
