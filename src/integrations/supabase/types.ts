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
      activity_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          meta: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          meta?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          meta?: Json | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          last_message_at: string
          listing_id: string | null
          seller_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          last_message_at?: string
          listing_id?: string | null
          seller_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          last_message_at?: string
          listing_id?: string | null
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          buyer_id: string
          created_at: string
          details: string | null
          escrow_id: string | null
          id: string
          opened_by: string
          order_id: string
          reason: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          seller_id: string
          status: Database["public"]["Enums"]["dispute_status"]
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          details?: string | null
          escrow_id?: string | null
          id?: string
          opened_by: string
          order_id: string
          reason: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          seller_id: string
          status?: Database["public"]["Enums"]["dispute_status"]
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          details?: string | null
          escrow_id?: string | null
          id?: string
          opened_by?: string
          order_id?: string
          reason?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          seller_id?: string
          status?: Database["public"]["Enums"]["dispute_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_escrow_id_fkey"
            columns: ["escrow_id"]
            isOneToOne: false
            referencedRelation: "escrows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      escrow_events: {
        Row: {
          actor_id: string | null
          created_at: string
          escrow_id: string
          id: string
          note: string | null
          status: Database["public"]["Enums"]["escrow_status"]
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          escrow_id: string
          id?: string
          note?: string | null
          status: Database["public"]["Enums"]["escrow_status"]
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          escrow_id?: string
          id?: string
          note?: string | null
          status?: Database["public"]["Enums"]["escrow_status"]
        }
        Relationships: [
          {
            foreignKeyName: "escrow_events_escrow_id_fkey"
            columns: ["escrow_id"]
            isOneToOne: false
            referencedRelation: "escrows"
            referencedColumns: ["id"]
          },
        ]
      }
      escrows: {
        Row: {
          amount_usd: number
          buyer_id: string
          created_at: string
          delivered_at: string | null
          funded_at: string | null
          id: string
          order_id: string
          pi_payment_id: string | null
          pi_tx_id: string | null
          refunded_at: string | null
          released_at: string | null
          seller_id: string
          shipped_at: string | null
          status: Database["public"]["Enums"]["escrow_status"]
          updated_at: string
        }
        Insert: {
          amount_usd?: number
          buyer_id: string
          created_at?: string
          delivered_at?: string | null
          funded_at?: string | null
          id?: string
          order_id: string
          pi_payment_id?: string | null
          pi_tx_id?: string | null
          refunded_at?: string | null
          released_at?: string | null
          seller_id: string
          shipped_at?: string | null
          status?: Database["public"]["Enums"]["escrow_status"]
          updated_at?: string
        }
        Update: {
          amount_usd?: number
          buyer_id?: string
          created_at?: string
          delivered_at?: string | null
          funded_at?: string | null
          id?: string
          order_id?: string
          pi_payment_id?: string | null
          pi_tx_id?: string | null
          refunded_at?: string | null
          released_at?: string | null
          seller_id?: string
          shipped_at?: string | null
          status?: Database["public"]["Enums"]["escrow_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrows_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_contacts: {
        Row: {
          created_at: string
          listing_id: string
          seller_email: string | null
          seller_id: string
          seller_phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          listing_id: string
          seller_email?: string | null
          seller_id: string
          seller_phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          listing_id?: string
          seller_email?: string | null
          seller_id?: string
          seller_phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_contacts_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_media: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          media_type: string
          seller_id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          media_type?: string
          seller_id: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          media_type?: string
          seller_id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_media_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          brand: string | null
          category: string
          city: string | null
          condition: string | null
          country: string | null
          cover_image: string | null
          created_at: string
          description: string | null
          fuel: string | null
          id: string
          mileage: number | null
          model: string | null
          moderation_note: string | null
          moderation_status: Database["public"]["Enums"]["moderation_status"]
          negotiable: boolean
          price_usd: number
          pricing_mode: string
          seller_id: string
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          transmission: string | null
          updated_at: string
          views_count: number
          year: number | null
        }
        Insert: {
          brand?: string | null
          category: string
          city?: string | null
          condition?: string | null
          country?: string | null
          cover_image?: string | null
          created_at?: string
          description?: string | null
          fuel?: string | null
          id?: string
          mileage?: number | null
          model?: string | null
          moderation_note?: string | null
          moderation_status?: Database["public"]["Enums"]["moderation_status"]
          negotiable?: boolean
          price_usd?: number
          pricing_mode?: string
          seller_id: string
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
          transmission?: string | null
          updated_at?: string
          views_count?: number
          year?: number | null
        }
        Update: {
          brand?: string | null
          category?: string
          city?: string | null
          condition?: string | null
          country?: string | null
          cover_image?: string | null
          created_at?: string
          description?: string | null
          fuel?: string | null
          id?: string
          mileage?: number | null
          model?: string | null
          moderation_note?: string | null
          moderation_status?: Database["public"]["Enums"]["moderation_status"]
          negotiable?: boolean
          price_usd?: number
          pricing_mode?: string
          seller_id?: string
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
          transmission?: string | null
          updated_at?: string
          views_count?: number
          year?: number | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
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
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          amount_usd: number
          buyer_id: string
          created_at: string
          id: string
          listing_id: string
          message: string | null
          seller_id: string
          status: Database["public"]["Enums"]["offer_status"]
          updated_at: string
        }
        Insert: {
          amount_usd: number
          buyer_id: string
          created_at?: string
          id?: string
          listing_id: string
          message?: string | null
          seller_id: string
          status?: Database["public"]["Enums"]["offer_status"]
          updated_at?: string
        }
        Update: {
          amount_usd?: number
          buyer_id?: string
          created_at?: string
          id?: string
          listing_id?: string
          message?: string | null
          seller_id?: string
          status?: Database["public"]["Enums"]["offer_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          listing_id: string
          notes: string | null
          pi_tx_id: string | null
          price_usd: number
          seller_id: string
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          listing_id: string
          notes?: string | null
          pi_tx_id?: string | null
          price_usd: number
          seller_id: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          listing_id?: string
          notes?: string | null
          pi_tx_id?: string | null
          price_usd?: number
          seller_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      pi_payouts: {
        Row: {
          amount_pi: number
          amount_usd: number
          created_at: string
          error: string | null
          escrow_id: string
          id: string
          kind: string
          network: string
          pi_payment_id: string | null
          pi_tx_id: string | null
          recipient_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount_pi: number
          amount_usd: number
          created_at?: string
          error?: string | null
          escrow_id: string
          id?: string
          kind: string
          network?: string
          pi_payment_id?: string | null
          pi_tx_id?: string | null
          recipient_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount_pi?: number
          amount_usd?: number
          created_at?: string
          error?: string | null
          escrow_id?: string
          id?: string
          kind?: string
          network?: string
          pi_payment_id?: string | null
          pi_tx_id?: string | null
          recipient_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pi_payouts_escrow_id_fkey"
            columns: ["escrow_id"]
            isOneToOne: false
            referencedRelation: "escrows"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_contacts: {
        Row: {
          created_at: string
          email: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          biography: string | null
          city: string | null
          country: string | null
          created_at: string
          currency: string | null
          dealer_tier: string
          full_name: string | null
          id: string
          join_date: string
          language: string | null
          pi_sandbox: boolean
          pi_uid: string | null
          pi_username: string | null
          updated_at: string
          username: string | null
          verified: boolean
        }
        Insert: {
          avatar_url?: string | null
          biography?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          dealer_tier?: string
          full_name?: string | null
          id: string
          join_date?: string
          language?: string | null
          pi_sandbox?: boolean
          pi_uid?: string | null
          pi_username?: string | null
          updated_at?: string
          username?: string | null
          verified?: boolean
        }
        Update: {
          avatar_url?: string | null
          biography?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          dealer_tier?: string
          full_name?: string | null
          id?: string
          join_date?: string
          language?: string | null
          pi_sandbox?: boolean
          pi_uid?: string | null
          pi_username?: string | null
          updated_at?: string
          username?: string | null
          verified?: boolean
        }
        Relationships: []
      }
      recently_viewed: {
        Row: {
          listing_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          listing_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          listing_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recently_viewed_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          handled_at: string | null
          handled_by: string | null
          id: string
          reason: string
          reporter_id: string
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          reason: string
          reporter_id: string
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          buyer_id: string
          comment: string | null
          created_at: string
          id: string
          order_id: string | null
          rating: number
          seller_id: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          rating: number
          seller_id: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          rating?: number
          seller_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_requests: {
        Row: {
          created_at: string
          document_type: string
          document_url: string | null
          full_legal_name: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["verification_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_type: string
          document_url?: string | null
          full_legal_name: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_type?: string
          document_url?: string | null
          full_legal_name?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          updated_at?: string
          user_id?: string
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
      app_role: "admin" | "moderator" | "user"
      dispute_status:
        | "open"
        | "under_review"
        | "resolved_buyer"
        | "resolved_seller"
        | "closed"
      escrow_status:
        | "awaiting_payment"
        | "funded"
        | "shipped"
        | "delivered"
        | "released"
        | "refunded"
        | "disputed"
        | "cancelled"
      listing_status: "draft" | "active" | "reserved" | "sold" | "archived"
      moderation_status: "pending" | "approved" | "rejected"
      offer_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "withdrawn"
        | "expired"
      order_status:
        | "pending"
        | "paid"
        | "shipped"
        | "completed"
        | "cancelled"
        | "refunded"
      report_status: "open" | "reviewing" | "actioned" | "dismissed"
      verification_status: "pending" | "approved" | "rejected"
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
      app_role: ["admin", "moderator", "user"],
      dispute_status: [
        "open",
        "under_review",
        "resolved_buyer",
        "resolved_seller",
        "closed",
      ],
      escrow_status: [
        "awaiting_payment",
        "funded",
        "shipped",
        "delivered",
        "released",
        "refunded",
        "disputed",
        "cancelled",
      ],
      listing_status: ["draft", "active", "reserved", "sold", "archived"],
      moderation_status: ["pending", "approved", "rejected"],
      offer_status: ["pending", "accepted", "rejected", "withdrawn", "expired"],
      order_status: [
        "pending",
        "paid",
        "shipped",
        "completed",
        "cancelled",
        "refunded",
      ],
      report_status: ["open", "reviewing", "actioned", "dismissed"],
      verification_status: ["pending", "approved", "rejected"],
    },
  },
} as const
