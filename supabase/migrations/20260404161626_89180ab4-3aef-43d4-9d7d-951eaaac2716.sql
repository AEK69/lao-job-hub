
-- Drop existing tables
DROP TABLE IF EXISTS public.coin_transactions CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.jobs CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TYPE IF EXISTS public.app_role CASCADE;
DROP FUNCTION IF EXISTS public.admin_topup_coins CASCADE;
DROP FUNCTION IF EXISTS public.admin_update_kyc CASCADE;
DROP FUNCTION IF EXISTS public.has_role CASCADE;
DROP FUNCTION IF EXISTS public.spend_coins CASCADE;
DROP FUNCTION IF EXISTS public.transfer_coins CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user CASCADE;

-- 1. user_roles (created first for policy references)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  role text NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE OR REPLACE FUNCTION public.validate_user_role() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role NOT IN ('admin', 'staff', 'cashier') THEN RAISE EXCEPTION 'Invalid role: %', NEW.role; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER check_user_role BEFORE INSERT OR UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.validate_user_role();
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- 2. services
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  base_price integer NOT NULL DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Services viewable by everyone" ON public.services FOR SELECT USING (true);
CREATE POLICY "Admins can manage services" ON public.services FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- 3. staff
CREATE TABLE public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  phone text,
  skills text[] DEFAULT '{}',
  status text DEFAULT 'available',
  created_at timestamptz DEFAULT now()
);
CREATE OR REPLACE FUNCTION public.validate_staff_status() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('available', 'busy', 'off') THEN RAISE EXCEPTION 'Invalid staff status: %', NEW.status; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER check_staff_status BEFORE INSERT OR UPDATE ON public.staff FOR EACH ROW EXECUTE FUNCTION public.validate_staff_status();
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff viewable by authenticated" ON public.staff FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage staff" ON public.staff FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- 4. jobs
CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_number text UNIQUE NOT NULL DEFAULT '',
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_address text,
  job_type text NOT NULL,
  priority text DEFAULT 'normal',
  scheduled_date date,
  scheduled_time text,
  description text,
  base_price integer DEFAULT 0,
  material_cost integer DEFAULT 0,
  discount integer DEFAULT 0,
  total_price integer GENERATED ALWAYS AS (base_price + material_cost - discount) STORED,
  deposit_amount integer DEFAULT 0,
  payment_method text DEFAULT 'cash',
  payment_status text DEFAULT 'unpaid',
  amount_paid integer DEFAULT 0,
  job_status text DEFAULT 'pending',
  assigned_staff_id uuid REFERENCES public.staff(id),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE OR REPLACE FUNCTION public.validate_job_fields() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.priority NOT IN ('normal', 'urgent', 'critical') THEN RAISE EXCEPTION 'Invalid priority: %', NEW.priority; END IF;
  IF NEW.payment_status NOT IN ('unpaid', 'deposited', 'partial', 'paid') THEN RAISE EXCEPTION 'Invalid payment_status: %', NEW.payment_status; END IF;
  IF NEW.job_status NOT IN ('pending', 'active', 'quality_check', 'payment', 'done', 'cancel') THEN RAISE EXCEPTION 'Invalid job_status: %', NEW.job_status; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER check_job_fields BEFORE INSERT OR UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.validate_job_fields();

CREATE OR REPLACE FUNCTION public.generate_job_number() RETURNS TRIGGER AS $$
DECLARE
  year_part text := to_char(now(), 'YYYY');
  seq_num integer;
BEGIN
  SELECT COUNT(*) + 1 INTO seq_num FROM public.jobs WHERE to_char(created_at, 'YYYY') = year_part;
  NEW.job_number := 'WD-' || year_part || '-' || LPAD(seq_num::text, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER set_job_number BEFORE INSERT ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.generate_job_number();

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Jobs viewable by authenticated" ON public.jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage all jobs" ON public.jobs FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "Staff can update assigned jobs" ON public.jobs FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.staff WHERE user_id = auth.uid() AND id = jobs.assigned_staff_id));
CREATE POLICY "Authenticated can create jobs" ON public.jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

-- 5. payments
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  method text NOT NULL,
  payment_type text,
  reference_note text,
  received_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
CREATE OR REPLACE FUNCTION public.validate_payment_fields() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.method NOT IN ('cash', 'bcel', 'transfer') THEN RAISE EXCEPTION 'Invalid method: %', NEW.method; END IF;
  IF NEW.payment_type IS NOT NULL AND NEW.payment_type NOT IN ('deposit', 'partial', 'full') THEN RAISE EXCEPTION 'Invalid payment_type: %', NEW.payment_type; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER check_payment_fields BEFORE INSERT OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.validate_payment_fields();
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Payments viewable by authenticated" ON public.payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins cashiers manage payments" ON public.payments FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'cashier')));

-- 6. job_images
CREATE TABLE public.job_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  image_type text,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
CREATE OR REPLACE FUNCTION public.validate_image_type() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.image_type IS NOT NULL AND NEW.image_type NOT IN ('before', 'after', 'other') THEN RAISE EXCEPTION 'Invalid image_type: %', NEW.image_type; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER check_image_type BEFORE INSERT OR UPDATE ON public.job_images FOR EACH ROW EXECUTE FUNCTION public.validate_image_type();
ALTER TABLE public.job_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Job images viewable by authenticated" ON public.job_images FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can upload images" ON public.job_images FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "Admins manage all images" ON public.job_images FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- 7. audit_logs
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  target_table text,
  target_id uuid,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- Default services data
INSERT INTO public.services (name, base_price) VALUES
  ('ສ້ອມແປງທົ່ວໄປ', 200000),
  ('ຕິດຕັ້ງ', 350000),
  ('ອອກແບບ', 500000),
  ('ທຳຄວາມສະອາດ', 150000),
  ('ຂໍ້ມູນ IT', 300000);
