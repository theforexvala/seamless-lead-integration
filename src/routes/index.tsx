import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { LeadManagerTopBar } from "@/components/leads/LeadManagerTopBar";
import { LeadSidebar, type SectionId } from "@/components/leads/LeadSidebar";
import { LeadCaptureHub } from "@/components/leads/LeadCaptureHub";
import { LeadDetails } from "@/components/leads/LeadDetails";
import { AIActionPanel } from "@/components/leads/AIActionPanel";
import { LeadDashboard } from "@/components/leads/LeadDashboard";
import { LeadPipeline } from "@/components/leads/LeadPipeline";
import { NotificationCenter, NotificationDock } from "@/components/leads/LeadNotifications";
import {
  AuditTrail,
  FollowUpAutomation,
  LeadAnalytics,
  LeadAssignment,
  LeadBehavior,
  LeadBuzzer,
  LeadCompliance,
  LeadEscalation,
  LeadIncoming,
  LeadQualification,
  LeadScoring,
  LeadTerritory,
  ManagerProfile,
} from "@/components/leads/Sections";
import { useBuzzerAlerts, useEscalations, useLeads, useNotifications } from "@/lib/leads/hooks";
import type { Lead } from "@/lib/leads/types";

const TITLE = "Lead Manager — Software Vala";
const DESCRIPTION =
  "Software Vala Lead Manager: real-time pipeline, AI qualification, routing, follow-up automation, escalation and compliance in one command centre.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LeadManagerPage,
});

function LeadManagerPage() {
  const [section, setSection] = useState<SectionId>("dashboard");
  const [search, setSearch] = useState("");
  const [captureOpen, setCaptureOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [dockOpen, setDockOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  const { data: leads = [] } = useLeads();
  const { data: alerts = [] } = useBuzzerAlerts();
  const { data: escalations = [] } = useEscalations();
  const { data: notifications = [] } = useNotifications();

  const badges: Partial<Record<SectionId, number>> = {
    incoming: leads.filter((l) => l.status === "new").length,
    assignment: leads.filter((l) => !l.assigned_to && l.status !== "won" && l.status !== "lost").length,
    buzzer: alerts.filter((a) => !a.acknowledged).length,
    escalation: escalations.filter((e) => e.status !== "resolved").length,
    notifications: notifications.filter((n) => !n.read).length,
  };

  const open = (lead: Lead) => setActiveLead(lead);

  return (
    <div className="min-h-screen bg-background">
      <LeadManagerTopBar
        search={search}
        onSearchChange={setSearch}
        onAIClick={() => setAiOpen(true)}
        onNotificationsClick={() => setDockOpen((v) => !v)}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />
      <LeadSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        active={section}
        onChange={(id) => {
          setSection(id);
          if (window.innerWidth < 768) setSidebarOpen(false);
        }}
        onAddLead={() => setCaptureOpen(true)}
        badges={badges}
      />

      <main className="px-4 pb-16 pt-22 transition-all sm:px-6 md:ml-64">
        {section === "dashboard" ? <LeadDashboard onOpenLead={open} /> : null}
        {section === "pipeline" ? <LeadPipeline search={search} onOpenLead={open} /> : null}
        {section === "incoming" ? <LeadIncoming search={search} onOpenLead={open} /> : null}
        {section === "assignment" ? <LeadAssignment onOpenLead={open} /> : null}
        {section === "territory" ? <LeadTerritory /> : null}
        {section === "qualification" ? <LeadQualification /> : null}
        {section === "scoring" ? <LeadScoring onOpenLead={open} /> : null}
        {section === "behavior" ? <LeadBehavior onOpenLead={open} /> : null}
        {section === "followup" ? <FollowUpAutomation onOpenLead={open} /> : null}
        {section === "buzzer" ? <LeadBuzzer /> : null}
        {section === "escalation" ? <LeadEscalation onOpenLead={open} /> : null}
        {section === "compliance" ? <LeadCompliance onOpenLead={open} /> : null}
        {section === "analytics" ? <LeadAnalytics /> : null}
        {section === "audit" ? <AuditTrail /> : null}
        {section === "notifications" ? <NotificationCenter /> : null}
        {section === "profile" ? <ManagerProfile /> : null}
      </main>

      <LeadCaptureHub open={captureOpen} onClose={() => setCaptureOpen(false)} />
      <AIActionPanel open={aiOpen} onClose={() => setAiOpen(false)} onOpenLead={(l) => { setAiOpen(false); open(l); }} />
      <LeadDetails lead={activeLead} onClose={() => setActiveLead(null)} />
      <NotificationDock open={dockOpen} onClose={() => setDockOpen(false)} />
      <Toaster position="bottom-left" />
    </div>
  );
}
