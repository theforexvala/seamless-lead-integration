import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { toast } from "sonner";
import * as api from "./api";
import type { LeadFilters } from "./api";
import type { LeadStatus } from "./types";

export const leadKeys = {
  all: ["leads"] as const,
  list: (filters: LeadFilters) => ["leads", "list", filters] as const,
  detail: (id: string) => ["leads", "detail", id] as const,
  notes: (id: string) => ["leads", "notes", id] as const,
  activities: (id?: string) => ["leads", "activities", id ?? "all"] as const,
  followups: (id?: string) => ["leads", "followups", id ?? "all"] as const,
  followupRules: ["followup-rules"] as const,
  escalations: ["escalations"] as const,
  buzzer: ["buzzer"] as const,
  notifications: ["notifications"] as const,
  qualification: ["qualification-rules"] as const,
  scoring: ["scoring-factors"] as const,
  behavior: (id?: string) => ["behavior", id ?? "all"] as const,
  policies: ["compliance-policies"] as const,
  consents: (id?: string) => ["consents", id ?? "all"] as const,
  territories: ["territories"] as const,
  sources: ["sources"] as const,
  team: ["team"] as const,
  audit: ["audit"] as const,
};

const STALE = 30_000;

type Opts<T> = Omit<UseQueryOptions<T, Error, T>, "queryKey" | "queryFn">;

export const useLeads = (filters: LeadFilters = {}, opts?: Opts<Awaited<ReturnType<typeof api.fetchLeads>>>) =>
  useQuery({
    queryKey: leadKeys.list(filters),
    queryFn: () => api.fetchLeads(filters),
    staleTime: STALE,
    ...opts,
  });

export const useLead = (id: string | null) =>
  useQuery({
    queryKey: leadKeys.detail(id ?? ""),
    queryFn: () => api.fetchLead(id as string),
    enabled: Boolean(id),
  });

export const useLeadNotes = (id: string | null) =>
  useQuery({
    queryKey: leadKeys.notes(id ?? ""),
    queryFn: () => api.fetchNotes(id as string),
    enabled: Boolean(id),
  });

export const useActivities = (id?: string) =>
  useQuery({ queryKey: leadKeys.activities(id), queryFn: () => api.fetchActivities(id), staleTime: STALE });

export const useFollowups = (id?: string) =>
  useQuery({ queryKey: leadKeys.followups(id), queryFn: () => api.fetchFollowups(id), staleTime: STALE });

export const useFollowupRules = () =>
  useQuery({ queryKey: leadKeys.followupRules, queryFn: api.fetchFollowupRules, staleTime: STALE });

export const useEscalations = () =>
  useQuery({ queryKey: leadKeys.escalations, queryFn: api.fetchEscalations, staleTime: STALE });

export const useBuzzerAlerts = () =>
  useQuery({ queryKey: leadKeys.buzzer, queryFn: api.fetchBuzzerAlerts, staleTime: 15_000 });

export const useNotifications = () =>
  useQuery({ queryKey: leadKeys.notifications, queryFn: api.fetchNotifications, staleTime: 15_000 });

export const useQualificationRules = () =>
  useQuery({ queryKey: leadKeys.qualification, queryFn: api.fetchQualificationRules, staleTime: STALE });

export const useScoringFactors = () =>
  useQuery({ queryKey: leadKeys.scoring, queryFn: api.fetchScoringFactors, staleTime: STALE });

export const useBehaviorEvents = (id?: string) =>
  useQuery({ queryKey: leadKeys.behavior(id), queryFn: () => api.fetchBehaviorEvents(id), staleTime: STALE });

export const usePolicies = () =>
  useQuery({ queryKey: leadKeys.policies, queryFn: api.fetchCompliancePolicies, staleTime: STALE });

export const useConsents = (id?: string) =>
  useQuery({ queryKey: leadKeys.consents(id), queryFn: () => api.fetchConsents(id), staleTime: STALE });

export const useTerritories = () =>
  useQuery({ queryKey: leadKeys.territories, queryFn: api.fetchTerritories, staleTime: 300_000 });

export const useSources = () =>
  useQuery({ queryKey: leadKeys.sources, queryFn: api.fetchSources, staleTime: 300_000 });

export const useTeam = () =>
  useQuery({ queryKey: leadKeys.team, queryFn: api.fetchTeam, staleTime: 300_000 });

