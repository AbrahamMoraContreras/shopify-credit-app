import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add the app directory to sys.path
sys.path.append(os.path.join(os.getcwd(), "app"))

DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/postgres"

def fix_duplicates():
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        # 1. Identificar duplicados
        query = text("""
            SELECT merchant_id, reference_number, id
            FROM payments
            WHERE (merchant_id, reference_number) IN (
                SELECT merchant_id, reference_number
                FROM payments
                GROUP BY merchant_id, reference_number
                HAVING COUNT(*) > 1
            )
            ORDER BY merchant_id, reference_number, id;
        """)
        
        results = session.execute(query).fetchall()
        
        if not results:
            print("No duplicates found.")
            return

        print(f"Found {len(results)} potential duplicates.")

        seen = {}
        for row in results:
            key = (row.merchant_id, row.reference_number)
            if key not in seen:
                seen[key] = 0
                # Keep the first one as is
                continue
            
            seen[key] += 1
            new_ref = f"{row.reference_number}-FIX{seen[key]}"
            print(f"Updating payment ID {row.id}: {row.reference_number} -> {new_ref}")
            
            update_query = text("UPDATE payments SET reference_number = :new_ref WHERE id = :id")
            session.execute(update_query, {"new_ref": new_ref, "id": row.id})

        session.commit()
        print("Duplicates resolved successfully.")

    except Exception as e:
        session.rollback()
        print(f"Error resolving duplicates: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    fix_duplicates()
