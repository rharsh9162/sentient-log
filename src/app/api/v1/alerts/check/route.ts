import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getUserId } from '@/lib/getUser';
import { runAlertChecks } from '@/services/AlertChecker';

export async function POST() {
  try {
    await connectDB();
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await runAlertChecks(userId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Alert check error:', error);
    return NextResponse.json({ error: 'Failed to check alerts' }, { status: 500 });
  }
}
