import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserByGithubId, getMonthlyWebUsage, getApiKeys } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const githubId = session.user.githubId;
    const user = await getUserByGithubId(githubId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const webUsage = await getMonthlyWebUsage(user.id);
    const apiKeys = await getApiKeys(user.id);

    // Calculate web limit based on plan
    const webLimit = user.plan === 'web_pro' || user.plan === 'bundle' ? -1 : 1;

    return NextResponse.json({
      plan: user.plan || 'free',
      isPro: user.is_pro,
      isAdmin: user.is_admin,
      surveyCompleted: user.survey_completed,
      web: {
        usage: webUsage,
        limit: webLimit,
      },
      api: {
        usage: user.api_calls_used,
        limit: user.api_calls_limit,
        resetAt: user.api_calls_reset_at,
      },
      apiKeys,
    });
  } catch (error) {
    console.error('Status error:', error);
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}
