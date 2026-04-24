import uuid
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict
from decimal import Decimal



# ------------------------------------------
# Base schema (shared input fields)
# ------------------------------------------
class CustomerBase(BaseModel):
    full_name: str = Field(..., example="María Pérez")
    email: Optional[str] = Field(None, example="maria@example.com")
    shopify_customer_id: Optional[int] = Field(None, example=1234567890)

# ------------------------------------------
# Create schema (extends Base)
# ------------------------------------------
class CustomerCreate(CustomerBase):
    # Merchant_id se inserta desde el backend
    merchant_id: Optional[uuid.UUID] = None

# ------------------------------------------
# Update schema
# ------------------------------------------
class CustomerUpdate(BaseModel):
    full_name: Optional[str] = None

# ------------------------------------------
# Response schema
# ------------------------------------------
class CustomerResponse(CustomerBase):
    id: int
    merchant_id: uuid.UUID
    favorable_balance: Decimal
    punctuality_score: Optional[Decimal] = None
    reputation: Optional[str] = None

    model_config = {
        "from_attributes": True
    }
