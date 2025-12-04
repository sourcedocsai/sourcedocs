import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { parseGitHubUrl } from '@/lib/github';
import { generateLicense } from '@/lib/license';
import { canGenerate, recordGeneration, getUserByGithubId } from '@/lib/db';

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

    const { allowed, usage, limit } = await canGenerate(user.id);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Monthly limit reached', usage, limit, upgrade: true }, 
        { status: 429 }
      );
    }

    const license = await generateLicense({
      name: parsed.repo,
      owner: parsed.owner,
    });

    await recordGeneration(user.id, 'license', url, 'web');

    return NextResponse.json({ 
      license, 
      repo: parsed.repo,
      usage: usage + 1,
      limit,
    });
  } catch (error) {
    console.error('License generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate license' },
      { status: 500 }
    );
  }
}
