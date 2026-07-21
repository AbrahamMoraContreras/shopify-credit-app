import sys
import uuid
import decimal
from datetime import datetime
sys.path.append('src')
from fastapi.testclient import TestClient
from main import app
from db.base import Base
from db.session import SessionLocal, engine
from models.customer import Customer
from models.merchant import Merchant

# Setup DB
Base.metadata.create_all(bind=engine)
db = SessionLocal()

# Create dummy merchant
m = db.query(Merchant).first()
if not m:
    m = Merchant(id=uuid.uuid4(), shop_domain="test.myshopify.com")
    db.add(m)
    db.commit()

# Create dummy customer
c = db.query(Customer).first()
if not c:
    c = Customer(
        merchant_id=m.id,
        full_name="Test Customer",
        shopify_customer_id=9731733913916,
        favorable_balance=decimal.Decimal("0.00")
    )
    db.add(c)
    db.commit()

client = TestClient(app)

# Login
r1 = client.post('/api/merchants/register', json={'shop_domain': m.shop_domain}, headers={'X-Internal-Secret':'adiel2001'})
token = r1.json().get('access_token')

r2 = client.get('/api/customers?shopify_customer_id=9731733913916', headers={'Authorization': f'Bearer {token}'})
print("STATUS:", r2.status_code)
print("RESPONSE:", r2.json())
