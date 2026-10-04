import {NextResponse} from "next/server";
export const runtime="nodejs";
export async function POST(req:Request){
 try{
  const {name,phone,email,mode,coupon,amount}=await req.json();
  if(!name||!phone||!email||!amount)return NextResponse.json({error:"Missing registration details."},{status:400});
  if(coupon?.toLowerCase()==="genz" && Number(amount)!==499)return NextResponse.json({error:"Invalid discounted amount."},{status:400});
  if(coupon?.toLowerCase()!=="genz" && Number(amount)!==899)return NextResponse.json({error:"Invalid amount/coupon."},{status:400});
  const keyId=process.env.RAZORPAY_KEY_ID,secret=process.env.RAZORPAY_KEY_SECRET;
  if(!keyId||!secret)return NextResponse.json({error:"Payment gateway is not configured yet."},{status:503});
  const auth=Buffer.from(keyId+":"+secret).toString("base64");
  const r=await fetch("https://api.razorpay.com/v1/orders",{method:"POST",headers:{Authorization:"Basic "+auth,"Content-Type":"application/json"},body:JSON.stringify({amount:Number(amount)*100,currency:"INR",receipt:"AIW-"+Date.now(),notes:{name,phone,email,mode,coupon:coupon||""}})});
  const d=await r.json();if(!r.ok)return NextResponse.json({error:d.error?.description||"Razorpay order creation failed."},{status:502});
  return NextResponse.json({orderId:d.id,amount:d.amount,keyId});
 }catch{return NextResponse.json({error:"Unable to create payment order."},{status:500})}
}