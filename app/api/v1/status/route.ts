import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { canGenerateApi } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateApiRequest(request);
    if (!auth.success || !auth.user) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      );
    }

    const { usage, limit } = await canGenerateApi(auth.user.id);

    return NextResponse.json({
      plan: auth.user.plan,
      api_calls: {
        used: usage,
        limit,
        remaining: limit - usage,
        resets_at: auth.user.api_calls_reset_at,
      },
    });
  } catch (error) {
    console.error('API status error:', error);
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    );
  }
}
