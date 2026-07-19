import requests

r1 = requests.post(
    'https://shopify-credit-app-backend.onrender.com/api/merchants/register', 
    json={'shop_domain':'opentech-credit-app-test.myshopify.com'}, 
    headers={'X-Internal-Secret':'adiel2001'}
)
token = r1.json()['access_token']
print('Token acquired')

r2 = requests.get(
    'https://shopify-credit-app-backend.onrender.com/api/payments', 
    headers={'Authorization': f'Bearer {token}'}
)
print('Payments Status:', r2.status_code)
if r2.status_code != 200:
    print('Error:', r2.text)
else:
    print('Success:', len(r2.json()), 'payments')
