ALTER TABLE merchants ADD COLUMN IF NOT EXISTS binance_settings JSONB;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS zelle_settings JSONB;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS zinli_settings JSONB;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS debito_settings JSONB;
UPDATE alembic_version SET version_num = 'a1b2c3d4e5f7';
