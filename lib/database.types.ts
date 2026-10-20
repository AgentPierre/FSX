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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      business_hours: {
        Row: {
          closes_at: string | null
          day_of_week: number
          opens_at: string | null
        }
        Insert: {
          closes_at?: string | null
          day_of_week: number
          opens_at?: string | null
        }
        Update: {
          closes_at?: string | null
          day_of_week?: number
          opens_at?: string | null
        }
        Relationships: []
      }
      item_sizes: {
        Row: {
          id: string
          menu_item_id: string
          price_cents: number
          size_code: string
          sort_order: number
        }
        Insert: {
          id?: string
          menu_item_id: string
          price_cents: number
          size_code: string
          sort_order?: number
        }
        Update: {
          id?: string
          menu_item_id?: string
          price_cents?: number
          size_code?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "item_sizes_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_categories: {
        Row: {
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          category_id: string
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_available: boolean
          is_catering: boolean
          is_spicy_flag: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_id: string
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_available?: boolean
          is_catering?: boolean
          is_spicy_flag?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_available?: boolean
          is_catering?: boolean
          is_spicy_flag?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      order_line_components: {
        Row: {
          component_position: number
          id: string
          item_name_snapshot: string
          menu_item_id: string
          order_line_id: string
        }
        Insert: {
          component_position: number
          id?: string
          item_name_snapshot: string
          menu_item_id: string
          order_line_id: string
        }
        Update: {
          component_position?: number
          id?: string
          item_name_snapshot?: string
          menu_item_id?: string
          order_line_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_line_components_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_line_components_order_line_id_fkey"
            columns: ["order_line_id"]
            isOneToOne: false
            referencedRelation: "order_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      order_lines: {
        Row: {
          id: string
          instructions: string | null
          item_name_snapshot: string
          item_size_id: string
          order_id: string
          quantity: number
          size_code_snapshot: string
          spicy_requested: boolean
          unit_price_cents: number
        }
        Insert: {
          id?: string
          instructions?: string | null
          item_name_snapshot: string
          item_size_id: string
          order_id: string
          quantity: number
          size_code_snapshot: string
          spicy_requested?: boolean
          unit_price_cents: number
        }
        Update: {
          id?: string
          instructions?: string | null
          item_name_snapshot?: string
          item_size_id?: string
          order_id?: string
          quantity?: number
          size_code_snapshot?: string
          spicy_requested?: boolean
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_lines_item_size_id_fkey"
            columns: ["item_size_id"]
            isOneToOne: false
            referencedRelation: "item_sizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_log: {
        Row: {
          changed_at: string
          changed_by: string | null
          from_status: string | null
          id: string
          order_id: string
          status_kind: string
          to_status: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          from_status?: string | null
          id?: string
          order_id: string
          status_kind: string
          to_status: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          from_status?: string | null
          id?: string
          order_id?: string
          status_kind?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "staff_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          display_order_number: string
          earliest_pickup_at: string
          email_sent_at: string | null
          id: string
          payment_status: string
          pickup_at: string
          subtotal_cents: number
          tax_cents: number
          tax_rate: number
          ticket_status: string | null
          total_cents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          display_order_number: string
          earliest_pickup_at: string
          email_sent_at?: string | null
          id?: string
          payment_status?: string
          pickup_at: string
          subtotal_cents: number
          tax_cents: number
          tax_rate: number
          ticket_status?: string | null
          total_cents: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          display_order_number?: string
          earliest_pickup_at?: string
          email_sent_at?: string | null
          id?: string
          payment_status?: string
          pickup_at?: string
          subtotal_cents?: number
          tax_cents?: number
          tax_rate?: number
          ticket_status?: string | null
          total_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          order_id: string
          paid_at: string | null
          stripe_checkout_session_id: string
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          id?: string
          order_id: string
          paid_at?: string | null
          stripe_checkout_session_id: string
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          order_id?: string
          paid_at?: string | null
          stripe_checkout_session_id?: string
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      price_change_log: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          item_size_id: string
          new_price_cents: number
          old_price_cents: number
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          item_size_id: string
          new_price_cents: number
          old_price_cents: number
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          item_size_id?: string
          new_price_cents?: number
          old_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "price_change_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "staff_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_change_log_item_size_id_fkey"
            columns: ["item_size_id"]
            isOneToOne: false
            referencedRelation: "item_sizes"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          catering_lead_minutes: number
          id: number
          regular_lead_minutes: number
          tax_rate: number
          timezone: string
        }
        Insert: {
          catering_lead_minutes: number
          id?: number
          regular_lead_minutes: number
          tax_rate: number
          timezone?: string
        }
        Update: {
          catering_lead_minutes?: number
          id?: number
          regular_lead_minutes?: number
          tax_rate?: number
          timezone?: string
        }
        Relationships: []
      }
      staff_users: {
        Row: {
          id: string
          role: string
        }
        Insert: {
          id: string
          role: string
        }
        Update: {
          id?: string
          role?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      attach_checkout_session: {
        Args: { p_order_id: string; p_session_id: string }
        Returns: undefined
      }
      confirm_checkout_payment: {
        Args: { p_order_id: string; p_session_id: string }
        Returns: string
      }
      create_checkout_order: {
        Args: { p_earliest_pickup_at: string; p_order: Json }
        Returns: string
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
