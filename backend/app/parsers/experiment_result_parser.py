"""Parser for experiment result files (CSV, JSON, etc.)."""

import json
import csv
import io


class ExperimentResultParser:
    """Parses experiment result files into structured data."""

    def parse(self, file_content: bytes, file_name: str) -> dict:
        """Parse experiment result file content.

        Args:
            file_content: Raw bytes of the uploaded file.
            file_name: Original file name (used to determine format).

        Returns:
            Dictionary with a ``raw_data`` key containing parsed results.
        """
        if file_name.endswith(".json"):
            return self._parse_json(file_content)
        elif file_name.endswith(".csv"):
            return self._parse_csv(file_content)
        else:
            return self._parse_text(file_content)

    def _parse_json(self, content: bytes) -> dict:
        try:
            data = json.loads(content.decode("utf-8"))
            if isinstance(data, list):
                return {"raw_data": data}
            elif isinstance(data, dict):
                return {"raw_data": [data]}
            return {"raw_data": [{"value": data}]}
        except (json.JSONDecodeError, UnicodeDecodeError):
            return {"raw_data": []}

    def _parse_csv(self, content: bytes) -> dict:
        try:
            text = content.decode("utf-8")
            reader = csv.DictReader(io.StringIO(text))
            rows = list(reader)
            return {"raw_data": rows}
        except (UnicodeDecodeError, csv.Error):
            return {"raw_data": []}

    def _parse_text(self, content: bytes) -> dict:
        try:
            text = content.decode("utf-8")
            lines = [line.strip() for line in text.splitlines() if line.strip()]
            return {"raw_data": [{"line": line} for line in lines]}
        except UnicodeDecodeError:
            return {"raw_data": []}
