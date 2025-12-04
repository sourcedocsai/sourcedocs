import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { parseGitHubUrl, fetchRepoData } from '@/lib/github';
import { generateReadme } from '@/lib/claude';
import { canGenerate, recordGeneration, getUserByGithubId } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
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

    // Get user from database
    const githubId = (session.user as any).githubId;
    const user = await getUserByGithubId(githubId);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check usage limits
    const { allowed, usage, limit } = await canGenerate(user.id);
    if (!allowed) {
      return NextResponse.json(
        { 
          error: 'Monthly limit reached', 
          usage, 
          limit,
          upgrade: true 
        }, 
        { status: 429 }
      );
    }

    // Fetch repo data and generate
    const repoData = await fetchRepoData(parsed.owner, parsed.repo);
    const readme = await generateReadme(repoData);

    // Record usage
    await recordGeneration(user.id, 'readme', url, 'web');

    return NextResponse.json({ 
      readme, 
      repo: repoData.name,
      usage: usage + 1,
      limit,
    });
  } catch (error) {
    console.error('README generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate README' },
      { status: 500 }
    );
  }
}
