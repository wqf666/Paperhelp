from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/refine", tags=["refine"])


class RefineRequest(BaseModel):
    content: str  # Current content to refine (can be plain text or JSON string)
    instruction: str  # User's instruction for how to refine
    content_type: str = "text"  # "idea", "experiment_plan", "manuscript_section", "outline", "text"
    history: list = []  # Previous conversation turns [{role: "user"|"assistant", content: str}]


class RefineResponse(BaseModel):
    refined_content: str
    assistant_message: str


@router.post("", response_model=RefineResponse)
def refine_content(req: RefineRequest):
    from app.config import settings
    from app.services.llm_service import get_llm_service

    llm = get_llm_service(settings)

    # Build context based on content type
    type_labels = {
        "idea": "创新方向",
        "experiment_plan": "实验计划",
        "manuscript_section": "论文章节",
        "outline": "论文大纲",
        "text": "学术内容",
    }
    label = type_labels.get(req.content_type, "内容")

    try:
        result = llm.refine_content(
            content=req.content,
            instruction=req.instruction,
            history=req.history,
        )
        return RefineResponse(
            refined_content=result.get("refined_content", req.content),
            assistant_message=result.get("assistant_message", "已完成调整。"),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"调整失败: {str(e)[:200]}")
