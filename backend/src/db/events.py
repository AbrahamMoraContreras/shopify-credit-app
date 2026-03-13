import json
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID
from sqlalchemy import event
from sqlalchemy.orm import Session
from models.credit import Credit
from models.payment import Payment
from models.audit_log import AuditLog

# Custom JSON encoder to handle dates, decimals, and UUIDs properly
class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        if isinstance(obj, Decimal):
            return float(obj)
        if isinstance(obj, UUID):
            return str(obj)
        return super().default(obj)

def row2dict(row):
    d = {}
    for column in row.__table__.columns:
        d[column.name] = getattr(row, column.name)
    # Serialize dictionary to make it JSONB compatible immediately
    return json.loads(json.dumps(d, cls=CustomJSONEncoder))

def log_creation(mapper, connection, target):
    """Event listener for after_insert"""
    changes = row2dict(target)
    entity_name = target.__class__.__name__
    
    # entity_id might be integer or UUID
    entity_id = str(getattr(target, "id", "UNKNOWN"))

    connection.execute(
        AuditLog.__table__.insert().values(
            entity_name=entity_name,
            entity_id=entity_id,
            action="CREATE",
            timestamp=datetime.utcnow(),
            changes=changes
        )
    )

def log_deletion(mapper, connection, target):
    """Event listener for after_delete"""
    changes = row2dict(target)
    entity_name = target.__class__.__name__
    
    entity_id = str(getattr(target, "id", "UNKNOWN"))

    connection.execute(
        AuditLog.__table__.insert().values(
            entity_name=entity_name,
            entity_id=entity_id,
            action="DELETE",
            timestamp=datetime.utcnow(),
            changes=changes
        )
    )

# Register events for Credit and Payment
event.listen(Credit, 'after_insert', log_creation)
event.listen(Credit, 'after_delete', log_deletion)

event.listen(Payment, 'after_insert', log_creation)
event.listen(Payment, 'after_delete', log_deletion)
