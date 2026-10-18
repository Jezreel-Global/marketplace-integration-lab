import type {
  Booking,
  BookingStatus,
  Currency,
  DataSource,
  Money,
  PaymentAttemptRecord,
} from "@/types/marketplace";
import { assertBookingMoneyConsistency, sumMoney } from "@/lib/money";

export interface SourceCurrencyGroup<T> {
  dataSource: DataSource;
  currency: Currency;
  records: T[];
}

export function groupRecordsBySourceAndCurrency<
  T extends { dataSource: DataSource; currency: Currency },
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
  currency: Currency;
  bookings: Booking[];
  statusCounts: Record<BookingStatus, number>;
  gross: Money;
  platformFees: Money;
  providerShare: Money;
}

export function summarizeBookingsBySourceAndCurrency(
  bookings: Booking[],
): BookingSourceSummary[] {
  for (const booking of bookings) {
    assertBookingMoneyConsistency(
      booking.amount,
      booking.platformFee,
      booking.providerShare,
    );
  }
  const rows = bookings.map((booking) => ({
    dataSource: booking.dataSource,
    currency: booking.amount.currency,
    booking,
  }));
  return groupRecordsBySourceAndCurrency(rows).map((group) => {
    const statusCounts: Record<BookingStatus, number> = {
      draft: 0,
      pending_payment: 0,
      payment_processing: 0,
      paid: 0,
      cancelled: 0,
      payment_failed: 0,
      refunded: 0,
    };
    for (const { booking } of group.records) {
      statusCounts[booking.status] += 1;
    }
    return {
      dataSource: group.dataSource,
      currency: group.currency,
      bookings: group.records.map(({ booking }) => booking),
      statusCounts,
      gross: sumMoney(group.records.map(({ booking }) => booking.amount), group.currency),
      platformFees: sumMoney(
        group.records.map(({ booking }) => booking.platformFee),
        group.currency,
      ),
      providerShare: sumMoney(
        group.records.map(({ booking }) => booking.providerShare),
        group.currency,
      ),
    };
  });
}

export function groupPaymentAttempts(
  attempts: PaymentAttemptRecord[],
): SourceCurrencyGroup<PaymentAttemptRecord>[] {
  return groupRecordsBySourceAndCurrency(
    attempts.map((attempt) => ({
      ...attempt,
      currency: attempt.amount.currency,
    })),
  );
}
