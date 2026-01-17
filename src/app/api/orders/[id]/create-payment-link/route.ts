import { NextResponse } from 'next/server';

export async function POST() {
  // Note: Payment link creation is now handled directly in /api/orders/pickup and /api/orders/shipping routes
  return NextResponse.json({ message: 'Not implemented' }, { status: 501 });
}
