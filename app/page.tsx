"use client";

import { useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

const ORIGINAL = 899;
const DISCOUNTED = 499;
const UPI_ID = "9910474663@icici";
const WHATSAPP = "919910474663";

declare global {
  interface Window {
    Razorpay?: new (options: any) => any;
    Cashfree?: (options: { mode: "sandbox" | "production" }) => {
      checkout: (options: { paymentSessionId: string; redirectTarget: "_self" | "_modal" }) => Promise<unknown>;
    };
  }
}

type Mode = "Online" | "In Person";
type Stage = "details" | "payment" | "done" | "paid";
type Provider = "cashfree" | "razorpay" | "upi";

export default function Home() {
  const [stage, setStage] = useState<Stage>("details");
  const [provider, setProvider] = useState<Provider>("upi");
  const [form, setForm] = useState({ name: "", phone: "", email: "", mode: "Online" as Mode });
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [utr, setUtr] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [paymentEmail, setPaymentEmail] = useState("");

  const amount = applied ? DISCOUNTED : ORIGINAL;

  const upiUri = useMemo(() => {
    if (!bookingId) return "";
    const params = new URLSearchParams({
      pa: UPI_ID,
      pn: "AI Webinar",
      am: String(amount),
      cu: "INR",
      tn: bookingId,
    });
    return "upi://pay?" + params.toString();
  }, [bookingId, amount]);

  function applyCoupon() {
    const value = coupon.trim().toUpperCase();
    if (!value) {
      setApplied(false);
      setCouponError("");
      return;
    }
    if (value === "GENZ") {
      setApplied(true);
      setCouponError("");
    } else {
      setApplied(false);
      setCouponError("Invalid coupon code.");
    }
  }

  async function loadScript(src: string) {
    if (document.querySelector('script[src="' + src + '"]')) return;
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Unable to load payment gateway."));
      document.body.appendChild(script);
    });
  }

  async function createRegistration(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    setCouponError("");

    const phone = form.phone.replace(/\D/g, "");
    const email = form.email.trim().toLowerCase();

    if (form.name.trim().length < 2) return setMessage("Please enter your full name.");
    if (!/^[6-9]\d{9}$/.test(phone)) return setMessage("Please enter a valid 10-digit Indian mobile number.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setMessage("Please enter a valid email address.");
    if (coupon.trim() && !applied) return setMessage("Please apply the valid GENZ coupon or remove the coupon.");

    setLoading(true);
    try {
      const response = await fetch("/api/payment/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, phone, email, coupon: applied ? "GENZ" : "" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to start payment.");

      setBookingId(data.bookingId);
      setPaymentEmail(email);
      setProvider(data.provider as Provider);

      if (data.provider === "cashfree") {
        await loadScript("https://sdk.cashfree.com/js/v3/cashfree.js");
        if (!window.Cashfree) throw new Error("Cashfree checkout is unavailable.");
        await window.Cashfree({ mode: "production" }).checkout({
          paymentSessionId: data.paymentSessionId,
          redirectTarget: "_self",
        });
        return;
      }

      if (data.provider === "razorpay") {
        await loadScript("https://checkout.razorpay.com/v1/checkout.js");
        if (!window.Razorpay) throw new Error("Razorpay checkout is unavailable.");

        const gateway = new window.Razorpay({
          key: data.keyId,
          amount: data.amount * 100,
          currency: "INR",
          name: "AI Webinar",
          description: "AI Webinar Registration",
          order_id: data.orderId,
          prefill: {
            name: form.name.trim(),
            email,
            contact: phone,
          },
          theme: { color: "#f97316" },
          modal: {
            ondismiss: () => setLoading(false),
          },
          handler: async (payment: any) => {
            try {
              const verify = await fetch("/api/payment/razorpay/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bookingId: data.bookingId, ...payment }),
              });
              const verified = await verify.json();
              if (!verify.ok) throw new Error(verified.error || "Payment verification failed.");
              setStage("paid");
              setLoading(false);
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "Payment verification failed.");
              setLoading(false);
            }
          },
        });
        gateway.on("payment.failed", (failure: any) => {
          setMessage(failure?.error?.description || "Payment failed. Please try again.");
          setLoading(false);
        });
        gateway.open();
        return;
      }

      setStage("payment");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Payment could not be started.");
    } finally {
      if (provider === "upi") setLoading(false);
    }
  }

  async function submitUtr() {
    setMessage("");
    const value = utr.trim().replace(/\s+/g, "");
    if (!/^[A-Za-z0-9]{8,40}$/.test(value)) {
      setMessage("Please enter the UTR/reference number from your UPI payment.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/booking/utr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, email: paymentEmail || form.email.trim(), utr: value }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to submit UTR.");
      setStage("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit UTR.");
    } finally {
      setLoading(false);
    }
  }

  const whatsappText = encodeURIComponent(
    [
      "AI Webinar Registration",
      "Booking ID: " + bookingId,
      "Name: " + form.name.trim(),
      "Phone: +91 " + form.phone.replace(/\D/g, ""),
      "Email: " + form.email.trim(),
      "Attendance: " + form.mode,
      "Amount: ₹" + amount,
      utr.trim() ? "UPI UTR: " + utr.trim() : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return (
    <main className="site">
      <header className="topbar">
        <div className="brand">AI <span>WEBINAR</span></div>
        <a href={"https://wa.me/" + WHATSAPP} target="_blank" rel="noreferrer">
          WhatsApp: 9910474663
        </a>
      </header>

      <section className="hero">
        <div className="heroCopy">
          <p className="eyebrow">REGISTRATION OPEN • 18 OCTOBER 2026</p>
          <h1>
            The AI Webinar <span>You Can't Miss!</span>
          </h1>
          <p className="lead">
            Afraid of AI? Not Anymore! Learn practical AI directly from industry experts and attend{" "}
            <b>in person or online</b>.
          </p>
          <div className="eventGrid">
            <div><b>18 October 2026</b><small>Sunday</small></div>
            <div><b>10:00 AM – 5:00 PM</b><small>Full-day session</small></div>
            <div className="wide"><b>Vandhana International School</b><small>Sector 10, Dwarka, Delhi</small></div>
          </div>
          <div className="speakerGrid">
            <div><b>Rohit Singh</b><small>9 Years Development & AI Experience</small></div>
            <div><b>Vivek Kumar</b><small>Senior Engineer · Accenture</small></div>
          </div>
        </div>

        <section className="card">
          {stage === "details" && (
            <>
              <div className="cardTitle">Reserve Your Seat</div>
              <p className="muted">
                Complete your details first. Your secure payment screen opens only after registration is created.
              </p>
              <form onSubmit={createRegistration}>
                <label>Full name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your full name" /></label>
                <label>Phone number<input required inputMode="numeric" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="10-digit mobile number" /></label>
                <label>Email address<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></label>
                <label>Attendance mode<select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as Mode })}><option>Online</option><option>In Person</option></select></label>
                <div className="couponRow"><input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Coupon code: GENZ" /><button type="button" onClick={applyCoupon}>Apply</button></div>
                {couponError && <div className="error">{couponError}</div>}
                {applied && <div className="successNote">✓ GENZ applied — ₹499 per seat</div>}
                <div className="price"><span>₹899</span><b>₹{amount}</b><em>PER SEAT</em></div>
                {message && <div className="error">{message}</div>}
                <button className="primary" disabled={loading}>
                  {loading ? "Opening secure payment…" : "Continue to payment"}
                </button>
              </form>
            </>
          )}

          {stage === "payment" && (
            <>
              <div className="cardTitle">Complete Your Payment</div>
              <div className="bookingLine"><span>Booking ID</span><b>{bookingId}</b></div>
              <div className="amountLine"><span>Payable</span><b>₹{amount}</b></div>

              <div className="qrBox">
                <QRCodeCanvas value={upiUri} size={220} includeMargin />
                <b>{UPI_ID}</b>
                <small>Scan with any UPI app. The QR is configured for exactly ₹{amount} and includes your booking ID.</small>
              </div>
              <a className="upiButton" href={upiUri}>Open UPI App & Pay ₹{amount}</a>

              <div className="warning">
                <b>Manual UPI fallback:</b> This option is available when no automatic gateway is configured. The UPI payment itself is real, but the application cannot prove bank settlement from a UTR alone.
              </div>

              <label>UPI transaction reference / UTR<input value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="Enter UTR after payment" /></label>
              {message && <div className="error">{message}</div>}
              <div className="buttonStack">
                <button className="primary" onClick={submitUtr} disabled={loading}>
                  {loading ? "Submitting…" : "Submit UTR & Continue"}
                </button>
                <a className="whatsapp" href={"https://wa.me/" + WHATSAPP + "?text=" + whatsappText} target="_blank" rel="noreferrer">
                  Send payment details on WhatsApp
                </a>
              </div>
            </>
          )}

          {stage === "paid" && (
            <>
              <div className="doneIcon">✓</div>
              <div className="cardTitle">Payment Successful</div>
              <p className="muted">Your payment was verified automatically by the payment gateway.</p>
              <div className="bookingLine"><span>Booking ID</span><b>{bookingId}</b></div>
              <div className="bookingLine"><span>Amount</span><b>₹{amount}</b></div>
              <div className="bookingLine"><span>Attendance</span><b>{form.mode}</b></div>
              <p className="muted">Keep your Booking ID for the webinar.</p>
            </>
          )}

          {stage === "done" && (
            <>
              <div className="doneIcon">✓</div>
              <div className="cardTitle">Registration Received</div>
              <p className="muted">Your UTR was submitted successfully for manual payment verification.</p>
              <div className="bookingLine"><span>Booking ID</span><b>{bookingId}</b></div>
              <div className="bookingLine"><span>Amount</span><b>₹{amount}</b></div>
              <div className="bookingLine"><span>Attendance</span><b>{form.mode}</b></div>
              <div className="warning">Payment remains pending until the UPI transaction is verified. This is not an automatic payment confirmation.</div>
              <a className="whatsapp" href={"https://wa.me/" + WHATSAPP + "?text=" + whatsappText} target="_blank" rel="noreferrer">
                Send registration details on WhatsApp
              </a>
            </>
          )}
        </section>
      </section>

      <section className="benefits">
        <h2>What You'll Learn</h2>
        <div><span>AI Basics</span><span>Hands-on AI Tools</span><span>Real Projects</span><span>Career Opportunities</span><span>Industry Expert Tips</span><span>Q&A & Networking</span></div>
      </section>

      <footer>AI Webinar • 18 October 2026 • Vandhana International School, Sector 10, Dwarka, Delhi</footer>
    </main>
  );
}
