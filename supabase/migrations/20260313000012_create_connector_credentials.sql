-- Migration: YATDA_Connector_Credentials
-- Stores per-user OAuth tokens for external connectors.
-- Tokens are AES-GCM-256 encrypted by the application layer (Web Crypto API)
-- before being stored.  The ciphertext is serialised as "<ivBase64>:<ctBase64>"
-- and kept as ordinary text — no pgcrypto involvement needed.

create table "YATDA_Connector_Credentials" (
  credential_id   uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references "YATDA_Users" (user_id) on delete cascade,
  connector_id    uuid not null references "YATDA_Connectors" (connector_id) on delete cascade,
  -- Tokens stored as AES-GCM ciphertext: "<ivBase64>:<ciphertextBase64>"
  access_token    text not null,
  refresh_token   text,
  token_expiry    timestamptz,
  scope           text,
  -- External account identifier (e.g. Google sub / email) for debugging
  external_account_id text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, connector_id)
);

comment on table "YATDA_Connector_Credentials" is 'AES-GCM encrypted OAuth tokens per user per connector';
comment on column "YATDA_Connector_Credentials".access_token  is 'AES-GCM-256 ciphertext: "<ivBase64>:<ciphertextBase64>"';
comment on column "YATDA_Connector_Credentials".refresh_token is 'AES-GCM-256 ciphertext: "<ivBase64>:<ciphertextBase64>"';

create trigger trg_yatda_credentials_updated_at
  before update on "YATDA_Connector_Credentials"
  for each row execute function yatda_set_updated_at();
