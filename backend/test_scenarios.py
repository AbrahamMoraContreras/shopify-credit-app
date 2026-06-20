import os
import sys
from datetime import datetime, timedelta, date
from decimal import Decimal
import traceback

# Setup path for imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "src")))

from db.session import SessionLocal
from models.merchant import Merchant
from models.customer import Customer
from models.credit import Credit, CreditStatus
from models.payment import PaymentStatus
from models.enums import InstallmentStatus
from models.merchant_payment_settings import MerchantPaymentSetting
from schemas.credit import CreditCreate
from schemas.payment import PaymentCreate, PaymentMethod
from crud.credit import create_credit, get_credit
from crud.payment import create_payment, review_payment
from api.routes.credits import create_credit_endpoint
from fastapi import HTTPException
from sqlalchemy import text
import uuid
from db.session import engine
from db.base import Base

def patch_database(db):
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print("Error creating tables:", e)
        
    try:
        db.execute(text("ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone VARCHAR;"))
        db.commit()
    except Exception as e:
        db.rollback()
    
    try:
        db.execute(text("ALTER TABLE credits ALTER COLUMN merchant_id DROP NOT NULL;"))
        db.commit()
    except Exception as e:
        db.rollback()

    try:
        db.execute(text("ALTER TABLE payments ALTER COLUMN merchant_id DROP NOT NULL;"))
        db.commit()
    except Exception as e:
        db.rollback()

    try:
        db.execute(text("DROP TABLE IF EXISTS merchant_payment_settings;"))
        db.execute(text("""
        CREATE TABLE merchant_payment_settings (
            id UUID PRIMARY KEY,
            merchant_id UUID NOT NULL,
            method_name VARCHAR NOT NULL,
            settings_data JSONB
        );
        """))
        db.commit()
    except Exception as e:
        db.rollback()
    
    try:
        db.execute(text("ALTER TABLE credits ALTER COLUMN merchant_id DROP NOT NULL;"))
        db.commit()
    except Exception as e:
        db.rollback()

