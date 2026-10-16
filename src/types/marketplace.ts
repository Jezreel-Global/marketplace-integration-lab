export type DataSource = "seed" | "mock" | "provider_test" | "provider_live";

export type PaymentModeLabel =
  | "none"
  | "simulated"
  | "test"
  | "live"
  | "unavailable";

export type BookingStatus =
  | "draft"
  | "pending_payment"
  | "payment_processing"
  | "paid"
  | "cancelled"
  | "payment_failed"
  | "refunded";

export type PaymentAttemptStatus =
  | "not_started"
  | "initiated"
  | "requires_action"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "pending_verification";

export type SellerOnboardingStatus =
  | "not_started"
  | "pending"
  | "restricted"
  | "complete"
  | "unavailable";

export type ProviderCategory =
  | "photography"
  | "tutoring"
  | "events"
  | "home"
  | "tech"
  | "wellness";

/** Real seller account, separate from fictional seed providers. */
export interface SellerProfile { id: string; clerkUserId: string; displayName: string; createdAt: string }

export interface ServiceProvider {
  id: string;
  name: string;
  city: string;
  bio: string;
  category: ProviderCategory;
  rating: number;
  reviewCount: number;
  /** Always true for Milestone 1 seed records. */
  isMock: true;
  onboardingStatus: SellerOnboardingStatus;
  onboardingNote: string;
  payoutStatus: "none" | "illustrative_only";
}

export interface Listing {
  id: string;
  providerId: string;
  title: string;
  description: string;
  /** Amount in kobo (NGN * 100) for consistent money handling later. */
  priceKobo: number;
  currency: "NGN";
  durationMinutes: number;
  availabilityNote: string;
  category: ProviderCategory;
  isMock: true;
}

export interface Booking {
  id: string;
  listingId: string;
  providerId: string;
  customerName: string;
  customerEmail: string;
  scheduledFor: string;
  amountKobo: number;
  currency: "NGN";
  platformFeeKobo: number;
  providerShareKobo: number;
  status: BookingStatus;
  paymentMode: PaymentModeLabel;
  paymentAttemptStatus: PaymentAttemptStatus;
  dataSource: DataSource;
  createdAt: string;
  statusNote: string;
}

export interface WebhookEventRecord {
  id: string;
  provider: "none" | "stripe" | "paystack" | "mock";
  eventType: string;
  receivedAt: string;
  processed: boolean;
  dataSource: DataSource;
  summary: string;
}

export interface PaymentAttemptRecord {
  id: string;
  bookingId: string;
  provider: "none" | "stripe" | "paystack" | "mock";
  mode: PaymentModeLabel;
  status: PaymentAttemptStatus;
  amountKobo: number;
  currency: "NGN";
  dataSource: DataSource;
  note: string;
  createdAt: string;
}
