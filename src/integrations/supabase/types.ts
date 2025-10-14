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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      employees: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          birth_date: string | null
          city: string | null
          country: string | null
          created_at: string
          department: string | null
          email: string
          emergency_email: string | null
          emergency_name: string | null
          emergency_phone: string | null
          emergency_relation: string | null
          employment_type: string | null
          end_date: string | null
          full_name: string
          gender: string | null
          id: string
          job_title: string | null
          location: string | null
          manager_profile_id: string | null
          nationality: string | null
          org_id: string
          personal_email: string | null
          phone_mobile: string | null
          postal_code: string | null
          preferred_name: string | null
          pronouns: string | null
          start_date: string | null
          state: string | null
          status: Database["public"]["Enums"]["employee_status"]
          updated_at: string
          work_email: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          birth_date?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          department?: string | null
          email: string
          emergency_email?: string | null
          emergency_name?: string | null
          emergency_phone?: string | null
          emergency_relation?: string | null
          employment_type?: string | null
          end_date?: string | null
          full_name: string
          gender?: string | null
          id?: string
          job_title?: string | null
          location?: string | null
          manager_profile_id?: string | null
          nationality?: string | null
          org_id: string
          personal_email?: string | null
          phone_mobile?: string | null
          postal_code?: string | null
          preferred_name?: string | null
          pronouns?: string | null
          start_date?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          updated_at?: string
          work_email?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          birth_date?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          department?: string | null
          email?: string
          emergency_email?: string | null
          emergency_name?: string | null
          emergency_phone?: string | null
          emergency_relation?: string | null
          employment_type?: string | null
          end_date?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          job_title?: string | null
          location?: string | null
          manager_profile_id?: string | null
          nationality?: string | null
          org_id?: string
          personal_email?: string | null
          phone_mobile?: string | null
          postal_code?: string | null
          preferred_name?: string | null
          pronouns?: string | null
          start_date?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          updated_at?: string
          work_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_manager_profile_id_fkey"
            columns: ["manager_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_templates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          org_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          org_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_settings: {
        Row: {
          created_at: string | null
          employee_system_fields: Json | null
          org_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          employee_system_fields?: Json | null
          org_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          employee_system_fields?: Json | null
          org_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          name: string
          timezone: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          timezone?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          timezone?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          org_id: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          org_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          org_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      run_step_instances: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          due_at: string | null
          id: string
          ordinal: number
          org_id: string
          payload: Json | null
          run_id: string
          status: string
          workflow_step_id: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          due_at?: string | null
          id?: string
          ordinal: number
          org_id: string
          payload?: Json | null
          run_id: string
          status?: string
          workflow_step_id: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          due_at?: string | null
          id?: string
          ordinal?: number
          org_id?: string
          payload?: Json | null
          run_id?: string
          status?: string
          workflow_step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "run_step_instances_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "run_step_instances_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "run_step_instances_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "run_step_instances_workflow_step_id_fkey"
            columns: ["workflow_step_id"]
            isOneToOne: false
            referencedRelation: "workflow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      runs: {
        Row: {
          completed_at: string | null
          employee_id: string
          id: string
          org_id: string
          started_at: string | null
          started_by: string | null
          status: string
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          employee_id: string
          id?: string
          org_id: string
          started_at?: string | null
          started_by?: string | null
          status?: string
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          employee_id?: string
          id?: string
          org_id?: string
          started_at?: string | null
          started_by?: string | null
          status?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "runs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runs_started_by_fkey"
            columns: ["started_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      template_steps: {
        Row: {
          auto_advance: boolean | null
          config: Json | null
          due_days_from_start: number | null
          id: string
          ordinal: number
          owner_role: Database["public"]["Enums"]["user_role"]
          template_id: string
          title: string
          type: Database["public"]["Enums"]["step_type"]
        }
        Insert: {
          auto_advance?: boolean | null
          config?: Json | null
          due_days_from_start?: number | null
          id?: string
          ordinal: number
          owner_role: Database["public"]["Enums"]["user_role"]
          template_id: string
          title: string
          type: Database["public"]["Enums"]["step_type"]
        }
        Update: {
          auto_advance?: boolean | null
          config?: Json | null
          due_days_from_start?: number | null
          id?: string
          ordinal?: number
          owner_role?: Database["public"]["Enums"]["user_role"]
          template_id?: string
          title?: string
          type?: Database["public"]["Enums"]["step_type"]
        }
        Relationships: [
          {
            foreignKeyName: "template_steps_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "onboarding_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          profile_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          profile_id?: string | null
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          profile_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_steps: {
        Row: {
          auto_advance: boolean | null
          config: Json | null
          due_days_from_start: number | null
          id: string
          ordinal: number
          owner_role: Database["public"]["Enums"]["user_role"]
          title: string
          type: Database["public"]["Enums"]["step_type"]
          workflow_id: string
        }
        Insert: {
          auto_advance?: boolean | null
          config?: Json | null
          due_days_from_start?: number | null
          id?: string
          ordinal: number
          owner_role: Database["public"]["Enums"]["user_role"]
          title: string
          type: Database["public"]["Enums"]["step_type"]
          workflow_id: string
        }
        Update: {
          auto_advance?: boolean | null
          config?: Json | null
          due_days_from_start?: number | null
          id?: string
          ordinal?: number
          owner_role?: Database["public"]["Enums"]["user_role"]
          title?: string
          type?: Database["public"]["Enums"]["step_type"]
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          org_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          org_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflows_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_org_id: {
        Args: { _user_id: string }
        Returns: string
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_can_access_org: {
        Args: { _org_id: string }
        Returns: boolean
      }
    }
    Enums: {
      employee_status:
        | "active"
        | "inactive"
        | "on_leave"
        | "candidate"
        | "onboarding"
        | "offboarded"
      step_type: "form" | "task" | "email" | "signature" | "wait"
      user_role: "admin" | "hr" | "manager" | "it" | "employee"
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
      employee_status: [
        "active",
        "inactive",
        "on_leave",
        "candidate",
        "onboarding",
        "offboarded",
      ],
      step_type: ["form", "task", "email", "signature", "wait"],
      user_role: ["admin", "hr", "manager", "it", "employee"],
    },
  },
} as const
