import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { canGenerateApi, recordGeneration, trackApiUsage } from '@/lib/db';
import { parseGitHubUrl, fetchRepoData, fetchCommits, fetchReleases, fetchTags } from '@/lib/github';
import { generateReadme } from '@/lib/claude';
import { generateChangelog } from '@/lib/changelog';
import { generateContributing } from '@/lib/contributing';
import { generateLicense } from '@/lib/license';
import { generateCodeOfConduct } from '@/lib/codeofconduct';
import { parseGitHubFileUrl, fetchGitHubFileContent, generateCodeComments } from '@/lib/comments';

const VALID_DOC_TYPES = ['readme', 'changelog', 'contributing', 'license', 'codeofconduct', 'comments'] as const;
type DocType = typeof VALID_DOC_TYPES[number];

export async function POST(request: NextRequest) {
  try {
    // Authenticate via API key
    const auth = await authenticateApiRequest(request);
    if (!auth.success || !auth.user) {
      return NextResponse.json(
        { error: auth.error || 'Authentication failed' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { doc_type, repo_url, file_url } = body;

    // Validate doc_type
    if (!doc_type || !VALID_DOC_TYPES.includes(doc_type)) {
      return NextResponse.json(
        { 
          error: 'Invalid doc_type',
          valid_types: VALID_DOC_TYPES,
        },
        { status: 400 }
      );
    }

    // For comments, require file_url; for others, require repo_url
    if (doc_type === 'comments') {
      if (!file_url) {
        return NextResponse.json(
          { 
            error: 'file_url is required for comments doc_type',
            example: 'https://github.com/owner/repo/blob/main/src/file.ts'
          },
          { status: 400 }
        );
      }
    } else {
      if (!repo_url) {
        return NextResponse.json(
          { error: 'repo_url is required' },
          { status: 400 }
        );
      }
    }

    // Check API usage limits
    const { allowed, usage, limit } = await canGenerateApi(auth.user.id);
    if (!allowed) {
      return NextResponse.json(
        { 
          error: 'API limit reached',
          usage,
          limit,
          upgrade: 'https://www.sourcedocs.ai/settings'
        },
        { status: 429 }
      );
    }

    const startTime = Date.now();
    let content: string;
    let responseData: Record<string, any> = {};

    // Handle comments separately (uses file_url)
    if (doc_type === 'comments') {
      const parsed = parseGitHubFileUrl(file_url);
      if (!parsed) {
        return NextResponse.json(
          { 
            error: 'Invalid GitHub file URL',
            expected: 'https://github.com/owner/repo/blob/branch/path/to/file.ext'
          },
          { status: 400 }
        );
      }

      const fileContent = await fetchGitHubFileContent(
        parsed.owner,
        parsed.repo,
        parsed.path,
        parsed.branch
      );

      if (fileContent.length > 500000) {
        return NextResponse.json(
          { error: 'File too large. Maximum size is 500KB.' },
          { status: 400 }
        );
      }

      content = await generateCodeComments({
        filename: parsed.path.split('/').pop() || parsed.path,
        content: fileContent,
        repoName: parsed.repo,
        owner: parsed.owner,
      });

      responseData = {
        file: {
          name: parsed.path.split('/').pop(),
          path: parsed.path,
          repo: parsed.repo,
          owner: parsed.owner,
        },
      };

      const generationTimeMs = Date.now() - startTime;
      await trackApiUsage(auth.user.id);
      await recordGeneration(auth.user.id, 'comments', file_url, 'api', generationTimeMs);

      return NextResponse.json({
        success: true,
        doc_type,
        ...responseData,
        content,
        generation_time_ms: generationTimeMs,
      });
    }

    // Handle repo-based doc types
    const parsed = parseGitHubUrl(repo_url);
    if (!parsed) {
      return NextResponse.json(
        { error: 'Invalid GitHub repository URL' },
        { status: 400 }
      );
    }

    switch (doc_type as DocType) {
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

    return NextResponse.json({
      success: true,
      doc_type,
      repo: parsed.repo,
      content,
      generation_time_ms: generationTimeMs,
    });
  } catch (error) {
    console.error('API generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate documentation' },
      { status: 500 }
    );
  }
}
