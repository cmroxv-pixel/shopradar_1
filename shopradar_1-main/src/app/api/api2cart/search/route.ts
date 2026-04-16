import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse?.json({ error: 'API2Cart integration has been removed' }, { status: 410 });
}
