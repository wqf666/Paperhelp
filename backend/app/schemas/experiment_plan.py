from datetime import datetime
from typing import List, Dict, Any, Optional

from pydantic import BaseModel, ConfigDict


class ExperimentPlanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    idea_id: int
    main_experiments: List[Dict[str, Any]] = []
    ablation_studies: List[Dict[str, Any]] = []
    robustness_tests: List[Dict[str, Any]] = []
    efficiency_tests: List[Dict[str, Any]] = []
    datasets: List[str] = []
    metrics: List[str] = []
    baselines: List[str] = []
    risk_and_fallbacks: List[Dict[str, Any]] = []
    created_at: Optional[datetime] = None
