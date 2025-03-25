export type WarehouseType = 'indoor' | 'outdoor'
export type WarehouseStatus = 'green' | 'yellow' | 'orange' | 'red'

export interface Warehouse {
  id: string
  name: string
  type: WarehouseType
  letter: string
  created_at: string
  updated_at: string
}

export interface WarehouseSection {
  id: string
  warehouse_id: string
  section_number: number
  status: WarehouseStatus
  created_at: string
  updated_at: string
}

export interface Database {
  public: {
    Tables: {
      warehouses: {
        Row: Warehouse
        Insert: Omit<Warehouse, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Warehouse, 'id'>>
      }
      warehouse_sections: {
        Row: WarehouseSection
        Insert: Omit<WarehouseSection, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<WarehouseSection, 'id'>>
      }
    }
  }
} 