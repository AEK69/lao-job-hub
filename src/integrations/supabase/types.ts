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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          new_value: Json | null
          old_value: Json | null
          target_id: string | null
          target_table: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          target_id?: string | null
          target_table?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          target_id?: string | null
          target_table?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      coin_transactions: {
        Row: {
          admin_id: string | null
          amount: number
          created_at: string
          description: string | null
          from_user_id: string | null
          id: string
          to_user_id: string
          type: string
          user_id: string | null
        }
        Insert: {
          admin_id?: string | null
          amount: number
          created_at?: string
          description?: string | null
          from_user_id?: string | null
          id?: string
          to_user_id: string
          type?: string
          user_id?: string | null
        }
        Update: {
          admin_id?: string | null
          amount?: number
          created_at?: string
          description?: string | null
          from_user_id?: string | null
          id?: string
          to_user_id?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          address: string | null
          company_name: string | null
          id: string
          logo_url: string | null
          phone: string | null
          receipt_footer: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          company_name?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          receipt_footer?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          company_name?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          receipt_footer?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          job_id: string | null
          last_message_at: string
          participant_1: string
          participant_2: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id?: string | null
          last_message_at?: string
          participant_1: string
          participant_2: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string | null
          last_message_at?: string
          participant_1?: string
          participant_2?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_images: {
        Row: {
          created_at: string | null
          id: string
          image_type: string | null
          image_url: string
          job_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_type?: string | null
          image_url: string
          job_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_type?: string | null
          image_url?: string
          job_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_images_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          address: string | null
          amount_paid: number | null
          assigned_staff_id: string | null
          base_price: number | null
          category: string | null
          created_at: string | null
          created_by: string | null
          customer_address: string | null
          customer_name: string | null
          customer_phone: string | null
          deposit_amount: number | null
          description: string | null
          discount: number | null
          district: string | null
          id: string
          image_url: string | null
          is_featured: boolean
          is_urgent: boolean
          job_number: string
          job_status: string | null
          job_type: string | null
          lat: number | null
          lng: number | null
          material_cost: number | null
          payment_method: string | null
          payment_status: string | null
          phone: string | null
          post_type: string | null
          poster_name: string | null
          priority: string | null
          salary: string | null
          salary_type: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          status: string
          title: string | null
          total_price: number | null
          updated_at: string | null
          user_id: string | null
          work_date: string | null
          work_time: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          address?: string | null
          amount_paid?: number | null
          assigned_staff_id?: string | null
          base_price?: number | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_address?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          deposit_amount?: number | null
          description?: string | null
          discount?: number | null
          district?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_urgent?: boolean
          job_number?: string
          job_status?: string | null
          job_type?: string | null
          lat?: number | null
          lng?: number | null
          material_cost?: number | null
          payment_method?: string | null
          payment_status?: string | null
          phone?: string | null
          post_type?: string | null
          poster_name?: string | null
          priority?: string | null
          salary?: string | null
          salary_type?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string
          title?: string | null
          total_price?: number | null
          updated_at?: string | null
          user_id?: string | null
          work_date?: string | null
          work_time?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          address?: string | null
          amount_paid?: number | null
          assigned_staff_id?: string | null
          base_price?: number | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_address?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          deposit_amount?: number | null
          description?: string | null
          discount?: number | null
          district?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_urgent?: boolean
          job_number?: string
          job_status?: string | null
          job_type?: string | null
          lat?: number | null
          lng?: number | null
          material_cost?: number | null
          payment_method?: string | null
          payment_status?: string | null
          phone?: string | null
          post_type?: string | null
          poster_name?: string | null
          priority?: string | null
          salary?: string | null
          salary_type?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string
          title?: string | null
          total_price?: number | null
          updated_at?: string | null
          user_id?: string | null
          work_date?: string | null
          work_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_assigned_staff_id_fkey"
            columns: ["assigned_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          id: string
          image_url: string | null
          is_read: boolean
          sender_id: string
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_read?: boolean
          sender_id: string
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_read?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          is_read: boolean
          job_id: string | null
          read: boolean | null
          sender_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean
          job_id?: string | null
          read?: boolean | null
          sender_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean
          job_id?: string | null
          read?: boolean | null
          sender_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          job_id: string | null
          method: string
          payment_type: string | null
          received_by: string | null
          reference_note: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          job_id?: string | null
          method: string
          payment_type?: string | null
          received_by?: string | null
          reference_note?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          job_id?: string | null
          method?: string
          payment_type?: string | null
          received_by?: string | null
          reference_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          bio: string | null
          coin_balance: number
          created_at: string
          date_of_birth: string | null
          display_name: string
          district: string | null
          full_name: string | null
          guardian_name: string | null
          guardian_phone: string | null
          id: string
          id_card_url: string | null
          is_student: boolean
          kyc_status: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          coin_balance?: number
          created_at?: string
          date_of_birth?: string | null
          display_name?: string
          district?: string | null
          full_name?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          id_card_url?: string | null
          is_student?: boolean
          kyc_status?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          coin_balance?: number
          created_at?: string
          date_of_birth?: string | null
          display_name?: string
          district?: string | null
          full_name?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          id_card_url?: string | null
          is_student?: boolean
          kyc_status?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          job_id: string | null
          rating: number
          reviewed_id: string
          reviewer_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          rating: number
          reviewed_id: string
          reviewer_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          rating?: number
          reviewed_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean | null
          base_price: number
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          active?: boolean | null
          base_price?: number
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          active?: boolean | null
          base_price?: number
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          created_at: string | null
          id: string
          name: string
          phone: string | null
          skills: string[] | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          phone?: string | null
          skills?: string[] | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          phone?: string | null
          skills?: string[] | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_topup_coins: {
        Args: { _amount: number; _description: string; _to_user_id: string }
        Returns: Json
      }
      admin_update_kyc: {
        Args: { _status: string; _target_user_id: string }
        Returns: boolean
      }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      spend_coins: {
        Args: { _amount: number; _description: string; _type: string }
        Returns: boolean
      }
      transfer_coins: {
        Args: { _amount: number; _description: string; _to_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
