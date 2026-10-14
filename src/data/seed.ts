import { calculatePlatformFee } from "@/lib/fees";
import type {
  Booking,
  Listing,
  PaymentAttemptRecord,
  ServiceProvider,
  WebhookEventRecord,
} from "@/types/marketplace";

/**
 * All Milestone 1 data is fictional seed data.
 * Nothing here represents a real Stripe, Paystack, or bank transaction.
 */
export const SEED_META = {
  label: "SIMULATED DATA",
  environment: "local-demo",
  paymentProvider: "none",
  paymentMode: "none" as const,
  note: "Milestone 1 — UI only. No payment providers are connected.",
} as const;

export const providers: ServiceProvider[] = [
  {
    id: "prov_adaeze",
    name: "Adaeze Okonkwo",
    city: "Lagos",
    bio: "Portrait and event photographer covering Lagos Island and the mainland. Known for warm natural light and clean retouching.",
    category: "photography",
    rating: 4.9,
    reviewCount: 128,
    isMock: true,
    onboardingStatus: "unavailable",
    onboardingNote:
      "Mock seller profile only. Stripe Connect / Paystack subaccounts are not configured in Milestone 1.",
    payoutStatus: "none",
  },
  {
    id: "prov_chinedu",
    name: "Chinedu Eze",
    city: "Abuja",
    bio: "WAEC and JAMB maths tutor with weekend intensives in Gwarinpa and online sessions nationwide.",
    category: "tutoring",
    rating: 4.8,
    reviewCount: 86,
    isMock: true,
    onboardingStatus: "unavailable",
    onboardingNote:
      "Mock seller profile only. No connected-account onboarding has been attempted.",
    payoutStatus: "none",
  },
  {
    id: "prov_fatima",
    name: "Fatima Bello",
    city: "Abuja",
    bio: "Corporate and social event planner specialising in intimate gatherings of 20–80 guests.",
    category: "events",
    rating: 4.7,
    reviewCount: 54,
    isMock: true,
    onboardingStatus: "unavailable",
    onboardingNote:
      "Mock seller profile only. Payout status is illustrative and not provider-confirmed.",
    payoutStatus: "none",
  },
  {
    id: "prov_tunde",
    name: "Tunde Adebayo",
    city: "Ibadan",
    bio: "Home cleaning and move-in preparation for apartments and small offices across Ibadan.",
    category: "home",
    rating: 4.6,
    reviewCount: 201,
    isMock: true,
    onboardingStatus: "unavailable",
    onboardingNote:
      "Mock seller profile only. No payouts have occurred.",
    payoutStatus: "none",
  },
  {
    id: "prov_nkechi",
    name: "Nkechi Umeh",
    city: "Port Harcourt",
    bio: "Freelance product and growth consultant for early-stage Nigerian startups. Async + weekly calls.",
    category: "tech",
    rating: 4.9,
    reviewCount: 41,
    isMock: true,
    onboardingStatus: "unavailable",
    onboardingNote:
      "Mock seller profile only. Seller onboarding experiments start in later milestones.",
    payoutStatus: "none",
  },
  {
    id: "prov_ibrahim",
    name: "Ibrahim Yusuf",
    city: "Kano",
    bio: "Certified yoga and mobility coach offering small-group and private sessions.",
    category: "wellness",
    rating: 4.8,
    reviewCount: 73,
    isMock: true,
    onboardingStatus: "unavailable",
    onboardingNote:
      "Mock seller profile only. Do not treat this as a verified payout-ready account.",
    payoutStatus: "none",
  },
];

export const listings: Listing[] = [
  {
    id: "list_portrait_halfday",
    providerId: "prov_adaeze",
    title: "Half-day portrait session",
    description:
      "Three-hour on-location portrait shoot with 25 edited images delivered within five business days. Ideal for personal brands and LinkedIn refreshes.",
    priceKobo: 7_500_000, // ₦75,000
    currency: "NGN",
    durationMinutes: 180,
    availabilityNote: "Weekends in Lagos · book 5+ days ahead",
    category: "photography",
    isMock: true,
  },
  {
    id: "list_event_coverage",
    providerId: "prov_adaeze",
    title: "Event photography (4 hours)",
    description:
      "Coverage for birthdays, engagements, and small corporate mixers. Includes online gallery and highlight selects.",
    priceKobo: 18_000_000, // ₦180,000
    currency: "NGN",
    durationMinutes: 240,
    availabilityNote: "Fri–Sun · Lagos Island preferred",
    category: "photography",
    isMock: true,
  },
  {
    id: "list_maths_intensive",
    providerId: "prov_chinedu",
    title: "JAMB maths intensive (4 sessions)",
    description:
      "Four 90-minute focused sessions covering algebra, geometry, and past-question strategy. Materials included.",
    priceKobo: 4_000_000, // ₦40,000
    currency: "NGN",
    durationMinutes: 360,
    availabilityNote: "Abuja in-person or Zoom · evenings",
    category: "tutoring",
    isMock: true,
  },
  {
    id: "list_event_planning",
    providerId: "prov_fatima",
    title: "Intimate event planning package",
    description:
      "Vendor coordination, run-of-show, and on-site management for gatherings up to 60 guests in Abuja.",
    priceKobo: 25_000_000, // ₦250,000
    currency: "NGN",
    durationMinutes: 480,
    availabilityNote: "2-week lead time recommended",
    category: "events",
    isMock: true,
  },
  {
    id: "list_deep_clean",
    providerId: "prov_tunde",
    title: "Apartment deep clean",
    description:
      "Full deep clean for a 2–3 bedroom flat, including kitchen appliances and bathrooms. Eco-friendly products on request.",
    priceKobo: 3_500_000, // ₦35,000
    currency: "NGN",
    durationMinutes: 240,
    availabilityNote: "Mon–Sat · Ibadan metro",
    category: "home",
    isMock: true,
  },
  {
    id: "list_growth_sprint",
    providerId: "prov_nkechi",
    title: "Two-week product growth sprint",
    description:
      "Audit, experiment backlog, and weekly working sessions for an early-stage product team. Async Slack support included.",
    priceKobo: 45_000_000, // ₦450,000
    currency: "NGN",
    durationMinutes: 600,
    availabilityNote: "Remote · limited slots monthly",
    category: "tech",
    isMock: true,
  },
  {
    id: "list_yoga_private",
    providerId: "prov_ibrahim",
    title: "Private yoga session",
    description:
      "One-on-one mobility and yoga session tailored to beginners or desk workers. Mat provided for studio visits.",
    priceKobo: 1_200_000, // ₦12,000
    currency: "NGN",
    durationMinutes: 60,
    availabilityNote: "Kano studio or outdoor · mornings",
    category: "wellness",
    isMock: true,
  },
];

