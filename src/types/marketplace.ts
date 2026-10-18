export type DataSource = "seed" | "mock" | "provider_test" | "provider_live";

export const SUPPORTED_CURRENCIES = ["NGN", "USD"] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

/** Integer minor units paired with their currency (NGN kobo or USD cents). */
export interface Money {
  readonly amountMinor: number;
  readonly currency: Currency;
}

/** Planned seller-created listing prices are USD-only. */
export type SellerListingPrice = Money & { readonly currency: "USD" };

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
  price: Money;
  durationMinutes: number;
  availabilityNote: string;
  category: ProviderCategory;
  isMock: true;
}

export type SellerListingStatus = "draft" | "published" | "paused";

/** Persistent listing owned by a real seller profile; never a seed provider. */
export interface SellerListing {
  id: string;
  sellerProfileId: string;
  title: string;
  description: string;
  price: SellerListingPrice;
  durationMinutes: number;
  availabilityNote: string;
  status: SellerListingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  listingId: string;
  /** Set only for bookings of persisted seller listings; seed catalog stays separate. */
  sellerListingId?: string | null;
  providerId: string;
  customerName: string;
  customerEmail: string;
  scheduledFor: string;
  amount: Money;
  platformFee: Money;
  providerShare: Money;
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
  amount: Money;
  dataSource: DataSource;
  note: string;
  createdAt: string;
}
