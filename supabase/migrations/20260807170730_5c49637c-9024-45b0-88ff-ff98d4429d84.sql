-- ============ DB-002 / DB-003: referential integrity ============
CREATE UNIQUE INDEX IF NOT EXISTS lead_sources_name_key_idx ON public.lead_sources(name);
CREATE UNIQUE INDEX IF NOT EXISTS team_members_vala_id_key_idx ON public.team_members(vala_id);

CREATE OR REPLACE FUNCTION public.ensure_lead_source()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.source := btrim(NEW.source);
  IF NEW.source = '' THEN NEW.source := 'Website'; END IF;
  INSERT INTO public.lead_sources (name, channel)
  VALUES (NEW.source, 'other')
  ON CONFLICT (name) DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER t_leads_ensure_source
  BEFORE INSERT OR UPDATE OF source ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.ensure_lead_source();

ALTER TABLE public.leads
  ADD CONSTRAINT leads_source_fkey
  FOREIGN KEY (source) REFERENCES public.lead_sources(name)
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES public.team_members(vala_id)
  ON UPDATE CASCADE ON DELETE SET NULL;

-- ============ DB-004: consent single source of truth ============
COMMENT ON TABLE public.lead_consents IS
  'Canonical consent ledger. leads.consent_given / leads.consent_channel are a derived cache kept in sync by t_consents_sync.';
COMMENT ON COLUMN public.leads.consent_given IS 'Derived cache of the latest lead_consents record. Not authoritative.';
COMMENT ON COLUMN public.leads.consent_channel IS 'Derived cache of the latest lead_consents record. Not authoritative.';

CREATE OR REPLACE FUNCTION public.sync_lead_consent()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.leads
     SET consent_given = NEW.granted,
         consent_channel = NEW.channel
   WHERE id = NEW.lead_id;
  RETURN NEW;
END $$;

CREATE TRIGGER t_consents_sync
  AFTER INSERT ON public.lead_consents
  FOR EACH ROW EXECUTE FUNCTION public.sync_lead_consent();

UPDATE public.leads l
   SET consent_given = c.granted,
       consent_channel = c.channel
  FROM (
    SELECT DISTINCT ON (lead_id) lead_id, granted, channel
      FROM public.lead_consents
     ORDER BY lead_id, captured_at DESC
  ) c
 WHERE c.lead_id = l.id
   AND (l.consent_given IS DISTINCT FROM c.granted OR l.consent_channel IS DISTINCT FROM c.channel);

-- ============ DB-005: duplicate email guard ============
CREATE OR REPLACE FUNCTION public.reject_duplicate_lead_email()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.leads
     WHERE lower(email) = lower(btrim(NEW.email))
       AND id IS DISTINCT FROM NEW.id
  ) THEN
    RAISE EXCEPTION 'A lead with the email % already exists', lower(btrim(NEW.email));
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER t_leads_unique_email
  BEFORE INSERT OR UPDATE OF email ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.reject_duplicate_lead_email();

-- ============ DB-005 / DB-006: indexes ============
CREATE INDEX IF NOT EXISTS idx_leads_email_lower ON public.leads(lower(email));
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_source ON public.leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON public.leads(priority);

CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id ON public.lead_notes(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON public.lead_activities(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_followups_lead_id ON public.lead_followups(lead_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_lead_followups_rule_id ON public.lead_followups(rule_id);
CREATE INDEX IF NOT EXISTS idx_lead_escalations_lead_id ON public.lead_escalations(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_buzzer_alerts_lead_id ON public.lead_buzzer_alerts(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_notifications_lead_id ON public.lead_notifications(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_consents_lead_id ON public.lead_consents(lead_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_behavior_events_lead_id ON public.lead_behavior_events(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);