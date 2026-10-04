import { put, list } from "@vercel/blob";

export type Booking = {
  bookingId: string;
  name: string;
  phone: string;
  email: string;
  mode: "Online" | "In Person";
  amount: number;
  coupon: string | null;
  status: "PENDING_UPI" | "MANUAL_REVIEW" | "PAID" | "FAILED";
  utr?: string;
  paymentId?: string;
  orderId?: string;
  createdAt: string;
  verifiedAt?: string;
};

export async function saveBooking(booking: Booking) {
  await put(
    "bookings/" + booking.bookingId + ".json",
    JSON.stringify(booking),
    { access: "private", addRandomSuffix: false, contentType: "application/json" },
  );
  return booking;
}

export async function getBooking(bookingId: string) {
  const prefix = "bookings/" + bookingId + ".json";
  const result = await list({ prefix });
  const blob = result.blobs.find((item) => item.pathname === prefix);
  if (!blob) return null;
  try {
    return (await fetch(blob.url, { cache: "no-store" })).json() as Promise<Booking>;
  } catch {
    return null;
  }
}

export async function getBookings() {
  const out: Booking[] = [];
  let cursor: string | undefined;
  do {
    const result = await list({ prefix: "bookings/", cursor });
    for (const blob of result.blobs) {
      try {
        out.push((await fetch(blob.url, { cache: "no-store" })).json() as Promise<Booking> extends Promise<infer T> ? T : never);
      } catch {
        // Ignore corrupt individual records.
      }
    }
    cursor = result.hasMore ? result.cursor : undefined;
  } while (cursor);
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function makeBookingId() {
  const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase();
  return "AIW-" + stamp + "-" + suffix;
}
