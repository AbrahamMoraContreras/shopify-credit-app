# app/models/enums.py

from enum import Enum

class CreditStatus(str, Enum):
    PENDIENTE_ACTIVACION = "PENDIENTE_ACTIVACION"
    EMITIDO = "EMITIDO"
    EN_PROGRESO = "EN_PROGRESO"
    MOROSO = "MOROSO"
    PAGADO = "PAGADO"
    CANCELADO = "CANCELADO"
    


class InstallmentStatus(str, Enum):
    PENDIENTE = "PENDIENTE"
    PAGADA = "PAGADA"
    VENCIDO = "VENCIDO"


class PaymentStatus(str, Enum):
    REGISTRADO = "REGISTRADO"
    APROBADO = "APROBADO"
    RECHAZADO = "RECHAZADO"
    EN_REVISION = "EN_REVISION"
    CANCELADO = "CANCELADO"

class CreditReputation(str, Enum):
    EXCELENTE = "excelente"
    BUENA = "buena"
    REGULAR = "regular"
    MALA = "mala"