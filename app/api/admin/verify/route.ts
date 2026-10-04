import { NextResponse } from "next/server";
import { getBooking, saveBooking } from "@/lib/bookings";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (request.headers.get("x-admin-key") !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const bookingId = typeof body.bookingId === "string" ? body.bookingId.trim() : "";
    if (!bookingId) return NextResponse.json({ error: "Booking ID is required." }, { status: 400 });

    const booking = await getBooking(bookingId);
    if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    if (!booking.utr) return NextResponse.json({ error: "No UTR/reference submitted." }, { status: 400 });

    booking.status = "PAID";
    booking.verifiedAt = new Date().toISOString();
    await saveBooking(booking);

    return NextResponse.json({ ok: true, bookingId, status: booking.status });
  } catch {
    return NextResponse.json({ error: "Unable to verify booking." }, { status: 500 });
  }
}
