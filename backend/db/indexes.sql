CREATE INDEX IF NOT EXISTS idx_users_wallet_address
  ON users (wallet_address);

CREATE INDEX IF NOT EXISTS idx_access_user_id_nft_id
  ON access (user_id, nft_id);

CREATE INDEX IF NOT EXISTS idx_payments_tx_hash
  ON payments (tx_hash);
