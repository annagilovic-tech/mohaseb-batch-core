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
      inventory_transactions: {
        Row: {
          created_at: string
          created_by: string | null
          destination_location_id: number | null
          inventory_detail_id: number | null
          item_id: number
          quantity: number
          reference_id: number | null
          reference_type: string | null
          source_location_id: number | null
          transaction_id: number
          transaction_type: string
          unit_cost: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          destination_location_id?: number | null
          inventory_detail_id?: number | null
          item_id: number
          quantity: number
          reference_id?: number | null
          reference_type?: string | null
          source_location_id?: number | null
          transaction_id?: number
          transaction_type: string
          unit_cost?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          destination_location_id?: number | null
          inventory_detail_id?: number | null
          item_id?: number
          quantity?: number
          reference_id?: number | null
          reference_type?: string | null
          source_location_id?: number | null
          transaction_id?: number
          transaction_type?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_destination_location_id_fkey"
            columns: ["destination_location_id"]
            isOneToOne: false
            referencedRelation: "the_storagelocations"
            referencedColumns: ["locationid"]
          },
          {
            foreignKeyName: "inventory_transactions_inventory_detail_id_fkey"
            columns: ["inventory_detail_id"]
            isOneToOne: false
            referencedRelation: "inventorydetails"
            referencedColumns: ["inventorydetailid"]
          },
          {
            foreignKeyName: "inventory_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "the_items"
            referencedColumns: ["itemid"]
          },
          {
            foreignKeyName: "inventory_transactions_source_location_id_fkey"
            columns: ["source_location_id"]
            isOneToOne: false
            referencedRelation: "the_storagelocations"
            referencedColumns: ["locationid"]
          },
        ]
      }
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
      the_accounts: {
        Row: {
          accountcode: string
          accountid: number
          accountname: string
          accountnamear: string | null
          accounttype: string
          allowposting: boolean
          created_at: string
          isactive: boolean
          notes: string | null
          parentaccountid: number | null
          updated_at: string
        }
        Insert: {
          accountcode: string
          accountid?: number
          accountname: string
          accountnamear?: string | null
          accounttype: string
          allowposting?: boolean
          created_at?: string
          isactive?: boolean
          notes?: string | null
          parentaccountid?: number | null
          updated_at?: string
        }
        Update: {
          accountcode?: string
          accountid?: number
          accountname?: string
          accountnamear?: string | null
          accounttype?: string
          allowposting?: boolean
          created_at?: string
          isactive?: boolean
          notes?: string | null
          parentaccountid?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "the_accounts_parentaccountid_fkey"
            columns: ["parentaccountid"]
            isOneToOne: false
            referencedRelation: "the_accounts"
            referencedColumns: ["accountid"]
          },
        ]
      }
      the_cashboxes: {
        Row: {
          accountid: number
          cashboxcode: string
          cashboxid: number
          cashboxname: string
          cashboxnamear: string | null
          created_at: string
          currency: string
          isactive: boolean
        }
        Insert: {
          accountid: number
          cashboxcode: string
          cashboxid?: number
          cashboxname: string
          cashboxnamear?: string | null
          created_at?: string
          currency?: string
          isactive?: boolean
        }
        Update: {
          accountid?: number
          cashboxcode?: string
          cashboxid?: number
          cashboxname?: string
          cashboxnamear?: string | null
          created_at?: string
          currency?: string
          isactive?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "the_cashboxes_accountid_fkey"
            columns: ["accountid"]
            isOneToOne: false
            referencedRelation: "the_accounts"
            referencedColumns: ["accountid"]
          },
        ]
      }
      the_customers: {
        Row: {
          address: string | null
          created_at: string
          creditlimit: number
          customercode: string
          customerid: number
          customername: string
          customernamear: string | null
          email: string | null
          isactive: boolean
          notes: string | null
          phone: string | null
          receivable_accountid: number | null
          taxnumber: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          creditlimit?: number
          customercode: string
          customerid?: number
          customername: string
          customernamear?: string | null
          email?: string | null
          isactive?: boolean
          notes?: string | null
          phone?: string | null
          receivable_accountid?: number | null
          taxnumber?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          creditlimit?: number
          customercode?: string
          customerid?: number
          customername?: string
          customernamear?: string | null
          email?: string | null
          isactive?: boolean
          notes?: string | null
          phone?: string | null
          receivable_accountid?: number | null
          taxnumber?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "the_customers_receivable_accountid_fkey"
            columns: ["receivable_accountid"]
            isOneToOne: false
            referencedRelation: "the_accounts"
            referencedColumns: ["accountid"]
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
      the_journalentries: {
        Row: {
          created_at: string
          created_by: string | null
          entrydate: string
          entryid: number
          entrynumber: string
          notes: string | null
          postedat: string | null
          reference_id: number | null
          reference_type: string | null
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entrydate?: string
          entryid?: number
          entrynumber: string
          notes?: string | null
          postedat?: string | null
          reference_id?: number | null
          reference_type?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entrydate?: string
          entryid?: number
          entrynumber?: string
          notes?: string | null
          postedat?: string | null
          reference_id?: number | null
          reference_type?: string | null
          status?: string
        }
        Relationships: []
      }
      the_journalentrylines: {
        Row: {
          accountid: number
          credit: number
          debit: number
          entryid: number
          lineid: number
          notes: string | null
        }
        Insert: {
          accountid: number
          credit?: number
          debit?: number
          entryid: number
          lineid?: number
          notes?: string | null
        }
        Update: {
          accountid?: number
          credit?: number
          debit?: number
          entryid?: number
          lineid?: number
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "the_journalentrylines_accountid_fkey"
            columns: ["accountid"]
            isOneToOne: false
            referencedRelation: "the_accounts"
            referencedColumns: ["accountid"]
          },
          {
            foreignKeyName: "the_journalentrylines_entryid_fkey"
            columns: ["entryid"]
            isOneToOne: false
            referencedRelation: "the_journalentries"
            referencedColumns: ["entryid"]
          },
        ]
      }
      the_paymentmethods: {
        Row: {
          accountid: number
          created_at: string
          isactive: boolean
          methodcode: string
          methodname: string
          methodnamear: string | null
          paymentmethodid: number
        }
        Insert: {
          accountid: number
          created_at?: string
          isactive?: boolean
          methodcode: string
          methodname: string
          methodnamear?: string | null
          paymentmethodid?: number
        }
        Update: {
          accountid?: number
          created_at?: string
          isactive?: boolean
          methodcode?: string
          methodname?: string
          methodnamear?: string | null
          paymentmethodid?: number
        }
        Relationships: [
          {
            foreignKeyName: "the_paymentmethods_accountid_fkey"
            columns: ["accountid"]
            isOneToOne: false
            referencedRelation: "the_accounts"
            referencedColumns: ["accountid"]
          },
        ]
      }
      the_purchaseinvoice: {
        Row: {
          created_at: string
          created_by: string | null
          destinationlocationid: number
          inventory_accountid: number
          invoicedate: string
          invoiceid: number
          invoicenumber: string
          notes: string | null
          payable_accountid: number
          postedat: string | null
          status: string
          supplierid: number
          totalamount: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          destinationlocationid: number
          inventory_accountid: number
          invoicedate?: string
          invoiceid?: number
          invoicenumber: string
          notes?: string | null
          payable_accountid: number
          postedat?: string | null
          status?: string
          supplierid: number
          totalamount?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          destinationlocationid?: number
          inventory_accountid?: number
          invoicedate?: string
          invoiceid?: number
          invoicenumber?: string
          notes?: string | null
          payable_accountid?: number
          postedat?: string | null
          status?: string
          supplierid?: number
          totalamount?: number
        }
        Relationships: [
          {
            foreignKeyName: "the_purchaseinvoice_destinationlocationid_fkey"
            columns: ["destinationlocationid"]
            isOneToOne: false
            referencedRelation: "the_storagelocations"
            referencedColumns: ["locationid"]
          },
          {
            foreignKeyName: "the_purchaseinvoice_inventory_accountid_fkey"
            columns: ["inventory_accountid"]
            isOneToOne: false
            referencedRelation: "the_accounts"
            referencedColumns: ["accountid"]
          },
          {
            foreignKeyName: "the_purchaseinvoice_payable_accountid_fkey"
            columns: ["payable_accountid"]
            isOneToOne: false
            referencedRelation: "the_accounts"
            referencedColumns: ["accountid"]
          },
          {
            foreignKeyName: "the_purchaseinvoice_supplierid_fkey"
            columns: ["supplierid"]
            isOneToOne: false
            referencedRelation: "the_suppliers"
            referencedColumns: ["supplierid"]
          },
        ]
      }
      the_purchaseinvoicedetails: {
        Row: {
          barcode: string | null
          batchnumber: string
          costprice: number
          expirydate: string
          invoicedetailid: number
          invoiceid: number
          itemid: number
          quantity: number
        }
        Insert: {
          barcode?: string | null
          batchnumber: string
          costprice: number
          expirydate: string
          invoicedetailid?: number
          invoiceid: number
          itemid: number
          quantity: number
        }
        Update: {
          barcode?: string | null
          batchnumber?: string
          costprice?: number
          expirydate?: string
          invoicedetailid?: number
          invoiceid?: number
          itemid?: number
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "the_purchaseinvoicedetails_invoiceid_fkey"
            columns: ["invoiceid"]
            isOneToOne: false
            referencedRelation: "the_purchaseinvoice"
            referencedColumns: ["invoiceid"]
          },
          {
            foreignKeyName: "the_purchaseinvoicedetails_itemid_fkey"
            columns: ["itemid"]
            isOneToOne: false
            referencedRelation: "the_items"
            referencedColumns: ["itemid"]
          },
        ]
      }
      the_salesinvoice: {
        Row: {
          cogs_accountid: number
          created_at: string
          created_by: string | null
          customerid: number
          inventory_accountid: number
          invoicedate: string
          invoiceid: number
          invoicenumber: string
          notes: string | null
          postedat: string | null
          receivable_accountid: number
          revenue_accountid: number
          sourcelocationid: number
          status: string
          totalamount: number
          totalcogs: number
        }
        Insert: {
          cogs_accountid: number
          created_at?: string
          created_by?: string | null
          customerid: number
          inventory_accountid: number
          invoicedate?: string
          invoiceid?: number
          invoicenumber: string
          notes?: string | null
          postedat?: string | null
          receivable_accountid: number
          revenue_accountid: number
          sourcelocationid: number
          status?: string
          totalamount?: number
          totalcogs?: number
        }
        Update: {
          cogs_accountid?: number
          created_at?: string
          created_by?: string | null
          customerid?: number
          inventory_accountid?: number
          invoicedate?: string
          invoiceid?: number
          invoicenumber?: string
          notes?: string | null
          postedat?: string | null
          receivable_accountid?: number
          revenue_accountid?: number
          sourcelocationid?: number
          status?: string
          totalamount?: number
          totalcogs?: number
        }
        Relationships: [
          {
            foreignKeyName: "the_salesinvoice_cogs_accountid_fkey"
            columns: ["cogs_accountid"]
            isOneToOne: false
            referencedRelation: "the_accounts"
            referencedColumns: ["accountid"]
          },
          {
            foreignKeyName: "the_salesinvoice_customerid_fkey"
            columns: ["customerid"]
            isOneToOne: false
            referencedRelation: "the_customers"
            referencedColumns: ["customerid"]
          },
          {
            foreignKeyName: "the_salesinvoice_inventory_accountid_fkey"
            columns: ["inventory_accountid"]
            isOneToOne: false
            referencedRelation: "the_accounts"
            referencedColumns: ["accountid"]
          },
          {
            foreignKeyName: "the_salesinvoice_receivable_accountid_fkey"
            columns: ["receivable_accountid"]
            isOneToOne: false
            referencedRelation: "the_accounts"
            referencedColumns: ["accountid"]
          },
          {
            foreignKeyName: "the_salesinvoice_revenue_accountid_fkey"
            columns: ["revenue_accountid"]
            isOneToOne: false
            referencedRelation: "the_accounts"
            referencedColumns: ["accountid"]
          },
          {
            foreignKeyName: "the_salesinvoice_sourcelocationid_fkey"
            columns: ["sourcelocationid"]
            isOneToOne: false
            referencedRelation: "the_storagelocations"
            referencedColumns: ["locationid"]
          },
        ]
      }
      the_salesinvoicedetails: {
        Row: {
          costprice: number
          invoicedetailid: number
          invoiceid: number
          itemid: number
          quantity: number
          saleprice: number
        }
        Insert: {
          costprice?: number
          invoicedetailid?: number
          invoiceid: number
          itemid: number
          quantity: number
          saleprice: number
        }
        Update: {
          costprice?: number
          invoicedetailid?: number
          invoiceid?: number
          itemid?: number
          quantity?: number
          saleprice?: number
        }
        Relationships: [
          {
            foreignKeyName: "the_salesinvoicedetails_invoiceid_fkey"
            columns: ["invoiceid"]
            isOneToOne: false
            referencedRelation: "the_salesinvoice"
            referencedColumns: ["invoiceid"]
          },
          {
            foreignKeyName: "the_salesinvoicedetails_itemid_fkey"
            columns: ["itemid"]
            isOneToOne: false
            referencedRelation: "the_items"
            referencedColumns: ["itemid"]
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
      the_suppliers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          isactive: boolean
          notes: string | null
          payable_accountid: number | null
          phone: string | null
          suppliercode: string
          supplierid: number
          suppliername: string
          suppliernamear: string | null
          taxnumber: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          isactive?: boolean
          notes?: string | null
          payable_accountid?: number | null
          phone?: string | null
          suppliercode: string
          supplierid?: number
          suppliername: string
          suppliernamear?: string | null
          taxnumber?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          isactive?: boolean
          notes?: string | null
          payable_accountid?: number | null
          phone?: string | null
          suppliercode?: string
          supplierid?: number
          suppliername?: string
          suppliernamear?: string | null
          taxnumber?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "the_suppliers_payable_accountid_fkey"
            columns: ["payable_accountid"]
            isOneToOne: false
            referencedRelation: "the_accounts"
            referencedColumns: ["accountid"]
          },
        ]
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
      post_journal_entry: { Args: { _entry_id: number }; Returns: undefined }
      post_purchase_invoice: {
        Args: { _invoice_id: number }
        Returns: undefined
      }
      post_sales_invoice: { Args: { _invoice_id: number }; Returns: undefined }
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
