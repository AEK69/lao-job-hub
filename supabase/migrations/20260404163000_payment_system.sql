-- ============================================================================
-- PAYMENT LOGIC & STATUS TRACKING FOR WORKDAY APP
-- Round 1: Payment system implementation
-- ============================================================================

-- 1. Trigger function to auto-calculate payment status
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_job_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  total integer;
  paid integer;
  pay_count integer;
BEGIN
  -- Get job's total price
  SELECT total_price INTO total FROM public.jobs WHERE id = NEW.job_id;
  
  -- Get sum of all payments for this job
  SELECT COALESCE(SUM(amount), 0) INTO paid FROM public.payments WHERE job_id = NEW.job_id;
  
  -- Count number of payments
  SELECT COUNT(*) INTO pay_count FROM public.payments WHERE job_id = NEW.job_id;

  -- Update jobs table with amount_paid and payment_status
  UPDATE public.jobs SET
    amount_paid = paid,
    payment_status = CASE
      WHEN paid >= total THEN 'paid'
      WHEN paid > 0 AND pay_count = 1 THEN 'deposited'
      WHEN paid > 0 THEN 'partial'
      ELSE 'unpaid'
    END,
    updated_at = now()
  WHERE id = NEW.job_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS recalc_payment ON public.payments;

-- Create trigger for payment inserts
CREATE TRIGGER recalc_payment
AFTER INSERT ON public.payments
FOR EACH ROW EXECUTE FUNCTION update_job_payment_status();

-- 2. Function to recalculate payment status for existing jobs
-- ============================================================================

CREATE OR REPLACE FUNCTION public.recalculate_all_payment_statuses()
RETURNS void AS $$
DECLARE
  job_record RECORD;
BEGIN
  FOR job_record IN SELECT id FROM public.jobs LOOP
    PERFORM update_job_payment_status() FROM (SELECT job_record.id as job_id);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3. Function to validate payment amounts
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_payment_amount()
RETURNS TRIGGER AS $$
DECLARE
  job_total integer;
  job_paid integer;
  remaining integer;
BEGIN
  -- Get job details
  SELECT total_price, amount_paid INTO job_total, job_paid 
  FROM public.jobs WHERE id = NEW.job_id;
  
  -- Calculate remaining balance
  remaining := job_total - job_paid;
  
  -- Validate amount
  IF NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than 0';
  END IF;
  
  IF NEW.amount > remaining THEN
    RAISE EXCEPTION 'Payment amount cannot exceed remaining balance (% kip)', remaining;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing validation trigger if it exists
DROP TRIGGER IF EXISTS validate_payment_amount ON public.payments;

-- Create trigger for payment validation
CREATE TRIGGER validate_payment_amount
BEFORE INSERT ON public.payments
FOR EACH ROW EXECUTE FUNCTION validate_payment_amount();

-- 4. Function to create audit log entry for payments
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_payment_audit()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    new_values,
    created_at
  ) VALUES (
    auth.uid(),
    'INSERT',
    'payments',
    NEW.id,
    row_to_json(NEW),
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing audit trigger if it exists
DROP TRIGGER IF EXISTS payment_audit_log ON public.payments;

-- Create trigger for audit logging
CREATE TRIGGER payment_audit_log
AFTER INSERT ON public.payments
FOR EACH ROW EXECUTE FUNCTION log_payment_audit();

-- 5. Add indexes for payment queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_payments_job_id ON public.payments(job_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_payment_method ON public.payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_jobs_payment_status ON public.jobs(payment_status);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_date ON public.jobs(scheduled_date);
