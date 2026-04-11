export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type CmykSource = 'manual' | 'converted' | 'print_spec'

export type GenericRelationship = {
  foreignKeyName: string
  columns: string[]
  isOneToOne: boolean
  referencedRelation: string
  referencedColumns: string[]
}

export interface Database {
  public: {
    Tables: {
      colors: {
        Row: {
          id: string
          user_id: string
          folder_id: string | null
          hex: string
          alpha: number
          c: number | null
          m: number | null
          y: number | null
          k: number | null
          cmyk_source: CmykSource | null
          name: string
          spot_color: string | null
          memo: string | null
          is_locked: boolean
          is_favorite: boolean
          is_archived: boolean
          order: number
          used_count: number
          last_used_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          folder_id?: string | null
          hex: string
          alpha?: number
          c?: number | null
          m?: number | null
          y?: number | null
          k?: number | null
          cmyk_source?: CmykSource | null
          name: string
          spot_color?: string | null
          memo?: string | null
          is_locked?: boolean
          is_favorite?: boolean
          is_archived?: boolean
          order?: number
          used_count?: number
          last_used_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          folder_id?: string | null
          hex?: string
          alpha?: number
          c?: number | null
          m?: number | null
          y?: number | null
          k?: number | null
          cmyk_source?: CmykSource | null
          name?: string
          spot_color?: string | null
          memo?: string | null
          is_locked?: boolean
          is_favorite?: boolean
          is_archived?: boolean
          order?: number
          used_count?: number
          last_used_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      folders: {
        Row: {
          id: string
          user_id: string
          name: string
          is_locked: boolean
          order: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          is_locked?: boolean
          order?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          is_locked?: boolean
          order?: number
          created_at?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          id: string
          user_id: string
          name: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
        }
        Relationships: []
      }
      color_tags: {
        Row: {
          color_id: string
          tag_id: string
        }
        Insert: {
          color_id: string
          tag_id: string
        }
        Update: {
          color_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "color_tags_color_id_fkey"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "color_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          }
        ]
      }
      invitations: {
        Row: {
          id: string
          code: string
          used_by: string | null
          used_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          used_by?: string | null
          used_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          used_by?: string | null
          used_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      cmyk_source: CmykSource
    }
  }
}

export type Color = Database['public']['Tables']['colors']['Row']
export type ColorInsert = Database['public']['Tables']['colors']['Insert']
export type ColorUpdate = Database['public']['Tables']['colors']['Update']
export type Folder = Database['public']['Tables']['folders']['Row']
export type FolderInsert = Database['public']['Tables']['folders']['Insert']
export type Tag = Database['public']['Tables']['tags']['Row']
export type ColorTag = Database['public']['Tables']['color_tags']['Row']
export type Invitation = Database['public']['Tables']['invitations']['Row']
