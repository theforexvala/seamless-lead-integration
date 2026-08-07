export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor: string
          created_at: string
          id: string
          meta_json: Json
          module: string
        }
        Insert: {
          action: string
          actor?: string
          created_at?: string
          id?: string
          meta_json?: Json
          module?: string
        }
        Update: {
          action?: string
          actor?: string
          created_at?: string
          id?: string
          meta_json?: Json
          module?: string
        }
        Relationships: []
      }
      compliance_policies: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          last_reviewed: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          last_reviewed?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          last_reviewed?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      followup_rules: {
        Row: {
          active: boolean
          channel: string
          created_at: string
          delay_minutes: number
          id: string
          name: string
          success_count: number
          template: string
          trigger_event: string
          triggered_count: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          channel?: string
          created_at?: string
          delay_minutes?: number
          id?: string
          name: string
          success_count?: number
          template?: string
          trigger_event: string
          triggered_count?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          channel?: string
          created_at?: string
          delay_minutes?: number
          id?: string
          name?: string
          success_count?: number
          template?: string
          trigger_event?: string
          triggered_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      lead_activities: {
        Row: {
          action: string
          actor: string
          channel: string
          created_at: string
          detail: string | null
          id: string
          lead_id: string | null
        }
        Insert: {
          action: string
          actor?: string
          channel?: string
          created_at?: string
          detail?: string | null
          id?: string
          lead_id?: string | null
        }
        Update: {
          action?: string
          actor?: string
          channel?: string
          created_at?: string
          detail?: string | null
          id?: string
          lead_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_behavior_events: {
        Row: {
          created_at: string
          device: string
          duration_seconds: number
          event_type: string
          id: string
          lead_id: string
          page: string | null
        }
        Insert: {
          created_at?: string
          device?: string
          duration_seconds?: number
          event_type: string
          id?: string
          lead_id: string
          page?: string | null
        }
        Update: {
          created_at?: string
          device?: string
          duration_seconds?: number
          event_type?: string
          id?: string
          lead_id?: string
          page?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_behavior_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_buzzer_alerts: {
        Row: {
          acknowledged: boolean
          acknowledged_by: string | null
          created_at: string
          id: string
          lead_id: string | null
          message: string
          severity: string
          title: string
        }
        Insert: {
          acknowledged?: boolean
          acknowledged_by?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          message: string
          severity?: string
          title: string
        }
        Update: {
          acknowledged?: boolean
          acknowledged_by?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          message?: string
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_buzzer_alerts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_consents: {
        Row: {
          captured_at: string
          captured_via: string
          channel: string
          granted: boolean
          id: string
          lead_id: string
        }
        Insert: {
          captured_at?: string
          captured_via?: string
          channel: string
          granted?: boolean
          id?: string
          lead_id: string
        }
        Update: {
          captured_at?: string
          captured_via?: string
          channel?: string
          granted?: boolean
          id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_consents_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_escalations: {
        Row: {
          assigned_to: string | null
          created_at: string
          id: string
          lead_id: string | null
          level: number
          raised_by: string
          reason: string
          resolution: string | null
          resolved_at: string | null
          sla_minutes: number
          status: Database["public"]["Enums"]["escalation_status"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          level?: number
          raised_by?: string
          reason: string
          resolution?: string | null
          resolved_at?: string | null
          sla_minutes?: number
          status?: Database["public"]["Enums"]["escalation_status"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          level?: number
          raised_by?: string
          reason?: string
          resolution?: string | null
          resolved_at?: string | null
          sla_minutes?: number
          status?: Database["public"]["Enums"]["escalation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_escalations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_followups: {
        Row: {
          assigned_to: string | null
          channel: string
          created_at: string
          id: string
          lead_id: string
          notes: string | null
          rule_id: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["followup_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          channel?: string
          created_at?: string
          id?: string
          lead_id: string
          notes?: string | null
          rule_id?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["followup_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          channel?: string
          created_at?: string
          id?: string
          lead_id?: string
          notes?: string | null
          rule_id?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["followup_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_followups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_followups_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "followup_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_notes: {
        Row: {
          author: string
          body: string
          created_at: string
          id: string
          lead_id: string
        }
        Insert: {
          author?: string
          body: string
          created_at?: string
          id?: string
          lead_id: string
        }
        Update: {
          author?: string
          body?: string
          created_at?: string
          id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_notifications: {
        Row: {
          created_at: string
          id: string
          lead_id: string | null
          message: string
          read: boolean
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id?: string | null
          message: string
          read?: boolean
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string | null
          message?: string
          read?: boolean
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notifications_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_sources: {
        Row: {
          active: boolean
          channel: string
          cost_per_lead: number
          created_at: string
          id: string
          name: string
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          active?: boolean
          channel: string
          cost_per_lead?: number
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          active?: boolean
          channel?: string
          cost_per_lead?: number
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          ai_score: number
          assigned_role: string | null
          assigned_to: string | null
          budget_range: string | null
          city: string | null
          company: string | null
          consent_channel: string | null
          consent_given: boolean
          conversion_probability: number
          country: string | null
          created_at: string
          do_not_contact: boolean
          email: string
          expected_value: number
          full_name: string
          id: string
          last_action: string
          last_action_at: string
          phone: string | null
          priority: Database["public"]["Enums"]["lead_priority"]
          qualified: boolean
          quality_score: number
          region: string
          software_interest: string
          source: string
          status: Database["public"]["Enums"]["lead_status"]
          tags: string[]
          updated_at: string
          urgency_score: number
        }
        Insert: {
          ai_score?: number
          assigned_role?: string | null
          assigned_to?: string | null
          budget_range?: string | null
          city?: string | null
          company?: string | null
          consent_channel?: string | null
          consent_given?: boolean
          conversion_probability?: number
          country?: string | null
          created_at?: string
          do_not_contact?: boolean
          email: string
          expected_value?: number
          full_name: string
          id?: string
          last_action?: string
          last_action_at?: string
          phone?: string | null
          priority?: Database["public"]["Enums"]["lead_priority"]
          qualified?: boolean
          quality_score?: number
          region?: string
          software_interest?: string
          source?: string
          status?: Database["public"]["Enums"]["lead_status"]
          tags?: string[]
          updated_at?: string
          urgency_score?: number
        }
        Update: {
          ai_score?: number
          assigned_role?: string | null
          assigned_to?: string | null
          budget_range?: string | null
          city?: string | null
          company?: string | null
          consent_channel?: string | null
          consent_given?: boolean
          conversion_probability?: number
          country?: string | null
          created_at?: string
          do_not_contact?: boolean
          email?: string
          expected_value?: number
          full_name?: string
          id?: string
          last_action?: string
          last_action_at?: string
          phone?: string | null
          priority?: Database["public"]["Enums"]["lead_priority"]
          qualified?: boolean
          quality_score?: number
          region?: string
          software_interest?: string
          source?: string
          status?: Database["public"]["Enums"]["lead_status"]
          tags?: string[]
          updated_at?: string
          urgency_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["vala_id"]
          },
          {
            foreignKeyName: "leads_source_fkey"
            columns: ["source"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["name"]
          },
        ]
      }
      qualification_rules: {
        Row: {
          active: boolean
          auto_action: string
          created_at: string
          criteria: string
          id: string
          matched_count: number
          name: string
          updated_at: string
          weight: number
        }
        Insert: {
          active?: boolean
          auto_action?: string
          created_at?: string
          criteria: string
          id?: string
          matched_count?: number
          name: string
          updated_at?: string
          weight?: number
        }
        Update: {
          active?: boolean
          auto_action?: string
          created_at?: string
          criteria?: string
          id?: string
          matched_count?: number
          name?: string
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      scoring_factors: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          name: string
          updated_at: string
          weight: number
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          name: string
          updated_at?: string
          weight?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          name?: string
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      team_members: {
        Row: {
          active: boolean
          capacity: number
          created_at: string
          email: string | null
          full_name: string
          id: string
          region: string
          role: string
          updated_at: string
          vala_id: string
        }
        Insert: {
          active?: boolean
          capacity?: number
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          region?: string
          role: string
          updated_at?: string
          vala_id: string
        }
        Update: {
          active?: boolean
          capacity?: number
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          region?: string
          role?: string
          updated_at?: string
          vala_id?: string
        }
        Relationships: []
      }
      territories: {
        Row: {
          continent: string
          country: string
          created_at: string
          id: string
          latitude: number
          longitude: number
          manager_vala_id: string | null
          name: string
          target_leads: number
          updated_at: string
        }
        Insert: {
          continent: string
          country: string
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          manager_vala_id?: string | null
          name: string
          target_leads?: number
          updated_at?: string
        }
        Update: {
          continent?: string
          country?: string
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          manager_vala_id?: string | null
          name?: string
          target_leads?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      escalation_status: "open" | "acknowledged" | "resolved"
      followup_status:
        | "pending"
        | "completed"
        | "overdue"
        | "missed"
        | "cancelled"
      lead_priority: "hot" | "warm" | "cold"
      lead_status: "new" | "contacted" | "demo" | "negotiation" | "won" | "lost"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      escalation_status: ["open", "acknowledged", "resolved"],
      followup_status: [
        "pending",
        "completed",
        "overdue",
        "missed",
        "cancelled",
      ],
      lead_priority: ["hot", "warm", "cold"],
      lead_status: ["new", "contacted", "demo", "negotiation", "won", "lost"],
    },
  },
} as const
