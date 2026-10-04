# AI Webinar Registration

Standalone Next.js registration app for the 18 October 2026 AI Webinar.

## Current live payment mode

Razorpay is retained in the codebase for a future switch-on after merchant KYC approval.

The live fallback is direct UPI payment to:

- VPA: 9910474663@icici
- Original price: ₹899
- GENZ price: ₹499

The application creates a booking before payment, shows QR/UPI payment only after required visitor details are completed, collects the UTR/reference, and keeps payment in manual verification until an administrator confirms the transaction.

## Production flow

Visitor details → booking ID → UPI QR / UPI app → UTR submission → manual verification.

The application stores booking records in the linked private Vercel Blob store.

## Optional future integrations

Razorpay environment variables:
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET

Transactional email can be enabled later with the configured email provider.

## Production

Vercel project: ai-webinar
GitHub repository: Rohit-Singh-1991/new
Production domain: https://webinar.digicreators.shop/
