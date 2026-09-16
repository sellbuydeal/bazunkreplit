export interface ProductVariantOption {
  label: string;
  value: string;
  hex?: string;
  stock: number;
  priceDelta?: number;
}

export interface ProductVariant {
  type: "size" | "colour" | "storage" | "style";
  label: string;
  options: ProductVariantOption[];
}

export interface Product {
  id: number;
  title: string;
  price: number;
  currency?: string;
  priceGbp?: number;
  condition: "new" | "like new" | "good" | "fair" | "poor";
  views: number;
  watchers: number;
  verified: boolean;
  category: string;
  location: string;
  image: string;
  listed: string;
  description?: string;
  variants?: ProductVariant[];
}

export const ALL_PRODUCTS: Product[] = [];
