import requests

# Test against REMOTE Render backend
BASE = 'https://shopify-credit-app-backend.onrender.com'

try:
    r1 = requests.post(f'{BASE}/api/merchants/register', 
        json={'shop_domain':'opentech-credit-app-test.myshopify.com'}, 
        headers={'X-Internal-Secret':'adiel2001'},
        timeout=120
    )
    print('Register:', r1.status_code)
    if r1.status_code != 200:
        print('FAILED:', r1.text[:200])
        exit(1)

    token = r1.json()['access_token']
    h = {'Authorization': f'Bearer {token}'}

    endpoints = [
        ('Dashboard', 'GET', '/api/dashboard'),
        ('Credits', 'GET', '/api/credits'),
        ('Payments', 'GET', '/api/payments'),
        ('Expected', 'GET', '/api/payments/expected'),
    ]

    for name, method, path in endpoints:
        try:
            if method == 'GET':
                r = requests.get(f'{BASE}{path}', headers=h, timeout=60)
            print(f'{name}: {r.status_code}')
            if r.status_code != 200:
                print(f'  Error: {r.text[:200]}')
        except Exception as e:
            print(f'{name}: EXCEPTION - {e}')
except Exception as e:
    print('Register failed:', e)
