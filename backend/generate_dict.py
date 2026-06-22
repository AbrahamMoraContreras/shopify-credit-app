import sys
import os
import csv

sys.path.append(os.path.join(os.path.dirname(__file__), "src"))

from db.base import Base
import models  # Importa todos los modelos

data = []

table_details = {
    "customers": "Tabla que almacena la información de los clientes (compradores).",
    "merchants": "Tabla de comerciantes (tiendas Shopify).",
    "credits": "Tabla principal de créditos/préstamos.",
    "credit_installments": "Tabla de cuotas individuales para cada crédito.",
    "payments": "Tabla de pagos realizados por los clientes.",
    "payment_installments": "Tabla asociativa entre pagos y cuotas (muchos a muchos).",
    "merchant_payment_settings": "Configuraciones de métodos de pago para los comerciantes.",
    "credit_history": "Historial de cambios y auditoría de los créditos.",
    "credit_items": "Artículos (productos) asociados a un crédito.",
    "payment_tokens": "Tokens generados para procesar pagos seguros.",
    "payment_proofs": "Comprobantes de pago subidos por los clientes.",
    "audit_logs": "Registros de auditoría de acciones sensibles en el sistema."
}

def translate_type(tipo):
    tipo = tipo.upper()
    if "VARCHAR" in tipo or "STRING" in tipo: return "Texto"
    if "UUID" in tipo: return "Identificador Único (UUID)"
    if "NUMERIC" in tipo or "DECIMAL" in tipo: return "Número Decimal"
    if "INTEGER" in tipo or "INT" in tipo: return "Número Entero"
    if "DATETIME" in tipo or "TIMESTAMP" in tipo: return "Fecha y Hora"
    if "DATE" in tipo: return "Fecha"
    if "BOOLEAN" in tipo or "BOOL" in tipo: return "Booleano (Verdadero/Falso)"
    if "JSON" in tipo: return "Objeto JSON"
    if "ENUM" in tipo: return "Lista Seleccionable (Enum)"
    return tipo

# Escribir a CSV con punto y coma (fácil de abrir en Excel en español)
output_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "Diccionario_de_Datos.csv"))

with open(output_path, mode='w', newline='', encoding='utf-8-sig') as f:
    writer = csv.writer(f, delimiter=';', quotechar='"', quoting=csv.QUOTE_MINIMAL)
    
    # Escribir cabecera
    writer.writerow(["Tabla", "Nombre Dato", "Tipo de dato", "Longitud", "Clave", "Obligatoriedad", "Detalle"])
    
    for table_name, table in Base.metadata.tables.items():
        for column in table.columns:
            tipo_dato_raw = str(column.type)
            tipo_dato = translate_type(tipo_dato_raw)
            
            longitud = ""
            if hasattr(column.type, 'length') and column.type.length is not None:
                longitud = str(column.type.length)
            elif "VARCHAR" in tipo_dato_raw:
                longitud = "Variable"
            elif "NUMERIC" in tipo_dato_raw:
                if hasattr(column.type, 'precision') and column.type.precision:
                    longitud = f"{column.type.precision},{column.type.scale}"
            
            claves = []
            if column.primary_key:
                claves.append("PK")
            if column.foreign_keys:
                claves.append("FK")
            clave_str = ", ".join(claves) if claves else "-"
            
            obligatoriedad = "Opcional (NULL)" if column.nullable else "Obligatorio (NOT NULL)"
            
            detalle_tabla = table_details.get(table_name, f"Tabla {table_name}")
            if column.primary_key:
                detalle = f"Identificador principal. {detalle_tabla}"
            elif column.foreign_keys:
                fk_target = list(column.foreign_keys)[0].target_fullname
                detalle = f"Referencia a {fk_target}. {detalle_tabla}"
            else:
                detalle = f"Campo '{column.name}' de la {detalle_tabla.lower()}"
                if column.comment:
                    detalle = column.comment

            writer.writerow([
                table_name.capitalize(),
                column.name,
                tipo_dato,
                longitud,
                clave_str,
                obligatoriedad,
                detalle
            ])

print(f"Diccionario de datos generado exitosamente en: {output_path}")
