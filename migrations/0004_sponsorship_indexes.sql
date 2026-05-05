CREATE INDEX IF NOT EXISTS idx_dwarf_sponsorships_checkout_status
ON dwarf_sponsorships(checkout_id, status);

CREATE INDEX IF NOT EXISTS idx_dwarf_sponsorships_active_lookup
ON dwarf_sponsorships(dwarf_id, ai_tier, activated_at, created_at, id)
WHERE status = 'active' AND calls_remaining > 0;