function bookingFromListing(
  partial: Omit<
    Booking,
    | "amountKobo"
    | "currency"
    | "platformFeeKobo"
    | "providerShareKobo"
    | "listingId"
    | "providerId"
  > & { listingId: string },
): Booking {
  const listing = listings.find((l) => l.id === partial.listingId);
  if (!listing) throw new Error(`Unknown listing ${partial.listingId}`);
  const fees = calculatePlatformFee(listing.priceKobo);
  return {
    ...partial,
    listingId: listing.id,
    providerId: listing.providerId,
    amountKobo: fees.amountKobo,
    currency: "NGN",
    platformFeeKobo: fees.platformFeeKobo,
    providerShareKobo: fees.providerShareKobo,
  };
}

export const bookings: Booking[] = [
  bookingFromListing({
    id: "book_pending_demo",
    listingId: "list_portrait_halfday",
    customerName: "Amaka Nwosu",
    customerEmail: "amaka.demo@example.com",
    scheduledFor: "2026-10-20T10:00:00+01:00",
    status: "pending_payment",
    paymentMode: "none",
    paymentAttemptStatus: "not_started",
    dataSource: "seed",
    createdAt: "2026-10-12T09:15:00+01:00",
    statusNote:
      "Seed booking awaiting payment. Visiting a success URL alone must never mark this paid.",
  }),
  bookingFromListing({
    id: "book_cancelled_demo",
    listingId: "list_deep_clean",
    customerName: "Kunle Ajayi",
    customerEmail: "kunle.demo@example.com",
    scheduledFor: "2026-10-18T08:00:00+01:00",
    status: "cancelled",
    paymentMode: "none",
    paymentAttemptStatus: "cancelled",
    dataSource: "seed",
    createdAt: "2026-10-10T14:22:00+01:00",
    statusNote: "Customer cancelled before any payment attempt. Seed data only.",
  }),
  bookingFromListing({
    id: "book_illustrative_paid",
    listingId: "list_maths_intensive",
    customerName: "Blessing Okoro",
    customerEmail: "blessing.demo@example.com",
    scheduledFor: "2026-10-22T17:00:00+01:00",
    status: "paid",
    paymentMode: "simulated",
    paymentAttemptStatus: "succeeded",
    dataSource: "seed",
    createdAt: "2026-10-08T11:05:00+01:00",
    statusNote:
      "Illustrative 'paid' seed row for UI demos. Not a provider-confirmed transaction.",
  }),
];

export const paymentAttempts: PaymentAttemptRecord[] = [
  {
    id: "pay_seed_none",
    bookingId: "book_pending_demo",
    provider: "none",
    mode: "none",
    status: "not_started",
    amountKobo: 7_500_000,
    currency: "NGN",
    dataSource: "seed",
    note: "No payment provider invoked. Placeholder for Milestone 2+ flows.",
    createdAt: "2026-10-12T09:15:00+01:00",
  },
  {
    id: "pay_seed_simulated",
    bookingId: "book_illustrative_paid",
    provider: "mock",
    mode: "simulated",
    status: "succeeded",
    amountKobo: 4_000_000,
    currency: "NGN",
    dataSource: "seed",
    note: "Simulated success baked into seed data — not Stripe or Paystack.",
    createdAt: "2026-10-08T11:06:00+01:00",
  },
];

export const webhookEvents: WebhookEventRecord[] = [
  {
    id: "wh_seed_placeholder",
    provider: "none",
    eventType: "milestone.ui_only",
    receivedAt: "2026-10-12T09:00:00+01:00",
    processed: false,
    dataSource: "seed",
    summary:
      "No real webhooks yet. Admin UI shows this placeholder so the event feed is ready for Milestone 3+.",
  },
];

export function getProvider(id: string): ServiceProvider | undefined {
  return providers.find((p) => p.id === id);
}

export function getListing(id: string): Listing | undefined {
  return listings.find((l) => l.id === id);
}

export function getBooking(id: string): Booking | undefined {
  return bookings.find((b) => b.id === id);
}

export function listingsForProvider(providerId: string): Listing[] {
  return listings.filter((l) => l.providerId === providerId);
}

export function bookingsForProvider(providerId: string): Booking[] {
  return bookings.filter((b) => b.providerId === providerId);
}

export const categoryLabels: Record<Listing["category"], string> = {
  photography: "Photography",
  tutoring: "Tutoring",
  events: "Events",
  home: "Home services",
  tech: "Tech & consulting",
  wellness: "Wellness",
};
