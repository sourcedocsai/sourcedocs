import { NextRequest, NextResponse } from 'next/server';
import { parseGitHubUrl } from '@/lib/github';
import { generateLicense } from '@/lib/license';

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

    const license = await generateLicense({
      name: parsed.repo,
      owner: parsed.owner,
    });

    return NextResponse.json({ license, repo: parsed.repo });
  } catch (error) {
    console.error('License generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate license' },
      { status: 500 }
    );
  }
}
