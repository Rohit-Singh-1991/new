import {NextResponse} from "next/server";
import {getBookings} from "@/lib/bookings";
export const runtime="nodejs";
export async function GET(req:Request){
 if(req.headers.get("x-admin-key")!==process.env.ADMIN_PASSWORD)return NextResponse.json({error:"Unauthorized"},{status:401});
 try{return NextResponse.json({bookings:await getBookings()})}catch{return NextResponse.json({error:"Unable to load bookings."},{status:500})}
}