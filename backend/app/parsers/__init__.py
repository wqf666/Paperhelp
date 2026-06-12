import logging
from app.parsers.base import BaseParser
from app.parsers.mock_parser import MockParser

logger = logging.getLogger(__name__)

class ParserFactory:
    @staticmethod
    def get_parser(file_path: str = "") -> BaseParser:
        if file_path.lower().endswith(".pdf"):
            try:
                from app.parsers.pymupdf_parser import PyMuPDFParser
                return PyMuPDFParser()
            except ImportError:
                logger.warning("PyMuPDF not installed, falling back to MockParser")
                return MockParser()
            except Exception as e:
                logger.error(f"PDF parser init failed: {e}, falling back to MockParser")
                return MockParser()
        return MockParser()