export const useAuditLogs = () =>
  useQuery({ queryKey: leadKeys.audit, queryFn: () => api.fetchAuditLogs(), staleTime: STALE });

/* ------------------------------ mutations -------------------------------- */

function useInvalidate() {
  const qc = useQueryClient();
  return (keys: readonly unknown[][]) =>
    keys.forEach((key) => qc.invalidateQueries({ queryKey: key }));
}

export function useLeadMutations() {
  const qc = useQueryClient();
  const invalidateLeads = () => {
    qc.invalidateQueries({ queryKey: leadKeys.all });
    qc.invalidateQueries({ queryKey: leadKeys.notifications });
    qc.invalidateQueries({ queryKey: leadKeys.audit });
  };

  const createLead = useMutation({
    mutationFn: api.createLead,
    onSuccess: (lead) => {
      invalidateLeads();
      toast.success(`Lead captured — ${lead.full_name}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createLeads = useMutation({
    mutationFn: api.createLeads,
    onSuccess: (leads) => {
      invalidateLeads();
      toast.success(`${leads.length} leads imported`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateLead = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof api.updateLead>[1] }) =>
      api.updateLead(id, patch),
    onSuccess: () => {
      invalidateLeads();
      toast.success("Lead updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: LeadStatus }) =>
      api.updateLeadStatus(id, status),
    onSuccess: (lead) => {
      invalidateLeads();
      toast.success(`${lead.full_name} moved to ${lead.status.toUpperCase()}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const assign = useMutation({
    mutationFn: ({ id, to, role }: { id: string; to: string; role: string }) =>
      api.assignLead(id, to, role),
    onSuccess: (lead) => {
      invalidateLeads();
      toast.success(`Assigned to ${lead.assigned_to}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: api.deleteLead,
    onSuccess: () => {
      invalidateLeads();
      toast.success("Lead deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkStatus = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: LeadStatus }) =>
      api.bulkUpdateStatus(ids, status),
    onSuccess: (_d, v) => {
      invalidateLeads();
      toast.success(`${v.ids.length} leads moved to ${v.status.toUpperCase()}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addNote = useMutation({
    mutationFn: ({ leadId, body }: { leadId: string; body: string }) => api.addNote(leadId, body),
    onSuccess: (note) => {
      qc.invalidateQueries({ queryKey: leadKeys.notes(note.lead_id) });
      toast.success("Note saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const logActivity = useMutation({
    mutationFn: ({
      leadId,
      action,
      detail,
      channel,
    }: {
      leadId: string;
      action: string;
      detail: string;
      channel?: string;
    }) => api.logActivity(leadId, action, detail, channel),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads", "activities"] });
      toast.success("Activity logged");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { createLead, createLeads, updateLead, changeStatus, assign, remove, bulkStatus, addNote, logActivity };
}

export function useSourceMutations() {
  const qc = useQueryClient();
  return {
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof api.updateSource>[1] }) => api.updateSource(id, patch),
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: leadKeys.sources });
        qc.invalidateQueries({ queryKey: leadKeys.audit });
        toast.success("Capture source updated");
      },
      onError: (e: Error) => toast.error(e.message),
    }),
  };
}

export function useFollowupMutations() {
  const invalidate = useInvalidate();
  const keys = [[...leadKeys.followups()], [...leadKeys.followupRules], [...leadKeys.audit]];

  return {
    create: useMutation({
      mutationFn: api.createFollowup,
      onSuccess: () => {
        invalidate([["leads"], ...keys]);
        toast.success("Follow-up scheduled");
      },
      onError: (e: Error) => toast.error(e.message),
    }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof api.updateFollowup>[1] }) =>
        api.updateFollowup(id, patch),
      onSuccess: () => {
        invalidate([["leads"], ...keys]);
        toast.success("Follow-up updated");
      },
      onError: (e: Error) => toast.error(e.message),
    }),
    remove: useMutation({
      mutationFn: api.deleteFollowup,
      onSuccess: () => {
        invalidate([["leads"], ...keys]);
        toast.success("Follow-up removed");
      },
      onError: (e: Error) => toast.error(e.message),
    }),
    toggleRule: useMutation({
      mutationFn: ({ id, active }: { id: string; active: boolean }) =>
        api.toggleFollowupRule(id, active),
      onSuccess: (_d, v) => {
        invalidate(keys);
        toast.success(v.active ? "Automation activated" : "Automation paused");
      },
      onError: (e: Error) => toast.error(e.message),
    }),
    saveRule: useMutation({
      mutationFn: api.upsertFollowupRule,
      onSuccess: () => {
        invalidate(keys);
        toast.success("Automation rule saved");
      },
      onError: (e: Error) => toast.error(e.message),
    }),
  };
}

export function useEscalationMutations() {
  const invalidate = useInvalidate();
  const keys = [[...leadKeys.escalations], [...leadKeys.audit]];
  return {
    create: useMutation({
      mutationFn: api.createEscalation,
      onSuccess: () => {
        invalidate(keys);
        toast.success("Escalation raised");
      },
      onError: (e: Error) => toast.error(e.message),
    }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof api.updateEscalation>[1] }) =>
        api.updateEscalation(id, patch),
      onSuccess: () => {
        invalidate(keys);
        toast.success("Escalation updated");
      },
      onError: (e: Error) => toast.error(e.message),
    }),
    resolve: useMutation({
      mutationFn: ({ id, resolution }: { id: string; resolution: string }) =>
        api.resolveEscalation(id, resolution),
      onSuccess: () => {
        invalidate(keys);
        toast.success("Escalation resolved");
      },
      onError: (e: Error) => toast.error(e.message),
    }),
  };
}

