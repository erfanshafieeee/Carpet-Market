export type Language = "fa" | "en";
export type InventoryStatus = "available" | "reserved" | "sold";
export type RugType = "handmade" | "machine";

export interface ReferenceItem {
  id?: number;
  category?: string;
  code: string;
  label?: string;
  label_fa: string;
  label_en: string;
  sort_order?: number;
}

export interface Store {
  id: number;
  name_fa: string;
  name_en: string;
  city_fa: string;
  city_en: string;
  mobile_number: string;
  address_fa: string;
  address_en: string;
}

export interface ProductImage {
  id: number;
  url: string;
  alt_fa: string;
  alt_en: string;
  is_cover: boolean;
  sort_order: number;
}

export interface Product {
  id?: number;
  public_id: string;
  title: string;
  description: string;
  title_fa: string;
  title_en: string;
  description_fa?: string;
  description_en?: string;
  price_toman: number;
  length_cm: number;
  width_cm: number;
  area_square_meters: number;
  rug_type: RugType;
  condition: "new" | "used";
  approximate_age_years: number;
  inventory_status: InventoryStatus;
  city: ReferenceItem;
  weave: ReferenceItem;
  pattern: ReferenceItem;
  materials: ReferenceItem[];
  colors: ReferenceItem[];
  raj: number | null;
  reeds: number | null;
  density: number | null;
  brand: ReferenceItem | null;
  images: ProductImage[];
  store: Store;
  created_at: string;
}

export interface PaginatedProducts {
  count: number;
  next: string | null;
  previous: string | null;
  results: Product[];
}

export type References = Record<string, ReferenceItem[]>;

export interface DashboardData {
  metrics: {
    product_views: number;
    contact_clicks: number;
    phone_call_clicks: number;
    unique_product_view_sessions: number;
    unique_qualifying_sessions: number;
    contact_conversion_rate: number | null;
  };
  inventory: { total: number; available: number; reserved: number; sold: number };
  top_products_by_view: Array<{ public_id: string; title_fa: string; metric: number }>;
  top_products_by_contact: Array<{ public_id: string; title_fa: string; metric: number }>;
  top_search_queries: Array<{ query: string; count: number }>;
}

export interface AdminProduct {
  id: number;
  public_id: string;
  store: number;
  title_fa: string;
  title_en: string;
  description_fa: string;
  description_en: string;
  price_toman: number;
  length_cm: number;
  width_cm: number;
  rug_type: RugType;
  condition: "new" | "used";
  approximate_age_years: number;
  inventory_status: InventoryStatus;
  city: number;
  weave: number;
  pattern: number;
  materials: ReferenceItem[];
  colors: ReferenceItem[];
  raj: number | null;
  reeds: number | null;
  density: number | null;
  brand: number | null;
  images: ProductImage[];
  created_at: string;
  updated_at: string;
  view_count: number;
  contact_count: number;
}

export interface PaginatedAdminProducts {
  count: number;
  next: string | null;
  previous: string | null;
  results: AdminProduct[];
}
