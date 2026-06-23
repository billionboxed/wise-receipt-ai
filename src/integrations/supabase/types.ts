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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      account_card_map: {
        Row: {
          account_id: string
          created_at: string
          id: string
          last4: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          last4: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          last4?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_card_map_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      account_sms_identifiers: {
        Row: {
          account_id: string
          created_at: string
          id: string
          identifier: string
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          identifier: string
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          identifier?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_sms_identifiers_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          created_at: string
          id: string
          name: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          combined: string
          created_at: string
          id: string
          main: string
          sub: string
          user_id: string
        }
        Insert: {
          combined: string
          created_at?: string
          id?: string
          main: string
          sub: string
          user_id: string
        }
        Update: {
          combined?: string
          created_at?: string
          id?: string
          main?: string
          sub?: string
          user_id?: string
        }
        Relationships: []
      }
      recurring_expenses: {
        Row: {
          account_id: string | null
          amount: number
          category_id: string | null
          created_at: string
          day_of_month: number | null
          description: string
          frequency: string
          id: string
          is_active: boolean | null
          last_added_date: string | null
          tag_ids: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category_id?: string | null
          created_at?: string
          day_of_month?: number | null
          description: string
          frequency?: string
          id?: string
          is_active?: boolean | null
          last_added_date?: string | null
          tag_ids?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string
          day_of_month?: number | null
          description?: string
          frequency?: string
          id?: string
          is_active?: boolean | null
          last_added_date?: string | null
          tag_ids?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_expenses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_ingested: {
        Row: {
          created_at: string
          id: string
          sms_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          sms_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          sms_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      sms_pending: {
        Row: {
          created_at: string
          id: string
          occurred_at: string | null
          parsed_amount: number
          parsed_date: string
          parsed_type: string
          sms_hash: string
          sms_raw: string | null
          sms_sender: string | null
          status: string
          suggested_account_id: string | null
          suggested_category_id: string | null
          suggested_description: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          occurred_at?: string | null
          parsed_amount: number
          parsed_date: string
          parsed_type?: string
          sms_hash: string
          sms_raw?: string | null
          sms_sender?: string | null
          status?: string
          suggested_account_id?: string | null
          suggested_category_id?: string | null
          suggested_description?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          occurred_at?: string | null
          parsed_amount?: number
          parsed_date?: string
          parsed_type?: string
          sms_hash?: string
          sms_raw?: string | null
          sms_sender?: string | null
          status?: string
          suggested_account_id?: string | null
          suggested_category_id?: string | null
          suggested_description?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sms_preferences: {
        Row: {
          created_at: string
          default_account_id: string | null
          enabled: boolean
          last_scan_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_account_id?: string | null
          enabled?: boolean
          last_scan_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_account_id?: string | null
          enabled?: boolean
          last_scan_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_preferences_default_account_id_fkey"
            columns: ["default_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          is_archived: boolean
          is_project: boolean
          name: string
          user_id: string
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          is_archived?: boolean
          is_project?: boolean
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_archived?: boolean
          is_project?: boolean
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string | null
          ai_suggested: boolean | null
          amount: number
          category_id: string | null
          created_at: string
          date: string
          description: string
          id: string
          recurring_expense_id: string | null
          sms_raw: string | null
          sms_reviewed: boolean
          sms_sender: string | null
          source: string
          status: string
          tag_ids: string[] | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          ai_suggested?: boolean | null
          amount: number
          category_id?: string | null
          created_at?: string
          date: string
          description: string
          id?: string
          recurring_expense_id?: string | null
          sms_raw?: string | null
          sms_reviewed?: boolean
          sms_sender?: string | null
          source?: string
          status?: string
          tag_ids?: string[] | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          ai_suggested?: boolean | null
          amount?: number
          category_id?: string | null
          created_at?: string
          date?: string
          description?: string
          id?: string
          recurring_expense_id?: string | null
          sms_raw?: string | null
          sms_reviewed?: boolean
          sms_sender?: string | null
          source?: string
          status?: string
          tag_ids?: string[] | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_recurring_expense_id_fkey"
            columns: ["recurring_expense_id"]
            isOneToOne: false
            referencedRelation: "recurring_expenses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
