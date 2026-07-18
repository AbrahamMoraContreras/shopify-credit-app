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
    VENCIDA = "VENCIDA"
    VENCIDO = "VENCIDO"
    CANCELADA = "CANCELADA"
    NO_PAGADA = "NO_PAGADA"

class PaymentStatus(str, Enum):
    REGISTRADO = "REGISTRADO"
    APROBADO = "APROBADO"
    RECHAZADO = "RECHAZADO"
    EN_REVISION = "EN_REVISION"
    CANCELADO = "CANCELADO"
    NO_PAGADO = "NO_PAGADO"

class CreditReputation(str, Enum):
    EXCELENTE = "excelente"
    BUENA = "buena"
    REGULAR = "regular"
    MALA = "mala"