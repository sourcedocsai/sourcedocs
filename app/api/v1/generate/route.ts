import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest, trackApiUsage } from '@/lib/api-auth';
import { parseGitHubUrl, fetchRepoData, fetchCommits, fetchReleases, fetchTags } from '@/lib/github';
import { generateReadme } from '@/lib/claude';
import { generateChangelog } from '@/lib/changelog';
import { generateContributing } from '@/lib/contributing';
import { generateLicense } from '@/lib/license';
import { generateCodeOfConduct } from '@/lib/codeofconduct';
import { recordGeneration } from '@/lib/db';

const VALID_DOC_TYPES = ['readme', 'changelog', 'contributing', 'license', 'codeofconduct'];

export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const auth = await authenticateApiRequest(request);
    if (!auth.success || !auth.user) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status || 401 }
      );
    }

    const { repo_url, doc_type } = await request.json();

    // Validate inputs
    if (!repo_url) {
      return NextResponse.json(
        { error: 'repo_url is required' },
        { status: 400 }
      );
    }

    if (!doc_type || !VALID_DOC_TYPES.includes(doc_type)) {
      return NextResponse.json(
        { error: `doc_type must be one of: ${VALID_DOC_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    const parsed = parseGitHubUrl(repo_url);
    if (!parsed) {
      return NextResponse.json(
        { error: 'Invalid GitHub URL' },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    let content: string;

    // Generate based on doc type
    switch (doc_type) {
      case 'readme': {
        const repoData = await fetchRepoData(parsed.owner, parsed.repo);
        content = await generateReadme(repoData);
        break;
      }
      case 'changelog': {
        const [commits, releases, tags] = await Promise.all([
          fetchCommits(parsed.owner, parsed.repo),
          fetchReleases(parsed.owner, parsed.repo),
          fetchTags(parsed.owner, parsed.repo),
        ]);
        content = await generateChangelog(parsed.repo, commits, releases, tags);
        break;
      }
      case 'contributing': {
        const repoData = await fetchRepoData(parsed.owner, parsed.repo);
        content = await generateContributing({
          name: repoData.name,
          language: repoData.language,
          files: repoData.files,
          tree: repoData.tree,
        });
        break;
      }
      case 'license': {
        content = await generateLicense({
          name: parsed.repo,
          owner: parsed.owner,
        });
        break;
      }
      case 'codeofconduct': {
        content = await generateCodeOfConduct({
          name: parsed.repo,
          owner: parsed.owner,
        });
        break;
      }
      default:
        return NextResponse.json(
          { error: 'Invalid doc_type' },
          { status: 400 }
        );
    }

    const generationTimeMs = Date.now() - startTime;

    // Track usage
    await trackApiUsage(auth.user.id);
    await recordGeneration(auth.user.id, doc_type, repo_url, 'api', generationTimeMs);

    // Check if raw markdown requested
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');

    if (format === 'json') {
      return NextResponse.json({
        success: true,
        doc_type,
        repo: parsed.repo,
        content,
        generation_time_ms: generationTimeMs,
      });
    }

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${doc_type.toUpperCase()}.md"`,
      },
    });

  } catch (error) {
    console.error('API generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate documentation' },
      { status: 500 }
    );
  }
}
