"""Parser for experiment result files (CSV, JSON, XLSX)."""

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
        lower = file_name.lower()
        if lower.endswith(".json"):
            return self._parse_json(file_content)
        elif lower.endswith(".csv"):
            return self._parse_csv(file_content)
        elif lower.endswith(".xlsx") or lower.endswith(".xls"):
            return self._parse_xlsx(file_content)
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

    def _parse_xlsx(self, content: bytes) -> dict:
        """Parse XLSX/XLS files using openpyxl."""
        try:
            from openpyxl import load_workbook
            wb = load_workbook(filename=io.BytesIO(content), read_only=True, data_only=True)
            rows = []
            for sheet in wb.worksheets:
                sheet_rows = list(sheet.iter_rows(values_only=True))
                if not sheet_rows:
                    continue
                # Use first row as headers
                headers = [str(h) if h is not None else f"col_{i}" for i, h in enumerate(sheet_rows[0])]
                for row in sheet_rows[1:]:
                    record = {}
                    for i, cell in enumerate(row):
                        key = headers[i] if i < len(headers) else f"col_{i}"
                        value = cell
                        # Convert non-serializable types to string
                        if value is not None and not isinstance(value, (int, float, str, bool)):
                            value = str(value)
                        record[key] = value
                    rows.append(record)
            wb.close()
            return {"raw_data": rows}
        except ImportError:
            return {"raw_data": [], "error": "openpyxl not installed, cannot parse XLSX files"}
        except Exception:
            return {"raw_data": []}

    def _parse_text(self, content: bytes) -> dict:
        try:
            text = content.decode("utf-8")
            lines = [line.strip() for line in text.splitlines() if line.strip()]
            return {"raw_data": [{"line": line} for line in lines]}
        except UnicodeDecodeError:
            return {"raw_data": []}
