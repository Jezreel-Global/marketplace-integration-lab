import type {
  BookingStatus,
  DataSource,
  PaymentAttemptStatus,
  PaymentModeLabel,
  SellerOnboardingStatus,
} from "@/types/marketplace";

const bookingStyles: Record<BookingStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  pending_payment: "bg-sky-100 text-sky-900",
  payment_processing: "bg-indigo-100 text-indigo-900",
  paid: "bg-emerald-100 text-emerald-900",
  cancelled: "bg-stone-200 text-stone-700",
  payment_failed: "bg-rose-100 text-rose-900",
  refunded: "bg-orange-100 text-orange-900",
};

const paymentStyles: Record<PaymentAttemptStatus, string> = {
  not_started: "bg-slate-100 text-slate-700",
  initiated: "bg-sky-100 text-sky-900",
  requires_action: "bg-amber-100 text-amber-950",
  succeeded: "bg-emerald-100 text-emerald-900",
  failed: "bg-rose-100 text-rose-900",
  cancelled: "bg-stone-200 text-stone-700",
  pending_verification: "bg-violet-100 text-violet-900",
};

const modeStyles: Record<PaymentModeLabel, string> = {
  none: "bg-slate-100 text-slate-700",
  simulated: "bg-amber-100 text-amber-950",
  test: "bg-sky-100 text-sky-900",
  live: "bg-rose-100 text-rose-900",
  unavailable: "bg-stone-200 text-stone-700",
};

const sourceStyles: Record<DataSource, string> = {
  seed: "bg-amber-100 text-amber-950",
  mock: "bg-amber-100 text-amber-950",
  provider_test: "bg-sky-100 text-sky-900",
  provider_live: "bg-rose-100 text-rose-900",
};

const onboardingStyles: Record<SellerOnboardingStatus, string> = {
  not_started: "bg-slate-100 text-slate-700",
  pending: "bg-amber-100 text-amber-950",
  restricted: "bg-orange-100 text-orange-900",
  complete: "bg-emerald-100 text-emerald-900",
  unavailable: "bg-stone-200 text-stone-700",
};

function Badge({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold tracking-wide uppercase ${className}`}
    >
      {children}
    </span>
  );
}

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <Badge className={bookingStyles[status]}>
      {status.replaceAll("_", " ")}
    </Badge>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentAttemptStatus }) {
  return (
    <Badge className={paymentStyles[status]}>
      {status.replaceAll("_", " ")}
    </Badge>
  );
}

export function PaymentModeBadge({ mode }: { mode: PaymentModeLabel }) {
  return (
    <Badge className={modeStyles[mode]}>
      {mode === "none" ? "no payment" : mode}
    </Badge>
  );
}

export function DataSourceBadge({ source }: { source: DataSource }) {
  const labels: Record<DataSource, string> = {
    seed: "seed / mock",
    mock: "simulated",
    provider_test: "provider test",
    provider_live: "provider live",
  };
  return <Badge className={sourceStyles[source]}>{labels[source]}</Badge>;
}

export function OnboardingBadge({ status }: { status: SellerOnboardingStatus }) {
  return (
    <Badge className={onboardingStyles[status]}>
      {status.replaceAll("_", " ")}
    </Badge>
  );
}
