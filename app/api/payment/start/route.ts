import { NextResponse } from "next/server";
import crypto from "crypto";
import { makeBookingId, saveBooking } from "@/lib/bookings";

const ORIGINAL = 899;
const DISCOUNTED = 499;
const UPI_VPA = "9910474663@icici";
const SITE_URL = process.env.SITE_URL || "https://webinar.digicreators.shop";

export const runtime = "nodejs";

function parseInput(body: any) {
  return {
    name: typeof body.name === "string" ? body.name.trim() : "",
    phone: typeof body.phone === "string" ? body.phone.replace(/\D/g, "") : "",
    email: typeof body.email === "string" ? body.email.trim().toLowerCase() : "",
    mode: body.mode === "In Person" ? "In Person" : body.mode === "Online" ? "Online" : "",
    coupon: typeof body.coupon === "string" ? body.coupon.trim().toUpperCase() : "",
  } as const;
}

export async function POST(request: Request) {
  try {
    const { name, phone, email, mode, coupon } = parseInput(await request.json());

    if (name.length < 2 || name.length > 100) return NextResponse.json({ error: "Please enter a valid name." }, { status: 400 });
    if (!/^[6-9]\d{9}$/.test(phone)) return NextResponse.json({ error: "Please enter a valid Indian mobile number." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    if (!mode) return NextResponse.json({ error: "Please select attendance mode." }, { status: 400 });
    if (coupon && coupon !== "GENZ") return NextResponse.json({ error: "Invalid coupon code." }, { status: 400 });

    const amount = coupon === "GENZ" ? DISCOUNTED : ORIGINAL;
    const bookingId = makeBookingId();

    const cashfreeReady = Boolean(process.env.CASHFREE_CLIENT_ID && process.env.CASHFREE_CLIENT_SECRET);
    const razorpayReady = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

    if (cashfreeReady) {
      const response = await fetch("https://api.cashfree.com/pg/orders", {
        method: "POST",
        headers: {
          "x-client-id": process.env.CASHFREE_CLIENT_ID!,
          "x-client-secret": process.env.CASHFREE_CLIENT_SECRET!,
          "x-api-version": "2025-01-01",
          Accept: "application/json",
          "Content-Type": "application/json",
          "x-idempotency-key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          order_id: bookingId,
          order_amount: amount,
          order_currency: "INR",
          customer_details: {
            customer_id: bookingId,
            customer_name: name,
            customer_email: email,
            customer_phone: phone,
          },
          order_meta: {
            return_url: SITE_URL + "/payment-success?order_id={order_id}",
            notify_url: SITE_URL + "/api/payment/cashfree/webhook",
          },
          order_note: "AI Webinar registration " + bookingId,
          order_tags: {
            booking_id: bookingId,
            attendance: mode,
            coupon: coupon || "",
          },
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.payment_session_id) {
        return NextResponse.json({ error: data.message || "Automatic payment gateway order creation failed." }, { status: 502 });
      }

      await saveBooking({
        bookingId, name, phone, email, mode, amount, coupon: coupon || null,
        status: "PENDING_GATEWAY", provider: "cashfree", orderId: bookingId,
        createdAt: new Date().toISOString(),
      });

      return NextResponse.json({ provider: "cashfree", bookingId, amount, paymentSessionId: data.payment_session_id });
    }

    if (razorpayReady) {
      const auth = Buffer.from(process.env.RAZORPAY_KEY_ID! + ":" + process.env.RAZORPAY_KEY_SECRET!).toString("base64");
      const response = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: { Authorization: "Basic " + auth, "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amount * 100,
          currency: "INR",
          receipt: bookingId,
          notes: { booking_id: bookingId, name, email, phone, mode, coupon },
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.id) return NextResponse.json({ error: data.error?.description || "Automatic payment gateway order creation failed." }, { status: 502 });

      await saveBooking({
        bookingId, name, phone, email, mode, amount, coupon: coupon || null,
        status: "PENDING_GATEWAY", provider: "razorpay", orderId: data.id,
        createdAt: new Date().toISOString(),
      });

      return NextResponse.json({ provider: "razorpay", bookingId, amount, orderId: data.id, keyId: process.env.RAZORPAY_KEY_ID });
    }

    await saveBooking({
      bookingId, name, phone, email, mode, amount, coupon: coupon || null,
      status: "PENDING_UPI", provider: "upi", createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ provider: "upi", bookingId, amount, upiVpa: UPI_VPA });
  } catch {
    return NextResponse.json({ error: "Unable to start payment." }, { status: 500 });
  }
}
