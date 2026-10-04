import { get, put, list } from "@vercel/blob";

export type Booking = {
  bookingId: string;
  name: string;
  phone: string;
  email: string;
  mode: "Online" | "In Person";
  amount: number;
  coupon: string | null;
  status: "PENDING_UPI" | "PENDING_GATEWAY" | "MANUAL_REVIEW" | "PAID" | "FAILED";
  utr?: string;
  paymentId?: string;
  orderId?: string;
  provider?: "cashfree" | "razorpay" | "upi";
  createdAt: string;
  verifiedAt?: string;
};

export async function saveBooking(booking: Booking) {
  await put(
    "bookings/" + booking.bookingId + ".json",
    JSON.stringify(booking),
    {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    },
  );
  return booking;
}

export async function getBooking(bookingId: string) {
  const pathname = "bookings/" + bookingId + ".json";
  try {
    const result = await get(pathname, { access: "private", useCache: false });
    if (!result) return null;
    const text = await new Response(result.stream).text();
    return JSON.parse(text) as Booking;
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
        const result = await get(blob.pathname, { access: "private", useCache: false });
        const text = await new Response(result.stream).text();
        out.push(JSON.parse(text) as Booking);
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
