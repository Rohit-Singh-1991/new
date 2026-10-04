"use client";
import {useState} from "react";
import {QRCodeCanvas} from "qrcode.react";
const ORIGINAL=899,DISCOUNTED=499,UPI_ID="9910474663@icici";
declare global{interface Window{Razorpay:any}}
export default function Home(){
 const [form,setForm]=useState({name:"",phone:"",email:"",mode:"Online"}),[coupon,setCoupon]=useState(""),[applied,setApplied]=useState(false),[loading,setLoading]=useState(false),[success,setSuccess]=useState<any>(null),[error,setError]=useState("");
 const amount=applied?DISCOUNTED:ORIGINAL;
 const upiUri="upi://pay?pa="+encodeURIComponent(UPI_ID)+"&pn=AI%20Webinar&am="+amount+"&cu=INR";
 function apply(){if(coupon.trim().toLowerCase()==="genz"){setApplied(true);setError("")}else{setApplied(false);setError("Invalid coupon code.")}}
 async function pay(){
  setError("");if(!form.name||!form.phone||!form.email)return setError("Please complete name, phone and email.");
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))return setError("Please enter a valid email address.");
  setLoading(true);
  try{
   const o=await fetch("/api/payment/order",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,coupon:applied?"genz":null,amount})});
   const order=await o.json();if(!o.ok)throw new Error(order.error);
   if(!window.Razorpay){const s=document.createElement("script");s.src="https://checkout.razorpay.com/v1/checkout.js";await new Promise((res,rej)=>{s.onload=res;s.onerror=rej;document.body.appendChild(s)})}
   const rzp=new window.Razorpay({key:order.keyId,amount:order.amount,currency:"INR",name:"AI Webinar",description:"AI Webinar Registration",order_id:order.orderId,prefill:{name:form.name,email:form.email,contact:form.phone},theme:{color:"#7c3aed"},handler:async(r:any)=>{
    const v=await fetch("/api/payment/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,coupon:applied?"genz":null,amount,...r})});
    const d=await v.json();if(!v.ok)throw new Error(d.error);setSuccess(d);setLoading(false);
   },modal:{ondismiss:()=>setLoading(false)}});rzp.on("payment.failed",(r:any)=>{setError(r.error?.description||"Payment failed.");setLoading(false)});rzp.open();
  }catch(e:any){setError(e.message||"Payment failed.");setLoading(false)}
 }
 if(success)return <main className="page"><section className="success"><div className="check">✓</div><h1>Registration Confirmed</h1><p>Your payment was verified successfully.</p><div className="booking"><span>Booking ID</span><b>{success.bookingId}</b></div><p className="muted">Receipt sent to <b>{success.email}</b>.</p><a className="btn" href="/">Register another participant</a></section></main>;
 return <main className="page"><section className="hero"><div className="badge">AI WEBINAR • REGISTRATION OPEN</div><h1>Learn AI. Build Faster. Stay Ahead.</h1><p>Attend the webinar <b>online or in person</b>.</p><div className="prices"><s>₹899</s><strong>₹499</strong><em>with GENZ</em></div></section>
 <section className="grid"><div className="card"><h2>Register</h2><label>Full name<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Your name"/></label><label>Phone number<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+91 XXXXX XXXXX"/></label><label>Email address<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="you@example.com"/></label><label>Attendance<select value={form.mode} onChange={e=>setForm({...form,mode:e.target.value})}><option>Online</option><option>In Person</option></select></label><div className="coupon"><input value={coupon} onChange={e=>setCoupon(e.target.value)} placeholder="Coupon code"/><button onClick={apply}>Apply</button></div>{applied&&<div className="ok">✓ GENZ applied — you pay ₹499</div>}{error&&<div className="error">{error}</div>}<div className="total"><span>Total</span><b>₹{amount}</b></div><button className="pay" onClick={pay} disabled={loading}>{loading?"Opening secure payment…":"Pay ₹"+amount+" & Register"}</button><small>Secure payment powered by Razorpay. Booking is confirmed only after payment verification.</small></div>
 <div className="card qrCard"><h2>Pay by UPI QR</h2><p>Scan with any UPI app.</p><div className="qr"><QRCodeCanvas value={upiUri} size={220} includeMargin/></div><b className="upi">{UPI_ID}</b><a className="upiBtn" href={upiUri}>Open UPI App</a><small>Direct QR payments may require manual verification. Use the secure payment button for automatic confirmation.</small></div></section><footer>AI Webinar • <a href="/admin">Booking Admin</a></footer></main>
}