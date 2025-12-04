import { NextRequest, NextResponse } from 'next/server';
import { parseGitHubUrl, fetchRepoData } from '@/lib/github';
import { generateReadme } from '@/lib/claude';

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
    
    if (repoData.files.length === 0) {
      return NextResponse.json(
        { error: 'Could not fetch repository files. Make sure the repo is public.' },
        { status: 400 }
      );
    }

    const readme = await generateReadme(repoData);

    return NextResponse.json({ readme, repo: repoData.name });
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate README' },
      { status: 500 }
    );
  }
}
