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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      cliente_etiquetas: {
        Row: {
          cliente_id: string
          etiqueta_id: string
          id: string
        }
        Insert: {
          cliente_id: string
          etiqueta_id: string
          id?: string
        }
        Update: {
          cliente_id?: string
          etiqueta_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cliente_etiquetas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_etiquetas_etiqueta_id_fkey"
            columns: ["etiqueta_id"]
            isOneToOne: false
            referencedRelation: "etiquetas"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nome: string
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      despesas: {
        Row: {
          categoria: string
          created_at: string
          dia_vencimento: number
          id: string
          nome: string
          recorrente: boolean
          status_mes: Json
          tipo: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          categoria?: string
          created_at?: string
          dia_vencimento?: number
          id?: string
          nome: string
          recorrente?: boolean
          status_mes?: Json
          tipo?: string
          updated_at?: string
          user_id: string
          valor?: number
        }
        Update: {
          categoria?: string
          created_at?: string
          dia_vencimento?: number
          id?: string
          nome?: string
          recorrente?: boolean
          status_mes?: Json
          tipo?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      etiquetas: {
        Row: {
          cor: string
          created_at: string
          id: string
          nome: string
          user_id: string
        }
        Insert: {
          cor?: string
          created_at?: string
          id?: string
          nome: string
          user_id: string
        }
        Update: {
          cor?: string
          created_at?: string
          id?: string
          nome?: string
          user_id?: string
        }
        Relationships: []
      }
      fotos: {
        Row: {
          aprovada: boolean
          created_at: string
          galeria_id: string
          id: string
          url: string
          url_com_marca_dagua: string | null
        }
        Insert: {
          aprovada?: boolean
          created_at?: string
          galeria_id: string
          id?: string
          url: string
          url_com_marca_dagua?: string | null
        }
        Update: {
          aprovada?: boolean
          created_at?: string
          galeria_id?: string
          id?: string
          url?: string
          url_com_marca_dagua?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fotos_galeria_id_fkey"
            columns: ["galeria_id"]
            isOneToOne: false
            referencedRelation: "galerias"
            referencedColumns: ["id"]
          },
        ]
      }
      galerias: {
        Row: {
          cliente_id: string
          created_at: string
          id: string
          link_publico: string | null
          pacote: string | null
          preco_avulso: number | null
          status: string
          tipo_ensaio: string | null
          titulo: string
          updated_at: string
          user_id: string
          valor_total: number
        }
        Insert: {
          cliente_id: string
          created_at?: string
          id?: string
          link_publico?: string | null
          pacote?: string | null
          preco_avulso?: number | null
          status?: string
          tipo_ensaio?: string | null
          titulo: string
          updated_at?: string
          user_id: string
          valor_total?: number
        }
        Update: {
          cliente_id?: string
          created_at?: string
          id?: string
          link_publico?: string | null
          pacote?: string | null
          preco_avulso?: number | null
          status?: string
          tipo_ensaio?: string | null
          titulo?: string
          updated_at?: string
          user_id?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "galerias_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      indicacao_leads: {
        Row: {
          created_at: string
          id: string
          indicacao_id: string
          nome: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          indicacao_id: string
          nome: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          indicacao_id?: string
          nome?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "indicacao_leads_indicacao_id_fkey"
            columns: ["indicacao_id"]
            isOneToOne: false
            referencedRelation: "indicacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      indicacoes: {
        Row: {
          cliente_id: string
          codigo: string
          created_at: string
          id: string
          recompensa_tipo: string
          recompensa_valor: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cliente_id: string
          codigo: string
          created_at?: string
          id?: string
          recompensa_tipo?: string
          recompensa_valor?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cliente_id?: string
          codigo?: string
          created_at?: string
          id?: string
          recompensa_tipo?: string
          recompensa_valor?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meta_ads_investimentos: {
        Row: {
          created_at: string
          data: string
          id: string
          taxa_imposto: number
          user_id: string
          valor_investido: number
        }
        Insert: {
          created_at?: string
          data: string
          id?: string
          taxa_imposto?: number
          user_id: string
          valor_investido?: number
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          taxa_imposto?: number
          user_id?: string
          valor_investido?: number
        }
        Relationships: []
      }
      pacotes: {
        Row: {
          beneficios: Json
          created_at: string
          icone: string
          id: string
          nome: string
          ordem: number
          preco: number
          quantidade_fotos: number
          updated_at: string
          user_id: string
        }
        Insert: {
          beneficios?: Json
          created_at?: string
          icone?: string
          id?: string
          nome: string
          ordem?: number
          preco?: number
          quantidade_fotos?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          beneficios?: Json
          created_at?: string
          icone?: string
          id?: string
          nome?: string
          ordem?: number
          preco?: number
          quantidade_fotos?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pagamentos: {
        Row: {
          cliente_id: string
          created_at: string
          entrada_paga_em: string | null
          id: string
          modo_pagamento: string
          origem: string
          pedido_id: string | null
          percentual_entrada: number
          saldo_pago_em: string | null
          status: string
          updated_at: string
          user_id: string
          valor_pago: number
          valor_total: number
        }
        Insert: {
          cliente_id: string
          created_at?: string
          entrada_paga_em?: string | null
          id?: string
          modo_pagamento?: string
          origem?: string
          pedido_id?: string | null
          percentual_entrada?: number
          saldo_pago_em?: string | null
          status?: string
          updated_at?: string
          user_id: string
          valor_pago?: number
          valor_total?: number
        }
        Update: {
          cliente_id?: string
          created_at?: string
          entrada_paga_em?: string | null
          id?: string
          modo_pagamento?: string
          origem?: string
          pedido_id?: string | null
          percentual_entrada?: number
          saldo_pago_em?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          valor_pago?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          cliente_id: string
          created_at: string
          data_entrega: string | null
          express: boolean
          id: string
          link_comprovante: string | null
          origem_cliente: string | null
          pacote: string | null
          servico: string
          status: string
          tempo_estimado_minutos: number
          tipo_ensaio: string | null
          updated_at: string
          user_id: string
          valor: number | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_entrega?: string | null
          express?: boolean
          id?: string
          link_comprovante?: string | null
          origem_cliente?: string | null
          pacote?: string | null
          servico: string
          status?: string
          tempo_estimado_minutos?: number
          tipo_ensaio?: string | null
          updated_at?: string
          user_id: string
          valor?: number | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_entrega?: string | null
          express?: boolean
          id?: string
          link_comprovante?: string | null
          origem_cliente?: string | null
          pacote?: string | null
          servico?: string
          status?: string
          tempo_estimado_minutos?: number
          tipo_ensaio?: string | null
          updated_at?: string
          user_id?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          chave_pix: string | null
          cidade: string | null
          created_at: string
          distribuicao_pro_labore: number
          distribuicao_reinvest: number
          distribuicao_reserva: number
          email: string | null
          id: string
          indicacao_ativo: boolean
          indicacao_modo: string
          indicacao_tipo: string
          indicacao_valor: number
          marca_dagua_camadas: Json
          marca_dagua_opacidade: number
          marca_dagua_posicao: string
          marca_dagua_tamanho: number
          marca_dagua_texto: string | null
          marca_dagua_texto_cor: string
          marca_dagua_texto_tamanho: number
          marca_dagua_tipo: string
          marca_dagua_url: string | null
          meta_ads_taxa_imposto: number
          meta_faturamento_mensal: number
          nome: string
          nome_recebedor: string | null
          plano: string
          saldo_inicial_ano: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          chave_pix?: string | null
          cidade?: string | null
          created_at?: string
          distribuicao_pro_labore?: number
          distribuicao_reinvest?: number
          distribuicao_reserva?: number
          email?: string | null
          id?: string
          indicacao_ativo?: boolean
          indicacao_modo?: string
          indicacao_tipo?: string
          indicacao_valor?: number
          marca_dagua_camadas?: Json
          marca_dagua_opacidade?: number
          marca_dagua_posicao?: string
          marca_dagua_tamanho?: number
          marca_dagua_texto?: string | null
          marca_dagua_texto_cor?: string
          marca_dagua_texto_tamanho?: number
          marca_dagua_tipo?: string
          marca_dagua_url?: string | null
          meta_ads_taxa_imposto?: number
          meta_faturamento_mensal?: number
          nome?: string
          nome_recebedor?: string | null
          plano?: string
          saldo_inicial_ano?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          chave_pix?: string | null
          cidade?: string | null
          created_at?: string
          distribuicao_pro_labore?: number
          distribuicao_reinvest?: number
          distribuicao_reserva?: number
          email?: string | null
          id?: string
          indicacao_ativo?: boolean
          indicacao_modo?: string
          indicacao_tipo?: string
          indicacao_valor?: number
          marca_dagua_camadas?: Json
          marca_dagua_opacidade?: number
          marca_dagua_posicao?: string
          marca_dagua_tamanho?: number
          marca_dagua_texto?: string | null
          marca_dagua_texto_cor?: string
          marca_dagua_texto_tamanho?: number
          marca_dagua_tipo?: string
          marca_dagua_url?: string | null
          meta_ads_taxa_imposto?: number
          meta_faturamento_mensal?: number
          nome?: string
          nome_recebedor?: string | null
          plano?: string
          saldo_inicial_ano?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      retiradas: {
        Row: {
          created_at: string
          data: string
          descricao: string | null
          id: string
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          data?: string
          descricao?: string | null
          id?: string
          user_id: string
          valor?: number
        }
        Update: {
          created_at?: string
          data?: string
          descricao?: string | null
          id?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_legacy_data: { Args: never; Returns: undefined }
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
