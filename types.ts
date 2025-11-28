
export interface ServiceCategory {
  id: string;
  name: string;
}

export interface PriceVariant {
  id: string;
  name: string;
  price: number;
}

export interface PredefinedService {
  id: string;
  name: string;
  price: number; // Base price or default price
  priceType?: 'fixed' | 'variable';
  variants?: PriceVariant[];
  allowQuantity?: boolean;
  categoryId?: string;
}

export interface ServiceItem {
  id:string;
  serviceId: string; // ID from PredefinedService
  name: string;
  variantName?: string; // Name of the selected variant
  price: number;
  quantity: number;
}

export interface Bill {
  id: string;
  customerName: string;
  date: string; // ISO 8601 format with time: YYYY-MM-DDTHH:mm:ss.sssZ
  items: ServiceItem[];
  total: number;
  discountValue?: number; // Giá trị giảm giá
  discountType?: 'percent' | 'amount'; // Loại giảm giá: % hoặc số tiền cố định
  note?: string;
}

export interface Booking extends Bill {
  createdAt?: string; // Thời gian tạo lịch, dùng để tính tiến độ
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  dob?: string; // ISO Date YYYY-MM-DD
}

export type View = 'list' | 'editor' | 'dashboard' | 'services' | 'customers' | 'revenue-calendar';
