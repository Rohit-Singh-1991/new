import crypto from "node:crypto";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks);
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!secret) return res.status(503).json({ error: "Webhook secret is not configured" });

    const signature = req.headers["x-razorpay-signature"];
    const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");

    if (!signature || signature.length !== expected.length ||
        !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
      return res.status(401).json({ error: "Invalid webhook signature" });
    }

    const event = JSON.parse(raw.toString("utf8"));
    console.log("razorpay_webhook", event.event, event.payload?.payment?.entity?.id || event.payload?.order?.entity?.id || "");

    return res.status(200).json({ received: true });
  } catch {
    return res.status(400).json({ error: "Invalid webhook payload" });
  }
}