def run_tests():
    db = SessionLocal()
    patch_database(db)
    print("--- INICIANDO PRUEBAS DE ESCENARIOS DE CRÉDITO ---\n")
    
    try:
        # Preparación: obtener merchant
        merchant = db.query(Merchant).first()
        if not merchant:
            print("No se encontró ningún comerciante. Crea uno primero.")
            return

        print(f"Usando Merchant ID: {merchant.id}")
        
        # Test 1: Fiado (Flexible) - Paga a tiempo
        print("\n=== TEST 1: Fiado - Pago a tiempo ===")
        try:
            payload1 = CreditCreate(
                customer_id=9991,
                customer_name="Test Fiado 1",
                customer_email="test1@example.com",
                concept="Fiado Test 1",
                total_amount=Decimal("100.00"),
                installments_count=0
            )
            credit1 = create_credit(db, str(merchant.id), payload1)
            print(f"[OK] Crédito Fiado Creado (ID: {credit1.id}, Balance: {credit1.balance})")
            
            pay_payload1 = PaymentCreate(
                credit_id=credit1.id,
                amount=100.0,
                payment_method=PaymentMethod.CASH,
                reference_number=f"REF-{uuid.uuid4().hex[:8]}",
                payment_date=datetime.utcnow(),
                punctuality_feedback=100.0,
                apply_to_installments=[],
            )
            payment1 = create_payment(db, pay_payload1, merchant.id)
            review_payment(db, payment1.id, PaymentStatus.APROBADO, merchant.id)
            
            db.refresh(credit1)
            db.refresh(payment1)
            assert credit1.status == CreditStatus.PAGADO, f"Error: Status es {credit1.status}"
            assert payment1.punctuality_value == Decimal("100"), f"Error: Puntualidad es {payment1.punctuality_value}"
            print("[OK] TEST 1 EXITOSO: Crédito Fiado Pagado y marcado como puntual.")
        except Exception as e:
            db.rollback()
            print(f"[FAIL] TEST 1 FALLÓ: {e}")
            traceback.print_exc()

        # Test 2: Fiado (Flexible) - NO Paga a tiempo
        print("\n=== TEST 2: Fiado - Pago Atrasado ===")
        try:
            payload2 = CreditCreate(
                customer_id=9992,
                customer_name="Test Fiado 2",
                customer_email="test2@example.com",
                concept="Fiado Test 2",
                total_amount=Decimal("150.00"),
                installments_count=0
            )
            credit2 = create_credit(db, str(merchant.id), payload2)
            
            pay_payload2 = PaymentCreate(
                credit_id=credit2.id,
                amount=150.0,
                payment_method=PaymentMethod.BANK,
                reference_number=f"REF-{uuid.uuid4().hex[:8]}",
                payment_date=datetime.utcnow(),
                punctuality_feedback=0.0, # Atrasado
            )
            payment2 = create_payment(db, pay_payload2, merchant.id)
            review_payment(db, payment2.id, PaymentStatus.APROBADO, merchant.id)
            
            db.refresh(credit2)
            db.refresh(payment2)
            assert credit2.status == CreditStatus.PAGADO
            assert payment2.punctuality_value == Decimal("0")
            print("[OK] TEST 2 EXITOSO: Crédito Fiado Pagado pero impuntual.")
        except Exception as e:
            db.rollback()
            print(f"[FAIL] TEST 2 FALLÓ: {e}")
            traceback.print_exc()

        # Test 3: Quincenal 4 Cuotas - Todas a tiempo
        print("\n=== TEST 3: Quincenal 4 Cuotas - Pago a Tiempo ===")
        try:
            tomorrow = date.today() + timedelta(days=1)
            payload3 = CreditCreate(
                customer_id=9993,
                customer_name="Test Quin 3",
                concept="Quincenal Test 3",
                total_amount=Decimal("200.00"),
                installments_count=4,
                frequency="quincenal",
                first_due_date=tomorrow
            )
            credit3 = create_credit(db, str(merchant.id), payload3)
            inst_ids = [i.id for i in credit3.installments]
            
            pay_payload3 = PaymentCreate(
                credit_id=credit3.id,
                amount=200.0,
                payment_method=PaymentMethod.PAGO_MOVIL,
                reference_number=f"REF-{uuid.uuid4().hex[:8]}",
                payment_date=datetime.utcnow(),
                apply_to_installments=inst_ids
            )
            payment3 = create_payment(db, pay_payload3, merchant.id)
            review_payment(db, payment3.id, PaymentStatus.APROBADO, merchant.id)
            
            db.refresh(credit3)
            db.refresh(payment3)
            assert credit3.status == CreditStatus.PAGADO
            assert payment3.punctuality_value == Decimal("100"), f"Puntualidad: {payment3.punctuality_value}"
            for i in credit3.installments:
                assert i.status == InstallmentStatus.PAGADA
            print("[OK] TEST 3 EXITOSO: Quincenal 4 cuotas pagado a tiempo.")
        except Exception as e:
            db.rollback()
            print(f"[FAIL] TEST 3 FALLÓ: {e}")
            traceback.print_exc()

        # Test 4: Quincenal 3 Cuotas - 1 a tiempo, otras vencidas
        print("\n=== TEST 4: Quincenal 3 Cuotas - 2 Vencidas ===")
        try:
            yesterday = date.today() - timedelta(days=1)
            tomorrow = date.today() + timedelta(days=1)
            
            payload4 = CreditCreate(
                customer_id=9994,
                customer_name="Test Quin 4",
                concept="Quincenal Test 4",
                total_amount=Decimal("150.00"),
                installments_count=3,
                frequency="quincenal",
                first_due_date=tomorrow
            )
            credit4 = create_credit(db, str(merchant.id), payload4)
            
            # Forzar vencimiento de las primeras 2 cuotas
            installments = credit4.installments
            installments[0].due_date = yesterday - timedelta(days=15)
            installments[1].due_date = yesterday
            installments[2].due_date = tomorrow
            db.commit()
            
            pay_payload4 = PaymentCreate(
                credit_id=credit4.id,
                amount=150.0,
                payment_method=PaymentMethod.CASH,
                reference_number=f"REF-{uuid.uuid4().hex[:8]}",
                payment_date=datetime.utcnow(),
                apply_to_installments=[i.id for i in installments]
            )
            payment4 = create_payment(db, pay_payload4, merchant.id)
            review_payment(db, payment4.id, PaymentStatus.APROBADO, merchant.id)
            
            db.refresh(credit4)
            db.refresh(payment4)
            
            # Como la cuota más antigua (y cubierta por el pago) estaba vencida, 
            # el pago global se evalúa como tardío (0)
            assert credit4.status == CreditStatus.PAGADO
            assert payment4.punctuality_value == Decimal("0"), f"Puntualidad: {payment4.punctuality_value}"
            print("[OK] TEST 4 EXITOSO: Pagó 3 cuotas, pero 2 vencidas resultó en puntualidad tardía.")
        except Exception as e:
            db.rollback()
            print(f"[FAIL] TEST 4 FALLÓ: {e}")
            traceback.print_exc()

        # Test 5: Quincenal 6 Cuotas - No paga ninguna (quedan vencidas)
        print("\n=== TEST 5: Quincenal 6 Cuotas - Impago ===")
        try:
            payload5 = CreditCreate(
                customer_id=9995,
                customer_name="Test Quin 5",
                concept="Quincenal Test 5",
                total_amount=Decimal("300.00"),
                installments_count=6,
                frequency="quincenal",
                first_due_date=date.today() - timedelta(days=90)
            )
            credit5 = create_credit(db, str(merchant.id), payload5)
            # Todas forzadas a pasado indirectamente por la first_due_date.
            # Verificamos que las fechas cayeron en el pasado.
            assert credit5.installments[-1].due_date <= date.today()
            assert credit5.balance == Decimal("300.00")
            print("[OK] TEST 5 EXITOSO: Cuotas vencidas se mantienen como deuda válida.")
        except Exception as e:
            db.rollback()
            print(f"[FAIL] TEST 5 FALLÓ: {e}")
            traceback.print_exc()

        # Test 6: Bloqueo por Mala Reputación
        print("\n=== TEST 6: Bloqueo de Mala Reputación ===")
        try:
            # Preparar un cliente con mala reputación (Punctuality < 40)
            payload6 = CreditCreate(
                customer_id=9996,
                customer_name="Bad Rep Customer",
                concept="Dummy Credit",
                total_amount=Decimal("10.00"),
                installments_count=0
            )
            dummy_credit = create_credit(db, str(merchant.id), payload6)
            
            customer = dummy_credit.customer
            customer.punctuality_score = Decimal("10.00")  # Forzar "mala"
            db.commit()
            
            # Activar configuracion block_bad_reputation
            settings = db.query(MerchantPaymentSetting).filter(
                MerchantPaymentSetting.merchant_id == merchant.id,
                MerchantPaymentSetting.method_name == "general"
            ).first()
            
            if not settings:
                settings = MerchantPaymentSetting(
                    merchant_id=merchant.id,
                    method_name="general",
                    settings_data={"block_bad_reputation": True}
                )
                db.add(settings)
            else:
                s_data = settings.settings_data or {}
                s_data["block_bad_reputation"] = True
                settings.settings_data = s_data
            db.commit()
            
            # Intentar crear un crédito usando el endpoint que valida
            blocked = False
            try:
                fail_payload = CreditCreate(
                    customer_id=customer.shopify_customer_id,
                    customer_name=customer.full_name,
                    concept="Intentando sacar crédito",
                    total_amount=Decimal("50.00"),
                    installments_count=0,
                    bypass_reputation_block=False
                )
                create_credit_endpoint(fail_payload, db, merchant.id)
            except HTTPException as hex:
                if hex.status_code == 400 and "REPUTATION_BLOCK" in hex.detail:
                    blocked = True
            
            assert blocked, "El cliente no fue bloqueado a pesar de tener mala reputación."
            print("[OK] TEST 6 EXITOSO: El sistema bloqueó correctamente al cliente.")
        except Exception as e:
            db.rollback()
            print(f"[FAIL] TEST 6 FALLÓ: {e}")
            traceback.print_exc()

        # Test 7: Saldo a Favor (Sobre-pago en 3 cuotas)
        print("\n=== TEST 7: Saldo a Favor por Sobre-pago ===")
        try:
            tomorrow = date.today() + timedelta(days=1)
            payload7 = CreditCreate(
                customer_id=9997,
                customer_name="Test Saldo a Favor",
                concept="Crédito 3 cuotas $30",
                total_amount=Decimal("30.00"),
                installments_count=3,
                frequency="mensual",
                first_due_date=tomorrow
            )
            credit7 = create_credit(db, str(merchant.id), payload7)
            
            # Pagamos $50 (sobran $20)
            pay_payload7 = PaymentCreate(
                credit_id=credit7.id,
                amount=50.0,
                payment_method=PaymentMethod.CASH,
                reference_number=f"REF-{uuid.uuid4().hex[:8]}",
                payment_date=datetime.utcnow(),
                apply_to_installments=[i.id for i in credit7.installments],
                distribute_excess=True,
                notes="[OVERPAYMENT: 20.0]" # El frontend envía [OVERPAYMENT: 20.0] si el usuario especifica saldo extra explícito? 
                # Oh wait, we'll see if the CRUD naturally handles the 50 without the OVERPAYMENT tag if distribute_excess=True.
                # Actually, crud handles excess natively if payment > debt. Let's send normal notes.
            )
            pay_payload7.notes = ""
            payment7 = create_payment(db, pay_payload7, merchant.id)
            review_payment(db, payment7.id, PaymentStatus.APROBADO, merchant.id)
            
            db.refresh(credit7)
            db.refresh(credit7.customer)
            
            assert credit7.status == CreditStatus.PAGADO, f"Status: {credit7.status}"
            assert credit7.customer.favorable_balance == Decimal("20.00"), f"Favorable Balance: {credit7.customer.favorable_balance}"
            print("[OK] TEST 7 EXITOSO: El exceso se convirtió correctamente en Saldo a Favor ($20).")
            
            # Guardamos el ID para usar en Test 8
            test7_customer_id = credit7.customer.shopify_customer_id
            
            # Test 8: Usar Saldo a Favor para Nuevo Crédito
            print("\n=== TEST 8: Usar Saldo a Favor ===")
            payload8 = CreditCreate(
                customer_id=test7_customer_id,
                customer_name="Test Saldo a Favor",
                concept="Nuevo Crédito $40",
                total_amount=Decimal("40.00"),
                installments_count=2,
                frequency="mensual",
                first_due_date=tomorrow
            )
            credit8 = create_credit(db, str(merchant.id), payload8)
            
            # Pagamos los primeros $20 usando el saldo a favor
            pay_payload8 = PaymentCreate(
                credit_id=credit8.id,
                amount=20.0, # Intentamos aplicar 20 del saldo a favor
                payment_method=PaymentMethod.CASH,
                reference_number=f"REF-{uuid.uuid4().hex[:8]}",
                payment_date=datetime.utcnow(),
                use_favorable_balance=True,
                apply_to_installments=[credit8.installments[0].id]
            )
            payment8 = create_payment(db, pay_payload8, merchant.id)
            
            db.refresh(credit8)
            db.refresh(credit8.customer)
            
            assert credit8.balance == Decimal("20.00"), f"Balance de Crédito: {credit8.balance}"
            assert payment8.status == PaymentStatus.APROBADO # favorable balance payment auto-approves
            assert credit8.customer.favorable_balance == Decimal("0.00"), f"Favorable Balance quedó en {credit8.customer.favorable_balance}"
            print("[OK] TEST 8 EXITOSO: Se descontaron $20 de saldo a favor exitosamente.")
            
        except Exception as e:
            db.rollback()
            print(f"[FAIL] TEST 7/8 FALLÓ: {e}")
            traceback.print_exc()

    finally:
        db.close()
        print("\n--- PRUEBAS FINALIZADAS ---")

if __name__ == "__main__":
    run_tests()
