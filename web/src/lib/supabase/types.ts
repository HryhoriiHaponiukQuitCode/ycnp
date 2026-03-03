export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      donations: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          donated_at: string | null
          donation_type: Database["public"]["Enums"]["donation_type"]
          donor_id: string
          fiscal_year_id: string
          id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string | null
          donated_at?: string | null
          donation_type?: Database["public"]["Enums"]["donation_type"]
          donor_id: string
          fiscal_year_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          donated_at?: string | null
          donation_type?: Database["public"]["Enums"]["donation_type"]
          donor_id?: string
          fiscal_year_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      donor_research: {
        Row: {
          content: Json
          created_at: string
          created_by: string | null
          donor_id: string
          id: string
          research_type: string
        }
        Insert: {
          content?: Json
          created_at?: string
          created_by?: string | null
          donor_id: string
          id?: string
          research_type: string
        }
        Update: {
          content?: Json
          created_at?: string
          created_by?: string | null
          donor_id?: string
          id?: string
          research_type?: string
        }
        Relationships: []
      }
      donor_scores: {
        Row: {
          ask_goal: number | null
          capacity_score: number | null
          created_at: string
          donor_fund_foundation: number | null
          donor_id: string
          fiscal_year_id: string
          five_years_in_row: number | null
          hunch: number | null
          id: string
          is_alumni: number | null
          is_board_member: number | null
          is_current_donor: number | null
          is_grandparent: number | null
          is_parent: number | null
          is_past_donor: number | null
          last_year_capacity: number | null
          last_year_prospect_score: number | null
          long_term_commitment: number | null
          major_donation_amount: number | null
          recent_1000_donation: number | null
          recent_major_donation: number | null
          updated_at: string
        }
        Insert: {
          ask_goal?: number | null
          capacity_score?: number | null
          created_at?: string
          donor_fund_foundation?: number | null
          donor_id: string
          fiscal_year_id: string
          five_years_in_row?: number | null
          hunch?: number | null
          id?: string
          is_alumni?: number | null
          is_board_member?: number | null
          is_current_donor?: number | null
          is_grandparent?: number | null
          is_parent?: number | null
          is_past_donor?: number | null
          last_year_capacity?: number | null
          last_year_prospect_score?: number | null
          long_term_commitment?: number | null
          major_donation_amount?: number | null
          recent_1000_donation?: number | null
          recent_major_donation?: number | null
          updated_at?: string
        }
        Update: {
          ask_goal?: number | null
          capacity_score?: number | null
          created_at?: string
          donor_fund_foundation?: number | null
          donor_id?: string
          fiscal_year_id?: string
          five_years_in_row?: number | null
          hunch?: number | null
          id?: string
          is_alumni?: number | null
          is_board_member?: number | null
          is_current_donor?: number | null
          is_grandparent?: number | null
          is_parent?: number | null
          is_past_donor?: number | null
          last_year_capacity?: number | null
          last_year_prospect_score?: number | null
          long_term_commitment?: number | null
          major_donation_amount?: number | null
          recent_1000_donation?: number | null
          recent_major_donation?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      donor_solicitor_assignments: {
        Row: {
          created_at: string
          donor_id: string
          fiscal_year_id: string
          id: string
          is_primary: boolean
          solicitor_id: string
        }
        Insert: {
          created_at?: string
          donor_id: string
          fiscal_year_id: string
          id?: string
          is_primary?: boolean
          solicitor_id: string
        }
        Update: {
          created_at?: string
          donor_id?: string
          fiscal_year_id?: string
          id?: string
          is_primary?: boolean
          solicitor_id?: string
        }
        Relationships: []
      }
      donor_tag_assignments: {
        Row: {
          donor_id: string
          tag_id: string
        }
        Insert: {
          donor_id: string
          tag_id: string
        }
        Update: {
          donor_id?: string
          tag_id?: string
        }
        Relationships: []
      }
      donor_tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: []
      }
      donors: {
        Row: {
          address: string | null
          ask_date: string | null
          ask_goal: number | null
          ask_method: Database["public"]["Enums"]["ask_method_enum"] | null
          ask_partner: string | null
          ask_purpose: string | null
          city: string | null
          created_at: string
          crm_account_id: string | null
          crm_account_number: string | null
          crm_link: string | null
          donor_interests: string | null
          email: string | null
          envelope_name: string | null
          first_name: string | null
          formal_name: string | null
          generosity_score: Database["public"]["Enums"]["generosity_score_enum"] | null
          home_phone: string | null
          household_name: string | null
          id: string
          informal_name: string | null
          last_name: string | null
          mail_merge_greeting: string | null
          mobile_phone: string | null
          moves_needed_override: number | null
          name: string
          organization_id: string
          previous_solicitor: string | null
          primary_phone: string | null
          profile_accuracy: Database["public"]["Enums"]["profile_accuracy_enum"] | null
          recognition_name: string | null
          relationship_to_organization: string | null
          state: string | null
          updated_at: string
          wealth_capacity: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          ask_date?: string | null
          ask_goal?: number | null
          ask_method?: Database["public"]["Enums"]["ask_method_enum"] | null
          ask_partner?: string | null
          ask_purpose?: string | null
          city?: string | null
          created_at?: string
          crm_account_id?: string | null
          crm_account_number?: string | null
          crm_link?: string | null
          donor_interests?: string | null
          email?: string | null
          envelope_name?: string | null
          first_name?: string | null
          formal_name?: string | null
          generosity_score?: Database["public"]["Enums"]["generosity_score_enum"] | null
          home_phone?: string | null
          household_name?: string | null
          id?: string
          informal_name?: string | null
          last_name?: string | null
          mail_merge_greeting?: string | null
          mobile_phone?: string | null
          moves_needed_override?: number | null
          name: string
          organization_id: string
          previous_solicitor?: string | null
          primary_phone?: string | null
          profile_accuracy?: Database["public"]["Enums"]["profile_accuracy_enum"] | null
          recognition_name?: string | null
          relationship_to_organization?: string | null
          state?: string | null
          updated_at?: string
          wealth_capacity?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          ask_date?: string | null
          ask_goal?: number | null
          ask_method?: Database["public"]["Enums"]["ask_method_enum"] | null
          ask_partner?: string | null
          ask_purpose?: string | null
          city?: string | null
          created_at?: string
          crm_account_id?: string | null
          crm_account_number?: string | null
          crm_link?: string | null
          donor_interests?: string | null
          email?: string | null
          envelope_name?: string | null
          first_name?: string | null
          formal_name?: string | null
          generosity_score?: Database["public"]["Enums"]["generosity_score_enum"] | null
          home_phone?: string | null
          household_name?: string | null
          id?: string
          informal_name?: string | null
          last_name?: string | null
          mail_merge_greeting?: string | null
          mobile_phone?: string | null
          moves_needed_override?: number | null
          name?: string
          organization_id?: string
          previous_solicitor?: string | null
          primary_phone?: string | null
          profile_accuracy?: Database["public"]["Enums"]["profile_accuracy_enum"] | null
          recognition_name?: string | null
          relationship_to_organization?: string | null
          state?: string | null
          updated_at?: string
          wealth_capacity?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      fiscal_years: {
        Row: {
          created_at: string
          end_date: string
          id: string
          is_current: boolean
          label: string
          organization_id: string
          start_date: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          is_current?: boolean
          label: string
          organization_id: string
          start_date: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          is_current?: boolean
          label?: string
          organization_id?: string
          start_date?: string
        }
        Relationships: []
      }
      meeting_notes: {
        Row: {
          created_at: string
          created_by: string | null
          donor_id: string
          follow_ups: string[] | null
          id: string
          key_outcomes: string[] | null
          meeting_date: string | null
          move_id: string | null
          organization_id: string
          raw_notes: string | null
          structured_notes: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          donor_id: string
          follow_ups?: string[] | null
          id?: string
          key_outcomes?: string[] | null
          meeting_date?: string | null
          move_id?: string | null
          organization_id: string
          raw_notes?: string | null
          structured_notes?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          donor_id?: string
          follow_ups?: string[] | null
          id?: string
          key_outcomes?: string[] | null
          meeting_date?: string | null
          move_id?: string | null
          organization_id?: string
          raw_notes?: string | null
          structured_notes?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      move_ideas: {
        Row: {
          created_at: string
          id: string
          is_global: boolean
          methods: string[] | null
          name: string
          notes: string | null
          organization_id: string
          purpose: string[] | null
          types: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_global?: boolean
          methods?: string[] | null
          name: string
          notes?: string | null
          organization_id: string
          purpose?: string[] | null
          types?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_global?: boolean
          methods?: string[] | null
          name?: string
          notes?: string | null
          organization_id?: string
          purpose?: string[] | null
          types?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      moves: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          donor_id: string
          due_date: string | null
          id: string
          is_completed: boolean
          month: string | null
          move_idea_id: string | null
          name: string
          notes: string | null
          organization_id: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          donor_id: string
          due_date?: string | null
          id?: string
          is_completed?: boolean
          month?: string | null
          move_idea_id?: string | null
          name: string
          notes?: string | null
          organization_id: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          donor_id?: string
          due_date?: string | null
          id?: string
          is_completed?: boolean
          month?: string | null
          move_idea_id?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      org_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          settings: Json | null
          slug: string
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          settings?: Json | null
          slug: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          settings?: Json | null
          slug?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      solicitor_fiscal_years: {
        Row: {
          created_at: string
          fiscal_year_id: string
          id: string
          letter_signature: string | null
          letter_signature_title: string | null
          solicitor_id: string
          title: string | null
        }
        Insert: {
          created_at?: string
          fiscal_year_id: string
          id?: string
          letter_signature?: string | null
          letter_signature_title?: string | null
          solicitor_id: string
          title?: string | null
        }
        Update: {
          created_at?: string
          fiscal_year_id?: string
          id?: string
          letter_signature?: string | null
          letter_signature_title?: string | null
          solicitor_id?: string
          title?: string | null
        }
        Relationships: []
      }
      solicitors: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      v_donor_summary: {
        Row: {
          ask_goal: number | null
          capacity_score: number | null
          city: string | null
          email: string | null
          first_name: string | null
          fiscal_year_label: string | null
          generosity_score: Database["public"]["Enums"]["generosity_score_enum"] | null
          hunch: number | null
          id: string | null
          is_current_donor: number | null
          last_name: string | null
          mobile_phone: string | null
          moves_completed: number | null
          moves_needed: number | null
          moves_scheduled: number | null
          name: string | null
          organization_id: string | null
          prospect_subtotal: number | null
          solicitor_name: string | null
          state: string | null
          total_score: number | null
          wealth_capacity: string | null
        }
        Relationships: []
      }
      v_moves_dashboard: {
        Row: {
          assigned_to_name: string | null
          completed_at: string | null
          donor_id: string | null
          donor_name: string | null
          donor_phone: string | null
          due_date: string | null
          id: string | null
          is_completed: boolean | null
          month: string | null
          move_name: string | null
          notes: string | null
          organization_id: string | null
          status: string | null
        }
        Relationships: []
      }
      v_solicitor_summary: {
        Row: {
          completion_percentage: number | null
          donor_count: number | null
          fiscal_year_label: string | null
          id: string | null
          moves_completed: number | null
          moves_scheduled: number | null
          name: string | null
          organization_id: string | null
          title: string | null
          total_moves_needed: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_user_org_ids: { Args: Record<string, never>; Returns: string[] }
      is_org_admin: { Args: { org_id: string }; Returns: boolean }
      is_org_member: { Args: { org_id: string }; Returns: boolean }
    }
    Enums: {
      ask_method_enum: "In Person" | "Phone" | "Phone call" | "Email" | "Text / WhatsApp"
      donation_type: "operating" | "restricted" | "capital" | "other"
      generosity_score_enum: "Cool" | "On Fire!" | "Hot" | "Cold" | "Warm" | "Not Scanned"
      org_role: "owner" | "admin" | "solicitor" | "viewer"
      profile_accuracy_enum: "High" | "Low"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"]
export type Views<T extends keyof Database["public"]["Views"]> =
  Database["public"]["Views"][T]["Row"]
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T]
