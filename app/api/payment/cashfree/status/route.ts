import { NextResponse } from "next/server";
import { getBooking, saveBooking } from "@/lib/bookings";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const orderId = new URL(request.url).searchParams.get("order_id")?.trim() || "";
    if (!orderId) return NextResponse.json({ error: "Order ID is required." }, { status: 400 });

    const clientId = process.env.CASHFREE_CLIENT_ID;
    const secret = process.env.CASHFREE_CLIENT_SECRET;
    if (!clientId || !secret) return NextResponse.json({ error: "Automatic payment gateway is not configured." }, { status: 503 });

    const response = await fetch("https://api.cashfree.com/pg/orders/" + encodeURIComponent(orderId), {
      headers: {
        "x-client-id": clientId,
        "x-client-secret": secret,
        "x-api-version": "2025-01-01",
        Accept: "application/json",
      },
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data.message || "Unable to fetch payment status." }, { status: 502 });

    const booking = await getBooking(orderId);
    if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });

    if (data.order_status === "PAID" && booking.status !== "PAID") {
      booking.status = "PAID";
      booking.verifiedAt = new Date().toISOString();
      await saveBooking(booking);
    }

    return NextResponse.json({
      bookingId: booking.bookingId,
      status: booking.status,
      orderStatus: data.order_status,
      amount: booking.amount,
      email: booking.email,
    });
  } catch {
    return NextResponse.json({ error: "Unable to verify payment." }, { status: 500 });
  }
}
