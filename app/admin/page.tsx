"use client";

import { useState } from "react";

type Row = {
  bookingId: string;
  name: string;
  phone: string;
  email: string;
  mode: string;
  amount: number;
  coupon: string | null;
  status: string;
  utr?: string;
  createdAt: string;
  verifiedAt?: string;
};

export default function Admin() {
  const [key, setKey] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");

  async function load() {
    setErr("");
    const response = await fetch("/api/admin/bookings", { headers: { "x-admin-key": key } });
    const data = await response.json();
    if (!response.ok) return setErr(data.error || "Access denied");
    setRows(data.bookings || []);
  }

  async function verify(bookingId: string) {
    if (!window.confirm("Verify that the UPI payment was received for " + bookingId + "?")) return;
    setBusy(bookingId);
    setErr("");
    try {
      const response = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "x-admin-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Verification failed.");
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Verification failed.");
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="page">
      <section className="admin">
        <a href="/" className="back">← Registration</a>
        <h1>AI Webinar Booking Tracker</h1>
        {rows.length === 0 ? (
          <div className="card login">
            <h2>Admin access</h2>
            <p className="muted">Use the private admin password configured for this Vercel project.</p>
            <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Admin password" />
            <button className="pay" onClick={load}>View bookings</button>
            {err && <div className="error">{err}</div>}
          </div>
        ) : (
          <div className="card tableWrap">
            <div className="adminBar">
              <button className="lock" onClick={() => setRows([])}>Lock</button>
              <button className="lock" onClick={load}>Refresh</button>
            </div>
            <table>
              <thead><tr><th>Booking ID</th><th>Name</th><th>Phone</th><th>Email</th><th>Mode</th><th>Amount</th><th>Coupon</th><th>Status</th><th>UTR</th><th>Created</th><th>Action</th></tr></thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.bookingId}>
                    <td>{row.bookingId}</td><td>{row.name}</td><td>{row.phone}</td><td>{row.email}</td><td>{row.mode}</td><td>₹{row.amount}</td><td>{row.coupon || "—"}</td><td className={row.status === "PAID" ? "paid" : ""}>{row.status}</td><td>{row.utr || "—"}</td><td>{new Date(row.createdAt).toLocaleString("en-IN")}</td>
                    <td>{row.status === "MANUAL_REVIEW" ? <button className="lock verifyBtn" disabled={busy === row.bookingId} onClick={() => verify(row.bookingId)}>{busy === row.bookingId ? "Verifying…" : "Verify payment"}</button> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {err && <div className="error">{err}</div>}
          </div>
        )}
      </section>
    </main>
  );
}
