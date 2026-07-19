import requests
r1 = requests.post('https://shopify-credit-app-backend.onrender.com/api/merchants/register', json={'shop_domain':'opentech-credit-app-test.myshopify.com'}, headers={'X-Internal-Secret':'adiel2001'})
token = r1.json().get('access_token')
r2 = requests.get('https://shopify-credit-app-backend.onrender.com/api/dashboard', headers={'Authorization': f'Bearer {token}'})
print('Dashboard Status:', r2.status_code)
if r2.status_code != 200:
    print('Dashboard text:', r2.text)
