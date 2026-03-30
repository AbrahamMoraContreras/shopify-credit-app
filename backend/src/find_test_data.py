import os
import sys

from db.session import SessionLocal
from models.customer import Customer
from models.credit import Credit

def find_test_data():
    db = SessionLocal()
    print("Buscando clientes de prueba...")
    
    # Buscar cliente "Sol Perez"
    customers = db.query(Customer).filter(
        (Customer.full_name.ilike('%sol perez%')) |
        (Customer.full_name.ilike('%sol pérez%')) |
        (Customer.full_name.ilike('%test%')) |
        (Customer.email.ilike('%test%'))
    ).all()
    
    print(f"Encontrados {len(customers)} clientes sospechosos:")
    for c in customers:
        print(f" - ID: {c.id}, Nombre: {c.full_name}, Email: {c.email}, ShopifyID: {c.shopify_customer_id}")
        
    print("\nEliminando los encontrados...")
    deleted = 0
    for c in customers:
        if "test" in (c.full_name or "").lower() or "sol p" in (c.full_name or "").lower() or "test" in (c.email or "").lower():
            db.delete(c)
            deleted += 1
            print(f"Eliminado: {c.full_name}")
            
    if deleted > 0:
        db.commit()
        print(f"¡{deleted} registros eliminados con éxito!")
    else:
        print("No se eliminó ningún registro.")
        
    db.close()

if __name__ == "__main__":
    find_test_data()
