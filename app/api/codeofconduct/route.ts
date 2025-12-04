import { NextRequest, NextResponse } from 'next/server';
import { parseGitHubUrl } from '@/lib/github';
import { generateCodeOfConduct } from '@/lib/codeofconduct';

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

    const codeofconduct = await generateCodeOfConduct({
      name: parsed.repo,
      owner: parsed.owner,
    });

    return NextResponse.json({ codeofconduct, repo: parsed.repo });
  } catch (error) {
    console.error('Code of Conduct generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate code of conduct' },
      { status: 500 }
    );
  }
}
