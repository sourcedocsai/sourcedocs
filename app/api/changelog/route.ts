import { NextRequest, NextResponse } from 'next/server';
import { parseGitHubUrl, fetchCommits, fetchReleases, fetchTags } from '@/lib/github';
import { generateChangelog } from '@/lib/changelog';

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

    const [commits, releases, tags] = await Promise.all([
      fetchCommits(parsed.owner, parsed.repo),
      fetchReleases(parsed.owner, parsed.repo),
      fetchTags(parsed.owner, parsed.repo),
    ]);

    if (commits.length === 0) {
      return NextResponse.json(
        { error: 'Could not fetch commits. Make sure the repo is public.' },
        { status: 400 }
      );
    }

    const changelog = await generateChangelog({
      name: parsed.repo,
      commits,
      releases,
      tags,
    });

    return NextResponse.json({ changelog, repo: parsed.repo });
  } catch (error) {
    console.error('Changelog generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate changelog' },
      { status: 500 }
    );
  }
}
