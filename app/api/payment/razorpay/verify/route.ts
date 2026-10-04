import { NextResponse } from "next/server";
import crypto from "crypto";
import { getBooking, saveBooking } from "@/lib/bookings";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const bookingId = typeof body.bookingId === "string" ? body.bookingId.trim() : "";
    const orderId = typeof body.razorpay_order_id === "string" ? body.razorpay_order_id.trim() : "";
    const paymentId = typeof body.razorpay_payment_id === "string" ? body.razorpay_payment_id.trim() : "";
    const signature = typeof body.razorpay_signature === "string" ? body.razorpay_signature.trim() : "";

    if (!bookingId || !orderId || !paymentId || !signature) {
      return NextResponse.json({ error: "Incomplete payment response." }, { status: 400 });
    }

    const booking = await getBooking(bookingId);
    if (!booking || booking.orderId !== orderId) return NextResponse.json({ error: "Booking not found." }, { status: 404 });

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) return NextResponse.json({ error: "Razorpay is not configured." }, { status: 503 });

    const expected = crypto.createHmac("sha256", secret).update(orderId + "|" + paymentId).digest("hex");
    if (expected.length !== signature.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
      return NextResponse.json({ error: "Payment signature verification failed." }, { status: 400 });
    }

    booking.status = "PAID";
    booking.paymentId = paymentId;
    booking.verifiedAt = new Date().toISOString();
    await saveBooking(booking);

    return NextResponse.json({ ok: true, bookingId, amount: booking.amount, email: booking.email });
  } catch {
    return NextResponse.json({ error: "Unable to verify payment." }, { status: 500 });
  }
}
