import requests
r1 = requests.post('http://localhost:8000/api/merchants/register', json={'shop_domain':'opentech-credit-app-test.myshopify.com'}, headers={'X-Internal-Secret':'adiel2001'})
token = r1.json().get('access_token')
if not token:
    print("Failed to get token:", r1.text)
    exit(1)
r2 = requests.get('http://localhost:8000/api/payments', headers={'Authorization': f'Bearer {token}'})
print(r2.status_code)
print(r2.text)
