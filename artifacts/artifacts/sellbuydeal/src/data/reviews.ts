export interface Review {
  id: number;
  sellerId: number;
  buyerName: string;
  buyerInitials: string;
  rating: number;
  title: string;
  body: string;
  itemTitle: string;
  itemPrice: number;
  date: string;
  verified: boolean;
  sellerReply?: string;
  sellerReplyDate?: string;
  helpful: number;
}

export interface SellerProfile {
  id: number;
  name: string;
  initials: string;
  location: string;
  memberSince: string;
  verified: boolean;
  responseRate: number;
  avgResponseTime: string;
  totalSales: number;
  positivePercent: number;
  avatarColor: string;
  bio: string;
}

export const SELLER_PROFILES: SellerProfile[] = [];

export const MOCK_REVIEWS: Review[] = [];
