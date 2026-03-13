from pydantic import BaseModel
from typing import List
from models.enums import PaymentStatus

class BatchReviewRequest(BaseModel):
    payment_ids: List[int]
    status: PaymentStatus
    notes: str | None = None

class BatchDeleteRequest(BaseModel):
    payment_ids: List[int]
