# AI Webinar Registration

Standalone Next.js registration app with Razorpay verification, UPI QR, GENZ coupon pricing, unique booking IDs, email receipts, private Vercel Blob storage and a protected /admin booking tracker.

Required Vercel environment variables: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RESEND_API_KEY, EMAIL_FROM, ADMIN_PASSWORD.

BLOB_READ_WRITE_TOKEN is provisioned by the linked Vercel Blob store.

The direct UPI QR can launch a UPI payment, but a generic UPI QR cannot prove payment to the application. Automatic confirmation uses Razorpay verified payment callbacks.

Vercel project: ai-webinar. GitHub repository: Rohit-Singh-1991/new.