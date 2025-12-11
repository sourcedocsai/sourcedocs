import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { parseGitHubUrl } from '@/lib/github';
import { generateCodeOfConduct } from '@/lib/codeofconduct';
import { canGenerateWeb, recordGeneration, getUserByGithubId } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const parsed = parseGitHubUrl(url);
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid GitHub URL' }, { status: 400 });
    }

    const githubId = (session.user as any).githubId;
    const user = await getUserByGithubId(githubId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { allowed, usage, limit, plan } = await canGenerateWeb(user.id);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Monthly limit reached', usage, limit, plan, upgrade: true },
        { status: 429 }
      );
    }

    const startTime = Date.now();

    const codeofconduct = await generateCodeOfConduct({
      name: parsed.repo,
      owner: parsed.owner,
    });

    const generationTimeMs = Date.now() - startTime;
    await recordGeneration(user.id, 'codeofconduct', url, 'web', generationTimeMs);

    return NextResponse.json({
      codeofconduct,
      repo: parsed.repo,
      usage: usage + 1,
      limit,
      plan,
    });
  } catch (error) {
    console.error('Code of Conduct generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate code of conduct' },
      { status: 500 }
    );
  }
}
