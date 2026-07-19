import psycopg2

conn = psycopg2.connect('postgresql://credit_app_db_user:ZUAXrjq6gPI1Zhckv32EubJYSXRHPDqk@dpg-d8c4vd0js32c7385j0tg-a.ohio-postgres.render.com/credit_app_db_pxp7?sslmode=require')
conn.autocommit = True
cur = conn.cursor()

try:
    cur.execute("ALTER TYPE installmentstatus ADD VALUE 'NO_PAGADA';")
    print("Added NO_PAGADA to installmentstatus")
except Exception as e:
    print("Error (might already exist):", e)

try:
    cur.execute("ALTER TYPE paymentstatus ADD VALUE 'NO_PAGADO';")
    print("Added NO_PAGADO to paymentstatus")
except Exception as e:
    print("Error (might already exist):", e)

cur.close()
conn.close()
