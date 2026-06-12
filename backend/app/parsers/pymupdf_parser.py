"""Real PDF parser using PyMuPDF (fitz)."""
import fitz
from dataclasses import dataclass, field
from app.parsers.base import BaseParser, ParsedPaper

class PyMuPDFParser(BaseParser):
    def parse(self, file_path: str) -> ParsedPaper:
        """Parse a PDF file, extracting text by section and page."""
        doc = fitz.open(file_path)
        # Extract all page texts
        pages_text = []
        for page_num in range(len(doc)):
            page = doc[page_num]
            pages_text.append(page.get_text())
        doc.close()
        
        full_text = "\n\n".join(pages_text)
        
        # Try to extract title from first page (first non-empty line with reasonable length)
        title = ""
        if pages_text:
            for line in pages_text[0].split("\n"):
                stripped = line.strip()
                if stripped and 5 < len(stripped) < 200:
                    title = stripped
                    break
        
        # Try to extract abstract (look for "Abstract" keyword)
        abstract = ""
        abstract_start = full_text.lower().find("abstract")
        if abstract_start >= 0:
            abstract_end = full_text.lower().find("introduction", abstract_start)
            if abstract_end < 0:
                abstract_end = abstract_start + 2000
            abstract = full_text[abstract_start:abstract_end].strip()
            # Remove the "Abstract" keyword itself
            if abstract.lower().startswith("abstract"):
                abstract = abstract[8:].strip()
        
        # Extract sections using heuristic patterns
        import re
        sections = {}
        # Common section patterns: "1. Introduction", "2 Related Work", etc.
        section_pattern = re.compile(r'^\s*(\d+\.?\s+)?([A-Z][A-Za-z\s&]+)$', re.MULTILINE)
        current_section = "Introduction"
        current_text = []
        for line in full_text.split("\n"):
            match = section_pattern.match(line.strip())
            if match and len(line.strip()) < 80:
                if current_text:
                    sections[current_section] = "\n".join(current_text)
                current_section = line.strip()
                current_text = []
            else:
                current_text.append(line)
        if current_text:
            sections[current_section] = "\n".join(current_text)
        
        # Extract references from the end
        references = []
        ref_start = full_text.lower().rfind("references")
        if ref_start >= 0:
            ref_text = full_text[ref_start:]
            for line in ref_text.split("\n"):
                stripped = line.strip()
                if stripped and len(stripped) > 20:
                    references.append(stripped)
        
        return ParsedPaper(
            title=title,
            abstract=abstract,
            sections=sections,
            full_text=full_text,
            references=references[:50]  # cap at 50
        )

    def extract_chunks(self, file_path: str) -> list:
        """Parse PDF and return structured chunks with page info."""
        doc = fitz.open(file_path)
        chunks = []
        chunk_index = 0
        
        import re
        section_pattern = re.compile(r'^\s*(\d+\.?\s+)?([A-Z][A-Za-z\s&]+)$')
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text()
            
            # Split by paragraphs
            paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
            
            current_section = ""
            for para in paragraphs:
                # Check if this paragraph is a section header
                lines = para.split("\n")
                if len(lines) <= 2:
                    for line in lines:
                        if section_pattern.match(line.strip()) and len(line.strip()) < 80:
                            current_section = line.strip()
                
                # Only create chunks for substantial text
                if len(para) > 50:
                    chunk_type = "body"
                    if "abstract" in current_section.lower():
                        chunk_type = "abstract"
                    elif "reference" in current_section.lower() or "bibliography" in current_section.lower():
                        chunk_type = "reference"
                    elif "table" in para[:20].lower():
                        chunk_type = "table"
                    elif "figure" in para[:20].lower():
                        chunk_type = "figure_caption"
                    
                    chunks.append({
                        "chunk_index": chunk_index,
                        "section_title": current_section,
                        "content": para,
                        "start_page": page_num + 1,
                        "end_page": page_num + 1,
                        "chunk_type": chunk_type,
                    })
                    chunk_index += 1
        
        doc.close()
        return chunks
