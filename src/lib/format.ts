import { assertMoney } from "@/lib/money";
import type { Money } from "@/types/marketplace";

/** Format supported NGN/kobo or USD/cent money without inferring its currency. */
export function formatMoney(money: Money): string {
  assertMoney(money);
  const locale = money.currency === "NGN" ? "en-NG" : "en-US";
  const majorUnits = BigInt(money.amountMinor) / BigInt(100);
  const fractionalUnits = money.amountMinor % 100;
  const wholeParts = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).formatToParts(majorUnits);
  const currencyParts = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: money.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).formatToParts(BigInt(0));
  const fractionParts =
    fractionalUnits === 0
      ? []
      : new Intl.NumberFormat(locale, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
          useGrouping: false,
        })
          .formatToParts(fractionalUnits / 100)
          .filter((part) => part.type === "decimal" || part.type === "fraction");
  const integerPartIndex = currencyParts.findIndex(
    (part) => part.type === "integer",
  );

  return currencyParts
    .flatMap((part, index) => {
      if (part.type === "integer") {
        return [
          ...wholeParts,
          ...(index === integerPartIndex ? fractionParts : []),
        ];
      }
      return part.type === "group" ? [] : [part];
    })
    .map((part) => part.value)
    .join("");
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