export function useAlertMutations() {
  const invalidate = useInvalidate();
  return {
    acknowledge: useMutation({
      mutationFn: (id: string) => api.acknowledgeAlert(id),
      onSuccess: () => {
        invalidate([[...leadKeys.buzzer], [...leadKeys.audit]]);
        toast.success("Alert acknowledged");
      },
      onError: (e: Error) => toast.error(e.message),
    }),
    create: useMutation({
      mutationFn: api.createAlert,
      onSuccess: () => {
        invalidate([[...leadKeys.buzzer]]);
        toast.success("Buzzer alert raised");
      },
      onError: (e: Error) => toast.error(e.message),
    }),
  };
}

export function useNotificationMutations() {
  const invalidate = useInvalidate();
  return {
    markRead: useMutation({
      mutationFn: api.markNotificationRead,
      onSuccess: () => invalidate([[...leadKeys.notifications]]),
    }),
    markAllRead: useMutation({
      mutationFn: api.markAllNotificationsRead,
      onSuccess: () => {
        invalidate([[...leadKeys.notifications]]);
        toast.success("All notifications marked as read");
      },
    }),
  };
}

export function useRuleMutations() {
  const invalidate = useInvalidate();
  return {
    toggleQualification: useMutation({
      mutationFn: ({ id, active }: { id: string; active: boolean }) =>
        api.toggleQualificationRule(id, active),
      onSuccess: () => {
        invalidate([[...leadKeys.qualification]]);
        toast.success("Rule updated");
      },
      onError: (e: Error) => toast.error(e.message),
    }),
    createQualification: useMutation({
      mutationFn: api.createQualificationRule,
      onSuccess: () => {
        invalidate([[...leadKeys.qualification]]);
        toast.success("Qualification rule created");
      },
      onError: (e: Error) => toast.error(e.message),
    }),
    updateFactor: useMutation({
      mutationFn: ({ id, weight }: { id: string; weight: number }) =>
        api.updateScoringFactor(id, weight),
      onSuccess: () => {
        invalidate([[...leadKeys.scoring]]);
        toast.success("Scoring weight saved");
      },
      onError: (e: Error) => toast.error(e.message),
    }),
  };
}

export function useComplianceMutations() {
  const invalidate = useInvalidate();
  return {
    review: useMutation({
      mutationFn: ({ id, status }: { id: string; status: string }) =>
        api.updatePolicyStatus(id, status),
      onSuccess: () => {
        invalidate([[...leadKeys.policies]]);
        toast.success("Policy reviewed");
      },
      onError: (e: Error) => toast.error(e.message),
    }),
    setDoNotContact: useMutation({
      mutationFn: ({ leadId, value }: { leadId: string; value: boolean }) =>
        api.setDoNotContact(leadId, value),
      onSuccess: () => {
        invalidate([["leads"], [...leadKeys.consents()]]);
        toast.success("Contact preference updated");
      },
      onError: (e: Error) => toast.error(e.message),
    }),
  };
}
