import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserByGithubId, saveSurveyResponse, SurveyResponse } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const githubId = session.user.githubId;
    const user = await getUserByGithubId(githubId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body: SurveyResponse = await request.json();

    // Validate required fields
    if (!body.role || !body.team_size || !body.doc_frequency || !body.would_pay) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate field lengths
    const maxLength = 500;
    if (body.feedback && body.feedback.length > maxLength) {
      return NextResponse.json({ error: 'Feedback too long' }, { status: 400 });
    }
    if (body.email && body.email.length > 255) {
      return NextResponse.json({ error: 'Email too long' }, { status: 400 });
    }

    await saveSurveyResponse(user.id, body);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Survey submission error:', error);
    return NextResponse.json(
      { error: 'Failed to submit survey' },
      { status: 500 }
    );
  }
}
