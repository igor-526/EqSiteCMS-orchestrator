"""Application-layer commands (input DTOs for use cases).

Commands represent the intent of a caller. They are immutable,
fully typed, and validated by Pydantic before reaching any service.

Naming convention: <Verb><Entity>Command
  - CreateRequestCommand  — создать новый Request
  - UpdateRequestCommand  — обновить Request
  - DeleteRequestCommand  — удалить Request
"""

import uuid
from typing import Any

from pydantic import BaseModel, Field


class CreateRequestCommand(BaseModel):
    """Command to create a new Request.

    Passed from the API layer into Service.create_request().
    Validated by Pydantic before the service is called.
    """

    id: uuid.UUID = Field(..., description="Client-generated idempotency UUID")
    user_id: uuid.UUID = Field(..., description="UUID of the user who owns the request")
    payload: dict[str, Any] = Field(..., description="Arbitrary request payload")
