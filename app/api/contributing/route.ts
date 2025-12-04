import { NextRequest, NextResponse } from 'next/server';
import { parseGitHubUrl, fetchRepoData } from '@/lib/github';
import { generateContributing } from '@/lib/contributing';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const parsed = parseGitHubUrl(url);
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid GitHub URL' }, { status: 400 });
    }

    const repoData = await fetchRepoData(parsed.owner, parsed.repo);

    if (repoData.files.length === 0 && repoData.tree.length === 0) {
      return NextResponse.json(
        { error: 'Could not fetch repository. Make sure the repo is public.' },
        { status: 400 }
      );
    }

    const contributing = await generateContributing({
      name: repoData.name,
      language: repoData.language,
      files: repoData.files,
      tree: repoData.tree,
    });

    return NextResponse.json({ contributing, repo: repoData.name });
  } catch (error) {
    console.error('Contributing generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate contributing guide' },
      { status: 500 }
    );
  }
}
