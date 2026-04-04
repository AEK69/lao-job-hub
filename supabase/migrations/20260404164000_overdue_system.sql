-- ============================================================================
-- OVERDUE ALERT SYSTEM FOR WORKDAY APP
-- Round 3: Overdue job detection and alerts
-- ============================================================================

-- 1. Create overdue_jobs view
-- ============================================================================

DROP VIEW IF EXISTS public.overdue_jobs CASCADE;

CREATE VIEW public.overdue_jobs AS
SELECT 
  j.*,
  s.name as staff_name,
  (j.total_price - j.amount_paid) as remaining_balance,
  (CURRENT_DATE - j.scheduled_date)::int as days_overdue
FROM public.jobs j
LEFT JOIN public.staff s ON j.assigned_staff_id = s.id
WHERE 
  j.scheduled_date < CURRENT_DATE
  AND j.payment_status != 'paid'
  AND j.job_status != 'cancel'
ORDER BY days_overdue DESC;

-- Enable RLS on view (inherits from jobs table)
ALTER VIEW public.overdue_jobs OWNER TO postgres;

-- 2. Create function to count overdue jobs
-- ============================================================================

CREATE OR REPLACE FUNCTION public.count_overdue_jobs()
RETURNS int AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) FROM public.overdue_jobs
  );
END;
$$ LANGUAGE plpgsql;

-- 3. Create function to get total overdue balance
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_overdue_balance()
RETURNS bigint AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(remaining_balance) FROM public.overdue_jobs),
    0
  );
END;
$$ LANGUAGE plpgsql;

-- 4. Create function to get overdue jobs grouped by severity
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_overdue_by_severity()
RETURNS TABLE (
  severity text,
  count bigint,
  total_balance bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH due_analysis AS (
    SELECT 
      CASE 
        WHEN days_overdue <= 3 THEN 'amber'
        WHEN days_overdue <= 7 THEN 'orange'
        ELSE 'red'
      END as severity,
      remaining_balance
    FROM public.overdue_jobs
  )
  SELECT 
    severity,
    COUNT(*)::bigint,
    COALESCE(SUM(remaining_balance)::bigint, 0)
  FROM due_analysis
  GROUP BY severity
  ORDER BY severity DESC;
END;
$$ LANGUAGE plpgsql;

-- 5. Create function to fetch notifications for dashboard
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_dashboard_notifications()
RETURNS TABLE (
  notification_type text,
  count bigint,
  total_amount bigint,
  description text
) AS $$
BEGIN
  RETURN QUERY
  -- Overdue jobs
  SELECT 
    'overdue'::text,
    COUNT(*)::bigint,
    COALESCE(SUM(remaining_balance)::bigint, 0),
    'ງານທີ່ເກີນກຳນົດຊຳລະ'::text
  FROM public.overdue_jobs
  
  UNION ALL
  
  -- Due today (unpaid)
  SELECT 
    'due_today'::text,
    COUNT(*)::bigint,
    COALESCE(SUM(total_price - amount_paid)::bigint, 0),
    'ຄົບກຳນົດມື້ນີ້'::text
  FROM public.jobs
  WHERE 
    scheduled_date = CURRENT_DATE
    AND payment_status != 'paid'
    AND job_status != 'cancel'
  
  UNION ALL
  
  -- Due within 3 days (unpaid)
  SELECT 
    'due_soon'::text,
    COUNT(*)::bigint,
    COALESCE(SUM(total_price - amount_paid)::bigint, 0),
    'ຄົບກຳນົດ 3 ວັນ'::text
  FROM public.jobs
  WHERE 
    scheduled_date > CURRENT_DATE
    AND scheduled_date <= CURRENT_DATE + INTERVAL '3 days'
    AND payment_status != 'paid'
    AND job_status != 'cancel';
END;
$$ LANGUAGE plpgsql;

-- Add indexes for overdue queries
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_date_payment ON public.jobs(scheduled_date, payment_status);
CREATE INDEX IF NOT EXISTS idx_jobs_status_date ON public.jobs(job_status, scheduled_date);
