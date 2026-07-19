import psycopg2

conn = psycopg2.connect('postgresql://credit_app_db_user:ZUAXrjq6gPI1Zhckv32EubJYSXRHPDqk@dpg-d8c4vd0js32c7385j0tg-a.ohio-postgres.render.com/credit_app_db_pxp7?sslmode=require')
cur = conn.cursor()

# Add bank_name column if missing
cur.execute("""
    ALTER TABLE payments 
    ADD COLUMN IF NOT EXISTS bank_name VARCHAR;
""")
conn.commit()

# Verify
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'payments';")
cols = [r[0] for r in cur.fetchall()]
print("Columns after fix:", cols)
if 'bank_name' in cols:
    print("SUCCESS: bank_name now exists!")
else:
    print("FAILED: bank_name still missing!")

conn.close()
