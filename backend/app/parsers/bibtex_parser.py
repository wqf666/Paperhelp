"""Lightweight BibTeX parser and serializer. No external dependencies."""

import re
from typing import Optional


class BibTeXParser:
    """Parse BibTeX text into structured entries and serialize back."""

    # Match @type{key, ... } blocks
    _ENTRY_RE = re.compile(
        r"@(\w+)\s*\{\s*([^,]+?)\s*,(.*?)\n\}",
        re.DOTALL | re.IGNORECASE,
    )
    # Match field = {value} or field = "value" or field = number
    _FIELD_RE = re.compile(
        r"(\w+)\s*=\s*(?:\{((?:[^{}]|\{[^{}]*\})*)\}|\"([^\"]*)\"|(\d+))",
        re.DOTALL,
    )

    def parse(self, bibtex_text: str) -> list[dict]:
        """Parse BibTeX text into a list of entry dicts.
        
        Each dict contains:
        - entry_type: str (article, inproceedings, etc.)
        - cite_key: str
        - fields: dict of all parsed fields
        - raw_bibtex: str (the original entry text)
        """
        entries = []
        if not bibtex_text or not bibtex_text.strip():
            return entries

        for match in self._ENTRY_RE.finditer(bibtex_text):
            entry_type = match.group(1).lower()
            cite_key = match.group(2).strip()
            body = match.group(3)
            raw = match.group(0)

            fields = {}
            for field_match in self._FIELD_RE.finditer(body):
                field_name = field_match.group(1).lower()
                # Value is in group 2 (braces), 3 (quotes), or 4 (number)
                value = (
                    field_match.group(2)
                    if field_match.group(2) is not None
                    else field_match.group(3)
                    if field_match.group(3) is not None
                    else field_match.group(4)
                    if field_match.group(4) is not None
                    else ""
                )
                fields[field_name] = value.strip()

            entries.append({
                "entry_type": entry_type,
                "cite_key": cite_key,
                "fields": fields,
                "raw_bibtex": raw,
            })

        return entries

    def entry_to_citation_data(self, entry: dict) -> dict:
        """Convert a parsed BibTeX entry to Citation model-compatible data."""
        fields = entry.get("fields", {})
        
        # Extract standard fields
        title = fields.get("title", "")
        authors = fields.get("author", "")
        year_str = fields.get("year", "")
        year = None
        if year_str:
            # Extract 4-digit year
            year_match = re.search(r"\d{4}", year_str)
            if year_match:
                year = int(year_match.group())

        venue = fields.get("journal", "") or fields.get("booktitle", "") or ""
        doi = fields.get("doi", "")
        url = fields.get("url", "")
        abstract = fields.get("abstract", "")

        # Collect non-standard fields into extra_fields
        standard_keys = {
            "title", "author", "year", "journal", "booktitle",
            "doi", "url", "abstract",
        }
        extra_fields = {k: v for k, v in fields.items() if k not in standard_keys}

        return {
            "cite_key": entry.get("cite_key", ""),
            "entry_type": entry.get("entry_type", "article"),
            "title": title,
            "authors": authors,
            "year": year,
            "venue": venue,
            "doi": doi,
            "url": url,
            "abstract": abstract,
            "extra_fields": extra_fields,
            "raw_bibtex": entry.get("raw_bibtex", ""),
            "source": "imported",
        }

    def serialize(self, citations: list) -> str:
        """Serialize a list of Citation-like objects to BibTeX format.
        
        Each citation should have: cite_key, entry_type, title, authors,
        year, venue, doi, url, abstract, extra_fields (dict).
        """
        entries = []
        for c in citations:
            # Handle both dict and ORM objects
            if hasattr(c, "cite_key"):
                # ORM object
                cite_key = c.cite_key
                entry_type = c.entry_type or "article"
                fields = self._build_fields_dict(c)
            elif isinstance(c, dict):
                cite_key = c.get("cite_key", "unknown")
                entry_type = c.get("entry_type", "article")
                fields = self._build_fields_from_dict(c)
            else:
                continue

            # Build BibTeX entry
            lines = [f"@{entry_type}{{{cite_key},"]
            for key, value in fields.items():
                if value:
                    lines.append(f"  {key} = {{{value}}},")
            lines.append("}")
            entries.append("\n".join(lines))

        return "\n\n".join(entries) + "\n" if entries else ""

    def _build_fields_dict(self, c) -> dict:
        """Build fields dict from ORM Citation object."""
        fields = {}
        if c.title:
            fields["title"] = c.title
        if c.authors:
            fields["author"] = c.authors
        if c.year:
            fields["year"] = str(c.year)
        if c.venue:
            # Determine if it's a journal or conference
            if c.entry_type in ("inproceedings", "conference"):
                fields["booktitle"] = c.venue
            else:
                fields["journal"] = c.venue
        if c.doi:
            fields["doi"] = c.doi
        if c.url:
            fields["url"] = c.url
        if c.abstract:
            fields["abstract"] = c.abstract
        # Add extra fields
        extra = c.extra_fields if isinstance(c.extra_fields, dict) else {}
        fields.update(extra)
        return fields

    def _build_fields_from_dict(self, c: dict) -> dict:
        """Build fields dict from dict."""
        fields = {}
        if c.get("title"):
            fields["title"] = c["title"]
        if c.get("authors"):
            fields["author"] = c["authors"]
        if c.get("year"):
            fields["year"] = str(c["year"])
        if c.get("venue"):
            entry_type = c.get("entry_type", "article")
            if entry_type in ("inproceedings", "conference"):
                fields["booktitle"] = c["venue"]
            else:
                fields["journal"] = c["venue"]
        if c.get("doi"):
            fields["doi"] = c["doi"]
        if c.get("url"):
            fields["url"] = c["url"]
        if c.get("abstract"):
            fields["abstract"] = c["abstract"]
        extra = c.get("extra_fields", {})
        if isinstance(extra, dict):
            fields.update(extra)
        return fields

    def validate(self, entry: dict) -> list[str]:
        """Validate a BibTeX entry dict, return list of warning messages."""
        warnings = []
        fields = entry.get("fields", {})
        if not entry.get("cite_key"):
            warnings.append("Missing cite_key")
        if not fields.get("title"):
            warnings.append("Missing title")
        if not fields.get("author"):
            warnings.append("Missing author")
        if not fields.get("year"):
            warnings.append("Missing year")
        return warnings
