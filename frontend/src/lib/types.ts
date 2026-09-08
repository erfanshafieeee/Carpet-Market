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
  manager_mobile_number: string;
  domain: string;
  address_fa: string;
  address_en: string;
  branches: Array<{
    id: number;
    name_fa: string;
    name_en: string;
    address_fa: string;
    address_en: string;
    sort_order: number;
  }>;
}

export interface SellRequestCreated {
  public_id: string;
  tracking_code: string;
  status: "needs_review";
  created_at: string;
}

export type SellRequestStatus = "needs_review" | "in_progress" | "purchased" | "rejected";
export type SellRequestRejectionReason = "condition_mismatch" | "outside_scope" | "duplicate" | "owner_withdrew" | "unable_to_contact" | "other";

export interface AdminSellRequestListItem {
  public_id: string;
  tracking_code: string;
  rug_type: RugType;
  phone_number: string;
  province: ReferenceItem;
  status: SellRequestStatus;
  thumbnail: string | null;
  image_count: number;
  created_at: string;
  updated_at: string;
}

export interface PaginatedSellRequests {
  count: number;
  next: string | null;
  previous: string | null;
  results: AdminSellRequestListItem[];
}

export interface SellRequestHistoryItem {
  id: number;
  from_status: SellRequestStatus | "";
  to_status: SellRequestStatus;
  rejection_reason: SellRequestRejectionReason | "";
  changed_by: string | null;
  created_at: string;
}

export interface SellRequestNote {
  id: number;
  body: string;
  author: string | null;
  created_at: string;
}

export interface AdminSellRequestDetail extends Omit<AdminSellRequestListItem, "thumbnail" | "image_count"> {
  address: string;
  city: ReferenceItem | null;
  length_cm: number | null;
  width_cm: number | null;
  condition: "new" | "used" | "";
  approximate_age_years: number | null;
  pattern: ReferenceItem | null;
  materials: ReferenceItem[];
  colors: ReferenceItem[];
  raj: number | null;
  reeds: number | null;
  density: number | null;
  brand: ReferenceItem | null;
  description: string;
  rejection_reason: SellRequestRejectionReason | "";
  rejection_note: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
  first_admin_action_at: string | null;
  images: Array<{ id: number; url: string; sort_order: number }>;
  status_history: SellRequestHistoryItem[];
  notes: SellRequestNote[];
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
  sell: {
    metrics: {
      flow_started_sessions: number;
      step_1_completed_sessions: number;
      step_2_completed_sessions: number;
      submitted_sessions: number;
      conversion_rate: number | null;
      requests_submitted: number;
      open_requests: number;
      purchased_requests: number;
      actioned_requests: number;
      purchase_rate: number | null;
      avg_first_admin_action_hours: number | null;
    };
    by_status: Partial<Record<SellRequestStatus, number>>;
    by_type: Partial<Record<RugType, number>>;
    top_provinces: Array<{ province__code: string; province__label_fa: string; count: number }>;
    rejection_reasons: Array<{ rejection_reason: SellRequestRejectionReason; count: number }>;
    attribution: Array<{ utm_campaign: string; utm_source: string; utm_medium: string; count: number }>;
  };
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
