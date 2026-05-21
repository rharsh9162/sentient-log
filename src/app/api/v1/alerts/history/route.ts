import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { AlertHistory } from '@/models/AlertHistory';
import { getUserId } from '@/lib/getUser';

export async function GET() {
  try {
    await connectDB();
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const history = await AlertHistory.find({ user_id: userId })
      .sort({ fired_at: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({ history });
  } catch (error) {
    console.error('Alert history error:', error);
    return NextResponse.json({ error: 'Failed to fetch alert history' }, { status: 500 });
  }
}
