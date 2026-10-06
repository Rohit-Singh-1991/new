import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getBooking, saveBooking } from "@/lib/bookings";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook secret is not configured" }, { status: 503 });

  const signature = request.headers.get("x-razorpay-signature");
  const raw = Buffer.from(await request.arrayBuffer());
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");

  if (!signature || signature.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  try {
    const event = JSON.parse(raw.toString("utf8"));
    const payment = event.payload?.payment?.entity;
    const order = event.payload?.order?.entity;
    const bookingId = payment?.notes?.booking_id || order?.notes?.booking_id;

    if (bookingId && (event.event === "payment.captured" || event.event === "order.paid")) {
      const booking = await getBooking(String(bookingId));
      if (booking) {
        booking.status = "PAID";
        booking.paymentId = payment?.id || booking.paymentId;
        booking.verifiedAt = new Date().toISOString();
        await saveBooking(booking);
      }
    }

    console.log("razorpay_webhook", event.event, payment?.id || order?.id || "");
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }
}
