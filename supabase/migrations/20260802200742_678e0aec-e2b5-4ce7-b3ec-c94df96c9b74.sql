-- ============ ENUMS ============
CREATE TYPE public.lead_status AS ENUM ('new','contacted','demo','negotiation','won','lost');
CREATE TYPE public.lead_priority AS ENUM ('hot','warm','cold');
CREATE TYPE public.followup_status AS ENUM ('pending','completed','overdue','missed','cancelled');
CREATE TYPE public.escalation_status AS ENUM ('open','acknowledged','resolved');

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

-- ============ TEAM ============
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vala_id text NOT NULL UNIQUE,
  full_name text NOT NULL,
  role text NOT NULL,
  region text NOT NULL DEFAULT 'Global',
  email text,
  capacity int NOT NULL DEFAULT 25,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ SOURCES ============
CREATE TABLE public.lead_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  channel text NOT NULL,
  cost_per_lead numeric(10,2) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  webhook_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ TERRITORIES ============
CREATE TABLE public.territories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  country text NOT NULL,
  continent text NOT NULL,
  manager_vala_id text,
  latitude numeric(8,4) NOT NULL DEFAULT 0,
  longitude numeric(8,4) NOT NULL DEFAULT 0,
  target_leads int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ LEADS ============
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  company text,
  software_interest text NOT NULL DEFAULT 'General Enquiry',
  status public.lead_status NOT NULL DEFAULT 'new',
  priority public.lead_priority NOT NULL DEFAULT 'warm',
  source text NOT NULL DEFAULT 'Website',
  region text NOT NULL DEFAULT 'Global',
  country text,
  city text,
  assigned_to text,
  assigned_role text,
  last_action text NOT NULL DEFAULT 'Lead created',
  last_action_at timestamptz NOT NULL DEFAULT now(),
  urgency_score int NOT NULL DEFAULT 50,
  quality_score int NOT NULL DEFAULT 50,
  ai_score int NOT NULL DEFAULT 50,
  conversion_probability int NOT NULL DEFAULT 40,
  expected_value numeric(12,2) NOT NULL DEFAULT 0,
  budget_range text,
  qualified boolean NOT NULL DEFAULT false,
  consent_given boolean NOT NULL DEFAULT false,
  consent_channel text,
  do_not_contact boolean NOT NULL DEFAULT false,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_region ON public.leads(region);

-- ============ NOTES / ACTIVITY ============
CREATE TABLE public.lead_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  author text NOT NULL DEFAULT 'system',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  actor text NOT NULL DEFAULT 'system',
  action text NOT NULL,
  detail text,
  channel text NOT NULL DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ FOLLOW-UPS ============
CREATE TABLE public.followup_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trigger_event text NOT NULL,
  delay_minutes int NOT NULL DEFAULT 60,
  channel text NOT NULL DEFAULT 'email',
  template text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  triggered_count int NOT NULL DEFAULT 0,
  success_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.lead_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  title text NOT NULL,
  channel text NOT NULL DEFAULT 'call',
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  status public.followup_status NOT NULL DEFAULT 'pending',
  assigned_to text,
  rule_id uuid REFERENCES public.followup_rules(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ ESCALATIONS / BUZZER ============
CREATE TABLE public.lead_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  reason text NOT NULL,
  level int NOT NULL DEFAULT 1,
  status public.escalation_status NOT NULL DEFAULT 'open',
  raised_by text NOT NULL DEFAULT 'system',
  assigned_to text,
  sla_minutes int NOT NULL DEFAULT 60,
  resolution text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.lead_buzzer_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.lead_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ QUALIFICATION / SCORING ============
CREATE TABLE public.qualification_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  criteria text NOT NULL,
  weight int NOT NULL DEFAULT 10,
  auto_action text NOT NULL DEFAULT 'flag',
  active boolean NOT NULL DEFAULT true,
  matched_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.scoring_factors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  weight int NOT NULL DEFAULT 10,
  category text NOT NULL DEFAULT 'engagement',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ BEHAVIOUR ============
CREATE TABLE public.lead_behavior_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  page text,
  device text NOT NULL DEFAULT 'desktop',
  duration_seconds int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ COMPLIANCE ============
CREATE TABLE public.compliance_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'privacy',
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'compliant',
  last_reviewed date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.lead_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  channel text NOT NULL,
  granted boolean NOT NULL DEFAULT true,
  captured_at timestamptz NOT NULL DEFAULT now(),
  captured_via text NOT NULL DEFAULT 'web form'
);

-- ============ AUDIT ============
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  module text NOT NULL DEFAULT 'lead_manager',
  actor text NOT NULL DEFAULT 'lead_manager',
  meta_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ TRIGGERS ============
CREATE TRIGGER t_leads_updated BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_followups_updated BEFORE UPDATE ON public.lead_followups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_esc_updated BEFORE UPDATE ON public.lead_escalations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_rules_updated BEFORE UPDATE ON public.followup_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_qrules_updated BEFORE UPDATE ON public.qualification_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_sf_updated BEFORE UPDATE ON public.scoring_factors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_terr_updated BEFORE UPDATE ON public.territories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_src_updated BEFORE UPDATE ON public.lead_sources FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_tm_updated BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_cp_updated BEFORE UPDATE ON public.compliance_policies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ GRANTS + RLS (internal console, no end-user auth) ============
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['team_members','lead_sources','territories','leads','lead_notes','lead_activities',
    'followup_rules','lead_followups','lead_escalations','lead_buzzer_alerts','lead_notifications',
    'qualification_rules','scoring_factors','lead_behavior_events','compliance_policies','lead_consents','audit_logs']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated;', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role;', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('CREATE POLICY "console_read_%1$s" ON public.%1$I FOR SELECT USING (true);', t);
    EXECUTE format('CREATE POLICY "console_insert_%1$s" ON public.%1$I FOR INSERT WITH CHECK (true);', t);
    EXECUTE format('CREATE POLICY "console_update_%1$s" ON public.%1$I FOR UPDATE USING (true) WITH CHECK (true);', t);
    EXECUTE format('CREATE POLICY "console_delete_%1$s" ON public.%1$I FOR DELETE USING (true);', t);
  END LOOP;
END $$;