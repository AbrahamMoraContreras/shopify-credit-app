from pydantic import BaseModel
from datetime import datetime

class HistoryBase(BaseModel):
    credit_id: int
    event: str
    description: str | None = None

class HistoryCreate(HistoryBase):
    pass

class HistoryResponse(HistoryBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
