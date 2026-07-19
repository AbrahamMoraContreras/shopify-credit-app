import requests

r1 = requests.post('http://localhost:8000/api/merchants/register', json={'shop_domain':'opentech-credit-app-test.myshopify.com'}, headers={'X-Internal-Secret':'adiel2001'})
token = r1.json().get('access_token')

# Dashboard
r2 = requests.get('http://localhost:8000/api/dashboard', headers={'Authorization': f'Bearer {token}'})
print('Dashboard:', r2.status_code)
if r2.status_code != 200:
    print('Dashboard Error:', r2.text[:300])

# Credits
r3 = requests.get('http://localhost:8000/api/credits', headers={'Authorization': f'Bearer {token}'})
print('Credits:', r3.status_code)
if r3.status_code != 200:
    print('Credits Error:', r3.text[:300])

# Payments
r4 = requests.get('http://localhost:8000/api/payments', headers={'Authorization': f'Bearer {token}'})
print('Payments:', r4.status_code)
if r4.status_code != 200:
    print('Payments Error:', r4.text[:300])

# Expected Payments
r5 = requests.get('http://localhost:8000/api/payments/expected', headers={'Authorization': f'Bearer {token}'})
print('Expected Payments:', r5.status_code)
if r5.status_code != 200:
    print('Expected Error:', r5.text[:300])
