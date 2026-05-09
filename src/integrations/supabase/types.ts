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
      produto_fotos: {
        Row: {
          id: string
          produto_id: string
          url: string
          ordem: number
          created_at: string
        }
        Insert: {
          id?: string
          produto_id: string
          url: string
          ordem?: number
          created_at?: string
        }
        Update: {
          id?: string
          produto_id?: string
          url?: string
          ordem?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produto_fotos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          ativo: boolean
          id: string
          nome: string
          ordem: number
        }
        Insert: {
          ativo?: boolean
          id?: string
          nome: string
          ordem?: number
        }
        Update: {
          ativo?: boolean
          id?: string
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      itens_opcoes: {
        Row: {
          id: string
          item_pedido_id: string
          opcao_id: string
          preco_adicional: number
        }
        Insert: {
          id?: string
          item_pedido_id: string
          opcao_id: string
          preco_adicional?: number
        }
        Update: {
          id?: string
          item_pedido_id?: string
          opcao_id?: string
          preco_adicional?: number
        }
        Relationships: [
          {
            foreignKeyName: "itens_opcoes_item_pedido_id_fkey"
            columns: ["item_pedido_id"]
            isOneToOne: false
            referencedRelation: "itens_pedido"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_opcoes_opcao_id_fkey"
            columns: ["opcao_id"]
            isOneToOne: false
            referencedRelation: "opcoes_produto"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_pedido: {
        Row: {
          id: string
          observacao: string | null
          opcoes_texto: string | null
          pedido_id: string
          preco_unitario: number
          produto_id: string
          quantidade: number
        }
        Insert: {
          id?: string
          observacao?: string | null
          opcoes_texto?: string | null
          pedido_id: string
          preco_unitario: number
          produto_id: string
          quantidade?: number
        }
        Update: {
          id?: string
          observacao?: string | null
          opcoes_texto?: string | null
          pedido_id?: string
          preco_unitario?: number
          produto_id?: string
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "itens_pedido_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_pedido_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      opcoes_produto: {
        Row: {
          ativo: boolean
          id: string
          nome: string
          preco_adicional: number
          produto_id: string | null
          tipo: Database["public"]["Enums"]["opcao_tipo"]
        }
        Insert: {
          ativo?: boolean
          id?: string
          nome: string
          preco_adicional?: number
          produto_id?: string | null
          tipo: Database["public"]["Enums"]["opcao_tipo"]
        }
        Update: {
          ativo?: boolean
          id?: string
          nome?: string
          preco_adicional?: number
          produto_id?: string | null
          tipo?: Database["public"]["Enums"]["opcao_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "opcoes_produto_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_sequencia: {
        Row: {
          data: string
          ultimo_numero: number
        }
        Insert: {
          data: string
          ultimo_numero?: number
        }
        Update: {
          data?: string
          ultimo_numero?: number
        }
        Relationships: []
      }
      pedidos: {
        Row: {
          criado_em: string
          criado_por: string | null
          data_pedido: string
          finalizado_em: string | null
          id: string
          metodo_pagamento: Database["public"]["Enums"]["metodo_pagamento"]
          numero_dia: number
          observacao: string | null
          status: Database["public"]["Enums"]["pedido_status"]
          total: number
        }
        Insert: {
          criado_em?: string
          criado_por?: string | null
          data_pedido?: string
          finalizado_em?: string | null
          id?: string
          metodo_pagamento: Database["public"]["Enums"]["metodo_pagamento"]
          numero_dia: number
          observacao?: string | null
          status?: Database["public"]["Enums"]["pedido_status"]
          total?: number
        }
        Update: {
          criado_em?: string
          criado_por?: string | null
          data_pedido?: string
          finalizado_em?: string | null
          id?: string
          metodo_pagamento?: Database["public"]["Enums"]["metodo_pagamento"]
          numero_dia?: number
          observacao?: string | null
          status?: Database["public"]["Enums"]["pedido_status"]
          total?: number
        }
        Relationships: []
      }
      produtos: {
        Row: {
          ativo: boolean
          categoria_id: string
          created_at: string
          descricao: string | null
          esgotado: boolean
          foto_url: string | null
          id: string
          nome: string
          permite_cobertura: boolean
          permite_recheio: boolean
          permite_tamanho: boolean
          preco_base: number
        }
        Insert: {
          ativo?: boolean
          categoria_id: string
          created_at?: string
          descricao?: string | null
          esgotado?: boolean
          foto_url?: string | null
          id?: string
          nome: string
          permite_cobertura?: boolean
          permite_recheio?: boolean
          permite_tamanho?: boolean
          preco_base?: number
        }
        Update: {
          ativo?: boolean
          categoria_id?: string
          created_at?: string
          descricao?: string | null
          esgotado?: boolean
          foto_url?: string | null
          id?: string
          nome?: string
          permite_cobertura?: boolean
          permite_recheio?: boolean
          permite_tamanho?: boolean
          preco_base?: number
        }
        Relationships: [
          {
            foreignKeyName: "produtos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          id: string
          nome: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      get_my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      proximo_numero_pedido: { Args: never; Returns: number }
    }
    Enums: {
      app_role: "caixa" | "producao" | "admin"
      metodo_pagamento: "dinheiro" | "pix" | "cartao"
      opcao_tipo: "recheio" | "cobertura" | "tamanho"
      pedido_status:
        | "aguardando"
        | "em_preparo"
        | "pronto"
        | "entregue"
        | "cancelado"
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
      app_role: ["caixa", "producao", "admin"],
      metodo_pagamento: ["dinheiro", "pix", "cartao"],
      opcao_tipo: ["recheio", "cobertura", "tamanho"],
      pedido_status: [
        "aguardando",
        "em_preparo",
        "pronto",
        "entregue",
        "cancelado",
      ],
    },
  },
} as const
