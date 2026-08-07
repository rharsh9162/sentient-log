import { NextResponse } from 'next/server'; 
export async function GET() { 
  return NextResponse.json({ io: !!global.io, hasGlobal: !!global }); 
}
