import {NextResponse} from "next/server";
import crypto from "crypto";
import {makeBookingId,saveBooking} from "@/lib/bookings";
export const runtime="nodejs";
export async function POST(req:Request){
 try{
  const {name,phone,email,mode,coupon,amount,razorpay_order_id,razorpay_payment_id,razorpay_signature}=await req.json();
  if(!razorpay_order_id||!razorpay_payment_id||!razorpay_signature)return NextResponse.json({error:"Incomplete payment response."},{status:400});
  const secret=process.env.RAZORPAY_KEY_SECRET;if(!secret)return NextResponse.json({error:"Payment gateway is not configured."},{status:503});
  const expected=crypto.createHmac("sha256",secret).update(razorpay_order_id+"|"+razorpay_payment_id).digest("hex");
  if(expected.length!==razorpay_signature.length||!crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(razorpay_signature)))return NextResponse.json({error:"Payment signature verification failed."},{status:400});
  const booking=await saveBooking({bookingId:makeBookingId(),name,phone,email,mode,amount:Number(amount),coupon:coupon||null,status:"PAID",paymentId:razorpay_payment_id,orderId:razorpay_order_id,createdAt:new Date().toISOString()});
  await sendReceipt(booking);
  return NextResponse.json({bookingId:booking.bookingId,email});
 }catch{return NextResponse.json({error:"Payment verification or booking creation failed."},{status:500})}
}
async function sendReceipt(b:any){
 const api=process.env.RESEND_API_KEY,from=process.env.EMAIL_FROM;if(!api||!from)return;
 const html="<div style='font-family:Arial;max-width:600px;margin:auto'><h1>AI Webinar — Registration Confirmed</h1><p>Hi "+escapeHtml(b.name)+", your payment has been verified.</p><p><b>Booking ID:</b> "+b.bookingId+"</p><p><b>Amount:</b> ₹"+b.amount+"</p><p><b>Attendance:</b> "+escapeHtml(b.mode)+"</p><p><b>Payment ID:</b> "+b.paymentId+"</p><p>Please keep this booking ID for reference.</p></div>";
 await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+api,"Content-Type":"application/json"},body:JSON.stringify({from,to:[b.email],subject:"AI Webinar Registration — "+b.bookingId,html})});
}
function escapeHtml(s:string){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]||c))}