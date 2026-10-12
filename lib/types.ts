export type Role = "staff" | "owner";
export type PaymentStatus =
  "pending_payment" | "paid" | "refunded" | "cancelled";
export type TicketStatus = "received" | "in_progress" | "ready" | "completed";

export interface ItemSize {
  id: string;
  name: string; // "regular", "sm", "lg", "S", "M", "L"
  priceCents: number;
}
export interface MenuItem {
  id: string;
  code: string; // "G1", "C7"
  name: string;
  description: string;
  isAvailable: boolean; // sold out today
  isActive: boolean; // on the menu at all
  isSpicyFlag: boolean; // display only
  isCatering: boolean;
  sizes: ItemSize[];
}
export interface MenuCategory {
  id: string;
  name: string;
  sortOrder: number;
  items: MenuItem[];
}

export interface BusinessHour {
  dayOfWeek: number; // 0 = Sunday
  openMinutes: number | null; // minutes after midnight Central; null = closed
  closeMinutes: number | null;
}
export interface Settings {
  taxRateBps: number; // 825 = 8.25%
  leadRegularMinutes: number;
  leadCateringMinutes: number;
}

export interface OrderLine {
  sizeId: string;
  itemCode: string;
  nameSnapshot: string;
  sizeName: string;
  unitPriceCents: number;
  quantity: number;
  spicy: boolean;
  instructions: string;
  components: string[]; // combo halves, item codes
}
export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  pickupTime: string;
  paymentStatus: PaymentStatus;
  ticketStatus: TicketStatus | null;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  taxRateBps: number;
  stripeSessionId: string | null;
  lines: OrderLine[];
  createdAt: string;
}

export interface CreateOrderInput {
  customer: { name: string; email: string; phone?: string };
  pickupTime: string;
  lines: {
    sizeId: string;
    quantity: number;
    spicy?: boolean;
    instructions?: string;
    components?: string[];
  }[];
}
