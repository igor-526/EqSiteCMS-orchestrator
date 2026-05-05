from enum import Enum
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

class TaskStatus(Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

@dataclass
class Task:
    id: str
    description: str
    agent_role: str
    dependencies: List[str] = field(default_factory=list)
    status: TaskStatus = TaskStatus.PENDING
    result: Optional[Any] = None
    context: Dict[str, Any] = field(default_factory=dict)
