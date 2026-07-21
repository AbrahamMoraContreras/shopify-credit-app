import sys
import uuid
import decimal
sys.path.append('src')

from db.session import SessionLocal
from crud.customer import list_customers
from schemas.customer import CustomerResponse

db = SessionLocal()

# We know the merchant_id of the mock from hit_local.py or test_crash.py
# Let's find the customer we created
from models.customer import Customer
c = db.query(Customer).filter(Customer.shopify_customer_id == 9731733913916).first()
if c:
    print("Found Customer ID:", c.id)
    items, total = list_customers(db, str(c.merchant_id), shopify_customer_id=9731733913916)
    for item in items:
        try:
            res = CustomerResponse.model_validate(item)
            print("OK:", res.id)
        except Exception as e:
            print("VALIDATION ERROR on CustomerResponse:")
            print(e)
            
    # Now test CreditResponse
    from crud.credit import list_credits
    from schemas.credit import CreditResponse
    credits = list_credits(db, str(c.merchant_id), customer_id=c.id)
    for cr in credits:
        try:
            res = CreditResponse.model_validate(cr)
            print("CREDIT OK:", res.id)
        except Exception as e:
            print("VALIDATION ERROR on CreditResponse:")
            print(e)

else:
    print("Customer not found")
