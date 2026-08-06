
-- 1. Re-scope every policy to the intended API roles and remove destructive paths.
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT tablename, policyname FROM pg_policies WHERE schemaname='public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, p.tablename);
  END LOOP;
END $$;

-- Append-only tables (immutable evidence / audit trail)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['audit_logs','lead_activities','lead_behavior_events','lead_consents'] LOOP
    EXECUTE format('REVOKE UPDATE, DELETE, TRUNCATE ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT SELECT, INSERT ON public.%I TO anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true)', 'lm_select_'||t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO anon, authenticated WITH CHECK (true)', 'lm_insert_'||t, t);
  END LOOP;
END $$;

-- Configuration tables: read / create / update, never delete
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['team_members','territories','lead_sources','scoring_factors','qualification_rules','followup_rules','compliance_policies'] LOOP
    EXECUTE format('REVOKE DELETE, TRUNCATE ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE ON public.%I TO anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true)', 'lm_select_'||t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO anon, authenticated WITH CHECK (true)', 'lm_insert_'||t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)', 'lm_update_'||t, t);
  END LOOP;
END $$;

-- Operational tables: full CRUD
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['leads','lead_notes','lead_followups','lead_escalations','lead_buzzer_alerts','lead_notifications'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true)', 'lm_select_'||t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO anon, authenticated WITH CHECK (true)', 'lm_insert_'||t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)', 'lm_update_'||t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO anon, authenticated USING (true)', 'lm_delete_'||t, t);
  END LOOP;
END $$;

-- 2. Payload validation guardrails.
CREATE OR REPLACE FUNCTION public.validate_lead()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.full_name := btrim(NEW.full_name);
  NEW.email := lower(btrim(NEW.email));
  IF length(NEW.full_name) < 2 OR length(NEW.full_name) > 120 THEN
    RAISE EXCEPTION 'Lead name must be between 2 and 120 characters';
  END IF;
  IF NEW.email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(NEW.email) > 254 THEN
    RAISE EXCEPTION 'Lead email is not a valid address';
  END IF;
  IF NEW.phone IS NOT NULL AND length(btrim(NEW.phone)) > 32 THEN
    RAISE EXCEPTION 'Lead phone number is too long';
  END IF;
  IF length(NEW.software_interest) < 2 OR length(NEW.software_interest) > 120 THEN
    RAISE EXCEPTION 'Software interest must be between 2 and 120 characters';
  END IF;
  IF NEW.urgency_score NOT BETWEEN 0 AND 100
     OR NEW.quality_score NOT BETWEEN 0 AND 100
     OR NEW.ai_score NOT BETWEEN 0 AND 100
     OR NEW.conversion_probability NOT BETWEEN 0 AND 100 THEN
    RAISE EXCEPTION 'Lead scores must be between 0 and 100';
  END IF;
  IF NEW.expected_value < 0 OR NEW.expected_value > 100000000 THEN
    RAISE EXCEPTION 'Expected value is out of range';
  END IF;
  IF array_length(NEW.tags, 1) > 20 THEN
    RAISE EXCEPTION 'A lead can carry at most 20 tags';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS t_leads_validate ON public.leads;
CREATE TRIGGER t_leads_validate BEFORE INSERT OR UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.validate_lead();

CREATE OR REPLACE FUNCTION public.validate_lead_text()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_TABLE_NAME = 'lead_notes' THEN
    NEW.body := btrim(NEW.body);
    IF length(NEW.body) = 0 OR length(NEW.body) > 5000 THEN
      RAISE EXCEPTION 'Note body must be between 1 and 5000 characters';
    END IF;
  ELSIF TG_TABLE_NAME = 'lead_activities' THEN
    IF length(NEW.action) = 0 OR length(NEW.action) > 200 THEN
      RAISE EXCEPTION 'Activity action must be between 1 and 200 characters';
    END IF;
    IF NEW.detail IS NOT NULL AND length(NEW.detail) > 2000 THEN
      RAISE EXCEPTION 'Activity detail is too long';
    END IF;
  ELSIF TG_TABLE_NAME = 'lead_followups' THEN
    IF length(NEW.title) = 0 OR length(NEW.title) > 200 THEN
      RAISE EXCEPTION 'Follow-up title must be between 1 and 200 characters';
    END IF;
    IF NEW.notes IS NOT NULL AND length(NEW.notes) > 2000 THEN
      RAISE EXCEPTION 'Follow-up notes are too long';
    END IF;
  ELSIF TG_TABLE_NAME = 'lead_escalations' THEN
    IF NEW.level NOT BETWEEN 1 AND 5 THEN
      RAISE EXCEPTION 'Escalation level must be between 1 and 5';
    END IF;
    IF NEW.sla_minutes < 0 OR NEW.sla_minutes > 100000 THEN
      RAISE EXCEPTION 'Escalation SLA is out of range';
    END IF;
    IF length(NEW.reason) = 0 OR length(NEW.reason) > 500 THEN
      RAISE EXCEPTION 'Escalation reason must be between 1 and 500 characters';
    END IF;
  ELSIF TG_TABLE_NAME = 'followup_rules' THEN
    IF NEW.delay_minutes < 0 OR NEW.delay_minutes > 525600 THEN
      RAISE EXCEPTION 'Follow-up delay must be between 0 minutes and 1 year';
    END IF;
    IF length(NEW.template) > 4000 THEN
      RAISE EXCEPTION 'Follow-up template is too long';
    END IF;
  ELSIF TG_TABLE_NAME = 'qualification_rules' THEN
    IF NEW.weight NOT BETWEEN 0 AND 100 THEN
      RAISE EXCEPTION 'Qualification weight must be between 0 and 100';
    END IF;
  ELSIF TG_TABLE_NAME = 'scoring_factors' THEN
    IF NEW.weight NOT BETWEEN 0 AND 100 THEN
      RAISE EXCEPTION 'Scoring weight must be between 0 and 100';
    END IF;
  ELSIF TG_TABLE_NAME = 'lead_sources' THEN
    IF NEW.cost_per_lead < 0 OR NEW.cost_per_lead > 1000000 THEN
      RAISE EXCEPTION 'Cost per lead is out of range';
    END IF;
  ELSIF TG_TABLE_NAME = 'audit_logs' THEN
    IF length(NEW.action) = 0 OR length(NEW.action) > 120 THEN
      RAISE EXCEPTION 'Audit action must be between 1 and 120 characters';
    END IF;
    IF length(NEW.meta_json::text) > 20000 THEN
      RAISE EXCEPTION 'Audit metadata payload is too large';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['lead_notes','lead_activities','lead_followups','lead_escalations','followup_rules','qualification_rules','scoring_factors','lead_sources','audit_logs'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS t_%s_validate ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER t_%s_validate BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.validate_lead_text()', t, t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.validate_lead_consent()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.granted AND EXISTS (SELECT 1 FROM public.leads l WHERE l.id = NEW.lead_id AND l.do_not_contact) THEN
    RAISE EXCEPTION 'Cannot record consent for a lead marked do-not-contact';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS t_consents_validate ON public.lead_consents;
CREATE TRIGGER t_consents_validate BEFORE INSERT ON public.lead_consents
FOR EACH ROW EXECUTE FUNCTION public.validate_lead_consent();
