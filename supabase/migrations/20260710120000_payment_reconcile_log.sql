-- payment_reconcile_log: durable audit trail for the background reconciler
-- One row per (order, run, action) so we can answer "why did this order
-- get auto-confirmed at T?" without grepping Vercel logs.
CREATE TABLE IF NOT EXISTS public.payment_reconcile_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  order_number text NOT NULL,
  gateway text NOT NULL,
  action text NOT NULL CHECK (action IN ('confirmed','still_pending','status_failed','amount_mismatch','already_settled','skipped','marked_failed')),
  expected_amount numeric(10,2),
  reported_amount numeric(10,2),
  gateway_status text,
  gateway_response_code text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_reconcile_log_run_id
  ON public.payment_reconcile_log (run_id);
CREATE INDEX IF NOT EXISTS idx_payment_reconcile_log_order_id
  ON public.payment_reconcile_log (order_id);
CREATE INDEX IF NOT EXISTS idx_payment_reconcile_log_created_at
  ON public.payment_reconcile_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_reconcile_log_action
  ON public.payment_reconcile_log (action, created_at DESC);

ALTER TABLE public.payment_reconcile_log ENABLE ROW LEVEL SECURITY;
-- service-role only; no client policies

COMMENT ON TABLE public.payment_reconcile_log IS 'Audit trail for the /api/cron/reconcile-payments background job. Service-role only.';
