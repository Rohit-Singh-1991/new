import { NextResponse } from "next/server";
import crypto from "crypto";
import { getBooking, saveBooking } from "@/lib/bookings";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const timestamp = request.headers.get("x-webhook-timestamp") || "";
    const signature = request.headers.get("x-webhook-signature") || "";
    const secret = process.env.CASHFREE_WEBHOOK_SECRET || "";

    if (!secret || !timestamp || !signature) return new NextResponse("Unauthorized", { status: 401 });

    const expected = crypto.createHmac("sha256", secret).update(timestamp + rawBody).digest("base64");
    const expectedBuf = Buffer.from(expected);
    const signatureBuf = Buffer.from(signature);
    if (expectedBuf.length !== signatureBuf.length || !crypto.timingSafeEqual(expectedBuf, signatureBuf)) {
      return new NextResponse("Invalid signature", { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const orderId = payload?.data?.order?.order_id;
    if (typeof orderId !== "string" || !orderId) return NextResponse.json({ ok: true });

    const booking = await getBooking(orderId);
    if (!booking) return NextResponse.json({ ok: true });

    const paymentStatus = payload?.data?.payment?.payment_status;
    if (paymentStatus === "SUCCESS") {
      booking.status = "PAID";
      booking.paymentId = payload?.data?.payment?.cf_payment_id || booking.paymentId;
      booking.verifiedAt = new Date().toISOString();
      await saveBooking(booking);
    } else if (paymentStatus === "FAILED") {
      booking.status = "FAILED";
      await saveBooking(booking);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }
}
