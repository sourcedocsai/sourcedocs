import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { parseGitHubUrl, fetchCommits, fetchReleases, fetchTags } from '@/lib/github';
import { generateChangelog } from '@/lib/changelog';
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
      return NextResponse.json({ error: 'Invalid or unsupported GitHub URL/owner/repo' }, { status: 400 });
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

    const [commits, releases, tags] = await Promise.all([
      fetchCommits(parsed.owner, parsed.repo),
      fetchReleases(parsed.owner, parsed.repo),
      fetchTags(parsed.owner, parsed.repo),
    ]);

    const changelog = await generateChangelog(parsed.repo, commits, releases, tags);

    const generationTimeMs = Date.now() - startTime;
    await recordGeneration(user.id, 'changelog', url, 'web', generationTimeMs);

    return NextResponse.json({
      changelog,
      repo: parsed.repo,
      usage: usage + 1,
      limit,
      plan,
    });
  } catch (error) {
    console.error('Changelog generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate changelog' },
      { status: 500 }
    );
  }
}
