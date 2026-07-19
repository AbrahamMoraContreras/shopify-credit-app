import psycopg2
conn = psycopg2.connect('postgresql://credit_app_db_user:ZUAXrjq6gPI1Zhckv32EubJYSXRHPDqk@dpg-d8c4vd0js32c7385j0tg-a.ohio-postgres.render.com/credit_app_db_pxp7?sslmode=require')
cur = conn.cursor()
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'payments';")
cols = [r[0] for r in cur.fetchall()]
print(cols)
if 'bank_name' in cols:
    print('bank_name EXISTS in db!')
else:
    print('bank_name is MISSING in db!')
