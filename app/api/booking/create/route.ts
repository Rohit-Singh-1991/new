import { NextResponse } from "next/server";
import { saveBooking, makeBookingId } from "@/lib/bookings";

const ORIGINAL = 899;
const DISCOUNTED = 499;
const COUPON = "GENZ";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.replace(/\D/g, "") : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const mode = body.mode === "In Person" ? "In Person" : body.mode === "Online" ? "Online" : "";
    const coupon = typeof body.coupon === "string" ? body.coupon.trim().toUpperCase() : "";

    if (name.length < 2 || name.length > 100) return NextResponse.json({ error: "Please enter a valid name." }, { status: 400 });
    if (!/^[6-9]\d{9}$/.test(phone)) return NextResponse.json({ error: "Please enter a valid Indian mobile number." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    if (!mode) return NextResponse.json({ error: "Please select attendance mode." }, { status: 400 });
    if (coupon && coupon !== COUPON) return NextResponse.json({ error: "Invalid coupon code." }, { status: 400 });

    const amount = coupon === COUPON ? DISCOUNTED : ORIGINAL;
    const bookingId = makeBookingId();

    await saveBooking({
      bookingId,
      name,
      phone,
      email,
      mode,
      amount,
      coupon: coupon || null,
      status: "PENDING_UPI",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ bookingId, amount, upiVpa: "9910474663@icici" });
  } catch {
    return NextResponse.json({ error: "Unable to create registration." }, { status: 500 });
  }
}
