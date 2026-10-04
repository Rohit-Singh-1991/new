"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type State = "checking" | "paid" | "pending" | "failed" | "error";

export default function PaymentSuccess() {
  const [state, setState] = useState<State>("checking");
  const [bookingId, setBookingId] = useState("");
  const [amount, setAmount] = useState(0);
  const [message, setMessage] = useState("Checking payment status…");

  useEffect(() => {
    const orderId = new URLSearchParams(window.location.search).get("order_id");
    if (!orderId) {
      setState("error");
      setMessage("Missing payment order reference.");
      return;
    }

    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      attempts += 1;
      try {
        const response = await fetch("/api/payment/cashfree/status?order_id=" + encodeURIComponent(orderId), { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to check payment.");
        setBookingId(data.bookingId || "");
        setAmount(Number(data.amount || 0));

        if (data.status === "PAID" || data.orderStatus === "PAID") {
          setState("paid");
          setMessage("Payment successful");
          return;
        }
        if (data.orderStatus === "EXPIRED" || data.orderStatus === "CANCELLED") {
          setState("failed");
          setMessage("Payment was not completed.");
          return;
        }

        setState("pending");
        setMessage("Payment received. Confirming securely…");
        if (attempts < 15) timer = setTimeout(poll, 2000);
      } catch {
        setState("error");
        setMessage("Payment status is being verified. Please refresh in a moment.");
      }
    };

    void poll();
    return () => { if (timer) clearTimeout(timer); };
  }, []);

  return (
    <main className="page">
      <section className="success">
        <div className={"check " + (state === "paid" ? "paidCheck" : "")}>{state === "paid" ? "✓" : "…"}</div>
        <h1>{message}</h1>
        {bookingId && <div className="booking"><span>Booking ID</span><b>{bookingId}</b></div>}
        {state === "paid" && <p className="muted">Your payment has been verified by the payment gateway.</p>}
        {amount > 0 && <p className="muted">Amount paid: ₹{amount}</p>}
        {state !== "paid" && <p className="muted">Do not make another payment while verification is in progress.</p>}
        <Link className="btn" href="/">Back to registration</Link>
      </section>
    </main>
  );
}
