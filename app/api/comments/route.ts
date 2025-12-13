import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserByGithubId, canGenerateWeb, recordGeneration } from '@/lib/db';
import {
  parseGitHubFileUrl,
  fetchGitHubFileContent,
  generateCodeComments,
} from '@/lib/comments';

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

    // Parse the GitHub file URL
    const parsed = parseGitHubFileUrl(url);
    if (!parsed) {
      return NextResponse.json(
        { error: 'Invalid GitHub file URL. Expected format: https://github.com/owner/repo/blob/branch/path/to/file.ext' },
        { status: 400 }
      );
    }

    const githubId = (session.user as any).githubId;
    const user = await getUserByGithubId(githubId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check usage limits
    const { allowed, usage, limit, plan } = await canGenerateWeb(user.id);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Monthly limit reached', usage, limit, plan, upgrade: true },
        { status: 429 }
      );
    }

    const startTime = Date.now();

    // Fetch the file content from GitHub
    const fileContent = await fetchGitHubFileContent(
      parsed.owner,
      parsed.repo,
      parsed.path,
      parsed.branch
    );

    // Check file size (limit to ~500KB to avoid token limits)
    if (fileContent.length > 500000) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 500KB.' },
        { status: 400 }
      );
    }

    // Generate documented code
    const documentedCode = await generateCodeComments({
      filename: parsed.path.split('/').pop() || parsed.path,
      content: fileContent,
      repoName: parsed.repo,
      owner: parsed.owner,
    });

    const generationTimeMs = Date.now() - startTime;
    
    // Record this generation
    await recordGeneration(user.id, 'comments', url, 'web', generationTimeMs);

    return NextResponse.json({
      success: true,
      documentedCode,
      filename: parsed.path.split('/').pop(),
      path: parsed.path,
      repo: parsed.repo,
      owner: parsed.owner,
      usage: usage + 1,
      limit,
      plan,
      generationTimeMs,
    });
  } catch (error) {
    console.error('Code comments generation error:', error);
    
    const message = error instanceof Error ? error.message : 'Failed to generate code comments';
    
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
