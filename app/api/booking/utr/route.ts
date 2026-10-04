import { NextResponse } from "next/server";
import { getBooking, saveBooking } from "@/lib/bookings";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const bookingId = typeof body.bookingId === "string" ? body.bookingId.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const utr = typeof body.utr === "string" ? body.utr.trim() : "";

    if (!bookingId || !email || !/^[A-Za-z0-9]{8,40}$/.test(utr)) {
      return NextResponse.json({ error: "Enter a valid UTR/reference number." }, { status: 400 });
    }

    const booking = await getBooking(bookingId);
    if (!booking || booking.email.toLowerCase() !== email) {
      return NextResponse.json({ error: "Booking could not be verified." }, { status: 404 });
    }
    if (booking.status === "PAID") {
      return NextResponse.json({ error: "This booking is already marked paid." }, { status: 409 });
    }

    booking.utr = utr;
    booking.status = "MANUAL_REVIEW";
    await saveBooking(booking);

    return NextResponse.json({ ok: true, bookingId });
  } catch {
    return NextResponse.json({ error: "Unable to submit payment reference." }, { status: 500 });
  }
}
