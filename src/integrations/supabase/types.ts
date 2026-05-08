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
      inventorydetails: {
        Row: {
          barcode: string | null
          batchnumber: string
          costprice: number
          created_at: string
          expirydate: string
          inventorydetailid: number
          itemid: number
          locationid: number
          notes: string | null
          quantity: number
          receiveddate: string
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          batchnumber: string
          costprice?: number
          created_at?: string
          expirydate: string
          inventorydetailid?: number
          itemid: number
          locationid: number
          notes?: string | null
          quantity?: number
          receiveddate?: string
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          batchnumber?: string
          costprice?: number
          created_at?: string
          expirydate?: string
          inventorydetailid?: number
          itemid?: number
          locationid?: number
          notes?: string | null
          quantity?: number
          receiveddate?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventorydetails_itemid_fkey"
            columns: ["itemid"]
            isOneToOne: false
            referencedRelation: "the_items"
            referencedColumns: ["itemid"]
          },
          {
            foreignKeyName: "inventorydetails_locationid_fkey"
            columns: ["locationid"]
            isOneToOne: false
            referencedRelation: "the_storagelocations"
            referencedColumns: ["locationid"]
          },
        ]
      }
      the_itemdetails: {
        Row: {
          barcode: string | null
          conversionfactor: number
          created_at: string
          isdefaultsaleunit: boolean
          itemdetailid: number
          itemid: number
          saleprice: number
          unitid: number
          wholesaleprice: number
        }
        Insert: {
          barcode?: string | null
          conversionfactor?: number
          created_at?: string
          isdefaultsaleunit?: boolean
          itemdetailid?: number
          itemid: number
          saleprice?: number
          unitid: number
          wholesaleprice?: number
        }
        Update: {
          barcode?: string | null
          conversionfactor?: number
          created_at?: string
          isdefaultsaleunit?: boolean
          itemdetailid?: number
          itemid?: number
          saleprice?: number
          unitid?: number
          wholesaleprice?: number
        }
        Relationships: [
          {
            foreignKeyName: "the_itemdetails_itemid_fkey"
            columns: ["itemid"]
            isOneToOne: false
            referencedRelation: "the_items"
            referencedColumns: ["itemid"]
          },
          {
            foreignKeyName: "the_itemdetails_unitid_fkey"
            columns: ["unitid"]
            isOneToOne: false
            referencedRelation: "the_units"
            referencedColumns: ["unitid"]
          },
        ]
      }
      the_items: {
        Row: {
          baseunitid: number | null
          category: string | null
          created_at: string
          isactive: boolean
          itemcode: string
          itemid: number
          itemname: string
          itemnamear: string | null
          manufacturer: string | null
          notes: string | null
          reorderlevel: number
          scientificname: string | null
          taxrate: number
          updated_at: string
        }
        Insert: {
          baseunitid?: number | null
          category?: string | null
          created_at?: string
          isactive?: boolean
          itemcode: string
          itemid?: number
          itemname: string
          itemnamear?: string | null
          manufacturer?: string | null
          notes?: string | null
          reorderlevel?: number
          scientificname?: string | null
          taxrate?: number
          updated_at?: string
        }
        Update: {
          baseunitid?: number | null
          category?: string | null
          created_at?: string
          isactive?: boolean
          itemcode?: string
          itemid?: number
          itemname?: string
          itemnamear?: string | null
          manufacturer?: string | null
          notes?: string | null
          reorderlevel?: number
          scientificname?: string | null
          taxrate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "the_items_baseunitid_fkey"
            columns: ["baseunitid"]
            isOneToOne: false
            referencedRelation: "the_units"
            referencedColumns: ["unitid"]
          },
        ]
      }
      the_storagelocations: {
        Row: {
          created_at: string
          isactive: boolean
          locationcode: string
          locationid: number
          locationname: string
          locationnamear: string | null
        }
        Insert: {
          created_at?: string
          isactive?: boolean
          locationcode: string
          locationid?: number
          locationname: string
          locationnamear?: string | null
        }
        Update: {
          created_at?: string
          isactive?: boolean
          locationcode?: string
          locationid?: number
          locationname?: string
          locationnamear?: string | null
        }
        Relationships: []
      }
      the_transfer: {
        Row: {
          created_at: string
          createdby: string | null
          fromlocationid: number
          notes: string | null
          postedat: string | null
          status: string
          tolocationid: number
          transferdate: string
          transferid: number
          transfernumber: string
        }
        Insert: {
          created_at?: string
          createdby?: string | null
          fromlocationid: number
          notes?: string | null
          postedat?: string | null
          status?: string
          tolocationid: number
          transferdate?: string
          transferid?: number
          transfernumber: string
        }
        Update: {
          created_at?: string
          createdby?: string | null
          fromlocationid?: number
          notes?: string | null
          postedat?: string | null
          status?: string
          tolocationid?: number
          transferdate?: string
          transferid?: number
          transfernumber?: string
        }
        Relationships: [
          {
            foreignKeyName: "the_transfer_fromlocationid_fkey"
            columns: ["fromlocationid"]
            isOneToOne: false
            referencedRelation: "the_storagelocations"
            referencedColumns: ["locationid"]
          },
          {
            foreignKeyName: "the_transfer_tolocationid_fkey"
            columns: ["tolocationid"]
            isOneToOne: false
            referencedRelation: "the_storagelocations"
            referencedColumns: ["locationid"]
          },
        ]
      }
      the_transferdetails: {
        Row: {
          batchnumber: string
          costprice: number
          expirydate: string
          itemid: number
          quantity: number
          sourceinventorydetailid: number
          transferdetailid: number
          transferid: number
        }
        Insert: {
          batchnumber: string
          costprice?: number
          expirydate: string
          itemid: number
          quantity: number
          sourceinventorydetailid: number
          transferdetailid?: number
          transferid: number
        }
        Update: {
          batchnumber?: string
          costprice?: number
          expirydate?: string
          itemid?: number
          quantity?: number
          sourceinventorydetailid?: number
          transferdetailid?: number
          transferid?: number
        }
        Relationships: [
          {
            foreignKeyName: "the_transferdetails_itemid_fkey"
            columns: ["itemid"]
            isOneToOne: false
            referencedRelation: "the_items"
            referencedColumns: ["itemid"]
          },
          {
            foreignKeyName: "the_transferdetails_sourceinventorydetailid_fkey"
            columns: ["sourceinventorydetailid"]
            isOneToOne: false
            referencedRelation: "inventorydetails"
            referencedColumns: ["inventorydetailid"]
          },
          {
            foreignKeyName: "the_transferdetails_transferid_fkey"
            columns: ["transferid"]
            isOneToOne: false
            referencedRelation: "the_transfer"
            referencedColumns: ["transferid"]
          },
        ]
      }
      the_units: {
        Row: {
          created_at: string
          isbaseunit: boolean
          unitid: number
          unitname: string
          unitnamear: string | null
        }
        Insert: {
          created_at?: string
          isbaseunit?: boolean
          unitid?: number
          unitname: string
          unitnamear?: string | null
        }
        Update: {
          created_at?: string
          isbaseunit?: boolean
          unitid?: number
          unitname?: string
          unitnamear?: string | null
        }
        Relationships: []
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
          role?: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      post_transfer: { Args: { _transfer_id: number }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "pharmacist" | "viewer"
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
      app_role: ["admin", "pharmacist", "viewer"],
    },
  },
} as const
