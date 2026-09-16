export interface Message {
  id: number;
  senderId: "me" | "them";
  text: string;
  timestamp: string;
  read: boolean;
}

export interface Conversation {
  id: number;
  with: {
    name: string;
    avatar: string;
    location: string;
    rating: number;
    reviews: number;
  };
  listingTitle: string;
  listingPrice: number;
  listingImage: string;
  listingId: number;
  messages: Message[];
  unread: number;
}

export const MOCK_CONVERSATIONS: Conversation[] = [];
