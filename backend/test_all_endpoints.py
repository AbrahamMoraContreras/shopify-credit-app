import requests
import json

# 1. Get token
r1 = requests.post(
    'https://shopify-credit-app-backend.onrender.com/api/merchants/register',
    json={'shop_domain':'opentech-credit-app-test.myshopify.com'},
    headers={'X-Internal-Secret':'adiel2001'},
    timeout=30
)
print('Register:', r1.status_code)
if r1.status_code != 200:
    print('Register body:', r1.text)
    exit(1)

token = r1.json()['access_token']

# 2. Test Dashboard 
r2 = requests.get(
    'https://shopify-credit-app-backend.onrender.com/api/dashboard',
    headers={'Authorization': f'Bearer {token}'},
    timeout=30
)
print('Dashboard:', r2.status_code)

# 3. Test Credits
r3 = requests.get(
    'https://shopify-credit-app-backend.onrender.com/api/credits',
    headers={'Authorization': f'Bearer {token}'},
    timeout=30
)
print('Credits:', r3.status_code)
if r3.status_code != 200:
    print('Credits body:', r3.text[:500])

# 4. Test Payments
r4 = requests.get(
    'https://shopify-credit-app-backend.onrender.com/api/payments',
    headers={'Authorization': f'Bearer {token}'},
    timeout=30
)
print('Payments:', r4.status_code)
if r4.status_code != 200:
    print('Payments body:', r4.text[:500])

# 5. Test Payments debug endpoint (if exists)
try:
    r5 = requests.get(
        'https://shopify-credit-app-backend.onrender.com/api/payments/debug',
        headers={'Authorization': f'Bearer {token}'},
        timeout=30
    )
    print('Payments Debug:', r5.status_code)
    print('Payments Debug body:', r5.text[:500])
except Exception as e:
    print('Debug failed:', e)
