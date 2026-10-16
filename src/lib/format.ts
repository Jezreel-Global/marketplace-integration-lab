const ngnFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Format kobo amounts as Naira for display. */
export function formatNgnFromKobo(kobo: number): string {
  return ngnFormatter.format(kobo / 100);
}

/** Format an amount stored in hundredth units, keeping its currency explicit. */
export function formatCurrencyFromMinorUnits(
  amountMinor: number,
  currency: string,
): string {
  const localeByCurrency: Record<string, string> = {
    NGN: "en-NG",
    USD: "en-US",
  };
  const locale = localeByCurrency[currency];
  if (!locale || !Number.isSafeInteger(amountMinor)) {
    return `${amountMinor} ${currency} minor units`;
  }
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (rem === 0) return hours === 1 ? "1 hour" : `${hours} hours`;
  return `${hours}h ${rem}m`;
}
