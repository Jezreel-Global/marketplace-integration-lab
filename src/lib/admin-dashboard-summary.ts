import type {
  Booking,
  BookingStatus,
  DataSource,
  PaymentAttemptRecord,
} from "@/types/marketplace";

export interface SourceCurrencyGroup<T> {
  dataSource: DataSource;
  currency: string;
  records: T[];
}

export function groupRecordsBySourceAndCurrency<
  T extends { dataSource: DataSource; currency: string },
>(records: T[]): SourceCurrencyGroup<T>[] {
  const groups = new Map<string, SourceCurrencyGroup<T>>();
  for (const record of records) {
    const key = `${record.dataSource}:${record.currency}`;
    const existing = groups.get(key);
    if (existing) {
      existing.records.push(record);
    } else {
      groups.set(key, {
        dataSource: record.dataSource,
        currency: record.currency,
        records: [record],
      });
    }
  }
  return [...groups.values()];
}

export interface BookingSourceSummary {
  dataSource: DataSource;
  currency: string;
  bookings: Booking[];
  statusCounts: Record<BookingStatus, number>;
  grossKobo: number;
  platformFeesKobo: number;
  providerShareKobo: number;
}

export function summarizeBookingsBySourceAndCurrency(
  bookings: Booking[],
): BookingSourceSummary[] {
  return groupRecordsBySourceAndCurrency(bookings).map((group) => {
    const statusCounts: Record<BookingStatus, number> = {
      draft: 0,
      pending_payment: 0,
      payment_processing: 0,
      paid: 0,
      cancelled: 0,
      payment_failed: 0,
      refunded: 0,
    };
    for (const booking of group.records) {
      statusCounts[booking.status] += 1;
    }
    return {
      dataSource: group.dataSource,
      currency: group.currency,
      bookings: group.records,
      statusCounts,
      grossKobo: group.records.reduce((sum, booking) => sum + booking.amountKobo, 0),
      platformFeesKobo: group.records.reduce(
        (sum, booking) => sum + booking.platformFeeKobo,
        0,
      ),
      providerShareKobo: group.records.reduce(
        (sum, booking) => sum + booking.providerShareKobo,
        0,
      ),
    };
  });
}

export function groupPaymentAttempts(
  attempts: PaymentAttemptRecord[],
): SourceCurrencyGroup<PaymentAttemptRecord>[] {
  return groupRecordsBySourceAndCurrency(attempts);
}
